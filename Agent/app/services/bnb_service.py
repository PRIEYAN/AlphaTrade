"""BNB on-chain agent — real reads from BNB Smart Chain via web3.py.

web3 is the EVM/BNB SDK here: it talks to the chain over the configured RPC.
No API key required for reads."""
from __future__ import annotations

from typing import Any

from web3 import Web3


class BnbService:
    def __init__(self, rpc: str, chain_id: int) -> None:
        self.rpc = rpc
        self.chain_id = chain_id
        self.w3 = Web3(Web3.HTTPProvider(rpc))

    def get_onchain_context(self) -> dict[str, Any]:
        """Live BNB Smart Chain context (block height, gas price)."""
        block_number = self.w3.eth.block_number
        gas_price = self.w3.eth.gas_price
        return {
            "chainId": self.chain_id,
            "blockNumber": int(block_number),
            "gasPriceGwei": round(float(self.w3.from_wei(gas_price, "gwei")), 3),
            "rpc": self.rpc,
        }

    def get_native_balance(self, address: str) -> dict[str, Any]:
        """Native BNB balance for an address (real on-chain read)."""
        checksum = Web3.to_checksum_address(address)
        wei = self.w3.eth.get_balance(checksum)
        return {
            "address": checksum,
            "balanceBnb": float(self.w3.from_wei(wei, "ether")),
            "wei": str(wei),
        }
