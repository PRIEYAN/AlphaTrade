// Trust Wallet Agent Kit — THE ONLY execution/signing layer. SERVER ONLY.
// Confirmed endpoints from portal.trustwallet.com API reference:
//   GET  /v1/search/assets            — asset search
//   GET  /v1/coinstatus/{assetId}     — asset status
//   POST /amber-api/v1/route          — get swap route / quote
//   POST /amber-api/v1/route/step     — execute one swap step
//   POST /v2/market/tickers           — market price data
//   GET  /v1/validate                 — address / security validation
//   GET  /v1/buycrypto/quote/{assetId} — on-ramp quote
import { twSignedFetch, twakConfigured, TwakError } from "./twClient";

const AGENT_ADDRESS = process.env.TWAK_AGENT_ADDRESS || "";
const COIN = process.env.TWAK_COIN || "60"; // SLIP44; 60 = EVM (BSC / Ethereum)

// All paths now confirmed from the official portal docs.
const PATHS = {
  search:        "/v1/search/assets",
  coinStatus:    "/v1/coinstatus",
  swapRoute:     "/amber-api/v1/route",       // get quote + route
  swapStep:      "/amber-api/v1/route/step",  // execute one step of the route
  marketTickers: "/v2/market/tickers",
  validate:      "/v1/validate",
  balance:       "/v1/wallet/balance",
  buyCrypto:     "/v1/buycrypto/quote",
  register:      process.env.TWAK_REGISTER_PATH || "", // competition reg path — set if known
};

export type Balance = { token: string; amount: number; usd: number };

function pickBalance(raw: any): { amount: number | null; symbol: string | null } {
  const node = raw?.data ?? raw?.result ?? raw ?? {};
  const amountRaw = node.balance ?? node.amount ?? node.value ?? node.available ?? null;
  const amount = amountRaw == null ? null : Number(amountRaw);
  const symbol = node.symbol ?? node.coin ?? node.asset ?? node.ticker ?? null;
  return { amount: Number.isFinite(amount as number) ? (amount as number) : null, symbol };
}

export const twakService = {
  /** Connectivity self-test — proves credentials and HMAC signing are correct. */
  async ping() {
    const data = await twSignedFetch({
      method: "GET",
      path: PATHS.search,
      query: { query: "ethereum", limit: 1 },
    });
    return { ok: true, data };
  },

  /** Search for an asset by name or symbol. */
  async searchAssets(query: string, limit = 5) {
    return twSignedFetch({ method: "GET", path: PATHS.search, query: { query, limit } });
  },

  /** Asset status / info by assetId. */
  async getCoinStatus(assetId: string) {
    return twSignedFetch({ method: "GET", path: `${PATHS.coinStatus}/${assetId}` });
  },

  /** Market tickers — live prices for one or more assets. */
  async getMarketTickers(assetIds: string[]) {
    return twSignedFetch({
      method: "POST",
      path: PATHS.marketTickers,
      body: { assets: assetIds },
    });
  },

  /** Validate an address for security (scam / blacklist check). */
  async validateAddress(address: string, coin = COIN) {
    return twSignedFetch({
      method: "GET",
      path: PATHS.validate,
      query: { address, coin },
    });
  },

  /** Native wallet balance for the configured agent wallet. */
  async getNativeBalance() {
    if (!twakConfigured()) throw new TwakError("TWAK not configured.", 0, null);
    if (!AGENT_ADDRESS) throw new TwakError("TWAK_AGENT_ADDRESS not set.", 0, null);
    const raw = await twSignedFetch<any>({
      method: "GET",
      path: PATHS.balance,
      query: { address: AGENT_ADDRESS, coin: COIN },
    });
    const { amount, symbol } = pickBalance(raw);
    return { live: true, address: AGENT_ADDRESS, coin: COIN, balance: amount, symbol, raw };
  },

  async getBalances(): Promise<{ live: boolean; balances: Balance[]; raw?: unknown }> {
    if (!twakConfigured() || !AGENT_ADDRESS) return { live: false, balances: [] };
    const { balance, symbol, raw } = await this.getNativeBalance();
    const balances: Balance[] =
      balance == null ? [] : [{ token: symbol ?? "NATIVE", amount: balance, usd: 0 }];
    return { live: true, balances, raw };
  },

  /**
   * Step 1 — Get a swap route + quote from the Amber DEX aggregator.
   * Confirmed path: POST /amber-api/v1/route
   *
   * Body fields (standard DEX aggregator convention):
   *   fromToken   — symbol or contract address (e.g. "BNB" or "0x...")
   *   toToken     — symbol or contract address
   *   amount      — amount in smallest unit (wei / satoshi) or as a decimal string
   *   slippage    — tolerance % e.g. 1 for 1%
   *   fromAddress — wallet doing the swap (the agent wallet)
   */
  async getSwapRoute(input: {
    fromToken: string;
    toToken: string;
    amount: string;
    slippage?: number;
    fromAddress?: string;
  }) {
    return twSignedFetch<any>({
      method: "POST",
      path: PATHS.swapRoute,
      body: {
        fromToken: input.fromToken,
        toToken: input.toToken,
        amount: input.amount,
        slippage: input.slippage ?? 1,
        fromAddress: input.fromAddress ?? AGENT_ADDRESS,
      },
    });
  },

  /**
   * Step 2 — Execute one step of a swap route.
   * Confirmed path: POST /amber-api/v1/route/step
   *
   * Pass the step object returned by getSwapRoute (route.steps[0] or similar).
   */
  async executeSwapStep(step: unknown) {
    return twSignedFetch<any>({
      method: "POST",
      path: PATHS.swapStep,
      body: step,
    });
  },

  /**
   * Full swap: get route → execute first step.
   * Returns txHash on success. Used by /api/twak/swap.
   */
  async signAndSendSwap(input: {
    tokenIn: string;
    tokenOut: string;
    amount: string;
    chain?: string;
    slippage?: number;
  }) {
    // Step 1: get the route.
    const route = await this.getSwapRoute({
      fromToken: input.tokenIn,
      toToken: input.tokenOut,
      amount: input.amount,
      slippage: input.slippage ?? 1,
    });

    // Step 2: execute the first step in the route.
    // The exact shape of route varies; try common field names.
    const steps = route?.data?.steps ?? route?.steps ?? route?.route?.steps ?? [route];
    const firstStep = Array.isArray(steps) ? steps[0] : steps;
    const result = await this.executeSwapStep(firstStep);

    const txHash =
      result?.data?.txHash ??
      result?.txHash ??
      result?.data?.hash ??
      result?.hash ??
      null;

    return { ok: true, txHash, route, result, submittedAt: new Date().toISOString() };
  },

  /**
   * Competition registration via TWAK signing.
   * If TWAK_REGISTER_PATH is not set, returns 501 so the UI can fall back
   * to direct on-chain wallet signing via wagmi.
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
        "TWAK is configured but TWAK_REGISTER_PATH is not set. " +
          "The UI will fall back to direct on-chain signing.",
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
