import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { prepareTeam } from '$lib/server/teams';
import { body, teamRoute } from '$lib/server/team-routes';

// POST /api/teams/prepare   { name, purpose, templateId, you }
// With a chain configured: the TeamFactory.createTeam request the founder signs.
export const POST: RequestHandler = ({ request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  return json(await prepareTeam(ctx.uid, await body(request)));
});
