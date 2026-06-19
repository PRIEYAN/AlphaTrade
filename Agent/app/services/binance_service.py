"""Binance public API — real-time BNB price, volume, and OHLCV.

Uses the unauthenticated public REST endpoints (no API key required).
All calls have short timeouts so the agent pipeline is never blocked.
"""
from __future__ import annotations

import urllib.request
import urllib.error
import json
from typing import Any, Optional

_BASE = "https://api.binance.com/api/v3"
_TIMEOUT = 5  # seconds


def _get(path: str, params: dict[str, str] | None = None) -> Any:
    url = f"{_BASE}{path}"
    if params:
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{url}?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": "AlphaTrade/1.0"})
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
        return json.loads(resp.read())


class BinancePriceService:
    def get_ticker(self, symbol: str = "BNBUSDT") -> dict[str, Any]:
        """24-hour stats: price, volume, change %."""
        data = _get("/ticker/24hr", {"symbol": symbol})
        return {
            "symbol": data["symbol"],
            "price": float(data["lastPrice"]),
            "price_change_pct_24h": float(data["priceChangePercent"]),
            "volume_24h_usdt": float(data["quoteVolume"]),
            "high_24h": float(data["highPrice"]),
            "low_24h": float(data["lowPrice"]),
        }

    def get_orderbook_imbalance(self, symbol: str = "BNBUSDT", depth: int = 20) -> float:
        """Bid/ask volume imbalance: >1 = more bids (bullish), <1 = more asks (bearish)."""
        data = _get("/depth", {"symbol": symbol, "limit": str(depth)})
        bid_vol = sum(float(b[1]) for b in data["bids"])
        ask_vol = sum(float(a[1]) for a in data["asks"])
        if ask_vol == 0:
            return 1.0
        return round(bid_vol / ask_vol, 3)

    def get_klines(self, symbol: str = "BNBUSDT", interval: str = "1h", limit: int = 24) -> list[dict[str, Any]]:
        """OHLCV candles. Returns the last `limit` candles."""
        raw = _get("/klines", {"symbol": symbol, "interval": interval, "limit": str(limit)})
        return [
            {
                "open_time": c[0],
                "open": float(c[1]),
                "high": float(c[2]),
                "low": float(c[3]),
                "close": float(c[4]),
                "volume": float(c[5]),
            }
            for c in raw
        ]

    def get_market_context(self, symbol: str = "BNBUSDT") -> dict[str, Any]:
        """Unified market context: ticker + orderbook imbalance."""
        errors: list[str] = []
        ticker: Optional[dict] = None
        imbalance: Optional[float] = None

        try:
            ticker = self.get_ticker(symbol)
        except Exception as e:
            errors.append(f"ticker: {e}")

        try:
            imbalance = self.get_orderbook_imbalance(symbol)
        except Exception as e:
            errors.append(f"orderbook: {e}")

        result: dict[str, Any] = {"configured": True, "symbol": symbol}
        if ticker:
            result.update(ticker)
        if imbalance is not None:
            result["orderbook_imbalance"] = imbalance
        if errors:
            result["errors"] = errors
        return result
