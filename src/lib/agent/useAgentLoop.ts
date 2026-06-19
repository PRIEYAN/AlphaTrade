import { useEffect, useRef } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { appChain } from "@/lib/wagmi";
import { useApp, isToday, makeTradeId, type TradeRecord, type MarketSnapshot } from "@/lib/store";
import { fetchSignals } from "@/lib/services/cmcService";
import { toast } from "sonner";

// =============================================================================
// Autonomous agent loop.
//
// While running && autonomous && !killSwitch, fires a decision cycle every
// `tickIntervalMs`:
//   1. Pull live signals (Fear & Greed) + Binance price + on-chain context.
//   2. Ask the Python Agent (/api/agent/decide) for a decision + explanation.
//   3. Route to paper log, TWAK testnet/mainnet, or just log (analysis mode).
//   4. Save the full TradeRecord to the store for the audit trail.
//
// All guardrail logic lives in the Python Agent — the loop only drives the
// clock and persists the result.
// =============================================================================

export function useAgentLoop() {
  const running = useApp((s) => s.running);
  const autonomous = useApp((s) => s.autonomous);
  const killSwitch = useApp((s) => s.killSwitch);
  const mode = useApp((s) => s.mode);
  const tickIntervalMs = useApp((s) => s.tickIntervalMs);
  const strategy = useApp((s) => s.strategy);
  const guardrails = useApp((s) => s.guardrails);
  const trades = useApp((s) => s.trades);
  const addTrade = useApp((s) => s.addTrade);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: bal } = useBalance({
    address,
    chainId: appChain.id,
    query: { enabled: isConnected },
  });

  useEffect(() => {
    void useApp.persist.rehydrate();
  }, []);

  const busy = useRef(false);
  const tickRef = useRef<() => Promise<void>>(async () => {});

  tickRef.current = async () => {
    if (busy.current) return;
    if (!running || !autonomous || killSwitch) return;
    busy.current = true;
    try {
      const today = trades.filter((t) => isToday(t.at));
      const tradesToday = today.filter((t) => t.status === "executed" || t.status === "simulated").length;

      // 1. Fetch all live context in parallel.
      const [signals, onchain, market] = await Promise.all([
        fetchSignals().catch(() => null),
        fetch("/api/bnb/context").then((r) => r.json()).catch(() => null),
        fetch("/api/market?symbol=BNBUSDT").then((r) => r.json()).catch(() => null),
      ]);

      const marketSnapshot: MarketSnapshot = {
        fearGreed: signals?.fearGreed ?? null,
        price: market?.price ?? null,
        priceChange24h: market?.priceChange24h ?? null,
        volume24h: market?.volume24hUsdt ?? null,
        orderbookImbalance: market?.orderbookImbalance ?? null,
        blockNumber: onchain?.ok ? onchain.blockNumber : null,
        gasPriceGwei: onchain?.ok ? onchain.gasPriceGwei : null,
      };

      // 2. Ask the Python Agent for a decision.
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
            binance: market?.price ? market : undefined,
            mode,
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

      if (!res.ok && res.status !== 503) return;
      const data = await res.json();
      const d = data.decision;
      const approved = Boolean(data.validation?.approved) && !data.error;

      // 3. Execute according to mode.
      let status: TradeRecord["status"] = "analysis";
      let txHash: string | null = null;
      let entryPrice: number | null = null;

      if (approved && d.action !== "hold") {
        if (mode === "paper") {
          status = "simulated";
          entryPrice = marketSnapshot.price ?? null;
        } else if (mode === "testnet" || mode === "mainnet") {
          const execResult = await executeSwap(d, bal, guardrails.slippagePct, isConnected, chainId);
          status = execResult.ok ? "executed" : "simulated";
          txHash = execResult.txHash ?? null;
          entryPrice = execResult.ok ? (marketSnapshot.price ?? null) : null;
          if (execResult.ok) {
            toast.success(`Trade executed: ${d.action} ${d.tokenOut}`);
          } else if (execResult.error) {
            toast.error(`Exec failed: ${execResult.error}`);
            status = "simulated"; // fall back to paper
            entryPrice = marketSnapshot.price ?? null;
          }
        }
        // analysis mode: status stays "analysis"
      } else if (!approved) {
        status = "rejected";
      }

      // Build per-check risk summary for the drawer.
      const riskChecks = buildRiskChecks(data.validation);

      addTrade({
        id: makeTradeId(),
        at: Date.now(),
        source: "auto",
        mode,
        marketSnapshot,
        action: d.action,
        tokenIn: d.tokenIn,
        tokenOut: d.tokenOut,
        sizePercent: d.sizePercent,
        confidence: d.confidence,
        reasoning: d.reasoning,
        approved,
        riskReason: data.validation?.reason,
        riskChecks,
        status,
        entryPrice,
        txHash,
        explanation: data.explanation ?? null,
        aiError: data.error ?? null,
      });
    } catch {
      // Never let a single bad tick kill the loop.
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    const ms = Math.max(5_000, tickIntervalMs || 30_000);
    const id = setInterval(() => void tickRef.current?.(), ms);
    return () => clearInterval(id);
  }, [tickIntervalMs]);

  useEffect(() => {
    if (running && autonomous && !killSwitch) {
      const t = setTimeout(() => void tickRef.current?.(), 2_000);
      return () => clearTimeout(t);
    }
  }, [running, autonomous, killSwitch]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function executeSwap(
  d: { tokenIn: string; tokenOut: string; sizePercent: number },
  bal: { value: bigint; decimals: number } | undefined,
  slippagePct: number,
  isConnected: boolean,
  chainId: number,
): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  if (!isConnected || chainId !== appChain.id) {
    return { ok: false, error: "wallet not connected / wrong chain" };
  }
  let amount = "0";
  if (d.tokenIn.toUpperCase() === "BNB" && bal) {
    amount = ((Number(formatUnits(bal.value, bal.decimals)) * d.sizePercent) / 100).toFixed(6);
  }
  try {
    const res = await fetch("/api/twak/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenIn: d.tokenIn, tokenOut: d.tokenOut, amount, slippage: slippagePct }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "swap failed" };
    return { ok: true, txHash: data.txHash };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "swap request failed" };
  }
}

function buildRiskChecks(validation: { approved?: boolean; reasons?: string[] } | null | undefined) {
  if (!validation) return undefined;
  if (!validation.reasons || validation.reasons.length === 0) {
    return { overall: "PASS" as const };
  }
  const checks: Record<string, "PASS" | "FAIL"> = { overall: "FAIL" };
  for (const r of validation.reasons) {
    if (r.includes("kill switch")) checks.kill_switch = "FAIL";
    else if (r.includes("confidence")) checks.confidence = "FAIL";
    else if (r.includes("size") || r.includes("per-trade")) checks.trade_size = "FAIL";
    else if (r.includes("daily trade cap")) checks.daily_trade_count = "FAIL";
    else if (r.includes("slippage")) checks.slippage = "FAIL";
    else if (r.includes("allowlist")) checks.token_allowlist = "FAIL";
    else if (r.includes("drawdown")) checks.drawdown = "FAIL";
    else if (r.includes("spend")) checks.daily_spend = "FAIL";
    else checks.other = "FAIL";
  }
  return checks;
}
