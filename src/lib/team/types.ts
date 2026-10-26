// Domain model for the new UI: a team's workforce (objectives → deliverables
// → tasks, versions), its corporate organization (charter, roles, rules,
// changes and votes) and its banking (TMIM treasury), all on one ledger.
// See docs/UX_TECH_DESIGN.md §4. Amounts are whole TMIM.

export type Locale = 'en' | 'he';

/** Seed content is bilingual; text people type is a plain string. */
export type Text = string | { en: string; he: string };

export type Permission =
  | 'take_work'
  | 'review_work'
  | 'accept_work'
  | 'release'
  | 'manage_plan'
  | 'propose'
  | 'vote'
  | 'spend'
  | 'admit';

export interface Role {
  id: string;
  name: Text;
  permissions: Permission[];
}

export interface Member {
  id: string;
  name: Text;
  initials: string;
  roleIds: string[];
  wallet: string;
  joinedAt: string;
  ai?: boolean;
}

export type RuleKey =
  | 'deliverable_reward'
  | 'review_reward'
  | 'monthly_issuance_cap'
  | 'spend_limit'
  | 'quorum_pct'
  | 'majority_pct'
  | 'vote_hours';

export type RuleUnit = 'tmim' | 'pct' | 'hours';

export interface RuleVersion {
  value: number;
  version: number;
  at: string;
  setBy: { kind: 'founding' } | { kind: 'proposal'; changeId: string };
}

export interface Rule {
  key: RuleKey;
  unit: RuleUnit;
  /** Oldest first; the last entry is the current value. */
  history: RuleVersion[];
}

export interface Charter {
  roles: Role[];
  rules: Rule[];
}

export interface Objective {
  id: string;
  title: Text;
  description: Text;
  ownerId: string;
  budget: number;
  due?: string;
  createdAt: string;
}

export type Stage =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'in_review'
  | 'changes_requested'
  | 'accepted'
  | 'released';

export const STAGES: Stage[] = [
  'open', 'assigned', 'in_progress', 'in_review', 'changes_requested', 'accepted', 'released',
];

export interface Version {
  id: string;
  /** Version number; drafts carry the number they will become. */
  n: number;
  kind: 'draft' | 'version';
  authorId: string;
  note: Text;
  paragraphs: string[];
  at: string;
}

export interface Deliverable {
  id: string;
  objectiveId: string;
  title: Text;
  scope: Text;
  ownerId?: string;
  reviewerId?: string;
  approverId?: string;
  reward: number;
  due?: string;
  stage: Stage;
  versions: Version[];
  acceptedVersionId?: string;
  lastActivityAt: string;
  releasedAt?: string;
}

export interface Task {
  id: string;
  deliverableId: string;
  title: Text;
  ownerId?: string;
  due?: string;
  done: boolean;
}

export type VoteChoice = 'for' | 'against' | 'abstain';

export interface Vote {
  memberId: string;
  choice: VoteChoice;
  at: string;
}

export interface Comment {
  id: string;
  authorId: string;
  body: Text;
  at: string;
  /** Index of the paragraph in the proposed version the comment is about. */
  paragraph?: number;
}

export type ChangeStatus =
  | 'open'
  | 'reviewed'
  | 'changes_requested'
  | 'accepted'
  | 'passed'
  | 'failed'
  | 'superseded';

/** A new version of a deliverable put up for review and acceptance. */
export interface WorkChange {
  kind: 'work';
  id: string;
  deliverableId: string;
  fromVersionId?: string;
  toVersionId: string;
  proposerId: string;
  status: ChangeStatus;
  comments: Comment[];
  reviewedBy?: string;
  at: string;
  decidedAt?: string;
  decidedBy?: string;
}

/** An amendment to one rule of the charter, decided by vote. */
export interface RuleChange {
  kind: 'rule';
  id: string;
  title: Text;
  why: Text;
  ruleKey: RuleKey;
  from: number;
  to: number;
  proposerId: string;
  status: ChangeStatus;
  votes: Vote[];
  at: string;
  closesAt: string;
  decidedAt?: string;
}

export type MoneyAction =
  | { type: 'transfer'; to: string; amount: number }
  | { type: 'budget'; objectiveId: string; to: number };

/** A movement of TMIM or a budget change, decided by a role or by vote. */
export interface MoneyChange {
  kind: 'money';
  id: string;
  title: Text;
  why: Text;
  action: MoneyAction;
  /** TMIM at stake: the transfer amount, or the budget increase. */
  amount: number;
  proposerId: string;
  decidedBy: 'role' | 'vote';
  status: ChangeStatus;
  votes: Vote[];
  at: string;
  closesAt?: string;
  decidedAt?: string;
  approvedBy?: string;
}

export type Change = WorkChange | RuleChange | MoneyChange;

export interface Message {
  id: string;
  ref: { type: 'deliverable' | 'change'; id: string };
  authorId: string;
  body: Text;
  at: string;
}

export type EntryKind =
  | 'team_created'
  | 'member_joined'
  | 'objective_created'
  | 'deliverable_created'
  | 'assigned'
  | 'version_saved'
  | 'review_requested'
  | 'commented'
  | 'reviewed'
  | 'changes_requested'
  | 'accepted_paid'
  | 'released'
  | 'task_created'
  | 'task_done'
  | 'change_opened'
  | 'vote_cast'
  | 'change_passed'
  | 'change_failed'
  | 'rule_changed'
  | 'money_moved'
  | 'budget_set'
  | 'scheduled_paid'
  | 'message'
  | 'anchor';

export type Tier = 'settled' | 'signed';

export interface LedgerEntry {
  id: string;
  seq: number;
  at: string;
  kind: EntryKind;
  actorId: string;
  tier: Tier;
  refs: {
    objectiveId?: string;
    deliverableId?: string;
    changeId?: string;
    ruleKey?: RuleKey;
    memberId?: string;
    taskId?: string;
  };
  /** TMIM credited to members: minted payouts, transfers from the team account,
   *  or (negative) a member's contribution into the team account. */
  amounts?: { memberId: string; amount: number; objectiveId?: string; source: 'minted' | 'team_account' | 'contribution' }[];
  data?: Record<string, string | number>;
  proof: { tx?: string; block?: number; sig?: string; batch?: number };
}

export interface Schedule {
  id: string;
  memberId: string;
  objectiveId: string;
  amount: number;
  every: 'week';
  nextAt: string;
  until: string;
}

export interface Treasury {
  teamAccount: number;
  schedules: Schedule[];
}

export type TemplateId = 'editorial' | 'studio' | 'collective' | 'blank';

export interface Team {
  id: string;
  /** A team in the live app: ledger proofs are real or pending, never the demo's stand-ins. */
  live?: boolean;
  /** The team's contract, when its settled entries are recorded on-chain. */
  chain?: { address: string; chainId: number };
  name: Text;
  purpose: Text;
  createdAt: string;
  templateId: TemplateId;
  members: Member[];
  charter: Charter;
  objectives: Objective[];
  deliverables: Deliverable[];
  tasks: Task[];
  changes: Change[];
  messages: Message[];
  ledger: LedgerEntry[];
  treasury: Treasury;
}

/** A refusal the UI can explain: `key` is an i18n message key. */
export class DomainError extends Error {
  constructor(public key: string, public vars: Record<string, string | number> = {}) {
    super(key);
    this.name = 'DomainError';
  }
}
