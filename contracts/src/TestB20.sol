// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20Lite, Owned} from "./lib/Base.sol";
import {PolicyRegistry} from "./PolicyRegistry.sol";

/// @title TestB20
/// @notice Testnet tokenized stock that behaves like a Coinbase B20 token on Base:
///         - a UI multiplier for splits and dividends (`balanceOfUI`, `toUIAmount`,
///           `fromUIAmount`, `updateUIMultiplier`)
///         - a transfer policy checked on every movement (blocked transfers revert)
///         - `transferWithMemo`
///         Real B20 tokens are precompiles on Base mainnet. This contract mirrors
///         their interface so StockNest can run end-to-end on Base Sepolia.
contract TestB20 is ERC20Lite, Owned {
    uint256 internal constant WAD = 1e18;

    PolicyRegistry public immutable registry;
    bytes32 public immutable ticker;
    uint64 public transferPolicyId;
    address public minter;
    uint256 public uiMultiplier = WAD;

    event MinterSet(address indexed minter);
    event TransferPolicySet(uint64 indexed policyId);
    event UIMultiplierUpdated(uint256 previous, uint256 current, string reason);
    event TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo);

    error PolicyForbids(address account);
    error NotMinter();
    error InvalidMultiplier();

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 ticker_,
        PolicyRegistry registry_,
        uint64 policyId_,
        address owner_
    ) ERC20Lite(name_, symbol_, 18) Owned(owner_) {
        registry = registry_;
        ticker = ticker_;
        transferPolicyId = policyId_;
    }

    // ---------------------------------------------------------------- admin

    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
        emit MinterSet(minter_);
    }

    function setTransferPolicy(uint64 policyId) external onlyOwner {
        transferPolicyId = policyId;
        emit TransferPolicySet(policyId);
    }

    /// @notice Corporate action, e.g. a 2-for-1 split doubles the multiplier.
    function updateUIMultiplier(uint256 newMultiplier, string calldata reason) external onlyOwner {
        if (newMultiplier == 0) revert InvalidMultiplier();
        emit UIMultiplierUpdated(uiMultiplier, newMultiplier, reason);
        uiMultiplier = newMultiplier;
    }

    /// @notice Issuance by the authorised market maker (the StockNest gift route on testnet).
    function mint(address to, uint256 rawAmount) external {
        if (msg.sender != minter) revert NotMinter();
        _mint(to, rawAmount);
    }

    // ---------------------------------------------------------------- B20 views

    function canReceive(address account) external view returns (bool) {
        return registry.isAuthorized(transferPolicyId, account);
    }

    function balanceOfUI(address account) external view returns (uint256) {
        return balanceOf[account] * uiMultiplier / WAD;
    }

    function totalSupplyUI() external view returns (uint256) {
        return totalSupply * uiMultiplier / WAD;
    }

    function toUIAmount(uint256 rawAmount) public view returns (uint256) {
        return rawAmount * uiMultiplier / WAD;
    }

    function fromUIAmount(uint256 uiAmount) public view returns (uint256) {
        return uiAmount * WAD / uiMultiplier;
    }

    function transferWithMemo(address to, uint256 amount, bytes32 memo) external returns (bool) {
        _transfer(msg.sender, to, amount);
        emit TransferWithMemo(msg.sender, to, amount, memo);
        return true;
    }

    // ---------------------------------------------------------------- policy hook

    function _beforeTransfer(address from, address to) internal view override {
        uint64 pid = transferPolicyId;
        if (from != address(0) && !registry.isAuthorized(pid, from)) revert PolicyForbids(from);
        if (!registry.isAuthorized(pid, to)) revert PolicyForbids(to);
    }
}
