import { describe, expect, it } from 'vitest';
import * as E from './engine';
import { seedTeams } from './seed';
import { closingSoon, concerns, newsFor } from './notify';
import type { Team } from './types';

const NOW = '2026-10-25T12:00:00.000Z';
const later = (h: number) => new Date(new Date(NOW).getTime() + h * 3_600_000).toISOString();
const brachos = (): Team => seedTeams(NOW).teams.find(t => t.id === 'brachos')!;
const byTitle = (team: Team, en: string) => team.deliverables.find(d => typeof d.title !== 'string' && d.title.en.startsWith(en))!;

describe('notifications', () => {
  it('tell the owner and reviewer their work was accepted and paid, not the one who did it', () => {
    const t = brachos();
    const ch3 = byTitle(t, 'Chapter 3');
    E.acceptAndPay(t, 'mendel', E.activeWorkChange(t, ch3.id)!.id, later(1));
    const paid = t.ledger.at(-1)!;
    expect(paid.kind).toBe('accepted_paid');
    expect(concerns(t, ch3.ownerId!, paid)).toBe(true);
    expect(concerns(t, 'yosef', paid)).toBe(true); // the reviewer, paid the review reward
    expect(concerns(t, 'mendel', paid)).toBe(false);
    expect(concerns(t, 'rivka', paid)).toBe(false);
    expect(newsFor(t, ch3.ownerId!, NOW)[0]).toBe(paid);
  });

  it('tell a change’s proposer and voters how it ended', () => {
    const t = brachos();
    const rv = t.changes.find(c => c.kind === 'rule' && c.status === 'open')!;
    const voted = rv.kind === 'rule' ? rv.votes.map(v => v.memberId) : [];
    E.vote(t, 'mendel', rv.id, 'for', later(1));
    E.vote(t, 'shmuel', rv.id, 'for', later(1));
    const passed = t.ledger.find(e => e.kind === 'change_passed' && e.refs.changeId === rv.id)!;
    for (const m of voted) expect(concerns(t, m, passed)).toBe(m !== passed.actorId);
    expect(newsFor(t, 'shmuel', NOW).some(e => e.kind === 'rule_changed')).toBe(true);
  });

  it('flag votes about to close that the member hasn’t cast', () => {
    const t = brachos();
    const open = t.changes.filter(c => (c.kind === 'rule' || c.kind === 'role') && c.status === 'open');
    expect(open.map(c => c.kind).sort()).toEqual(['role', 'rule']);
    expect(closingSoon(t, 'shmuel', NOW, 24 * 7).map(c => c.id).sort()).toEqual(open.map(c => c.id).sort());
    expect(closingSoon(t, 'shmuel', NOW, 1)).toEqual([]);
    for (const c of open) E.vote(t, 'shmuel', c.id, 'for', NOW);
    expect(closingSoon(t, 'shmuel', NOW, 24 * 7)).toEqual([]);
  });
});
