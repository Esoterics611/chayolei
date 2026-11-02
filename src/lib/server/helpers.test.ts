// The first-pass reviewer, summarizer and source finder on the server. Runs
// against the Firestore emulator (`npm test`); Claude is stood in for, so no
// key or network is needed.
import { createServer } from 'node:http';
import type { Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import Anthropic from '@anthropic-ai/sdk';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { adminDb } from '$lib/server/firebase-admin';
import { acceptInvite, createInvite, createTeamFor, runTeamCommand } from './teams';
import { findSources, firstPassReview, summarizeThread } from './helpers';
import { askCited } from './ai';
import { DomainError } from '$lib/team/types';

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

/** Levi has put v1 of a chapter up for review; Shmuel reviews it; three thread messages. */
async function chapterInReview() {
  const team = await createTeamFor(LEAD, { name: 'Brachos Group', purpose: 'Translate Brachos', templateId: 'editorial', you: { name: 'Mendel Katz' } });
  const { token } = await createInvite(team.id, LEAD);
  await acceptInvite(token, LEVI, { name: 'Levi Stern' });
  await acceptInvite(token, SHMUEL, { name: 'Shmuel Gold' });
  const id = team.id;
  const { result: { id: o } } = await runTeamCommand(id, LEAD, { type: 'addObjective', title: 'Volume 1', description: '' });
  const { result: { id: d } } = await runTeamCommand(id, LEAD, { type: 'addDeliverable', objectiveId: o!, title: 'Chapter 1', scope: 'Mishnah 1:1 in English', reviewerId: SHMUEL });
  await runTeamCommand(id, LEVI, { type: 'take', deliverableId: d! });
  await runTeamCommand(id, LEVI, { type: 'saveVersion', deliverableId: d!, paragraphs: ['From when may one recite the Shema?', 'The Sages say: until midnight.'], note: 'v1' });
  const { result: { id: c } } = await runTeamCommand(id, LEVI, { type: 'requestReview', deliverableId: d! });
  for (const [uid, body] of [[LEVI, 'Is “midnight” right here?'], [SHMUEL, 'Yes, chatzos.'], [LEAD, 'Agreed, keep it.']] as const) {
    await runTeamCommand(id, uid, { type: 'postMessage', ref: { type: 'deliverable', id: d! }, body });
  }
  return { id, d: d!, c: c! };
}

const spent = async (teamId: string) => (await adminDb.collection('teams').doc(teamId).collection('system').doc('ai').get()).get('count');

describe('first-pass review', () => {
  it('reads the version for its reviewer; the kept notes become AI-assisted comments', async () => {
    const { id, c } = await chapterInReview();
    let asked = '';
    const notes = await firstPassReview(id, SHMUEL, { changeId: c, locale: 'en' }, async p => {
      asked = p.user;
      return { summary: 'One question.', notes: [{ paragraph: 2, kind: 'question', text: 'Midnight or dawn?' }] };
    });
    expect(asked).toContain('The Sages say: until midnight.');
    expect(asked).not.toMatch(/Levi|Shmuel|Mendel|0x0000/);
    expect(notes).toEqual({ summary: 'One question.', notes: [{ paragraph: 1, kind: 'question', text: 'Midnight or dawn?' }], source: 'ai' });
    expect(await spent(id)).toBe(1);
    const { team } = await runTeamCommand(id, SHMUEL, { type: 'comment', changeId: c, body: notes.notes[0].text, paragraph: 1, assist: 'reviewer' });
    expect(team.changes.find(x => x.id === c)!.kind === 'work' && (team.changes.find(x => x.id === c) as { comments: unknown[] }).comments).toMatchObject([{ assist: 'reviewer', paragraph: 1 }]);
  });

  it('is only for the round’s reviewer or approver', async () => {
    const { id, c } = await chapterInReview();
    const ask = async () => ({ summary: '', notes: [] });
    expect(await errKey(firstPassReview(id, LEVI, { changeId: c }, ask))).toBe('err.not_reviewer');
    expect(await errKey(firstPassReview(id, STRANGER, { changeId: c }, ask))).toBe('err.not_your_team');
    expect(await errKey(firstPassReview(id, SHMUEL, {}, ask))).toBe('err.invalid_input');
    expect(await spent(id)).toBeUndefined();
  });
});

describe('summaries', () => {
  it('send people as labels and give their names back', async () => {
    const { id, d } = await chapterInReview();
    let asked = '';
    const s = await summarizeThread(id, LEVI, { ref: { type: 'deliverable', id: d }, locale: 'en' }, async p => {
      asked = p.user;
      return { summary: 'P1 asked about midnight; P2 and P3 agreed to keep it.', decisions: ['Keep “midnight”.'], open: [] };
    });
    expect(asked).not.toMatch(/Levi|Shmuel|Mendel|0x0000/);
    expect(asked).toContain('"by": "P3"');
    expect(s.summary).toBe('Levi asked about midnight; Shmuel and Mendel agreed to keep it.');
    expect(await errKey(summarizeThread(id, LEVI, { ref: { type: 'nope', id: d } }, async () => ({})))).toBe('err.invalid_input');
  });
});

describe('sources', () => {
  it('are found for the owner, from the web search’s citations', async () => {
    const { id, d } = await chapterInReview();
    const s = await findSources(id, LEVI, { deliverableId: d }, async p => {
      expect(p.user).toContain('Mishnah 1:1 in English');
      return [{ title: 'Sefaria', url: 'https://www.sefaria.org/Mishnah_Berakhot.1.1', why: 'The Mishnah with translations.' }];
    });
    expect(s).toEqual({ sources: [{ title: 'Sefaria', url: 'https://www.sefaria.org/Mishnah_Berakhot.1.1', why: 'The Mishnah with translations.' }], source: 'ai' });
    expect(await errKey(findSources(id, SHMUEL, { deliverableId: d }, async () => []))).toBe('err.not_owner');
  });
});

// ── askCited, against a stand-in for the Messages API ─────────────

let server: Server;
let reply: (body: Record<string, unknown>, res: ServerResponse) => void;
const seen: Record<string, unknown>[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => { const body = JSON.parse(data || '{}'); seen.push(body); reply(body, res); });
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
});
afterAll(() => new Promise<void>(r => server.close(() => r())));

const sdk = () => new Anthropic({ apiKey: 'test-key', baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, maxRetries: 0 });
const send = (json: unknown) => (_body: unknown, res: ServerResponse) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(json));
};
const SEARCHED = {
  id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 10 },
  content: [
    { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: { query: 'Mishnah Berakhot 1:1 translation' } },
    {
      type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1',
      content: [
        { type: 'web_search_result', url: 'https://www.sefaria.org/Mishnah_Berakhot.1.1', title: 'Mishnah Berakhot 1:1', encrypted_content: 'x', page_age: null },
        { type: 'web_search_result', url: 'https://example.org/other', title: 'Other', encrypted_content: 'y', page_age: null },
      ],
    },
    {
      type: 'text', text: 'Sefaria has the Mishnah with several translations.',
      citations: [{ type: 'web_search_result_location', url: 'https://www.sefaria.org/Mishnah_Berakhot.1.1', title: 'Mishnah Berakhot 1:1', encrypted_index: 'z', cited_text: 'From when…' }],
    },
    {
      type: 'text', text: 'A made-up link the search never returned.',
      citations: [{ type: 'web_search_result_location', url: 'https://invented.example/', title: 'Invented', encrypted_index: 'q', cited_text: '…' }],
    },
  ],
};

describe('askCited', () => {
  it('searches the web and keeps only cited results the search returned', async () => {
    seen.length = 0;
    reply = send(SEARCHED);
    const found = await askCited({ system: 'S', user: 'U' }, 'test', sdk());
    expect(found).toEqual([{ title: 'Mishnah Berakhot 1:1', url: 'https://www.sefaria.org/Mishnah_Berakhot.1.1', why: 'Sefaria has the Mishnah with several translations.' }]);
    expect(seen[0]).toMatchObject({
      model: 'claude-opus-5-5', fallbacks: 'default',
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
      output_config: { effort: 'medium' },
    });
    expect(seen[0]).not.toHaveProperty('output_config.format');
  });

  it('lets a paused search finish', async () => {
    seen.length = 0;
    let n = 0;
    reply = (_body, res) => send(n++ === 0 ? { ...SEARCHED, stop_reason: 'pause_turn', content: SEARCHED.content.slice(0, 2) } : SEARCHED)(_body, res);
    expect(await askCited({ system: 'S', user: 'U' }, 'test', sdk())).toHaveLength(1);
    expect(seen).toHaveLength(2);
    expect((seen[1].messages as unknown[]).length).toBe(2);
  });
});
