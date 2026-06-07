# AlphaTrade — Competition Registry (Hardhat)

On-chain registration for the AlphaTrade autonomous-trading competition
(Track 1, BNB Chain). This is a standalone Hardhat project; it is independent of
the web app and has its own `package.json`.

## What the contract does

[`CompetitionRegistry.sol`](contracts/CompetitionRegistry.sol) records each
participant's **agent wallet address** into an **immutable, append-only list**:

- **Self-custodial registration** — `register()` adds `msg.sender`, so the agent
  wallet signs and submits its own registration transaction. Keys never leave the
  user.
- **Operator path** — `registerAgent(address)` lets a relayer (e.g. the TWAK CLI
  `twak compete register` or the MCP `competition_register` action) submit on the
  agent's behalf; the event records both the agent and the submitting operator.
- **Deadline enforcement** — the registration deadline is fixed at deploy time and
  **immutable**. Once the trading window opens, all registrations revert with
  `RegistrationClosed`.
- **No admin, no upgrades, no custody** — there is no owner role, no way to remove
  or alter an entry, and the contract holds no funds. The participant list is
  trustless.

Events: `AgentRegistered(agent, operator, index, timestamp)`.

## Requirements

Use an **LTS Node version (18 / 20 / 22)** for this subproject. Hardhat 2.x does
not officially support Node ≥ 23, and on very new Node builds its first-run solc
compiler download can hang. If `npx hardhat compile` stalls at
"Downloading compiler 0.8.24", switch to Node 20/22 (e.g. via `nvm`).

The contract has been verified to compile cleanly with solc 0.8.24
(0 errors, 0 warnings).

## Setup

```bash
cd blockchain
npm install
cp .env.example .env   # fill in AGENT_PRIVATE_KEY, RPC URLs, BSCSCAN_API_KEY
```

## Commands

```bash
npm run compile          # compile contracts
npm test                 # run the test suite (local Hardhat network)
npm run deploy:testnet   # deploy to BSC testnet (chainId 97)
npm run deploy:mainnet   # deploy to BSC mainnet (chainId 56)
```

Set the trading-window open time when deploying:

```bash
REGISTRATION_DEADLINE=1735689600 npm run deploy:testnet
```

After deploy, copy the printed address into the web app's `.env` as
`VITE_COMPETITION_CONTRACT=0x...`.

## Reference deployment

The web app ships pointing at the reference competition contract:

```
0x212c61b9b72c95d95bf29cf032f5e5635629aed5  (BSC, chainId 56)
```

Explorer: https://bsctrace.com/address/0x212c61b9b72c95d95bf29cf032f5e5635629aed5

## How the app uses it

The in-app **Activity / Proof** page surfaces registration status and a
"Register Agent" button. In production that button drives
`twakService.registerForCompetition()`, which resolves the agent's wallet and
submits the registration transaction through Trust Wallet Agent Kit — the same
self-custodial signing path used for trades.
