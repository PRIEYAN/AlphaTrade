from flask import Blueprint, current_app, jsonify

bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    cfg = current_app.extensions["agent_config"]
    return jsonify(
        {
            "status": "ok",
            "service": "alphatrade-agent",
            "integrations": {
                "groq": cfg.groq_configured,
                "bnbAgentSdk": cfg.bnb_configured,
                "bnbNetwork": cfg.BNB_NETWORK,
            },
        }
    )
