# AlphaTrade — How It Works & Demo Guide

## System Architecture

```
Browser (Next.js / TanStack Start)
        |
        | /api/agent/decide  (proxy)
        v
Python Agent (Flask · port 5000)
  ├── Groq AI  ──── trading decision (advisory JSON)
  ├── Risk Engine ── deterministic guardrail checks
  ├── SLM Explainer ─ human-readable explanation
  └── Binance API ── live price / OHLCV / orderbook
        |
        | approved decision
        v
Execution Layer
  ├── Paper Trading  ── record entry price, no tx
  ├── Testnet (TWAK) ── BNB testnet swap via Trust Wallet Agent Kit
  └── Mainnet (TWAK) ── gated behind kill switch
        |
        v
Trade Audit Trail (localStorage + Activity page drawer)
```

---

## Two Servers to Start

### 1. Python Agent (port 5000)

```bash
cd Agent
pip install -r requirements.txt     # first time only
python wsgi.py                       # starts on http://localhost:5000
```

Provides:
- `POST /api/agent/decide` — Groq AI + guardrails + SLM explanation
- `GET  /api/market?symbol=BNBUSDT` — Binance live price & orderbook
- `GET  /api/bnb/context` — BNB Smart Chain block + gas price

### 2. Frontend (port 3000)

```bash
npm install     # first time only
npm run dev     # starts on http://localhost:3000
```

The frontend proxies `/api/agent/decide` and `/api/market` to the Python Agent.
Set `AGENT_API_URL=http://localhost:5000` in your `.env` (default).

---

## Environment Variables

### Frontend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CHAIN_ID` | Yes | `97` (testnet) or `56` (mainnet) |
| `VITE_COMPETITION_CONTRACT` | Yes | Deployed CompetitionRegistry address |
| `AGENT_API_URL` | Yes | Python Agent URL (default: `http://localhost:5000`) |
| `CMC_AGENT_API_KEY` | Optional | CoinMarketCap — Fear & Greed index |
| `BSCSCAN_API_KEY` | Optional | On-chain TX history on Activity page |
| `TW_ACCESS_ID` / `TW_HMAC_SECRET` | Optional | Trust Wallet Agent Kit (live execution) |

### Python Agent (`Agent/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq AI decision engine |
| `GROQ_MODEL` | Optional | Default: `llama-3.3-70b-versatile` |
| `WALLET_PASSWORD` | Optional | BNB AI Agent SDK wallet encryption |

---

## Operating Modes

The mode selector is on the **Overview** page. The active mode badge is always visible in the header.

| Mode | What happens after an approved decision |
|------|-----------------------------------------|
| **Analysis Only** | Decision and explanation shown. Nothing logged as a trade. |
| **Paper Trading** | Trade recorded with real Binance entry price. PnL tracked. No tx submitted. |
| **Testnet** | TWAK submits swap to BNB testnet. Real signing flow, no financial risk. |
| **Mainnet** | TWAK submits to mainnet. Gated behind kill switch. |

**Paper Trading is the default.** It is safe for demos because no transaction is ever submitted.

---

## Pipeline (per decision cycle)

```
1. Fetch signals
   ├── CoinMarketCap Fear & Greed (/api/signals)
   ├── Binance price, 24h change, orderbook imbalance (/api/market)
   └── BNB Smart Chain block + gas (/api/bnb/context)

2. Python Agent receives the unified context:
   POST /api/agent/decide
   {
     strategy: "...",
     signals: { fearGreed, binance, onchain },
     guardrails: { maxPerTradePct, minConfidence, killSwitch, ... }
   }

3. Groq (Llama-3.3-70B) produces one structured JSON decision:
   { action, tokenIn, tokenOut, sizePercent, confidence, reasoning }

4. Risk Engine validates deterministically (no AI in the loop):
   ✓ Kill switch      ✓ Token allowlist     ✓ Confidence floor
   ✓ Per-trade cap    ✓ Daily trade count   ✓ Daily spend cap
   ✓ Max drawdown     ✓ Slippage ceiling

5. SLM Explanation (Llama-3.1-8B) writes a plain-English summary
   after the decision — purely cosmetic, zero execution influence.

6. Frontend receives: { decision, validation, explanation, error }

7. Execution (mode-dependent):
   paper   → record entry price, status = "simulated"
   testnet → TWAK swap → record txHash
   mainnet → TWAK swap → record txHash
   analysis → status = "analysis", no trade record

8. Full TradeRecord saved to localStorage audit trail.
```

---

## Demo Flow (Hackathon)

### Step 1 — Start both servers
```bash
# Terminal 1
cd Agent && python wsgi.py

# Terminal 2
npm run dev
```

### Step 2 — Open the dashboard
Navigate to `http://localhost:3000/dashboard`.

### Step 3 — Connect a wallet
Click "Connect Wallet" in the header. Use a testnet wallet funded with BSC testnet BNB from [faucet](https://testnet.bnbchain.org/faucet-smart).

### Step 4 — Show live context
The Overview KPI row shows:
- **Wallet (BNB)** — real on-chain balance
- **BNB Price** — live Binance price + 24h change
- **Network block + gas** — from the public BSC testnet RPC

### Step 5 — Show live signals (Strategy + AI tab)
The right panel shows Fear & Greed (CMC) and the live Binance market widget.

### Step 6 — Run a manual analysis
1. Go to **Strategy + AI**.
2. Enter a strategy in plain English (e.g. "Buy BNB when Fear & Greed > 60").
3. Click **Run analysis**.
4. Show the structured AI decision JSON.
5. Show the risk engine pass/fail breakdown in the response.
6. Show the plain-English explanation from the SLM.

### Step 7 — Demonstrate guardrail rejection
1. On the **Guardrails** page, set Min Confidence to `0.99`.
2. Run analysis again — the trade is rejected and the guardrail reason is shown.
3. Reset confidence to `0.6`.

### Step 8 — Show paper trading
1. On Overview, confirm mode is **Paper Trading**.
2. Start the autonomous agent (click **Start** + enable **Autonomous**).
3. Watch decision cycles populate the Live Trade Feed every ~30 seconds.
4. Each entry shows: action, pair, confidence, simulated status, entry price.

### Step 9 — Open the Trade Detail Drawer
1. Go to **Activity**.
2. Click any row in the Trade History table.
3. The drawer shows:
   - Market snapshot (price, fear & greed, gas, orderbook)
   - Full AI decision (action, tokens, size, confidence)
   - Risk analysis per-check (PASS / FAIL for each guardrail)
   - Execution details (simulated entry price or tx hash)
   - SLM explanation (plain-English summary)

### Step 10 — Register for the competition
1. On **Activity**, click **Register Agent**.
2. This calls the CompetitionRegistry contract on BSC testnet.
3. Status updates to "REGISTERED ✓" once confirmed.

### Step 11 (optional) — Testnet execution
1. Switch mode to **Testnet** on the Overview page.
2. Run a manual analysis on the Strategy page.
3. If approved, click **Execute via Trust Wallet**.
4. The swap is submitted to BSC testnet and the tx hash appears in the drawer.

### Kill Switch Demo
Click the **Kill Switch** button in the header at any time. The agent immediately pauses — all subsequent decisions return "PAUSED" status. Click again to release.

---

## Key Design Principles (to highlight in demo)

| Principle | How to show it |
|-----------|----------------|
| AI proposes, code validates | Show the guardrail rejection — the AI's output was blocked by deterministic code, not another AI |
| SLM explains, never decides | Point to the explanation in the drawer — it appears *after* execution |
| Honest data only | Remove CMC_AGENT_API_KEY, show "not configured" banner instead of fake numbers |
| Mode badge always visible | Header always shows Paper/Testnet/Mainnet — no confusion |
| Full audit trail | Every decision has a Trade ID and all context in the drawer |

---

## File Structure Quick Reference

```
AlphaTrade/
├── src/                          # Next.js / TanStack Start frontend
│   ├── routes/
│   │   ├── dashboard.index.tsx   # Overview: mode selector, PnL, live feed
│   │   ├── dashboard.strategy.tsx # Strategy + AI: manual run, signals
│   │   ├── dashboard.guardrails.tsx # Editable guardrail form
│   │   ├── dashboard.activity.tsx  # Trade history table + detail drawer
│   │   └── api/
│   │       ├── agent/decide.ts   # Proxy → Python Agent
│   │       ├── market.ts         # Proxy → Binance price
│   │       ├── signals.ts        # CMC Fear & Greed
│   │       └── bnb/context.ts    # BNB Smart Chain block/gas
│   └── lib/
│       ├── store.ts              # Zustand store (mode, trades, guardrails)
│       └── agent/useAgentLoop.ts # Autonomous decision clock
│
├── Agent/                        # Python Flask agent backend
│   ├── wsgi.py                   # Entry point: python wsgi.py
│   └── app/
│       ├── controllers/
│       │   └── agent_controller.py  # Decision pipeline (Groq → guardrails → SLM)
│       ├── services/
│       │   ├── groq_service.py      # Llama-3.3-70B trading decisions
│       │   ├── explanation_service.py # Llama-3.1-8B SLM explanations
│       │   ├── binance_service.py   # Live price, OHLCV, orderbook
│       │   └── bnb_service.py       # BNB Smart Chain context
│       └── models/
│           ├── guardrails.py        # Deterministic risk engine
│           └── schemas.py           # Pydantic decision schema
│
└── blockchain/                   # Hardhat + CompetitionRegistry contract
    └── contracts/CompetitionRegistry.sol
```
