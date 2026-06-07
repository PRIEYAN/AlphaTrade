"""Environment-driven configuration. Secrets come from the environment / .env
and are read only on the server — never exposed to any client."""
from __future__ import annotations

import os


class Config:
    # Groq AI decision engine
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    # BNB Smart Chain (on-chain agent layer)
    BNB_RPC: str = (
        os.environ.get("BNB_AGENT_RPC")
        or os.environ.get("VITE_BSC_RPC_URL")
        or "https://bsc-dataseed.binance.org"
    )
    CHAIN_ID: int = int(os.environ.get("CHAIN_ID") or os.environ.get("VITE_CHAIN_ID") or "56")

    # Server
    HOST: str = os.environ.get("HOST", "127.0.0.1")
    PORT: int = int(os.environ.get("PORT", "5000"))
    CORS_ORIGINS: str = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://localhost:3002",
    )

    @property
    def groq_configured(self) -> bool:
        return bool(self.GROQ_API_KEY)
