// Push to devices. Runs against the Firestore emulator (`npm test`); the push
// service is stood in for, so nothing leaves the machine.
import webpush from 'web-push';
import { env } from '$env/dynamic/private';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { adminDb } from '$lib/server/firebase-admin';
import { acceptInvite, createInvite, createTeamFor, runTeamCommand } from './teams';
import { notifyTeam, pushInfo, subscribe, sweepClosingVotes, unsubscribe } from './push';
import type { Sender } from './push';
import { DomainError } from '$lib/team/types';

const LEAD = 'wallet_0x00000000000000000000000000000000000000a1';
const LEVI = 'wallet_0x00000000000000000000000000000000000000b2';
const SHMUEL = 'wallet_0x00000000000000000000000000000000000000c3';

beforeAll(() => {
  // The server reads its settings from $env/dynamic/private, filled once at start.
  const keys = webpush.generateVAPIDKeys();
  Object.assign(env, { VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey, VAPID_SUBJECT: 'mailto:push-test@example.org' });
});

beforeEach(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const project = process.env.GCLOUD_PROJECT;
  if (!host || !project) throw new Error('Run with the Firestore emulator: npm test');
  await fetch(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
});

const errKey = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { if (e instanceof DomainError) return e.key; throw e; }
  return undefined;
};
const device = (n: string) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: 'BPk' + n, auth: 'au' + n } });

/** Levi owns a chapter; Shmuel reviews it; Shmuel has push on two devices. */
async function team() {
  const t = await createTeamFor(LEAD, { name: 'Brachos Group', purpose: '', templateId: 'editorial', you: { name: 'Mendel Katz' } });
  const { token } = await createInvite(t.id, LEAD);
  await acceptInvite(token, LEVI, { name: 'Levi Stern' });
  await acceptInvite(token, SHMUEL, { name: 'Shmuel Gold' });
  const { result: { id: o } } = await runTeamCommand(t.id, LEAD, { type: 'addObjective', title: 'Vol', description: '' });
  const { result: { id: d } } = await runTeamCommand(t.id, LEAD, { type: 'addDeliverable', objectiveId: o!, title: 'Chapter 1', scope: '', reviewerId: SHMUEL });
  await runTeamCommand(t.id, LEVI, { type: 'take', deliverableId: d! });
  await runTeamCommand(t.id, LEVI, { type: 'saveVersion', deliverableId: d!, paragraphs: ['x'], note: 'v1' });
  await subscribe(SHMUEL, device('a'), 'en');
  await subscribe(SHMUEL, device('b'), 'he');
  return { id: t.id, d: d! };
}

describe('push to devices', () => {
  it('turns on per device, with a valid subscription', async () => {
    expect(pushInfo()).toMatchObject({ enabled: true });
    expect(await errKey(subscribe(LEVI, { endpoint: 'http://insecure', keys: { p256dh: 'x', auth: 'y' } }, 'en'))).toBe('err.invalid_input');
    await subscribe(LEVI, device('l'), 'en');
    const snap = await adminDb.collection('pushSubscriptions').where('uid', '==', LEVI).get();
    expect(snap.docs.map(d => d.get('subscription.endpoint'))).toEqual(['https://push.example/l']);
    await unsubscribe(SHMUEL, 'https://push.example/l'); // not his device: nothing happens
    expect((await adminDb.collection('pushSubscriptions').where('uid', '==', LEVI).get()).size).toBe(1);
    await unsubscribe(LEVI, 'https://push.example/l');
    expect((await adminDb.collection('pushSubscriptions').where('uid', '==', LEVI).get()).size).toBe(0);
  });

  it('sends a new review request to the reviewer’s devices once, in each device’s language', async () => {
    const { id, d } = await team();
    const sent: { endpoint: string; body: string; urgent: boolean }[] = [];
    const send: Sender = async (s, p, urgent) => { sent.push({ endpoint: s.endpoint, body: p.body, urgent }); return 201; };
    await runTeamCommand(id, LEVI, { type: 'requestReview', deliverableId: d });
    expect(await notifyTeam(id, send)).toBe(2);
    expect(sent.map(s => [s.endpoint, s.body]).sort()).toEqual([
      ['https://push.example/a', '“Chapter 1” waits for your review'],
      ['https://push.example/b', '„Chapter 1” מחכה לביקורת שלך'],
    ]);
    expect(await notifyTeam(id, send)).toBe(0);
  });

  it('forgets devices the push service no longer knows', async () => {
    const { id, d } = await team();
    await runTeamCommand(id, LEVI, { type: 'requestReview', deliverableId: d });
    await notifyTeam(id, async s => (s.endpoint.endsWith('/a') ? 410 : 201));
    const left = await adminDb.collection('pushSubscriptions').where('uid', '==', SHMUEL).get();
    expect(left.docs.map(x => x.get('subscription.endpoint'))).toEqual(['https://push.example/b']);
  });

  it('reminds voters of votes about to close, from the sweep', async () => {
    const { id } = await team();
    // Over the spend limit (2,000): a vote of all three, open for 72 hours.
    const { result: { id: o } } = await runTeamCommand(id, LEAD, { type: 'addObjective', title: 'Vol 2', description: '' });
    await runTeamCommand(id, LEAD, { type: 'requestMoney', action: { type: 'budget', objectiveId: o!, to: 5000 }, title: 'Budget', why: 'Work' });
    const sent: string[] = [];
    const send: Sender = async (_s, p, urgent) => { if (urgent) sent.push(p.body); return 201; };
    expect(await sweepClosingVotes(send, new Date())).toBe(0); // not within a day yet
    const inTwoDays = new Date(Date.now() + 50 * 3600_000);
    await sweepClosingVotes(send, inTwoDays);
    // Shmuel hasn't voted: both his devices, each in its language. The lead proposed it and has no device.
    expect(sent.sort()).toEqual(['A vote you haven’t cast closes within a day: “Budget”', 'הצבעה שעוד לא הצבעת בה נסגרת תוך יום: „Budget”']);
    sent.length = 0;
    await sweepClosingVotes(send, inTwoDays);
    expect(sent).toEqual([]);
  });
});
