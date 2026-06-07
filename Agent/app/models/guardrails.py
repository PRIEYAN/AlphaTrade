"""Deterministic guardrail layer — the REAL safety backstop.

The LLM decision is advisory only. A proposed trade is approved only after
passing validate_decision() below. Every rule here is plain, auditable code —
no model in the loop. Ported 1:1 from the TypeScript guardrailValidator.ts.
"""
from __future__ import annotations

from typing import Any

from .schemas import Decision, Guardrails

# Absolute slippage ceiling on top of whatever the user configures.
MAX_SAFE_SLIPPAGE_PCT = 5.0


def safe_hold_fallback(reasoning: str = "Malformed model output — defaulting to hold.") -> Decision:
    """Safe fallback used whenever model output is missing, malformed, or errored."""
    return Decision(
        action="hold",
        tokenIn="USDT",
        tokenOut="USDT",
        sizePercent=0,
        confidence=0,
        reasoning=reasoning,
    )


def _reject(decision: Decision, reasons: list[str]) -> dict[str, Any]:
    return {
        "approved": False,
        "decision": decision.model_dump(),
        "reason": "; ".join(reasons),
        "reasons": reasons,
    }


def _approve(decision: Decision) -> dict[str, Any]:
    return {"approved": True, "decision": decision.model_dump(), "reasons": []}


def validate_decision(decision: Decision, g: Guardrails) -> dict[str, Any]:
    """Re-validate an advisory decision against EVERY guardrail. Collects all
    violations so the UI can show exactly why a proposal was rejected."""
    # Kill switch is absolute.
    if g.killSwitch:
        return _reject(decision, ["Kill switch is engaged — all execution blocked"])

    # A hold never touches the chain, so it always passes.
    if decision.action == "hold":
        return _approve(decision)

    reasons: list[str] = []
    allow = [s.upper() for s in g.allowlist]
    token_in = decision.tokenIn.upper()
    token_out = decision.tokenOut.upper()

    # --- Token allowlist ---
    if token_in not in allow:
        reasons.append(f"tokenIn {decision.tokenIn} not in allowlist")
    if token_out not in allow:
        reasons.append(f"tokenOut {decision.tokenOut} not in allowlist")
    if token_in == token_out:
        reasons.append(f"tokenIn and tokenOut are identical ({decision.tokenIn})")

    # --- Sizing ---
    if decision.sizePercent <= 0:
        reasons.append(f"size must be > 0 for a {decision.action} (got {decision.sizePercent}%)")
    if decision.sizePercent > g.maxPerTradePct:
        reasons.append(f"size {decision.sizePercent}% exceeds per-trade cap {g.maxPerTradePct}%")

    # --- Confidence threshold ---
    if decision.confidence < g.minConfidence:
        reasons.append(f"confidence {decision.confidence} below threshold {g.minConfidence}")

    # --- Daily trade count cap ---
    if g.tradesToday >= g.dailyTradeCap:
        reasons.append(f"daily trade cap ({g.dailyTradeCap}) reached")

    # --- Max drawdown ---
    if g.drawdownPct >= g.maxDrawdownPct:
        reasons.append(f"max drawdown {g.maxDrawdownPct}% breached (now {g.drawdownPct}%)")

    # --- Slippage hard ceiling ---
    if g.slippagePct > MAX_SAFE_SLIPPAGE_PCT:
        reasons.append(
            f"slippage tolerance {g.slippagePct}% exceeds safe ceiling {MAX_SAFE_SLIPPAGE_PCT}%"
        )

    # --- Daily USD spend cap (only when portfolio value is known) ---
    portfolio = g.portfolioValueUsd or 0
    if portfolio > 0:
        trade_usd = (decision.sizePercent / 100) * portfolio
        if g.spentTodayUsd + trade_usd > g.dailySpendLimitUsd:
            reasons.append(
                f"daily spend cap ${g.dailySpendLimitUsd:.0f} would be breached "
                f"(${g.spentTodayUsd:.0f} spent + ${trade_usd:.0f} this trade)"
            )

    return _approve(decision) if not reasons else _reject(decision, reasons)
