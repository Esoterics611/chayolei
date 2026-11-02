import { describe, expect, it } from 'vitest';
import * as E from './engine';
import { seedTeams } from './seed';
import { payloadOf, pushItems } from './push';
import type { Team } from './types';

const NOW = '2026-10-25T12:00:00.000Z';
const later = (h: number) => new Date(new Date(NOW).getTime() + h * 3_600_000).toISOString();
const brachos = (): Team => seedTeams(NOW).teams.find(t => t.id === 'brachos')!;

describe('push', () => {
  it('sends what blocks someone, not what only concerns them', () => {
    const t = brachos();
    const keys = (m: string) => pushItems(t, m, NOW, 'en').map(i => i.key.split(':')[0]).sort();
    expect(keys('mendel')).toEqual(['accept', 'money']); // not the open votes yet, nor scheduled pay
    expect(keys('yosef')).toEqual(['review']);
    expect(keys('levi')).toEqual([]); // a stalled deliverable of his own stays in the app
    const [review] = pushItems(t, 'yosef', NOW, 'en');
    expect(review).toMatchObject({ title: 'Brachos Translation Group', urgent: false });
    expect(review.body).toMatch(/^“Chapter 4 .*” waits for your review$/);
    expect(review.url).toMatch(/^\/d\/.+\/review\/.+$/);
    expect(pushItems(t, 'yosef', NOW, 'he')[0]).toMatchObject({ key: review.key, title: 'חבורת תרגום ברכות' });
    expect(payloadOf(review)).toEqual({ title: review.title, body: review.body, url: review.url, tag: review.key });
  });

  it('reminds voters a day before a vote they haven’t cast closes', () => {
    const t = brachos();
    const rule = t.changes.find(c => c.kind === 'rule' && c.status === 'open')!;
    const soon = later((new Date(rule.kind === 'rule' ? rule.closesAt : NOW).getTime() - new Date(NOW).getTime()) / 3_600_000 - 2);
    const closing = pushItems(t, 'shmuel', soon, 'en').filter(i => i.key.startsWith('closing:'));
    expect(closing.map(i => i.key)).toContain(`closing:${rule.id}`);
    expect(closing.find(i => i.key === `closing:${rule.id}`)).toMatchObject({ urgent: true, url: `/decide/p/${rule.id}` });
    // Yosef proposed it and voted: no reminder for him.
    expect(pushItems(t, 'yosef', soon, 'en').some(i => i.key === `closing:${rule.id}`)).toBe(false);
  });

  it('keeps a key while the item waits, and a new round is a new key', () => {
    const t = brachos();
    const ch4 = t.deliverables.find(d => typeof d.title !== 'string' && d.title.en.startsWith('Chapter 4'))!;
    const round = E.activeWorkChange(t, ch4.id)!;
    E.requestChanges(t, 'yosef', round.id, 'Add the sources.', NOW);
    const revise = pushItems(t, 'rivka', NOW, 'en').find(i => i.key.startsWith('revise:'))!;
    expect(revise.key).toBe(`revise:${round.id}`);
    expect(revise.url).toBe(`/d/${ch4.id}/edit`);
  });
});
