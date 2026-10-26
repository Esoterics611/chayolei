import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { inviteInfo } from '$lib/server/teams';
import { teamRoute } from '$lib/server/team-routes';

// GET /api/invites/[token]
// What the invite link shows before anyone signs in: the team's purpose and
// charter. The token is the secret; no members or records are shown.
export const GET: RequestHandler = ({ params }) => teamRoute(async () => json(await inviteInfo(params.token)));
