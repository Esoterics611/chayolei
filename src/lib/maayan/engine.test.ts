import { describe, expect, it } from 'vitest';
import { DomainError } from '$lib/team/types';
import * as M from './engine';
import { DEMO_TEACHER, WELLSPRINGS, sampleQuestions } from './seed';
import type { MaayanMember } from './types';

const NOW = '2026-11-25T10:00:00Z';
const open = WELLSPRINGS.find(w => w.status === 'open')!;
const upcoming = WELLSPRINGS.find(w => w.status === 'upcoming')!;
const reader = (over: Partial<MaayanMember> = {}): MaayanMember => ({
  uid: 'u1', name: 'חנה', email: 'h@example.org', follows: [open.id], notify: true, quoteOk: false,
  joinedFrom: 'booklet:padah-beshalom', joinedAt: NOW, approved: 0, ...over,
});
const refusal = (f: () => unknown) => {
  try { f(); } catch (e) { return (e as DomainError).key; }
  return 'no refusal';
};

describe('asking', () => {
  it('sends a member’s first question to the teacher, then lets them post directly', () => {
    expect(M.ask(open, reader(), 'מהי היחידה בנפש?', 'q1', NOW).status).toBe('pending');
    expect(M.ask(open, reader({ approved: 1 }), 'מהי היחידה בנפש?', 'q1', NOW).status).toBe('published');
  });

  it('refuses without an account, on an upcoming wellspring, and when too short', () => {
    expect(refusal(() => M.ask(open, undefined, 'מהי היחידה?', 'q', NOW))).toBe('maayan.err.signIn');
    expect(refusal(() => M.ask(upcoming, reader(), 'מהי היחידה?', 'q', NOW))).toBe('maayan.err.notOpen');
    expect(refusal(() => M.ask(open, reader(), '  למה?  ', 'q', NOW))).toBe('maayan.err.short');
  });
});

describe('the teacher', () => {
  it('alone approves, hides and answers', () => {
    const q = M.ask(open, reader(), 'מהי היחידה בנפש?', 'q1', NOW);
    expect(refusal(() => M.approve(q, reader()))).toBe('maayan.err.teacherOnly');
    expect(refusal(() => M.answer(q, reader(), 'תשובה', NOW))).toBe('maayan.err.teacherOnly');
    const a = M.answer(q, DEMO_TEACHER, 'הנקודה הפנימית ביותר בנפש.', NOW);
    expect(a.status).toBe('answered');
    expect(a.answer?.byName).toBe(DEMO_TEACHER.name);
    expect(M.countsAsApproval(q, a)).toBe(true);
    expect(M.hide(q, DEMO_TEACHER).status).toBe('hidden');
  });

  it('keeps the first answer’s time when correcting it', () => {
    const q = M.answer(M.ask(open, reader({ approved: 1 }), 'מהי היחידה בנפש?', 'q1', NOW), DEMO_TEACHER, 'א', NOW);
    expect(M.answer(q, DEMO_TEACHER, 'ב', '2026-12-01T00:00:00Z').answer).toMatchObject({ text: 'ב', at: NOW });
  });
});

describe('what a viewer sees', () => {
  const qs = sampleQuestions();
  it('shows answered questions first and hides waiting ones from others', () => {
    const seen = M.visible(qs, open.id, reader());
    expect(seen[0].status).toBe('answered');
    expect(seen.some(q => q.status === 'pending')).toBe(false);
    expect(M.visible(qs, open.id, DEMO_TEACHER).some(q => q.status === 'pending')).toBe(true);
  });

  it('counts answered, waiting and pending', () => {
    expect(M.counts(qs, open.id)).toEqual({ answered: 3, waiting: 1, pending: 1 });
  });
});

describe('email and name', () => {
  it('normalises a good email and refuses a bad one', () => {
    expect(M.checkEmail('  Reader@Example.ORG ')).toBe('reader@example.org');
    expect(refusal(() => M.checkEmail('reader@'))).toBe('maayan.err.email');
    expect(refusal(() => M.checkName(' א '))).toBe('maayan.err.name');
  });

  it('follows and unfollows', () => {
    const m = M.follow(reader(), upcoming.id, true);
    expect(m.follows).toContain(upcoming.id);
    expect(M.follow(m, upcoming.id, false).follows).not.toContain(upcoming.id);
  });
});
