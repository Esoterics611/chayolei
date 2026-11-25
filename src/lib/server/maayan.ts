// The wellsprings on Firestore (docs/MAAYAN.md). Written only here, through
// the Admin SDK, after the same engine the demo runs (src/lib/maayan/engine.ts):
//   wellsprings/{id}            public; `followers` kept here
//   maayanQuestions/{id}        public once published or answered (firestore.rules)
//   maayanMembers/{uid}         the member's own; the email never leaves the server's hands
// The teacher is a member with `teacher: true`, set by scripts/maayan-teacher.mjs.

import { FieldValue } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminDb } from './firebase-admin';
import { DomainError } from '$lib/team/types';
import * as M from '$lib/maayan/engine';
import type { MaayanMember, Question, Wellspring } from '$lib/maayan/types';
import { sendAnswerMail } from './mail';

const members = () => adminDb.collection('maayanMembers');
const questions = () => adminDb.collection('maayanQuestions');
const wellsprings = () => adminDb.collection('wellsprings');

/** The confirmed email of a signed-in member: email-link sign-in confirms it. */
export function confirmedEmail(decoded: DecodedIdToken): string {
  if (!decoded.email || decoded.email_verified !== true) throw new DomainError('maayan.err.signIn');
  return decoded.email.toLowerCase();
}

export async function getMember(uid: string): Promise<MaayanMember | null> {
  const d = await members().doc(uid).get();
  return d.exists ? ({ ...(d.data() as MaayanMember), uid }) : null;
}

const asList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 50) : []);

/** Create the profile, or change name, follows and email choices; keeps `followers` in step. */
export async function saveMember(decoded: DecodedIdToken, input: Record<string, unknown>): Promise<MaayanMember> {
  const email = confirmedEmail(decoded);
  const uid = decoded.uid;
  const known = new Set((await wellsprings().get()).docs.map(d => d.id));
  return adminDb.runTransaction(async tx => {
    const ref = members().doc(uid);
    const snap = await tx.get(ref);
    const before = snap.exists ? (snap.data() as MaayanMember) : null;
    const follows = [...new Set(asList(input.follows).filter(id => known.has(id)))];
    const next: MaayanMember = {
      uid,
      email,
      name: M.checkName(String(input.name ?? before?.name ?? '')),
      follows,
      notify: input.notify === undefined ? (before?.notify ?? true) : input.notify === true,
      quoteOk: input.quoteOk === undefined ? (before?.quoteOk ?? false) : input.quoteOk === true,
      joinedFrom: before?.joinedFrom ?? String(input.joinedFrom ?? '').slice(0, 80),
      joinedAt: before?.joinedAt ?? new Date().toISOString(),
      approved: before?.approved ?? 0,
      ...(before?.wallet ? { wallet: before.wallet } : {}),
      ...(before?.teacher ? { teacher: true } : {}),
    };
    const was = new Set(before?.follows ?? []);
    for (const id of follows) if (!was.has(id)) tx.update(wellsprings().doc(id), { followers: FieldValue.increment(1) });
    for (const id of was) if (!follows.includes(id) && known.has(id)) tx.update(wellsprings().doc(id), { followers: FieldValue.increment(-1) });
    tx.set(ref, next);
    return next;
  });
}

export async function askQuestion(uid: string, input: Record<string, unknown>): Promise<Question> {
  const wid = String(input.wellspringId ?? '');
  const parentId = typeof input.parentId === 'string' && input.parentId ? input.parentId : '';
  const now = new Date().toISOString();
  const [w, m, own, parent] = await Promise.all([
    wellsprings().doc(wid).get(),
    getMember(uid),
    questions().where('authorId', '==', uid).get(),
    parentId ? questions().doc(parentId).get() : Promise.resolve(null),
  ]);
  if (parentId && !parent?.exists) throw new DomainError('maayan.err.state');
  const ref = questions().doc();
  const q = M.ask(w.exists ? ({ ...(w.data() as Wellspring), id: w.id }) : undefined, m ?? undefined,
    String(input.text ?? ''), ref.id, now, {
      ref: typeof input.ref === 'string' ? input.ref : '',
      parent: parent?.exists ? ({ ...(parent.data() as Question), id: parent.id }) : undefined,
      askedToday: M.askedSince(own.docs.map(d => d.data() as Question), uid, now),
    });
  await ref.set(q);
  return q;
}

/** The asker withdraws a question not yet answered: it is deleted. */
export async function withdrawQuestion(uid: string, qid: string): Promise<void> {
  await adminDb.runTransaction(async tx => {
    const ref = questions().doc(qid);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new DomainError('maayan.err.state');
    M.checkWithdraw({ ...(snap.data() as Question), id: qid }, (await getMember(uid)) ?? undefined);
    tx.delete(ref);
  });
}

/** The teacher's actions; an answer mails the asker if they asked for email. */
export async function teacherAction(uid: string, qid: string, input: Record<string, unknown>): Promise<Question> {
  const t = await getMember(uid);
  const action = String(input.action ?? '');
  const result = await adminDb.runTransaction(async tx => {
    const ref = questions().doc(qid);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new DomainError('maayan.err.state');
    const before = { ...(snap.data() as Question), id: qid };
    const now = new Date().toISOString();
    const after = action === 'approve' ? M.approve(before, t ?? undefined)
      : action === 'hide' ? M.hide(before, t ?? undefined)
      : action === 'answer' ? M.answer(before, t ?? undefined, String(input.text ?? ''), now)
      : (() => { throw new DomainError('err.invalid_input'); })();
    tx.set(ref, after);
    if (M.countsAsApproval(before, after)) tx.set(members().doc(after.authorId), { approved: FieldValue.increment(1) }, { merge: true });
    return { before, after };
  });
  if (action === 'answer' && !result.before.answer) {
    const asker = await getMember(result.after.authorId);
    const w = await wellsprings().doc(result.after.wellspringId).get();
    if (asker?.notify) await sendAnswerMail(asker, result.after, w.exists ? (w.data() as Wellspring) : undefined).catch(() => undefined);
  }
  return result.after;
}

/** One-click unsubscribe from an email's link. */
export async function unsubscribe(uid: string): Promise<void> {
  await members().doc(uid).set({ notify: false }, { merge: true });
}
