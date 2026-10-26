// The AI planner on the server: asks Claude for a breakdown of an objective
// (src/lib/team/planner.ts says what the planner is for and what it is shown).
// It only reads the team. Nothing is written until a member adds the plan
// with the `addPlan` command, which the engine checks like any other action.

import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import { adminDb } from '$lib/server/firebase-admin';
import { loadTeam, requireMember } from '$lib/server/teams';
import { PLAN_SCHEMA, plannerPrompt, readPlan } from '$lib/team/planner';
import type { PlanSuggestion } from '$lib/team/planner';
import { can } from '$lib/team/rules';
import { DomainError } from '$lib/team/types';
import type { Locale } from '$lib/team/types';

/** Suggestions a team may ask for in a (UTC) day. */
export const AI_DAILY = 40;
const MODEL = 'claude-opus-5-5';

export type Ask = (prompt: { system: string; user: string }) => Promise<unknown>;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new DomainError('err.ai.unavailable');
  return (client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 90_000, maxRetries: 2 }));
}

/** Ask Claude for a plan; resolves to the JSON it answered with. */
export async function askClaude(prompt: { system: string; user: string }, sdk: Anthropic = anthropic()): Promise<unknown> {
  let res: Anthropic.Beta.Messages.BetaMessage;
  try {
    res = await sdk.beta.messages.create({
      model: env.TEAM_AI_MODEL || MODEL,
      max_tokens: 8000,
      // A request the model declines is re-run server-side on the model
      // Anthropic recommends for that case, inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: PLAN_SCHEMA } },
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      console.error('[planner] the API key was refused:', e.status);
      throw new DomainError('err.ai.unavailable');
    }
    if (e instanceof Anthropic.RateLimitError) throw new DomainError('err.ai.busy');
    if (e instanceof Anthropic.APIError) {
      console.error('[planner] request failed:', e.status ?? 'no response', e.message);
      throw new DomainError('err.ai.failed');
    }
    throw e;
  }
  if (res.stop_reason === 'refusal') throw new DomainError('err.ai.declined');
  if (res.stop_reason !== 'end_turn') throw new DomainError('err.ai.failed');
  const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new DomainError('err.ai.failed');
  }
}

/** Count one suggestion against the team's daily allowance. */
async function spendDaily(teamId: string): Promise<void> {
  const ref = adminDb.collection('teams').doc(teamId).collection('system').doc('ai');
  await adminDb.runTransaction(async tx => {
    const day = new Date().toISOString().slice(0, 10);
    const used = (await tx.get(ref)).data() as { day?: string; count?: number } | undefined;
    const count = used?.day === day ? used.count ?? 0 : 0;
    if (count >= AI_DAILY) throw new DomainError('err.ai.limit', { n: AI_DAILY });
    tx.set(ref, { day, count: count + 1 });
  });
}

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
