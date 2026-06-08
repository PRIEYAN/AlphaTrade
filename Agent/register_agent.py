"""One-time ERC-8004 agent registration (bnbagent SDK).

Registers the AlphaTrade agent on-chain with a unique identity. Run once:

    cd Agent
    # .venv active, deps installed, Agent/.env filled (WALLET_PASSWORD + PRIVATE_KEY)
    python register_agent.py

After the first successful run the key is encrypted to ~/.bnbagent/wallets/ —
you can then remove PRIVATE_KEY from .env (WALLET_PASSWORD is still needed).
"""
import os

from dotenv import load_dotenv

from bnbagent import ERC8004Agent, AgentEndpoint, EVMWalletProvider

load_dotenv()


def main() -> None:
    password = os.getenv("WALLET_PASSWORD")
    if not password:
        raise SystemExit("Set WALLET_PASSWORD in Agent/.env first.")

    wallet = EVMWalletProvider(
        password=password,
        private_key=os.getenv("PRIVATE_KEY"),  # only needed on first run
    )

    sdk = ERC8004Agent(
        network=os.getenv("BNB_NETWORK", "bsc-testnet"),
        wallet_provider=wallet,
    )

    agent_uri = sdk.generate_agent_uri(
        name=os.getenv("AGENT_NAME", "alphatrade-agent"),
        description=os.getenv(
            "AGENT_DESCRIPTION", "AlphaTrade autonomous trading agent on BNB Chain"
        ),
        endpoints=[
            AgentEndpoint(
                name="ERC-8183",
                endpoint=os.getenv("AGENT_ENDPOINT_URL", "http://localhost:8003/erc8183/status"),
                version="0.1.0",
            ),
        ],
    )

    result = sdk.register_agent(agent_uri=agent_uri)
    print(f"Agent registered! ID: {result['agentId']}, TX: {result['transactionHash']}")


if __name__ == "__main__":
    main()
