// =============================================================================
// Trust Wallet Agent Kit (TWAK) — low-level signed HTTP client. SERVER ONLY.
//
// Authentication recipe (verified against the official docs:
// https://developer.trustwallet.com/developer/agent-sdk/authentication):
//
//   stringToSign = METHOD + PATH + QUERY + ACCESS_ID + NONCE + DATE
//                  (concatenated, NO separator between fields)
//   signature    = base64( HMAC_SHA256(stringToSign, HMAC_SECRET) )
//
// Sent on every request as headers:
//   X-TW-Credential : ACCESS_ID
//   X-TW-Nonce      : NONCE   (unique random string, anti-replay)
//   X-TW-Date       : DATE    (ISO-8601 "YYYY-MM-DDTHH:MM:SSZ", ±5 min window)
//   Authorization   : signature
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
// Accept either the dialog's names (TW_*) or the TWAK_*-prefixed variants.
const ACCESS_ID = process.env.TW_ACCESS_ID || process.env.TWAK_ACCESS_ID || "";
const HMAC_SECRET = process.env.TW_HMAC_SECRET || process.env.TWAK_HMAC_SECRET || "";

/** True when both credentials are present (server-side). */
export function twakConfigured(): boolean {
  return Boolean(ACCESS_ID && HMAC_SECRET);
}

/** TWAK expects seconds-precision ISO-8601 (no milliseconds). */
function isoSeconds(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
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
  /** Path WITHOUT query string, e.g. "/v1/wallet/balance". */
  path: string;
  /** Query params; the same encoded bytes are used for signing and the URL. */
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

  // Build the query string ONCE and reuse the identical bytes for both the
  // signature and the URL — otherwise the server-recomputed signature won't
  // match and the request is rejected.
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  }
  const qs = sp.toString();

  const nonce = randomUUID().replace(/-/g, "");
  const date = isoSeconds();
  const stringToSign = `${method}${path}${qs}${ACCESS_ID}${nonce}${date}`;
  const signature = createHmac("sha256", HMAC_SECRET).update(stringToSign).digest("base64");

  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = {
    "X-TW-Credential": ACCESS_ID,
    "X-TW-Nonce": nonce,
    "X-TW-Date": date,
    Authorization: signature,
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
    /* non-JSON response: keep the raw text */
  }

  if (!res.ok) {
    throw new TwakError(`TWAK ${method} ${path} failed (HTTP ${res.status})`, res.status, parsed);
  }
  return parsed as T;
}
