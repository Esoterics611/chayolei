import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { body, teamRoute } from '$lib/server/team-routes';
import { confirmedEmail, getMember, saveMember } from '$lib/server/maayan';

// GET  /api/maayan/me   the signed-in member's profile, or null before it is made
// POST /api/maayan/me   { name, follows, notify, quoteOk, joinedFrom? }: create or change it
export const GET: RequestHandler = ({ request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  confirmedEmail(ctx.decoded);
  return json(await getMember(ctx.uid));
});

export const POST: RequestHandler = ({ request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  return json(await saveMember(ctx.decoded, await body(request)));
});
