import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { suggestPlan } from '$lib/server/planner';
import { body, teamRoute } from '$lib/server/team-routes';

// POST /api/teams/[id]/plan   { objectiveId, locale }
// The AI planner's suggested breakdown of an objective. Writes nothing:
// the member edits it and adds what they keep with the addPlan command.
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  return json({ suggestion: await suggestPlan(params.id, ctx.uid, await body(request)) });
});
