"""SLM Explanation Engine — generates human-readable reasoning AFTER a trade.

The explanation model is advisory/cosmetic only: it never influences execution.
Uses the same Groq client (small Llama model) to keep dependencies minimal.
"""
from __future__ import annotations

import json
from typing import Any, Optional


_EXPLANATION_PROMPT = """You are a trading journalist explaining a crypto trade decision to a non-technical audience.
Write ONE short paragraph (2-4 sentences) summarising what happened and why. Be factual and reference the actual numbers provided.
Do NOT use bullet points, headers, markdown, or code. Plain prose only. Keep it under 200 words."""


class ExplanationService:
    def __init__(self, groq_client: Any, model: str = "llama-3.1-8b-instant") -> None:
        self._client = groq_client
        self._model = model

    @property
    def configured(self) -> bool:
        return self._client is not None

    def generate(
        self,
        market_snapshot: dict[str, Any],
        decision: dict[str, Any],
        risk_result: dict[str, Any],
        execution: dict[str, Any],
    ) -> Optional[str]:
        """Return a plain-English explanation, or None if the service is unavailable."""
        if self._client is None:
            return self._fallback(decision, risk_result)

        context = {
            "market": market_snapshot,
            "decision": decision,
            "risk": risk_result,
            "execution": execution,
        }
        try:
            completion = self._client.chat.completions.create(
                model=self._model,
                temperature=0.4,
                max_tokens=220,
                messages=[
                    {"role": "system", "content": _EXPLANATION_PROMPT},
                    {"role": "user", "content": json.dumps(context)},
                ],
            )
            return (completion.choices[0].message.content or "").strip()
        except Exception:
            return self._fallback(decision, risk_result)

    @staticmethod
    def _fallback(decision: dict[str, Any], risk_result: dict[str, Any]) -> str:
        action = decision.get("action", "hold").upper()
        token_in = decision.get("tokenIn", "?")
        token_out = decision.get("tokenOut", "?")
        confidence = decision.get("confidence", 0)
        approved = risk_result.get("approved", False)
        if action == "HOLD":
            return f"The agent held its position. Confidence was {confidence:.0%}; no trade was warranted."
        status = "approved by the risk engine" if approved else f"rejected: {risk_result.get('reason', 'guardrail triggered')}"
        return (
            f"The agent proposed a {action} from {token_in} to {token_out} "
            f"with {confidence:.0%} confidence. The trade was {status}."
        )
