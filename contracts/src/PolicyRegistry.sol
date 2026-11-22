// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Owned} from "./lib/Base.sol";

/// @title PolicyRegistry
/// @notice Mirrors the B20 transfer-policy interface (`policyExists`, `isAuthorized`)
///         so StockNest can be built against the same checks real Coinbase
///         tokenized stocks use. `isAuthorized` never reverts.
contract PolicyRegistry is Owned {
    enum Kind {
        NONE,
        BLOCKLIST, // everyone allowed except listed accounts
        ALLOWLIST // only listed accounts allowed
    }

    struct Policy {
        Kind kind;
        address admin;
    }

    uint64 public nextPolicyId = 1;
    mapping(uint64 => Policy) public policies;
    mapping(uint64 => mapping(address => bool)) public isListed;

    event PolicyCreated(uint64 indexed policyId, Kind kind, address indexed admin);
    event PolicyMemberSet(uint64 indexed policyId, address indexed account, bool listed);

    error NotPolicyAdmin();
    error UnknownPolicy();
    error InvalidKind();

    constructor(address owner_) Owned(owner_) {}

    function createPolicy(Kind kind, address admin) external onlyOwner returns (uint64 policyId) {
        if (kind == Kind.NONE) revert InvalidKind();
        policyId = nextPolicyId++;
        policies[policyId] = Policy(kind, admin);
        emit PolicyCreated(policyId, kind, admin);
    }

    function setMember(uint64 policyId, address account, bool listed) external {
        Policy memory p = policies[policyId];
        if (p.kind == Kind.NONE) revert UnknownPolicy();
        if (msg.sender != p.admin && msg.sender != owner) revert NotPolicyAdmin();
        isListed[policyId][account] = listed;
        emit PolicyMemberSet(policyId, account, listed);
    }

    function policyExists(uint64 policyId) public view returns (bool) {
        return policies[policyId].kind != Kind.NONE;
    }

    /// @notice B20-style check. Unknown policies allow (callers should check `policyExists` first).
    function isAuthorized(uint64 policyId, address account) external view returns (bool) {
        Kind kind = policies[policyId].kind;
        if (kind == Kind.BLOCKLIST) return !isListed[policyId][account];
        if (kind == Kind.ALLOWLIST) return isListed[policyId][account];
        return true;
    }
}
