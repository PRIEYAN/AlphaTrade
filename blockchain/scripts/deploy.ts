import { ethers, network, run } from "hardhat";

/**
 * Deploys CompetitionRegistry.
 *
 * The registration deadline (when the trading window opens) is taken from
 * REGISTRATION_DEADLINE (Unix seconds). If unset, it defaults to 7 days from
 * now — convenient for testnet dry-runs.
 *
 * Usage:
 *   REGISTRATION_DEADLINE=1735689600 npm run deploy:testnet
 *   REGISTRATION_DEADLINE=1735689600 npm run deploy:mainnet
 */
async function main() {
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(process.env.REGISTRATION_DEADLINE ?? now + 7 * 24 * 60 * 60);

  if (deadline <= now) {
    throw new Error(
      `REGISTRATION_DEADLINE (${deadline}) must be in the future (now=${now}).`,
    );
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No signer configured. Set AGENT_PRIVATE_KEY (or PRIVATE_KEY) in blockchain/.env.",
    );
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} BNB`);
  console.log(`Deadline: ${deadline} (${new Date(deadline * 1000).toISOString()})`);

  const factory = await ethers.getContractFactory("CompetitionRegistry");
  const registry = await factory.deploy(deadline);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`\nCompetitionRegistry deployed to: ${address}`);
  console.log(`Set VITE_COMPETITION_CONTRACT=${address} in the web app .env\n`);

  // Auto-verify on public networks when a BscScan key is present.
  if (network.name !== "hardhat" && process.env.BSCSCAN_API_KEY) {
    console.log("Waiting for confirmations before verification...");
    await registry.deploymentTransaction()?.wait(5);
    try {
      await run("verify:verify", { address, constructorArguments: [deadline] });
      console.log("Verified on BscScan.");
    } catch (err) {
      console.warn("Verification skipped/failed:", (err as Error).message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
