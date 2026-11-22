// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SafeTransfer} from "./lib/Base.sol";

/// @title NestVault
/// @notice Holds one child's gifted stocks. Only the guardian (the parent) can
///         move them out. The child never controls a wallet directly.
contract NestVault {
    using SafeTransfer for address;

    address public immutable stockNest;
    uint256 public immutable nestId;
    address public guardian;

    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event GuardianChanged(address indexed previous, address indexed current);

    error NotGuardian();
    error ZeroAddress();

    constructor(uint256 nestId_, address guardian_) {
        if (guardian_ == address(0)) revert ZeroAddress();
        stockNest = msg.sender;
        nestId = nestId_;
        guardian = guardian_;
    }

    modifier onlyGuardian() {
        if (msg.sender != guardian) revert NotGuardian();
        _;
    }

    function withdraw(address token, address to, uint256 amount) external onlyGuardian {
        if (to == address(0)) revert ZeroAddress();
        token.safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }

    function setGuardian(address newGuardian) external onlyGuardian {
        if (newGuardian == address(0)) revert ZeroAddress();
        emit GuardianChanged(guardian, newGuardian);
        guardian = newGuardian;
    }
}
