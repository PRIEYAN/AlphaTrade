from flask import Blueprint, current_app, jsonify, request

bp = Blueprint("bnb", __name__)


@bp.post("/api/bnb/register")
def register():
    """Register this agent on-chain (ERC-8004) via the bnbagent SDK.

    Body (all optional — falls back to config defaults):
      { "name", "description", "endpoints": [{name, endpoint, version}] }
    """
    cfg = current_app.extensions["agent_config"]
    if not cfg.bnb_configured:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "BNB agent not configured — set WALLET_PASSWORD "
                    "(and PRIVATE_KEY on first run) in the environment.",
                }
            ),
            400,
        )

    body = request.get_json(silent=True) or {}
    name = body.get("name") or cfg.AGENT_NAME
    description = body.get("description") or cfg.AGENT_DESCRIPTION
    endpoints = body.get("endpoints") or [
        {"name": "ERC-8183", "endpoint": cfg.AGENT_ENDPOINT_URL, "version": "0.1.0"}
    ]

    controller = current_app.extensions["bnb_controller"]
    try:
        return jsonify({"ok": True, **controller.register(name, description, endpoints)})
    except Exception as e:  # on-chain / SDK failure
        return jsonify({"ok": False, "error": str(e)}), 502
