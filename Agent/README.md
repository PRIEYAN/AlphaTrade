# AlphaTrade — AI Agent backend (Python, MVC)

A standalone AI backend for AlphaTrade. It hosts:

1. The **Groq AI decision engine** (Flask JSON API) — signals → proposal →
   deterministic guardrails.
2. The **BNB AI Agent SDK** (`bnbagent`) — real **ERC-8004** on-chain agent
   identity registration, and an optional **ERC-8183** agent job server.

> The BNB layer uses the official `bnbagent` SDK (not raw web3). It is coded to
> the published SDK docs; validate at runtime after `pip install`.

## Architecture (MVC)

```
Agent/
  wsgi.py                     Flask entry (decision API);  gunicorn wsgi:app
  register_agent.py           ERC-8004 one-time registration script (SDK)
  agent_server.py             ERC-8183 agent job server (SDK, run with uvicorn)
  requirements.txt
  .env.example
  app/
    __init__.py               Flask app factory + DI container + CORS
    config.py                 env-driven config (server-only)
    models/                   MODEL — pydantic entities, guardrails, sanitizer, prompt
    services/
      groq_service.py         Groq AI client
      bnb_service.py          bnbagent SDK wrapper (ERC8004Agent / EVMWalletProvider)
      ratelimit.py            in-memory limiter
    controllers/              CONTROLLER — decide pipeline + bnb registration
    views/                    VIEW — Flask blueprints
      health.py               GET  /health
      agent.py                POST /api/agent/decide
      bnb.py                  POST /api/bnb/register   (ERC-8004 via SDK)
```

## Setup

Python 3.10+.

```bash
cd Agent
python -m venv .venv
# Windows: .venv\Scripts\activate   |  macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt        # installs bnbagent[server,ipfs]
cp .env.example .env                    # fill WALLET_PASSWORD (+ PRIVATE_KEY first run)
```

## 1) Register the agent on-chain (ERC-8004) — one time

Fund the wallet (testnet BNB faucet: https://testnet.bnbchain.org/faucet-smart),
set `WALLET_PASSWORD` + `PRIVATE_KEY` + `BNB_NETWORK=bsc-testnet` in `.env`, then:

```bash
python register_agent.py
# -> Agent registered! ID: <agentId>, TX: <transactionHash>
```

The key is encrypted to `~/.bnbagent/wallets/` after the first run — you can then
remove `PRIVATE_KEY` from `.env`. You can also register via the API once the
wallet exists: `POST /api/bnb/register`.

## 2) Run the decision API (Flask)

```bash
python wsgi.py                 # http://127.0.0.1:5000
# production: gunicorn wsgi:app -b 0.0.0.0:5000
```

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/health` | status + which integrations are configured |
| POST   | `/api/agent/decide` | signals → Groq → guardrails decision |
| POST   | `/api/bnb/register` | register the agent on-chain (ERC-8004, SDK) |

## 3) (Optional) Run the ERC-8183 agent job server

```bash
uvicorn agent_server:app --port 8003
# routes at /erc8183/negotiate, /erc8183/status, /erc8183/job/{id}, ...
```

Edit `execute_job` in `agent_server.py` to do the real work for funded jobs.
Settle is permissionless — run a separate operator to call `router.settle(jobId)`
after the dispute window.

## Notes
- Secrets live only in `Agent/.env` (git-ignored). Never commit a key.
- ERC-8004 registration is a real on-chain transaction — needs a funded wallet
  on the target network and `WALLET_PASSWORD`.
- The web app's own `/api/bnb/context` (block/gas) is a separate TS/viem read in
  the browser app; the Python `bnbagent` SDK does not replace that.
