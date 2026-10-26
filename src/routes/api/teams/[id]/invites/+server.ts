import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { createInvite } from '$lib/server/teams';
import { teamRoute } from '$lib/server/team-routes';

// POST /api/teams/[id]/invites
// A join link, made by a member whose role may admit people.
export const POST: RequestHandler = ({ params, request, url }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const { token, expiresAt } = await createInvite(params.id, ctx.uid);
  return json({ token, expiresAt, url: `${url.origin}/join/${token}` }, { status: 201 });
});
