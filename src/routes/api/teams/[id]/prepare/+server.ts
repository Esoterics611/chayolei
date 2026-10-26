import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { prepareCommand } from '$lib/server/teams';
import { body, teamRoute } from '$lib/server/team-routes';
import { isCommand } from '$lib/team/commands';
import { DomainError } from '$lib/team/types';

// POST /api/teams/[id]/prepare   { command }
// For an on-chain team's settled action: the forward request the member
// signs (and the command, with the change id the contract will key it by).
export const POST: RequestHandler = ({ params, request }) => teamRoute(async () => {
  const ctx = await requireAuth(request);
  const { command } = await body(request);
  if (!isCommand(command)) throw new DomainError('err.invalid_input');
  return json(await prepareCommand(params.id, ctx.uid, command));
});
