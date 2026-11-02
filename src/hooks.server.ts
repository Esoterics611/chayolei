import { startGovernanceListener } from '$lib/server/governance-listener';
import { startTeamReconciler } from '$lib/server/team-reconciler';
import { startPushSweeper } from '$lib/server/push';
import type { Handle } from '@sveltejs/kit';

// Start the governance chain → Firestore reconciliation listener once,
// when the SvelteKit server process initialises.
startGovernanceListener();
// And teams' contracts → their ledgers, for actions taken outside the app.
startTeamReconciler();
// And reminders to devices for votes about to close (when push is configured).
startPushSweeper();

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
