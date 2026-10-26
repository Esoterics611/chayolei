// The AI planner's server side. Runs against the Firestore emulator (`npm test`);
// Claude is stood in for by a local HTTP server, so no key or network is needed.
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import Anthropic from '@anthropic-ai/sdk';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { adminDb } from '$lib/server/firebase-admin';
import { acceptInvite, createInvite, createTeamFor, runTeamCommand } from './teams';
import { AI_DAILY, askClaude, suggestPlan } from './planner';
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

const ANSWER = {
  note: 'Assumes one translator per chapter.',
  deliverables: [
    { title: 'Chapter 1 translation', scope: 'Mishnah and English, reviewed.', reward: 1200, tasks: ['Translate', 'Annotate'] },
    { title: 'Glossary', scope: 'Terms used across the volume.', reward: 400, tasks: [] },
  ],
};

async function teamWithObjective() {
  const team = await createTeamFor(LEAD, { name: 'Brachos Group', purpose: 'Translate Brachos', templateId: 'editorial', you: { name: 'Mendel Katz' } });
  const { token } = await createInvite(team.id, LEAD);
  await acceptInvite(token, LEVI, { name: 'Levi Stern' });
  const { result } = await runTeamCommand(team.id, LEAD, { type: 'addObjective', title: 'Volume 1', description: 'Chapters 1–9' });
  return { teamId: team.id, objectiveId: result.id! };
}

describe('suggestPlan', () => {
  it('asks with the objective and returns the checked suggestion, writing nothing to the team', async () => {
    const { teamId, objectiveId } = await teamWithObjective();
    let asked = '';
    const plan = await suggestPlan(teamId, LEAD, { objectiveId, locale: 'en' }, async p => { asked = p.user; return ANSWER; });
    expect(asked).toContain('"title": "Volume 1"');
    expect(asked).not.toContain('Mendel');
    expect(plan).toEqual({ ...ANSWER, source: 'ai' });
    const core = (await adminDb.collection('teams').doc(teamId).get()).data()!;
    expect(core.deliverables).toEqual([]);

    // The lead edits it and adds it; the plan shows it as AI-assisted.
    const { team } = await runTeamCommand(teamId, LEAD, {
      type: 'addPlan', objectiveId, assist: 'planner',
      deliverables: [{ ...plan.deliverables[0], title: 'Chapter 1: translation and notes' }],
    });
    expect(team.deliverables.map(d => [d.title, d.assist])).toEqual([['Chapter 1: translation and notes', 'planner']]);
    expect(team.tasks.map(t => t.assist)).toEqual(['planner', 'planner']);
  });

  it('is only for members who may change the plan', async () => {
    const { teamId, objectiveId } = await teamWithObjective();
    const ask = async () => ANSWER;
    expect(await errKey(suggestPlan(teamId, STRANGER, { objectiveId }, ask))).toBe('err.not_your_team');
    expect(await errKey(suggestPlan(teamId, LEVI, { objectiveId }, ask))).toBe('err.permission.manage_plan');
    expect(await errKey(suggestPlan(teamId, LEAD, { objectiveId: 'nope' }, ask))).toBe('err.not_found');
    expect(await errKey(suggestPlan(teamId, LEAD, {}, ask))).toBe('err.invalid_input');
  });

  it('allows a team a number of suggestions a day', async () => {
    const { teamId, objectiveId } = await teamWithObjective();
    const ask = async () => ANSWER;
    await suggestPlan(teamId, LEAD, { objectiveId }, ask);
    const ref = adminDb.collection('teams').doc(teamId).collection('system').doc('ai');
    expect((await ref.get()).data()).toEqual({ day: new Date().toISOString().slice(0, 10), count: 1 });
    await ref.set({ day: new Date().toISOString().slice(0, 10), count: AI_DAILY });
    expect(await errKey(suggestPlan(teamId, LEAD, { objectiveId }, ask))).toBe('err.ai.limit');
    await ref.set({ day: '2000-01-01', count: AI_DAILY });
    await expect(suggestPlan(teamId, LEAD, { objectiveId }, ask)).resolves.toMatchObject({ source: 'ai' });
  });
});

// ── askClaude, against a stand-in for the Messages API ─────────────

let server: Server;
let reply: (req: IncomingMessage, body: Record<string, unknown>, res: ServerResponse) => void;
const seen: { url?: string; headers: IncomingMessage['headers']; body: Record<string, unknown> }[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      const body = JSON.parse(data || '{}');
      seen.push({ url: req.url, headers: req.headers, body });
      reply(req, body, res);
    });
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
});
afterAll(() => new Promise<void>(r => server.close(() => r())));

const sdk = () => new Anthropic({ apiKey: 'test-key', baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, maxRetries: 0 });
const message = (over: Record<string, unknown>) => ({
  id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 10 }, content: [{ type: 'text', text: JSON.stringify(ANSWER) }], ...over,
});
const send = (status: number, json: unknown) => (_req: IncomingMessage, _body: unknown, res: ServerResponse) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(json));
};
const PROMPT = { system: 'You are the planner.', user: 'Plan this objective.' };

describe('askClaude', () => {
  it('asks for the plan as structured output, with the refusal fallback on', async () => {
    seen.length = 0;
    reply = send(200, message({}));
    expect(await askClaude(PROMPT, sdk())).toEqual(ANSWER);
    const [req] = seen;
    expect(req.url).toContain('/v1/messages');
    expect(String(req.headers['anthropic-beta'])).toContain('server-side-fallback-2026-07-01');
    expect(req.body).toMatchObject({
      model: 'claude-opus-5-5',
      fallbacks: 'default',
      system: PROMPT.system,
      messages: [{ role: 'user', content: PROMPT.user }],
      output_config: { effort: 'medium', format: { type: 'json_schema' } },
    });
    expect(req.body).not.toHaveProperty('thinking');
    expect(req.body).not.toHaveProperty('temperature');
  });

  it('explains what went wrong in words the UI has', async () => {
    reply = send(200, message({ stop_reason: 'refusal', content: [] }));
    expect(await errKey(askClaude(PROMPT, sdk()))).toBe('err.ai.declined');
    reply = send(200, message({ stop_reason: 'max_tokens' }));
    expect(await errKey(askClaude(PROMPT, sdk()))).toBe('err.ai.failed');
    reply = send(200, message({ content: [{ type: 'text', text: 'Here is a plan:' }] }));
    expect(await errKey(askClaude(PROMPT, sdk()))).toBe('err.ai.failed');
    reply = send(429, { type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } });
    expect(await errKey(askClaude(PROMPT, sdk()))).toBe('err.ai.busy');
    reply = send(401, { type: 'error', error: { type: 'authentication_error', message: 'bad key' } });
    expect(await errKey(askClaude(PROMPT, sdk()))).toBe('err.ai.unavailable');
    reply = send(529, { type: 'error', error: { type: 'overloaded_error', message: 'overloaded' } });
    expect(await errKey(askClaude(PROMPT, sdk()))).toBe('err.ai.failed');
  });
});
