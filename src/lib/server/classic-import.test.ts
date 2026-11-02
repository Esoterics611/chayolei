// Bringing classic campaigns into teams. Runs against the Firestore emulator (`npm test`).
import { beforeEach, describe, expect, it } from 'vitest';
import { adminDb } from '$lib/server/firebase-admin';
import { acceptInvite, createInvite, createTeamFor, runTeamCommand } from './teams';
import { classicCampaigns, importCampaign } from './classic-import';
import { DomainError } from '$lib/team/types';

const LEAD = 'wallet_0x00000000000000000000000000000000000000a1';
const LEVI = 'wallet_0x00000000000000000000000000000000000000b2';
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

/** Classic records as the classic API writes them: the lead's campaign with Levi enrolled, and a stranger's. */
async function classic() {
  const now = new Date().toISOString();
  await adminDb.collection('mivtzaot').doc('m1').set({ shem: 'Shabbos sugyos', description: 'Chapter 1', creatorId: LEAD, enrolledIds: [LEAD, LEVI], status: 'active', tokenAllocation: 4000, tokensUsed: 500, masimotCount: 2, createdAt: now, updatedAt: now });
  await adminDb.collection('mivtzaot').doc('m2').set({ shem: 'Someone else’s', creatorId: STRANGER, enrolledIds: [STRANGER], status: 'active', tokenAllocation: 0, tokensUsed: 0, masimotCount: 0, createdAt: now, updatedAt: now });
  await adminDb.collection('masimot').doc('a1').set({ shem: 'Sugya 1', description: 'Notes', mivtzaId: 'm1', assigneeId: LEVI, status: 'in_progress', tokenAllocation: 300, createdAt: now });
  await adminDb.collection('masimot').doc('a2').set({ shem: 'Introduction', mivtzaId: 'm1', status: 'approved', tokenAllocation: 200, createdAt: now });
  await adminDb.collection('tafkidim').doc('t1').set({ shem: 'Outline', masimaId: 'a1', mivtzaId: 'm1', assigneeId: LEVI, status: 'approved', createdAt: now });
}

async function team() {
  const t = await createTeamFor(LEAD, { name: 'Brachos Group', purpose: '', templateId: 'editorial', you: { name: 'Mendel Katz' } });
  const { token } = await createInvite(t.id, LEAD);
  await acceptInvite(token, LEVI, { name: 'Levi Stern' });
  return t.id;
}

describe('classic campaigns', () => {
  it('lists the campaigns the member started or joined, and brings one in once', async () => {
    await classic();
    const id = await team();
    const list = await classicCampaigns(id, LEAD);
    expect(list).toEqual([{ id: 'm1', title: 'Shabbos sugyos', status: 'active', assignments: 2, budgetLeft: 3500 }]);

    const r = await importCampaign(id, LEAD, 'm1');
    expect(r.budgetLeft).toBe(3500);
    const o = r.team.objectives.find(x => x.id === r.objectiveId)!;
    expect(o).toMatchObject({ title: 'Shabbos sugyos', budget: 0, source: { kind: 'classic', id: 'm1' } });
    expect(o.description).toContain('Completed in the classic app: Introduction.');
    expect(r.team.deliverables.map(d => [d.title, d.stage, d.ownerId])).toEqual([['Sugya 1', 'assigned', LEVI]]);
    expect(r.team.tasks.map(x => [x.title, x.done])).toEqual([['Outline', true]]);
    expect((await classicCampaigns(id, LEAD))[0].objectiveId).toBe(r.objectiveId);
    expect(await errKey(importCampaign(id, LEAD, 'm1'))).toBe('err.already_imported');

    // Levi goes on with it in the team.
    const d = r.team.deliverables[0].id;
    const { team: after } = await runTeamCommand(id, LEVI, { type: 'saveVersion', deliverableId: d, paragraphs: ['Notes.'], note: 'v1' });
    expect(after.deliverables.find(x => x.id === d)!.stage).toBe('in_progress');
  });

  it('is only for members who may plan, and only for their own campaigns', async () => {
    await classic();
    const id = await team();
    expect(await errKey(classicCampaigns(id, LEVI))).toBe('err.permission.manage_plan');
    expect(await errKey(importCampaign(id, LEVI, 'm1'))).toBe('err.permission.manage_plan');
    expect(await errKey(importCampaign(id, LEAD, 'm2'))).toBe('err.not_found');
    expect(await errKey(importCampaign(id, LEAD, 'nope'))).toBe('err.not_found');
    expect(await errKey(classicCampaigns(id, STRANGER))).toBe('err.not_your_team');
  });
});
