# AlphaTrade — AI Agent backend (Python / Flask, MVC)

A standalone AI backend for AlphaTrade. It hosts the **Groq AI decision engine**
and the **BNB on-chain agent** behind a small JSON API, independent of the
TanStack web app. The web app (or any client) can call these endpoints directly.

## Architecture (MVC)

```
Agent/
  wsgi.py                     entry point (create_app); `gunicorn wsgi:app`
  requirements.txt
  .env.example
  app/
    __init__.py               application factory + DI container + CORS
    config.py                 env-driven configuration (server-only secrets)
    models/                   MODEL  — entities + business rules
      schemas.py              pydantic Decision / Guardrails / DecideRequest
      guardrails.py           deterministic guardrail validator (the safety layer)
      sanitizer.py            prompt-injection scrubbing
      prompts.py              Groq system prompt
    services/                 external integrations (part of the model layer)
      groq_service.py         Groq AI client (decision making)
      bnb_service.py          BNB Smart Chain reads via web3 (on-chain agent)
      ratelimit.py            in-memory sliding-window limiter
    controllers/              CONTROLLER — use-case orchestration
      agent_controller.py     signals + on-chain -> Groq -> schema -> guardrails
      bnb_controller.py       on-chain context / balance
    views/                    VIEW — Flask blueprints (HTTP/JSON)
      health.py               GET  /health
      agent.py                POST /api/agent/decide
      bnb.py                  GET  /api/bnb/context, GET /api/bnb/balance
```

The decision pipeline mirrors the web app exactly: the Groq output is **advisory
only** and is independently re-validated by `models/guardrails.py` (pure code)
before it can ever be marked `approved`. The controller also auto-enriches the
request with **live BNB on-chain context** (block height + gas) as a signal.

## Setup

Use Python 3.10+.

```bash
cd Agent
python -m venv .venv
# Windows:  .venv\Scripts\activate     macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in keys (GROQ_API_KEY optional)
```

## Run

```bash
# development
python wsgi.py                # http://127.0.0.1:5000

# production
gunicorn wsgi:app -b 0.0.0.0:5000
```

## Endpoints

| Method | Path                 | Needs                | Description |
|--------|----------------------|----------------------|-------------|
| GET    | `/health`            | —                    | status + which integrations are configured |
| GET    | `/api/bnb/context`   | — (public RPC)       | live BNB block height + gas price |
| GET    | `/api/bnb/balance?address=0x…` | — (public RPC) | native BNB balance for an address |
| POST   | `/api/agent/decide`  | GROQ_API_KEY (else demo) | full signals → Groq → guardrails decision |

### Example — decide

```bash
curl -X POST http://127.0.0.1:5000/api/agent/decide \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "Rotate up to 5% from USDT into BNB when Fear & Greed > 60.",
    "signals": { "fearGreed": { "value": 62, "label": "Greed" } },
    "guardrails": {
      "maxPerTradePct": 10, "dailyTradeCap": 20, "dailySpendLimitUsd": 2000,
      "maxDrawdownPct": 15, "slippagePct": 1, "minConfidence": 0.6,
      "allowlist": ["BNB","USDT","BTCB","ETH"], "killSwitch": false
    }
  }'
```

Response: `{ "decision": {...}, "validation": { "approved": bool, ... }, "raw": "..." }`

## Pointing the web app at this backend (optional)

The web app ships its own server routes, but you can route them here instead by
having the frontend call `http://127.0.0.1:5000/api/agent/decide` and
`/api/bnb/context`. The request/response shapes are identical (camelCase).

## Notes
- Secrets live only in `Agent/.env` (git-ignored). Never expose `GROQ_API_KEY`.
- No mock data: with no `GROQ_API_KEY` the decide endpoint returns a clearly
  labelled demo decision; on-chain reads are always real.
