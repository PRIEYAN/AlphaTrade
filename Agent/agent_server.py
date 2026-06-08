"""ERC-8183 agent server (bnbagent SDK).

A standalone FastAPI app that accepts jobs, runs `execute_job` for each FUNDED
job assigned to this provider, uploads the deliverable, and submits on-chain.
Routes are mounted at /erc8183/* (negotiate, status, job/{id}, ...).

Run it (separate from the Flask decision API):

    cd Agent
    uvicorn agent_server:app --port 8003

Requires Agent/.env: WALLET_PASSWORD, PRIVATE_KEY (first run), ERC8183_AGENT_URL,
ERC8183_SERVICE_PRICE, and (for IPFS storage) STORAGE_API_KEY. See .env.example.

Settle is permissionless — run a separate operator to call router.settle(jobId)
once the dispute window elapses.
"""
from dotenv import load_dotenv

from bnbagent.erc8183.server import create_erc8183_app

load_dotenv()


def execute_job(job: dict) -> str:
    """Called automatically for each FUNDED job. Return the deliverable string.

    Replace this with the real AlphaTrade work (e.g. produce a trade analysis /
    decision for the requested market). For now it echoes the job description.
    """
    return f"Processed: {job.get('description', '')}"


# create_erc8183_app handles the wallet keystore, the funded-job poll loop,
# on-chain verification, calling execute_job, uploading the deliverable, and
# submitting on-chain. Jobs with budget < service_price are rejected (HTTP 402).
app = create_erc8183_app(on_job=execute_job)


if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("ERC8183_PORT", "8003")))
