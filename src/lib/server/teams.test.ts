// Runs against the Firestore emulator: `npm test` starts it, runs vitest, stops it.
import { beforeEach, describe, expect, it } from 'vitest';
import { adminDb } from '$lib/server/firebase-admin';
import { acceptInvite, createInvite, createTeamFor, inviteInfo, prepareTeam, runTeamCommand } from './teams';
import { RATE } from './rate-limit';
import type { Command } from '$lib/team/commands';
import { DomainError } from '$lib/team/types';
import type { Team } from '$lib/team/types';
import { memberBalance, objectiveFigures } from '$lib/team/ledger';

const LEAD = 'wallet_0x00000000000000000000000000000000000000a1';
const LEVI = 'wallet_0x00000000000000000000000000000000000000b2';
const SHMUEL = 'wallet_0x00000000000000000000000000000000000000c3';
const STRANGER = 'wallet_0x00000000000000000000000000000000000000d4';

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

/** Run commands in order as one member; return the last result's team. */
async function run(teamId: string, uid: string, ...cmds: Command[]) {
  let last: Awaited<ReturnType<typeof runTeamCommand>> | undefined;
  for (const c of cmds) last = await runTeamCommand(teamId, uid, c);
  return last!;
}

/** An editorial team: the lead, plus Levi and Shmuel joined by invite. */
async function editorialTeam(): Promise<Team> {
  const team = await createTeamFor(LEAD, { name: 'Brachos Translation Group', purpose: 'Translate Brachos', templateId: 'editorial', you: { name: 'Mendel Katz' } });
  const { token } = await createInvite(team.id, LEAD);
  await acceptInvite(token, LEVI, { name: 'Levi Stern' });
  return acceptInvite(token, SHMUEL, { name: 'Shmuel Gold' });
}

describe('teams in Firestore', () => {
  it('starts a team with the signed-in member as founder, stored as core, ledger and versions', async () => {
    const team = await createTeamFor(LEAD, { name: '  Studio X ', purpose: 'Make things', templateId: 'studio', you: { name: 'Ana Silva' } });
    expect(team.live).toBe(true);
    expect(team.members).toMatchObject([{ id: LEAD, name: 'Ana Silva', initials: 'AS', wallet: '0x00000000000000000000000000000000000000a1', roleIds: ['owner'] }]);
    const core = (await adminDb.collection('teams').doc(team.id).get()).data()!;
    expect(core.name).toBe('Studio X');
    expect(core.memberUids).toEqual([LEAD]);
    expect(core.ledgerCount).toBe(1);
    const ledger = await adminDb.collection('teams').doc(team.id).collection('ledger').get();
    expect(ledger.docs.map(d => d.id)).toEqual(['00000001']);
    // Live teams carry no stand-in proofs: settled entries wait for the chain.
    expect(ledger.docs[0].data()).toMatchObject({ kind: 'team_created', tier: 'settled', proof: {} });
  });

  it('refuses bad input to start a team', async () => {
    expect(await errKey(createTeamFor(LEAD, { name: '', templateId: 'studio', you: { name: 'A' } }))).toBe('err.invalid_input');
    expect(await errKey(createTeamFor(LEAD, { name: 'X', templateId: 'nope', you: { name: 'A' } }))).toBe('err.invalid_input');
    expect(await errKey(createTeamFor(LEAD, { name: 'X', templateId: 'studio' }))).toBe('err.invalid_input');
  });

  it('runs the whole work flow through the server and pays on acceptance', async () => {
    const team = await editorialTeam();
    const { result: { id: objectiveId } } = await run(team.id, LEAD, { type: 'addObjective', title: 'Volume 1', description: 'Chapters 1–10' });
    // A budget above the spend limit goes to a vote of all three members.
    const { result: { id: budgetId } } = await run(team.id, LEAD, { type: 'requestMoney', action: { type: 'budget', objectiveId: objectiveId!, to: 10_000 }, title: 'Budget', why: 'Ten chapters' });
    for (const uid of [LEAD, LEVI, SHMUEL]) await run(team.id, uid, { type: 'vote', changeId: budgetId!, choice: 'for' });
    const { result: { id: deliverableId } } = await run(team.id, LEAD, { type: 'addDeliverable', objectiveId: objectiveId!, title: 'Chapter 1', scope: 'Translate', reviewerId: SHMUEL });
    await run(team.id, LEVI,
      { type: 'take', deliverableId: deliverableId! },
      { type: 'saveVersion', deliverableId: deliverableId!, paragraphs: ['First paragraph.'], note: 'v1' });
    const { result: { id: changeId } } = await run(team.id, LEVI, { type: 'requestReview', deliverableId: deliverableId! });
    await run(team.id, SHMUEL, { type: 'comment', changeId: changeId!, body: 'Looks right.', paragraph: 0 }, { type: 'markReviewed', changeId: changeId! });
    const { team: after } = await run(team.id, LEAD, { type: 'acceptAndPay', changeId: changeId! });

    expect(after.deliverables[0].stage).toBe('accepted');
    expect(memberBalance(after, LEVI)).toBe(1200);
    expect(memberBalance(after, SHMUEL)).toBe(100);
    expect(objectiveFigures(after, after.objectives[0]).paid).toBe(1300);
    // The stored ledger matches: one doc per entry, in order.
    const ledger = await adminDb.collection('teams').doc(team.id).collection('ledger').orderBy('seq').get();
    expect(ledger.size).toBe(after.ledger.length);
    expect(ledger.docs.at(-1)!.data()).toMatchObject({ kind: 'accepted_paid', actorId: LEAD });
  });

  it('checks the charter on the server: roles, membership and input', async () => {
    const team = await editorialTeam();
    // Levi is a contributor: he can't plan or approve spending.
    expect(await errKey(runTeamCommand(team.id, LEVI, { type: 'addObjective', title: 'Mine', description: '' }))).toBe('err.permission.manage_plan');
    expect(await errKey(runTeamCommand(team.id, STRANGER, { type: 'addObjective', title: 'X', description: '' }))).toBe('err.not_your_team');
    expect(await errKey(runTeamCommand('no-such-team', LEAD, { type: 'contribute', amount: 1 }))).toBe('err.not_found');
    expect(await errKey(runTeamCommand(team.id, LEAD, { type: 'vote', changeId: 'x', choice: 'maybe' as never }))).toBe('err.invalid_input');
    expect(await errKey(runTeamCommand(team.id, LEAD, { type: 'addObjective', title: 'x'.repeat(201), description: '' }))).toBe('err.invalid_input');
    expect(await errKey(runTeamCommand(team.id, LEAD, { type: 'addTask', deliverableId: 'd', title: 'T', ownerId: STRANGER }))).toBe('err.invalid_input');
  });

  it('keeps drafts private to their author', async () => {
    const team = await editorialTeam();
    const { result: { id: o } } = await run(team.id, LEAD, { type: 'addObjective', title: 'Vol', description: '' });
    const { result: { id: d } } = await run(team.id, LEAD, { type: 'addDeliverable', objectiveId: o!, title: 'Ch', scope: '' });
    await run(team.id, LEVI, { type: 'take', deliverableId: d! });
    const mine = await run(team.id, LEVI, { type: 'saveDraft', deliverableId: d!, paragraphs: ['secret'] });
    expect(mine.team.deliverables[0].versions.map(v => v.kind)).toEqual(['draft']);
    // Anyone else's view of the team leaves the draft out.
    const theirs = await run(team.id, SHMUEL, { type: 'postMessage', ref: { type: 'deliverable', id: d! }, body: 'Hi' });
    expect(theirs.team.deliverables[0].versions).toEqual([]);
    // Saving a version replaces the draft, in Firestore too.
    await run(team.id, LEVI, { type: 'saveVersion', deliverableId: d!, paragraphs: ['public now'], note: 'v1' });
    const versions = await adminDb.collection('teams').doc(team.id).collection('versions').get();
    expect(versions.docs.map(v => v.data().kind)).toEqual(['version']);
  });

  it('serializes concurrent actions: every entry gets its own place in the ledger', async () => {
    const team = await editorialTeam();
    const { result: { id: o } } = await run(team.id, LEAD, { type: 'addObjective', title: 'Vol', description: '' });
    const { result: { id: d } } = await run(team.id, LEAD, { type: 'addDeliverable', objectiveId: o!, title: 'Ch', scope: '' });
    await Promise.all([LEAD, LEVI, SHMUEL, LEAD, LEVI].map((uid, i) =>
      runTeamCommand(team.id, uid, { type: 'postMessage', ref: { type: 'deliverable', id: d! }, body: `message ${i}` })));
    const ledger = await adminDb.collection('teams').doc(team.id).collection('ledger').orderBy('seq').get();
    const seqs = ledger.docs.map(x => x.data().seq as number);
    expect(seqs).toEqual(seqs.map((_, i) => i + 1));
    const core = (await adminDb.collection('teams').doc(team.id).get()).data()!;
    expect(core.ledgerCount).toBe(seqs.length);
    const messages = await adminDb.collection('teams').doc(team.id).collection('messages').get();
    expect(messages.size).toBe(5);
  }, 60_000); // the emulator resolves transaction contention slowly

  it('changes roles by vote, and lets a member leave and come back by invite', async () => {
    const team = await editorialTeam();
    // Shmuel becomes a reviewer too: a role change, decided by all three votes.
    const { result: { id: roles } } = await run(team.id, LEVI, { type: 'proposeRoles', memberId: SHMUEL, to: ['reviewer', 'contributor'], title: 'Shmuel reviews', why: 'Speed' });
    for (const uid of [LEAD, LEVI, SHMUEL]) await run(team.id, uid, { type: 'vote', changeId: roles!, choice: 'for' });
    let core = (await adminDb.collection('teams').doc(team.id).get()).data()!;
    expect(core.members.find((m: { id: string }) => m.id === SHMUEL).roleIds).toEqual(['reviewer', 'contributor']);
    expect(await errKey(runTeamCommand(team.id, LEAD, { type: 'proposeRoles', memberId: LEVI, to: ['owner'], title: 'x', why: 'y' }))).toBe('err.invalid_input');

    // Levi takes a deliverable, then leaves: it reopens, and he loses access.
    const { result: { id: o } } = await run(team.id, LEAD, { type: 'addObjective', title: 'Vol', description: '' });
    const { result: { id: d } } = await run(team.id, LEAD, { type: 'addDeliverable', objectiveId: o!, title: 'Ch', scope: '' });
    await run(team.id, LEVI, { type: 'take', deliverableId: d! });
    await run(team.id, LEVI, { type: 'leave' });
    core = (await adminDb.collection('teams').doc(team.id).get()).data()!;
    expect(core.memberUids).toEqual([LEAD, SHMUEL]);
    expect(core.members.find((m: { id: string }) => m.id === LEVI)).toMatchObject({ roleIds: [] });
    expect(core.deliverables[0]).toMatchObject({ stage: 'open' });
    expect(core.deliverables[0].ownerId).toBeUndefined();
    expect(await errKey(runTeamCommand(team.id, LEVI, { type: 'postMessage', ref: { type: 'deliverable', id: d! }, body: 'still here?' }))).toBe('err.not_your_team');

    // A new invite brings him back as the same member, with the joiner role.
    const { token } = await createInvite(team.id, LEAD);
    const back = await acceptInvite(token, LEVI, { name: 'Levi Stern' });
    expect(back.members.filter(m => m.id === LEVI)).toMatchObject([{ roleIds: ['contributor'] }]);
    expect(back.members.find(m => m.id === LEVI)!.leftAt).toBeUndefined();
    core = (await adminDb.collection('teams').doc(team.id).get()).data()!;
    expect(core.memberUids).toContain(LEVI);
    expect(back.ledger.slice(-1)[0]).toMatchObject({ kind: 'member_joined', actorId: LEVI });
  });

  it('limits new teams per account and for the platform, invite links and joins per team, per day', async () => {
    const saved = { ...RATE };
    try {
      Object.assign(RATE, { teamsPerAccount: 2, teamsPlatform: 3, invitesPerTeam: 2, joinsPerTeam: 1 });
      const start = (uid: string) => createTeamFor(uid, { name: 'T', purpose: '', templateId: 'blank', you: { name: 'A' } });
      const team = await start(LEAD);
      await start(LEAD);
      expect(await errKey(prepareTeam(LEAD, {}))).toBe('err.limit.teams');
      expect(await errKey(start(LEAD))).toBe('err.limit.teams');
      await start(LEVI);
      expect(await errKey(start(SHMUEL))).toBe('err.limit.teamsPlatform');

      const { token } = await createInvite(team.id, LEAD);
      await createInvite(team.id, LEAD);
      expect(await errKey(createInvite(team.id, LEAD))).toBe('err.limit.invites');
      await acceptInvite(token, SHMUEL, { name: 'Shmuel' });
      // Opening the link again is free; someone new is over today's joins.
      await acceptInvite(token, SHMUEL, { name: 'Shmuel' });
      expect(await errKey(acceptInvite(token, STRANGER, { name: 'S' }))).toBe('err.limit.joins');
      // Tomorrow is a new day.
      const day = adminDb.collection('rateLimits').doc(`joins:${team.id}`);
      await day.update({ day: '2000-01-01' });
      await acceptInvite(token, STRANGER, { name: 'S' });
    } finally {
      Object.assign(RATE, saved);
    }
  });

  it('admits people through an invite link made by a member who may admit', async () => {
    const team = await createTeamFor(LEAD, { name: 'Radio', purpose: 'Community radio', templateId: 'editorial', you: { name: 'Ada' } });
    const { token } = await createInvite(team.id, LEAD);
    const info = await inviteInfo(token);
    expect(info).toMatchObject({ name: 'Radio', purpose: 'Community radio', memberCount: 1, usable: true, joinerRoleIds: ['contributor'] });
    expect(info.rules.spend_limit).toBe(2000);

    const joined = await acceptInvite(token, LEVI, { name: 'Levi Stern' });
    expect(joined.members.find(m => m.id === LEVI)).toMatchObject({ roleIds: ['contributor'], initials: 'LS' });
    // Opening the link again changes nothing.
    await acceptInvite(token, LEVI, { name: 'Levi Stern' });
    expect((await inviteInfo(token)).memberCount).toBe(2);

    // A contributor may not admit people.
    expect(await errKey(createInvite(team.id, LEVI))).toBe('err.permission.admit');
    expect(await errKey(createInvite(team.id, STRANGER))).toBe('err.not_your_team');
    expect(await errKey(inviteInfo('nope'))).toBe('err.invite_invalid');

    // Expired links don't work.
    await adminDb.collection('teamInvites').doc(token).update({ expiresAt: '2000-01-01T00:00:00.000Z' });
    expect(await errKey(acceptInvite(token, SHMUEL, { name: 'Shmuel' }))).toBe('err.invite_invalid');
    expect((await inviteInfo(token)).usable).toBe(false);
  });
});
