// Bringing a classic campaign into a team (docs/TEAM_BACKEND.md §6d). The
// classic app organised Torah scholarship as campaigns (mivtzaot) →
// assignments (masimot) → tasks (tafkidim). A campaign becomes an
// objective; its unfinished assignments become deliverables, with their
// tasks; people keep what they held where they are on the team. Finished
// assignments were paid in the classic system: they are listed in the
// objective's description and don't touch the team's budget.
//
// Pure: the server reads the classic records and runs the import
// (src/lib/server/classic-import.ts).

import type { Team } from './types';
import { activeMember, can, ruleValue } from './rules';

/** The fields of the classic records the import reads. */
export interface ClassicCampaign {
  id: string;
  shem: string;
  description?: string;
  deadline?: string;
  status?: string;
  tokenAllocation?: number;
  tokensUsed?: number;
}

export interface ClassicAssignment {
  id: string;
  shem: string;
  description?: string;
  type?: string;
  assigneeId?: string;
  reviewerId?: string;
  status?: string;
  tokenAllocation?: number;
  deadline?: string;
  contentUrl?: string;
}

export interface ClassicTask {
  id: string;
  masimaId: string;
  shem: string;
  assigneeId?: string;
  status?: string;
}

export interface ImportedTask { title: string; done: boolean; ownerId?: string }

export interface ImportedDeliverable {
  title: string;
  scope: string;
  reward: number;
  due?: string;
  ownerId?: string;
  reviewerId?: string;
  tasks: ImportedTask[];
}

export interface ImportPlan {
  source: { kind: 'classic'; id: string };
  title: string;
  description: string;
  due?: string;
  deliverables: ImportedDeliverable[];
  /** TMIM the campaign had left: what the team might give it as a budget, by its own decision. */
  budgetLeft: number;
}

/** How much one import may bring: a campaign's worth. */
export const IMPORT_LIMITS = { deliverables: 100, tasks: 30 };

const FINISHED = new Set(['approved', 'published']);
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
const isoDate = (s: string | undefined) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : undefined);

/** The classic campaign as a plan for the team: who is kept is decided by who is on the team now. */
export function classicToPlan(team: Team, campaign: ClassicCampaign, assignments: ClassicAssignment[], tasks: ClassicTask[]): ImportPlan {
  const onTeam = (uid: string | undefined, permission: 'take_work' | 'review_work') =>
    uid && activeMember(team, uid) && can(team, uid, permission) ? uid : undefined;
  const standard = ruleValue(team, 'deliverable_reward');
  const open = assignments.filter(a => !FINISHED.has(a.status ?? ''));
  const finished = assignments.filter(a => FINISHED.has(a.status ?? ''));

  const deliverables = open.slice(0, IMPORT_LIMITS.deliverables).map(a => {
    const scope = [a.description?.trim() ?? '', a.contentUrl ? `Work so far: ${a.contentUrl}` : ''].filter(Boolean).join('\n\n');
    return {
      title: clip(a.shem.trim() || a.id, 200),
      scope: clip(scope, 20_000),
      reward: Number.isInteger(a.tokenAllocation) && (a.tokenAllocation ?? 0) > 0 ? a.tokenAllocation! : standard,
      due: isoDate(a.deadline),
      ownerId: onTeam(a.assigneeId, 'take_work'),
      reviewerId: onTeam(a.reviewerId, 'review_work'),
      tasks: tasks.filter(t => t.masimaId === a.id).slice(0, IMPORT_LIMITS.tasks).map(t => ({
        title: clip(t.shem.trim() || t.id, 200),
        done: t.status === 'approved',
        ownerId: t.assigneeId && activeMember(team, t.assigneeId) ? t.assigneeId : undefined,
      })),
    };
  });

  const intro = campaign.description?.trim() ?? '';
  const description = [
    intro && !/[.!?:׃]$/.test(intro) ? `${intro}.` : intro,
    finished.length ? `Completed in the classic app: ${finished.map(a => a.shem.trim()).join('; ')}.` : '',
  ].filter(Boolean).join('\n\n');

  return {
    source: { kind: 'classic', id: campaign.id },
    title: clip(campaign.shem.trim() || campaign.id, 200),
    description: clip(description, 20_000),
    due: isoDate(campaign.deadline),
    deliverables,
    budgetLeft: Math.max(0, Math.round((campaign.tokenAllocation ?? 0) - (campaign.tokensUsed ?? 0))),
  };
}
