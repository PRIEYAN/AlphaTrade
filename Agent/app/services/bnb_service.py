"""BNB AI Agent layer — official `bnbagent` SDK (ERC-8004 identity).

Wraps EVMWalletProvider + ERC8004Agent to register the trading agent on-chain
with a unique identity. The SDK (not raw web3) is the BNB agent integration.

The SDK + wallet are constructed lazily on first use, so the Flask app still
boots when the wallet password / key aren't configured yet.
"""
from __future__ import annotations

import json
from urllib import request
from typing import Any, Optional


class BnbAgentService:
    def __init__(
        self,
        network: str,
        password: str,
        private_key: str,
        chain_id: int,
        rpc_url: str,
    ) -> None:
        self.network = network
        self._password = password
        self._private_key = private_key or None  # only needed on first run
        self._chain_id = chain_id
        self._rpc_url = rpc_url
        self._sdk: Optional[Any] = None

    @property
    def configured(self) -> bool:
        return bool(self._password)

    def _agent(self) -> Any:
        """Lazily build the ERC8004Agent (opens/creates the encrypted keystore)."""
        if self._sdk is None:
            # Imported lazily so the app boots even if the SDK isn't installed.
            from bnbagent import ERC8004Agent, EVMWalletProvider

            wallet = EVMWalletProvider(password=self._password, private_key=self._private_key)
            self._sdk = ERC8004Agent(network=self.network, wallet_provider=wallet)
        return self._sdk

    def register(
        self,
        name: str,
        description: str,
        endpoints: list[dict[str, str]],
    ) -> dict[str, Any]:
        """Register the agent on-chain (ERC-8004). Returns agentId + tx hash."""
        from bnbagent import AgentEndpoint

        sdk = self._agent()
        agent_uri = sdk.generate_agent_uri(
            name=name,
            description=description,
            endpoints=[
                AgentEndpoint(
                    name=e["name"],
                    endpoint=e["endpoint"],
                    version=e.get("version", "0.1.0"),
                )
                for e in endpoints
            ],
        )
        result = sdk.register_agent(agent_uri=agent_uri)
        return {
            "agentId": result.get("agentId"),
            "transactionHash": result.get("transactionHash"),
            "agentUri": agent_uri,
            "network": self.network,
        }

    def _rpc(self, method: str) -> str:
        payload = json.dumps(
            {"jsonrpc": "2.0", "id": 1, "method": method, "params": []}
        ).encode("utf-8")
        req = request.Request(
            self._rpc_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=10) as res:
            body = json.loads(res.read().decode("utf-8"))
        if "error" in body:
            message = body["error"].get("message", "RPC error")
            raise RuntimeError(message)
        result = body.get("result")
        if not isinstance(result, str):
            raise RuntimeError(f"RPC method {method} returned no result")
        return result

    def get_on_chain_context(self) -> dict[str, Any]:
        """Live BNB Smart Chain context (block height, gas price)."""
        block_number = int(self._rpc("eth_blockNumber"), 16)
        gas_price_wei = int(self._rpc("eth_gasPrice"), 16)
        return {
            "chainId": self._chain_id,
            "blockNumber": block_number,
            "gasPriceGwei": round(gas_price_wei / 1_000_000_000, 3),
            "rpc": self._rpc_url,
        }
