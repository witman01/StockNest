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
/// @notice Family stock gifting. A parent creates a nest (and becomes its guardian);
///         anyone can gift that child a tokenized stock:
///         - giftWithUSDC: pay USDC, the stock is bought at a signed live quote
///           (from the Chainlink feeds on Base mainnet) and delivered to the
///           child's vault. If the stock's transfer policy doesn't allow the
///           vault, the USDC is refunded in the same transaction.
///         - giftShares: send tokenized shares you already own.
///         Messages stay offchain. Only their hash (memoHash) is recorded.
contract StockNest is Owned {
    using SafeTransfer for address;

    uint256 public constant MIN_GIFT = 1e6; // 1 USDC
    uint256 public constant MAX_GIFT = 10_000e6; // 10,000 USDC
    uint256 public constant MAX_QUOTE_AGE = 10 minutes;

    struct Nest {
        address vault;
        address guardian;
        bytes32 slugHash;
    }

    address public immutable usdc;
    address public quoteSigner;
    address public treasury;
    uint256 public nestCount;

    mapping(uint256 => Nest) public nests;
    mapping(bytes32 => uint256) public nestIdBySlug;
    mapping(address => bool) public isListed;

    event NestCreated(uint256 indexed nestId, bytes32 indexed slugHash, address vault, address indexed guardian);
    event StockListed(address indexed token, bool listed);
    event QuoteSignerSet(address indexed signer);
    event TreasurySet(address indexed treasury);
    event GiftDelivered(
        uint256 indexed nestId,
        address indexed giver,
        address indexed token,
        uint256 usdcIn,
        uint256 uiShares,
        uint256 price,
        bytes32 memoHash
    );
    event GiftReturned(
        uint256 indexed nestId, address indexed giver, address indexed token, uint256 usdcRefunded, bytes32 memoHash
    );

    error SlugTaken();
    error UnknownNest();
    error NotListed();
    error BadAmount();
    error QuoteExpired();
    error BadQuote();
    error RecipientNotAllowed();

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

    /// @param price USD per whole share with 8 decimals (Chainlink format).
    /// @return uiShares Shares delivered (18 decimals, UI units); 0 if the gift was returned.
    function giftWithUSDC(
        uint256 nestId,
        address token,
        uint256 usdcAmount,
        uint256 price,
        uint64 expiry,
        bytes calldata signature,
        bytes32 memoHash
    ) external returns (uint256 uiShares) {
        Nest memory n = nests[nestId];
        if (n.vault == address(0)) revert UnknownNest();
        if (!isListed[token]) revert NotListed();
        if (usdcAmount < MIN_GIFT || usdcAmount > MAX_GIFT) revert BadAmount();
        if (block.timestamp > expiry || expiry > block.timestamp + MAX_QUOTE_AGE) revert QuoteExpired();
        if (price == 0 || _recover(_ethSigned(quoteHash(token, price, expiry)), signature) != quoteSigner) {
            revert BadQuote();
        }

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Transfer-policy check, as with real B20 tokens: refund instead of reverting.
        if (!ITestB20(token).canReceive(n.vault)) {
            usdc.safeTransfer(msg.sender, usdcAmount);
            emit GiftReturned(nestId, msg.sender, token, usdcAmount, memoHash);
            return 0;
        }

        // USDC has 6 decimals, shares 18, price 8: shares = usdc * 1e12 * 1e8 / price.
        uiShares = usdcAmount * 1e20 / price;
        usdc.safeTransfer(treasury, usdcAmount);
        ITestB20(token).mint(n.vault, ITestB20(token).fromUIAmount(uiShares));
        emit GiftDelivered(nestId, msg.sender, token, usdcAmount, uiShares, price, memoHash);
    }

    /// @notice Gift tokenized shares you already hold (approve this contract first).
    function giftShares(uint256 nestId, address token, uint256 rawAmount, bytes32 memoHash) external {
        Nest memory n = nests[nestId];
        if (n.vault == address(0)) revert UnknownNest();
        if (!isListed[token]) revert NotListed();
        if (rawAmount == 0) revert BadAmount();
        if (!ITestB20(token).canReceive(n.vault)) revert RecipientNotAllowed();
        token.safeTransferFrom(msg.sender, n.vault, rawAmount);
        emit GiftDelivered(nestId, msg.sender, token, 0, ITestB20(token).toUIAmount(rawAmount), 0, memoHash);
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
