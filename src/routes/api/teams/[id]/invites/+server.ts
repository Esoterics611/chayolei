import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { createInvite } from '$lib/server/teams';
import { body, teamRoute } from '$lib/server/team-routes';

// POST /api/teams/[id]/invites   { token?, invite?, signature? }
// A join link, made by a member whose role may admit people. For an
// on-chain team, the invite from /invites/prepare and the inviter's signature.
export const POST: RequestHandler = ({ params, request, url }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const { token, expiresAt } = await createInvite(params.id, ctx.uid, await body(request).catch(() => ({})));
  return json({ token, expiresAt, url: `${url.origin}/join/${token}` }, { status: 201 });
});
