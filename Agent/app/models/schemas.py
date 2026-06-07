"""Pydantic domain entities. Field names are camelCase to match the TanStack
web app payloads, so the same frontend can call this backend interchangeably."""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class Decision(BaseModel):
    action: Literal["buy", "sell", "hold"]
    tokenIn: str = Field(min_length=1, max_length=12)
    tokenOut: str = Field(min_length=1, max_length=12)
    sizePercent: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    reasoning: str = Field(min_length=1, max_length=2000)


class Guardrails(BaseModel):
    maxPerTradePct: float
    dailyTradeCap: float
    dailySpendLimitUsd: float
    maxDrawdownPct: float
    slippagePct: float
    minConfidence: float
    allowlist: list[str]
    killSwitch: bool = False
    # Live counters / context (supplied per-request).
    tradesToday: float = 0
    spentTodayUsd: float = 0
    drawdownPct: float = 0
    # Portfolio value for the USD spend cap; 0/absent => spend cap skipped.
    portfolioValueUsd: float = 0


class DecideRequest(BaseModel):
    strategy: str = Field(default="", max_length=2000)
    # Free-form: fearGreed / funding / sentiment / momentum / onchain.
    signals: dict[str, Any] = Field(default_factory=dict)
    guardrails: Guardrails
    sessionId: Optional[str] = None
