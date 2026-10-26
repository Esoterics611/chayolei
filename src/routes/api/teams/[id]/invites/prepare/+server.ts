import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { prepareInvite } from '$lib/server/teams';
import { teamRoute } from '$lib/server/team-routes';

// POST /api/teams/[id]/invites/prepare
// For an on-chain team: the invite the inviter signs (Team.join checks it).
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  return json(await prepareInvite(params.id, ctx.uid));
});
