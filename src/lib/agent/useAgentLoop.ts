import { useEffect, useRef } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { appChain } from "@/lib/wagmi";
import { useApp, isToday, makeDecisionId, type LoggedDecision } from "@/lib/store";
import { fetchSignals } from "@/lib/services/cmcService";
import { toast } from "sonner";

// =============================================================================
// Autonomous agent loop.
//
// This is what makes "RUNNING" actually run. While running && autonomous &&
// !killSwitch, it fires a decision cycle every `tickIntervalMs`:
//   1. pull live signals (Fear & Greed) + on-chain context (block/gas),
//   2. ask the Groq decision engine (/api/agent/decide) for a decision,
//   3. log it (fills the Overview counters + decision feed),
//   4. if approved + non-hold + autoExecute, send the swap via Trust Wallet
//      Agent Kit (server-side signing) and record the real result.
//
// Mount this ONCE, high in the dashboard tree (DashboardLayout), so it runs no
// matter which tab is open. Every guardrail is enforced server-side too; this
// loop just drives the clock.
// =============================================================================

export function useAgentLoop() {
  const running = useApp((s) => s.running);
  const autonomous = useApp((s) => s.autonomous);
  const killSwitch = useApp((s) => s.killSwitch);
  const autoExecute = useApp((s) => s.autoExecute);
  const tickIntervalMs = useApp((s) => s.tickIntervalMs);
  const strategy = useApp((s) => s.strategy);
  const guardrails = useApp((s) => s.guardrails);
  const decisions = useApp((s) => s.decisions);
  const addDecision = useApp((s) => s.addDecision);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: bal } = useBalance({
    address,
    chainId: appChain.id,
    query: { enabled: isConnected },
  });

  // Load persisted state on the client only (store uses skipHydration).
  useEffect(() => {
    void useApp.persist.rehydrate();
  }, []);

  // Re-created every render so it always closes over the latest state; the
  // interval invokes `tickRef.current`, so it never runs a stale snapshot.
  const busy = useRef(false);
  const tickRef = useRef<() => Promise<void>>(async () => {});

  tickRef.current = async () => {
    if (busy.current) return;
    if (!running || !autonomous || killSwitch) return;
    busy.current = true;
    try {
      const today = decisions.filter((d) => isToday(d.at));
      const tradesToday = today.filter((d) => d.execution?.ok).length;

      // 1. live signals + on-chain context (best-effort; nulls are fine).
      const [signals, onchain] = await Promise.all([
        fetchSignals().catch(() => null),
        fetch("/api/bnb/context")
          .then((r) => r.json())
          .catch(() => null),
      ]);

      // 2. ask the decision engine.
      const res = await fetch("/api/agent/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          signals: {
            fearGreed: signals?.fearGreed ?? undefined,
            funding: signals?.funding ?? undefined,
            sentiment: signals?.sentiment ?? undefined,
            onchain: onchain?.ok ? onchain : undefined,
          },
          guardrails: {
            ...guardrails,
            killSwitch,
            tradesToday,
            spentTodayUsd: 0,
            drawdownPct: 0,
            portfolioValueUsd: 0,
          },
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const d = data.decision;
      const approved = Boolean(data.validation?.approved) && !data.error;

      // 3. optional auto-execution of an approved, non-hold trade.
      let execution: LoggedDecision["execution"];
      if (approved && d.action !== "hold" && autoExecute) {
        if (!isConnected || chainId !== appChain.id) {
          execution = { attempted: false, ok: false, error: "wallet not connected / wrong chain" };
        } else if (tradesToday >= guardrails.dailyTradeCap) {
          execution = { attempted: false, ok: false, error: "daily trade cap reached" };
        } else {
          execution = await executeSwap(d);
        }
      }

      addDecision({
        id: makeDecisionId(),
        at: Date.now(),
        source: "auto",
        action: d.action,
        tokenIn: d.tokenIn,
        tokenOut: d.tokenOut,
        sizePercent: d.sizePercent,
        confidence: d.confidence,
        reasoning: d.reasoning,
        approved,
        reason: data.validation?.reason,
        error: data.error ?? null,
        execution,
      });

      if (execution?.ok) {
        toast.success(`Auto-trade executed: ${d.action} ${d.tokenOut}`);
      } else if (execution?.attempted) {
        toast.error(`Auto-trade failed: ${execution.error}`);
      }
    } catch {
      // Never let a single bad tick kill the loop.
    } finally {
      busy.current = false;
    }
  };

  // Route an approved decision through Trust Wallet Agent Kit (server signs).
  const executeSwap = async (d: {
    tokenIn: string;
    tokenOut: string;
    sizePercent: number;
  }): Promise<LoggedDecision["execution"]> => {
    // Auto-size only when selling native BNB from the connected wallet;
    // otherwise send 0 and let the configured TWAK layer resolve the amount.
    let amount = "0";
    if (d.tokenIn.toUpperCase() === "BNB" && bal) {
      amount = ((Number(formatUnits(bal.value, bal.decimals)) * d.sizePercent) / 100).toFixed(6);
    }
    try {
      const res = await fetch("/api/twak/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenIn: d.tokenIn,
          tokenOut: d.tokenOut,
          amount,
          slippage: guardrails.slippagePct,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { attempted: true, ok: false, error: data.error ?? "swap failed" };
      return { attempted: true, ok: true, txHash: data.txHash };
    } catch (e) {
      return { attempted: true, ok: false, error: e instanceof Error ? e.message : "swap request failed" };
    }
  };

  // The recurring clock. Recreated only when the cadence changes.
  useEffect(() => {
    const ms = Math.max(5_000, tickIntervalMs || 30_000);
    const id = setInterval(() => void tickRef.current?.(), ms);
    return () => clearInterval(id);
  }, [tickIntervalMs]);

  // Fire one cycle shortly after the agent is (re)started, so the demo reacts
  // quickly instead of waiting a full interval.
  useEffect(() => {
    if (running && autonomous && !killSwitch) {
      const t = setTimeout(() => void tickRef.current?.(), 2_000);
      return () => clearTimeout(t);
    }
  }, [running, autonomous, killSwitch]);
}
