// The wellsprings' rules, as plain functions on plain data: the demo runs them
// in the browser and the server runs the same ones before it writes
// (src/lib/server/maayan.ts). Each refusal is a DomainError with a message key.

import { DomainError } from '$lib/team/types';
import type { MaayanMember, Question, Wellspring } from './types';

export const QUESTION_MIN = 8;
export const QUESTION_MAX = 2000;
export const ANSWER_MAX = 12000;
export const NAME_MAX = 60;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function checkEmail(email: string): string {
  const e = email.trim().toLowerCase();
  if (!EMAIL.test(e) || e.length > 254) throw new DomainError('maayan.err.email');
  return e;
}

export function checkName(name: string): string {
  const n = name.trim().replace(/\s+/g, ' ');
  if (n.length < 2) throw new DomainError('maayan.err.name');
  if (n.length > NAME_MAX) throw new DomainError('maayan.err.nameLong', { n: NAME_MAX });
  return n;
}

/** A new question. A member's first goes to the teacher first; after one is let through, they post directly. */
export function ask(
  w: Wellspring | undefined,
  m: MaayanMember | undefined,
  text: string,
  id: string,
  now: string,
): Question {
  if (!w) throw new DomainError('maayan.err.noWellspring');
  if (w.status !== 'open') throw new DomainError('maayan.err.notOpen');
  if (!m) throw new DomainError('maayan.err.signIn');
  const body = text.trim();
  if (body.length < QUESTION_MIN) throw new DomainError('maayan.err.short');
  if (body.length > QUESTION_MAX) throw new DomainError('maayan.err.long', { n: QUESTION_MAX });
  return {
    id,
    wellspringId: w.id,
    authorId: m.uid,
    authorName: m.name,
    text: body,
    status: m.teacher || m.approved > 0 ? 'published' : 'pending',
    createdAt: now,
  };
}

function teacherOnly(m: MaayanMember | undefined): MaayanMember {
  if (!m?.teacher) throw new DomainError('maayan.err.teacherOnly');
  return m;
}

/** The teacher lets a waiting question through. */
export function approve(q: Question, by: MaayanMember | undefined): Question {
  teacherOnly(by);
  if (q.status !== 'pending' && q.status !== 'hidden') throw new DomainError('maayan.err.state');
  return { ...q, status: 'published' };
}

/** The teacher declines a question: only its author still sees it. */
export function hide(q: Question, by: MaayanMember | undefined): Question {
  teacherOnly(by);
  if (q.status === 'answered') throw new DomainError('maayan.err.state');
  return { ...q, status: 'hidden' };
}

/** The teacher answers (or corrects an answer). A waiting question is let through with its answer. */
export function answer(q: Question, by: MaayanMember | undefined, text: string, now: string): Question {
  const t = teacherOnly(by);
  if (q.status === 'hidden') throw new DomainError('maayan.err.state');
  const body = text.trim();
  if (!body) throw new DomainError('maayan.err.emptyAnswer');
  if (body.length > ANSWER_MAX) throw new DomainError('maayan.err.long', { n: ANSWER_MAX });
  return { ...q, status: 'answered', answer: { text: body, byId: t.uid, byName: t.name, at: q.answer?.at ?? now } };
}

/** Whether the question first went to the teacher: its author's count goes up once it is let through. */
export const countsAsApproval = (before: Question, after: Question) =>
  before.status === 'pending' && (after.status === 'published' || after.status === 'answered');

export function follow(m: MaayanMember, id: string, on: boolean): MaayanMember {
  const has = m.follows.includes(id);
  if (on === has) return m;
  return { ...m, follows: on ? [...m.follows, id] : m.follows.filter(x => x !== id) };
}

/** What one viewer may see of a wellspring's questions, answered first, newest first within each. */
export function visible(questions: Question[], wellspringId: string, viewer?: MaayanMember): Question[] {
  const rank = (q: Question) => (q.status === 'answered' ? 0 : 1);
  return questions
    .filter(q => q.wellspringId === wellspringId)
    .filter(q => q.status === 'answered' || q.status === 'published' || q.authorId === viewer?.uid || !!viewer?.teacher)
    .sort((a, b) => rank(a) - rank(b) || (b.answer?.at ?? b.createdAt).localeCompare(a.answer?.at ?? a.createdAt));
}

export function counts(questions: Question[], wellspringId: string) {
  const own = questions.filter(q => q.wellspringId === wellspringId);
  return {
    answered: own.filter(q => q.status === 'answered').length,
    waiting: own.filter(q => q.status === 'published').length,
    pending: own.filter(q => q.status === 'pending').length,
  };
}
