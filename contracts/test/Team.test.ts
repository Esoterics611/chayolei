// ═══════════════════════════════════════════════════════════════
// Team + TeamFactory — per-team charter, treasury and payouts
// (docs/TEAM_CONTRACTS.md). Mirrors the app engine's rules.
// ═══════════════════════════════════════════════════════════════

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import type { Team, TeamFactory, TeamForwarder, TMIMToken } from '../typechain-types';

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const id = (s: string) => ethers.keccak256(ethers.toUtf8Bytes(s));

// Permission bits (Team.sol, mirroring src/lib/team/types.ts)
const P = {
  take: 1 << 0, review: 1 << 1, accept: 1 << 2, release: 1 << 3,
  plan: 1 << 4, propose: 1 << 5, vote: 1 << 6, spend: 1 << 7, admit: 1 << 8,
};
const ALL = (1 << 9) - 1;
// Rule keys
const R = { reward: 0, review: 1, cap: 2, spend: 3, quorum: 4, majority: 5, hours: 6 };
// Proposal status / choice enums
const S = { None: 0, Open: 1, Passed: 2, Failed: 3, Approved: 4, Declined: 5 };
const C = { For: 1, Against: 2, Abstain: 3 };

type Rules = [bigint, bigint, bigint, bigint, bigint, bigint, bigint];
const EDITORIAL_RULES: Rules = [1200n, 100n, 20000n, 2000n, 40n, 50n, 72n];

/** Editorial template: lead (everything), contributor (take, review, propose, vote). */
function editorial(over: Partial<{ joinerRoles: number; rules: Rules }> = {}) {
  return {
    profileHash: id('Brachos Translation Group'),
    rolePermissions: [ALL, P.take | P.review | P.propose | P.vote],
    founderRoles: 0b01,
    joinerRoles: over.joinerRoles ?? 0b10,
    rules: over.rules ?? EDITORIAL_RULES,
  };
}

describe('Team and TeamFactory', () => {
  let admin: HardhatEthersSigner, founder: HardhatEthersSigner, levi: HardhatEthersSigner;
  let shmuel: HardhatEthersSigner, rivka: HardhatEthersSigner, stranger: HardhatEthersSigner;
  let tmim: TMIMToken, forwarder: TeamForwarder, factory: TeamFactory, impl: Team;

  async function newTeam(cfg = editorial(), by = founder): Promise<Team> {
    const tx = await factory.connect(by).createTeam(cfg);
    const rc = await tx.wait();
    const log = rc!.logs.map(l => { try { return factory.interface.parseLog(l); } catch { return null; } })
      .find(l => l?.name === 'TeamCreated')!;
    return ethers.getContractAt('Team', log.args.team) as unknown as Promise<Team>;
  }

  async function invite(team: Team, inviter: HardhatEthersSigner, opts: Partial<{ id: string; maxUses: number; expiresAt: number }> = {}) {
    const inv = {
      id: opts.id ?? id(`invite-${Math.random()}`),
      maxUses: opts.maxUses ?? 10,
      expiresAt: opts.expiresAt ?? (await time.latest()) + 7 * 86400,
    };
    const domain = { name: 'Chayolei Team', version: '1', chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await team.getAddress() };
    const types = { Invite: [{ name: 'id', type: 'bytes32' }, { name: 'maxUses', type: 'uint32' }, { name: 'expiresAt', type: 'uint64' }] };
    const sig = await inviter.signTypedData(domain, types, inv);
    return { ...inv, sig, inviter: inviter.address };
  }

  async function join(team: Team, who: HardhatEthersSigner, inviter = founder) {
    const inv = await invite(team, inviter);
    await team.connect(who).join(inv.inviter, inv.id, inv.maxUses, inv.expiresAt, inv.sig);
  }

  /** Founder-run team with Levi, Shmuel and Rivka as contributors (4 voters). */
  async function brachos(cfg = editorial()) {
    const team = await newTeam(cfg);
    for (const m of [levi, shmuel, rivka]) await join(team, m);
    return team;
  }

  /** Pass a budget through a vote of all four members. */
  async function fundByVote(team: Team, objective: string, amount: bigint) {
    const ref = id(`budget-${objective}-${amount}-${Math.random()}`);
    await team.connect(founder).proposeBudget(ref, id(objective), amount);
    for (const m of [founder, levi, shmuel, rivka]) {
      if ((await team.proposal(ref)).status === BigInt(S.Open)) await team.connect(m).vote(ref, C.For);
    }
    return ref;
  }

  beforeEach(async () => {
    [admin, founder, levi, shmuel, rivka, stranger] = await ethers.getSigners();
    tmim = await (await ethers.getContractFactory('TMIMToken')).deploy(admin.address) as unknown as TMIMToken;
    forwarder = await (await ethers.getContractFactory('TeamForwarder')).deploy() as unknown as TeamForwarder;
    impl = await (await ethers.getContractFactory('Team')).deploy(await forwarder.getAddress()) as unknown as Team;
    factory = await (await ethers.getContractFactory('TeamFactory')).deploy(
      admin.address, await tmim.getAddress(), await impl.getAddress(), await forwarder.getAddress(), 1_000_000n,
    ) as unknown as TeamFactory;
    await tmim.grantRole(MINTER_ROLE, await factory.getAddress());
  });

  // ═══════════════════════════════════════════════════════════════
  describe('starting a team', () => {
    it('makes the caller the founder with the founder roles', async () => {
      const team = await newTeam();
      expect(await factory.isTeam(await team.getAddress())).to.be.true;
      expect(await factory.teamCount()).to.equal(1n);
      expect(await team.rolesOf(founder.address)).to.equal(0b01n);
      expect(await team.can(founder.address, P.spend | P.admit)).to.be.true;
      expect(await team.memberCount()).to.equal(1n);
      expect(await team.voterCount()).to.equal(1n);
      const [reward, version] = await team.rule(R.reward);
      expect(reward).to.equal(1200n);
      expect(version).to.equal(1n);
      expect(await team.profileHash()).to.equal(id('Brachos Translation Group'));
    });

    it('cannot initialize the implementation or a team twice', async () => {
      await expect(impl.initialize(founder.address, editorial())).to.be.revertedWithCustomError(impl, 'InvalidInitialization');
      const team = await newTeam();
      await expect(team.initialize(stranger.address, editorial())).to.be.revertedWithCustomError(team, 'InvalidInitialization');
    });

    it('rejects charters that could not work', async () => {
      const bad = [
        { ...editorial(), rolePermissions: [] },
        { ...editorial(), founderRoles: 0 },
        { ...editorial(), founderRoles: 0b100 },               // a role that doesn't exist
        { ...editorial(), joinerRoles: 0 },
        { ...editorial(), rolePermissions: [1 << 12, P.vote] }, // unknown permission bit
        editorial({ rules: [1200n, 100n, 20000n, 2000n, 101n, 50n, 72n] }), // quorum over 100
        editorial({ rules: [1200n, 100n, 20000n, 2000n, 40n, 100n, 72n] }), // majority 100 freezes the charter
        editorial({ rules: [1200n, 100n, 20000n, 2000n, 40n, 49n, 72n] }),  // less than half
        editorial({ rules: [1200n, 100n, 20000n, 2000n, 40n, 50n, 0n] }),   // no time to vote
      ];
      for (const cfg of bad) await expect(factory.connect(founder).createTeam(cfg)).to.be.revertedWithCustomError(impl, 'InvalidConfig');
    });

    it('counts calendar months in UTC like the app', async () => {
      const at = (iso: string) => BigInt(Date.parse(iso) / 1000);
      expect(await factory.monthOf(0n)).to.equal(197001n);
      expect(await factory.monthOf(at('1970-12-31T23:59:59Z'))).to.equal(197012n);
      expect(await factory.monthOf(at('2000-02-29T12:00:00Z'))).to.equal(200002n);
      expect(await factory.monthOf(at('2000-03-01T00:00:00Z'))).to.equal(200003n);
      expect(await factory.monthOf(at('2026-10-26T09:00:00Z'))).to.equal(202610n);
      expect(await factory.monthOf(at('2026-12-31T23:59:59Z'))).to.equal(202612n);
      expect(await factory.monthOf(at('2027-01-01T00:00:00Z'))).to.equal(202701n);
      expect(await factory.monthOf(at('2100-03-01T00:00:00Z'))).to.equal(210003n);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  describe('joining by invite', () => {
    it('admits with the joiner roles and counts the new voter', async () => {
      const team = await newTeam();
      const inv = await invite(team, founder);
      await expect(team.connect(levi).join(inv.inviter, inv.id, inv.maxUses, inv.expiresAt, inv.sig))
        .to.emit(team, 'MemberJoined').withArgs(levi.address, 0b10, inv.id, founder.address);
      expect(await team.rolesOf(levi.address)).to.equal(0b10n);
      expect(await team.can(levi.address, P.spend)).to.be.false;
      expect(await team.memberCount()).to.equal(2n);
      expect(await team.voterCount()).to.equal(2n);
    });

    it('lets one link admit several people, up to its uses', async () => {
      const team = await newTeam();
      const inv = await invite(team, founder, { maxUses: 2 });
      await team.connect(levi).join(inv.inviter, inv.id, inv.maxUses, inv.expiresAt, inv.sig);
      await team.connect(shmuel).join(inv.inviter, inv.id, inv.maxUses, inv.expiresAt, inv.sig);
      await expect(team.connect(rivka).join(inv.inviter, inv.id, inv.maxUses, inv.expiresAt, inv.sig))
        .to.be.revertedWithCustomError(team, 'InviteInvalid');
    });

    it('refuses expired, revoked, forged or unauthorized invites and repeat joins', async () => {
      const team = await newTeam();
      const expired = await invite(team, founder, { expiresAt: (await time.latest()) - 1 });
      await expect(team.connect(levi).join(expired.inviter, expired.id, expired.maxUses, expired.expiresAt, expired.sig))
        .to.be.revertedWithCustomError(team, 'InviteInvalid');

      const revoked = await invite(team, founder);
      await expect(team.connect(founder).revokeInvite(revoked.id)).to.emit(team, 'InviteRevoked');
      await expect(team.connect(levi).join(revoked.inviter, revoked.id, revoked.maxUses, revoked.expiresAt, revoked.sig))
        .to.be.revertedWithCustomError(team, 'InviteInvalid');

      const ok = await invite(team, founder, { maxUses: 1 });
      // Changing the terms breaks the signature.
      await expect(team.connect(levi).join(ok.inviter, ok.id, 5, ok.expiresAt, ok.sig))
        .to.be.revertedWithCustomError(team, 'InviteInvalid');

      await team.connect(levi).join(ok.inviter, ok.id, ok.maxUses, ok.expiresAt, ok.sig);
      const again = await invite(team, founder);
      await expect(team.connect(levi).join(again.inviter, again.id, again.maxUses, again.expiresAt, again.sig))
        .to.be.revertedWithCustomError(team, 'AlreadyMember');

      // Levi is a contributor: he may not admit people, so his invites don't work.
      const byLevi = await invite(team, levi);
      await expect(team.connect(shmuel).join(byLevi.inviter, byLevi.id, byLevi.maxUses, byLevi.expiresAt, byLevi.sig))
        .to.be.revertedWithCustomError(team, 'NotPermitted').withArgs(P.admit);
      await expect(team.connect(levi).revokeInvite(ok.id)).to.be.revertedWithCustomError(team, 'NotPermitted');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  describe('accept and pay', () => {
    let team: Team;
    const vol1 = id('Volume 1');
    beforeEach(async () => {
      team = await brachos();
      await fundByVote(team, 'Volume 1', 80_000n);
    });

    it('mints the reward to the owner and the review reward to the reviewer, from the budget', async () => {
      const d = id('Ch.1'), v = id('Ch.1 v3');
      await expect(team.connect(founder).acceptAndPay(d, vol1, levi.address, 1200n, shmuel.address, v))
        .to.emit(team, 'Accepted').withArgs(d, vol1, levi.address, 1200n, shmuel.address, 100n, v, founder.address);
      expect(await tmim.balanceOf(levi.address)).to.equal(1200n);
      expect(await tmim.balanceOf(shmuel.address)).to.equal(100n);
      expect(await team.paidFrom(vol1)).to.equal(1300n);
      expect(await team.budgetLeft(vol1)).to.equal(80_000n - 1300n);
      expect(await team.issuedThisMonth()).to.equal(1300n);
      expect(await team.acceptedVersion(d)).to.equal(v);
      expect(await factory.mintedBy(await team.getAddress(), await factory.currentMonth())).to.equal(1300n);
    });

    it('pays no review reward when no one else reviewed', async () => {
      await team.connect(founder).acceptAndPay(id('Ch.2'), vol1, levi.address, 1200n, ethers.ZeroAddress, id('v'));
      expect(await team.paidFrom(vol1)).to.equal(1200n);
    });

    it('needs the right to accept, a member owner, and someone other than the owner', async () => {
      await expect(team.connect(levi).acceptAndPay(id('x'), vol1, shmuel.address, 1200n, ethers.ZeroAddress, id('v')))
        .to.be.revertedWithCustomError(team, 'NotPermitted').withArgs(P.accept);
      await expect(team.connect(founder).acceptAndPay(id('x'), vol1, founder.address, 1200n, ethers.ZeroAddress, id('v')))
        .to.be.revertedWithCustomError(team, 'SelfAcceptance');
      await expect(team.connect(founder).acceptAndPay(id('x'), vol1, stranger.address, 1200n, ethers.ZeroAddress, id('v')))
        .to.be.revertedWithCustomError(team, 'NotMember');
      await expect(team.connect(founder).acceptAndPay(id('x'), vol1, levi.address, 1200n, levi.address, id('v')))
        .to.be.revertedWithCustomError(team, 'InvalidValue');
      await expect(team.connect(founder).acceptAndPay(id('x'), vol1, levi.address, 1200n, stranger.address, id('v')))
        .to.be.revertedWithCustomError(team, 'NotMember');
      await expect(team.connect(founder).acceptAndPay(id('x'), vol1, levi.address, 0n, ethers.ZeroAddress, id('v')))
        .to.be.revertedWithCustomError(team, 'InvalidValue');
    });

    it('accepts a deliverable once', async () => {
      await team.connect(founder).acceptAndPay(id('Ch.1'), vol1, levi.address, 1200n, ethers.ZeroAddress, id('v'));
      await expect(team.connect(founder).acceptAndPay(id('Ch.1'), vol1, levi.address, 1200n, ethers.ZeroAddress, id('v2')))
        .to.be.revertedWithCustomError(team, 'AlreadyAccepted');
    });

    it('stays within the objective budget', async () => {
      await expect(team.connect(founder).acceptAndPay(id('big'), id('Unfunded'), levi.address, 10n, ethers.ZeroAddress, id('v')))
        .to.be.revertedWithCustomError(team, 'BudgetExceeded').withArgs(10n, 0n);
    });

    it('stays within the team’s monthly issuance cap, which resets next month', async () => {
      // Cap 20,000: 16 × 1,200 = 19,200; one more would be 20,400.
      for (let i = 0; i < 16; i++) {
        await team.connect(founder).acceptAndPay(id(`c${i}`), vol1, levi.address, 1200n, ethers.ZeroAddress, id('v'));
      }
      await expect(team.connect(founder).acceptAndPay(id('c16'), vol1, levi.address, 1200n, ethers.ZeroAddress, id('v')))
        .to.be.revertedWithCustomError(team, 'CapExceeded').withArgs(1200n, 19_200n, 20_000n);
      await time.increase(32 * 86400);
      await team.connect(founder).acceptAndPay(id('c16'), vol1, levi.address, 1200n, ethers.ZeroAddress, id('v'));
      expect(await team.issuedThisMonth()).to.equal(1200n);
    });

    it('stays within the platform allowance and cap; an allowance of 0 stops minting', async () => {
      const addr = await team.getAddress();
      await factory.setAllowance(addr, 1500n);
      await team.connect(founder).acceptAndPay(id('a'), vol1, levi.address, 1200n, ethers.ZeroAddress, id('v'));
      await expect(team.connect(founder).acceptAndPay(id('b'), vol1, levi.address, 1200n, ethers.ZeroAddress, id('v')))
        .to.be.revertedWithCustomError(factory, 'AllowanceExceeded').withArgs(1200n, 1200n, 1500n);
      expect(await factory.mintableThisMonth(addr)).to.equal(300n);

      await factory.setAllowance(addr, 100_000n);
      await factory.setPlatformMonthlyCap(2000n);
      await expect(team.connect(founder).acceptAndPay(id('b'), vol1, levi.address, 1200n, ethers.ZeroAddress, id('v')))
        .to.be.revertedWithCustomError(factory, 'PlatformCapExceeded').withArgs(1200n, 1200n, 2000n);
      expect(await factory.mintableThisMonth(addr)).to.equal(800n);

      await factory.setPlatformMonthlyCap(0n);
      await factory.setAllowance(addr, 0n);
      await expect(team.connect(founder).acceptAndPay(id('b'), vol1, levi.address, 1n, ethers.ZeroAddress, id('v')))
        .to.be.revertedWithCustomError(factory, 'AllowanceExceeded');
    });

    it('lets only the platform set allowances, and only teams mint', async () => {
      await expect(factory.connect(founder).setAllowance(await team.getAddress(), 1n)).to.be.revertedWithCustomError(factory, 'AccessControlUnauthorizedAccount');
      await expect(factory.connect(founder).setDefaultAllowance(1n)).to.be.revertedWithCustomError(factory, 'AccessControlUnauthorizedAccount');
      await expect(factory.setAllowance(stranger.address, 1n)).to.be.revertedWithCustomError(factory, 'NotTeam');
      await expect(factory.connect(founder).mintFor(founder.address, 1n, 'x')).to.be.revertedWithCustomError(factory, 'NotTeam');
    });

    it('releases an accepted deliverable once, with its content hash', async () => {
      const d = id('Ch.1');
      await expect(team.connect(founder).release(d, id('content'))).to.be.revertedWithCustomError(team, 'NotAccepted');
      await team.connect(founder).acceptAndPay(d, vol1, levi.address, 1200n, ethers.ZeroAddress, id('v'));
      await expect(team.connect(levi).release(d, id('content'))).to.be.revertedWithCustomError(team, 'NotPermitted').withArgs(P.release);
      await expect(team.connect(founder).release(d, id('content'))).to.emit(team, 'Released').withArgs(d, id('content'), founder.address);
      await expect(team.connect(founder).release(d, id('content'))).to.be.revertedWithCustomError(team, 'AlreadyReleased');
    });

    it('pays scheduled pay from a budget once per reference', async () => {
      const ref = id('levi weekly 2026-10-29');
      await expect(team.connect(founder).payFromBudget(ref, vol1, levi.address, 300n))
        .to.emit(team, 'Paid').withArgs(ref, vol1, levi.address, 300n, founder.address);
      expect(await tmim.balanceOf(levi.address)).to.equal(300n);
      await expect(team.connect(founder).payFromBudget(ref, vol1, levi.address, 300n)).to.be.revertedWithCustomError(team, 'RefUsed');
      await expect(team.connect(levi).payFromBudget(id('r2'), vol1, levi.address, 300n)).to.be.revertedWithCustomError(team, 'NotPermitted');
      await expect(team.connect(founder).payFromBudget(id('r3'), vol1, stranger.address, 300n)).to.be.revertedWithCustomError(team, 'NotMember');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  describe('rule changes by vote', () => {
    let team: Team;
    beforeEach(async () => { team = await brachos(); });

    it('passes with quorum and majority and versions the rule', async () => {
      const ref = id('raise review reward');
      await expect(team.connect(founder).proposeRule(ref, R.review, 150n)).to.emit(team, 'ProposalOpened');
      const p = await team.proposal(ref);
      expect(p.byVote).to.be.true;
      expect(p.closesAt - p.openedAt).to.equal(72n * 3600n);
      await team.connect(founder).vote(ref, C.For);
      await team.connect(levi).vote(ref, C.For);
      await team.connect(shmuel).vote(ref, C.Against);
      // Rivka's is the last eligible vote: it decides.
      await expect(team.connect(rivka).vote(ref, C.Abstain))
        .to.emit(team, 'ProposalDecided').withArgs(ref, S.Passed, 2, 1, 1, 4)
        .and.to.emit(team, 'RuleChanged').withArgs(R.review, 100n, 150n, 2, ref);
      const [value, version] = await team.rule(R.review);
      expect(value).to.equal(150n);
      expect(version).to.equal(2n);
    });

    it('fails without quorum once the deadline passes; anyone may then close it', async () => {
      const ref = id('lower cap');
      await team.connect(levi).proposeRule(ref, R.cap, 10_000n);
      await team.connect(levi).vote(ref, C.For);            // 1 of 4 = 25% < 40%
      await expect(team.connect(stranger).closeVoting(ref)).to.be.revertedWithCustomError(team, 'NotProposer');
      await time.increase(72 * 3600 + 1);
      await expect(team.connect(levi).vote(ref, C.For)).to.be.revertedWithCustomError(team, 'VotingClosed');
      await expect(team.connect(stranger).closeVoting(ref)).to.emit(team, 'ProposalDecided').withArgs(ref, S.Failed, 1, 0, 0, 4);
      expect((await team.rule(R.cap))[0]).to.equal(20_000n);
    });

    it('needs more than the majority of for + against', async () => {
      const ref = id('tie');
      await team.connect(founder).proposeRule(ref, R.spend, 3000n);
      await team.connect(founder).vote(ref, C.For);
      await team.connect(levi).vote(ref, C.Against);
      await expect(team.connect(founder).closeVoting(ref)).to.emit(team, 'ProposalDecided').withArgs(ref, S.Failed, 1, 1, 0, 4);
    });

    it('lets members change their vote until it closes', async () => {
      const ref = id('change my mind');
      await team.connect(founder).proposeRule(ref, R.hours, 48n);
      await team.connect(levi).vote(ref, C.Against);
      await team.connect(levi).vote(ref, C.For);
      const p = await team.proposal(ref);
      expect([p.forVotes, p.against]).to.deep.equal([1n, 0n]);
      expect(await team.voteOf(ref, levi.address)).to.equal(C.For);
    });

    it('allows one open proposal per rule and refuses values that could not work', async () => {
      await team.connect(founder).proposeRule(id('a'), R.quorum, 60n);
      await expect(team.connect(levi).proposeRule(id('b'), R.quorum, 70n)).to.be.revertedWithCustomError(team, 'RuleProposalOpen');
      await expect(team.connect(founder).proposeRule(id('a'), R.spend, 1n)).to.be.revertedWithCustomError(team, 'ProposalExists');
      await expect(team.connect(founder).proposeRule(ethers.ZeroHash, R.spend, 1n)).to.be.revertedWithCustomError(team, 'InvalidValue');
      for (const [key, value] of [[R.majority, 100n], [R.majority, 40n], [R.quorum, 101n], [R.hours, 0n], [R.hours, 721n], [R.spend, 2000n], [7, 1n]] as const) {
        await expect(team.connect(founder).proposeRule(id(`bad ${key} ${value}`), key, value)).to.be.revertedWithCustomError(team, 'InvalidValue');
      }
      // Once decided, the rule is open to a new proposal.
      await team.connect(founder).closeVoting(id('a'));
      await team.connect(levi).proposeRule(id('b'), R.quorum, 70n);
    });

    it('lets only members with the right propose and vote', async () => {
      await expect(team.connect(stranger).proposeRule(id('x'), R.spend, 1n)).to.be.revertedWithCustomError(team, 'NotPermitted').withArgs(P.propose);
      await team.connect(founder).proposeRule(id('x'), R.spend, 1n);
      await expect(team.connect(stranger).vote(id('x'), C.For)).to.be.revertedWithCustomError(team, 'NotPermitted').withArgs(P.vote);
      await expect(team.connect(founder).vote(id('nothing'), C.For)).to.be.revertedWithCustomError(team, 'UnknownProposal');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  describe('money: budgets and the team account', () => {
    let team: Team;
    // "Blank" template: everyone who joins gets the founder role, so a second
    // member can approve within the spend limit (1,000).
    const blank = () => ({
      profileHash: id('Harbor Community Radio'),
      rolePermissions: [ALL],
      founderRoles: 1,
      joinerRoles: 1,
      rules: [500n, 50n, 10_000n, 1000n, 50n, 50n, 72n] as Rules,
    });
    beforeEach(async () => {
      team = await newTeam(blank());
      await join(team, levi);
      await join(team, shmuel);
    });

    it('approves a budget within the spend limit by another member who may spend', async () => {
      const ref = id('small budget');
      await team.connect(founder).proposeBudget(ref, id('Season 1'), 800n);
      expect((await team.proposal(ref)).byVote).to.be.false;
      await expect(team.connect(founder).approve(ref)).to.be.revertedWithCustomError(team, 'SelfApproval');
      await expect(team.connect(levi).approve(ref))
        .to.emit(team, 'BudgetSet').withArgs(id('Season 1'), 0n, 800n, ref);
      expect(await team.budgetOf(id('Season 1'))).to.equal(800n);
      expect((await team.proposal(ref)).status).to.equal(BigInt(S.Approved));
      await expect(team.connect(levi).approve(ref)).to.be.revertedWithCustomError(team, 'NotOpen');
      await expect(team.connect(levi).vote(ref, C.For)).to.be.revertedWithCustomError(team, 'NotOpen');
    });

    it('sends a change above the spend limit to a vote', async () => {
      const ref = id('big budget');
      await team.connect(founder).proposeBudget(ref, id('Season 1'), 5000n);
      expect((await team.proposal(ref)).byVote).to.be.true;
      await expect(team.connect(levi).approve(ref)).to.be.revertedWithCustomError(team, 'ByVote');
      await team.connect(founder).vote(ref, C.For);
      await team.connect(levi).vote(ref, C.For);
      await expect(team.connect(shmuel).vote(ref, C.For)).to.emit(team, 'BudgetSet');
    });

    it('pays a member from the team account; members fund it with a plain transfer', async () => {
      await tmim.mint(shmuel.address, 1000n, 'test');
      await tmim.connect(shmuel).transfer(await team.getAddress(), 500n);
      expect(await team.teamAccount()).to.equal(500n);

      const tooMuch = id('too much');
      await team.connect(founder).proposeTransfer(tooMuch, levi.address, 600n);
      await expect(team.connect(shmuel).approve(tooMuch)).to.be.revertedWithCustomError(team, 'InsufficientAccount').withArgs(500n, 600n);

      const ref = id('pay levi');
      await team.connect(founder).proposeTransfer(ref, levi.address, 300n);
      await expect(team.connect(shmuel).approve(ref)).to.emit(team, 'MoneyMoved').withArgs(ref, levi.address, 300n, shmuel.address);
      expect(await tmim.balanceOf(levi.address)).to.equal(300n);
      expect(await team.teamAccount()).to.equal(200n);

      await expect(team.connect(founder).proposeTransfer(id('x'), stranger.address, 1n)).to.be.revertedWithCustomError(team, 'NotMember');
      await expect(team.connect(founder).proposeTransfer(id('y'), levi.address, 0n)).to.be.revertedWithCustomError(team, 'InvalidValue');
    });

    it('fails a transfer passed by vote when the account no longer holds it', async () => {
      const ref = id('big transfer');
      await team.connect(founder).proposeTransfer(ref, levi.address, 2000n);
      await team.connect(founder).vote(ref, C.For);
      await team.connect(levi).vote(ref, C.For);
      await expect(team.connect(shmuel).vote(ref, C.For)).to.emit(team, 'ProposalDecided').withArgs(ref, S.Failed, 3, 0, 0, 3);
      expect(await tmim.balanceOf(levi.address)).to.equal(0n);
    });

    it('never sets a budget below what has been paid from it', async () => {
      await team.connect(founder).proposeBudget(id('b1'), id('S1'), 900n);
      await team.connect(levi).approve(id('b1'));
      await team.connect(founder).acceptAndPay(id('ep1'), id('S1'), levi.address, 500n, shmuel.address, id('v'));
      expect(await team.paidFrom(id('S1'))).to.equal(550n);
      await expect(team.connect(founder).proposeBudget(id('b2'), id('S1'), 500n)).to.be.revertedWithCustomError(team, 'InvalidValue');
      // Proposed while still possible, then overtaken by a payout.
      await team.connect(founder).proposeBudget(id('b3'), id('S1'), 600n);
      await team.connect(founder).payFromBudget(id('p'), id('S1'), shmuel.address, 100n);
      await expect(team.connect(levi).approve(id('b3'))).to.be.revertedWithCustomError(team, 'InvalidValue');
    });

    it('lets a member who may spend decline a request', async () => {
      const ref = id('decline me');
      await team.connect(founder).proposeBudget(ref, id('S1'), 100n);
      await expect(team.connect(stranger).decline(ref)).to.be.revertedWithCustomError(team, 'NotPermitted');
      await expect(team.connect(levi).decline(ref)).to.emit(team, 'ProposalDecided').withArgs(ref, S.Declined, 0, 0, 0, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  describe('anchors', () => {
    it('records batches in order, by a member or the platform’s anchoring service', async () => {
      const team = await brachos();
      await expect(team.connect(levi).anchor(1, id('root1'), 8)).to.emit(team, 'Anchored').withArgs(1, id('root1'), 8, levi.address);
      await expect(team.connect(levi).anchor(3, id('root3'), 8)).to.be.revertedWithCustomError(team, 'BatchOutOfOrder').withArgs(2);
      await expect(team.connect(stranger).anchor(2, id('root2'), 8)).to.be.revertedWithCustomError(team, 'NotMember');
      await factory.setAnchorer(stranger.address);
      await team.connect(stranger).anchor(2, id('root2'), 8);
      expect(await team.anchoredBatches()).to.equal(2n);
      await expect(team.connect(levi).anchor(3, ethers.ZeroHash, 8)).to.be.revertedWithCustomError(team, 'InvalidValue');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  describe('sponsored calls through the forwarder', () => {
    async function relay(signer: HardhatEthersSigner, to: string, data: string) {
      const fwd = await forwarder.getAddress();
      const request = {
        from: signer.address, to, value: 0n, gas: 1_000_000n,
        nonce: await forwarder.nonces(signer.address),
        deadline: (await time.latest()) + 3600, data,
      };
      const domain = { name: 'Chayolei Forwarder', version: '1', chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: fwd };
      const types = { ForwardRequest: [
        { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint48' },
        { name: 'data', type: 'bytes' },
      ] };
      const signature = await signer.signTypedData(domain, types, request);
      // The relayer (here: admin) pays the fee; the contract sees the signer.
      return forwarder.connect(admin).execute({ ...request, signature });
    }

    it('starts a team for the signer, and records the signer’s vote', async () => {
      const before = await ethers.provider.getBalance(rivka.address);
      const data = factory.interface.encodeFunctionData('createTeam', [editorial()]);
      await expect(relay(rivka, await factory.getAddress(), data)).to.emit(factory, 'TeamCreated');
      const team = await ethers.getContractAt('Team', await factory.teamAt(0)) as unknown as Team;
      expect(await team.rolesOf(rivka.address)).to.equal(0b01n);

      await join(team, levi, rivka);
      const ref = id('relayed');
      await relay(rivka, await team.getAddress(), team.interface.encodeFunctionData('proposeRule', [ref, R.spend, 2500n]));
      await expect(relay(levi, await team.getAddress(), team.interface.encodeFunctionData('vote', [ref, C.For])))
        .to.emit(team, 'VoteCast').withArgs(ref, levi.address, C.For);
      expect((await team.proposal(ref)).proposer).to.equal(rivka.address);
      // Rivka paid nothing for either call.
      expect(await ethers.provider.getBalance(rivka.address)).to.equal(before);
    });
  });
});
