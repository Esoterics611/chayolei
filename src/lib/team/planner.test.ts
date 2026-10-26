import { describe, expect, it } from 'vitest';
import { seedTeams } from './seed';
import { applyCommand } from './commands';
import { objectiveFigures } from './ledger';
import { PLAN_MAX, plannerPrompt, readPlan, samplePlan } from './planner';
import { ruleValue } from './rules';
import type { Team } from './types';
import { DomainError } from './types';

const NOW = '2026-10-25T12:00:00.000Z';
const brachos = (): Team => seedTeams(NOW).teams.find(t => t.id === 'brachos')!;
const vol1 = (team: Team) => team.objectives.find(o => typeof o.title !== 'string' && o.title.en.endsWith('Volume 1'))!;
const errKey = (fn: () => unknown) => {
  try { fn(); } catch (e) { if (e instanceof DomainError) return e.key; throw e; }
  return undefined;
};

describe('the AI planner', () => {
  it('shows the planner the objective, its budget and its deliverables, and nothing about members', () => {
    const team = brachos();
    const o = vol1(team);
    const { system, user } = plannerPrompt(team, o.id, 'he', NOW);
    expect(system).toContain('Write every text in Hebrew.');
    const context = JSON.parse(user.slice(user.indexOf('{')));
    expect(context.objective.title).toBe((o.title as { he: string }).he);
    expect(context.objective.budgetLeftTmim).toBe(objectiveFigures(team, o).left);
    expect(context.standardDeliverableRewardTmim).toBe(ruleValue(team, 'deliverable_reward'));
    expect(context.existingDeliverables.length).toBe(team.deliverables.filter(d => d.objectiveId === o.id).length);
    for (const m of team.members) {
      expect(user).not.toContain(m.wallet);
      expect(user).not.toContain(typeof m.name === 'string' ? m.name : m.name.en);
    }
  });

  it('reads only what it expects from an answer, within the limits', () => {
    const plan = readPlan({
      note: 'Assumes the Mishnah text is settled.',
      deliverables: [
        { title: '  Glossary  ', scope: 'Terms used in chapters 1–5.', reward: 612.4, tasks: ['List terms', '', 7, 'x'.repeat(500)] },
        { title: '', scope: 'untitled is dropped' },
        { title: 'Index', scope: 3, reward: -5, tasks: 'not a list', extra: 'ignored' },
        ...Array.from({ length: 12 }, (_, i) => ({ title: `More ${i}`, scope: '', reward: 1, tasks: [] })),
      ],
    }, 'ai');
    expect(plan.source).toBe('ai');
    expect(plan.deliverables).toHaveLength(PLAN_MAX.deliverables);
    expect(plan.deliverables[0]).toEqual({ title: 'Glossary', scope: 'Terms used in chapters 1–5.', reward: 612, tasks: ['List terms', expect.any(String)] });
    expect(plan.deliverables[0].tasks[1].length).toBe(PLAN_MAX.title);
    expect(plan.deliverables[1]).toEqual({ title: 'Index', scope: '', reward: 0, tasks: [] });
    expect(errKey(() => readPlan('not json', 'ai'))).toBe('err.ai.failed');
    expect(errKey(() => readPlan({ deliverables: [{ scope: 'no title' }] }, 'ai'))).toBe('err.ai.failed');
  });

  it('gives the demo a labelled sample in the member’s language', () => {
    const team = brachos();
    const o = vol1(team);
    const en = samplePlan(team, o.id, 'en');
    expect(en.source).toBe('sample');
    expect(en.deliverables).toHaveLength(4);
    expect(en.deliverables[0].title).toContain((o.title as { en: string }).en);
    expect(en.deliverables.every(d => d.reward % 50 === 0 && d.reward > 0)).toBe(true);
    expect(samplePlan(team, o.id, 'he').deliverables[1].title).toBe('טיוטה שלמה ראשונה');
  });

  it('adds an edited breakdown at once, marked AI-assisted in the plan and the ledger', () => {
    const team = brachos();
    const o = vol1(team);
    const before = { d: team.deliverables.length, t: team.tasks.length, l: team.ledger.length };
    const r = applyCommand(team, 'mendel', {
      type: 'addPlan', objectiveId: o.id, assist: 'planner',
      deliverables: [
        { title: 'Glossary', scope: 'Terms', reward: 600, tasks: ['List terms', 'Define them'] },
        { title: 'Index', scope: 'Of names', tasks: [] },
      ],
    }, NOW);
    const added = team.deliverables.slice(before.d);
    expect(r.id).toBe(added[0].id);
    expect(added.map(d => [d.title, d.reward, d.assist, d.stage])).toEqual([
      ['Glossary', 600, 'planner', 'open'],
      ['Index', ruleValue(team, 'deliverable_reward'), 'planner', 'open'],
    ]);
    expect(team.tasks.slice(before.t).map(x => [x.title, x.deliverableId, x.assist])).toEqual([
      ['List terms', added[0].id, 'planner'],
      ['Define them', added[0].id, 'planner'],
    ]);
    const entries = team.ledger.slice(before.l);
    expect(entries.filter(e => e.kind !== 'anchor').map(e => [e.kind, e.actorId, e.data?.assist])).toEqual([
      ['deliverable_created', 'mendel', 'planner'],
      ['task_created', 'mendel', 'planner'],
      ['task_created', 'mendel', 'planner'],
      ['deliverable_created', 'mendel', 'planner'],
    ]);
  });

  it('adds a plan only for members who may change the plan, and only well formed', () => {
    const team = brachos();
    const o = vol1(team);
    const one = [{ title: 'Glossary', scope: '' }];
    expect(errKey(() => applyCommand(team, 'levi', { type: 'addPlan', objectiveId: o.id, assist: 'planner', deliverables: one }, NOW))).toBe('err.permission.manage_plan');
    const bad = (cmd: Record<string, unknown>) =>
      errKey(() => applyCommand(team, 'mendel', { type: 'addPlan', objectiveId: o.id, deliverables: one, ...cmd } as never, NOW));
    expect(bad({ deliverables: [] })).toBe('err.invalid_input');
    expect(bad({ deliverables: Array(PLAN_MAX.deliverables + 1).fill(one[0]) })).toBe('err.invalid_input');
    expect(bad({ assist: 'oracle' })).toBe('err.invalid_input');
    expect(bad({ deliverables: [{ title: 'X', scope: '', reward: -1 }] })).toBe('err.invalid_input');
    expect(bad({ deliverables: [{ title: 'X', scope: '', tasks: Array(PLAN_MAX.tasks + 1).fill('t') }] })).toBe('err.invalid_input');
    expect(bad({ deliverables: [{ title: '  ', scope: '' }] })).toBe('err.empty');
    expect(bad({ objectiveId: 'nope' })).toBe('err.not_found');
  });
});
