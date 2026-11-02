// The first-pass reviewer, the summarizer and the source finder on the
// server (src/lib/team/helpers.ts says what each is for and is shown). Each
// only reads the team; what a member keeps is posted with the ordinary
// `comment` and `postMessage` commands, marked AI-assisted.

import { loadTeam, requireMember } from '$lib/server/teams';
import { askCited, askJson, spendDaily } from '$lib/server/ai';
import type { Cited, Prompt } from '$lib/server/ai';
import {
  REVIEW_SCHEMA, SUMMARY_SCHEMA, readReview, readSources, readSummary, requireReviewHelper, requireSourcesHelper,
  reviewParagraphs, reviewPrompt, sourcesPrompt, summaryPrompt,
} from '$lib/team/helpers';
import type { ReviewSuggestion, Sources, Summary, ThreadRef } from '$lib/team/helpers';
import { member } from '$lib/team/rules';
import { DomainError } from '$lib/team/types';
import type { Locale } from '$lib/team/types';

export type AskJson = (prompt: Prompt, schema: Record<string, unknown>) => Promise<unknown>;
export type AskCited = (prompt: Prompt) => Promise<Cited[]>;

const defaultJson: AskJson = (prompt, schema) => askJson(prompt, schema, 'helpers');
const defaultCited: AskCited = prompt => askCited(prompt, 'sources');

const localeOf = (v: unknown): Locale => (v === 'he' ? 'he' : 'en');
const id = (v: unknown) => {
  if (typeof v !== 'string' || !v || v.length > 120) throw new DomainError('err.invalid_input');
  return v;
};

/** First-pass notes on a version up for review, for its reviewer or approver. */
export async function firstPassReview(
  teamId: string, uid: string, input: { changeId?: unknown; locale?: unknown }, ask: AskJson = defaultJson,
): Promise<ReviewSuggestion> {
  const changeId = id(input.changeId);
  const team = await loadTeam(teamId);
  requireMember(team, uid);
  requireReviewHelper(team, uid, changeId);
  const prompt = reviewPrompt(team, changeId, localeOf(input.locale));
  await spendDaily(teamId);
  return readReview(await ask(prompt, REVIEW_SCHEMA), reviewParagraphs(team, changeId), 'ai');
}

/** A summary of a deliverable's or a proposal's thread, for any member. */
export async function summarizeThread(
  teamId: string, uid: string, input: { ref?: { type?: unknown; id?: unknown }; locale?: unknown }, ask: AskJson = defaultJson,
): Promise<Summary> {
  const type = input.ref?.type;
  if (type !== 'deliverable' && type !== 'change') throw new DomainError('err.invalid_input');
  const ref: ThreadRef = { type, id: id(input.ref?.id) };
  const team = await loadTeam(teamId);
  requireMember(team, uid);
  const locale = localeOf(input.locale);
  const { labels, ...prompt } = summaryPrompt(team, ref, locale);
  await spendDaily(teamId);
  const names = Object.fromEntries(Object.entries(labels).map(([label, memberId]) => {
    const name = member(team, memberId)?.name;
    const text = typeof name === 'string' ? name : name?.[locale] ?? label;
    return [label, text.split(' ')[0]];
  }));
  return readSummary(await ask(prompt, SUMMARY_SCHEMA), names, 'ai');
}

/** Sources found on the web for a deliverable, for its owner or a member who may change the plan. */
export async function findSources(
  teamId: string, uid: string, input: { deliverableId?: unknown; locale?: unknown }, ask: AskCited = defaultCited,
): Promise<Sources> {
  const deliverableId = id(input.deliverableId);
  const team = await loadTeam(teamId);
  requireMember(team, uid);
  requireSourcesHelper(team, uid, deliverableId);
  const prompt = sourcesPrompt(team, deliverableId, localeOf(input.locale));
  await spendDaily(teamId);
  return readSources(await ask(prompt), 'ai');
}
