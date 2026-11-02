import { describe, expect, it } from 'vitest';
import * as E from './engine';
import { seedTeams } from './seed';
import { classicToPlan } from './classic';
import type { ClassicAssignment, ClassicCampaign, ClassicTask } from './classic';
import type { Team } from './types';
import { DomainError } from './types';

const NOW = '2026-10-25T12:00:00.000Z';
const brachos = (): Team => seedTeams(NOW).teams.find(t => t.id === 'brachos')!;
const errKey = (fn: () => unknown) => {
  try { fn(); } catch (e) { if (e instanceof DomainError) return e.key; throw e; }
  return undefined;
};

const CAMPAIGN: ClassicCampaign = { id: 'm1', shem: 'Shabbos sugyos', description: 'Sugyos of Shabbos, chapter 1.', deadline: '2026-12-31', tokenAllocation: 5000, tokensUsed: 1200 };
const ASSIGNMENTS: ClassicAssignment[] = [
  { id: 'a1', shem: 'Sugya 1 notes', description: 'Lecture notes.', assigneeId: 'levi', reviewerId: 'yosef', status: 'in_progress', tokenAllocation: 300, contentUrl: 'https://docs.example/a1' },
  { id: 'a2', shem: 'Sugya 2 notes', assigneeId: 'outsider', status: 'open' },
  { id: 'a3', shem: 'Introduction', status: 'approved', assigneeId: 'shmuel' },
  { id: 'a4', shem: 'Index', status: 'published' },
];
const TASKS: ClassicTask[] = [
  { id: 't1', masimaId: 'a1', shem: 'Outline', status: 'approved', assigneeId: 'levi' },
  { id: 't2', masimaId: 'a1', shem: 'Sources', status: 'todo', assigneeId: 'outsider' },
  { id: 't3', masimaId: 'a3', shem: 'Done long ago', status: 'approved' },
];

describe('bringing in a classic campaign', () => {
  it('maps unfinished assignments to deliverables, keeping people who are on the team', () => {
    const t = brachos();
    const plan = classicToPlan(t, CAMPAIGN, ASSIGNMENTS, TASKS);
    expect(plan).toMatchObject({ source: { kind: 'classic', id: 'm1' }, title: 'Shabbos sugyos', budgetLeft: 3800, due: '2026-12-31T00:00:00.000Z' });
    expect(plan.description).toBe('Sugyos of Shabbos, chapter 1.\n\nCompleted in the classic app: Introduction; Index.');
    expect(plan.deliverables).toEqual([
      {
        title: 'Sugya 1 notes', scope: 'Lecture notes.\n\nWork so far: https://docs.example/a1', reward: 300, due: undefined,
        ownerId: 'levi', reviewerId: 'yosef',
        tasks: [{ title: 'Outline', done: true, ownerId: 'levi' }, { title: 'Sources', done: false, ownerId: undefined }],
      },
      // Someone not on the team: the deliverable opens for the team; the standard reward when none was set.
      { title: 'Sugya 2 notes', scope: '', reward: 1500, due: undefined, ownerId: undefined, reviewerId: undefined, tasks: [] },
    ]);
  });

  it('adds it in one action, once, for a member who may change the plan', () => {
    const t = brachos();
    const plan = classicToPlan(t, CAMPAIGN, ASSIGNMENTS, TASKS);
    expect(errKey(() => E.importPlan(t, 'levi', plan, NOW))).toBe('err.permission.manage_plan');
    const o = E.importPlan(t, 'mendel', plan, NOW);
    expect(o).toMatchObject({ title: 'Shabbos sugyos', budget: 0, ownerId: 'mendel', source: { kind: 'classic', id: 'm1' } });
    const ds = t.deliverables.filter(d => d.objectiveId === o.id);
    expect(ds.map(d => [d.title, d.stage, d.ownerId, d.reviewerId])).toEqual([
      ['Sugya 1 notes', 'assigned', 'levi', 'yosef'],
      ['Sugya 2 notes', 'open', undefined, undefined],
    ]);
    expect(t.tasks.filter(x => x.deliverableId === ds[0].id).map(x => [x.title, x.done])).toEqual([['Outline', true], ['Sources', false]]);
    const entries = t.ledger.filter(e => e.refs.objectiveId === o.id);
    expect(entries.map(e => e.kind)).toEqual(['objective_created', 'deliverable_created', 'assigned', 'task_created', 'task_created', 'deliverable_created']);
    expect(entries.every(e => e.data?.imported === 'classic')).toBe(true);
    expect(entries.find(e => e.kind === 'assigned')!.actorId).toBe('levi');
    expect(errKey(() => E.importPlan(t, 'mendel', plan, NOW))).toBe('err.already_imported');
    // Levi can go on with his deliverable as if he had taken it.
    E.saveVersion(t, 'levi', ds[0].id, ['First notes.'], 'v1', NOW);
    expect(ds[0].stage).toBe('in_progress');
  });
});
