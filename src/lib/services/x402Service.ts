// x402 pay-per-request stub. Logs each "payment" to the in-memory ledger.
// TODO: wire real integration (x402 facilitator HTTP 402 challenge/settle).
import { mockX402Payments } from "@/lib/mock/mockData";

const ledger: typeof mockX402Payments = [...mockX402Payments];

export const x402Service = {
  async pay(endpoint: string, amount = 0.001) {
    const entry = {
      id: `pay_${Date.now()}`,
      ts: new Date().toISOString(),
      endpoint,
      amount,
      asset: "USDC",
      status: "settled" as const,
    };
    ledger.unshift(entry);
    return entry;
  },
  list() {
    return ledger.slice(0, 50);
  },
};
