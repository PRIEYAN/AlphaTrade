"""Agent decision pipeline:

  signals (caller-provided: CMC + Binance + optional on-chain context)
    -> Groq proposes ONE action as JSON        (advisory)
    -> schema validation                        (pydantic)
    -> deterministic guardrails                 (pure code)
    -> SLM explanation engine                   (cosmetic, post-decision)

Raw model output can never, by itself, be marked approved.
The explanation is generated AFTER the approval decision and has zero
influence on whether a trade is executed.
"""
from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError

from ..models.guardrails import safe_hold_fallback, validate_decision
from ..models.prompts import SYSTEM_PROMPT
from ..models.sanitizer import sanitize_strategy
from ..models.schemas import Decision, DecideRequest
from ..services.groq_service import GroqService
from ..services.explanation_service import ExplanationService


class AgentController:
    def __init__(self, groq: GroqService, explainer: ExplanationService) -> None:
        self.groq = groq
        self.explainer = explainer

    def decide(self, req: DecideRequest) -> dict[str, Any]:
        g = req.guardrails

        # Kill switch short-circuits before any model call.
        if g.killSwitch:
            hold = safe_hold_fallback("Kill switch engaged — agent paused.")
            reason = "Kill switch is engaged — all execution blocked"
            return {
                "decision": hold.model_dump(),
                "validation": {
                    "approved": False,
                    "decision": hold.model_dump(),
                    "reason": reason,
                    "reasons": [reason],
                },
                "raw": None,
                "error": None,
                "explanation": "Kill switch was engaged — no trade was evaluated.",
            }

        strategy = sanitize_strategy(req.strategy)
        signals = dict(req.signals or {})

        raw: str | None = None
        error: str | None = None

        if not self.groq.configured:
            decision = Decision(
                action="buy",
                tokenIn="USDT",
                tokenOut="BNB",
                sizePercent=min(5.0, g.maxPerTradePct),
                confidence=0.72,
                reasoning=(
                    "Demo decision (no GROQ_API_KEY configured). Market sentiment "
                    "positive; small rotation into BNB."
                ),
            )
        else:
            try:
                payload = {
                    "strategy": strategy,
                    "allowlist": g.allowlist,
                    "guardrails": {
                        "maxPerTradePct": g.maxPerTradePct,
                        "minConfidence": g.minConfidence,
                        "slippagePct": g.slippagePct,
                    },
                    "signals": signals,
                }
                raw = self.groq.decide(SYSTEM_PROMPT, payload)
                decision = Decision(**json.loads(raw))
            except (json.JSONDecodeError, ValidationError):
                decision = safe_hold_fallback("Schema validation failed.")
                error = "The AI returned malformed output — held as a precaution."
            except Exception as exc:
                decision = safe_hold_fallback("Upstream AI error — defaulting to hold.")
                status = getattr(exc, "status_code", None) or getattr(exc, "status", None)
                error = (
                    "Groq rejected the API key (401). Set a valid GROQ_API_KEY."
                    if status == 401
                    else f"Upstream AI error{f' ({status})' if status else ''} — the model call failed."
                )

        validation = validate_decision(decision, g)

        # SLM explanation — generated AFTER the decision is finalised.
        # Uses the market signals provided by the caller as the "market snapshot".
        market_snapshot = {k: v for k, v in signals.items() if k in ("fearGreed", "price", "binance", "onchain")}
        execution_context = {
            "mode": req.signals.get("mode", "paper"),
            "approved": validation.get("approved", False),
        }
        explanation = self.explainer.generate(
            market_snapshot=market_snapshot,
            decision=decision.model_dump(),
            risk_result=validation,
            execution=execution_context,
        )

        return {
            "decision": decision.model_dump(),
            "validation": validation,
            "raw": raw,
            "error": error,
            "explanation": explanation,
        }
