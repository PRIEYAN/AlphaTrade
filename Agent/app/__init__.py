"""AlphaTrade AI Agent — Flask application factory (MVC).

Layers:
  models/       domain entities, deterministic guardrails, prompt, sanitizer
  services/     external integrations (Groq AI, BNB Smart Chain via web3)
  controllers/  use-case orchestration (decision pipeline, on-chain context)
  views/        Flask blueprints (HTTP/JSON presentation layer)
"""
from __future__ import annotations

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .controllers.agent_controller import AgentController
from .controllers.bnb_controller import BnbController
from .services.bnb_service import BnbService
from .services.groq_service import GroqService
from .views.agent import bp as agent_bp
from .views.bnb import bp as bnb_bp
from .views.health import bp as health_bp


def create_app() -> Flask:
    load_dotenv()
    cfg = Config()

    app = Flask(__name__)

    # CORS so the TanStack web app can call this backend.
    origins = (
        "*"
        if cfg.CORS_ORIGINS.strip() == "*"
        else [o.strip() for o in cfg.CORS_ORIGINS.split(",") if o.strip()]
    )
    CORS(app, resources={r"/*": {"origins": origins}})

    # Wire services + controllers once, attach to the app (dependency container).
    groq = GroqService(cfg.GROQ_API_KEY, cfg.GROQ_MODEL)
    bnb = BnbService(cfg.BNB_RPC, cfg.CHAIN_ID)
    app.extensions["agent_config"] = cfg
    app.extensions["agent_controller"] = AgentController(groq, bnb)
    app.extensions["bnb_controller"] = BnbController(bnb)

    app.register_blueprint(health_bp)
    app.register_blueprint(agent_bp)
    app.register_blueprint(bnb_bp)

    @app.errorhandler(404)
    def _not_found(_e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def _server_error(_e):
        return jsonify({"error": "Internal server error"}), 500

    return app
