// =============================================================================
// Trust Wallet Agent Kit (TWAK) — low-level signed HTTP client. SERVER ONLY.
//
// Authentication (from portal.trustwallet.com docs):
//
//   stringToSign = METHOD;PATH;QUERY;ACCESS_ID;NONCE;DATE   (semicolons)
//   signature    = base64( HMAC_SHA256(stringToSign, HMAC_SECRET) )
//
// Required headers on every request:
//   X-TW-CREDENTIAL : ACCESS_ID
//   X-TW-NONCE      : random UUIDv4 (unique per request, anti-replay)
//   X-TW-DATE       : RFC 1123 date, always GMT  e.g. "Thu, 27 Feb 2026 12:00:00 GMT"
//   Authorization   : HMAC-SHA256 Signature=<base64>
//
// The HMAC secret must NEVER reach the browser. This module reads it from
// process.env and hard-fails if it is ever evaluated in a browser bundle.
// =============================================================================
import { createHmac, randomUUID } from "node:crypto";

if (typeof window !== "undefined") {
  throw new Error(
    "twClient is server-only and must never be imported into the browser bundle.",
  );
}

const BASE_URL = (process.env.TWAK_API_URL || "https://tws.trustwallet.com").replace(/\/+$/, "");
const ACCESS_ID = process.env.TW_ACCESS_ID || process.env.TWAK_ACCESS_ID || "";
const HMAC_SECRET = process.env.TW_HMAC_SECRET || process.env.TWAK_HMAC_SECRET || "";

export function twakConfigured(): boolean {
  return Boolean(ACCESS_ID && HMAC_SECRET);
}

/** RFC 1123 date string always in GMT, as required by the TWAK docs. */
function rfc1123Now(): string {
  return new Date().toUTCString(); // "Thu, 27 Feb 2026 12:00:00 GMT"
}

export class TwakError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "TwakError";
  }
}

type SignedRequest = {
  method: "GET" | "POST" | "DELETE";
  /** Path WITHOUT query string, e.g. "/v1/search/assets". */
  path: string;
  /** Query params — same encoded bytes used for signing and the URL. */
  query?: Record<string, string | number | undefined | null>;
  /** JSON body for POST/DELETE. */
  body?: unknown;
};

export async function twSignedFetch<T = unknown>({
  method,
  path,
  query,
  body,
}: SignedRequest): Promise<T> {
  if (!twakConfigured()) {
    throw new TwakError(
      "TWAK credentials missing — set TW_ACCESS_ID and TW_HMAC_SECRET in .env (server-only).",
      0,
      null,
    );
  }

  // Build query string once — reuse exact bytes for both signing and URL.
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  }
  const qs = sp.toString();

  const nonce = randomUUID(); // keep hyphens — docs show a full UUIDv4
  const date = rfc1123Now();

  // Signing string: METHOD;PATH;QUERY;ACCESS_ID;NONCE;DATE  (semicolon-separated)
  const stringToSign = [method, path, qs, ACCESS_ID, nonce, date].join(";");
  const signature = createHmac("sha256", HMAC_SECRET).update(stringToSign).digest("base64");

  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = {
    "X-TW-CREDENTIAL": ACCESS_ID,
    "X-TW-NONCE": nonce,
    "X-TW-DATE": date,
    Authorization: `HMAC-SHA256 Signature=${signature}`,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON response: keep raw text */
  }

  if (!res.ok) {
    throw new TwakError(`TWAK ${method} ${path} failed (HTTP ${res.status})`, res.status, parsed);
  }
  return parsed as T;
}
