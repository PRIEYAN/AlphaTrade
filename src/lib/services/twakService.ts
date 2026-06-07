// Trust Wallet Agent Kit — THE ONLY execution/signing layer.
// Signing happens server-side via TWAK; private keys NEVER reach the browser.
// TODO: wire real integration with TWAK_API_URL + TWAK_API_KEY.
import { mockBalances } from "@/lib/mock/mockData";

export const twakService = {
  async signAndSendSwap(input: { tokenIn: string; tokenOut: string; sizePercent: number }) {
    const txHash = `0x${Math.random().toString(16).slice(2).padEnd(64, "b").slice(0, 64)}`;
    return { ok: true, txHash, ...input, submittedAt: new Date().toISOString() };
  },
  async getBalances() {
    return mockBalances;
  },
  async registerForCompetition() {
    return { registered: true, registeredAt: new Date().toISOString() };
  },
};
