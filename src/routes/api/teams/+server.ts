import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { createTeamFor } from '$lib/server/teams';
import { body, teamRoute } from '$lib/server/team-routes';
import type { Signed } from '$lib/server/team-chain';

// POST /api/teams   { name, purpose, templateId, you: { name }, signed? }
// Start a team; the signed-in member is its founder. With a chain
// configured, `signed` is the createTeam request from /api/teams/prepare.
export const POST: RequestHandler = ({ request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const input = await body(request);
  const team = await createTeamFor(ctx.uid, input, input.signed as Signed | undefined);
  return json({ team }, { status: 201 });
});
