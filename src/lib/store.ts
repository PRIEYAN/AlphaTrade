import { create } from "zustand";

// Tiny client store for mock wallet + kill switch + guardrails.
// TODO: replace wallet with real wagmi/viem integration.
type Wallet = { address: string | null; balanceBnb: number; connected: boolean };

type Guardrails = {
  maxPerTradePct: number;
  dailyTradeCap: number;
  dailySpendLimitUsd: number;
  maxDrawdownPct: number;
  slippagePct: number;
  minConfidence: number;
  allowlist: string[];
};

type Store = {
  wallet: Wallet;
  connect: () => void;
  disconnect: () => void;
  killSwitch: boolean;
  setKill: (v: boolean) => void;
  autonomous: boolean;
  setAutonomous: (v: boolean) => void;
  running: boolean;
  setRunning: (v: boolean) => void;
  guardrails: Guardrails;
  setGuardrails: (g: Partial<Guardrails>) => void;
};

import { allowedTokens } from "@/lib/mock/mockData";

export const useApp = create<Store>((set) => ({
  wallet: { address: null, balanceBnb: 0, connected: false },
  connect: () =>
    set({
      wallet: {
        address: "0x" + Math.random().toString(16).slice(2, 10) + "...d4a2",
        balanceBnb: 12.4,
        connected: true,
      },
    }),
  disconnect: () => set({ wallet: { address: null, balanceBnb: 0, connected: false } }),
  killSwitch: false,
  setKill: (v) => set({ killSwitch: v }),
  autonomous: true,
  setAutonomous: (v) => set({ autonomous: v }),
  running: true,
  setRunning: (v) => set({ running: v }),
  guardrails: {
    maxPerTradePct: 10,
    dailyTradeCap: 20,
    dailySpendLimitUsd: 2000,
    maxDrawdownPct: 15,
    slippagePct: 1,
    minConfidence: 0.6,
    allowlist: allowedTokens.slice(0, 10),
  },
  setGuardrails: (g) => set((s) => ({ guardrails: { ...s.guardrails, ...g } })),
}));
