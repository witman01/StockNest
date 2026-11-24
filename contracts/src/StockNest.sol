// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Owned, SafeTransfer} from "./lib/Base.sol";
import {NestVault} from "./NestVault.sol";

interface ITestB20 {
    function mint(address to, uint256 rawAmount) external;
    function canReceive(address account) external view returns (bool);
    function fromUIAmount(uint256 uiAmount) external view returns (uint256);
    function toUIAmount(uint256 rawAmount) external view returns (uint256);
}

/// @title StockNest
/// @notice Giftable stock positions for children. A parent creates a nest (and
///         becomes its guardian). Anyone can then send that child a stock gift:
///
///         send   -> The giver pays USDC (or deposits shares they own). The share
///                   amount is fixed at a signed live quote (Chainlink feeds on
///                   Base mainnet) and the funds are held in escrow here.
///         claim  -> Once the gift opens (now, or the parent's chosen day), anyone
///                   can deliver it - our server does it automatically. It can only
///                   ever go to the child's vault. The vault is checked against the
///                   stock's transfer policy (B20 eligibility). Eligible: the shares
///                   go to the vault. Not eligible: the giver is refunded in full.
///         refund -> The only way money leaves escrow to anyone but the child: the
///                   child's vault can't legally hold that stock.
///         There is no expiry. A gift never goes back just because nobody acted.
///
///         Messages stay offchain. Only their hash (memoHash) is recorded.
contract StockNest is Owned {
    using SafeTransfer for address;

    uint256 public constant MIN_GIFT = 1e6; // 1 USDC
    uint256 public constant MAX_GIFT = 10_000e6; // 10,000 USDC
    uint256 public constant MAX_QUOTE_AGE = 10 minutes;
    uint256 public constant MAX_UNLOCK_DELAY = 20 * 365 days;

    enum Status {
        None,
        Pending,
        Claimed,
        Refunded
    }

    enum RefundReason {
        None,
        Ineligible
    }

    struct Nest {
        address vault;
        address guardian;
        bytes32 slugHash;
    }

    struct Gift {
        uint256 nestId;
        address giver;
        address token;
        uint256 usdcAmount; // escrowed USDC (0 for a share gift)
        uint256 rawShares; // escrowed shares (0 for a USDC gift)
        uint256 uiShares; // shares the child receives, 18 decimals, UI units
        uint64 unlockAt; // can't be delivered before this (the nest's opening day)
        Status status;
        bytes32 memoHash;
    }

    address public immutable usdc;
    address public quoteSigner;
    address public treasury;
    uint256 public nestCount;
    uint256 public giftCount;

    mapping(uint256 => Nest) public nests;
    mapping(bytes32 => uint256) public nestIdBySlug;
    mapping(address => bool) public isListed;
    mapping(uint256 => Gift) public gifts;

    event NestCreated(uint256 indexed nestId, bytes32 indexed slugHash, address vault, address indexed guardian);
    event StockListed(address indexed token, bool listed);
    event QuoteSignerSet(address indexed signer);
    event TreasurySet(address indexed treasury);
    event GiftSent(
        uint256 indexed giftId,
        uint256 indexed nestId,
        address indexed giver,
        address token,
        uint256 usdcAmount,
        uint256 uiShares,
        uint256 price,
        uint64 unlockAt,
        bytes32 memoHash
    );
    event GiftClaimed(uint256 indexed giftId, uint256 indexed nestId, address indexed token, uint256 uiShares);
    event GiftRefunded(uint256 indexed giftId, uint256 indexed nestId, address indexed giver, RefundReason reason);

    error SlugTaken();
    error UnknownNest();
    error NotListed();
    error BadAmount();
    error QuoteExpired();
    error BadQuote();
    error BadDates();
    error UnknownGift();
    error NotPending();
    error StillLocked();
    error NotRefundable();

    constructor(address owner_, address usdc_, address quoteSigner_, address treasury_) Owned(owner_) {
        if (usdc_ == address(0) || quoteSigner_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        usdc = usdc_;
        quoteSigner = quoteSigner_;
        treasury = treasury_;
    }

    // ------------------------------------------------------------------ nests

    /// @notice Create a nest. The caller becomes the guardian.
    function createNest(bytes32 slugHash) external returns (uint256) {
        return _createNest(slugHash, msg.sender);
    }

    /// @notice Create a nest on behalf of a guardian (used to seed demo nests).
    function createNestFor(bytes32 slugHash, address guardian) external onlyOwner returns (uint256) {
        return _createNest(slugHash, guardian);
    }

    function _createNest(bytes32 slugHash, address guardian) internal returns (uint256 id) {
        if (slugHash == bytes32(0) || nestIdBySlug[slugHash] != 0) revert SlugTaken();
        id = ++nestCount;
        NestVault vault = new NestVault(id, guardian);
        nests[id] = Nest(address(vault), guardian, slugHash);
        nestIdBySlug[slugHash] = id;
        emit NestCreated(id, slugHash, address(vault), guardian);
    }

    // ------------------------------------------------------------------ gifts

    /// @notice The digest the quote signer signs (EIP-191 personal message over this hash).
    function quoteHash(address token, uint256 price, uint64 expiry) public view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), token, price, expiry));
    }

    /// @notice Send a stock gift paid in USDC. The USDC is held in escrow until the
    ///         gift is delivered; the share amount is fixed now at the signed quote.
    /// @param price USD per whole share with 8 decimals (Chainlink format).
    /// @param unlockAt Earliest delivery time (0 = deliverable now).
    function sendGift(
        uint256 nestId,
        address token,
        uint256 usdcAmount,
        uint256 price,
        uint64 quoteExpiry,
        bytes calldata signature,
        uint64 unlockAt,
        bytes32 memoHash
    ) external returns (uint256 giftId) {
        if (usdcAmount < MIN_GIFT || usdcAmount > MAX_GIFT) revert BadAmount();
        if (block.timestamp > quoteExpiry || quoteExpiry > block.timestamp + MAX_QUOTE_AGE) revert QuoteExpired();
        if (price == 0 || _recover(_ethSigned(quoteHash(token, price, quoteExpiry)), signature) != quoteSigner) {
            revert BadQuote();
        }
        // USDC has 6 decimals, shares 18, price 8: shares = usdc * 1e12 * 1e8 / price.
        uint256 uiShares = usdcAmount * 1e20 / price;
        giftId = _open(nestId, token, usdcAmount, 0, uiShares, unlockAt, memoHash);
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        _emitSent(giftId, price);
    }

    /// @notice Send tokenized shares you already hold (approve this contract first).
    function sendShares(
        uint256 nestId,
        address token,
        uint256 rawAmount,
        uint64 unlockAt,
        bytes32 memoHash
    ) external returns (uint256 giftId) {
        if (rawAmount == 0) revert BadAmount();
        uint256 uiShares = ITestB20(token).toUIAmount(rawAmount);
        giftId = _open(nestId, token, 0, rawAmount, uiShares, unlockAt, memoHash);
        token.safeTransferFrom(msg.sender, address(this), rawAmount);
        _emitSent(giftId, 0);
    }

    /// @notice Deliver an opened gift to the child's vault. Anyone can call this
    ///         (the destination is fixed), so nobody has to remember to accept.
    ///         Eligibility is checked now: if the vault can't hold this stock, the
    ///         giver is refunded instead of reverting.
    /// @return delivered true if the shares reached the vault, false if refunded.
    function claimGift(uint256 giftId) external returns (bool delivered) {
        Gift storage g = _pending(giftId);
        Nest memory n = nests[g.nestId];
        if (block.timestamp < g.unlockAt) revert StillLocked();

        if (!ITestB20(g.token).canReceive(n.vault)) {
            _refund(giftId, g, RefundReason.Ineligible);
            return false;
        }
        g.status = Status.Claimed;
        if (g.usdcAmount > 0) {
            usdc.safeTransfer(treasury, g.usdcAmount);
            ITestB20(g.token).mint(n.vault, ITestB20(g.token).fromUIAmount(g.uiShares));
        } else {
            g.token.safeTransfer(n.vault, g.rawShares);
        }
        emit GiftClaimed(giftId, g.nestId, g.token, g.uiShares);
        return true;
    }

    /// @notice Return a gift to its giver. Only possible while the child's vault
    ///         isn't eligible to hold the stock; otherwise the gift is the child's.
    function refundGift(uint256 giftId) external {
        Gift storage g = _pending(giftId);
        if (ITestB20(g.token).canReceive(nests[g.nestId].vault)) revert NotRefundable();
        _refund(giftId, g, RefundReason.Ineligible);
    }

    /// @notice Whether the child's vault can currently receive `token` (B20 transfer policy).
    function isEligible(uint256 nestId, address token) external view returns (bool) {
        return ITestB20(token).canReceive(nests[nestId].vault);
    }

    function _open(
        uint256 nestId,
        address token,
        uint256 usdcAmount,
        uint256 rawShares,
        uint256 uiShares,
        uint64 unlockAt,
        bytes32 memoHash
    ) internal returns (uint256 giftId) {
        if (nests[nestId].vault == address(0)) revert UnknownNest();
        if (!isListed[token]) revert NotListed();
        if (unlockAt > block.timestamp + MAX_UNLOCK_DELAY) revert BadDates();
        uint64 start = unlockAt > block.timestamp ? unlockAt : uint64(block.timestamp);
        giftId = ++giftCount;
        gifts[giftId] = Gift(nestId, msg.sender, token, usdcAmount, rawShares, uiShares, start, Status.Pending, memoHash);
    }

    function _emitSent(uint256 giftId, uint256 price) internal {
        Gift storage g = gifts[giftId];
        emit GiftSent(
            giftId, g.nestId, g.giver, g.token, g.usdcAmount, g.uiShares, price, g.unlockAt, g.memoHash
        );
    }

    function _pending(uint256 giftId) internal view returns (Gift storage g) {
        g = gifts[giftId];
        if (g.status == Status.None) revert UnknownGift();
        if (g.status != Status.Pending) revert NotPending();
    }

    function _refund(uint256 giftId, Gift storage g, RefundReason reason) internal {
        g.status = Status.Refunded;
        if (g.usdcAmount > 0) usdc.safeTransfer(g.giver, g.usdcAmount);
        else g.token.safeTransfer(g.giver, g.rawShares);
        emit GiftRefunded(giftId, g.nestId, g.giver, reason);
    }

    // ------------------------------------------------------------------ admin

    function listStock(address token, bool listed) external onlyOwner {
        isListed[token] = listed;
        emit StockListed(token, listed);
    }

    function setQuoteSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        quoteSigner = signer;
        emit QuoteSignerSet(signer);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    // ------------------------------------------------------------------ signatures

    function _ethSigned(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) return address(0);
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        return ecrecover(digest, v, r, s);
    }
}
