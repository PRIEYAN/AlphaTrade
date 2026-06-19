import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { allowedTokens } from "@/lib/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

type Guardrails = {
  maxPerTradePct: number;
  dailyTradeCap: number;
  dailySpendLimitUsd: number;
  maxDrawdownPct: number;
  slippagePct: number;
  minConfidence: number;
  allowlist: string[];
};

/** Operating mode — determines what happens after an approved decision. */
export type TradingMode = "analysis" | "paper" | "testnet" | "mainnet";

export type DecisionAction = "buy" | "sell" | "hold";

/** Snapshot of market conditions captured at decision time. */
export type MarketSnapshot = {
  fearGreed?: { value: number; label: string } | null;
  price?: number | null;
  priceChange24h?: number | null;
  volume24h?: number | null;
  orderbookImbalance?: number | null;
  blockNumber?: number | null;
  gasPriceGwei?: number | null;
};

/** Per-check result from the deterministic risk engine. */
export type RiskChecks = Record<string, "PASS" | "FAIL">;

/** Full audit record for one agent cycle (manual or autonomous). */
export type TradeRecord = {
  id: string;
  at: number; // epoch ms
  source: "auto" | "manual";
  mode: TradingMode;

  // Market context at decision time
  marketSnapshot: MarketSnapshot;

  // AI decision
  action: DecisionAction;
  tokenIn: string;
  tokenOut: string;
  sizePercent: number;
  confidence: number;
  reasoning: string;

  // Risk engine output
  approved: boolean;
  riskReason?: string;
  riskChecks?: RiskChecks;

  // Execution result
  status: "executed" | "simulated" | "rejected" | "analysis";
  entryPrice?: number | null;   // paper/live entry price
  txHash?: string | null;

  // SLM explanation (generated post-decision)
  explanation?: string | null;

  // Error from AI layer (not a guardrail rejection)
  aiError?: string | null;
};

// ─── Store ────────────────────────────────────────────────────────────────────

type Store = {
  killSwitch: boolean;
  setKill: (v: boolean) => void;

  mode: TradingMode;
  setMode: (m: TradingMode) => void;

  autonomous: boolean;
  setAutonomous: (v: boolean) => void;
  running: boolean;
  setRunning: (v: boolean) => void;

  tickIntervalMs: number;
  setTickIntervalMs: (v: number) => void;

  strategy: string;
  setStrategy: (v: string) => void;

  guardrails: Guardrails;
  setGuardrails: (g: Partial<Guardrails>) => void;

  // Full trade audit trail (newest first, capped at MAX_LOG)
  trades: TradeRecord[];
  addTrade: (t: TradeRecord) => void;
  clearTrades: () => void;
};

const DEFAULT_STRATEGY =
  "Rotate up to 5% from USDT into BNB when Fear & Greed is above 60 and funding stays positive. Hold otherwise.";

const MAX_LOG = 200;

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

      mode: "paper",
      setMode: (m) => set({ mode: m }),

      autonomous: true,
      setAutonomous: (v) => set({ autonomous: v }),
      running: true,
      setRunning: (v) => set({ running: v }),

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

      trades: [],
      addTrade: (t) =>
        set((s) => ({ trades: [t, ...s.trades].slice(0, MAX_LOG) })),
      clearTrades: () => set({ trades: [] }),
    }),
    {
      name: "alphatrade-v2",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      skipHydration: true,
      partialize: (s) => ({
        killSwitch: s.killSwitch,
        mode: s.mode,
        autonomous: s.autonomous,
        running: s.running,
        tickIntervalMs: s.tickIntervalMs,
        strategy: s.strategy,
        guardrails: s.guardrails,
        trades: s.trades,
      }),
    },
  ),
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function makeTradeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export function isToday(ts: number): boolean {
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export function tradeCounts(trades: TradeRecord[]) {
  const today = trades.filter((t) => isToday(t.at));
  return {
    total: today.length,
    executed: today.filter((t) => t.status === "executed").length,
    simulated: today.filter((t) => t.status === "simulated").length,
    rejected: today.filter((t) => t.status === "rejected").length,
    approved: today.filter((t) => t.approved).length,
  };
}

export function paperPnl(trades: TradeRecord[], currentPrice: number | null): number | null {
  if (currentPrice === null) return null;
  const paperBuys = trades.filter(
    (t) => t.status === "simulated" && t.action === "buy" && t.entryPrice,
  );
  if (paperBuys.length === 0) return null;
  return paperBuys.reduce((sum, t) => {
    const entry = t.entryPrice!;
    const pct = ((currentPrice - entry) / entry) * 100;
    return sum + pct;
  }, 0) / paperBuys.length;
}

export const MODE_LABELS: Record<TradingMode, string> = {
  analysis: "Analysis Only",
  paper: "Paper Trading",
  testnet: "Testnet",
  mainnet: "Mainnet",
};

export const MODE_COLORS: Record<TradingMode, string> = {
  analysis: "bg-card",
  paper: "bg-cyan",
  testnet: "bg-lime",
  mainnet: "bg-pink",
};
