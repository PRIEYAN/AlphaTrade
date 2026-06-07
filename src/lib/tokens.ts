// Competition-eligible BEP-20 tokens (allowlist source of truth).
// This is configuration, not mock data — the guardrail validator uses it to
// reject any swap whose tokenIn/tokenOut isn't on the list.
// TODO: ideally sourced from the competition registry / CMC at runtime; the
// curated static list below is the starting set.
export const allowedTokens = [
  "BNB", "CAKE", "BTCB", "ETH", "USDT", "BUSD", "USDC", "XRP", "ADA", "DOT",
  "LINK", "MATIC", "AVAX", "SOL", "DOGE", "SHIB", "TRX", "LTC", "UNI", "ATOM",
];
