"""BNB AI agent use cases (ERC-8004 registration via the bnbagent SDK)."""
from __future__ import annotations

from typing import Any

from ..services.bnb_service import BnbAgentService


class BnbController:
    def __init__(self, bnb: BnbAgentService) -> None:
        self.bnb = bnb

    def register(
        self,
        name: str,
        description: str,
        endpoints: list[dict[str, str]],
    ) -> dict[str, Any]:
        return self.bnb.register(name, description, endpoints)
