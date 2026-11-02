// The AI planner on the server: asks Claude for a breakdown of an objective
// (src/lib/team/planner.ts says what the planner is for and what it is shown).
// It only reads the team. Nothing is written until a member adds the plan
// with the `addPlan` command, which the engine checks like any other action.

import type Anthropic from '@anthropic-ai/sdk';
import { loadTeam, requireMember } from '$lib/server/teams';
import { AI_DAILY, anthropic, askJson, spendDaily } from '$lib/server/ai';
import { PLAN_SCHEMA, plannerPrompt, readPlan } from '$lib/team/planner';
import type { PlanSuggestion } from '$lib/team/planner';
import { can } from '$lib/team/rules';
import { DomainError } from '$lib/team/types';
import type { Locale } from '$lib/team/types';

export { AI_DAILY };

export type Ask = (prompt: { system: string; user: string }) => Promise<unknown>;

/** Ask Claude for a plan; resolves to the JSON it answered with. */
export const askClaude = (prompt: { system: string; user: string }, sdk?: Anthropic): Promise<unknown> =>
  askJson(prompt, PLAN_SCHEMA, 'planner', sdk ?? anthropic());

/** The planner's suggestion for one of the team's objectives, for a member
 *  who may change the plan (only they can add it). */
export async function suggestPlan(
  teamId: string, uid: string, input: { objectiveId?: unknown; locale?: unknown }, ask: Ask = askClaude,
): Promise<PlanSuggestion> {
  if (typeof input.objectiveId !== 'string') throw new DomainError('err.invalid_input');
  const locale: Locale = input.locale === 'he' ? 'he' : 'en';
  const team = await loadTeam(teamId);
  requireMember(team, uid);
  if (!can(team, uid, 'manage_plan')) throw new DomainError('err.permission.manage_plan');
  const prompt = plannerPrompt(team, input.objectiveId, locale, new Date().toISOString());
  await spendDaily(teamId);
  return readPlan(await ask(prompt), 'ai');
}
