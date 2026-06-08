// Client-safe config. Only VITE_-prefixed env vars are readable in the browser;
// server-only secrets (GROQ_API_KEY, TWAK_API_KEY, ...) are read inside server
// handlers and never appear here.
//
// Defaults target BNB Smart Chain TESTNET (chain 97). Flip to mainnet by setting
// VITE_CHAIN_ID=56 (+ the matching RPC / explorer / contract) in .env.
const env = import.meta.env;

const chainId = Number(env.VITE_CHAIN_ID ?? 97);
const isMainnet = chainId === 56;

export const config = {
  appName: "AlphaTrade",
  telegram: "https://t.me/+MhiOLT0YUnlmNWFk",

  // On-chain
  chainId,
  bscRpcUrl:
    env.VITE_BSC_RPC_URL ??
    (isMainnet
      ? "https://bsc-dataseed.binance.org"
      : "https://bsc-testnet-rpc.publicnode.com"),
  // No default on testnet — deploy CompetitionRegistry and set this in .env.
  competitionContract: env.VITE_COMPETITION_CONTRACT ?? "",

  // Explorer (testnet by default)
  bscScan: isMainnet ? "https://bscscan.com" : "https://testnet.bscscan.com",
  bscTrace: isMainnet ? "https://bsctrace.com" : "https://testnet.bscscan.com",
};

// Small helpers so explorer URLs aren't hand-built at each call site.
export const explorer = {
  tx: (hash: string) => `${config.bscScan}/tx/${hash}`,
  address: (addr: string) => `${config.bscScan}/address/${addr}`,
  contract: (addr: string) => `${config.bscTrace}/address/${addr}`,
};
