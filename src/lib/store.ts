import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { allowedTokens } from "@/lib/tokens";

// Client store for agent controls (kill switch, autonomous/running), guardrails,
// the active strategy, and the autonomous-loop decision log. Persisted to
// localStorage so the agent state + decision history survive a page refresh.
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

export type DecisionAction = "buy" | "sell" | "hold";

/** One decision produced by the agent (auto loop) or a manual Run Analysis. */
export type LoggedDecision = {
  id: string;
  at: number; // epoch ms
  source: "auto" | "manual";
  action: DecisionAction;
  tokenIn: string;
  tokenOut: string;
  sizePercent: number;
  confidence: number;
  reasoning: string;
  approved: boolean;
  reason?: string; // guardrail rejection reason
  error?: string | null; // upstream AI error (key/upstream/schema)
  execution?: {
    attempted: boolean;
    ok: boolean;
    txHash?: string;
    error?: string;
  };
};

type Store = {
  killSwitch: boolean;
  setKill: (v: boolean) => void;
  autonomous: boolean;
  setAutonomous: (v: boolean) => void;
  running: boolean;
  setRunning: (v: boolean) => void;
  // When true, the autonomous loop auto-executes approved (non-hold) trades via
  // Trust Wallet Agent Kit. When false, the loop only decides and logs.
  autoExecute: boolean;
  setAutoExecute: (v: boolean) => void;
  // How often the autonomous loop runs a decision cycle (ms).
  tickIntervalMs: number;
  setTickIntervalMs: (v: number) => void;
  // The active natural-language strategy, shared by the loop and Strategy page.
  strategy: string;
  setStrategy: (v: string) => void;
  guardrails: Guardrails;
  setGuardrails: (g: Partial<Guardrails>) => void;
  // Decision log (newest first), capped to the most recent entries.
  decisions: LoggedDecision[];
  addDecision: (d: LoggedDecision) => void;
  clearDecisions: () => void;
};

const DEFAULT_STRATEGY =
  "Rotate up to 5% from USDT into BNB when Fear & Greed is above 60 and funding stays positive. Hold otherwise.";

const MAX_LOG = 100;

// SSR-safe storage: the server has no localStorage, so fall back to a no-op.
// Shaped as zustand's StateStorage (getItem/setItem/removeItem), not full DOM Storage.
const noopStorage = {
  getItem: (_name: string) => null,
  setItem: (_name: string, _value: string) => {},
  removeItem: (_name: string) => {},
};

export const useApp = create<Store>()(
  persist(
    (set) => ({
      killSwitch: false,
      setKill: (v) => set({ killSwitch: v }),
      autonomous: true,
      setAutonomous: (v) => set({ autonomous: v }),
      running: true,
      setRunning: (v) => set({ running: v }),
      autoExecute: true,
      setAutoExecute: (v) => set({ autoExecute: v }),
      tickIntervalMs: 30_000,
      setTickIntervalMs: (v) => set({ tickIntervalMs: v }),
      strategy: DEFAULT_STRATEGY,
      setStrategy: (v) => set({ strategy: v }),
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
      decisions: [],
      addDecision: (d) =>
        set((s) => ({ decisions: [d, ...s.decisions].slice(0, MAX_LOG) })),
      clearDecisions: () => set({ decisions: [] }),
    }),
    {
      name: "alphatrade-agent",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      // Defer hydration to a client effect (see useAgentLoop) so server-rendered
      // HTML matches the first client render — avoids hydration mismatches.
      skipHydration: true,
      partialize: (s) => ({
        killSwitch: s.killSwitch,
        autonomous: s.autonomous,
        running: s.running,
        autoExecute: s.autoExecute,
        tickIntervalMs: s.tickIntervalMs,
        strategy: s.strategy,
        guardrails: s.guardrails,
        decisions: s.decisions,
      }),
    },
  ),
);

/** Stable-ish unique id for a logged decision (browser-only, non-crypto use). */
export function makeDecisionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `d_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

/** True if a timestamp falls on the current calendar day. */
export function isToday(ts: number): boolean {
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

/** Today's decision/trade/rejection counts derived from the decision log. */
export function decisionCounts(decisions: LoggedDecision[]) {
  const today = decisions.filter((d) => isToday(d.at));
  return {
    decisions: today.length,
    trades: today.filter((d) => d.execution?.ok).length,
    rejected: today.filter((d) => !d.approved).length,
  };
}
