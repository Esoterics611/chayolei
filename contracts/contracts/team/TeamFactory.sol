// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Team} from "./Team.sol";
import {CalendarMonth} from "./CalendarMonth.sol";

interface ITMIMMint {
    function mint(address to, uint256 amount, string calldata reason) external;
}

/**
 * @title TeamFactory
 * @notice Starts teams (one Team clone each) and is the only way a team mints
 *         TMIM. TMIM is one coin across the platform, so each team's own
 *         monthly cap (its charter, which the team amends by vote) sits under
 *         a platform allowance per team per calendar month, and an optional
 *         platform-wide monthly cap. The factory needs TMIM's MINTER_ROLE.
 *
 *  - Anyone may start a team. A new team mints up to `defaultAllowance` a
 *    month until the platform sets its own allowance; with the default at 0,
 *    new teams can organize at once and pay out once approved.
 *  - Setting a team's allowance to 0 stops its minting: the platform's brake
 *    if a team is compromised. It cannot touch a team's account or rules.
 */
contract TeamFactory is AccessControl, ERC2771Context {
    /// @notice May set allowances, the platform cap and the anchoring service.
    bytes32 public constant ALLOWANCE_ROLE = keccak256("ALLOWANCE_ROLE");

    address public immutable implementation;
    IERC20 public immutable tmim;

    mapping(address => bool) public isTeam;
    address[] private _teams;

    uint256 public defaultAllowance;
    mapping(address => uint256) private _allowance;
    mapping(address => bool) private _hasAllowance;
    mapping(address => mapping(uint256 => uint256)) public mintedBy;  // team → yyyymm → TMIM

    /// @notice TMIM all teams together may mint in a calendar month; 0 means no platform-wide cap.
    uint256 public platformMonthlyCap;
    mapping(uint256 => uint256) public mintedIn;                     // yyyymm → TMIM, all teams

    /// @notice The platform service that may anchor signed-entry batches for any team.
    address public anchorer;

    event TeamCreated(address indexed team, address indexed founder, bytes32 profileHash);
    event AllowanceSet(address indexed team, uint256 monthly);
    event DefaultAllowanceSet(uint256 monthly);
    event PlatformCapSet(uint256 monthly);
    event AnchorerSet(address anchorer);

    error NotTeam();
    error AllowanceExceeded(uint256 amount, uint256 minted, uint256 allowance);
    error PlatformCapExceeded(uint256 amount, uint256 minted, uint256 cap);

    constructor(address admin, IERC20 tmim_, address implementation_, address forwarder, uint256 defaultAllowance_)
        ERC2771Context(forwarder)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ALLOWANCE_ROLE, admin);
        tmim = tmim_;
        implementation = implementation_;
        defaultAllowance = defaultAllowance_;
        emit DefaultAllowanceSet(defaultAllowance_);
    }

    // ── Teams ───────────────────────────────────────────────────────────

    /// @notice Start a team; the caller is its founder.
    function createTeam(Team.Config calldata cfg) external returns (address team) {
        address founder = _msgSender();
        team = Clones.clone(implementation);
        isTeam[team] = true;
        _teams.push(team);
        Team(team).initialize(founder, cfg);
        emit TeamCreated(team, founder, cfg.profileHash);
    }

    function teamCount() external view returns (uint256) {
        return _teams.length;
    }

    function teamAt(uint256 i) external view returns (address) {
        return _teams[i];
    }

    // ── Minting ─────────────────────────────────────────────────────────

    /// @notice Mint TMIM for a team's payout. Only teams this factory created.
    function mintFor(address to, uint256 amount, string calldata reason) external {
        address team = msg.sender;
        if (!isTeam[team]) revert NotTeam();
        uint256 month = CalendarMonth.yyyymm(block.timestamp);
        uint256 minted = mintedBy[team][month];
        uint256 allowance = allowanceOf(team);
        if (minted + amount > allowance) revert AllowanceExceeded(amount, minted, allowance);
        uint256 total = mintedIn[month];
        if (platformMonthlyCap != 0 && total + amount > platformMonthlyCap) {
            revert PlatformCapExceeded(amount, total, platformMonthlyCap);
        }
        mintedBy[team][month] = minted + amount;
        mintedIn[month] = total + amount;
        ITMIMMint(address(tmim)).mint(to, amount, reason);
    }

    function allowanceOf(address team) public view returns (uint256) {
        return _hasAllowance[team] ? _allowance[team] : defaultAllowance;
    }

    /// @notice What a team may still mint this month under the platform's limits.
    function mintableThisMonth(address team) external view returns (uint256) {
        uint256 month = CalendarMonth.yyyymm(block.timestamp);
        uint256 allowance = allowanceOf(team);
        uint256 minted = mintedBy[team][month];
        uint256 left = allowance > minted ? allowance - minted : 0;
        if (platformMonthlyCap != 0) {
            uint256 platformLeft = platformMonthlyCap > mintedIn[month] ? platformMonthlyCap - mintedIn[month] : 0;
            if (platformLeft < left) left = platformLeft;
        }
        return left;
    }

    function currentMonth() external view returns (uint256) {
        return CalendarMonth.yyyymm(block.timestamp);
    }

    function monthOf(uint256 timestamp) external pure returns (uint256) {
        return CalendarMonth.yyyymm(timestamp);
    }

    // ── Platform settings ───────────────────────────────────────────────

    function setAllowance(address team, uint256 monthly) external onlyRole(ALLOWANCE_ROLE) {
        if (!isTeam[team]) revert NotTeam();
        _allowance[team] = monthly;
        _hasAllowance[team] = true;
        emit AllowanceSet(team, monthly);
    }

    function setDefaultAllowance(uint256 monthly) external onlyRole(ALLOWANCE_ROLE) {
        defaultAllowance = monthly;
        emit DefaultAllowanceSet(monthly);
    }

    function setPlatformMonthlyCap(uint256 monthly) external onlyRole(ALLOWANCE_ROLE) {
        platformMonthlyCap = monthly;
        emit PlatformCapSet(monthly);
    }

    function setAnchorer(address anchorer_) external onlyRole(ALLOWANCE_ROLE) {
        anchorer = anchorer_;
        emit AnchorerSet(anchorer_);
    }

    // ── ERC-2771 plumbing ───────────────────────────────────────────────

    function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength() internal view override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}
