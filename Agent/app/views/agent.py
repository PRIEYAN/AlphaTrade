from flask import Blueprint, current_app, jsonify, request
from pydantic import ValidationError

from ..models.schemas import DecideRequest
from ..services import ratelimit

bp = Blueprint("agent", __name__)


@bp.post("/api/agent/decide")
def decide():
    body = request.get_json(silent=True) or {}

    # Rate limit per session (falls back to client IP).
    key = body.get("sessionId") or request.headers.get("x-forwarded-for") or request.remote_addr or "anon"
    ok, retry_in_ms = ratelimit.check(str(key))
    if not ok:
        return jsonify({"error": "Rate limit exceeded", "retryInMs": retry_in_ms}), 429

    try:
        req = DecideRequest(**body)
    except ValidationError as e:
        return jsonify({"error": "Invalid request", "issues": e.errors()}), 400

    controller = current_app.extensions["agent_controller"]
    return jsonify(controller.decide(req))
