// ═══════════════════════════════════════════════════════════════
// The chain bridge: live teams' settled actions on their Team contract
// (docs/TEAM_BACKEND.md §6, docs/TEAM_CONTRACTS.md)
//
// A member signs each settled action as an ERC-2771 forward request; the
// platform's relayer submits it (and pays the fee) after simulating it, so
// a refusal comes back with the contract's reason. The relayer is also the
// factory's anchoring service for batches of signed entries.
// ═══════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider, NonceManager, Wallet, getAddress, verifyTypedData } from 'ethers';
import type { TransactionReceipt } from 'ethers';
import { env } from '$env/dynamic/private';
import {
  FACTORY, FORWARDER, FORWARD_TYPES, INVITE_TYPES, TEAM, TMIM,
  chainErrorKey, forwarderDomain, revertName, teamDomain,
} from '$lib/team/chain';
import type { ForwardRequest } from '$lib/team/chain';
import { DomainError } from '$lib/team/types';

export interface Chain {
  chainId: number;
  provider: JsonRpcProvider;
  /** The platform's relayer and anchoring service. It counts its own nonces,
   *  so back-to-back transactions from this process don't collide; run one
   *  server instance per relayer key. */
  relayer: NonceManager;
  factory: string;
  forwarder: string;
  tmim: string;
  explorer: string;
}

let cached: Promise<Chain | null> | null = null;

/** The chain the live app records teams on, or null when not configured
 *  (then teams stay off-chain and their settled entries wait). */
export function getChain(): Promise<Chain | null> {
  if (!cached) cached = load();
  return cached;
}

/** For tests: read the environment again. */
export function resetChain(): void {
  cached = null;
}

async function load(): Promise<Chain | null> {
  const factory = env.TEAM_FACTORY_ADDRESS;
  const forwarder = env.TEAM_FORWARDER_ADDRESS;
  const tmim = env.VITE_TMIM_TOKEN_ADDRESS;
  const key = env.TEAM_RELAYER_PRIVATE_KEY;
  if (!factory || !forwarder || !tmim || !key) return null;
  const provider = new JsonRpcProvider(env.TEAM_CHAIN_RPC_URL || env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org');
  const chainId = Number((await provider.getNetwork()).chainId);
  return {
    chainId, provider, relayer: new NonceManager(new Wallet(key, provider)),
    factory: getAddress(factory), forwarder: getAddress(forwarder), tmim: getAddress(tmim),
    explorer: env.TEAM_EXPLORER_URL || (chainId === 84532 ? 'https://sepolia.basescan.org' : ''),
  };
}

/** What the browser needs to know about the chain. */
export const publicInfo = (c: Chain) =>
  ({ enabled: true, chainId: c.chainId, factory: c.factory, forwarder: c.forwarder, tmim: c.tmim, explorer: c.explorer });

const GAS = 1_500_000n;
const DEADLINE_SECONDS = 15 * 60;

/** A forward request for `from` to sign, and the typed data to sign it with. */
export async function prepareRequest(c: Chain, from: string, call: { to: string; data: string }) {
  const forwarder = new Contract(c.forwarder, FORWARDER, c.provider);
  const nonce: bigint = await forwarder.nonces(from);
  const request: ForwardRequest = {
    from: getAddress(from), to: getAddress(call.to), value: '0', gas: GAS.toString(), nonce: nonce.toString(),
    deadline: String(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS), data: call.data,
  };
  return { request, domain: forwarderDomain(c.chainId, c.forwarder), types: FORWARD_TYPES };
}

export interface Signed {
  request: ForwardRequest;
  signature: string;
}

export interface Proof {
  tx: string;
  block: number;
}

/**
 * Check that a signed request is exactly the call expected, signed by the
 * member; simulate it to surface the contract's reason for a refusal; then
 * submit it and wait for it to be mined.
 */
export async function relay(c: Chain, signed: Signed | undefined, expect: { from: string; to: string; data: string }): Promise<{ proof: Proof; receipt: TransactionReceipt }> {
  if (!signed?.request || typeof signed.signature !== 'string') throw new DomainError('err.chain.unsigned');
  const r = signed.request;
  const same = (a: string, b: string) => { try { return getAddress(a) === getAddress(b); } catch { return false; } };
  if (!same(r.from, expect.from) || !same(r.to, expect.to) || String(r.data).toLowerCase() !== expect.data.toLowerCase() || r.value !== '0') {
    throw new DomainError('err.chain.stale');
  }
  const message = { ...r, value: BigInt(r.value), gas: BigInt(r.gas), nonce: BigInt(r.nonce), deadline: BigInt(r.deadline) };
  let signer: string;
  try {
    signer = verifyTypedData(forwarderDomain(c.chainId, c.forwarder), FORWARD_TYPES, message, signed.signature);
  } catch {
    throw new DomainError('err.chain.signature');
  }
  if (!same(signer, r.from)) throw new DomainError('err.chain.signature');
  await simulate(c, r.to, r.data, r.from);
  const forwarder = new Contract(c.forwarder, FORWARDER, c.relayer);
  try {
    const tx = await forwarder.execute({ from: r.from, to: r.to, value: 0n, gas: BigInt(r.gas), deadline: BigInt(r.deadline), data: r.data, signature: signed.signature });
    const receipt: TransactionReceipt | null = await tx.wait(1);
    if (!receipt || receipt.status !== 1) throw new DomainError('err.chain.refused');
    return { proof: { tx: receipt.hash, block: receipt.blockNumber }, receipt };
  } catch (e) {
    if (e instanceof DomainError) throw e;
    c.relayer.reset(); // the transaction may not have been sent: count from the chain again
    const name = revertName((e as { data?: string }).data);
    console.error('[team-chain] relay failed', name ?? e);
    throw new DomainError(name === 'ERC2771ForwarderInvalidSigner' ? 'err.chain.signature'
      : name === 'ERC2771ForwarderExpiredRequest' ? 'err.chain.stale' : 'err.chain.unavailable');
  }
}

/** Run the call as the forwarder would (the member's address appended),
 *  and turn a revert into the contract's reason. */
async function simulate(c: Chain, to: string, data: string, from: string): Promise<void> {
  try {
    await c.provider.call({ from: c.forwarder, to, data: data + from.slice(2).toLowerCase() });
  } catch (e) {
    const name = revertName((e as { data?: string }).data);
    if (!name) {
      console.error('[team-chain] simulation failed', e);
      throw new DomainError('err.chain.unavailable');
    }
    throw new DomainError(chainErrorKey(name), { reason: name });
  }
}

/** The team a factory created, from the receipt of createTeam. */
export function createdTeam(receipt: TransactionReceipt): string {
  for (const log of receipt.logs) {
    try {
      const ev = FACTORY.parseLog({ topics: [...log.topics], data: log.data });
      if (ev?.name === 'TeamCreated') return getAddress(ev.args.team);
    } catch { /* another contract's event */ }
  }
  throw new DomainError('err.chain.refused');
}

/** Check that `txHash` moved `amount` TMIM from `from` to `to`. */
export async function verifyTransfer(c: Chain, txHash: string, from: string, to: string, amount: number): Promise<Proof> {
  const receipt = await c.provider.getTransactionReceipt(txHash).catch(() => null);
  if (!receipt || receipt.status !== 1) throw new DomainError('err.chain.transfer');
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== c.tmim) continue;
    try {
      const ev = TMIM.parseLog({ topics: [...log.topics], data: log.data });
      if (ev?.name === 'Transfer' && getAddress(ev.args.from) === getAddress(from)
        && getAddress(ev.args.to) === getAddress(to) && ev.args.value === BigInt(amount)) {
        return { tx: receipt.hash, block: receipt.blockNumber };
      }
    } catch { /* not a transfer */ }
  }
  throw new DomainError('err.chain.transfer');
}

/** Whether `signature` is `inviter`'s EIP-712 signature of the invite. */
export function inviteSigner(c: Chain, team: string, invite: { id: string; maxUses: number; expiresAt: number }, signature: string): string | null {
  try {
    return verifyTypedData(teamDomain(c.chainId, team), INVITE_TYPES, invite, signature);
  } catch {
    return null;
  }
}

/** Anchor one batch of signed entries, as the platform's anchoring service. */
export async function anchorBatch(c: Chain, team: string, batch: number, root: string, entries: number): Promise<Proof> {
  const contract = new Contract(team, TEAM, c.relayer);
  let receipt: TransactionReceipt | null;
  try {
    const tx = await contract.anchor(batch, root, entries);
    receipt = await tx.wait(1);
  } catch (e) {
    c.relayer.reset();
    throw e;
  }
  if (!receipt || receipt.status !== 1) throw new DomainError('err.chain.refused');
  return { tx: receipt.hash, block: receipt.blockNumber };
}
