// BNB on-chain agent layer — real reads from BNB Smart Chain via viem.
// viem is the EVM/BNB SDK here: it talks to the chain over the configured RPC.
// No API key required for reads. Chain is env-switchable, defaulting to TESTNET.
import { createPublicClient, http, formatGwei } from "viem";
import { bsc, bscTestnet } from "viem/chains";

const chainId = Number(process.env.VITE_CHAIN_ID || 97);
const chain = chainId === 56 ? bsc : bscTestnet;

const rpc =
  process.env.BNB_AGENT_RPC ||
  process.env.VITE_BSC_RPC_URL ||
  (chain.id === bsc.id
    ? "https://bsc-dataseed.binance.org"
    : "https://bsc-testnet-rpc.publicnode.com");

const client = createPublicClient({ chain, transport: http(rpc) });

export type OnChainContext = {
  chainId: number;
  blockNumber: number;
  gasPriceGwei: number;
  rpc: string;
};

export const bnbAgentService = {
  /** Live BNB Smart Chain context (block height, gas price). */
  async getOnChainContext(): Promise<OnChainContext> {
    const [blockNumber, gasPrice] = await Promise.all([
      client.getBlockNumber(),
      client.getGasPrice(),
    ]);
    return {
      chainId: chain.id,
      blockNumber: Number(blockNumber),
      gasPriceGwei: Number(Number(formatGwei(gasPrice)).toFixed(3)),
      rpc,
    };
  },
};
