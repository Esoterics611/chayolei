import { describe, expect, it } from 'vitest';
import * as E from './engine';
import { seedTeams } from './seed';
import { memberBalance, objectiveFigures, statements, issuedInMonth, ANCHOR_BATCH, anchoredBatches, isConfirmed } from './ledger';
import { ruleValue, ruleCurrent } from './rules';
import type { Team, WorkChange } from './types';
import { DomainError } from './types';

const NOW = '2026-10-25T12:00:00.000Z';
const later = (h: number) => new Date(new Date(NOW).getTime() + h * 3_600_000).toISOString();

function brachos(): Team {
  return seedTeams(NOW).teams.find(t => t.id === 'brachos')!;
}
const byTitle = (team: Team, en: string) => team.deliverables.find(d => typeof d.title !== 'string' && d.title.en.startsWith(en))!;
const errKey = (fn: () => unknown) => {
  try { fn(); } catch (e) { if (e instanceof DomainError) return e.key; throw e; }
  return undefined;
};

describe('seed', () => {
  it('builds both teams with a ledger in time order', () => {
    const { teams } = seedTeams(NOW);
    expect(teams.map(t => t.id)).toEqual(['brachos', 'radio']);
    for (const t of teams) {
      for (let i = 1; i < t.ledger.length; i++) {
        expect(t.ledger[i].seq).toBe(t.ledger[i - 1].seq + 1);
        expect(t.ledger[i].at >= t.ledger[i - 1].at).toBe(true);
      }
    }
  });

  it('treats only the latest review round as active', () => {
    const t = brachos();
    // Chapter 1 had changes requested in round 1, then was accepted in round 2.
    expect(E.activeWorkChange(t, byTitle(t, 'Chapter 1').id)).toBeUndefined();
    expect(E.activeWorkChange(t, byTitle(t, 'Chapter 3').id)?.status).toBe('reviewed');
  });

  it('gives each persona something to do', () => {
    const t = brachos();
    const kinds = (m: string) => E.needsYou(t, m, NOW).map(n => n.kind).sort();
    expect(kinds('mendel')).toEqual(['accept', 'approve_money', 'pay_schedule', 'vote']);
    expect(kinds('yosef')).toEqual(['review']);
    expect(kinds('levi')).toEqual(['stalled']);
    expect(kinds('shmuel')).toEqual(['vote']);
  });
});

describe('work', () => {
  it('accepting pays the owner and the reviewer from the budget', () => {
    const t = brachos();
    const ch3 = byTitle(t, 'Chapter 3');
    const c = E.activeWorkChange(t, ch3.id)!;
    const before = { shmuel: memberBalance(t, 'shmuel'), yosef: memberBalance(t, 'yosef'), paid: objectiveFigures(t, E.objective(t, ch3.objectiveId)).paid };
    E.acceptAndPay(t, 'mendel', c.id, NOW);
    expect(ch3.stage).toBe('accepted');
    expect(ch3.acceptedVersionId).toBe(c.toVersionId);
    expect(memberBalance(t, 'shmuel') - before.shmuel).toBe(1800);
    expect(memberBalance(t, 'yosef') - before.yosef).toBe(100);
    expect(objectiveFigures(t, E.objective(t, ch3.objectiveId)).paid - before.paid).toBe(1900);
    const entry = t.ledger.filter(e => e.kind === 'accepted_paid').at(-1)!;
    expect(entry.tier).toBe('settled');
    expect(entry.proof.tx).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('refuses acceptance before review, by the wrong person, or by the owner', () => {
    const t = brachos();
    const ch4 = byTitle(t, 'Chapter 4');
    const open = E.activeWorkChange(t, ch4.id)!;
    expect(errKey(() => E.acceptAndPay(t, 'mendel', open.id, NOW))).toBe('err.review_first');
    const ch3c = E.activeWorkChange(t, byTitle(t, 'Chapter 3').id)!;
    expect(errKey(() => E.acceptAndPay(t, 'levi', ch3c.id, NOW))).toBe('err.permission.accept_work');
  });

  it('refuses acceptance over the budget or the monthly cap', () => {
    const t = brachos();
    const ch3 = byTitle(t, 'Chapter 3');
    const c = E.activeWorkChange(t, ch3.id)!;
    const o = E.objective(t, ch3.objectiveId);
    const saved = o.budget;
    o.budget = objectiveFigures(t, o).paid + 100;
    expect(errKey(() => E.acceptAndPay(t, 'mendel', c.id, NOW))).toBe('err.budget_exceeded');
    o.budget = saved;
    const cap = t.charter.rules.find(r => r.key === 'monthly_issuance_cap')!;
    cap.history.push({ value: issuedInMonth(t, NOW) + 10, version: 2, at: NOW, setBy: { kind: 'founding' } });
    expect(errKey(() => E.acceptAndPay(t, 'mendel', c.id, NOW))).toBe('err.cap_exceeded');
  });

  it('runs the whole cycle: take, version, review, changes, accept, release', () => {
    const t = brachos();
    const ch5 = byTitle(t, 'Chapter 5');
    E.take(t, 'shmuel', ch5.id, NOW);
    expect(ch5.stage).toBe('assigned');
    expect(errKey(() => E.requestReview(t, 'shmuel', ch5.id, NOW))).toBe('err.stage');
    E.saveDraft(t, 'shmuel', ch5.id, ['One does not stand to pray except in a serious frame of mind.'], later(1));
    expect(E.draftOf(ch5)).toBeTruthy();
    E.saveVersion(t, 'shmuel', ch5.id, ['One does not stand to pray except in a serious frame of mind.'], 'first', later(2));
    expect(E.draftOf(ch5)).toBeUndefined();
    const c1 = E.requestReview(t, 'shmuel', ch5.id, later(3));
    expect(ch5.stage).toBe('in_review');
    E.comment(t, 'yosef', c1.id, 'Add the next clause.', 0, later(4));
    E.requestChanges(t, 'yosef', c1.id, '', later(5));
    expect(ch5.stage).toBe('changes_requested');
    E.saveVersion(t, 'shmuel', ch5.id, [
      'One does not stand to pray except in a serious frame of mind.',
      'The pious ones of old would wait an hour, and then pray.',
    ], 'second', later(6));
    const c2 = E.requestReview(t, 'shmuel', ch5.id, later(7));
    expect(c2.fromVersionId).toBe(c1.toVersionId);
    expect((t.changes.find(x => x.id === c1.id) as WorkChange).status).toBe('changes_requested');
    E.markReviewed(t, 'yosef', c2.id, later(8));
    E.acceptAndPay(t, 'mendel', c2.id, later(9));
    E.release(t, 'mendel', ch5.id, later(10));
    expect(ch5.stage).toBe('released');
    expect(E.credits(t, ch5.id).map(c => `${c.memberId}:${c.role}`)).toEqual(['shmuel:owner', 'yosef:reviewer', 'mendel:approver']);
  });

  it('keeps drafts off the ledger and refuses an unchanged version', () => {
    const t = brachos();
    const ch2 = byTitle(t, 'Chapter 2');
    const n = t.ledger.length;
    E.saveDraft(t, 'levi', ch2.id, ['A private draft.'], NOW);
    expect(t.ledger.length).toBe(n);
    const latest = E.latestVersion(ch2)!;
    expect(errKey(() => E.saveVersion(t, 'levi', ch2.id, latest.paragraphs, 'same', NOW))).toBe('err.no_changes');
    expect(errKey(() => E.saveDraft(t, 'shmuel', ch2.id, ['not mine'], NOW))).toBe('err.not_owner');
  });
});

describe('rules', () => {
  it('a passing vote creates a new version of the rule', () => {
    const t = brachos();
    const rv = t.changes.find(c => c.kind === 'rule' && c.status === 'open')!;
    expect(ruleValue(t, 'review_reward')).toBe(100);
    E.vote(t, 'mendel', rv.id, 'for', NOW);
    E.vote(t, 'shmuel', rv.id, 'for', NOW);
    expect(rv.status).toBe('passed');
    expect(ruleValue(t, 'review_reward')).toBe(150);
    expect(ruleCurrent(t, 'review_reward')).toMatchObject({ version: 2, setBy: { kind: 'proposal', changeId: rv.id } });
  });

  it('fails without quorum, and only the proposer may close early', () => {
    const t = brachos();
    const c = E.proposeRule(t, 'levi', { ruleKey: 'vote_hours', to: 48, title: 'Shorter votes', why: 'Faster decisions' }, NOW);
    E.vote(t, 'levi', c.id, 'for', NOW);
    expect(errKey(() => E.closeVoting(t, 'shmuel', c.id, NOW))).toBe('err.not_proposer');
    E.closeVoting(t, 'levi', c.id, later(1));
    expect(c.status).toBe('failed');
    expect(ruleValue(t, 'vote_hours')).toBe(72);
  });

  it('refuses a second open change to the same rule, and no-op changes', () => {
    const t = brachos();
    expect(errKey(() => E.proposeRule(t, 'levi', { ruleKey: 'review_reward', to: 200, title: 'x', why: 'y' }, NOW))).toBe('err.rule_open');
    expect(errKey(() => E.proposeRule(t, 'levi', { ruleKey: 'quorum_pct', to: 40, title: 'x', why: 'y' }, NOW))).toBe('err.rule_unchanged');
  });

  it('refuses values the team contract would refuse', () => {
    const t = brachos();
    const propose = (ruleKey: 'quorum_pct' | 'majority_pct' | 'vote_hours' | 'spend_limit', to: number) =>
      errKey(() => E.proposeRule(t, 'levi', { ruleKey, to, title: 'x', why: 'y' }, NOW));
    // A 100% majority could never be exceeded: no rule could change again.
    expect(propose('majority_pct', 100)).toBe('err.rule_range');
    expect(propose('majority_pct', 40)).toBe('err.rule_range');
    expect(propose('quorum_pct', 101)).toBe('err.rule_range');
    expect(propose('vote_hours', 0)).toBe('err.rule_range');
    expect(propose('vote_hours', 721)).toBe('err.rule_range');
    expect(propose('spend_limit', 2.5)).toBe('err.invalid_value');
    expect(propose('spend_limit', -1)).toBe('err.invalid_value');
    expect(propose('majority_pct', 66)).toBeUndefined();
  });
});

describe('money', () => {
  it('a request within the spend limit is approved by a role and moves TMIM', () => {
    const t = brachos();
    const req = t.changes.find(c => c.kind === 'money' && c.status === 'open')!;
    const account = t.treasury.teamAccount;
    const levi = memberBalance(t, 'levi');
    expect(errKey(() => E.approveMoney(t, 'levi', req.id, NOW))).toBe('err.permission.spend');
    E.approveMoney(t, 'mendel', req.id, NOW);
    expect(t.treasury.teamAccount).toBe(account - 600);
    expect(memberBalance(t, 'levi')).toBe(levi + 600);
  });

  it('over the limit goes to a vote; requesters cannot approve their own', () => {
    const t = brachos();
    const big = E.requestMoney(t, 'mendel', { action: { type: 'transfer', to: 'rivka', amount: 2500 }, title: 'x', why: 'y' }, NOW);
    expect(big.decidedBy).toBe('vote');
    const small = E.requestMoney(t, 'mendel', { action: { type: 'transfer', to: 'rivka', amount: 50 }, title: 'x', why: 'y' }, NOW);
    expect(small.decidedBy).toBe('role');
    expect(errKey(() => E.approveMoney(t, 'mendel', small.id, NOW))).toBe('err.self_approve');
  });

  it('cannot pay out more than the team account holds', () => {
    const t = brachos();
    t.treasury.teamAccount = 100;
    const req = t.changes.find(c => c.kind === 'money' && c.status === 'open')!;
    expect(errKey(() => E.approveMoney(t, 'mendel', req.id, NOW))).toBe('err.insufficient');
  });

  it('never sets a budget below what has been paid from it', () => {
    const t = brachos();
    // The Rashi companion pays Rivka's weekly schedule (150 TMIM, due now).
    const s = t.treasury.schedules.find(x => x.id === 'sched-rivka')!;
    const o = E.objective(t, s.objectiveId);
    const paid = objectiveFigures(t, o).paid;
    expect(errKey(() => E.requestMoney(t, 'mendel', { action: { type: 'budget', objectiveId: o.id, to: paid - 1 }, title: 'x', why: 'y' }, NOW))).toBe('err.budget_below_paid');
    // Requested while possible, then overtaken by a payout before the vote ends.
    const shrink = E.requestMoney(t, 'mendel', { action: { type: 'budget', objectiveId: o.id, to: paid + 100 }, title: 'x', why: 'y' }, NOW);
    expect(shrink.decidedBy).toBe('vote');
    for (const m of ['mendel', 'yosef', 'levi', 'shmuel']) E.vote(t, m, shrink.id, 'for', NOW);
    E.paySchedule(t, 'mendel', s.id, NOW);
    E.vote(t, 'rivka', shrink.id, 'for', NOW);
    expect(shrink.status).toBe('failed');
    expect(o.budget).toBe(8000);
    expect(t.ledger.at(-1)).toMatchObject({ kind: 'change_failed', data: { reason: 'below_paid' } });
  });

  it('pays a due schedule once, then waits a week', () => {
    const t = brachos();
    const rivka = memberBalance(t, 'rivka');
    E.paySchedule(t, 'mendel', 'sched-rivka', NOW);
    expect(memberBalance(t, 'rivka')).toBe(rivka + 150);
    expect(errKey(() => E.paySchedule(t, 'mendel', 'sched-rivka', NOW))).toBe('err.not_due');
  });
});

describe('ledger', () => {
  it('statements add up to the ledger', () => {
    const t = brachos();
    const st = statements(t);
    const minted = t.ledger.flatMap(e => e.amounts ?? []).filter(a => a.source === 'minted').reduce((s, a) => s + a.amount, 0);
    expect(st.reduce((s, m) => s + m.issued, 0)).toBe(minted);
    expect(st[0].accountEnd).toBe(t.treasury.teamAccount);
  });

  it('anchors every batch of signed entries with a settled entry', () => {
    const t = brachos();
    const signed = t.ledger.filter(e => e.tier === 'signed').length;
    const anchors = t.ledger.filter(e => e.kind === 'anchor').length;
    expect(anchors).toBe(Math.floor(signed / ANCHOR_BATCH));
  });
});

describe('proofs', () => {
  it('are stand-ins in the demo, and pending in a live team until the chain confirms', () => {
    const demo = brachos();
    const anchoredDemo = anchoredBatches(demo);
    // Every settled entry has its stand-in transaction; signed entries wait
    // only in the batch still filling up, which has no anchor yet.
    const waiting = demo.ledger.filter(e => !isConfirmed(e, anchoredDemo));
    expect(waiting.every(e => e.tier === 'signed' && e.proof.batch === anchoredDemo.size + 1)).toBe(true);
    expect(waiting.length).toBeLessThan(ANCHOR_BATCH);

    const live = E.createTeam({ name: 'Live', purpose: '', templateId: 'editorial', live: true, founder: { id: 'u1', name: 'A', initials: 'A', wallet: '0x1' } }, NOW);
    E.addObjective(live, 'u1', { title: 'Obj', description: '' }, NOW);
    const [created, objective] = live.ledger;
    expect(created.proof).toEqual({});
    expect(objective.proof).toEqual({ batch: 1 });
    const anchored = anchoredBatches(live);
    expect(live.ledger.some(e => isConfirmed(e, anchored))).toBe(false);
  });
});

describe('teams', () => {
  it('starts a team from a template with its roles and rules', () => {
    const t = E.createTeam({ name: 'Studio X', purpose: 'Make things', templateId: 'studio', founder: { name: 'Ana', initials: 'A', wallet: '0x1' } }, NOW);
    expect(t.charter.roles.map(r => r.id)).toEqual(['owner', 'maker']);
    expect(ruleValue(t, 'spend_limit')).toBe(5000);
    expect(t.members[0].roleIds).toEqual(['owner']);
    expect(t.ledger[0].kind).toBe('team_created');
  });
});
