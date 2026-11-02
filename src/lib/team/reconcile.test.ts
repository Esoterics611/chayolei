import { describe, expect, it } from 'vitest';
import * as E from './engine';
import { seedTeams } from './seed';
import { callFor, idHash, TEAM } from './chain';
import { memberBalance } from './ledger';
import { ruleValue } from './rules';
import { reconcileTx } from './reconcile';
import type { ChainEvent, ChainTx } from './reconcile';
import type { Team } from './types';

const NOW = '2026-10-25T12:00:00.000Z';
const later = (h: number) => new Date(new Date(NOW).getTime() + h * 3_600_000).toISOString();
const STRANGER = '0x00000000000000000000000000000000000000ee';

function brachos(): Team {
  const t = seedTeams(NOW).teams.find(x => x.id === 'brachos')!;
  return { ...t, live: true, chain: { address: '0x00000000000000000000000000000000000000c0', chainId: 31337 } };
}
const wallet = (t: Team, id: string) => t.members.find(m => m.id === id)!.wallet;
let n = 0;
const tx = (sender: string, events: ChainEvent[], at = later(1)): ChainTx =>
  ({ hash: '0x' + (++n).toString(16).padStart(64, '0'), block: 100 + n, at, sender, events });
const byTitle = (team: Team, en: string) => team.deliverables.find(d => typeof d.title !== 'string' && d.title.en.startsWith(en))!;

describe('reconciling a team with its contract', () => {
  it('skips what the app recorded, by its transaction', () => {
    const t = brachos();
    t.ledger[0].proof = { tx: '0xabc', block: 1 };
    const before = t.ledger.length;
    expect(reconcileTx(t, { hash: '0xABC', block: 1, at: NOW, sender: wallet(t, 'mendel'), events: [{ name: 'TeamInitialized' }] })).toBe('known');
    expect(t.ledger.length).toBe(before);
  });

  it('records TMIM sent straight to the team’s address, by a member or anyone', () => {
    const t = brachos();
    const account = t.treasury.teamAccount;
    const levi = memberBalance(t, 'levi');
    const a = tx(wallet(t, 'levi'), [{ name: 'Transfer', from: wallet(t, 'levi'), amount: 250 }]);
    expect(reconcileTx(t, a)).toBe('recorded');
    expect(t.treasury.teamAccount).toBe(account + 250);
    expect(memberBalance(t, 'levi')).toBe(levi - 250);
    expect(t.ledger.at(-1)).toMatchObject({ kind: 'money_moved', actorId: 'levi', proof: { tx: a.hash, block: a.block }, data: { accountIn: 250, via: 'chain' } });
    expect(reconcileTx(t, a)).toBe('known');
    expect(t.treasury.teamAccount).toBe(account + 250);

    expect(reconcileTx(t, tx(STRANGER, [{ name: 'Transfer', from: STRANGER, amount: 40 }]))).toBe('recorded');
    expect(t.treasury.teamAccount).toBe(account + 290);
    expect(t.ledger.at(-1)).toMatchObject({ kind: 'money_moved', data: { accountIn: 40, from: STRANGER } });
    expect(t.ledger.at(-1)!.amounts).toBeUndefined();
  });

  it('counts votes cast on the contract, and applies the decision the contract took', () => {
    const t = brachos();
    const rv = t.changes.find(c => c.kind === 'rule' && c.status === 'open')!;
    expect(reconcileTx(t, tx(wallet(t, 'shmuel'), [{ name: 'VoteCast', ref: idHash(rv.id), voter: wallet(t, 'shmuel'), choice: 1 }]))).toBe('recorded');
    expect(rv.kind === 'rule' && rv.votes.find(v => v.memberId === 'shmuel')?.choice).toBe('for');
    // The last vote decides: the contract passed it in the same transaction.
    reconcileTx(t, tx(wallet(t, 'mendel'), [
      { name: 'VoteCast', ref: idHash(rv.id), voter: wallet(t, 'mendel'), choice: 1 },
      { name: 'ProposalDecided', ref: idHash(rv.id), status: 2, forVotes: 4, against: 1, abstain: 0, eligible: 5 },
      { name: 'RuleChanged' },
    ]));
    expect(rv.status).toBe('passed');
    expect(ruleValue(t, 'review_reward')).toBe(150);
    expect(t.ledger.filter(e => e.kind === 'change_passed' && e.refs.changeId === rv.id)).toHaveLength(1);
  });

  it('records approvals, declines and closes made on the contract', () => {
    const t = brachos();
    t.treasury.teamAccount = 5000;
    const req = t.changes.find(c => c.kind === 'money' && c.status === 'open')!;
    reconcileTx(t, tx(wallet(t, 'mendel'), [
      { name: 'ProposalDecided', ref: idHash(req.id), status: 4, forVotes: 0, against: 0, abstain: 0, eligible: 0 },
      { name: 'MoneyMoved' },
    ]));
    expect(req).toMatchObject({ status: 'accepted', approvedBy: 'mendel' });
    expect(t.treasury.teamAccount).toBe(4400);

    const rr = t.changes.find(c => c.kind === 'role' && c.status === 'open')!;
    reconcileTx(t, tx(STRANGER, [{ name: 'ProposalDecided', ref: idHash(rr.id), status: 3, forVotes: 1, against: 0, abstain: 0, eligible: 5 }]));
    expect(rr.status).toBe('failed');
    expect(t.ledger.at(-1)).toMatchObject({ kind: 'change_failed', data: { forPct: 100, turnout: 20, via: 'chain' } });
  });

  it('adds a proposal opened on the contract, keeping its ref for later votes', () => {
    const t = brachos();
    const ref = '0x' + 'ab'.repeat(32);
    reconcileTx(t, tx(wallet(t, 'levi'), [{
      name: 'ProposalOpened', ref, kind: 0, proposer: wallet(t, 'levi'), byVote: true,
      closesAt: Math.floor(new Date(later(72)).getTime() / 1000), rule: 3, to: '0x0000000000000000000000000000000000000000',
      objective: '0x' + '00'.repeat(32), value: 2500, stake: 0,
    }]));
    const c = t.changes.find(x => x.kind !== 'work' && x.chainRef === ref)!;
    expect(c).toMatchObject({ kind: 'rule', ruleKey: 'spend_limit', from: 2000, to: 2500, proposerId: 'levi', status: 'open' });
    // Voting on it through the app goes to the same proposal on the contract.
    const call = callFor(t, { type: 'vote', changeId: c.id, choice: 'for' });
    expect(TEAM.decodeFunctionData('vote', call.data)[0]).toBe(ref);
    reconcileTx(t, tx(wallet(t, 'rivka'), [{ name: 'VoteCast', ref, voter: wallet(t, 'rivka'), choice: 2 }]));
    expect(c.kind === 'rule' && c.votes).toMatchObject([{ memberId: 'rivka', choice: 'against' }]);
  });

  it('records members who leave or join on the contract', () => {
    const t = brachos();
    reconcileTx(t, tx(wallet(t, 'levi'), [{ name: 'MemberLeft', member: wallet(t, 'levi'), roles: 4 }]));
    expect(t.members.find(m => m.id === 'levi')!.leftAt).toBeDefined();
    reconcileTx(t, tx(STRANGER, [{ name: 'MemberJoined', member: STRANGER, roles: 4 }]));
    const joined = t.members.find(m => m.wallet === STRANGER)!;
    expect(joined).toMatchObject({ id: `wallet_${STRANGER}`, roleIds: ['contributor'], name: '0x0000…00ee' });
    // Levi rejoining on the contract is the same member again.
    reconcileTx(t, tx(wallet(t, 'levi'), [{ name: 'MemberJoined', member: wallet(t, 'levi'), roles: 4 }]));
    expect(t.members.filter(m => m.id === 'levi')).toHaveLength(1);
    expect(t.members.find(m => m.id === 'levi')!.leftAt).toBeUndefined();
  });

  it('records work accepted on the contract: through the engine when it agrees, else as paid', () => {
    const t = brachos();
    const ch3 = byTitle(t, 'Chapter 3'); // reviewed: the engine agrees
    const ch4 = byTitle(t, 'Chapter 4'); // still waiting on its reviewer
    const ev = (d: typeof ch3, reward: number, reviewer = '0x0000000000000000000000000000000000000000') => ({
      name: 'Accepted' as const, deliverable: idHash(d.id), objective: idHash(d.objectiveId), owner: wallet(t, d.ownerId!),
      reward, reviewer, reviewReward: reviewer.endsWith('0000') ? 0 : 100, approver: wallet(t, 'mendel'),
    });
    const shmuel = memberBalance(t, 'shmuel');
    reconcileTx(t, tx(wallet(t, 'mendel'), [ev(ch3, 1800, wallet(t, 'yosef'))]));
    expect(ch3.stage).toBe('accepted');
    expect(memberBalance(t, 'shmuel')).toBe(shmuel + 1800);
    const rivka = memberBalance(t, 'rivka');
    expect(reconcileTx(t, tx(wallet(t, 'mendel'), [ev(ch4, 1500)]))).toBe('recorded');
    expect(ch4.stage).toBe('accepted');
    expect(memberBalance(t, 'rivka')).toBe(rivka + 1500);
    expect(E.activeWorkChange(t, ch4.id)).toBeUndefined();
  });

  it('notes what it can’t match, for people to look at', () => {
    const t = brachos();
    const ghost = '0x' + '12'.repeat(32);
    expect(reconcileTx(t, tx(wallet(t, 'levi'), [{ name: 'VoteCast', ref: ghost, voter: wallet(t, 'levi'), choice: 1 }]))).toBe('noted');
    expect(t.ledger.at(-1)).toMatchObject({ kind: 'chain_noted', tier: 'settled', actorId: 'levi', data: { event: 'VoteCast', via: 'chain' } });
  });
});
