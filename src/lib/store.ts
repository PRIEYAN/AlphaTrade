import { create } from "zustand";
import { allowedTokens } from "@/lib/tokens";

// Client store for agent controls (kill switch, autonomous/running) + guardrails.
// Wallet state is NOT here — it comes from wagmi (useAccount/useBalance) so it's
// always the real connected wallet, never a stored mock.
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
  killSwitch: boolean;
  setKill: (v: boolean) => void;
  autonomous: boolean;
  setAutonomous: (v: boolean) => void;
  running: boolean;
  setRunning: (v: boolean) => void;
  guardrails: Guardrails;
  setGuardrails: (g: Partial<Guardrails>) => void;
};

export const useApp = create<Store>((set) => ({
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
