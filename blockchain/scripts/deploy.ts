import { ethers, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys CompetitionRegistry to BNB Chain (or any configured Hardhat network),
 * with verbose progress, on-chain read-back confirmation, a saved deployment
 * artifact, and optional BscScan verification.
 *
 * The registration deadline (when the trading window opens) comes from the
 * REGISTRATION_DEADLINE env var (Unix seconds). If unset it defaults to 7 days
 * from now — handy for testnet dry runs.
 *
 * Usage:
 *   npm run deploy:testnet
 *   npm run deploy:mainnet
 *   REGISTRATION_DEADLINE=1767225600 npm run deploy:mainnet         # bash
 *   $env:REGISTRATION_DEADLINE=1767225600; npm run deploy:mainnet   # PowerShell
 */

// Minimal view of the read-back methods (avoids depending on generated typings).
type RegistryView = {
  registrationDeadline(): Promise<bigint>;
  registrationOpen(): Promise<boolean>;
  participantCount(): Promise<bigint>;
};

const SEVEN_DAYS = 7 * 24 * 60 * 60;

async function main() {
  // 1. Resolve + validate the registration deadline. -------------------------
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(process.env.REGISTRATION_DEADLINE) || now + SEVEN_DAYS;

  if (!Number.isInteger(deadline) || deadline <= now) {
    throw new Error(
      `REGISTRATION_DEADLINE must be a future Unix timestamp (seconds). ` +
        `Got "${process.env.REGISTRATION_DEADLINE}" (now=${now}).`,
    );
  }

  // 2. Resolve + sanity-check the signer. ------------------------------------
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No signer configured. Set AGENT_PRIVATE_KEY (or PRIVATE_KEY) in blockchain/.env " +
        "for the target network.",
    );
  }

  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("───────────────────────────────────────────────");
  console.log(" AlphaTrade — CompetitionRegistry deploy");
  console.log("───────────────────────────────────────────────");
  console.log(` Network:  ${network.name} (chainId ${chainId})`);
  console.log(` Deployer: ${deployer.address}`);
  console.log(` Balance:  ${ethers.formatEther(balance)} BNB`);
  console.log(` Deadline: ${deadline}  (${new Date(deadline * 1000).toISOString()})`);
  console.log("───────────────────────────────────────────────");

  // A zero balance on a live network = the tx will fail; stop with a clear msg.
  if (network.name !== "hardhat" && balance === 0n) {
    throw new Error(
      `Deployer ${deployer.address} has 0 BNB on ${network.name}. Fund it first ` +
        `(testnet faucet: https://testnet.bnbchain.org/faucet-smart).`,
    );
  }

  // 3. Deploy. ---------------------------------------------------------------
  console.log("Deploying CompetitionRegistry...");
  const factory = await ethers.getContractFactory("CompetitionRegistry");
  const registry = await factory.deploy(deadline);

  const deployTx = registry.deploymentTransaction();
  if (deployTx) console.log(` Tx sent: ${deployTx.hash}`);

  await registry.waitForDeployment();
  const address = await registry.getAddress();
  const receipt = deployTx ? await deployTx.wait() : null;

  console.log(`\n✓ CompetitionRegistry deployed to: ${address}`);
  if (receipt) console.log(` Block: ${receipt.blockNumber}  Gas used: ${receipt.gasUsed}`);

  // 4. Read state back on-chain to confirm the deploy actually worked. --------
  const reg = registry as unknown as RegistryView;
  const onchainDeadline = await reg.registrationDeadline();
  const isOpen = await reg.registrationOpen();
  const count = await reg.participantCount();
  console.log(` Verified state: deadline=${onchainDeadline} open=${isOpen} participants=${count}`);
  if (Number(onchainDeadline) !== deadline) {
    throw new Error(
      `On-chain deadline (${onchainDeadline}) does not match requested (${deadline}). Aborting.`,
    );
  }

  // 5. Persist a deployment artifact. ----------------------------------------
  const record = {
    contract: "CompetitionRegistry",
    address,
    network: network.name,
    chainId,
    deployer: deployer.address,
    registrationDeadline: deadline,
    txHash: deployTx?.hash ?? null,
    blockNumber: receipt?.blockNumber ?? null,
    deployedAt: new Date().toISOString(),
  };
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2) + "\n");
  console.log(` Saved deployment record -> ${path.relative(process.cwd(), outFile)}`);

  // 6. Auto-verify on public networks when a BscScan key is present. ----------
  if (network.name !== "hardhat" && process.env.BSCSCAN_API_KEY) {
    console.log("\nWaiting for confirmations before verification...");
    if (deployTx) await deployTx.wait(5);
    try {
      await run("verify:verify", { address, constructorArguments: [deadline] });
      console.log("✓ Verified on BscScan.");
    } catch (err) {
      const msg = (err as Error).message;
      if (/already verified/i.test(msg)) {
        console.log("Already verified on BscScan.");
      } else {
        console.warn("Verification skipped/failed:", msg);
        console.warn(`Verify manually:\n  npx hardhat verify --network ${network.name} ${address} ${deadline}`);
      }
    }
  } else if (network.name !== "hardhat") {
    console.log(
      `\nTo verify: set BSCSCAN_API_KEY, then:\n` +
        `  npx hardhat verify --network ${network.name} ${address} ${deadline}`,
    );
  }

  // 7. Next step for the web app. --------------------------------------------
  console.log("\n───────────────────────────────────────────────");
  console.log(" Next: put this in the web app .env (repo root):");
  console.log(`   VITE_COMPETITION_CONTRACT=${address}`);
  console.log("───────────────────────────────────────────────\n");
}

main().catch((error) => {
  console.error("\n✗ Deployment failed:\n", error);
  process.exitCode = 1;
});
