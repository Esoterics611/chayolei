import { startGovernanceListener } from '$lib/server/governance-listener';
import { startTeamReconciler } from '$lib/server/team-reconciler';
import type { Handle } from '@sveltejs/kit';

// Start the governance chain → Firestore reconciliation listener once,
// when the SvelteKit server process initialises.
startGovernanceListener();
// And teams' contracts → their ledgers, for actions taken outside the app.
startTeamReconciler();

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
