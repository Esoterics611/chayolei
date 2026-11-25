// The wellsprings on Firestore, against the emulator (`npm test`).
import { beforeEach, describe, expect, it } from 'vitest';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminDb } from '$lib/server/firebase-admin';
import { askQuestion, getMember, saveMember, teacherAction } from './maayan';
import { DomainError } from '$lib/team/types';
import { WELLSPRINGS } from '$lib/maayan/seed';
import type { Question } from '$lib/maayan/types';

const token = (uid: string, email: string, verified = true) =>
  ({ uid, email, email_verified: verified }) as unknown as DecodedIdToken;

beforeEach(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const project = process.env.GCLOUD_PROJECT;
  if (!host || !project) throw new Error('Run with the Firestore emulator: npm test');
  await fetch(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
  for (const w of WELLSPRINGS) await adminDb.collection('wellsprings').doc(w.id).set({ ...w, followers: 0 });
  await adminDb.collection('maayanMembers').doc('teacher').set({
    uid: 'teacher', name: 'המלמד', email: 't@example.org', follows: [], notify: false, quoteOk: true,
    joinedFrom: 'setup', joinedAt: '2026-11-01T00:00:00Z', approved: 0, teacher: true,
  });
});

const errKey = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { if (e instanceof DomainError) return e.key; throw e; }
  return undefined;
};
const followers = async (id: string) => (await adminDb.collection('wellsprings').doc(id).get()).data()?.followers;

describe('wellsprings in Firestore', () => {
  it('makes a profile only for a confirmed email, and counts followers', async () => {
    expect(await errKey(saveMember(token('r1', 'r@example.org', false), { name: 'חנה' }))).toBe('maayan.err.signIn');
    const m = await saveMember(token('r1', 'R@Example.org'), {
      name: 'חנה', follows: ['padah-beshalom', 'kavanot-shacharit', 'no-such'], joinedFrom: 'booklet:padah-beshalom',
    });
    expect(m).toMatchObject({ email: 'r@example.org', follows: ['padah-beshalom', 'kavanot-shacharit'], approved: 0 });
    expect(await followers('padah-beshalom')).toBe(1);
    await saveMember(token('r1', 'r@example.org'), { name: 'חנה ל.', follows: ['kavanot-shacharit'] });
    expect(await followers('padah-beshalom')).toBe(0);
    expect((await getMember('r1'))?.joinedFrom).toBe('booklet:padah-beshalom');
  });

  it('holds a first question for the teacher, then lets the asker post directly', async () => {
    await saveMember(token('r1', 'r@example.org'), { name: 'חנה', follows: [] });
    const first = await askQuestion('r1', { wellspringId: 'padah-beshalom', text: 'מהי היחידה בנפש?' });
    expect(first.status).toBe('pending');
    expect(await errKey(teacherAction('r1', first.id, { action: 'approve' }))).toBe('maayan.err.teacherOnly');
    const answered = await teacherAction('teacher', first.id, { action: 'answer', text: 'הנקודה הפנימית ביותר בנפש.' });
    expect(answered).toMatchObject({ status: 'answered', answer: { byName: 'המלמד' } });
    expect((await getMember('r1'))?.approved).toBe(1);
    const second = await askQuestion('r1', { wellspringId: 'padah-beshalom', text: 'ומה הקשר לצרכי הכלל?' });
    expect(second.status).toBe('published');
    const stored = (await adminDb.collection('maayanQuestions').doc(second.id).get()).data() as Question;
    expect(stored.authorName).toBe('חנה');
  });

  it('refuses questions on a wellspring not yet open, and from someone without a profile', async () => {
    await saveMember(token('r1', 'r@example.org'), { name: 'חנה', follows: [] });
    expect(await errKey(askQuestion('r1', { wellspringId: 'kavanot-shacharit', text: 'מתי זה נפתח?' }))).toBe('maayan.err.notOpen');
    expect(await errKey(askQuestion('nobody', { wellspringId: 'padah-beshalom', text: 'מהי היחידה בנפש?' }))).toBe('maayan.err.signIn');
  });
});
