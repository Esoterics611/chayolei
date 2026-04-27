// ═══════════════════════════════════════════════════════════════
// חיילי בית דוד — מערכת טיפוסים
// ═══════════════════════════════════════════════════════════════

// ── דרגות (IDF Ranks) ────────────────────────────────────────────
export const RANKS = [
  'turai',
  'rav_turai',
  'samal',
  'samal_rishon',
  'rav_samal',
  'segen',
  'seren',
  'rav_seren',
  'sgan_aluf',
  'aluf',
] as const;

export type Rank = typeof RANKS[number];

export interface RankMeta {
  rank: Rank;
  shem: string;             // Hebrew display name
  transliteration: string;
  tier: 'enlisted' | 'nco' | 'officer';
  votingPower: number;
  multiplier: number;
  tokensRequired: number;   // TMIM tokens needed to reach this rank
  color: string;
}

export const RANK_META: Record<Rank, RankMeta> = {
  turai:        { rank: 'turai',        shem: 'טוראי',      transliteration: 'Turai',        tier: 'enlisted', votingPower: 1,  multiplier: 1.0,  tokensRequired: 0,      color: '#94a3b8' },
  rav_turai:    { rank: 'rav_turai',    shem: 'רב טוראי',   transliteration: 'Rav Turai',    tier: 'enlisted', votingPower: 2,  multiplier: 1.2,  tokensRequired: 200,    color: '#94a3b8' },
  samal:        { rank: 'samal',        shem: 'סמל',        transliteration: 'Samal',        tier: 'nco',      votingPower: 5,  multiplier: 1.5,  tokensRequired: 800,    color: '#34d399' },
  samal_rishon: { rank: 'samal_rishon', shem: 'סמ"ר',       transliteration: 'Samal Rishon', tier: 'nco',      votingPower: 8,  multiplier: 2.0,  tokensRequired: 2000,   color: '#34d399' },
  rav_samal:    { rank: 'rav_samal',    shem: 'רס"מ',        transliteration: 'Rav Samal',    tier: 'nco',      votingPower: 12, multiplier: 2.5,  tokensRequired: 5000,   color: '#5b8ff5' },
  segen:        { rank: 'segen',        shem: 'סגן',        transliteration: 'Segen',        tier: 'officer',  votingPower: 18, multiplier: 3.0,  tokensRequired: 10000,  color: '#5b8ff5' },
  seren:        { rank: 'seren',        shem: 'סרן',        transliteration: 'Seren',        tier: 'officer',  votingPower: 25, multiplier: 4.0,  tokensRequired: 20000,  color: '#f5c842' },
  rav_seren:    { rank: 'rav_seren',    shem: 'רב סרן',     transliteration: 'Rav Seren',    tier: 'officer',  votingPower: 35, multiplier: 5.0,  tokensRequired: 40000,  color: '#f5c842' },
  sgan_aluf:    { rank: 'sgan_aluf',    shem: 'סגן אלוף',   transliteration: 'Sgan Aluf',    tier: 'officer',  votingPower: 45, multiplier: 7.0,  tokensRequired: 75000,  color: '#f5c842' },
  aluf:         { rank: 'aluf',         shem: 'אלוף',       transliteration: 'Aluf',         tier: 'officer',  votingPower: 60, multiplier: 10.0, tokensRequired: 150000, color: '#f5c842' },
};

// ── מסלול לימוד (Learning Track) ────────────────────────────────
export type LearningTrack = 'נגלה' | 'חסידות' | 'תמים';

// ── מקום (Location) ──────────────────────────────────────────────
export interface Makom {
  id: string;
  shem: string;              // e.g. "ירושלים"
  transliteration: string;   // e.g. "Jerusalem"
  country: string;
  timezone: string;
  memberCount: number;
  activeMivtzaot: number;
  coordinatorId: string;
  status: 'active' | 'forming' | 'inactive';
  createdAt: string;
}

// ── תלמיד (Student / Chayal) ────────────────────────────────────
export interface Talmid {
  id: string;
  shem: string;
  rank: Rank;
  track: LearningTrack;
  makomId: string;
  walletAddress?: string;
  tokenBalance: number;
  totalTokensEarned: number;
  peerReviewsGiven: number;
  peerReviewsReceived: number;
  papersPublished: number;
  votingPower: number;
  tafkidimCompleted: number;
  chavrusaId: string | null;
  shiurGroupId: string | null;
  zalId: string | null;
  avatarUrl: string | null;
  nirashemAt: string;
  isOnline: boolean;
}

// ── קבוצה (Shiur Group hierarchy) ───────────────────────────────
export type GroupType = 'chavrusa' | 'shiur' | 'zal' | 'yeshiva';

export interface ShiurGroup {
  id: string;
  type: GroupType;
  name: string;
  leaderId: string;
  memberIds: string[];
  parentGroupId: string | null;
  childGroupIds: string[];
}

// ── מבצע (Campaign / Course) ─────────────────────────────────────
export type MivtzaType = 'course' | 'research' | 'publication' | 'chaburah';
export type MivtzaStatus = 'draft' | 'active' | 'in_progress' | 'completed' | 'archived';
export type MivtzaCategory = 'nigleh' | 'chassidus' | 'halacha' | 'machshava' | 'kabbalah';
export type PublicationType = 'digital_sefer' | 'printed_book' | 'research_journal' | 'source_anthology';

// ── מטא-נתוני פרסום (Publication metadata, optional on publication-type mivtzaot) ──
export type PublicationFormat = 'print' | 'ebook' | 'web_native' | 'source_anthology' | 'hybrid';
export type PublicationLicense = 'cc_by_sa' | 'cc_by_nc' | 'all_rights_reserved' | 'custom';

export interface PublicationMeta {
  titleHebrew: string;
  titleEnglish?: string;
  subtitle?: string;
  targetFormat: PublicationFormat;
  targetAudience?: string;
  targetLength?: number;       // pages or word count
  targetDeadline?: string;     // ISO date
  totalBudgetTmim?: number;
  license: PublicationLicense;
  manuscriptIpfsCid?: string;
}

export interface Mivtza {
  id: string;
  shem: string;
  description: string;
  type: MivtzaType;
  category: MivtzaCategory;
  creatorId: string;
  locationId: string;
  isGlobal: boolean;
  status: MivtzaStatus;
  tokenAllocation: number;
  tokensUsed: number;
  enrolledIds: string[];
  masimotCount: number;
  deadline?: string;
  topics: string[];
  publicationType?: PublicationType;
  researchQuestion?: string;
  publicationMeta?: PublicationMeta;
  createdAt: string;
  updatedAt: string;
}

// ── משימה (Assignment / Mission) ────────────────────────────────
export type MasimaType =
  | 'lecture_notes'
  | 'research_paper'
  | 'chapter_draft'
  | 'source_analysis'
  | 'peer_review'
  | 'presentation'
  // publication-specific
  | 'translation'
  | 'original_analysis'
  | 'scholarly_footnote'
  | 'editing'
  | 'proofreading'
  | 'formatting_typesetting'
  | 'indexing'
  | 'design_layout'
  | 'source_collection';

export type MasimaStatus = 'open' | 'in_progress' | 'submitted' | 'in_review' | 'revision_requested' | 'approved' | 'published';

export interface Masima {
  id: string;
  shem: string;
  description: string;
  mivtzaId: string;
  type: MasimaType;
  assigneeId?: string;
  reviewerId?: string;
  status: MasimaStatus;
  tafkidimCount: number;
  tokenAllocation: number;
  deadline?: string;
  contentUrl?: string;
  submissionNotes?: string;
  reviewCount: number;
  averageRating?: number;
  createdAt: string;
  updatedAt: string;
}

// Default TMIM rewards and labels per masima type
export const MASIMA_TYPE_DEFAULTS: Record<MasimaType, { baseReward: number; label: string; desc: string }> = {
  research_paper:         { baseReward: 500, label: 'מאמר מחקרי',    desc: 'מחקר מקורי עם מקורות' },
  chapter_draft:          { baseReward: 300, label: 'טיוטת פרק',     desc: 'כתיבת פרק לספר שיתופי' },
  source_analysis:        { baseReward: 200, label: 'ניתוח מקורות',  desc: 'ליקוט ועיון מקורות' },
  lecture_notes:          { baseReward: 150, label: 'סיכום שיעור',   desc: 'הכנת סיכום מובנה' },
  presentation:           { baseReward: 200, label: 'מצגת',          desc: 'הכנת הרצאה / חבורה' },
  peer_review:            { baseReward: 100, label: 'ביקורת עמיתים', desc: 'ביקורת על עבודת עמית' },
  translation:            { baseReward: 250, label: 'תרגום',         desc: 'תרגום טקסט מקורי' },
  original_analysis:      { baseReward: 400, label: 'חידוש',         desc: 'ניתוח מקורי / חידוש' },
  scholarly_footnote:     { baseReward: 80,  label: 'הערת שוליים',   desc: 'מקור מלומד עם ציטוטים' },
  editing:                { baseReward: 150, label: 'עריכה',         desc: 'עריכה ספרותית / הלכתית' },
  proofreading:           { baseReward: 80,  label: 'הגהה',          desc: 'בדיקת הגהה ודיוק' },
  formatting_typesetting: { baseReward: 120, label: 'עיצוב גופני',   desc: 'עיצוב ועימוד לדפוס' },
  indexing:               { baseReward: 100, label: 'אינדקס',        desc: 'הכנת מפתח נושאים' },
  design_layout:          { baseReward: 180, label: 'עיצוב גרפי',   desc: 'עיצוב גרפי ופריסת עמוד' },
  source_collection:      { baseReward: 120, label: 'ליקוט מקורות',  desc: 'איסוף מקורות ראשוניים' },
};

// ── בקשת הצטרפות לפרסום (Publication Contribution Application) ──
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface MivtzaApplication {
  id: string;
  mivtzaId: string;
  applicantId: string;
  statement: string;        // ≤300 words
  status: ApplicationStatus;
  reviewedBy?: string;      // officer who approved/rejected
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ── תפקיד (Task) ─────────────────────────────────────────────────
export type TafkidType = 'write' | 'review' | 'research' | 'present' | 'edit' | 'source_collection';
export type TafkidStatus = 'todo' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
export type TafkidPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Tafkid {
  id: string;
  shem: string;
  description: string;
  masimaId: string;
  mivtzaId: string;
  assigneeId?: string;
  type: TafkidType;
  status: TafkidStatus;
  priority: TafkidPriority;
  tokenReward: number;
  deadline?: string;
  submissionNotes?: string;
  createdAt: string;
}

// ── ביקורת עמיתים (Peer Review) ─────────────────────────────────
export interface PeerReview {
  id: string;
  masimaId: string;
  reviewerId: string;
  authorId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comments: string;
  suggestions: string[];
  status: 'pending' | 'submitted' | 'acknowledged';
  tokensEarned: number;
  createdAt: string;
}

// ── דיון (Discussion Thread) ─────────────────────────────────────
export interface Discussion {
  id: string;
  masimaId: string;
  authorId: string;
  parentId?: string;
  content: string;
  tokensEarned: number;
  createdAt: string;
}

// ── תרומה (Donation) ─────────────────────────────────────────────
export interface Donation {
  id: string;
  donorName: string;
  donorWallet?: string;
  amount: number;
  tmimMinted: number;
  makomId?: string;
  mivtzaId?: string;
  message?: string;
  createdAt: string;
}

// ── אוצר (Treasury) ─────────────────────────────────────────────
export interface Treasury {
  totalDonated: number;
  totalTmimMinted: number;
  totalTmimDistributed: number;
  totalTmimRedeemed: number;
  currentBalance: number;
  tmimCirculating: number;
}

// ── פעילות (Activity Feed) ───────────────────────────────────────
export type ActivityType =
  | 'mivtza_created'
  | 'masima_opened'
  | 'masima_completed'
  | 'tafkid_completed'
  | 'tafkid_submitted'
  | 'talmid_promoted'
  | 'talmid_enrolled'
  | 'tmim_distributed'
  | 'farbrengen_announced'
  | 'maamar_shared'
  | 'peer_review_submitted'
  | 'paper_published';

export interface Activity {
  id: string;
  type: ActivityType;
  actorId: string;
  actorShem: string;
  targetId: string;
  targetTitle: string;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// ── מאמר (Chassidic Discourse) ──────────────────────────────────
export interface Maamar {
  id: string;
  title: string;
  authorId: string;
  hemshech: string | null;
  hemshechNumber: number | null;
  summary: string;
  sharedAt: string;
  tags: string[];
}

// ── פארברענגען (Farbrengen Event) ──────────────────────────────
export type FarbrengenStatus = 'upcoming' | 'live' | 'completed';

export interface Farbrengen {
  id: string;
  title: string;
  description: string;
  hostId: string;
  scheduledAt: string;
  status: FarbrengenStatus;
  recordingUrl: string | null;
  attendeeIds: string[];
}

// ── סטטיסטיקות לוח המחוונים ──────────────────────────────────────
export interface DashboardStats {
  activeMivtzaot: number;
  openMasimot: number;
  pendingTafkidim: number;
  pendingReviews: number;
  totalTmimDistributed: number;
  onlineTalmidim: number;
}

// ── ניווט ─────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

// ── לוח זמנים יומי ──────────────────────────────────────────────
export interface SederScheduleItem {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  type: 'chassidus' | 'nigleh' | 'tefila' | 'break';
  status: 'upcoming' | 'active' | 'completed';
}

// ═══════════════════════════════════════════════════════════════
// ממשל (Governance) — Spec 2C
// ═══════════════════════════════════════════════════════════════

export type ProposalState = 'active' | 'passed' | 'failed' | 'queued' | 'executed' | 'cancelled';

// Matches ChayoleiGovernance.sol ProposalType enum (order is load-bearing)
export const PROPOSAL_TYPES = [
  'signal',
  'mivtza_funding',
  'redemption_rate',
  'emergency_pause',
  'emergency_unpause',
  'treasury_transfer',
  'grant_role',
  'parameter_update',
  'mint_tokens',
  'monthly_cap_update',
] as const;

export type ProposalType = typeof PROPOSAL_TYPES[number];

// Maps ProposalType string → on-chain uint8 enum index
export const PROPOSAL_TYPE_CHAIN_INDEX: Record<ProposalType, number> =
  Object.fromEntries(PROPOSAL_TYPES.map((t, i) => [t, i])) as Record<ProposalType, number>;

export interface Proposal {
  id: string;
  proposer: string;                // Wallet address
  proposerTalmid?: Talmid;
  type: ProposalType;
  title: string;
  description: string;
  target: string;                  // Target contract address
  callData: string;
  callDataDecoded?: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  snapshotBlock: number;
  votingStartTime: string;         // ISO timestamp
  votingEndTime: string;
  executionTime?: string;
  state: ProposalState;
  executed: boolean;
  quorumReached: boolean;
  quorumRequired: number;
  totalVotingTokens: number;
  myVote?: 'for' | 'against' | 'abstain' | null;
}

export interface VotingPowerInfo {
  tmimBalance: number;
  rankKey: string;
  rankVotingMultiplier: number;
  totalPower: number;
  delegatedTo?: string;
  delegatedFrom: string[];
}

export interface PaymentStream {
  id: string;
  recipient: string;
  recipientTalmid?: Talmid;
  totalAmount: number;
  claimedAmount: number;
  startTime: string;
  endTime: string;
  cancelled: boolean;
  claimable: number;
}

export interface TreasuryStats {
  totalDonatedUSD: number;
  tmimCirculating: number;
  tmimTotalMinted: number;
  usdcBalance: number;
  ethBalance: number;
  reserveRatio: number;
  redemptionRate: number;
  maxMonthlyMint: number;
  currentMonthMinted: number;
}

export interface DonationForm {
  amount: number;
  currency: 'ETH' | 'USDC';
  earmarkType: 'none' | 'makom' | 'mivtza';
  earmarkId?: string;
  message?: string;
}

export interface RedemptionForm {
  tmimAmount: number;
  usdcReceived: number;
  eligible: boolean;
  ineligibleReason?: string;
}

// Rank voting power lookup (mirrors ChayoleiGovernance.sol rankVotingPower array)
export const RANK_VOTING_POWER: Record<Rank, number> = {
  turai:        1,
  rav_turai:    2,
  samal:        5,
  samal_rishon: 8,
  rav_samal:    12,
  segen:        18,
  seren:        25,
  rav_seren:    35,
  sgan_aluf:    45,
  aluf:         60,
};

// Proposal type Hebrew labels
export const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
  signal:              'הצעה עצתית (ייעוץ בלבד)',
  mivtza_funding:      'הקצאת תקציב למבצע',
  redemption_rate:     'שינוי שער פדיון',
  emergency_pause:     'השהיית חירום',
  emergency_unpause:   'ביטול השהיה',
  treasury_transfer:   'העברה מהאוצר',
  grant_role:          'הענקת הרשאה',
  parameter_update:    'עדכון פרמטר',
  mint_tokens:         'הנפקת טוקנים',
  monthly_cap_update:  'עדכון תקרה חודשית',
};
