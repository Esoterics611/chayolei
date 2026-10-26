import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { createTeamFor } from '$lib/server/teams';
import { body, teamRoute } from '$lib/server/team-routes';

// POST /api/teams   { name, purpose, templateId, you: { name } }
// Start a team; the signed-in member is its founder.
export const POST: RequestHandler = ({ request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const team = await createTeamFor(ctx.uid, await body(request));
  return json({ team }, { status: 201 });
});
