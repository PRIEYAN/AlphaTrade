"""On-chain (BNB agent) use cases."""
from __future__ import annotations

from typing import Any

from ..services.bnb_service import BnbService


class BnbController:
    def __init__(self, bnb: BnbService) -> None:
        self.bnb = bnb

    def get_context(self) -> dict[str, Any]:
        return self.bnb.get_onchain_context()

    def get_balance(self, address: str) -> dict[str, Any]:
        return self.bnb.get_native_balance(address)
