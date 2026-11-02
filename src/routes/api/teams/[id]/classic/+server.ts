import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { classicCampaigns, importCampaign } from '$lib/server/classic-import';
import { body, teamRoute } from '$lib/server/team-routes';

// GET  /api/teams/[id]/classic               → the classic campaigns the member started or joined
// POST /api/teams/[id]/classic { mivtzaId }  → bring one into the team as an objective
// For a member who may change the team's plan (docs/TEAM_BACKEND.md §6d).
export const GET: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  return json({ campaigns: await classicCampaigns(params.id, ctx.uid) });
});

export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const input = await body(request);
  return json(await importCampaign(params.id, ctx.uid, input.mivtzaId), { status: 201 });
});
