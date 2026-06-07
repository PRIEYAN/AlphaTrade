// BNB AI Agent SDK stub.
// TODO: wire real integration with BNB_AGENT_RPC + BNB_AGENT_KEY.
export const bnbAgentService = {
  async initAgent() {
    return { agentId: "bnbagent_demo_001", chainId: 56, ready: true };
  },
  async getOnChainContext() {
    return {
      blockNumber: 41_233_122,
      gasPriceGwei: 3,
      bnbUsd: 600.12,
      timestamp: Date.now(),
    };
  },
};
