import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { prepareJoin } from '$lib/server/teams';
import { teamRoute } from '$lib/server/team-routes';

// POST /api/invites/[token]/prepare
// For an on-chain team: the Team.join request the person joining signs.
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  return json(await prepareJoin(params.token, ctx.uid));
});
