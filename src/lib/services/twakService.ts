// Trust Wallet Agent Kit — THE ONLY execution/signing layer. SERVER ONLY.
// High-level operations the app uses, built on the signed `twClient`. Signing
// happens server-side via TWAK; the HMAC secret never reaches the browser.
// Consume these from server routes (src/routes/api/twak/*) — never from a
// client component, or the secret would be bundled for every visitor.
import { twSignedFetch, twakConfigured, TwakError } from "./twClient";
import { mockBalances } from "@/lib/mock/mockData";

const AGENT_ADDRESS = process.env.TWAK_AGENT_ADDRESS || "";
const COIN = process.env.TWAK_COIN || "60"; // SLIP44 id; 60 = EVM (Ethereum / BSC)

// Endpoint paths.
//   CONFIRMED by the TWAK docs: balance, asset search.
//   UNVERIFIED (no public REST path yet): swap quote/execute, registration.
//     These are env-overridable so they can be corrected without a code change
//     once the real path is confirmed (portal API reference / `twak --verbose`).
const PATHS = {
  balance: "/v1/wallet/balance", // confirmed
  search: "/v1/search/assets", // confirmed
  swapQuote: process.env.TWAK_SWAP_QUOTE_PATH || "", // UNVERIFIED — off unless set
  swapExecute: process.env.TWAK_SWAP_EXECUTE_PATH || "", // UNVERIFIED — off unless set
  register: process.env.TWAK_REGISTER_PATH || "", // UNVERIFIED — off unless set
};

export type Balance = { token: string; amount: number; usd: number };

/**
 * Best-effort extraction of a numeric balance from an unknown response shape.
 * The native-balance response schema isn't documented verbatim, so we probe the
 * common field names and always return the raw payload alongside so the exact
 * shape can be locked in from a real response.
 */
function pickBalance(raw: any): { amount: number | null; symbol: string | null } {
  const node = raw?.data ?? raw?.result ?? raw ?? {};
  const amountRaw =
    node.balance ?? node.amount ?? node.value ?? node.available ?? node.confirmed ?? null;
  const amount = amountRaw == null ? null : Number(amountRaw);
  const symbol = node.symbol ?? node.coin ?? node.asset ?? node.ticker ?? null;
  return { amount: Number.isFinite(amount as number) ? (amount as number) : null, symbol };
}

export const twakService = {
  /**
   * Connectivity + signature self-test using the documented asset-search
   * example. A 2xx here proves the credentials and HMAC signing are correct.
   */
  async ping() {
    const data = await twSignedFetch({
      method: "GET",
      path: PATHS.search,
      query: { query: "ethereum", limit: 1 },
    });
    return { ok: true, data };
  },

  /** Raw asset search (confirmed endpoint). */
  async searchAssets(query: string, limit = 5) {
    return twSignedFetch({ method: "GET", path: PATHS.search, query: { query, limit } });
  },

  /**
   * Live native balance for the configured agent wallet (confirmed endpoint).
   * Returns the raw payload too, so the exact field mapping can be confirmed
   * from a real response before we rely on `balance`.
   */
  async getNativeBalance() {
    if (!twakConfigured()) {
      throw new TwakError("TWAK not configured — set TW_ACCESS_ID / TW_HMAC_SECRET.", 0, null);
    }
    if (!AGENT_ADDRESS) {
      throw new TwakError("TWAK_AGENT_ADDRESS is not set — nothing to query.", 0, null);
    }
    const raw = await twSignedFetch<any>({
      method: "GET",
      path: PATHS.balance,
      query: { address: AGENT_ADDRESS, coin: COIN },
    });
    const { amount, symbol } = pickBalance(raw);
    return { live: true, address: AGENT_ADDRESS, coin: COIN, balance: amount, symbol, raw };
  },

  /**
   * Portfolio-shaped balances for the dashboard. Live native balance when
   * configured; mock data otherwise so local UI still renders. `live` tells the
   * caller which it is — never silently presents mock as real.
   */
  async getBalances(): Promise<{ live: boolean; balances: Balance[]; raw?: unknown }> {
    if (!twakConfigured() || !AGENT_ADDRESS) {
      return { live: false, balances: mockBalances };
    }
    const { balance, symbol, raw } = await this.getNativeBalance();
    // USD valuation needs a price endpoint that isn't documented yet, so usd: 0.
    const balances: Balance[] =
      balance == null ? [] : [{ token: symbol ?? "NATIVE", amount: balance, usd: 0 }];
    return { live: true, balances, raw };
  },

  /** Swap quote — UNVERIFIED path; only runs if TWAK_SWAP_QUOTE_PATH is set. */
  async getSwapQuote(input: { tokenIn: string; tokenOut: string; amount: string; chain?: string; slippage?: number }) {
    if (!PATHS.swapQuote) {
      throw new TwakError(
        "Swap-quote endpoint not configured. Set TWAK_SWAP_QUOTE_PATH once the real path is confirmed.",
        501,
        null,
      );
    }
    return twSignedFetch({
      method: "GET",
      path: PATHS.swapQuote,
      query: { from: input.tokenIn, to: input.tokenOut, amount: input.amount, chain: input.chain, slippage: input.slippage },
    });
  },

  /** Execute a swap — UNVERIFIED path; only runs if TWAK_SWAP_EXECUTE_PATH is set. */
  async signAndSendSwap(input: { tokenIn: string; tokenOut: string; amount: string; chain?: string; slippage?: number }) {
    if (!PATHS.swapExecute) {
      throw new TwakError(
        "Swap-execute endpoint not configured. Set TWAK_SWAP_EXECUTE_PATH once the real path is confirmed.",
        501,
        null,
      );
    }
    const data = await twSignedFetch<any>({ method: "POST", path: PATHS.swapExecute, body: input });
    return { ok: true, ...data, submittedAt: new Date().toISOString() };
  },

  /**
   * Self-custodial competition registration. In production this submits an
   * on-chain tx through TWAK's signing path. The public docs don't yet pin down
   * a REST path for it, so:
   *   - if TWAK isn't configured, return a clearly-flagged SIMULATED result so
   *     local/demo UI keeps working (mirrors the decide.ts demo fallback);
   *   - if TWAK_REGISTER_PATH is set, perform the real signed call;
   *   - if configured but no path is set, fail honestly (501) rather than fake success.
   */
  async registerForCompetition() {
    if (!twakConfigured()) {
      return {
        registered: true,
        simulated: true,
        registeredAt: new Date().toISOString(),
        note: "Simulated: TWAK credentials not configured.",
      };
    }
    if (!PATHS.register) {
      throw new TwakError(
        "TWAK is configured but no registration endpoint is set. Set TWAK_REGISTER_PATH once " +
          "confirmed, or register on-chain directly against CompetitionRegistry.",
        501,
        null,
      );
    }
    const data = await twSignedFetch<any>({
      method: "POST",
      path: PATHS.register,
      body: { contract: process.env.VITE_COMPETITION_CONTRACT, coin: COIN },
    });
    return { registered: true, simulated: false, registeredAt: new Date().toISOString(), data };
  },
};
