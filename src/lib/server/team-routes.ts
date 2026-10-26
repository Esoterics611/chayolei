// Shared by the team API routes: refusals the UI can explain.

import { json } from '@sveltejs/kit';
import { DomainError } from '$lib/team/types';

/** Run a route body; a DomainError becomes 422 { error: { key, vars } },
 *  which the browser shows in the member's language. */
export async function teamRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DomainError) {
      const status = e.key === 'err.not_found' || e.key === 'err.invite_invalid' ? 404 : e.key === 'err.not_your_team' ? 403 : 422;
      return json({ error: { key: e.key, vars: e.vars } }, { status });
    }
    throw e;
  }
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  const data = await request.json().catch(() => null);
  if (!data || typeof data !== 'object') throw new DomainError('err.invalid_input');
  return data as Record<string, unknown>;
}
