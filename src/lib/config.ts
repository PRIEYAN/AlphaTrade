// Client-safe config. Only VITE_-prefixed env vars are readable in the browser;
// server-only secrets (GROQ_API_KEY, TWAK_API_KEY, ...) are read inside server
// handlers and never appear here.
const env = import.meta.env;

export const config = {
  appName: "AlphaTrade",
  telegram: "https://t.me/+MhiOLT0YUnlmNWFk",

  // On-chain
  chainId: Number(env.VITE_CHAIN_ID ?? 56),
  bscRpcUrl: env.VITE_BSC_RPC_URL ?? "https://bsc-dataseed.binance.org",
  competitionContract:
    env.VITE_COMPETITION_CONTRACT ?? "0x212c61b9b72c95d95bf29cf032f5e5635629aed5",
  walletConnectProjectId: env.VITE_WALLETCONNECT_PROJECT_ID ?? "",

  // Explorers
  bscScan: "https://bscscan.com",
  bscTrace: "https://bsctrace.com",
};

// Small helpers so explorer URLs aren't hand-built at each call site.
export const explorer = {
  tx: (hash: string) => `${config.bscScan}/tx/${hash}`,
  address: (addr: string) => `${config.bscScan}/address/${addr}`,
  contract: (addr: string) => `${config.bscTrace}/address/${addr}`,
};
