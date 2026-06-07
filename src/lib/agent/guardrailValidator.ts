import { z } from "zod";

// =============================================================================
// Deterministic guardrail layer.
//
// The LLM decision is ADVISORY ONLY. A proposed trade reaches the execution
// layer (twakService) ONLY after passing validateDecision() below. Raw model
// output can never, by itself, trigger a signed transaction. Every rule here is
// plain, auditable code — no model in the loop.
// =============================================================================

// Absolute safety ceiling on slippage tolerance, on top of whatever the user
// configures. Even if a user sets a higher number, this hard cap blocks it.
export const MAX_SAFE_SLIPPAGE_PCT = 5;

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
  // Live counters / context (supplied per-request).
  tradesToday: number;
  spentTodayUsd: number;
  drawdownPct: number;
  // Portfolio value used to convert sizePercent -> USD for the daily spend cap.
  // When 0/absent, the spend cap is skipped (cannot be evaluated).
  portfolioValueUsd?: number;
};

export type Validation =
  | { approved: true; decision: Decision; reasons: [] }
  | { approved: false; decision: Decision; reason: string; reasons: string[] };

/**
 * Re-validate an (advisory) decision against every guardrail. Collects ALL
 * violations so the UI can show exactly why a proposal was rejected. A decision
 * is approved only if the violation list is empty.
 */
export function validateDecision(decision: Decision, g: Guardrails): Validation {
  // Kill switch is absolute and short-circuits everything.
  if (g.killSwitch) {
    return reject(decision, ["Kill switch is engaged — all execution blocked"]);
  }

  // A hold never touches the chain, so it always passes.
  if (decision.action === "hold") {
    return { approved: true, decision, reasons: [] };
  }

  const reasons: string[] = [];
  const list = g.allowlist.map((s) => s.toUpperCase());
  const tokenIn = decision.tokenIn.toUpperCase();
  const tokenOut = decision.tokenOut.toUpperCase();

  // --- Token allowlist (only competition-eligible BEP-20 tokens count) ---
  if (!list.includes(tokenIn)) {
    reasons.push(`tokenIn ${decision.tokenIn} not in allowlist`);
  }
  if (!list.includes(tokenOut)) {
    reasons.push(`tokenOut ${decision.tokenOut} not in allowlist`);
  }
  if (tokenIn === tokenOut) {
    reasons.push(`tokenIn and tokenOut are identical (${decision.tokenIn})`);
  }

  // --- Sizing ---
  if (decision.sizePercent <= 0) {
    reasons.push(`size must be > 0 for a ${decision.action} (got ${decision.sizePercent}%)`);
  }
  if (decision.sizePercent > g.maxPerTradePct) {
    reasons.push(
      `size ${decision.sizePercent}% exceeds per-trade cap ${g.maxPerTradePct}%`,
    );
  }

  // --- Confidence threshold ---
  if (decision.confidence < g.minConfidence) {
    reasons.push(
      `confidence ${decision.confidence} below threshold ${g.minConfidence}`,
    );
  }

  // --- Daily trade count cap ---
  if (g.tradesToday >= g.dailyTradeCap) {
    reasons.push(`daily trade cap (${g.dailyTradeCap}) reached`);
  }

  // --- Max drawdown ---
  if (g.drawdownPct >= g.maxDrawdownPct) {
    reasons.push(`max drawdown ${g.maxDrawdownPct}% breached (now ${g.drawdownPct}%)`);
  }

  // --- Slippage hard ceiling ---
  if (g.slippagePct > MAX_SAFE_SLIPPAGE_PCT) {
    reasons.push(
      `slippage tolerance ${g.slippagePct}% exceeds safe ceiling ${MAX_SAFE_SLIPPAGE_PCT}%`,
    );
  }

  // --- Daily USD spend cap (only when portfolio value is known) ---
  const portfolio = g.portfolioValueUsd ?? 0;
  if (portfolio > 0) {
    const tradeUsd = (decision.sizePercent / 100) * portfolio;
    if (g.spentTodayUsd + tradeUsd > g.dailySpendLimitUsd) {
      reasons.push(
        `daily spend cap $${g.dailySpendLimitUsd} would be breached ` +
          `($${g.spentTodayUsd.toFixed(0)} spent + $${tradeUsd.toFixed(0)} this trade)`,
      );
    }
  }

  return reasons.length === 0
    ? { approved: true, decision, reasons: [] }
    : reject(decision, reasons);
}

function reject(decision: Decision, reasons: string[]): Validation {
  return { approved: false, decision, reason: reasons.join("; "), reasons };
}

/** Safe fallback used whenever model output is missing, malformed, or errored. */
export function safeHoldFallback(
  reasoning = "Malformed model output — defaulting to hold.",
): Decision {
  return {
    action: "hold",
    tokenIn: "USDT",
    tokenOut: "USDT",
    sizePercent: 0,
    confidence: 0,
    reasoning,
  };
}

/**
 * Sanitize user strategy text before it is sent to the model: cap length, strip
 * the most common prompt-injection patterns and role/control tokens. This is
 * defense-in-depth — the deterministic guardrails above are the real backstop.
 */
export function sanitizeStrategy(input: string): string {
  const capped = (input ?? "").slice(0, 1500);
  return capped
    .replace(/[\x00-\x1f\x7f]/g, " ") // control chars
    .replace(/ignore\s+(all|any|the)?\s*(previous|prior|above)?\s*instructions/gi, "[redacted]")
    .replace(/disregard\s+(all|any|the)?\s*(previous|prior|above)?\s*(instructions|rules)/gi, "[redacted]")
    .replace(/forget\s+(everything|all|your|the)\s+(instructions|rules|above)/gi, "[redacted]")
    .replace(/you\s+are\s+now\b/gi, "[redacted]")
    .replace(/new\s+(instructions|system\s+prompt|rules)/gi, "[redacted]")
    .replace(/system\s*prompt/gi, "[redacted]")
    .replace(/\b(jailbreak|DAN\s+mode)\b/gi, "[redacted]")
    .replace(/<\/?\s*(system|assistant|user|tool)\s*>/gi, "[redacted]")
    .replace(/`{3,}/g, "")
    .trim();
}
