"""Entry point. Dev:  python wsgi.py   Prod:  gunicorn wsgi:app"""
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    cfg = app.extensions["agent_config"]
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    port = int(os.environ.get("PORT", cfg.PORT))
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
