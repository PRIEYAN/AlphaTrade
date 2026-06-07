import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { anyUint } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("CompetitionRegistry", () => {
  async function deploy(deadlineOffsetSec = 7 * 24 * 60 * 60) {
    const [deployer, agentA, agentB, operator] = await ethers.getSigners();
    const now = await time.latest();
    const deadline = now + deadlineOffsetSec;
    const Factory = await ethers.getContractFactory("CompetitionRegistry");
    const registry = await Factory.deploy(deadline);
    await registry.waitForDeployment();
    return { registry, deadline, deployer, agentA, agentB, operator };
  }

  it("reverts when deployed with a past deadline", async () => {
    const now = await time.latest();
    const Factory = await ethers.getContractFactory("CompetitionRegistry");
    await expect(Factory.deploy(now)).to.be.revertedWithCustomError(
      Factory,
      "RegistrationClosed",
    );
  });

  it("stores the immutable deadline and opens registration", async () => {
    const { registry, deadline } = await deploy();
    expect(await registry.registrationDeadline()).to.equal(deadline);
    expect(await registry.registrationOpen()).to.equal(true);
    expect(await registry.participantCount()).to.equal(0);
  });

  it("self-registers the caller and emits AgentRegistered", async () => {
    const { registry, agentA } = await deploy();
    await expect(registry.connect(agentA).register())
      .to.emit(registry, "AgentRegistered")
      .withArgs(agentA.address, agentA.address, 0, anyUint);

    expect(await registry.isRegistered(agentA.address)).to.equal(true);
    expect(await registry.participantCount()).to.equal(1);
    expect(await registry.participantAt(0)).to.equal(agentA.address);
    expect(await registry.indexOf(agentA.address)).to.equal(0);
  });

  it("registers an agent on behalf via an operator, recording the operator", async () => {
    const { registry, agentA, operator } = await deploy();
    await expect(registry.connect(operator).registerAgent(agentA.address))
      .to.emit(registry, "AgentRegistered")
      .withArgs(agentA.address, operator.address, 0, anyUint);
    expect(await registry.isRegistered(agentA.address)).to.equal(true);
  });

  it("rejects duplicate registration", async () => {
    const { registry, agentA } = await deploy();
    await registry.connect(agentA).register();
    await expect(registry.connect(agentA).register()).to.be.revertedWithCustomError(
      registry,
      "AlreadyRegistered",
    );
  });

  it("rejects the zero address", async () => {
    const { registry } = await deploy();
    await expect(
      registry.registerAgent(ethers.ZeroAddress),
    ).to.be.revertedWithCustomError(registry, "ZeroAddress");
  });

  it("maintains an append-only participant list", async () => {
    const { registry, agentA, agentB } = await deploy();
    await registry.connect(agentA).register();
    await registry.connect(agentB).register();
    const list = await registry.getParticipants();
    expect(list).to.deep.equal([agentA.address, agentB.address]);
    expect(await registry.indexOf(agentB.address)).to.equal(1);
  });

  it("rejects registration once the deadline passes", async () => {
    const { registry, agentA, deadline } = await deploy();
    await time.increaseTo(deadline);
    expect(await registry.registrationOpen()).to.equal(false);
    expect(await registry.timeUntilDeadline()).to.equal(0);
    await expect(registry.connect(agentA).register()).to.be.revertedWithCustomError(
      registry,
      "RegistrationClosed",
    );
  });
});
