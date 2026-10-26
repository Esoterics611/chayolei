// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CalendarMonth} from "./CalendarMonth.sol";

/// @notice What a team needs from the factory that created it.
interface ITeamHost {
    function mintFor(address to, uint256 amount, string calldata reason) external;
    function anchorer() external view returns (address);
    function tmim() external view returns (IERC20);
}

/**
 * @title Team
 * @notice One team's charter, treasury and payouts on-chain: the settled tier
 *         of the team's ledger (docs/TEAM_CONTRACTS.md). It mirrors the app's
 *         engine (src/lib/team/engine.ts) for everything that moves TMIM or
 *         changes the rules:
 *
 *  - Charter: roles as permission sets, members holding roles, seven rules.
 *  - Rules change only by a vote of the members, one member one vote, under
 *    the quorum and majority the charter sets.
 *  - Money changes (a transfer from the team account, or an objective's
 *    budget) are approved by a member who may spend when the TMIM at stake is
 *    within the spend limit, and go to a vote above it.
 *  - Accepting a deliverable mints its reward to the owner and the review
 *    reward to the reviewer, against the objective's budget and within the
 *    team's monthly issuance cap; the factory adds the platform's allowance.
 *  - The team account is this contract's TMIM balance. Members put TMIM in
 *    with a plain transfer.
 *  - Releases record a content hash; anchors record the root of each batch of
 *    signed (off-chain) ledger entries.
 *
 * Deployed as minimal clones by TeamFactory. Calls may come from members
 * directly (wallets, smart accounts) or through the trusted ERC-2771
 * forwarder, which relays a member's signed request so the platform can pay
 * the network fee.
 */
contract Team is ERC2771Context, EIP712, Initializable {
    // ── Permissions (bit order mirrors Permission in src/lib/team/types.ts) ──
    uint16 public constant TAKE_WORK   = 1 << 0;
    uint16 public constant REVIEW_WORK = 1 << 1;
    uint16 public constant ACCEPT_WORK = 1 << 2;
    uint16 public constant RELEASE     = 1 << 3;
    uint16 public constant MANAGE_PLAN = 1 << 4;
    uint16 public constant PROPOSE     = 1 << 5;
    uint16 public constant VOTE        = 1 << 6;
    uint16 public constant SPEND       = 1 << 7;
    uint16 public constant ADMIT       = 1 << 8;
    uint16 private constant ALL_PERMISSIONS = (1 << 9) - 1;

    // ── Rules (order mirrors RULE_ORDER in src/lib/team/templates.ts) ──
    uint8 public constant DELIVERABLE_REWARD   = 0;
    uint8 public constant REVIEW_REWARD        = 1;
    uint8 public constant MONTHLY_ISSUANCE_CAP = 2;
    uint8 public constant SPEND_LIMIT          = 3;
    uint8 public constant QUORUM_PCT           = 4;
    uint8 public constant MAJORITY_PCT         = 5;
    uint8 public constant VOTE_HOURS           = 6;
    uint8 public constant RULE_COUNT           = 7;

    uint8 public constant MAX_ROLES = 16;
    uint32 public constant MAX_MEMBERS = 500;
    uint256 public constant MAX_VOTE_HOURS = 24 * 30;

    enum Kind { Rule, Transfer, Budget }
    enum Status { None, Open, Passed, Failed, Approved, Declined }
    enum Choice { None, For, Against, Abstain }

    struct Config {
        bytes32 profileHash;        // hash of the off-chain profile: name, purpose, role names
        uint16[] rolePermissions;   // permission bits per role; index = role number
        uint16 founderRoles;        // role bits given to the founder
        uint16 joinerRoles;         // role bits given to people who join by invite
        uint256[7] rules;           // starting value of each rule
    }

    struct Proposal {
        Kind kind;
        Status status;
        bool byVote;
        uint8 rule;           // Kind.Rule: which rule
        uint32 forVotes;
        uint32 against;
        uint32 abstain;
        uint64 openedAt;
        uint64 closesAt;      // byVote only
        address proposer;
        address to;           // Kind.Transfer: the member paid
        bytes32 objective;    // Kind.Budget: the objective
        uint256 value;        // new rule value, transfer amount, or new budget
        uint256 stake;        // TMIM at stake: the transfer, or the budget change
    }

    bytes32 private constant INVITE_TYPEHASH =
        keccak256("Invite(bytes32 id,uint32 maxUses,uint64 expiresAt)");

    ITeamHost public host;
    bytes32 public profileHash;
    uint16[] private _rolePermissions;
    uint16 public joinerRoles;

    mapping(address => uint16) public rolesOf;   // 0: not a member
    uint32 public memberCount;
    uint32 public voterCount;

    uint256[7] private _rules;
    uint32[7] private _ruleVersions;

    mapping(bytes32 => uint256) public budgetOf;      // objective → TMIM budget
    mapping(bytes32 => uint256) public paidFrom;      // objective → TMIM minted against it
    mapping(uint256 => uint256) public issuedIn;      // yyyymm → TMIM minted by this team

    mapping(bytes32 => bytes32) public acceptedVersion;  // deliverable → accepted version hash
    mapping(bytes32 => bytes32) public releasedContent;  // deliverable → released content hash
    mapping(bytes32 => bool) public payRefUsed;          // scheduled-pay references

    mapping(bytes32 => Proposal) private _proposals;
    mapping(bytes32 => mapping(address => Choice)) public voteOf;
    mapping(uint8 => bytes32) public openRuleProposal;

    mapping(bytes32 => uint32) public inviteUses;
    mapping(bytes32 => bool) public inviteRevoked;

    uint64 public anchoredBatches;

    // ── Events ──────────────────────────────────────────────────────────
    event TeamInitialized(address indexed founder, bytes32 profileHash, uint16 founderRoles, uint16 joinerRoles);
    event MemberJoined(address indexed member, uint16 roles, bytes32 indexed inviteId, address indexed inviter);
    event InviteRevoked(bytes32 indexed inviteId, address indexed by);
    event ProposalOpened(
        bytes32 indexed ref, Kind kind, address indexed proposer, bool byVote, uint64 closesAt,
        uint8 rule, address to, bytes32 objective, uint256 value, uint256 stake
    );
    event VoteCast(bytes32 indexed ref, address indexed voter, Choice choice);
    event ProposalDecided(bytes32 indexed ref, Status status, uint32 forVotes, uint32 against, uint32 abstain, uint32 eligible);
    event RuleChanged(uint8 indexed rule, uint256 from, uint256 to, uint32 version, bytes32 indexed ref);
    event MoneyMoved(bytes32 indexed ref, address indexed to, uint256 amount, address indexed approver);
    event BudgetSet(bytes32 indexed objective, uint256 from, uint256 to, bytes32 indexed ref);
    event Accepted(
        bytes32 indexed deliverable, bytes32 indexed objective, address indexed owner, uint256 reward,
        address reviewer, uint256 reviewReward, bytes32 versionHash, address approver
    );
    event Released(bytes32 indexed deliverable, bytes32 contentHash, address indexed by);
    event Paid(bytes32 indexed ref, bytes32 indexed objective, address indexed to, uint256 amount, address by);
    event Anchored(uint64 indexed batch, bytes32 root, uint64 entries, address indexed by);

    // ── Errors ──────────────────────────────────────────────────────────
    error NotPermitted(uint16 permission);
    error NotMember(address account);
    error AlreadyMember(address account);
    error InvalidConfig();
    error InvalidValue();
    error UnknownProposal();
    error ProposalExists();
    error RuleProposalOpen();
    error NotOpen();
    error VotingClosed();
    error NotByVote();
    error ByVote();
    error SelfApproval();
    error NotProposer();
    error SelfAcceptance();
    error InsufficientAccount(uint256 account, uint256 amount);
    error BudgetExceeded(uint256 cost, uint256 left);
    error CapExceeded(uint256 cost, uint256 issued, uint256 cap);
    error AlreadyAccepted();
    error NotAccepted();
    error AlreadyReleased();
    error RefUsed();
    error InviteInvalid();
    error BatchOutOfOrder(uint64 expected);
    error TeamFull();

    // ── Setup ───────────────────────────────────────────────────────────

    /// @param forwarder The platform's ERC-2771 forwarder, shared by every clone.
    constructor(address forwarder) ERC2771Context(forwarder) EIP712("Chayolei Team", "1") {
        _disableInitializers();
    }

    function initialize(address founder, Config calldata cfg) external initializer {
        uint256 roleCount = cfg.rolePermissions.length;
        if (founder == address(0) || roleCount == 0 || roleCount > MAX_ROLES) revert InvalidConfig();
        uint16 roleMask = uint16((uint256(1) << roleCount) - 1);
        if (cfg.founderRoles == 0 || cfg.founderRoles & ~roleMask != 0) revert InvalidConfig();
        if (cfg.joinerRoles == 0 || cfg.joinerRoles & ~roleMask != 0) revert InvalidConfig();
        for (uint256 i; i < roleCount; ++i) {
            if (cfg.rolePermissions[i] & ~ALL_PERMISSIONS != 0) revert InvalidConfig();
            _rolePermissions.push(cfg.rolePermissions[i]);
        }
        for (uint8 k; k < RULE_COUNT; ++k) {
            if (!_validRule(k, cfg.rules[k])) revert InvalidConfig();
            _rules[k] = cfg.rules[k];
            _ruleVersions[k] = 1;
        }
        host = ITeamHost(msg.sender);
        profileHash = cfg.profileHash;
        joinerRoles = cfg.joinerRoles;
        _admit(founder, cfg.founderRoles);
        emit TeamInitialized(founder, cfg.profileHash, cfg.founderRoles, cfg.joinerRoles);
    }

    // ── Views ───────────────────────────────────────────────────────────

    function rule(uint8 key) external view returns (uint256 value, uint32 version) {
        return (_rules[key], _ruleVersions[key]);
    }

    function rules() external view returns (uint256[7] memory) {
        return _rules;
    }

    function rolePermissions() external view returns (uint16[] memory) {
        return _rolePermissions;
    }

    function permissionsOf(address account) public view returns (uint16 perms) {
        uint16 roles = rolesOf[account];
        for (uint256 i; roles != 0; ++i) {
            if (roles & 1 != 0) perms |= _rolePermissions[i];
            roles >>= 1;
        }
    }

    function can(address account, uint16 permission) public view returns (bool) {
        return permissionsOf(account) & permission == permission;
    }

    function proposal(bytes32 ref) external view returns (Proposal memory) {
        return _proposals[ref];
    }

    function teamAccount() public view returns (uint256) {
        return host.tmim().balanceOf(address(this));
    }

    function budgetLeft(bytes32 objective) public view returns (uint256) {
        return budgetOf[objective] - paidFrom[objective];
    }

    function issuedThisMonth() public view returns (uint256) {
        return issuedIn[CalendarMonth.yyyymm(block.timestamp)];
    }

    /// @notice The EIP-712 digest an inviter signs for an invite link.
    function inviteDigest(bytes32 id, uint32 maxUses, uint64 expiresAt) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(INVITE_TYPEHASH, id, maxUses, expiresAt)));
    }

    // ── Members ─────────────────────────────────────────────────────────

    /**
     * @notice Join with an invite link signed by a member who may admit
     *         people. The caller gets the charter's joiner roles.
     * @param inviter   The member who signed the invite (an EOA or a smart account; ERC-1271)
     */
    function join(address inviter, bytes32 id, uint32 maxUses, uint64 expiresAt, bytes calldata signature) external {
        address joiner = _msgSender();
        if (rolesOf[joiner] != 0) revert AlreadyMember(joiner);
        if (!can(inviter, ADMIT)) revert NotPermitted(ADMIT);
        if (inviteRevoked[id] || block.timestamp > expiresAt || inviteUses[id] >= maxUses) revert InviteInvalid();
        if (!SignatureChecker.isValidSignatureNow(inviter, inviteDigest(id, maxUses, expiresAt), signature)) {
            revert InviteInvalid();
        }
        inviteUses[id] += 1;
        _admit(joiner, joinerRoles);
        emit MemberJoined(joiner, joinerRoles, id, inviter);
    }

    function revokeInvite(bytes32 id) external {
        _require(ADMIT);
        inviteRevoked[id] = true;
        emit InviteRevoked(id, _msgSender());
    }

    // ── Work: accept and pay, release ───────────────────────────────────

    /**
     * @notice Accept a deliverable and pay for it in one step: mints `reward`
     *         to its owner and the charter's review reward to its reviewer,
     *         from the objective's budget, within the month's issuance cap.
     * @param reviewer     Who reviewed it, or address(0) if no one else did
     * @param versionHash  Hash of the accepted version's content
     */
    function acceptAndPay(
        bytes32 deliverable,
        bytes32 objective,
        address owner,
        uint256 reward,
        address reviewer,
        bytes32 versionHash
    ) external {
        address approver = _require(ACCEPT_WORK);
        if (acceptedVersion[deliverable] != bytes32(0)) revert AlreadyAccepted();
        if (versionHash == bytes32(0) || reward == 0) revert InvalidValue();
        if (rolesOf[owner] == 0) revert NotMember(owner);
        if (owner == approver) revert SelfAcceptance();
        uint256 reviewReward;
        if (reviewer != address(0)) {
            if (rolesOf[reviewer] == 0) revert NotMember(reviewer);
            if (reviewer == owner) revert InvalidValue();
            reviewReward = _rules[REVIEW_REWARD];
        }
        _spendBudget(objective, reward + reviewReward);
        acceptedVersion[deliverable] = versionHash;
        emit Accepted(deliverable, objective, owner, reward, reviewer, reviewReward, versionHash, approver);
        host.mintFor(owner, reward, "deliverable_accepted");
        if (reviewReward != 0) host.mintFor(reviewer, reviewReward, "review");
    }

    function release(bytes32 deliverable, bytes32 contentHash) external {
        address by = _require(RELEASE);
        if (acceptedVersion[deliverable] == bytes32(0)) revert NotAccepted();
        if (releasedContent[deliverable] != bytes32(0)) revert AlreadyReleased();
        if (contentHash == bytes32(0)) revert InvalidValue();
        releasedContent[deliverable] = contentHash;
        emit Released(deliverable, contentHash, by);
    }

    /**
     * @notice Scheduled pay: a member who may spend pays a member from an
     *         objective's budget, within the month's issuance cap.
     * @param ref  Unique reference of this payment (schedule and due date), so it pays once
     */
    function payFromBudget(bytes32 ref, bytes32 objective, address to, uint256 amount) external {
        address by = _require(SPEND);
        if (payRefUsed[ref]) revert RefUsed();
        if (rolesOf[to] == 0) revert NotMember(to);
        if (amount == 0) revert InvalidValue();
        _spendBudget(objective, amount);
        payRefUsed[ref] = true;
        emit Paid(ref, objective, to, amount, by);
        host.mintFor(to, amount, "scheduled_pay");
    }

    // ── Decide: rules and money ─────────────────────────────────────────

    /// @notice Propose a new value for one rule of the charter; decided by vote.
    function proposeRule(bytes32 ref, uint8 key, uint256 value) external {
        address proposer = _require(PROPOSE);
        if (key >= RULE_COUNT || !_validRule(key, value) || value == _rules[key]) revert InvalidValue();
        if (_proposals[openRuleProposal[key]].status == Status.Open) revert RuleProposalOpen();
        Proposal storage p = _open(ref, Kind.Rule, proposer, true);
        p.rule = key;
        p.value = value;
        openRuleProposal[key] = ref;
        emit ProposalOpened(ref, Kind.Rule, proposer, true, p.closesAt, key, address(0), bytes32(0), value, 0);
    }

    /// @notice Request a transfer from the team account to a member.
    function proposeTransfer(bytes32 ref, address to, uint256 amount) external {
        address proposer = _require(PROPOSE);
        if (rolesOf[to] == 0) revert NotMember(to);
        if (amount == 0) revert InvalidValue();
        Proposal storage p = _open(ref, Kind.Transfer, proposer, amount > _rules[SPEND_LIMIT]);
        p.to = to;
        p.value = amount;
        p.stake = amount;
        emit ProposalOpened(ref, Kind.Transfer, proposer, p.byVote, p.closesAt, 0, to, bytes32(0), amount, amount);
    }

    /// @notice Request a new budget for an objective. The TMIM at stake is the change.
    function proposeBudget(bytes32 ref, bytes32 objective, uint256 newBudget) external {
        address proposer = _require(PROPOSE);
        uint256 current = budgetOf[objective];
        if (newBudget == current || newBudget < paidFrom[objective]) revert InvalidValue();
        uint256 stake = newBudget > current ? newBudget - current : current - newBudget;
        Proposal storage p = _open(ref, Kind.Budget, proposer, stake > _rules[SPEND_LIMIT]);
        p.objective = objective;
        p.value = newBudget;
        p.stake = stake;
        emit ProposalOpened(ref, Kind.Budget, proposer, p.byVote, p.closesAt, 0, address(0), objective, newBudget, stake);
    }

    /// @notice Approve a money change within the spend limit (not your own).
    function approve(bytes32 ref) external {
        address approver = _require(SPEND);
        Proposal storage p = _openProposal(ref);
        if (p.byVote) revert ByVote();
        if (p.proposer == approver) revert SelfApproval();
        if (p.kind == Kind.Transfer && p.value > teamAccount()) revert InsufficientAccount(teamAccount(), p.value);
        if (p.kind == Kind.Budget && p.value < paidFrom[p.objective]) revert InvalidValue();
        p.status = Status.Approved;
        emit ProposalDecided(ref, Status.Approved, 0, 0, 0, 0);
        _apply(ref, p, approver);
    }

    function decline(bytes32 ref) external {
        _require(SPEND);
        Proposal storage p = _openProposal(ref);
        if (p.byVote) revert ByVote();
        p.status = Status.Declined;
        emit ProposalDecided(ref, Status.Declined, 0, 0, 0, 0);
    }

    /// @notice Vote on a rule change or a money change above the spend limit.
    ///         Voting again changes your vote. The last eligible vote decides.
    function vote(bytes32 ref, Choice choice) external {
        address voter = _require(VOTE);
        Proposal storage p = _openProposal(ref);
        if (!p.byVote) revert NotByVote();
        if (block.timestamp > p.closesAt) revert VotingClosed();
        if (choice == Choice.None) revert InvalidValue();
        Choice previous = voteOf[ref][voter];
        if (previous == Choice.For) p.forVotes--;
        else if (previous == Choice.Against) p.against--;
        else if (previous == Choice.Abstain) p.abstain--;
        if (choice == Choice.For) p.forVotes++;
        else if (choice == Choice.Against) p.against++;
        else p.abstain++;
        voteOf[ref][voter] = choice;
        emit VoteCast(ref, voter, choice);
        if (uint256(p.forVotes) + p.against + p.abstain >= voterCount) _decide(ref, p);
    }

    /// @notice Close voting: the proposer may close early; anyone may once the deadline has passed.
    function closeVoting(bytes32 ref) external {
        Proposal storage p = _openProposal(ref);
        if (!p.byVote) revert NotByVote();
        if (block.timestamp < p.closesAt && _msgSender() != p.proposer) revert NotProposer();
        _decide(ref, p);
    }

    // ── Ledger anchors ──────────────────────────────────────────────────

    /**
     * @notice Record the root of the next batch of signed ledger entries.
     *         Any member, or the platform's anchoring service, may anchor.
     */
    function anchor(uint64 batch, bytes32 root, uint64 entries) external {
        address by = _msgSender();
        if (rolesOf[by] == 0 && by != host.anchorer()) revert NotMember(by);
        if (batch != anchoredBatches + 1) revert BatchOutOfOrder(anchoredBatches + 1);
        if (root == bytes32(0) || entries == 0) revert InvalidValue();
        anchoredBatches = batch;
        emit Anchored(batch, root, entries, by);
    }

    // ── Internals ───────────────────────────────────────────────────────

    function _require(uint16 permission) private view returns (address sender) {
        sender = _msgSender();
        if (!can(sender, permission)) revert NotPermitted(permission);
    }

    function _admit(address account, uint16 roles) private {
        if (memberCount >= MAX_MEMBERS) revert TeamFull();
        rolesOf[account] = roles;
        memberCount++;
        if (can(account, VOTE)) voterCount++;
    }

    function _validRule(uint8 key, uint256 value) private pure returns (bool) {
        if (key == QUORUM_PCT) return value <= 100;
        // A majority of 100% could never be exceeded, and would freeze the charter.
        if (key == MAJORITY_PCT) return value >= 50 && value < 100;
        if (key == VOTE_HOURS) return value >= 1 && value <= MAX_VOTE_HOURS;
        return true;
    }

    function _spendBudget(bytes32 objective, uint256 cost) private {
        uint256 left = budgetLeft(objective);
        if (cost > left) revert BudgetExceeded(cost, left);
        uint256 month = CalendarMonth.yyyymm(block.timestamp);
        uint256 issued = issuedIn[month];
        if (issued + cost > _rules[MONTHLY_ISSUANCE_CAP]) revert CapExceeded(cost, issued, _rules[MONTHLY_ISSUANCE_CAP]);
        paidFrom[objective] += cost;
        issuedIn[month] = issued + cost;
    }

    function _open(bytes32 ref, Kind kind, address proposer, bool byVote) private returns (Proposal storage p) {
        if (ref == bytes32(0)) revert InvalidValue();
        p = _proposals[ref];
        if (p.status != Status.None) revert ProposalExists();
        p.kind = kind;
        p.status = Status.Open;
        p.byVote = byVote;
        p.proposer = proposer;
        p.openedAt = uint64(block.timestamp);
        if (byVote) p.closesAt = uint64(block.timestamp + _rules[VOTE_HOURS] * 1 hours);
    }

    function _openProposal(bytes32 ref) private view returns (Proposal storage p) {
        p = _proposals[ref];
        if (p.status == Status.None) revert UnknownProposal();
        if (p.status != Status.Open) revert NotOpen();
    }

    /// Same tally as the app (engine.ts `tally`): turnout of eligible voters
    /// at least the quorum, and "for" more than the majority of for + against.
    function _decide(bytes32 ref, Proposal storage p) private {
        uint32 eligible = voterCount;
        uint256 cast = uint256(p.forVotes) + p.against + p.abstain;
        uint256 decisive = uint256(p.forVotes) + p.against;
        bool passing = cast * 100 >= _rules[QUORUM_PCT] * eligible
            && decisive != 0
            && uint256(p.forVotes) * 100 > _rules[MAJORITY_PCT] * decisive;
        // Passed by vote but no longer possible: more than the team account
        // holds, or a budget below what has been paid from it since.
        if (passing && p.kind == Kind.Transfer && p.value > teamAccount()) passing = false;
        if (passing && p.kind == Kind.Budget && p.value < paidFrom[p.objective]) passing = false;
        p.status = passing ? Status.Passed : Status.Failed;
        if (p.kind == Kind.Rule) delete openRuleProposal[p.rule];
        emit ProposalDecided(ref, p.status, p.forVotes, p.against, p.abstain, eligible);
        if (passing) _apply(ref, p, address(0));
    }

    function _apply(bytes32 ref, Proposal storage p, address approver) private {
        if (p.kind == Kind.Rule) {
            uint256 from = _rules[p.rule];
            _rules[p.rule] = p.value;
            uint32 version = ++_ruleVersions[p.rule];
            emit RuleChanged(p.rule, from, p.value, version, ref);
        } else if (p.kind == Kind.Budget) {
            uint256 from = budgetOf[p.objective];
            budgetOf[p.objective] = p.value;
            emit BudgetSet(p.objective, from, p.value, ref);
        } else {
            emit MoneyMoved(ref, p.to, p.value, approver);
            if (!host.tmim().transfer(p.to, p.value)) revert InsufficientAccount(teamAccount(), p.value);
        }
    }
}
