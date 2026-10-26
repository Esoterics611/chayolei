import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { acceptInvite } from '$lib/server/teams';
import { body, teamRoute } from '$lib/server/team-routes';
import type { Signed } from '$lib/server/team-chain';

// POST /api/invites/[token]/accept   { name, signed? }
// Join the team as the signed-in member, with the charter's joiner roles.
// For an on-chain team, `signed` is the Team.join request from /prepare.
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const input = await body(request);
  const team = await acceptInvite(params.token, ctx.uid, input, input.signed as Signed | undefined);
  return json({ team });
});
