import { z } from "zod";

export const decisionSchema = z.object({
  action: z.enum(["buy", "sell", "hold"]),
  tokenIn: z.string().min(1).max(12),
  tokenOut: z.string().min(1).max(12),
  sizePercent: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(2000),
});

export type Decision = z.infer<typeof decisionSchema>;

export type Guardrails = {
  maxPerTradePct: number;
  dailyTradeCap: number;
  dailySpendLimitUsd: number;
  maxDrawdownPct: number;
  slippagePct: number;
  minConfidence: number;
  allowlist: string[];
  killSwitch: boolean;
  tradesToday: number;
  spentTodayUsd: number;
  drawdownPct: number;
};

export type Validation =
  | { approved: true; decision: Decision }
  | { approved: false; decision: Decision; reason: string };

export function validateDecision(decision: Decision, g: Guardrails): Validation {
  if (g.killSwitch) return { approved: false, decision, reason: "Kill switch is engaged" };

  if (decision.action === "hold") return { approved: true, decision };

  const list = g.allowlist.map((s) => s.toUpperCase());
  if (!list.includes(decision.tokenIn.toUpperCase()))
    return { approved: false, decision, reason: `tokenIn ${decision.tokenIn} not in allowlist` };
  if (!list.includes(decision.tokenOut.toUpperCase()))
    return { approved: false, decision, reason: `tokenOut ${decision.tokenOut} not in allowlist` };

  if (decision.sizePercent > g.maxPerTradePct)
    return { approved: false, decision, reason: `size ${decision.sizePercent}% exceeds per-trade cap ${g.maxPerTradePct}%` };

  if (decision.confidence < g.minConfidence)
    return { approved: false, decision, reason: `confidence ${decision.confidence} below threshold ${g.minConfidence}` };

  if (g.tradesToday >= g.dailyTradeCap)
    return { approved: false, decision, reason: `daily trade cap (${g.dailyTradeCap}) reached` };

  if (g.drawdownPct >= g.maxDrawdownPct)
    return { approved: false, decision, reason: `max drawdown ${g.maxDrawdownPct}% breached` };

  if (g.slippagePct > 5)
    return { approved: false, decision, reason: `slippage tolerance ${g.slippagePct}% too high` };

  return { approved: true, decision };
}

export function safeHoldFallback(reasoning = "Malformed model output — defaulting to hold."): Decision {
  return {
    action: "hold",
    tokenIn: "USDT",
    tokenOut: "USDT",
    sizePercent: 0,
    confidence: 0,
    reasoning,
  };
}

export function sanitizeStrategy(input: string): string {
  const capped = input.slice(0, 1500);
  // Strip common prompt-injection patterns
  return capped
    .replace(/ignore (all|previous|the above) instructions/gi, "[redacted]")
    .replace(/system prompt/gi, "[redacted]")
    .replace(/<\/?(system|assistant|user)>/gi, "[redacted]")
    .trim();
}
