// ═══════════════════════════════════════════════════════════════
// Teams' contracts → their ledgers (docs/TEAM_BACKEND.md §6b)
//
// The app records what members do through it. A member can also call their
// team's contract directly (a block explorer, their own wallet): vote, close
// a vote, approve, leave, send TMIM to the team's address. This poller reads
// every on-chain team's events, and TMIM transfers into teams, from a
// checkpoint, and records each transaction the team's ledger doesn't hold
// yet (src/lib/team/reconcile.ts), under the team's lock so it never races
// the app recording the same action.
//
//   - Checkpoint: system/teamReconciler.lastBlock; first start from
//     TEAM_START_BLOCK (deploy-teams.ts prints it), else a recent lookback.
//   - Waits TEAM_RECONCILE_DELAY_SECONDS (default 120) after a block, so the
//     app records its own actions first, with what it knows about them.
//   - Runs in the SvelteKit server process (hooks.server.ts), like the
//     classic governance listener, so it needs a long-running instance.
// ═══════════════════════════════════════════════════════════════

import { getAddress, zeroPadValue } from 'ethers';
import type { Log, LogDescription } from 'ethers';
import { env } from '$env/dynamic/private';
import { adminDb } from '$lib/server/firebase-admin';
import { getChain } from '$lib/server/team-chain';
import type { Chain } from '$lib/server/team-chain';
import { recordFromChain } from '$lib/server/teams';
import { notifyTeam } from '$lib/server/push';
import { FORWARDER, TEAM, TMIM } from '$lib/team/chain';
import type { ChainEvent, ChainTx } from '$lib/team/reconcile';

const POLL_MS = 30_000;
const BLOCK_CHUNK = 2_000;
const ADDRESS_CHUNK = 100;
const LOOKBACK = 50_000;

const checkpoint = () => adminDb.collection('system').doc('teamReconciler');

const num = (v: unknown) => Number(v as bigint);

/** A Team.sol event as the reconciler reads it. */
export function toChainEvent(d: LogDescription): ChainEvent | undefined {
  const a = d.args;
  switch (d.name) {
    case 'ProposalOpened':
      return { name: d.name, ref: a.ref, kind: num(a.kind), proposer: a.proposer, byVote: a.byVote, closesAt: num(a.closesAt), rule: num(a.rule), to: a.to, objective: a.objective, value: num(a.value), stake: num(a.stake) };
    case 'VoteCast':
      return { name: d.name, ref: a.ref, voter: a.voter, choice: num(a.choice) };
    case 'ProposalDecided':
      return { name: d.name, ref: a.ref, status: num(a.status), forVotes: num(a.forVotes), against: num(a.against), abstain: num(a.abstain), eligible: num(a.eligible) };
    case 'MemberJoined':
      return { name: d.name, member: a.member, roles: num(a.roles) };
    case 'MemberLeft':
      return { name: d.name, member: a.member, roles: num(a.roles) };
    case 'Accepted':
      return { name: d.name, deliverable: a.deliverable, objective: a.objective, owner: a.owner, reward: num(a.reward), reviewer: a.reviewer, reviewReward: num(a.reviewReward), approver: a.approver };
    case 'Released':
      return { name: d.name, deliverable: a.deliverable, contentHash: a.contentHash, by: a.by };
    case 'Paid':
      return { name: d.name, ref: a.ref, objective: a.objective, to: a.to, amount: num(a.amount), by: a.by };
    case 'Anchored':
      return { name: d.name, batch: num(a.batch), root: a.root, entries: num(a.entries), by: a.by };
    case 'RuleChanged': case 'RolesChanged': case 'MoneyMoved': case 'BudgetSet': case 'TeamInitialized': case 'InviteRevoked':
      return { name: d.name };
  }
  return undefined;
}

/** Who sent a transaction: the member behind a forwarded request, else its sender. */
export function senderOf(c: Pick<Chain, 'forwarder'>, tx: { from: string; to: string | null; data: string }): string {
  if (tx.to && getAddress(tx.to) === c.forwarder) {
    try {
      const call = FORWARDER.parseTransaction({ data: tx.data });
      if (call?.name === 'execute') return getAddress(call.args[0].from);
    } catch { /* not a forward request */ }
  }
  return getAddress(tx.from);
}

interface OnChainTeam { id: string; address: string }

async function onChainTeams(c: Chain): Promise<OnChainTeam[]> {
  const snap = await adminDb.collection('teams').where('chain.chainId', '==', c.chainId).get();
  return snap.docs.map(d => ({ id: d.id, address: getAddress((d.get('chain') as { address: string }).address) }));
}

/** The transactions in a block range that touch these teams, grouped by team, in chain order. */
async function readRange(c: Chain, teams: OnChainTeam[], fromBlock: number, toBlock: number): Promise<Map<string, ChainTx[]>> {
  const byAddress = new Map(teams.map(t => [t.address, t.id]));
  const logs: { teamId: string; log: Log; event: ChainEvent }[] = [];
  const transfer = TMIM.getEvent('Transfer')!.topicHash;
  for (let i = 0; i < teams.length; i += ADDRESS_CHUNK) {
    const addresses = teams.slice(i, i + ADDRESS_CHUNK).map(t => t.address);
    const [own, inbound] = await Promise.all([
      c.provider.getLogs({ address: addresses, fromBlock, toBlock }),
      c.provider.getLogs({ address: c.tmim, fromBlock, toBlock, topics: [transfer, null, addresses.map(a => zeroPadValue(a, 32))] }),
    ]);
    for (const log of own) {
      let parsed: LogDescription | null = null;
      try { parsed = TEAM.parseLog({ topics: [...log.topics], data: log.data }); } catch { /* not ours */ }
      const event = parsed && toChainEvent(parsed);
      const teamId = byAddress.get(getAddress(log.address));
      if (event && teamId) logs.push({ teamId, log, event });
    }
    for (const log of inbound) {
      const parsed = TMIM.parseLog({ topics: [...log.topics], data: log.data });
      const teamId = parsed && byAddress.get(getAddress(parsed.args.to));
      if (parsed && teamId) logs.push({ teamId, log, event: { name: 'Transfer', from: getAddress(parsed.args.from), amount: num(parsed.args.value) } });
    }
  }
  logs.sort((x, y) => x.log.blockNumber - y.log.blockNumber || x.log.index - y.log.index);

  const out = new Map<string, ChainTx[]>();
  const blocks = new Map<number, string>();
  const senders = new Map<string, string>();
  for (const { teamId, log, event } of logs) {
    const list = out.get(teamId) ?? [];
    let tx = list.find(x => x.hash === log.transactionHash);
    if (!tx) {
      if (!blocks.has(log.blockNumber)) {
        const b = await c.provider.getBlock(log.blockNumber);
        blocks.set(log.blockNumber, new Date(Number(b!.timestamp) * 1000).toISOString());
      }
      if (!senders.has(log.transactionHash)) {
        const t = await c.provider.getTransaction(log.transactionHash);
        senders.set(log.transactionHash, t ? senderOf(c, t) : '');
      }
      tx = { hash: log.transactionHash, block: log.blockNumber, at: blocks.get(log.blockNumber)!, sender: senders.get(log.transactionHash)!, events: [] };
      list.push(tx);
      out.set(teamId, list);
    }
    tx.events.push(event);
  }
  return out;
}

/** The last block old enough to reconcile: the app gets this long to record its own actions. */
async function settledHead(c: Chain, delaySeconds: number): Promise<number> {
  let head = await c.provider.getBlockNumber();
  if (delaySeconds <= 0) return head;
  const limit = Math.floor(Date.now() / 1000) - delaySeconds;
  // Walk back from the head; blocks come every few seconds, so this is short.
  for (let step = 1; head > 0; step *= 2) {
    const b = await c.provider.getBlock(head);
    if (!b || b.timestamp <= limit) break;
    head = Math.max(0, head - step);
  }
  return head;
}

/** Reconcile every on-chain team from the checkpoint up to the settled head. Returns how many transactions were recorded. */
export async function reconcileTeams(opts: { delaySeconds?: number } = {}): Promise<{ recorded: number; noted: number; toBlock: number }> {
  const c = await getChain();
  if (!c) return { recorded: 0, noted: 0, toBlock: 0 };
  const delay = opts.delaySeconds ?? (Number(env.TEAM_RECONCILE_DELAY_SECONDS ?? '') || 120);
  const head = await settledHead(c, delay);
  const saved = (await checkpoint().get()).get('lastBlock') as number | undefined;
  const start = saved !== undefined ? saved + 1 : Number(env.TEAM_START_BLOCK) || Math.max(0, head - LOOKBACK);
  const teams = await onChainTeams(c);
  let recorded = 0, noted = 0;
  for (let from = start; from <= head; from += BLOCK_CHUNK) {
    const to = Math.min(from + BLOCK_CHUNK - 1, head);
    if (teams.length) {
      for (const [teamId, txs] of await readRange(c, teams, from, to)) {
        const r = await recordFromChain(teamId, txs);
        recorded += r.recorded;
        noted += r.noted;
        if (r.recorded) void notifyTeam(teamId).catch(e => console.error('[push] notifying failed', e));
      }
    }
    await checkpoint().set({ lastBlock: to, updatedAt: new Date().toISOString() }, { merge: true });
  }
  return { recorded, noted, toBlock: head };
}

let started = false;

export function startTeamReconciler(): void {
  if (started) return;
  started = true;
  const poll = async () => {
    try {
      const r = await reconcileTeams();
      if (r.recorded || r.noted) console.log(`[team-reconciler] recorded ${r.recorded}, noted ${r.noted}, up to block ${r.toBlock}`);
    } catch (e) {
      console.error('[team-reconciler] poll failed; retrying from the last checkpoint:', e);
    } finally {
      setTimeout(poll, POLL_MS);
    }
  };
  void getChain().then(c => {
    if (!c) { started = false; return; }
    console.log(`[team-reconciler] following teams on chain ${c.chainId} every ${POLL_MS / 1000}s`);
    void poll();
  });
}
