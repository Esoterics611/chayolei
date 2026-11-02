import { describe, expect, it } from 'vitest';
import { getAddress } from 'ethers';
import { TEAM, callFor, charterConfig, chainErrorKey, idHash, roleBits } from './chain';
import { seedTeams } from './seed';
import type { Team } from './types';

const NOW = '2026-10-25T12:00:00.000Z';
const ADDRESS = '0x00000000000000000000000000000000000000c0';

function onChain(): Team {
  const t = seedTeams(NOW).teams.find(x => x.id === 'brachos')!;
  return { ...t, live: true, chain: { address: ADDRESS, chainId: 31337 } };
}

describe('chain calls', () => {
  it('encodes roles as the charter’s role bits', () => {
    const t = onChain();
    expect(t.charter.roles.map(r => r.id)).toEqual(['lead', 'reviewer', 'contributor']);
    expect(roleBits(t, ['contributor', 'lead'])).toBe(0b101);
    expect(roleBits(t, [])).toBe(0);
    expect(() => roleBits(t, ['owner'])).toThrow();
    // The same bits a new team's contract is configured with.
    expect(charterConfig({ name: 'x', purpose: '', templateId: 'editorial' })).toMatchObject({ founderRoles: 0b001, joinerRoles: 0b100 });
  });

  it('proposes roles and leaves with exactly the contract’s calls', () => {
    const t = onChain();
    const levi = t.members.find(m => m.id === 'levi')!;
    const roles = callFor(t, { type: 'proposeRoles', id: 'c-1', memberId: 'levi', to: ['reviewer', 'contributor'], title: 'x', why: 'y' });
    expect(roles.to).toBe(ADDRESS);
    const decoded = TEAM.decodeFunctionData('proposeRoles', roles.data);
    expect(decoded[0]).toBe(idHash('c-1'));
    expect(decoded[1]).toBe(getAddress(levi.wallet));
    expect(Number(decoded[2])).toBe(0b110);
    expect(TEAM.decodeFunctionData('leave', callFor(t, { type: 'leave' }).data)).toHaveLength(0);
  });

  it('explains the contract’s refusals of role changes', () => {
    expect(chainErrorKey('LastVoter')).toBe('err.last_voter');
    expect(chainErrorKey('RolesProposalOpen')).toBe('err.roles_open');
  });
});
