// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC2771Forwarder} from "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title TeamForwarder
 * @notice OpenZeppelin's ERC-2771 forwarder: relays a member's EIP-712 signed
 *         request to TeamFactory or a Team, so the platform pays the network
 *         fee and the contract still sees the member as the caller.
 */
contract TeamForwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("Chayolei Forwarder") {}
}
