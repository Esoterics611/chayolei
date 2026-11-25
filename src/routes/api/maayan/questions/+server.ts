import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { body, teamRoute } from '$lib/server/team-routes';
import { askQuestion, confirmedEmail } from '$lib/server/maayan';

// POST /api/maayan/questions   { wellspringId, text }: a member asks.
export const POST: RequestHandler = ({ request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  confirmedEmail(ctx.decoded);
  return json(await askQuestion(ctx.uid, await body(request)), { status: 201 });
});
