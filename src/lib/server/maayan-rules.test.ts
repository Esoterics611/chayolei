// The Firestore access rules for the wellsprings, run against the emulator (`npm test`).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;
const READER = 'reader1';
const OTHER = 'reader2';
const TEACHER = 'teacher1';

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '').split(':');
  if (!host) throw new Error('Run with the Firestore emulator: npm test');
  env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});
afterAll(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'wellsprings/padah-beshalom'), { status: 'open', followers: 3 });
    await setDoc(doc(db, 'maayanQuestions/a'), { status: 'answered', authorId: OTHER, text: 'א' });
    await setDoc(doc(db, 'maayanQuestions/p'), { status: 'published', authorId: OTHER, text: 'ב' });
    await setDoc(doc(db, 'maayanQuestions/w'), { status: 'pending', authorId: READER, text: 'ג' });
    await setDoc(doc(db, 'maayanMembers/' + READER), { name: 'חנה', email: 'h@example.org' });
    await setDoc(doc(db, 'maayanMembers/' + TEACHER), { name: 'המלמד', email: 't@example.org', teacher: true });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

describe('firestore rules: wellsprings', () => {
  it('lets anyone read wellsprings and published or answered questions', async () => {
    const db = as(null);
    await assertSucceeds(getDoc(doc(db, 'wellsprings/padah-beshalom')));
    await assertSucceeds(getDocs(query(collection(db, 'maayanQuestions'), where('status', 'in', ['published', 'answered']))));
  });

  it('shows a waiting question to its author and the teacher only', async () => {
    await assertSucceeds(getDoc(doc(as(READER), 'maayanQuestions/w')));
    await assertSucceeds(getDocs(query(collection(as(READER), 'maayanQuestions'), where('authorId', '==', READER))));
    await assertSucceeds(getDocs(query(collection(as(TEACHER), 'maayanQuestions'), where('status', 'in', ['pending', 'hidden']))));
    await assertFails(getDoc(doc(as(OTHER), 'maayanQuestions/w')));
    await assertFails(getDoc(doc(as(null), 'maayanQuestions/w')));
    await assertFails(getDocs(query(collection(as(OTHER), 'maayanQuestions'), where('status', '==', 'pending'))));
  });

  it('keeps a member’s profile and email to themselves', async () => {
    await assertSucceeds(getDoc(doc(as(READER), 'maayanMembers/' + READER)));
    await assertFails(getDoc(doc(as(OTHER), 'maayanMembers/' + READER)));
    await assertFails(getDoc(doc(as(TEACHER), 'maayanMembers/' + READER)));
    await assertFails(getDoc(doc(as(null), 'maayanMembers/' + READER)));
  });

  it('lets no browser write', async () => {
    await assertFails(setDoc(doc(as(READER), 'maayanQuestions/x'), { status: 'answered', authorId: READER }));
    await assertFails(setDoc(doc(as(READER), 'maayanMembers/' + READER), { teacher: true }));
    await assertFails(setDoc(doc(as(TEACHER), 'wellsprings/new'), { status: 'open' }));
  });
});
