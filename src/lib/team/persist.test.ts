import { describe, expect, it } from 'vitest';
import { seedTeams } from './seed';
import { diffDocs, fromDocs, stableJson, toDocs } from './persist';

const NOW = '2026-10-25T12:00:00.000Z';

/** What Firestore hands back: the same data, map keys in another order. */
const reordered = <T>(x: T): T => JSON.parse(stableJson(x));

describe('persist', () => {
  it('round-trips a team through its documents', () => {
    const team = seedTeams(NOW).teams[0];
    const back = fromDocs(toDocs(team, NOW));
    expect(stableJson(back)).toBe(stableJson(JSON.parse(JSON.stringify(team))));
  });

  it('writes only what changed, whatever order Firestore returns keys in', () => {
    const team = seedTeams(NOW).teams[0];
    const before = reordered(toDocs(team, NOW));
    const unchanged = diffDocs(before, toDocs(fromDocs(structuredClone(before)), NOW));
    expect(unchanged).toMatchObject({ ledger: [], proved: [], messages: [], versions: [], removedVersions: [] });

    const after = fromDocs(structuredClone(before));
    after.ledger[0].proof = { tx: '0xabc', block: 7 };
    const d = diffDocs(before, toDocs(after, NOW));
    expect(d.proved.map(e => e.seq)).toEqual([after.ledger[0].seq]);
    expect(d.ledger).toEqual([]);
  });
});
