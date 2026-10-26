// The Firestore access rules for teams, run against the emulator (`npm test`).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;
const MEMBER = 'wallet_0xa1';
const OTHER = 'wallet_0xb2';
const OUTSIDER = 'wallet_0xc3';

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
    await setDoc(doc(db, 'teams/t1'), { name: 'Team', memberUids: [MEMBER, OTHER] });
    await setDoc(doc(db, 'teams/t1/ledger/00000001'), { seq: 1, kind: 'team_created' });
    await setDoc(doc(db, 'teams/t1/messages/m1'), { body: 'hi' });
    await setDoc(doc(db, 'teams/t1/versions/v1'), { kind: 'version', authorId: OTHER, paragraphs: ['public'] });
    await setDoc(doc(db, 'teams/t1/versions/v2'), { kind: 'draft', authorId: OTHER, paragraphs: ['private'] });
    await setDoc(doc(db, 'teamInvites/tok'), { teamId: 't1' });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

describe('firestore rules: teams', () => {
  it('lets members read their team and its records', async () => {
    const db = as(MEMBER);
    await assertSucceeds(getDoc(doc(db, 'teams/t1')));
    await assertSucceeds(getDocs(collection(db, 'teams/t1/ledger')));
    await assertSucceeds(getDocs(collection(db, 'teams/t1/messages')));
    await assertSucceeds(getDocs(query(collection(db, 'teams'), where('memberUids', 'array-contains', MEMBER))));
  });

  it('keeps others out', async () => {
    for (const db of [as(OUTSIDER), as(null)]) {
      await assertFails(getDoc(doc(db, 'teams/t1')));
      await assertFails(getDocs(collection(db, 'teams/t1/ledger')));
      await assertFails(getDocs(collection(db, 'teams/t1/messages')));
      await assertFails(getDocs(query(collection(db, 'teams/t1/versions'), where('kind', '==', 'version'))));
    }
    await assertFails(getDocs(query(collection(as(OUTSIDER), 'teams'), where('memberUids', 'array-contains', MEMBER))));
  });

  it('shows saved versions to members, and drafts only to their author', async () => {
    const member = as(MEMBER);
    await assertSucceeds(getDocs(query(collection(member, 'teams/t1/versions'), where('kind', '==', 'version'))));
    await assertFails(getDoc(doc(member, 'teams/t1/versions/v2')));
    await assertFails(getDocs(collection(member, 'teams/t1/versions')));
    const author = as(OTHER);
    await assertSucceeds(getDoc(doc(author, 'teams/t1/versions/v2')));
    await assertSucceeds(getDocs(query(collection(author, 'teams/t1/versions'), where('authorId', '==', OTHER))));
  });

  it('lets no browser write, and hides invites', async () => {
    const db = as(MEMBER);
    await assertFails(setDoc(doc(db, 'teams/t1'), { name: 'Mine now', memberUids: [MEMBER] }));
    await assertFails(setDoc(doc(db, 'teams/t1/ledger/00000002'), { seq: 2 }));
    await assertFails(setDoc(doc(db, 'teams/t2'), { memberUids: [MEMBER] }));
    await assertFails(getDoc(doc(db, 'teamInvites/tok')));
  });
});
