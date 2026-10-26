import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { runTeamCommand } from '$lib/server/teams';
import { body, teamRoute } from '$lib/server/team-routes';
import { isCommand } from '$lib/team/commands';
import type { Signed } from '$lib/server/team-chain';
import { DomainError } from '$lib/team/types';

// POST /api/teams/[id]/commands   { command, signed? }
// One member's action, checked against the team's charter by the engine.
// On an on-chain team a settled action carries the member's signed request
// (from /api/teams/[id]/prepare), which the server relays first.
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const { command, signed } = await body(request);
  if (!isCommand(command)) throw new DomainError('err.invalid_input');
  return json(await runTeamCommand(params.id, ctx.uid, command, signed as Signed | undefined));
});
