import { ethers } from 'hardhat';

const TMIM_ADDRESS = '0x1A66CeE19C53956022f01842043d79d594BFb8E5';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying MasimaRewards + Treasury with ${deployer.address}\n`);

  // ── Deploy MasimaRewards ────────────────────
  console.log('Deploying MasimaRewards...');
  const MasimaRewards = await ethers.getContractFactory('MasimaRewards');
  const rewards = await MasimaRewards.deploy(deployer.address, TMIM_ADDRESS);
  await rewards.waitForDeployment();
  const rewardsAddr = await rewards.getAddress();
  console.log(`✓ MasimaRewards: ${rewardsAddr}`);

  // Grant MINTER role to rewards
  const tmim = await ethers.getContractAt('TMIMToken', TMIM_ADDRESS);
  const MINTER = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
  console.log('  → Granting MINTER_ROLE...');
  await tmim.grantRole(MINTER, rewardsAddr);

  // ── Deploy Treasury ─────────────────────────
  console.log('\nDeploying ChayoleiTreasury...');
  const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
  const Treasury = await ethers.getContractFactory('ChayoleiTreasury');
  const treasury = await Treasury.deploy(deployer.address, TMIM_ADDRESS, USDC);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log(`✓ ChayoleiTreasury: ${treasuryAddr}`);

  // Grant MINTER + BURNER to treasury
  const BURNER = ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE'));
  console.log('  → Granting MINTER_ROLE + BURNER_ROLE...');
  await tmim.grantRole(MINTER, treasuryAddr);
  await tmim.grantRole(BURNER, treasuryAddr);

  console.log('\n✅ Done!\n');
  console.log('Add to .env:');
  console.log(`VITE_MASIMA_REWARDS_ADDRESS=${rewardsAddr}`);
  console.log(`VITE_TREASURY_ADDRESS=${treasuryAddr}`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
