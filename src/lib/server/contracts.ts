// ═══════════════════════════════════════════════════════════════
// Server-side contract helpers — Base Sepolia
// ═══════════════════════════════════════════════════════════════
import { ethers } from 'ethers';
import {
  BASE_SEPOLIA_RPC_URL,
  DEPLOYER_PRIVATE_KEY,
  VITE_MASIMA_REWARDS_ADDRESS,
  VITE_TREASURY_ADDRESS,
} from '$env/static/private';

// ── ABIs (minimal — only what we call) ────────────────────────
const MASIMA_REWARDS_ABI = [
  'function approveMasima(bytes32 masimaIdHash, address assignee, uint256 reward) external',
  'function approveTafkid(bytes32 tafkidIdHash, address assignee, uint256 reward) external',
  'function isMasimaApproved(bytes32) external view returns (bool)',
  'function isTafkidApproved(bytes32) external view returns (bool)',
] as const;

const TREASURY_ABI = [
  'function receiveETH() external payable',
] as const;

// ── provider / signer (lazy) ───────────────────────────────────
let _provider: ethers.JsonRpcProvider | null = null;
let _signer:   ethers.Wallet | null = null;

function getSigner(): ethers.Wallet {
  if (!_signer) {
    const rpc = BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    _provider = new ethers.JsonRpcProvider(rpc);
    _signer   = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, _provider);
  }
  return _signer;
}

export function getMasimaRewardsContract() {
  return new ethers.Contract(VITE_MASIMA_REWARDS_ADDRESS, MASIMA_REWARDS_ABI, getSigner());
}

// ── helpers ───────────────────────────────────────────────────

/** Convert a Firestore doc ID string to bytes32 */
export function idToBytes32(id: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

/** Convert TMIM amount to contract units.
 *  TMIMToken uses 0 decimals — 1 TMIM = 1 token unit. */
export function tmimToWei(amount: number): bigint {
  return BigInt(amount);
}

export const BASESCAN_BASE_SEPOLIA = 'https://sepolia.basescan.org/tx';

/**
 * Mint TMIM on-chain by calling MasimaRewards.approveMasima().
 * Returns the tx hash, or null if the assignee has no wallet or already approved.
 */
export async function mintMasimaReward(
  masimaId: string,
  assigneeWallet: string,
  tmimAmount: number,
): Promise<string | null> {
  if (!assigneeWallet || !assigneeWallet.startsWith('0x')) return null;
  if (tmimAmount <= 0) return null;

  const contract  = getMasimaRewardsContract();
  const idHash    = idToBytes32(masimaId);

  // Skip if already minted on-chain
  const already = await contract.isMasimaApproved(idHash);
  if (already) return null;

  const tx = await contract.approveMasima(
    idHash,
    assigneeWallet,
    tmimToWei(tmimAmount),
  );
  await tx.wait(1); // wait 1 confirmation
  return tx.hash;
}

export async function mintTafkidReward(
  tafkidId: string,
  assigneeWallet: string,
  tmimAmount: number,
): Promise<string | null> {
  if (!assigneeWallet || !assigneeWallet.startsWith('0x')) return null;
  if (tmimAmount <= 0) return null;

  const contract = getMasimaRewardsContract();
  const idHash   = idToBytes32(tafkidId);

  const already = await contract.isTafkidApproved(idHash);
  if (already) return null;

  const tx = await contract.approveTafkid(
    idHash,
    assigneeWallet,
    tmimToWei(tmimAmount),
  );
  await tx.wait(1);
  return tx.hash;
}
