import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { acceptInvite } from '$lib/server/teams';
import { body, teamRoute } from '$lib/server/team-routes';

// POST /api/invites/[token]/accept   { name }
// Join the team as the signed-in member, with the charter's joiner roles.
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const team = await acceptInvite(params.token, ctx.uid, await body(request));
  return json({ team });
});
