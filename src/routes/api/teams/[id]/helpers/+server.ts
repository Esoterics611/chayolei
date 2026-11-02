import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { findSources, firstPassReview, summarizeThread } from '$lib/server/helpers';
import { body, teamRoute } from '$lib/server/team-routes';
import { DomainError } from '$lib/team/types';

// POST /api/teams/[id]/helpers   { helper: 'review' | 'summary' | 'sources', ...input, locale }
// An AI helper's suggestion (src/lib/server/helpers.ts). Writes nothing:
// the member keeps what helps and posts it as a comment or a thread message.
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const input = await body(request);
  switch (input.helper) {
    case 'review': return json({ suggestion: await firstPassReview(params.id, ctx.uid, input) });
    case 'summary': return json({ suggestion: await summarizeThread(params.id, ctx.uid, input as never) });
    case 'sources': return json({ suggestion: await findSources(params.id, ctx.uid, input) });
    default: throw new DomainError('err.invalid_input');
  }
});
