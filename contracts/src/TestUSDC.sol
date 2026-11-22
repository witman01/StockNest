// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20Lite} from "./lib/Base.sol";

/// @title StockNest Test USDC
/// @notice Testnet-only stand-in for USDC (6 decimals) with a public faucet so
///         anyone trying the demo can get funds. Has no value.
contract TestUSDC is ERC20Lite {
    uint256 public constant FAUCET_AMOUNT = 1_000e6;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    mapping(address => uint256) public lastFaucet;

    event Faucet(address indexed to, uint256 amount);

    error FaucetCooldown(uint256 availableAt);

    constructor() ERC20Lite("StockNest Test USDC", "tUSDC", 6) {}

    /// @notice Mint 1,000 test USDC to the caller (once per hour).
    function faucet() external {
        uint256 next = lastFaucet[msg.sender] + FAUCET_COOLDOWN;
        if (lastFaucet[msg.sender] != 0 && block.timestamp < next) revert FaucetCooldown(next);
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Faucet(msg.sender, FAUCET_AMOUNT);
    }
}
