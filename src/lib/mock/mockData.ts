// Centralized mock data for service stubs. Real integrations should replace these.
export const allowedTokens = [
  "BNB", "CAKE", "BTCB", "ETH", "USDT", "BUSD", "USDC", "XRP", "ADA", "DOT",
  "LINK", "MATIC", "AVAX", "SOL", "DOGE", "SHIB", "TRX", "LTC", "UNI", "ATOM",
];

export const mockFearGreed = { value: 62, label: "Greed", updatedAt: Date.now() };

export const mockFundingRates = [
  { symbol: "BTC", rate: 0.0124, exchange: "Binance" },
  { symbol: "ETH", rate: 0.0089, exchange: "Binance" },
  { symbol: "BNB", rate: 0.0156, exchange: "Binance" },
  { symbol: "SOL", rate: -0.0042, exchange: "Binance" },
  { symbol: "AVAX", rate: 0.0067, exchange: "Binance" },
];

export const mockSentiment = [
  { symbol: "BNB", score: 0.78, mentions: 12_340 },
  { symbol: "BTC", score: 0.65, mentions: 89_210 },
  { symbol: "CAKE", score: 0.54, mentions: 3_120 },
  { symbol: "ETH", score: 0.71, mentions: 45_667 },
];

export const mockMomentum = [
  { symbol: "BNB", rsi: 58, macd: 0.42 },
  { symbol: "CAKE", rsi: 71, macd: 0.18 },
  { symbol: "BTC", rsi: 55, macd: 0.31 },
];

export const mockPortfolioSeries = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(5, 10),
  value: 10000 + Math.round(Math.sin(i / 3) * 800 + i * 65 + Math.random() * 200),
}));

export const mockAllocation = [
  { name: "BNB", value: 42, color: "var(--brand-lime)" },
  { name: "BTCB", value: 28, color: "var(--brand-pink)" },
  { name: "ETH", value: 18, color: "var(--brand-orange)" },
  { name: "USDT", value: 12, color: "var(--brand-cyan)" },
];

export const mockBalances = [
  { token: "BNB", amount: 12.4, usd: 7440 },
  { token: "BTCB", amount: 0.082, usd: 5380 },
  { token: "ETH", amount: 1.45, usd: 4810 },
  { token: "USDT", amount: 1820, usd: 1820 },
];

export const mockTrades = Array.from({ length: 14 }, (_, i) => ({
  id: `t_${i + 1}`,
  time: new Date(Date.now() - i * 3600_000).toISOString(),
  action: i % 3 === 0 ? "SELL" : "BUY",
  pair: ["BNB/USDT", "CAKE/BNB", "ETH/USDT", "BTCB/USDT"][i % 4],
  size: `${(Math.random() * 4 + 0.1).toFixed(3)}`,
  status: i === 0 ? "PENDING" : i % 7 === 0 ? "FAILED" : "CONFIRMED",
  txHash: `0x${Math.random().toString(16).slice(2).padEnd(64, "a").slice(0, 64)}`,
}));

export const mockDecisions = Array.from({ length: 10 }, (_, i) => ({
  id: `d_${i + 1}`,
  ts: new Date(Date.now() - i * 1800_000).toISOString(),
  action: ["buy", "hold", "sell", "buy"][i % 4] as "buy" | "hold" | "sell",
  pair: "BNB/USDT",
  confidence: Number((0.5 + Math.random() * 0.45).toFixed(2)),
  approved: i % 4 !== 1,
  reason: i % 4 === 1
    ? "Rejected: size 18% exceeds per-trade limit of 10%"
    : "Approved by guardrails",
}));

export const mockX402Payments = Array.from({ length: 8 }, (_, i) => ({
  id: `pay_${i + 1}`,
  ts: new Date(Date.now() - i * 600_000).toISOString(),
  endpoint: ["/cmc/feargreed", "/cmc/funding", "/cmc/sentiment", "/cmc/momentum"][i % 4],
  amount: 0.001,
  asset: "USDC",
  status: "settled",
}));
