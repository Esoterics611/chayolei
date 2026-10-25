// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TMIMToken.sol";

/**
 * @title ChayoleiTreasury
 * @notice DAO treasury — holds the ETH and USDC sent to it and redeems
 *         TMIM back to stablecoin. Crypto in, crypto out: money sent in
 *         never mints TMIM. TMIM is minted only for participation
 *         (MasimaRewardsV2).
 *
 *         Redemption rate: 1 TMIM = 0.10 USD (1000 bps).
 *         USDC/USDT address is set at deploy time for Base Sepolia.
 */
contract ChayoleiTreasury is AccessControl, ReentrancyGuard {
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    TMIMToken public immutable tmim;
    IERC20    public stablecoin; // USDC on Base Sepolia

    /// @notice Basis points: 1000 bps = $0.10 per TMIM
    uint256 public redemptionRateBps = 1000;

    uint256 public totalEthReceived;
    uint256 public totalUsdcFunded;
    uint256 public totalTmimRedeemed;

    event EthReceived(address indexed from, uint256 ethAmount);
    event UsdcFunded(address indexed from, uint256 usdcAmount);
    event TmimRedeemed(address indexed holder, uint256 tmimAmount, uint256 usdcPaid);
    event RedemptionRateUpdated(uint256 newRateBps);

    constructor(address admin, address tmimToken, address stablecoinAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURER_ROLE, admin);
        tmim       = TMIMToken(tmimToken);
        stablecoin = IERC20(stablecoinAddress);
    }

    // ── Funding (crypto in; mints nothing) ─────────────────────

    /// @notice Accept ETH sent to the treasury.
    receive() external payable {
        totalEthReceived += msg.value;
        emit EthReceived(msg.sender, msg.value);
    }

    /**
     * @notice Move USDC (6 decimals) into the treasury, backing redemptions.
     *         Caller must approve the treasury for `usdcAmount` first.
     */
    function fundUsdc(uint256 usdcAmount) external nonReentrant {
        require(usdcAmount > 0, "Amount must be positive");
        stablecoin.transferFrom(msg.sender, address(this), usdcAmount);
        totalUsdcFunded += usdcAmount;
        emit UsdcFunded(msg.sender, usdcAmount);
    }

    // ── Redemption ─────────────────────────────────────────────

    /**
     * @notice Burn TMIM and receive USDC back.
     *         User must call tmim.approve(treasury, amount) first.
     */
    function redeemTmim(uint256 tmimAmount) external nonReentrant {
        require(tmimAmount > 0, "Amount must be positive");
        // USDC to pay: tmimAmount * $0.10 = tmimAmount * 100000 USDC units
        uint256 usdcPayout = tmimAmount * 100_000;
        require(stablecoin.balanceOf(address(this)) >= usdcPayout, "Insufficient treasury balance");

        // Burn TMIM from sender (requires approval)
        tmim.burn(msg.sender, tmimAmount);
        stablecoin.transfer(msg.sender, usdcPayout);

        totalTmimRedeemed += tmimAmount;
        emit TmimRedeemed(msg.sender, tmimAmount, usdcPayout);
    }

    // ── Treasury Management ────────────────────────────────────

    function withdrawEth(address payable to, uint256 amount) external onlyRole(TREASURER_ROLE) {
        require(address(this).balance >= amount, "Insufficient ETH balance");
        to.transfer(amount);
    }

    function withdrawUsdc(address to, uint256 amount) external onlyRole(TREASURER_ROLE) {
        stablecoin.transfer(to, amount);
    }

    function setRedemptionRate(uint256 rateBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        redemptionRateBps = rateBps;
        emit RedemptionRateUpdated(rateBps);
    }

    function getEthBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getUsdcBalance() external view returns (uint256) {
        return stablecoin.balanceOf(address(this));
    }
}
