import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { runTeamCommand } from '$lib/server/teams';
import { body, teamRoute } from '$lib/server/team-routes';
import { isCommand } from '$lib/team/commands';
import { DomainError } from '$lib/team/types';

// POST /api/teams/[id]/commands   { command }
// One member's action, checked against the team's charter by the engine.
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const { command } = await body(request);
  if (!isCommand(command)) throw new DomainError('err.invalid_input');
  return json(await runTeamCommand(params.id, ctx.uid, command));
});
