// Bringing the classic app's campaigns into teams (docs/TEAM_BACKEND.md §6d).
// A member who may change a team's plan sees the classic campaigns they
// started or joined, and brings one in: the server reads the campaign, its
// assignments and tasks from the classic collections, maps them
// (src/lib/team/classic.ts) and adds them to the team in one action.

import { adminDb } from '$lib/server/firebase-admin';
import { importIntoTeam, loadTeam, requireMember } from '$lib/server/teams';
import { classicToPlan } from '$lib/team/classic';
import type { ClassicAssignment, ClassicCampaign, ClassicTask } from '$lib/team/classic';
import { can } from '$lib/team/rules';
import { DomainError } from '$lib/team/types';
import type { Team } from '$lib/team/types';

export interface CampaignChoice {
  id: string;
  title: string;
  status: string;
  assignments: number;
  budgetLeft: number;
  /** Already brought into this team: its objective. */
  objectiveId?: string;
}

async function planner(teamId: string, uid: string): Promise<Team> {
  const team = await loadTeam(teamId);
  requireMember(team, uid);
  if (!can(team, uid, 'manage_plan')) throw new DomainError('err.permission.manage_plan');
  return team;
}

const campaignOf = (id: string, data: FirebaseFirestore.DocumentData): ClassicCampaign & { creatorId?: string; enrolledIds?: string[]; masimotCount?: number } =>
  ({ id, ...data } as ClassicCampaign & { creatorId?: string; enrolledIds?: string[]; masimotCount?: number });

/** The classic campaigns `uid` started or joined, for a team they may plan. */
export async function classicCampaigns(teamId: string, uid: string): Promise<CampaignChoice[]> {
  const team = await planner(teamId, uid);
  const col = adminDb.collection('mivtzaot');
  const [started, joined] = await Promise.all([
    col.where('creatorId', '==', uid).get(),
    col.where('enrolledIds', 'array-contains', uid).get(),
  ]);
  const seen = new Map<string, CampaignChoice>();
  for (const d of [...started.docs, ...joined.docs]) {
    if (seen.has(d.id)) continue;
    const c = campaignOf(d.id, d.data());
    seen.set(d.id, {
      id: d.id, title: String(c.shem ?? d.id), status: String(c.status ?? ''), assignments: Number(c.masimotCount ?? 0),
      budgetLeft: Math.max(0, Math.round((c.tokenAllocation ?? 0) - (c.tokensUsed ?? 0))),
      objectiveId: team.objectives.find(o => o.source?.kind === 'classic' && o.source.id === d.id)?.id,
    });
  }
  return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/** Bring one of `uid`'s classic campaigns into the team. */
export async function importCampaign(teamId: string, uid: string, mivtzaId: unknown) {
  if (typeof mivtzaId !== 'string' || !mivtzaId || mivtzaId.length > 120) throw new DomainError('err.invalid_input');
  const team = await planner(teamId, uid);
  const snap = await adminDb.collection('mivtzaot').doc(mivtzaId).get();
  if (!snap.exists) throw new DomainError('err.not_found');
  const campaign = campaignOf(snap.id, snap.data()!);
  if (campaign.creatorId !== uid && !(campaign.enrolledIds ?? []).includes(uid)) throw new DomainError('err.not_found');
  const [masimot, tafkidim] = await Promise.all([
    adminDb.collection('masimot').where('mivtzaId', '==', mivtzaId).get(),
    adminDb.collection('tafkidim').where('mivtzaId', '==', mivtzaId).get(),
  ]);
  const assignments = masimot.docs.map(d => ({ id: d.id, ...d.data() }) as ClassicAssignment)
    .sort((a, b) => String((a as { createdAt?: string }).createdAt ?? '').localeCompare(String((b as { createdAt?: string }).createdAt ?? '')));
  const tasks = tafkidim.docs.map(d => ({ id: d.id, ...d.data() }) as ClassicTask);
  const plan = classicToPlan(team, campaign, assignments, tasks);
  const { objectiveId, team: after } = await importIntoTeam(teamId, uid, plan);
  return { objectiveId, budgetLeft: plan.budgetLeft, team: after };
}
