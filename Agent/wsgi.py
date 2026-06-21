"""Entry point. Dev:  python wsgi.py   Prod:  gunicorn wsgi:app"""
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    cfg = app.extensions["agent_config"]
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host=cfg.HOST, port=cfg.PORT, debug=debug_mode)
