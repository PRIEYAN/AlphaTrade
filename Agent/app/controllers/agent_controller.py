"""Agent decision pipeline:

  signals (caller) + live on-chain context (BNB agent)
    -> Groq proposes ONE action as JSON        (advisory)
    -> schema validation                        (pydantic)
    -> deterministic guardrails                 (pure code)

Raw model output can never, by itself, be marked approved.
"""
from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError

from ..models.guardrails import safe_hold_fallback, validate_decision
from ..models.prompts import SYSTEM_PROMPT
from ..models.sanitizer import sanitize_strategy
from ..models.schemas import Decision, DecideRequest
from ..services.bnb_service import BnbService
from ..services.groq_service import GroqService


class AgentController:
    def __init__(self, groq: GroqService, bnb: BnbService) -> None:
        self.groq = groq
        self.bnb = bnb

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
            }

        strategy = sanitize_strategy(req.strategy)

        # Enrich signals with live BNB on-chain context if the caller didn't.
        signals = dict(req.signals or {})
        if not signals.get("onchain"):
            try:
                signals["onchain"] = self.bnb.get_onchain_context()
            except Exception:
                pass  # on-chain context is best-effort, never fatal

        raw: str | None = None

        if not self.groq.configured:
            # Deterministic, clearly-labelled demo when no key is configured.
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
            except Exception:
                decision = safe_hold_fallback("Upstream AI error — defaulting to hold.")

        validation = validate_decision(decision, g)
        return {"decision": decision.model_dump(), "validation": validation, "raw": raw}
