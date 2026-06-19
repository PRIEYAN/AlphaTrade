"""GET /api/market — Binance real-time price + orderbook data for BNB."""
from flask import Blueprint, jsonify, request

from ..services.binance_service import BinancePriceService

bp = Blueprint("market", __name__)
_svc = BinancePriceService()


@bp.get("/api/market")
def market():
    symbol = request.args.get("symbol", "BNBUSDT").upper()
    try:
        ctx = _svc.get_market_context(symbol)
        return jsonify(ctx)
    except Exception as e:
        return jsonify({"configured": False, "error": str(e)}), 502
