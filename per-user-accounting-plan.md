# AlphaTrade — Per-User Accounting System
## Engineering Plan

---

## Problem

Currently AlphaTrade uses a single shared agent wallet (`TWAK_AGENT_ADDRESS`). All trades execute from this wallet. Users connect their MetaMask as spectators — there is no per-user deposit, balance tracking, P&L attribution, or withdrawal mechanism.

---

## Goal

Allow multiple users to:

1. Deposit funds into the system (via smart contract)
2. Have the agent trade those funds proportionally
3. See their personal balance, P&L, and trade history
4. Withdraw their share at any time

---

## Architecture Overview

```
┌──────────────┐     Deposit      ┌──────────────────────┐
│  User A      │ ────────────────  │                      │
│  (MetaMask)  │                  │   AlphaTrade Vault    │
│              │  Withdraw        │   (Smart Contract)    │
│              │ ◀──────────────── │                      │
└──────────────┘                  │  totalDeposits        │
                                  │  userBalances[addr]   │
┌──────────────┐     Deposit      │  userShares[addr]     │
│  User B      │ ────────────────  │                      │
│  (MetaMask)  │                  └──────────┬───────────┘
└──────────────┘                             │
                                             │ agentWallet (TWAK)
                                             │ trades from here
                                             ▼
                                     ┌──────────────┐
                                     │   Agent       │
                                     │   Wallet      │
                                     │   (TWAK)      │
                                     └──────────────┘
```

---

## Component 1: Vault Smart Contract

**File:** `blockchain/contracts/AlphaVault.sol`

### State

```solidity
mapping(address => uint256) public userBalances;  // user -> deposited amount (USDT)
uint256 public totalDeposits;
address public agentWallet;     // the TWAK-controlled wallet that trades
address public stablecoin;      // e.g. USDT address
```

### Functions

| Function | Description |
|----------|-------------|
| `deposit(uint256 amount)` | User approves USDT → contract, then deposits. Mints shares. |
| `withdraw(uint256 amount)` | User burns shares, receives USDT back from vault balance. |
| `withdrawAll()` | Withdraw entire balance. |
| `getUserShare(address user) → uint256` | User's proportion of total pool. |
| `getUserValue(address user) → uint256` | User's current USD value (share × total vault NAV). |
| `getVaultNav() → uint256` | Vault's total USD value (deposits + P&L). |
| `setAgentWallet(address)` | Owner-only: set which address can trade. |
| `executeTrade(address tokenIn, address tokenOut, uint256 amountIn, bytes calldata swapData)` | Agent-only: executes a swap. Vault pays gas, user funds are traded proportionally. |

### Share Accounting

- User deposits X USDT → contract tracks `userBalances[user] += X`, `totalDeposits += X`
- Vault NAV increases/decreases as the agent trades
- User's equity = `(userBalances[user] / totalDeposits) * vaultNav`
- Simple approach: proportional pool (like a mutual fund). All users share P&L proportionally to their deposit.

---

## Component 2: Backend Per-User Accounting Service

**File:** `Agent/app/services/accounting_service.py`

### Responsibilities

- Track deposits and withdrawals by querying the vault contract
- Compute per-user P&L: `(userEquityNow - userDeposited) / userDeposited`
- Enforce per-user trade limits based on their share of the pool
- Record which user "triggered" a trade decision (session-based)

### Data Model (in-memory or DB)

```python
@dataclass
class UserAccount:
    address: str
    deposited_usd: float       # total deposits in USDT
    current_value_usd: float   # current equity (share of vault NAV)
    pnl_usd: float             # unrealized P&L
    pnl_pct: float             # percentage return
    trades_this_cycle: int     # daily trade count for this user
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/accounting/balance?user=0x...` | User's deposited + current value + P&L |
| `GET /api/accounting/vault` | Total vault NAV, total depositors, APY |
| `POST /api/accounting/deposit` | Generate deposit instructions (returns contract + expected amount) |
| `POST /api/accounting/withdraw` | Generate withdraw instructions |
| `GET /api/accounting/trades?user=0x...` | Per-user trade history |

---

## Component 3: Modified Guardrails — Per-User Limits

**File:** `Agent/app/models/guardrails.py`

Currently guardrails use global limits. Add per-user variants:

| Guardrail | Per-User Logic |
|-----------|----------------|
| `maxPerTradePct` | % of **this user's** share, not the whole pool |
| `dailyTradeCap` | Trades triggered by this user today |
| `dailySpendLimitUsd` | % of user's current equity |

The agent controller receives the requesting user's address in the `DecideRequest` and the accounting service resolves their limits.

---

## Component 4: Frontend — User Portfolio Dashboard

**Files:**
- `src/routes/dashboard.account.tsx` — new route
- `src/lib/services/accountingService.ts` — API client

### Portfolio View (per user)

- **Deposited**: total USDT the user has put in
- **Current Value**: their share of the vault NAV
- **P&L**: USD and % change since deposit
- **Vault Stats**: total AUM, number of depositors

### Deposit / Withdraw UI

- "Deposit" button → approve USDT → call `vault.deposit()`
- "Withdraw" button → call `vault.withdrawAll()`
- Uses wagmi's `useWriteContract` + `useWaitForTransactionReceipt`

### Per-User Trade History

- Filter the global trade log by `triggeredBy` address
- Show only trades that executed while this user's session was active (or attributed to them)

---

## Component 5: Modified Agent Loop — User Attribution

**File:** `src/lib/agent/useAgentLoop.ts`

Currently the agent loop is session-less. Changes needed:

1. Pass `userAddress` in the `/api/agent/decide` request body
2. Backend records which user's session triggered each trade
3. Frontend filters the trade log per user
4. Size limits are computed from the user's share, not the global pool

---

## Data Flow

```
1. User deposits USDT into AlphaVault.sol
2. User connects MetaMask → backend knows their address
3. Agent loop fires:
   a. Fetch user's share from vault contract
   b. Compute per-user trade limits (e.g. 10% of user's equity)
   c. Send decide request with userAddress + scaled limits
   d. Backend returns decision + validation
   e. Execute trade via TWAK (from agent wallet — pool funds)
   f. Record trade with userAddress attribution
   g. Vault NAV updates automatically (trades change vault balance)
4. User checks dashboard: sees deposits, current value, P&L
5. User withdraws: gets (their share × current vault NAV) in USDT
```

---

## Database Schema Additions

### `users` table (PostgreSQL or SQLite)

| Column | Type | Notes |
|--------|------|-------|
| address | text | Wallet address (PK) |
| deposited_usd | real | Total lifetime deposits |
| withdrawn_usd | real | Total lifetime withdrawals |
| first_deposit_at | datetime | |
| last_active_at | datetime | Last trade trigger |

### `trades` table — add column

| Column | Type | Notes |
|--------|------|-------|
| triggered_by | text | Wallet address of the user whose session triggered this trade |
| user_share_at_time | real | User's share of pool at decision time (for P&L attribution) |

---

## MVP Milestones

### Phase 1 — Vault contract
- [ ] `AlphaVault.sol` with deposit/withdraw/NAV/executeTrade
- [ ] Hardhat tests for deposit → trade → withdraw cycle
- [ ] Deploy to testnet

### Phase 2 — Backend accounting
- [ ] `accounting_service.py` — reads vault state, computes per-user P&L
- [ ] API endpoints for balance, vault stats, per-user trades
- [ ] Modified `DecideRequest` schema to include `userAddress`
- [ ] Per-user guardrail scaling

### Phase 3 — Frontend portfolio
- [ ] Dashboard portfolio page with deposit/withdraw UI
- [ ] Per-user balance + P&L display
- [ ] Trade history filtered by connected wallet

### Phase 4 — Attribution
- [ ] Agent loop passes user address
- [ ] Trades tagged with `triggeredBy`
- [ ] Withdraw flow → user receives their proportional share

---

## Key Risk & Mitigations

| Risk | Mitigation |
|------|------------|
| Agent wallet rug-pulls deposits | Vault contract limits `executeTrade` to pre-approved DEX routers + allows users to withdraw anytime |
| One user's bad trade affects all | All users share proportionally (mutual-fund model). No single user can trade more than their share. |
| Smart contract bug | Start on testnet only. Use OpenZeppelin audited contracts. |
| User withdraws while trade is pending | Withdraw uses current vault NAV; pending trades settle before withdrawal resolves. |
| Gas costs eat user profits | Agent wallet pays gas; can charge a small management fee (e.g. 10% of profit) via the vault contract. |

---

## Fee Model (optional, for sustainability)

The vault contract can implement a `managementFee` (e.g. 2% of AUM/year) and `performanceFee` (e.g. 20% of profits). These are deducted when users withdraw:

```solidity
function withdrawAll() external {
    uint256 share = userBalances[msg.sender];
    uint256 grossValue = (share * vaultNav) / totalDeposits;
    uint256 fee = computeFee(msg.sender, grossValue);
    uint256 netValue = grossValue - fee;
    // transfer netValue USDT to user
    // send fee to treasury address
}
```
