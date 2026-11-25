// The free version's browser writes (docs/MAAYAN.md §6a), held by firestore.rules
// to the engine's rules; run against the emulator (`npm test`).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, increment, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const NOW = '2026-11-25T10:00:00Z';

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '').split(':');
  if (!host) throw new Error('Run with the Firestore emulator: npm test');
  env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});
afterAll(async () => { await env?.cleanup(); });

const member = (uid: string, name: string, email: string, extra: Record<string, unknown> = {}) => ({
  uid, name, email, follows: ['padah-beshalom'], notify: true, quoteOk: false,
  joinedFrom: 'booklet:padah-beshalom', joinedAt: NOW, approved: 0, ...extra,
});
const question = (id: string, authorId: string, authorName: string, extra: Record<string, unknown> = {}) => ({
  id, wellspringId: 'padah-beshalom', authorId, authorName, text: 'מהי היחידה בנפש?', status: 'pending', createdAt: NOW, ...extra,
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'wellsprings/padah-beshalom'), { status: 'open' });
    await setDoc(doc(db, 'wellsprings/kavanot-shacharit'), { status: 'upcoming' });
    await setDoc(doc(db, 'maayanMembers/chana'), member('chana', 'חנה', 'chana@example.org'));
    await setDoc(doc(db, 'maayanMembers/sara'), member('sara', 'שרה', 'sara@example.org', { approved: 1 }));
    await setDoc(doc(db, 'maayanMembers/teacher'), member('teacher', 'המלמד', 't@example.org', { teacher: true }));
    await setDoc(doc(db, 'maayanQuestions/answered'), question('answered', 'sara', 'שרה', { status: 'answered', answer: { text: 'א', byId: 'teacher', byName: 'המלמד', at: NOW } }));
    await setDoc(doc(db, 'maayanQuestions/waiting'), question('waiting', 'chana', 'חנה'));
  });
});

/** A signed-in browser; `confirmed` is whether the email was confirmed (email link). */
const as = (uid: string, email = `${uid}@example.org`, confirmed = true) =>
  env.authenticatedContext(uid, { email, email_verified: confirmed }).firestore();

describe('free version: joining', () => {
  it('makes a profile for one’s own confirmed email only', async () => {
    await assertSucceeds(setDoc(doc(as('new', 'New@Example.org'), 'maayanMembers/new'), member('new', 'נתן', 'new@example.org')));
    await assertFails(setDoc(doc(as('n2', 'n2@example.org', false), 'maayanMembers/n2'), member('n2', 'נתן', 'n2@example.org')));
    await assertFails(setDoc(doc(as('n3'), 'maayanMembers/n3'), member('n3', 'נתן', 'someone-else@example.org')));
    await assertFails(setDoc(doc(as('n4'), 'maayanMembers/other'), member('other', 'נתן', 'n4@example.org')));
  });

  it('refuses a head start: teacher, or questions already approved', async () => {
    await assertFails(setDoc(doc(as('n5'), 'maayanMembers/n5'), member('n5', 'נתן', 'n5@example.org', { teacher: true })));
    await assertFails(setDoc(doc(as('n6'), 'maayanMembers/n6'), member('n6', 'נתן', 'n6@example.org', { approved: 3 })));
  });

  it('lets a member change name and choices, never their standing', async () => {
    const db = as('chana', 'chana@example.org');
    await assertSucceeds(updateDoc(doc(db, 'maayanMembers/chana'), { name: 'חנה ל.', follows: [], notify: false }));
    await assertFails(updateDoc(doc(db, 'maayanMembers/chana'), { approved: 5 }));
    await assertFails(updateDoc(doc(db, 'maayanMembers/chana'), { teacher: true }));
    await assertFails(updateDoc(doc(db, 'maayanMembers/chana'), { email: 'x@example.org' }));
    await assertFails(updateDoc(doc(db, 'maayanMembers/chana'), { name: 'א' }));
  });
});

describe('free version: asking', () => {
  it('holds a first question for the teacher', async () => {
    const db = as('chana', 'chana@example.org');
    await assertSucceeds(setDoc(doc(db, 'maayanQuestions/q1'), question('q1', 'chana', 'חנה')));
    await assertFails(setDoc(doc(db, 'maayanQuestions/q2'), question('q2', 'chana', 'חנה', { status: 'published' })));
  });

  it('lets someone the teacher approved post directly, with a place and a follow-up', async () => {
    const db = as('sara', 'sara@example.org');
    await assertSucceeds(setDoc(doc(db, 'maayanQuestions/q3'), question('q3', 'sara', 'שרה', { status: 'published', ref: 'עמ׳ 4', parentId: 'answered' })));
    await assertFails(setDoc(doc(db, 'maayanQuestions/q4'), question('q4', 'sara', 'שרה', { status: 'published', parentId: 'waiting' })));
  });

  it('refuses another’s name, an answer, a closed wellspring, a one-word question', async () => {
    const db = as('chana', 'chana@example.org');
    await assertFails(setDoc(doc(db, 'maayanQuestions/q5'), question('q5', 'sara', 'שרה')));
    await assertFails(setDoc(doc(db, 'maayanQuestions/q6'), question('q6', 'chana', 'המלמד')));
    await assertFails(setDoc(doc(db, 'maayanQuestions/q7'), question('q7', 'chana', 'חנה', { status: 'answered', answer: { text: 'א', byId: 'chana', byName: 'חנה', at: NOW } })));
    await assertFails(setDoc(doc(db, 'maayanQuestions/q8'), question('q8', 'chana', 'חנה', { wellspringId: 'kavanot-shacharit' })));
    await assertFails(setDoc(doc(db, 'maayanQuestions/q9'), question('q9', 'chana', 'חנה', { text: 'למה?' })));
    await assertFails(setDoc(doc(as('stranger'), 'maayanQuestions/q10'), question('q10', 'stranger', 'זר')));
  });

  it('lets the asker withdraw an unanswered question, no one else, and not once answered', async () => {
    await assertFails(deleteDoc(doc(as('sara', 'sara@example.org'), 'maayanQuestions/waiting')));
    await assertSucceeds(deleteDoc(doc(as('chana', 'chana@example.org'), 'maayanQuestions/waiting')));
    await assertFails(deleteDoc(doc(as('sara', 'sara@example.org'), 'maayanQuestions/answered')));
  });
});

describe('free version: the teacher', () => {
  it('publishes, declines and answers, and counts the asker’s approval', async () => {
    const t = as('teacher', 't@example.org');
    await assertSucceeds(updateDoc(doc(t, 'maayanQuestions/waiting'), {
      status: 'answered', answer: { text: 'הנקודה הפנימית.', byId: 'teacher', byName: 'המלמד', at: NOW },
    }));
    await assertSucceeds(updateDoc(doc(t, 'maayanMembers/chana'), { approved: increment(1) }));
    await assertFails(updateDoc(doc(t, 'maayanMembers/chana'), { approved: increment(2) }));
    await assertFails(updateDoc(doc(t, 'maayanMembers/chana'), { name: 'אחרת' }));
  });

  it('is the only one who may', async () => {
    const c = as('chana', 'chana@example.org');
    await assertFails(updateDoc(doc(c, 'maayanQuestions/waiting'), { status: 'published' }));
    await assertFails(updateDoc(doc(c, 'maayanQuestions/waiting'), {
      status: 'answered', answer: { text: 'א', byId: 'chana', byName: 'חנה', at: NOW },
    }));
    await assertFails(updateDoc(doc(c, 'maayanMembers/sara'), { approved: increment(1) }));
  });

  it('cannot change the question itself, or answer in another’s name', async () => {
    const t = as('teacher', 't@example.org');
    await assertFails(updateDoc(doc(t, 'maayanQuestions/waiting'), { text: 'שאלה אחרת לגמרי' }));
    await assertFails(updateDoc(doc(t, 'maayanQuestions/waiting'), {
      status: 'answered', answer: { text: 'א', byId: 'chana', byName: 'חנה', at: NOW },
    }));
    await assertFails(updateDoc(doc(t, 'maayanQuestions/answered'), { status: 'hidden' }));
  });
});
