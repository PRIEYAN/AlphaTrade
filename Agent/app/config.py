"""Environment-driven configuration. Secrets come from the environment / .env
and are read only on the server — never exposed to any client."""
from __future__ import annotations

import os

_chain_id = int(os.environ.get("CHAIN_ID", os.environ.get("VITE_CHAIN_ID", "97")))
_default_bnb_rpc = (
    "https://bsc-dataseed.binance.org"
    if _chain_id == 56
    else "https://bsc-testnet-rpc.publicnode.com"
)


class Config:
    # Groq AI decision engine
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    # BNB AI Agent SDK (bnbagent) — ERC-8004 identity layer.
    BNB_NETWORK: str = os.environ.get("BNB_NETWORK", "bsc-testnet")
    CHAIN_ID: int = _chain_id
    BNB_AGENT_RPC: str = os.environ.get(
        "BNB_AGENT_RPC",
        os.environ.get("VITE_BSC_RPC_URL", _default_bnb_rpc),
    )
    WALLET_PASSWORD: str = os.environ.get("WALLET_PASSWORD", "")
    PRIVATE_KEY: str = os.environ.get("PRIVATE_KEY", "")  # first run only
    AGENT_NAME: str = os.environ.get("AGENT_NAME", "alphatrade-agent")
    AGENT_DESCRIPTION: str = os.environ.get(
        "AGENT_DESCRIPTION", "AlphaTrade autonomous trading agent on BNB Chain"
    )
    AGENT_ENDPOINT_URL: str = os.environ.get(
        "AGENT_ENDPOINT_URL", "http://localhost:8003/erc8183/status"
    )

    # Server
    HOST: str = os.environ.get("HOST", "0.0.0.0")
    PORT: int = int(os.environ.get("PORT", "5000"))
    CORS_ORIGINS: str = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://localhost:3002",
    )

    @property
    def groq_configured(self) -> bool:
        return bool(self.GROQ_API_KEY)

    @property
    def bnb_configured(self) -> bool:
        # A wallet password is required to open/create the keystore; the private
        # key is only needed on the very first run (then it's encrypted on disk).
        return bool(self.WALLET_PASSWORD)
