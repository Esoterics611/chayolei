// How a Team is stored in Firestore (docs/TEAM_BACKEND.md §2), shared by the
// server, which writes, and the browser, which reads:
//
//   teams/{teamId}                  the core: members, charter, plan, changes,
//                                   treasury, and memberUids for access rules
//   teams/{teamId}/ledger/{seq}     one doc per ledger entry (id: zero-padded seq)
//   teams/{teamId}/messages/{id}    thread messages
//   teams/{teamId}/versions/{id}    deliverable versions and drafts (drafts are
//                                   readable only by their author)
//
// In the live app a member's id is their sign-in uid, so the access rules can
// compare ids with request.auth.uid directly.

import type { Deliverable, LedgerEntry, Message, Team, Version } from './types';

export interface StoredVersion extends Version {
  deliverableId: string;
}

export type StoredDeliverable = Omit<Deliverable, 'versions'>;

export interface TeamCore extends Omit<Team, 'ledger' | 'messages' | 'deliverables'> {
  deliverables: StoredDeliverable[];
  memberUids: string[];
  ledgerCount: number;
  updatedAt: string;
}

export interface TeamDocs {
  core: TeamCore;
  ledger: LedgerEntry[];
  messages: Message[];
  versions: StoredVersion[];
}

/** Firestore refuses `undefined`; a JSON round trip drops it (the engine uses plain data). */
const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export const ledgerDocId = (seq: number) => String(seq).padStart(8, '0');

export function toDocs(team: Team, now: string): TeamDocs {
  const { ledger, messages, deliverables, ...rest } = team;
  const versions: StoredVersion[] = [];
  const stored: StoredDeliverable[] = deliverables.map(({ versions: vs, ...d }) => {
    for (const v of vs) versions.push({ ...v, deliverableId: d.id });
    return d;
  });
  return plain({
    core: {
      ...rest,
      deliverables: stored,
      memberUids: team.members.filter(m => !m.ai).map(m => m.id),
      ledgerCount: ledger.length,
      updatedAt: now,
    },
    ledger,
    messages,
    versions,
  });
}

export function fromDocs(docs: TeamDocs): Team {
  const { core, ledger, messages, versions } = docs;
  const { memberUids: _uids, ledgerCount: _count, updatedAt: _at, deliverables, ...rest } = core;
  const byDeliverable = new Map<string, Version[]>();
  for (const { deliverableId, ...v } of versions) {
    const list = byDeliverable.get(deliverableId) ?? [];
    list.push(v);
    byDeliverable.set(deliverableId, list);
  }
  return {
    ...rest,
    deliverables: deliverables.map(d => ({
      ...d,
      versions: (byDeliverable.get(d.id) ?? []).sort((a, b) => a.n - b.n || a.at.localeCompare(b.at)),
    })),
    ledger: [...ledger].sort((a, b) => a.seq - b.seq),
    messages: [...messages].sort((a, b) => a.at.localeCompare(b.at)),
  };
}

/** JSON with object keys sorted: Firestore may return a map's keys in another order. */
export function stableJson(x: unknown): string {
  return JSON.stringify(x, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map(k => [k, (v as Record<string, unknown>)[k]]))
      : v);
}

/** What a save must write: new ledger entries and messages, ledger entries
 *  whose proof came in, changed and removed versions. */
export function diffDocs(before: TeamDocs, after: TeamDocs) {
  const known = new Map(before.ledger.map(e => [e.seq, stableJson(e)]));
  const knownMessages = new Set(before.messages.map(m => m.id));
  const beforeVersions = new Map(before.versions.map(v => [v.id, stableJson(v)]));
  const afterIds = new Set(after.versions.map(v => v.id));
  return {
    ledger: after.ledger.filter(e => !known.has(e.seq)),
    proved: after.ledger.filter(e => known.has(e.seq) && known.get(e.seq) !== stableJson(e)),
    messages: after.messages.filter(m => !knownMessages.has(m.id)),
    versions: after.versions.filter(v => beforeVersions.get(v.id) !== stableJson(v)),
    removedVersions: before.versions.filter(v => !afterIds.has(v.id)).map(v => v.id),
  };
}

/** The team as `uid` may see it: other members' private drafts removed. */
export function viewFor(team: Team, uid: string): Team {
  return {
    ...team,
    deliverables: team.deliverables.map(d => ({
      ...d,
      versions: d.versions.filter(v => v.kind !== 'draft' || v.authorId === uid),
    })),
  };
}
