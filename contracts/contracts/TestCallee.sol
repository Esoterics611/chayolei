// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test-only helper for C3 execution gas control tests.
contract TestCallee {
    uint256 public value;

    function setValue(uint256 v) external {
        value = v;
    }

    function revertWithMessage() external pure {
        revert("callee reverted");
    }

    function revertNoReason() external pure {
        revert();
    }
}
