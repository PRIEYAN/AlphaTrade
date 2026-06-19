# AlphaTrade — BNB Hack AI Trading Agent Edition
## Master Engineering Plan

---

## Vision

Build an autonomous AI trading agent for BNB Chain that:

- Continuously monitors market conditions using CoinMarketCap and Binance.
- Analyzes signals using DeepSeek as the core trading intelligence.
- Enforces deterministic risk controls before any action is taken.
- Executes approved trades through Trust Wallet Agent Kit (TWAK).
- Generates human-readable explanations for every decision using a separate SLM.
- Maintains a complete audit trail indexed by Trade ID.
- Displays portfolio performance, trade history, reasoning, and guardrail state in a dashboard.

The system must operate autonomously while remaining safe, explainable, and bounded by user-defined risk constraints.

---

## Core Design Principles

### 1. AI Proposes. Code Validates. Wallet Executes.

DeepSeek may suggest trades. It may never bypass guardrails. TWAK only receives transactions that the risk engine has explicitly approved.

```
DeepSeek Decision
       ↓
Risk Engine (deterministic)
       ↓
TWAK Execution
```

### 2. SLM Explains. SLM Never Decides.

A small language model generates human-readable reasoning for the dashboard. It receives the decision after the fact. It has zero influence on execution.

### 3. Honest Data Only

If a provider is not configured, the UI says so clearly. No fake prices. No fake balances. No fake trade history.

### 4. Explainability First

Every trade cycle stores:

- Market snapshot at decision time
- DeepSeek structured output
- Guardrail result with pass/fail per check
- Execution result or paper simulation record
- SLM-generated explanation

### 5. Paper Trading Is The Safe Default

Paper trading simulates the full pipeline with real market data but without submitting a real transaction. This is the default demo mode and the safest way to prove strategy logic, decision quality, and auditability.

### 6. Hackathon Practicality

The MVP prioritizes a working vertical slice over broad coverage. The architecture should not be rewritten from scratch before submission.

---

## Architecture Overview

```
Next.js Frontend
       |
       v
FastAPI Backend  ←──────────────────────────────────────────────────────────┐
       |                                                                     |
       +─────────────────────────┐                                          |
       |                         |                                          |
       v                         v                                          |
Market Data Layer         Portfolio Layer                                   |
├── CoinMarketCap          ├── Wallet Balances                              |
│   ├── Fear & Greed       ├── Open Positions                              |
│   ├── Sentiment          └── PnL Tracking                                |
│   └── Rankings                                                            |
└── Binance API                                                             |
    ├── Real-time Price                                                     |
    ├── Volume + OHLCV                                                      |
    ├── Order Book                                                          |
    └── Volatility                                                          |
       |                                                                    |
       v                                                                    |
Market Context Builder                                                      |
(unified payload)                                                           |
       |                                                                    |
       v                                                                    |
DeepSeek Trading Agent                                                      |
(structured JSON decision only)                                             |
       |                                                                    |
       v                                                                    |
Risk Engine (deterministic)                                                 |
       |                                                                    |
       +───────────────────────────+                                        |
       |                           |                                        |
       v                           v                                        |
  TWAK Execution            Paper Trade Log                                 |
  (live/testnet)             (simulation)                                   |
       |                           |                                        |
       +───────────────────────────+                                        |
                      |                                                     |
                      v                                                     |
              Trade Logging (Trade ID)                                      |
                      |                                                     |
                      v                                                     |
         SLM Explanation Engine  ──────────────────────────────────────────┘
                      |
                      v
            Dashboard APIs
```

---

## Operating Modes

AlphaTrade supports four operating modes. Mode is explicitly labeled in the UI at all times. Users must never confuse simulation with live execution.

| Mode | Description |
|------|-------------|
| **Analysis Only** | Reads signals, runs DeepSeek, runs guardrails. Nothing is recorded as a trade. |
| **Paper Trading** | Full pipeline runs. Trade is recorded with real entry price. PnL tracked over time. No transaction submitted. |
| **Testnet Execution** | Full pipeline. TWAK submits to BNB testnet. Proves signing and execution flow with no real financial risk. |
| **Mainnet Execution** | Full pipeline. TWAK submits to BNB mainnet. Gated behind configuration and kill switch. Optional during demo. |

Paper Trading is the default demo mode.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TailwindCSS, shadcn/ui |
| Backend | FastAPI, Pydantic, SQLAlchemy |
| Database | PostgreSQL |
| Trading Agent | DeepSeek (via API) |
| Explanation Agent | Small LM — Phi-3 Mini / Gemma 2B / Qwen 2.5 1.5B |
| Market Data | CoinMarketCap API + Binance API |
| Execution | Trust Wallet Agent Kit (TWAK) |
| Chain | BNB Chain (BSC) |

---

## Data Sources

### CoinMarketCap (CMC)

Used for:

- Fear & Greed Index
- Market sentiment
- Market rankings and trending assets
- Global market conditions

### Binance API

Used for:

- Real-time BNB price
- 24h volume and OHLCV candles
- Order book depth and imbalance
- Volatility metrics
- Recent trades

### Combined Market Context Payload

```json
{
  "token": "BNB",
  "price": 845.22,
  "volume_24h": 2150000000,
  "price_change_24h": 3.4,
  "fear_greed": 74,
  "sentiment": "bullish",
  "volatility": 0.31,
  "orderbook_imbalance": 1.8,
  "portfolio_bnb_exposure": 12,
  "portfolio_balance_usd": 1000
}
```

---

## Component Specifications

### Component 1: Market Data Service

**File:** `services/market_context_service.py`

Responsibilities:

- Fetch and cache CMC signals (Fear & Greed, sentiment)
- Fetch and cache Binance data (price, volume, OHLCV)
- Fetch on-chain BNB context (current block, gas price, wallet balance)
- Merge into a single normalized market context payload
- Expose configuration status honestly — if a provider is unavailable, flag it rather than returning stale or fake data

---

### Component 2: DeepSeek Trading Agent

**File:** `services/deepseek_service.py`

Responsibilities:

- Accept unified market context + current portfolio state + recent trade history
- Prompt DeepSeek to analyze conditions and return one structured JSON decision
- Validate response against schema before passing downstream

**Required Decision Schema:**

```json
{
  "action": "BUY",
  "token": "BNB",
  "amount_usd": 100,
  "confidence": 88,
  "risk_score": 28,
  "take_profit": 900,
  "stop_loss": 790,
  "holding_period": "2-5 days",
  "market_summary": "oversold recovery"
}
```

**Rules:**

- JSON only. No free-form text in the trading response.
- Schema must be validated server-side before the decision reaches the risk engine.
- DeepSeek is the only model allowed to generate trade actions.

---

### Component 3: Risk Engine

**File:** `services/risk_engine.py`

The risk engine is the final authority before execution. It is deterministic — it does not use an LLM.

**Validation Checks:**

| Category | Rule |
|----------|------|
| Trade limits | `max_trade_usd`, `max_trade_percentage` |
| Confidence | `minimum_confidence` |
| Slippage | `max_slippage` |
| Portfolio | `allowed_tokens`, `max_exposure_per_token` |
| Daily limits | `daily_trade_count`, `daily_spend_usd` |
| Safety | `daily_loss_limit`, `max_drawdown` |
| Emergency | `kill_switch` |

**Output:**

```json
{
  "approved": true,
  "reason": "All validations passed",
  "checks": {
    "confidence": "PASS",
    "trade_size": "PASS",
    "daily_limit": "PASS",
    "token_allowlist": "PASS",
    "kill_switch": "PASS"
  }
}
```

Or:

```json
{
  "approved": false,
  "reason": "Confidence below configured threshold",
  "checks": {
    "confidence": "FAIL",
    "trade_size": "PASS",
    ...
  }
}
```

---

### Component 4: TWAK Execution Service

**File:** `services/twak_service.py`

Responsibilities:

- Receive approved trades from the risk engine
- Build and sign the transaction using Trust Wallet Agent Kit
- Submit transaction to BNB Chain (mainnet or testnet based on mode)
- Return transaction hash and execution metadata
- Support competition registration flow

**Output:**

```json
{
  "status": "executed",
  "tx_hash": "0x8af3...",
  "executed_at": "2026-06-19T10:30:00Z"
}
```

This layer is optional — paper trading and analysis modes run the full pipeline without it.

---

### Component 5: SLM Explanation Engine

**File:** `services/explanation_service.py`

The SLM generates human-readable reasoning after a trade completes or is simulated. It never affects execution.

**Input:**

```json
{
  "market_snapshot": { "fear_greed": 22, "sentiment": "positive", "price": 810 },
  "decision": { "action": "BUY", "confidence": 84, "amount_usd": 100 },
  "risk_result": { "approved": true },
  "execution": { "status": "paper", "entry_price": 810 }
}
```

**Output:**

> BNB was purchased because sentiment remained positive while the Fear & Greed Index indicated oversold conditions. Portfolio exposure was below target and confidence exceeded the configured threshold. The position was entered at $810 with a stop loss at $760 and a take profit at $880.

**Suggested models:** Phi-3 Mini, Gemma 2B, Qwen 2.5 1.5B

---

### Component 6: Trade Logging System

**File:** `services/trade_log_service.py`

Every action in the pipeline — approved, rejected, paper, or executed — receives a unique Trade ID and a complete record.

**Trade Record:**

```json
{
  "trade_id": 17,
  "timestamp": "2026-06-19T10:30:00Z",
  "mode": "paper",
  "market_snapshot": { ... },
  "decision": { ... },
  "risk_validation": { ... },
  "execution": { ... },
  "slm_explanation": "BNB was purchased because..."
}
```

This is the audit trail that powers the Trade History dashboard.

---

## Database Schema

### `trades`

| Column | Type | Notes |
|--------|------|-------|
| id | int | Trade ID |
| timestamp | datetime | Decision time |
| mode | enum | analysis / paper / testnet / mainnet |
| action | enum | BUY / SELL / HOLD |
| token | string | e.g. BNB |
| amount_usd | float | Proposed trade size |
| confidence | int | DeepSeek confidence score |
| risk_score | int | DeepSeek risk score |
| status | enum | executed / simulated / rejected |
| tx_hash | string | Null for paper/rejected |

### `trade_reasons`

| Column | Type | Notes |
|--------|------|-------|
| id | int | |
| trade_id | int | FK → trades.id |
| market_snapshot | jsonb | Raw market data at decision time |
| decision_json | jsonb | Full DeepSeek output |
| risk_json | jsonb | Guardrail result with per-check breakdown |
| execution_json | jsonb | TWAK result or paper log |
| slm_explanation | text | Human-readable reasoning |

### `guardrails`

| Column | Type | Notes |
|--------|------|-------|
| id | int | |
| max_trade_usd | float | |
| max_trade_percentage | float | |
| max_slippage | float | |
| minimum_confidence | int | |
| daily_loss_limit | float | |
| max_drawdown | float | |
| daily_trade_count | int | |
| allowed_tokens | jsonb | |
| kill_switch | bool | Disables all execution immediately |

---

## Dashboard Specification

### Overview Page

- Total portfolio value
- Daily PnL
- Total PnL
- Number of trades today
- Active guardrail summary
- Current mode (paper / testnet / mainnet)
- Kill switch toggle

### Trade History Table

| Column | Description |
|--------|-------------|
| Trade ID | Unique identifier |
| Time | Decision timestamp |
| Mode | Paper / Testnet / Mainnet |
| Action | BUY / SELL / HOLD |
| Token | e.g. BNB |
| Amount | USD size |
| Confidence | DeepSeek confidence % |
| Status | Executed / Simulated / Rejected |

### Trade Detail Drawer

Clicking any trade row opens a side drawer with:

**Market Snapshot**
- Price, volume, 24h change
- Fear & Greed, sentiment

**AI Decision**
- Action, confidence, risk score
- Stop loss, take profit, holding period

**Risk Analysis**
- Per-check pass/fail table
- Overall result and reason

**Execution**
- Transaction hash (if live)
- Simulated entry price (if paper)
- Status and timestamp

**Reasoning**
- SLM-generated explanation

### Guardrails Settings Page

Editable form for all guardrail values. Kill switch prominently placed at the top.

---

## Backend File Structure

```
backend/
├── main.py

├── api/
│   ├── trading.py          # /run, /loop/start, /loop/stop
│   ├── portfolio.py        # /portfolio, /balance
│   └── dashboard.py        # /trades, /trades/{id}, /guardrails

├── services/
│   ├── cmc_service.py
│   ├── binance_service.py
│   ├── market_context_service.py
│   ├── deepseek_service.py
│   ├── risk_engine.py
│   ├── twak_service.py
│   ├── portfolio_service.py
│   ├── explanation_service.py
│   └── trade_log_service.py

├── models/
│   ├── trade.py
│   ├── guardrail.py
│   └── portfolio.py

├── schemas/
│   ├── decision.py
│   └── risk.py

└── database/
    ├── connection.py
    └── migrations/
```

---

## TS → Python Migration Plan

The current repo has business logic split between TypeScript backend routes and the Python Flask service. The target state is:

- **Frontend:** Next.js only — calls FastAPI
- **Backend:** FastAPI only — all business logic in Python

This migration should happen **after** hackathon submission to avoid breaking a working demo.

| TS File | Migration Target |
|---------|----------------|
| `signals.ts` | `cmc_service.py` + `binance_service.py` |
| `guardrailValidator.ts` | `risk_engine.py` |
| `twakService.ts` | `twak_service.py` |
| `swap.ts` | `execution_controller.py` |

During the hackathon, the Python backend can be called as a service alongside the TS backend. The frontend does not need to be re-pointed before submission.

---

## Agent Loop

The autonomous loop runs on a configurable interval. Each cycle:

```python
while running:
    signals = market_context_service.fetch()
    portfolio = portfolio_service.get_state()

    decision = deepseek_service.decide(signals, portfolio)

    risk_result = risk_engine.validate(decision)

    if risk_result.approved:
        if mode == "paper":
            execution = paper_trade_log.record(decision, signals)
        elif mode in ["testnet", "mainnet"]:
            execution = twak_service.execute(decision)
    else:
        execution = {"status": "rejected", "reason": risk_result.reason}

    explanation = explanation_service.generate(signals, decision, risk_result, execution)

    trade_log_service.save(signals, decision, risk_result, execution, explanation)

    sleep(interval_seconds)
```

**Safety controls on the loop:**

- Duplicate-run protection (only one loop active at a time)
- Cooldown enforcement between trades
- Kill switch check at the start of every cycle
- Hard failure handling — loop continues even if one cycle errors

---

## MVP Milestones

### Phase 1 — Market Data Layer

- CMC integration (Fear & Greed, sentiment)
- Binance integration (price, volume, OHLCV)
- Unified market context service

### Phase 2 — Trading Agent

- DeepSeek integration
- Structured JSON decision endpoint
- Server-side schema validation

### Phase 3 — Risk Engine

- All guardrail checks implemented
- Approval/rejection pipeline
- Per-check result stored in trade record

### Phase 4 — Paper Trading

- Paper trade recording
- Simulated PnL tracking
- Mode labels in UI

### Phase 5 — TWAK Integration

- Transaction execution on testnet
- Transaction logging
- Competition registration flow

### Phase 6 — SLM Explanation Engine

- Explanation generation after each trade
- Stored in trade reason record

### Phase 7 — Dashboard

- Trade history table
- Trade detail drawer
- Portfolio overview
- Guardrails settings page

### Phase 8 — Autonomous Loop

- Interval control
- Loop start/stop endpoint
- Duplicate-run protection
- Audit logging per cycle

---

## Demo Flow (Hackathon Submission)

The target demo sequence for judges:

1. Connect wallet.
2. Show live BNB Chain context (block, gas, balance).
3. Show live CoinMarketCap + Binance signals.
4. Enter a trading strategy in plain English.
5. Run AI analysis — show DeepSeek structured JSON output.
6. Show guardrail approval result with per-check breakdown.
7. Record the action in paper-trading mode.
8. Open the Trade Detail drawer — show market snapshot, decision, reasoning.
9. Optionally demonstrate TWAK execution or competition registration.
10. Show the trade history dashboard.

---

## Risks and Controls

| Risk | Control |
|------|---------|
| DeepSeek returns inconsistent JSON | Strict Pydantic schema validation; fallback error state, never silent execution |
| User confuses paper and live modes | Explicit mode badge in UI at all times; separate history states; no tx hash shown for paper trades |
| Provider missing or rate-limited | Honest configuration banner; graceful degradation; core pipeline still operable |
| Unsafe autonomous execution | Kill switch; trade caps; daily limits; confidence threshold; paper mode as default |
| Loop runs duplicate cycles | Mutex lock on loop; guard check at cycle start |

---

## Success Criteria

The hackathon submission is considered complete when:

1. App demonstrates real BNB Chain context.
2. App demonstrates real CMC + Binance signal ingestion.
3. DeepSeek produces one structured trade decision per cycle.
4. Risk engine approves or rejects deterministically.
5. Paper trading works end to end with full Trade ID audit trail.
6. SLM explanation is generated and viewable in the dashboard.
7. TWAK integration is demonstrated for execution or competition registration.
8. Dashboard explains what happened without fake data.
9. Product can be demoed safely with live execution disabled.

---

## Post-Hackathon Roadmap

| Priority | Item |
|----------|------|
| 1 | Full TS → FastAPI migration |
| 2 | Persistent trade storage and portfolio accounting |
| 3 | Backtesting engine |
| 4 | Advanced simulation analytics |
| 5 | Richer data providers (funding rates, on-chain flow) |
| 6 | Production secret handling |
| 7 | Always-on mainnet automation with deeper execution safeguards |