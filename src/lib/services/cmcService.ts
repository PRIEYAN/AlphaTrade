// CoinMarketCap AI Agent Hub stub. Uses x402 for pay-per-call.
// TODO: wire real integration via CMC_AGENT_BASE_URL + CMC_AGENT_API_KEY.
import {
  mockFearGreed,
  mockFundingRates,
  mockSentiment,
  mockMomentum,
} from "@/lib/mock/mockData";
import { x402Service } from "./x402Service";

export const cmcService = {
  async getFearAndGreed() {
    await x402Service.pay("/cmc/feargreed");
    return mockFearGreed;
  },
  async getFundingRates() {
    await x402Service.pay("/cmc/funding");
    return mockFundingRates;
  },
  async getSentiment() {
    await x402Service.pay("/cmc/sentiment");
    return mockSentiment;
  },
  async getMomentum() {
    await x402Service.pay("/cmc/momentum");
    return mockMomentum;
  },
};
