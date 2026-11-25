import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { body, teamRoute } from '$lib/server/team-routes';
import { teacherAction } from '$lib/server/maayan';

// POST /api/maayan/questions/[id]   { action: 'approve' | 'hide' | 'answer', text? }: the teacher only.
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  return json(await teacherAction(ctx.uid, params.id, await body(request)));
});
