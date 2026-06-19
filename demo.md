# AlphaTrade — Demo Guide

---

## Before You Start

Open **two terminals** side by side.

**Terminal 1 — Python Agent**
```bash
cd Agent
python wsgi.py
```
You should see: `Running on http://127.0.0.1:5000`

**Terminal 2 — Frontend**
```bash
npm run dev
```
You should see: `Local: http://localhost:3000`

Open your browser at **http://localhost:3000**

---

## Step 1 — Land on the Home Page

You see the AlphaTrade landing page. Click **"Open Dashboard"** or navigate to `/dashboard`.

---

## Step 2 — Connect Your Wallet

- Click **"Connect Wallet"** in the top-right corner.
- Select MetaMask (or any WalletConnect wallet).
- Make sure you are on **BSC Testnet** (Chain ID 97). MetaMask will prompt you to switch if needed.
- Once connected, your wallet address appears in the header.

> **What to show:** The "Wallet (BNB)" card on the Overview page updates to your real on-chain balance. This is a live read from the blockchain — no mock data.

---

## Step 3 — Show Live Market Data

On the **Overview** page, point to:

- **BNB Price** — fetched live from Binance public API (no key needed). Shows current price and 24-hour % change.
- **Network block + gas** — live BNB Smart Chain block number and gas price, read directly from the testnet RPC.
- **Fear & Greed** — pulled from CoinMarketCap (requires `CMC_AGENT_API_KEY` in `.env`; shows "not configured" if absent — never a fake number).

> **Key point:** Every number on screen is real. If a source is not configured, the UI says so clearly.

---

## Step 4 — Show the Operating Mode

Look at the **header** — next to the chain badge you see a coloured label: **Paper Trading**.

On the Overview page, find the **Operating Mode** selector. Four options:

| Mode | What it does |
|------|-------------|
| Analysis Only | AI decides, nothing is logged |
| **Paper Trading** | Logs the trade with the real Binance entry price, no real money |
| Testnet | Submits an actual swap to BSC testnet via Trust Wallet |
| Mainnet | Real money — stays off for the demo |

Leave it on **Paper Trading**.

> **Key point:** The mode badge is always visible in the header. A judge or user can never confuse a simulated trade with a live one.

---

## Step 5 — Run a Manual AI Analysis

Click **Strategy + AI** in the left sidebar.

1. The strategy box already has a default: *"Rotate up to 5% from USDT into BNB when Fear & Greed is above 60..."*. Leave it or edit it.
2. On the right panel you can see live signals: Fear & Greed gauge and the Binance BNB price.
3. Click **Run analysis**.

The AI (Groq Llama-3.3-70B, running in the Python Agent) returns a decision box showing:

```json
{
  "action": "buy",
  "tokenIn": "USDT",
  "tokenOut": "BNB",
  "sizePercent": 5,
  "confidence": 0.78,
  "reasoning": "Fear & Greed at 72 (Greed) with positive funding..."
}
```

Below the JSON:
- **APPROVED** (green) or **REJECTED** (red) badge from the risk engine.
- If rejected: the exact guardrail reason (e.g. "confidence 0.45 below threshold 0.60").
- The **AI Explanation** block — a plain-English sentence written by a second, smaller AI model *after* the decision: *"BNB was purchased because sentiment remained positive..."*

---

## Step 6 — Show a Guardrail Rejection

1. Go to **Guardrails** in the sidebar.
2. Change **Min confidence** from `0.6` to `0.99` and click **Save guardrails**.
3. Go back to **Strategy + AI** and click **Run analysis** again.
4. The decision now shows **REJECTED** with reason: *"confidence 0.78 below threshold 0.99"*.
5. Reset Min confidence back to `0.6` and save.

> **Key point:** The AI cannot bypass this check. The rule lives in deterministic Python code — no language model is involved in the validation.

---

## Step 7 — Start the Autonomous Agent

Go back to **Overview**.

1. Enable the **Autonomous** checkbox.
2. Click **Start**.
3. The agent status changes to **RUNNING**.
4. Within ~30 seconds, the first decision appears in the **Live Trade Feed**.

Each row in the feed shows:
- Action (BUY / SELL / HOLD) and token pair
- Status badge: **SIMULATED** (paper trade logged), **REJECTED**, or **ANALYSIS**
- Confidence percentage and the AI's one-line reasoning

> The agent fires a new cycle every 30 seconds. Let it run for a couple of cycles to show multiple decisions.

---

## Step 8 — Show the Full Trade Audit Trail

Click **Activity** in the sidebar.

You see the **Trade History** table with every decision logged since you started. Each row has:

- Trade ID (short unique hash)
- Timestamp
- Mode badge (Paper / Testnet / etc.)
- Action and pair
- Confidence %
- Status (SIMULATED / REJECTED / EXEC)
- Entry price in USD

**Click any row** to open the Trade Detail Drawer on the right side. Inside the drawer:

1. **Market Snapshot** — BNB price, Fear & Greed, orderbook imbalance, gas price at the exact moment of decision.
2. **AI Decision** — full structured output: action, tokens, size, confidence, reasoning paragraph.
3. **Risk Analysis** — per-check table (each guardrail listed as PASS or FAIL).
4. **Execution** — whether it was simulated, the entry price, or a tx hash if live.
5. **AI Explanation** — the plain-English summary written by the SLM after the decision.

> **Key point:** This drawer is the complete audit trail for a single decision. Every number is traceable back to the data that existed at that exact moment.

---

## Step 9 — Show the Kill Switch

Click **Kill switch** in the top-right header.

- The button turns red and says **KILLED**.
- The next autonomous cycle produces status **PAUSED** — the AI still runs but the result is immediately blocked.
- Click **Kill switch** again to release.

> **Key point:** The kill switch is a one-click hard stop. Even if the AI proposes a trade, the risk engine sees the kill switch flag and blocks it before any execution step.

---

## Step 10 — Register for the Competition (optional)

On the **Activity** page, find the **Competition** card at the top.

Click **Register Agent**. This:
- Calls the `CompetitionRegistry` smart contract on BSC testnet.
- Wait ~15 seconds for confirmation.
- Status updates to **REGISTERED ✓**.

The contract address links to BscScan so anyone can verify the on-chain registration.

---

## Step 11 — Testnet Execution (optional, if TWAK is configured)

1. On Overview, switch mode to **Testnet**.
2. Go to Strategy + AI and click **Run analysis**.
3. If the decision is approved, click **Execute via Trust Wallet**.
4. The swap is submitted to BSC testnet through Trust Wallet Agent Kit.
5. The tx hash appears in the drawer — click it to view on BscScan.

---

## What This Application Is — In Simple Words

Think of AlphaTrade like a **financial advisor robot** for crypto, but one that has a strict compliance officer sitting next to it at all times.

Here is how it works in the real world: Imagine you hire a smart analyst (the AI) and tell them *"buy BNB when the market looks positive, but never risk more than 10% of my money in one go."* The analyst studies the live market — the current BNB price from Binance, how greedy or fearful investors are (the Fear & Greed index), how much gas costs on the blockchain — and then writes down their recommendation in a standard format. Before that recommendation reaches your wallet, a compliance officer (the risk engine) checks it against every rule you set: Is the trade too large? Is the AI confident enough? Has the daily limit been hit? Did someone press the emergency stop button? If any rule fails, the trade is blocked — the AI cannot argue its way past the rules because the rules are plain code, not another AI.

Once a trade is approved, in **Paper Trading mode** it is recorded like a practice run with real prices but no real money — exactly like a flight simulator for pilots. When you are ready, you switch to **Testnet** to send a real transaction on a blockchain that uses fake money, and finally to **Mainnet** for the real thing. Every single decision — whether it was approved, rejected, or simulated — is saved with a full receipt: what the market looked like, what the AI said, which rules it passed or failed, and a plain-English summary so anyone can understand what happened and why. Nothing is hidden, nothing is invented.
