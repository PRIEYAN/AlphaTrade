// BNB on-chain agent layer — real reads from BNB Smart Chain via viem.
// viem IS the EVM/BNB SDK here: it talks to the chain over the public (or
// configured) RPC. No API key required for reads. Used by /api/bnb/context to
// give the agent live network conditions (block height, gas) as a real signal.
import { createPublicClient, http, formatGwei } from "viem";
import { bsc } from "viem/chains";

const rpc =
  process.env.BNB_AGENT_RPC ||
  process.env.VITE_BSC_RPC_URL ||
  "https://bsc-dataseed.binance.org";

const client = createPublicClient({ chain: bsc, transport: http(rpc) });

export type OnChainContext = {
  chainId: number;
  blockNumber: number;
  gasPriceGwei: number;
  rpc: string;
};

export const bnbAgentService = {
  /** Live BNB Smart Chain context (real RPC reads). */
  async getOnChainContext(): Promise<OnChainContext> {
    const [blockNumber, gasPrice] = await Promise.all([
      client.getBlockNumber(),
      client.getGasPrice(),
    ]);
    return {
      chainId: bsc.id,
      blockNumber: Number(blockNumber),
      gasPriceGwei: Number(Number(formatGwei(gasPrice)).toFixed(3)),
      rpc,
    };
  },
};
