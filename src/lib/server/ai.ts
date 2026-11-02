// The AI helpers' connection to Claude (docs/TEAM_BACKEND.md §6a): one
// client, one way to ask for structured output, one way to search the web,
// one way to explain failures, and one daily allowance per team shared by
// every helper. The helpers only read the team; nothing they answer is
// written until a member keeps it.

import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import { adminDb } from '$lib/server/firebase-admin';
import { DomainError } from '$lib/team/types';

/** Suggestions a team may ask for in a (UTC) day, across all helpers. */
export const AI_DAILY = 40;
const MODEL = 'claude-opus-5-5';

export type Prompt = { system: string; user: string };

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new DomainError('err.ai.unavailable');
  return (client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 120_000, maxRetries: 2 }));
}

/** The request every helper makes: the current model, and a declined request
 *  re-run server-side on the model Anthropic recommends for that case. */
const base = (prompt: Prompt, effort: 'low' | 'medium' | 'high') => ({
  model: env.TEAM_AI_MODEL || MODEL,
  max_tokens: 8000,
  betas: ['server-side-fallback-2026-07-01'] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: 'default' as const,
  system: prompt.system,
  messages: [{ role: 'user' as const, content: prompt.user }],
  effort,
});

/** Turn the SDK's errors into refusals the UI can explain. */
function explain(e: unknown, who: string): never {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    console.error(`[${who}] the API key was refused:`, e.status);
    throw new DomainError('err.ai.unavailable');
  }
  if (e instanceof Anthropic.RateLimitError) throw new DomainError('err.ai.busy');
  if (e instanceof Anthropic.APIError) {
    console.error(`[${who}] request failed:`, e.status ?? 'no response', e.message);
    throw new DomainError('err.ai.failed');
  }
  throw e;
}

function finished(res: Anthropic.Beta.Messages.BetaMessage): void {
  if (res.stop_reason === 'refusal') throw new DomainError('err.ai.declined');
  if (res.stop_reason !== 'end_turn') throw new DomainError('err.ai.failed');
}

/** Ask for an answer in a JSON schema; resolves to the JSON. */
export async function askJson(prompt: Prompt, schema: Record<string, unknown>, who: string, sdk: Anthropic = anthropic()): Promise<unknown> {
  const { effort, ...req } = base(prompt, 'medium');
  let res: Anthropic.Beta.Messages.BetaMessage;
  try {
    res = await sdk.beta.messages.create({ ...req, output_config: { effort, format: { type: 'json_schema', schema } } });
  } catch (e) {
    explain(e, who);
  }
  finished(res);
  const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new DomainError('err.ai.failed');
  }
}

export interface Cited { title: string; url: string; why: string }

/**
 * Ask with web search, and return what the answer cites: each cited search
 * result with the sentence that cites it. Only results the search actually
 * returned can come back, so no link is made up.
 */
export async function askCited(prompt: Prompt, who: string, sdk: Anthropic = anthropic()): Promise<Cited[]> {
  const { effort, ...req } = base(prompt, 'medium');
  const params = { ...req, output_config: { effort }, tools: [{ type: 'web_search_20260209' as const, name: 'web_search' as const, max_uses: 5 }] };
  let res: Anthropic.Beta.Messages.BetaMessage;
  try {
    res = await sdk.beta.messages.create(params);
    // A long search can pause the turn; send it back as it is to let it finish.
    for (let i = 0; res.stop_reason === 'pause_turn' && i < 2; i++) {
      res = await sdk.beta.messages.create({
        ...params,
        messages: [...params.messages, { role: 'assistant', content: res.content as Anthropic.Beta.Messages.BetaContentBlockParam[] }],
      });
    }
  } catch (e) {
    explain(e, who);
  }
  finished(res);
  const found = new Set<string>();
  for (const b of res.content) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const r of b.content) found.add(r.url);
  }
  const out: Cited[] = [];
  for (const b of res.content) {
    if (b.type !== 'text' || !b.citations) continue;
    for (const c of b.citations) {
      if (c.type !== 'web_search_result_location') continue;
      if (found.size && !found.has(c.url)) continue;
      const known = out.find(x => x.url === c.url);
      if (known) continue;
      out.push({ title: c.title ?? '', url: c.url, why: b.text.trim() });
    }
  }
  return out;
}

/** Count one suggestion against the team's daily allowance. */
export async function spendDaily(teamId: string): Promise<void> {
  const ref = adminDb.collection('teams').doc(teamId).collection('system').doc('ai');
  await adminDb.runTransaction(async tx => {
    const day = new Date().toISOString().slice(0, 10);
    const used = (await tx.get(ref)).data() as { day?: string; count?: number } | undefined;
    const count = used?.day === day ? used.count ?? 0 : 0;
    if (count >= AI_DAILY) throw new DomainError('err.ai.limit', { n: AI_DAILY });
    tx.set(ref, { day, count: count + 1 });
  });
}
