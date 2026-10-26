// The on-chain side of a live team (docs/TEAM_CONTRACTS.md, docs/TEAM_BACKEND.md §6):
// which commands settle on the team's contract, the exact call each one
// makes, and the charter as the contract's Config. Shared by the server,
// which relays the calls, and the browser, which signs them.

import { AbiCoder, Interface, ZeroAddress, getAddress, keccak256, toUtf8Bytes } from 'ethers';
import { SETTLED_COMMANDS } from './commands';
import type { Command } from './commands';

export { SETTLED_COMMANDS };
import { DomainError } from './types';
import type { Member, Permission, RuleKey, Team, TemplateId } from './types';
import { PERMISSIONS, RULE_ORDER, TEMPLATES, charterFromTemplate } from './templates';

const ERRORS = [
  'error NotPermitted(uint16 permission)', 'error NotMember(address account)', 'error AlreadyMember(address account)',
  'error InvalidConfig()', 'error InvalidValue()', 'error UnknownProposal()', 'error ProposalExists()',
  'error RuleProposalOpen()', 'error NotOpen()', 'error VotingClosed()', 'error NotByVote()', 'error ByVote()',
  'error SelfApproval()', 'error NotProposer()', 'error SelfAcceptance()', 'error InsufficientAccount(uint256 account, uint256 amount)',
  'error BudgetExceeded(uint256 cost, uint256 left)', 'error CapExceeded(uint256 cost, uint256 issued, uint256 cap)',
  'error AlreadyAccepted()', 'error NotAccepted()', 'error AlreadyReleased()', 'error RefUsed()', 'error InviteInvalid()',
  'error BatchOutOfOrder(uint64 expected)', 'error TeamFull()',
  'error NotTeam()', 'error AllowanceExceeded(uint256 amount, uint256 minted, uint256 allowance)',
  'error PlatformCapExceeded(uint256 amount, uint256 minted, uint256 cap)',
];

const CONFIG = 'tuple(bytes32 profileHash, uint16[] rolePermissions, uint16 founderRoles, uint16 joinerRoles, uint256[7] rules)';

export const TEAM = new Interface([
  'function proposeRule(bytes32 ref, uint8 key, uint256 value)',
  'function proposeTransfer(bytes32 ref, address to, uint256 amount)',
  'function proposeBudget(bytes32 ref, bytes32 objective, uint256 newBudget)',
  'function approve(bytes32 ref)',
  'function decline(bytes32 ref)',
  'function vote(bytes32 ref, uint8 choice)',
  'function closeVoting(bytes32 ref)',
  'function acceptAndPay(bytes32 deliverable, bytes32 objective, address owner, uint256 reward, address reviewer, bytes32 versionHash)',
  'function release(bytes32 deliverable, bytes32 contentHash)',
  'function payFromBudget(bytes32 ref, bytes32 objective, address to, uint256 amount)',
  'function join(address inviter, bytes32 id, uint32 maxUses, uint64 expiresAt, bytes signature)',
  'function anchor(uint64 batch, bytes32 root, uint64 entries)',
  'function anchoredBatches() view returns (uint64)',
  'function budgetOf(bytes32 objective) view returns (uint256)',
  'function paidFrom(bytes32 objective) view returns (uint256)',
  'function issuedThisMonth() view returns (uint256)',
  'function teamAccount() view returns (uint256)',
  'function rolesOf(address) view returns (uint16)',
  ...ERRORS,
]);

export const FACTORY = new Interface([
  `function createTeam(${CONFIG} cfg) returns (address team)`,
  'event TeamCreated(address indexed team, address indexed founder, bytes32 profileHash)',
  ...ERRORS,
]);

export const FORWARDER = new Interface([
  'function execute(tuple(address from, address to, uint256 value, uint256 gas, uint48 deadline, bytes data, bytes signature) request) payable',
  'function verify(tuple(address from, address to, uint256 value, uint256 gas, uint48 deadline, bytes data, bytes signature) request) view returns (bool)',
  'function nonces(address owner) view returns (uint256)',
  'error ERC2771ForwarderInvalidSigner(address signer, address from)',
  'error ERC2771ForwarderExpiredRequest(uint48 deadline)',
  'error ERC2771UntrustfulTarget(address target, address forwarder)',
  'error FailedCall()',
]);

export const TMIM = new Interface([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

/** The EIP-712 request a member signs; the platform's relayer submits it. */
export const FORWARD_TYPES = {
  ForwardRequest: [
    { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint48' },
    { name: 'data', type: 'bytes' },
  ],
};
export const forwarderDomain = (chainId: number, forwarder: string) =>
  ({ name: 'Chayolei Forwarder', version: '1', chainId, verifyingContract: forwarder });

export const INVITE_TYPES = {
  Invite: [{ name: 'id', type: 'bytes32' }, { name: 'maxUses', type: 'uint32' }, { name: 'expiresAt', type: 'uint64' }],
};
export const teamDomain = (chainId: number, team: string) =>
  ({ name: 'Chayolei Team', version: '1', chainId, verifyingContract: team });

/** A forward request in JSON: every number as a decimal string. */
export interface ForwardRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  deadline: string;
  data: string;
}

/** App ids on-chain: keccak256 of the id. */
export const idHash = (id: string) => keccak256(toUtf8Bytes(id));

/** A version's text, as the contract records it at acceptance and release. */
export const contentHash = (paragraphs: string[]) => keccak256(toUtf8Bytes(paragraphs.join('\n\n')));

const RULE_INDEX = Object.fromEntries(RULE_ORDER.map((k, i) => [k, i])) as Record<RuleKey, number>;
const CHOICE = { for: 1, against: 2, abstain: 3 } as const;

function permissionBits(ps: Permission[]): number {
  return ps.reduce((bits, p) => bits | (1 << PERMISSIONS.indexOf(p)), 0);
}

/** The contract's Config for a new team from a template: role bits in charter order. */
export function charterConfig(input: { name: string; purpose: string; templateId: TemplateId }) {
  const tpl = TEMPLATES[input.templateId];
  const charter = charterFromTemplate(input.templateId, new Date(0).toISOString());
  const roleBits = (ids: string[]) => ids.reduce((bits, id) => bits | (1 << charter.roles.findIndex(r => r.id === id)), 0);
  return {
    profileHash: keccak256(AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'string[]'], [input.name, input.purpose, charter.roles.map(r => r.id)],
    )),
    rolePermissions: charter.roles.map(r => permissionBits(r.permissions)),
    founderRoles: roleBits(tpl.founderRoleIds),
    joinerRoles: roleBits(tpl.joinerRoleIds),
    rules: RULE_ORDER.map(k => BigInt(tpl.rules[k])),
  };
}

export const settlesOnChain = (team: Team, cmd: Command) => !!team.chain && SETTLED_COMMANDS.has(cmd.type);

function wallet(team: Team, memberId: string | undefined): string {
  const m: Member | undefined = team.members.find(x => x.id === memberId);
  if (!m?.wallet) throw new DomainError('err.not_member');
  return getAddress(m.wallet);
}

/**
 * The call a settled command makes on the team's contract, computed from the
 * team as it is before the command runs. Commands that create a change must
 * carry the id the change will get (`cmd.id`), since the contract keys
 * proposals by it.
 */
export function callFor(team: Team, cmd: Command): { to: string; data: string } {
  if (!team.chain) throw new Error('not an on-chain team');
  const to = team.chain.address;
  const ref = (id: string | undefined) => {
    if (!id) throw new DomainError('err.invalid_input');
    return idHash(id);
  };
  const enc = (fn: string, args: unknown[]) => ({ to, data: TEAM.encodeFunctionData(fn, args) });
  switch (cmd.type) {
    case 'proposeRule':
      return enc('proposeRule', [ref(cmd.id), RULE_INDEX[cmd.ruleKey], BigInt(cmd.to)]);
    case 'requestMoney':
      return cmd.action.type === 'transfer'
        ? enc('proposeTransfer', [ref(cmd.id), wallet(team, cmd.action.to), BigInt(cmd.action.amount)])
        : enc('proposeBudget', [ref(cmd.id), idHash(cmd.action.objectiveId), BigInt(cmd.action.to)]);
    case 'vote':
      return enc('vote', [ref(cmd.changeId), CHOICE[cmd.choice]]);
    case 'closeVoting':
      return enc('closeVoting', [ref(cmd.changeId)]);
    case 'approveMoney':
      return enc('approve', [ref(cmd.changeId)]);
    case 'declineMoney':
      return enc('decline', [ref(cmd.changeId)]);
    case 'acceptAndPay': {
      const c = team.changes.find(x => x.id === cmd.changeId);
      if (!c || c.kind !== 'work') throw new DomainError('err.not_found');
      const d = team.deliverables.find(x => x.id === c.deliverableId);
      const v = d?.versions.find(x => x.id === c.toVersionId);
      if (!d || !v || !d.ownerId) throw new DomainError('err.stage');
      const reviewer = c.reviewedBy && c.reviewedBy !== d.ownerId ? wallet(team, c.reviewedBy) : ZeroAddress;
      return enc('acceptAndPay', [
        idHash(d.id), idHash(d.objectiveId), wallet(team, d.ownerId), BigInt(d.reward), reviewer, contentHash(v.paragraphs),
      ]);
    }
    case 'release': {
      const d = team.deliverables.find(x => x.id === cmd.deliverableId);
      const v = d?.versions.find(x => x.id === d.acceptedVersionId);
      if (!d || !v) throw new DomainError('err.stage');
      return enc('release', [idHash(d.id), contentHash(v.paragraphs)]);
    }
    case 'paySchedule': {
      const s = team.treasury.schedules.find(x => x.id === cmd.scheduleId);
      if (!s) throw new DomainError('err.not_found');
      return enc('payFromBudget', [idHash(`${s.id}@${s.nextAt}`), idHash(s.objectiveId), wallet(team, s.memberId), BigInt(s.amount)]);
    }
    default:
      throw new Error(`${cmd.type} does not settle on-chain`);
  }
}

/** Which message to show for a contract's refusal (a custom error name). */
export function chainErrorKey(name: string): string {
  const known: Record<string, string> = {
    BudgetExceeded: 'err.chain.budget', CapExceeded: 'err.chain.cap', AllowanceExceeded: 'err.chain.allowance',
    PlatformCapExceeded: 'err.chain.allowance', InsufficientAccount: 'err.chain.account', NotPermitted: 'err.chain.permission',
    VotingClosed: 'err.vote_closed', InviteInvalid: 'err.invite_invalid',
  };
  return known[name] ?? 'err.chain.refused';
}

/** Decode revert data from the team, factory or forwarder into an error name. */
export function revertName(data: string | undefined): string | undefined {
  if (!data || data === '0x') return undefined;
  for (const iface of [TEAM, FACTORY, FORWARDER]) {
    try {
      const e = iface.parseError(data);
      if (e) return e.name;
    } catch { /* not this one */ }
  }
  return undefined;
}

/** The root a batch of signed entries is anchored with: keccak256 of their hashes in order. */
export function batchRoot(entries: { seq: number; kind: string; at: string; actorId: string; refs: unknown; data?: unknown }[]): string {
  const hashes = entries.map(e => keccak256(toUtf8Bytes(JSON.stringify([e.seq, e.kind, e.at, e.actorId, e.refs, e.data ?? null]))));
  return keccak256(AbiCoder.defaultAbiCoder().encode(['bytes32[]'], [hashes]));
}
