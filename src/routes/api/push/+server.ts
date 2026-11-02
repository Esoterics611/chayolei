import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { pushInfo, subscribe, unsubscribe } from '$lib/server/push';
import { body, teamRoute } from '$lib/server/team-routes';

// GET    /api/push                                → { enabled, publicKey? }
// POST   /api/push   { subscription, locale }     → turn push on for this device
// DELETE /api/push   { endpoint }                 → turn it off
// Push is only for what blocks the member or is about to expire (docs/TEAM_BACKEND.md §6c).
export const GET: RequestHandler = () => json(pushInfo());

export const POST: RequestHandler = ({ request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const input = await body(request);
  await subscribe(ctx.uid, input.subscription, input.locale);
  return json({ ok: true }, { status: 201 });
});

export const DELETE: RequestHandler = ({ request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const input = await body(request);
  await unsubscribe(ctx.uid, input.endpoint);
  return json({ ok: true });
});
