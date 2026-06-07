"""Entry point. Dev:  python wsgi.py   Prod:  gunicorn wsgi:app"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    cfg = app.extensions["agent_config"]
    app.run(host=cfg.HOST, port=cfg.PORT, debug=True)
