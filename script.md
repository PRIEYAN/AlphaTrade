# AlphaTrade — 2-Minute Demo Video Script

> **Before recording:** Both servers running. MetaMask on BSC Testnet. Agent in Paper Trading mode. Open at the landing page.
> **Pace:** Speak slowly and clearly. Each `[section]` is roughly 20–25 seconds.

---

## [0:00 – 0:15] Landing Page

*(Show the landing page)*

> "This is AlphaTrade — an autonomous AI trading agent for BNB Smart Chain.
> It watches live market data, makes trading decisions using a large language model,
> and enforces hard risk rules before any trade is executed.
> Let me walk you through every part of it."

*(Click **Open Dashboard**)*

---

## [0:15 – 0:40] Overview Page

*(Show the 4 KPI cards at the top)*

> "The Overview page shows everything in real time.
> This card is my live on-chain BNB balance — read directly from the blockchain via my connected MetaMask wallet.
> Next to it, the BNB price — pulled live from Binance, no API key needed.
> The Paper PnL tracks simulated profit and loss across all paper trades logged today.
> And this last card shows total decisions made, approved, and rejected."

*(Point to the Operating Mode buttons)*

> "Down here I can switch operating modes.
> Analysis Only — AI decides but nothing is recorded.
> Paper Trading — the full pipeline runs, trade is logged with a real entry price, but no money moves.
> Testnet — a real swap is submitted to BSC testnet via Trust Wallet Agent Kit.
> Mainnet — real money. I'll keep it on Paper Trading for this demo."

*(Point to the Agent Controls panel)*

> "This is the agent control panel. I can start and stop the autonomous loop,
> toggle autonomous mode, and there's a Kill Switch — one click, all trading stops immediately,
> even if the AI has already decided to trade."

---

## [0:40 – 1:00] Guardrails Page

*(Click Guardrails in the sidebar)*

> "These are the guardrails — deterministic rules written in Python code.
> The AI cannot bypass these. No matter what it decides, the trade is blocked if any rule fails."

*(Point to each field as you say it)*

> "Max percent per trade — the AI can never risk more than this in one go.
> Daily trade cap — maximum number of trades per day.
> Daily spend limit — total USD cap across the day.
> Max drawdown — if losses exceed this percent, trading stops.
> Slippage — maximum price movement allowed during the swap.
> Min confidence — if the AI is less than this confident, the trade is rejected.
> And the token allowlist — the AI can only trade tokens I explicitly allow here."

*(Click Save Guardrails)*

> "I click Save and these rules take effect on the very next decision cycle."

---

## [1:00 – 1:30] Strategy + AI Page

*(Click Strategy + AI in the sidebar)*

> "This is where I tell the AI what to do — in plain English."

*(Point to the strategy text box)*

> "I type my strategy here: buy BNB when Fear and Greed is above 60, sell when it drops below 40, never risk more than 5 percent at a time.
> That's it. The AI reads this plus live market signals every cycle."

*(Point to the signals panel on the right)*

> "On the right, live signals: the Fear and Greed index from CoinMarketCap,
> the live BNB price from Binance, and on-chain gas price from the BNB testnet RPC."

*(Click Run Analysis)*

> "I click Run Analysis. The request goes to my Python Agent, which calls Groq's Llama 70B model."

*(Result appears — point to each section)*

> "The AI returns a structured decision — action, token pair, size, and confidence.
> Below it, the risk engine validates every guardrail — APPROVED in green.
> And at the bottom, a plain-English explanation written by a smaller AI model after the decision:
> it tells me in simple words why this trade was made."

---

## [1:30 – 1:50] Activity Page

*(Click Activity in the sidebar)*

> "The Activity page is the full audit trail.
> Every decision — approved, rejected, or simulated — is logged here with timestamp, mode, confidence, and entry price."

*(Click on any row to open the drawer)*

> "I click a row to open the Trade Detail Drawer.
> This shows exactly what the market looked like at decision time — price, Fear and Greed, orderbook imbalance, gas price.
> Then the full AI decision, which guardrails passed or failed, the execution status with entry price,
> and the AI explanation.
> Every single number is traceable. Nothing is invented."

*(Point to the Competition card)*

> "Up here, I can register my agent on-chain to the competition smart contract deployed on BSC testnet."

---

## [1:50 – 2:00] Closing

*(Stay on Activity or go back to Overview — show the mode badge in the header)*

> "AlphaTrade combines three AI agents in one system:
> CoinMarketCap for live crypto signals,
> Groq Llama for trading decisions,
> and Trust Wallet Agent Kit for on-chain execution —
> all wrapped in deterministic risk rules that the AI can never override.
> Thank you."

---

## Quick Reference — What Each Element Does

| Screen | Element | What to say |
|--------|---------|-------------|
| Overview | Wallet BNB card | Live on-chain balance via MetaMask |
| Overview | BNB Price card | Binance public API, real-time |
| Overview | Paper PnL | Simulated profit across paper trades |
| Overview | Mode selector | 4 modes: Analysis / Paper / Testnet / Mainnet |
| Overview | Kill Switch | Hard stop — blocks AI even mid-cycle |
| Guardrails | Max % per trade | Caps single trade size |
| Guardrails | Daily trade cap | Max trades per day |
| Guardrails | Daily spend limit | Total USD the agent can spend today |
| Guardrails | Max drawdown | Auto-stop if losses exceed this |
| Guardrails | Slippage | Price movement tolerance during swap |
| Guardrails | Min confidence | Rejects low-confidence AI decisions |
| Guardrails | Token allowlist | Whitelist of tradeable tokens |
| Strategy + AI | Strategy box | Plain-English instructions to the AI |
| Strategy + AI | Signals panel | Fear & Greed, BNB price, gas — all live |
| Strategy + AI | Run Analysis | Triggers Groq Llama 70B decision |
| Strategy + AI | APPROVED / REJECTED | Guardrail validation result |
| Strategy + AI | AI Explanation | Plain-English summary from Llama 8B |
| Activity | Trade History table | Full log of every decision |
| Activity | Trade Detail Drawer | Per-trade audit: market snapshot, decision, risk checks, execution |
| Activity | Competition card | On-chain agent registration to BSC testnet contract |
