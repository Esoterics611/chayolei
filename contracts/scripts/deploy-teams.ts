import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deploy the per-team contracts (docs/TEAM_CONTRACTS.md):
 *   TeamForwarder, Team (the implementation every team clones), TeamFactory
 * and give TeamFactory the MINTER_ROLE on TMIMToken.
 *
 * Prerequisites: TMIMToken deployed (scripts/deploy.ts), and the deployer
 * holding its DEFAULT_ADMIN_ROLE so it can grant the minter role.
 *
 * Settings (environment):
 *   TEAM_DEFAULT_ALLOWANCE  TMIM a new team may mint a month until the
 *                           platform sets its own allowance (default 0:
 *                           teams organize at once, pay out once approved)
 *   TEAM_ANCHORER           address of the app's anchoring service (optional)
 *   TEAM_FACTORY_ADMIN      admin of the factory (default: the deployer;
 *                           use the platform multisig, audit finding L-3)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-teams.ts --network baseSepolia
 *   npx hardhat run scripts/deploy-teams.ts --network localhost
 *
 * Reads and updates deployments/{network}.json.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log('='.repeat(60));
  console.log(`Deploying team contracts to: ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log('='.repeat(60));

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const file = path.join(deploymentsDir, `${network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No deployment at ${file}. Run scripts/deploy.ts first to deploy TMIMToken.`);
  }
  const existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const tmimAddress: string = existing.contracts.TMIMToken;
  const tmim = await ethers.getContractAt('TMIMToken', tmimAddress);

  const defaultAllowance = BigInt(process.env.TEAM_DEFAULT_ALLOWANCE ?? '0');
  const admin = process.env.TEAM_FACTORY_ADMIN || deployer.address;
  const anchorer = process.env.TEAM_ANCHORER;

  console.log('\n1. TeamForwarder...');
  const forwarder = await (await ethers.getContractFactory('TeamForwarder')).deploy();
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log(`   ✓ ${forwarderAddress}`);

  console.log('2. Team (implementation)...');
  const impl = await (await ethers.getContractFactory('Team')).deploy(forwarderAddress);
  await impl.waitForDeployment();
  const implAddress = await impl.getAddress();
  console.log(`   ✓ ${implAddress}`);

  console.log('3. TeamFactory...');
  // The deployer administers the factory until the end of this script, so it
  // can set the anchoring service; then hands over if another admin is named.
  const factory = await (await ethers.getContractFactory('TeamFactory')).deploy(
    deployer.address, tmimAddress, implAddress, forwarderAddress, defaultAllowance,
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`   ✓ ${factoryAddress} (default allowance ${defaultAllowance} TMIM a month)`);

  const MINTER_ROLE = await tmim.MINTER_ROLE();
  await (await tmim.grantRole(MINTER_ROLE, factoryAddress)).wait();
  console.log('   ✓ MINTER_ROLE on TMIMToken granted to TeamFactory');

  if (anchorer) {
    await (await factory.setAnchorer(anchorer)).wait();
    console.log(`   ✓ anchoring service: ${anchorer}`);
  }

  if (admin.toLowerCase() !== deployer.address.toLowerCase()) {
    const ADMIN = await factory.DEFAULT_ADMIN_ROLE();
    const ALLOWANCE = await factory.ALLOWANCE_ROLE();
    await (await factory.grantRole(ADMIN, admin)).wait();
    await (await factory.grantRole(ALLOWANCE, admin)).wait();
    await (await factory.renounceRole(ALLOWANCE, deployer.address)).wait();
    await (await factory.renounceRole(ADMIN, deployer.address)).wait();
    console.log(`   ✓ factory administered by ${admin}; deployer's roles renounced`);
  }

  existing.contracts.TeamForwarder = forwarderAddress;
  existing.contracts.TeamImplementation = implAddress;
  existing.contracts.TeamFactory = factoryAddress;
  existing.teamsDeployedAt = new Date().toISOString();
  existing.teamsDeployedAtBlock = await ethers.provider.getBlockNumber();
  fs.writeFileSync(file, JSON.stringify(existing, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ Team contracts deployed. Add these to your .env:\n');
  console.log(`TEAM_FORWARDER_ADDRESS=${forwarderAddress}`);
  console.log(`TEAM_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`TEAM_START_BLOCK=${existing.teamsDeployedAtBlock}`);
  console.log('\nDeployment updated in:', file);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
