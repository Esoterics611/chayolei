import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChain, publicInfo } from '$lib/server/team-chain';

// GET /api/chain
// Where live teams are recorded: chain id, contracts, block explorer.
export const GET: RequestHandler = async () => {
  const c = await getChain().catch(() => null);
  return json(c ? publicInfo(c) : { enabled: false });
};
