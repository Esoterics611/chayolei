// ═══════════════════════════════════════════════════════════════
// Rate limits on what costs the platform (docs/TEAM_BACKEND.md §3)
//
// Starting a team and joining one are transactions the platform's relayer
// pays for; invite links admit people who will. Each is counted per day
// (UTC) in Firestore, per account or per team, with a platform-wide cap on
// new teams. Limits come from the environment, with defaults sized for
// small teams; tests change RATE directly.
// ═══════════════════════════════════════════════════════════════

import type { Transaction } from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';
import { adminDb } from '$lib/server/firebase-admin';
import { DomainError } from '$lib/team/types';

const n = (v: string | undefined, fallback: number) => (v && Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : fallback);

/** Per day (UTC). */
export const RATE = {
  /** Teams one account may start. */
  teamsPerAccount: n(env.TEAM_STARTS_PER_ACCOUNT_DAY, 3),
  /** Teams the whole platform starts (the relayer pays for each). */
  teamsPlatform: n(env.TEAM_STARTS_PLATFORM_DAY, 200),
  /** Invite links one team may make. */
  invitesPerTeam: n(env.TEAM_INVITES_PER_TEAM_DAY, 20),
  /** People one team may admit through links. */
  joinsPerTeam: n(env.TEAM_JOINS_PER_TEAM_DAY, 50),
};

export type Bucket = 'teams' | 'teamsPlatform' | 'invites' | 'joins';

const LIMIT: Record<Bucket, () => number> = {
  teams: () => RATE.teamsPerAccount,
  teamsPlatform: () => RATE.teamsPlatform,
  invites: () => RATE.invitesPerTeam,
  joins: () => RATE.joinsPerTeam,
};

const doc = (bucket: Bucket, subject: string) =>
  adminDb.collection('rateLimits').doc(`${bucket}:${subject.replace(/\//g, '_')}`);

const today = () => new Date().toISOString().slice(0, 10);

async function used(bucket: Bucket, subject: string, tx?: Transaction): Promise<number> {
  const ref = doc(bucket, subject);
  const data = (tx ? await tx.get(ref) : await ref.get()).data() as { day?: string; count?: number } | undefined;
  return data?.day === today() ? data.count ?? 0 : 0;
}

/** Refuse when today's allowance is used up, without counting (before someone signs). */
export async function checkLimit(bucket: Bucket, subject: string): Promise<void> {
  const limit = LIMIT[bucket]();
  if ((await used(bucket, subject)) >= limit) throw new DomainError(`err.limit.${bucket}`, { n: limit });
}

/** Count one use, or refuse when today's allowance is used up. */
export async function spendLimit(bucket: Bucket, subject: string): Promise<void> {
  const limit = LIMIT[bucket]();
  await adminDb.runTransaction(async tx => {
    const count = await used(bucket, subject, tx);
    if (count >= limit) throw new DomainError(`err.limit.${bucket}`, { n: limit });
    tx.set(doc(bucket, subject), { day: today(), count: count + 1 });
  });
}
