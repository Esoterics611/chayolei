// The chain bridge against a local chain (scripts/e2e/run-chain.sh starts a
// Hardhat node, deploys the contracts and sets the environment) and the
// Firestore emulator. Skipped when no chain is configured.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Contract, JsonRpcProvider, NonceManager, Wallet } from 'ethers';
import {
  acceptInvite, createInvite, createTeamFor, loadTeam, prepareCommand, prepareInvite, prepareJoin, prepareTeam, runTeamCommand,
} from './teams';
import { resetChain } from './team-chain';
import { reconcileTeams } from './team-reconciler';
import type { Signed } from './team-chain';
import { TEAM, TMIM, idHash } from '$lib/team/chain';
import type { Command } from '$lib/team/commands';
import { memberBalance } from '$lib/team/ledger';
import { DomainError } from '$lib/team/types';
import type { Team } from '$lib/team/types';

const RPC = process.env.TEAM_CHAIN_RPC_URL;
const enabled = !!(RPC && process.env.TEAM_FACTORY_ADDRESS && process.env.FIRESTORE_EMULATOR_HOST);

// Hardhat's well-known development accounts #2 and #3.
const founder = new Wallet('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a');
const levi = new Wallet('0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6');
// Account #0 deploys TMIM locally and may mint it.
const deployer = new Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const uid = (w: Wallet) => `wallet_${w.address.toLowerCase()}`;

type Prep = { onChain: boolean; domain?: Record<string, unknown>; types?: Record<string, { name: string; type: string }[]>; request?: Signed['request'] };

async function sign(w: Wallet, p: Prep): Promise<Signed | undefined> {
  if (!p.onChain) return undefined;
  const d = p.domain as { chainId: number };
  return { request: p.request!, signature: await w.signTypedData({ ...d }, p.types!, { ...p.request! }) };
}

/** Prepare, sign and run one command as `w`. */
async function act(teamId: string, w: Wallet, cmd: Command) {
  const p = await prepareCommand(teamId, uid(w), cmd);
  const command = p.onChain ? p.command : cmd;
  return runTeamCommand(teamId, uid(w), command, await sign(w, p as Prep));
}

const errKey = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { if (e instanceof DomainError) return e.key; throw e; }
  return undefined;
};

describe.skipIf(!enabled)('chain bridge (local chain)', () => {
  let provider: JsonRpcProvider;
  let tmim: Contract;

  beforeAll(() => {
    resetChain();
    provider = new JsonRpcProvider(RPC);
    tmim = new Contract(process.env.VITE_TMIM_TOKEN_ADDRESS!, TMIM, provider);
  });

  beforeEach(async () => {
    const host = process.env.FIRESTORE_EMULATOR_HOST;
    await fetch(`http://${host}/emulator/v1/projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  });

  /** A team on-chain with Levi joined through a signed invite. */
  async function onChainTeam(): Promise<Team> {
    const input = { name: 'Brachos', purpose: 'Translate Brachos', templateId: 'editorial', you: { name: 'Mendel Katz' } };
    const team = await createTeamFor(uid(founder), input, await sign(founder, await prepareTeam(uid(founder), input) as Prep));
    const inv = await prepareInvite(team.id, uid(founder));
    if (!inv.onChain) throw new Error('expected an on-chain invite');
    const signature = await founder.signTypedData({ ...inv.domain }, inv.types, inv.invite);
    const { token } = await createInvite(team.id, uid(founder), { token: inv.token, invite: inv.invite, signature });
    return acceptInvite(token, uid(levi), { name: 'Levi Stern' }, await sign(levi, await prepareJoin(token, uid(levi)) as Prep));
  }

  it('creates the team on-chain and admits a member through the signed invite', async () => {
    const team = await onChainTeam();
    expect(team.chain?.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    const contract = new Contract(team.chain!.address, TEAM, provider);
    expect(await contract.rolesOf(founder.address)).toBe(1n);
    expect(await contract.rolesOf(levi.address)).toBe(4n); // contributor: the third role
    // The team_created and member_joined entries carry their transactions.
    const [created, joined] = team.ledger;
    expect(created).toMatchObject({ kind: 'team_created' });
    expect(created.proof.tx).toMatch(/^0x[0-9a-f]{64}$/);
    expect(joined).toMatchObject({ kind: 'member_joined' });
    expect(joined.proof.tx).toMatch(/^0x[0-9a-f]{64}$/);
  }, 60_000);

  it('passes a budget by vote, accepts work and pays in TMIM on-chain', async () => {
    const team = await onChainTeam();
    const id = team.id;
    const { result: { id: objectiveId } } = await runTeamCommand(id, uid(founder), { type: 'addObjective', title: 'Volume 1', description: '' });
    const { result: { id: budgetId } } = await act(id, founder, { type: 'requestMoney', action: { type: 'budget', objectiveId: objectiveId!, to: 5000 }, title: 'Budget', why: 'Ten chapters' });
    await act(id, founder, { type: 'vote', changeId: budgetId!, choice: 'for' });
    const voted = await act(id, levi, { type: 'vote', changeId: budgetId!, choice: 'for' });
    expect(voted.team.changes.find(c => c.id === budgetId)?.status).toBe('passed');
    const contract = new Contract(team.chain!.address, TEAM, provider);
    expect(await contract.budgetOf(idHash(objectiveId!))).toBe(5000n);

    const { result: { id: d } } = await runTeamCommand(id, uid(founder), { type: 'addDeliverable', objectiveId: objectiveId!, title: 'Chapter 1', scope: '' });
    await runTeamCommand(id, uid(levi), { type: 'take', deliverableId: d! });
    await runTeamCommand(id, uid(levi), { type: 'saveVersion', deliverableId: d!, paragraphs: ['First.'], note: 'v1' });
    const { result: { id: changeId } } = await runTeamCommand(id, uid(levi), { type: 'requestReview', deliverableId: d! });
    await runTeamCommand(id, uid(founder), { type: 'markReviewed', changeId: changeId! });
    const before = { levi: await tmim.balanceOf(levi.address), founder: await tmim.balanceOf(founder.address) };
    const { team: paid } = await act(id, founder, { type: 'acceptAndPay', changeId: changeId! });

    expect(await tmim.balanceOf(levi.address) - before.levi).toBe(1200n);
    expect(await tmim.balanceOf(founder.address) - before.founder).toBe(100n); // the review reward
    expect(memberBalance(paid, uid(levi))).toBe(1200);
    const entry = paid.ledger.findLast(e => e.kind === 'accepted_paid')!;
    const receipt = await provider.getTransactionReceipt(entry.proof.tx!);
    expect(receipt?.blockNumber).toBe(entry.proof.block);
  }, 120_000);

  it('records a contribution only for a real transfer, once', async () => {
    const team = await onChainTeam();
    // Levi needs TMIM of his own first: a scheduled-pay-free way is a payout.
    const { result: { id: o } } = await runTeamCommand(team.id, uid(founder), { type: 'addObjective', title: 'Vol', description: '' });
    // Over the spend limit (2,000), so both members vote on it.
    const { result: { id: b } } = await act(team.id, founder, { type: 'requestMoney', action: { type: 'budget', objectiveId: o!, to: 2500 }, title: 'B', why: 'W' });
    await act(team.id, founder, { type: 'vote', changeId: b!, choice: 'for' });
    await act(team.id, levi, { type: 'vote', changeId: b!, choice: 'for' });
    const { result: { id: d } } = await runTeamCommand(team.id, uid(founder), { type: 'addDeliverable', objectiveId: o!, title: 'Ch', scope: '', reward: 500 });
    await runTeamCommand(team.id, uid(levi), { type: 'take', deliverableId: d! });
    await runTeamCommand(team.id, uid(levi), { type: 'saveVersion', deliverableId: d!, paragraphs: ['x'], note: 'v1' });
    const { result: { id: c } } = await runTeamCommand(team.id, uid(levi), { type: 'requestReview', deliverableId: d! });
    await runTeamCommand(team.id, uid(founder), { type: 'markReviewed', changeId: c! });
    await act(team.id, founder, { type: 'acceptAndPay', changeId: c! });

    // Levi moves 200 TMIM to the team's contract from his own wallet.
    const signer = levi.connect(provider);
    const tx = await signer.sendTransaction({ to: await tmim.getAddress(), data: TMIM.encodeFunctionData('transfer', [team.chain!.address, 200n]) });
    await tx.wait(1);
    expect(await errKey(runTeamCommand(team.id, uid(levi), { type: 'contribute', amount: 300, txHash: tx.hash }))).toBe('err.chain.transfer');
    expect(await errKey(runTeamCommand(team.id, uid(founder), { type: 'contribute', amount: 200, txHash: tx.hash }))).toBe('err.insufficient');
    const { team: after } = await runTeamCommand(team.id, uid(levi), { type: 'contribute', amount: 200, txHash: tx.hash });
    expect(after.treasury.teamAccount).toBe(200);
    expect(await tmim.balanceOf(team.chain!.address)).toBe(200n);
    expect(await errKey(runTeamCommand(team.id, uid(levi), { type: 'contribute', amount: 200, txHash: tx.hash }))).toBe('err.chain.transfer');
  }, 120_000);

  it('refuses a signed request for a different action, or none at all', async () => {
    const team = await onChainTeam();
    const { result: { id: o } } = await runTeamCommand(team.id, uid(founder), { type: 'addObjective', title: 'Vol', description: '' });
    const ask = { type: 'requestMoney' as const, action: { type: 'budget' as const, objectiveId: o!, to: 100 }, title: 'B', why: 'W' };
    const p = await prepareCommand(team.id, uid(founder), ask);
    const signed = await sign(founder, p as Prep);
    if (!p.onChain) throw new Error('expected on-chain');
    // Same signature, a bigger budget: the request no longer matches.
    expect(await errKey(runTeamCommand(team.id, uid(founder), { ...p.command, action: { type: 'budget', objectiveId: o!, to: 900 } } as Command, signed))).toBe('err.chain.stale');
    expect(await errKey(runTeamCommand(team.id, uid(founder), p.command))).toBe('err.chain.unsigned');
    // Levi's signature on the lead's request doesn't pass either.
    const forged = await sign(levi, p as Prep);
    expect(await errKey(runTeamCommand(team.id, uid(founder), p.command, forged))).toBe('err.chain.signature');
  }, 120_000);

  it('changes roles by vote on-chain, and lets a member leave there too', async () => {
    const team = await onChainTeam();
    const contract = new Contract(team.chain!.address, TEAM, provider);
    // Levi becomes a reviewer as well: both members vote.
    const { result: { id: roles } } = await act(team.id, founder, { type: 'proposeRoles', memberId: uid(levi), to: ['reviewer', 'contributor'], title: 'Levi reviews', why: 'Speed' });
    await act(team.id, founder, { type: 'vote', changeId: roles!, choice: 'for' });
    const { team: passed } = await act(team.id, levi, { type: 'vote', changeId: roles!, choice: 'for' });
    expect(passed.members.find(m => m.id === uid(levi))?.roleIds).toEqual(['reviewer', 'contributor']);
    expect(await contract.rolesOf(levi.address)).toBe(0b110n);
    const changed = passed.ledger.findLast(e => e.kind === 'roles_changed')!;
    expect(changed.proof.tx).toMatch(/^0x[0-9a-f]{64}$/);

    // Levi leaves: his roles go on-chain too, and he no longer counts as a voter.
    const { team: after } = await act(team.id, levi, { type: 'leave' });
    expect(after.members.find(m => m.id === uid(levi))?.leftAt).toBeDefined();
    expect(await contract.rolesOf(levi.address)).toBe(0n);
    expect(await contract.voterCount()).toBe(1n);
    expect(after.ledger.at(-1)).toMatchObject({ kind: 'member_left' });
    expect(after.ledger.findLast(e => e.kind === 'member_left')!.proof.tx).toMatch(/^0x[0-9a-f]{64}$/);
    // The founder is now the only one who can vote: the contract and the server both refuse.
    expect(await errKey(prepareCommand(team.id, uid(founder), { type: 'leave' }))).toBe('err.last_voter');
  }, 120_000);

  it('records what members do on the contract directly, once', async () => {
    const team = await onChainTeam();
    const id = team.id;
    const { result: { id: objectiveId } } = await runTeamCommand(id, uid(founder), { type: 'addObjective', title: 'Vol', description: '' });
    const { result: { id: budgetId } } = await act(id, founder, { type: 'requestMoney', action: { type: 'budget', objectiveId: objectiveId!, to: 3000 }, title: 'B', why: 'W' });
    await act(id, founder, { type: 'vote', changeId: budgetId!, choice: 'for' });
    // Levi votes from his own wallet, straight on the contract: the last vote passes it.
    // One signer that counts its own nonces (the provider briefly caches identical calls).
    const leviSigner = new NonceManager(levi.connect(provider));
    const onContract = new Contract(team.chain!.address, TEAM, leviSigner);
    await (await onContract.vote(idHash(budgetId!), 1)).wait(1);
    // He also sends TMIM to the team's address himself.
    const minter = new Contract(await tmim.getAddress(), ['function mint(address to, uint256 amount, string reason)'], deployer.connect(provider));
    await (await minter.mint(levi.address, 500n, 'test')).wait(1);
    const send = await leviSigner.sendTransaction({ to: await tmim.getAddress(), data: TMIM.encodeFunctionData('transfer', [team.chain!.address, 120n]) });
    await send.wait(1);

    const first = await reconcileTeams({ delaySeconds: 0 });
    expect(first.recorded).toBe(2);
    expect(first.noted).toBe(0);
    const after = await loadTeam(id);
    const budget = after.changes.find(c => c.id === budgetId)!;
    expect(budget.status).toBe('passed');
    expect(after.objectives[0].budget).toBe(3000);
    const vote = after.ledger.findLast(e => e.kind === 'vote_cast')!;
    expect(vote).toMatchObject({ actorId: uid(levi), data: { via: 'chain' } });
    expect(vote.proof.tx).toMatch(/^0x[0-9a-f]{64}$/);
    expect(after.treasury.teamAccount).toBe(120);
    expect(after.ledger.findLast(e => e.kind === 'money_moved')).toMatchObject({ actorId: uid(levi), proof: { tx: send.hash } });
    // Again: nothing new. And the app recording the same transfer later counts it once.
    expect((await reconcileTeams({ delaySeconds: 0 })).recorded).toBe(0);
    const { team: same } = await runTeamCommand(id, uid(levi), { type: 'contribute', amount: 120, txHash: send.hash });
    expect(same.treasury.teamAccount).toBe(120);
  }, 120_000);

  it('anchors each full batch of signed entries on-chain', async () => {
    const team = await onChainTeam();
    const { result: { id: o } } = await runTeamCommand(team.id, uid(founder), { type: 'addObjective', title: 'Vol', description: '' });
    const { result: { id: d } } = await runTeamCommand(team.id, uid(founder), { type: 'addDeliverable', objectiveId: o!, title: 'Ch', scope: '' });
    let last: Team | undefined;
    for (let i = 0; i < 7; i++) {
      last = (await runTeamCommand(team.id, uid(levi), { type: 'postMessage', ref: { type: 'deliverable', id: d! }, body: `note ${i}` })).team;
    }
    const contract = new Contract(team.chain!.address, TEAM, provider);
    expect(await contract.anchoredBatches()).toBe(1n);
    const anchor = (await runTeamCommand(team.id, uid(levi), { type: 'postMessage', ref: { type: 'deliverable', id: d! }, body: 'one more' })).team
      .ledger.find(e => e.kind === 'anchor')!;
    expect(last).toBeDefined();
    expect(anchor.proof.tx).toMatch(/^0x[0-9a-f]{64}$/);
    expect(anchor.data?.root).toMatch(/^0x[0-9a-f]{64}$/);
  }, 120_000);
});
