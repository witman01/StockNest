// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {TestUSDC} from "../src/TestUSDC.sol";
import {PolicyRegistry} from "../src/PolicyRegistry.sol";
import {TestB20} from "../src/TestB20.sol";
import {NestVault} from "../src/NestVault.sol";
import {StockNest} from "../src/StockNest.sol";

contract StockNestTest is Test {
    TestUSDC usdc;
    PolicyRegistry registry;
    TestB20 apple;
    TestB20 restricted;
    StockNest nest;

    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address parent = makeAddr("parent");
    address grandma = makeAddr("grandma");
    uint256 signerKey = 0xA11CE;
    address signer;

    uint64 openPolicy;
    uint64 allowPolicy;
    uint256 ameliaId;
    address vault;

    uint256 constant AAPL_PRICE = 345_30000000; // $345.30, 8 decimals

    function setUp() public {
        signer = vm.addr(signerKey);
        vm.startPrank(owner);
        usdc = new TestUSDC();
        registry = new PolicyRegistry(owner);
        openPolicy = registry.createPolicy(PolicyRegistry.Kind.BLOCKLIST, owner);
        allowPolicy = registry.createPolicy(PolicyRegistry.Kind.ALLOWLIST, owner);
        apple = new TestB20("Apple (StockNest test)", "AAPLc", "AAPL", registry, openPolicy, owner);
        restricted = new TestB20("Strategy (StockNest test)", "MSTRc", "MSTR", registry, allowPolicy, owner);
        nest = new StockNest(owner, address(usdc), signer, treasury);
        apple.setMinter(address(nest));
        restricted.setMinter(address(nest));
        nest.listStock(address(apple), true);
        nest.listStock(address(restricted), true);
        vm.stopPrank();

        vm.prank(parent);
        ameliaId = nest.createNest(keccak256("amelia"));
        (vault,,) = nest.nests(ameliaId);

        vm.startPrank(grandma);
        usdc.faucet();
        usdc.approve(address(nest), type(uint256).max);
        vm.stopPrank();
    }

    function _sign(address token, uint256 price, uint64 expiry) internal view returns (bytes memory) {
        bytes32 h = nest.quoteHash(token, price, expiry);
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }


    // ---------------------------------------------------------------- nests

    function test_createNest_setsGuardianAndVault() public view {
        (address v, address g, bytes32 slug) = nest.nests(ameliaId);
        assertEq(g, parent);
        assertEq(slug, keccak256("amelia"));
        assertEq(NestVault(v).guardian(), parent);
        assertEq(nest.nestIdBySlug(keccak256("amelia")), ameliaId);
    }

    uint64 constant WEEK = 7 days;

    /// Send a USDC gift from grandma. Returns the gift id.
    function _send(TestB20 token, uint256 usdcAmount, uint64 unlockAt, uint64 expiresAt) internal returns (uint256) {
        uint64 q = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(token), AAPL_PRICE, q);
        vm.prank(grandma);
        return nest.sendGift(
            ameliaId, address(token), usdcAmount, AAPL_PRICE, q, sig, unlockAt, expiresAt, keccak256("Happy birthday")
        );
    }

    function _sendNow(TestB20 token, uint256 usdcAmount) internal returns (uint256) {
        return _send(token, usdcAmount, 0, uint64(block.timestamp + WEEK));
    }

    /// Send and accept straight away. Returns the shares delivered.
    function _gift(TestB20 token, uint256 usdcAmount) internal returns (uint256) {
        uint256 id = _sendNow(token, usdcAmount);
        vm.prank(parent);
        nest.claimGift(id);
        (,,,,, uint256 ui,,,,) = nest.gifts(id);
        return ui;
    }

    function _status(uint256 id) internal view returns (StockNest.Status s) {
        (,,,,,,,, s,) = nest.gifts(id);
    }

    function test_createNest_rejectsDuplicateSlug() public {
        vm.expectRevert(StockNest.SlugTaken.selector);
        nest.createNest(keccak256("amelia"));
    }

    // ---------------------------------------------------------------- send → escrow

    function test_send_holdsUSDCInEscrow() public {
        uint256 id = _sendNow(apple, 100e6);
        assertEq(uint8(_status(id)), uint8(StockNest.Status.Pending));
        assertEq(usdc.balanceOf(address(nest)), 100e6, "held by the contract");
        assertEq(usdc.balanceOf(grandma), 900e6);
        assertEq(apple.balanceOf(vault), 0, "nothing delivered before acceptance");
        (, address giver,,,, uint256 ui,,,,) = nest.gifts(id);
        assertEq(giver, grandma);
        // $100 / $345.30 = 0.289603... shares, fixed at send time
        assertApproxEqAbs(ui, 0.2896032435563278e18, 1e6);
    }

    function test_send_emitsGiftSent() public {
        uint64 q = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, q);
        uint64 exp = uint64(block.timestamp + WEEK);
        vm.expectEmit(true, true, true, false);
        emit StockNest.GiftSent(1, ameliaId, grandma, address(apple), 50e6, 0, AAPL_PRICE, 0, exp, bytes32(0));
        vm.prank(grandma);
        nest.sendGift(ameliaId, address(apple), 50e6, AAPL_PRICE, q, sig, 0, exp, bytes32(0));
    }

    // ---------------------------------------------------------------- claim

    function test_claim_deliversSharesToVault() public {
        uint256 id = _sendNow(apple, 100e6);
        vm.prank(parent);
        assertTrue(nest.claimGift(id));
        assertEq(uint8(_status(id)), uint8(StockNest.Status.Claimed));
        assertApproxEqAbs(apple.balanceOf(vault), 0.2896032435563278e18, 1e6);
        assertEq(usdc.balanceOf(treasury), 100e6);
        assertEq(usdc.balanceOf(address(nest)), 0);
    }

    function test_claim_onlyGuardian() public {
        uint256 id = _sendNow(apple, 10e6);
        vm.prank(grandma);
        vm.expectRevert(StockNest.NotGuardian.selector);
        nest.claimGift(id);
    }

    function test_claim_respectsUnlockDate() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        uint256 id = _send(apple, 10e6, unlock, unlock + WEEK);
        vm.prank(parent);
        vm.expectRevert(StockNest.StillLocked.selector);
        nest.claimGift(id);
        vm.warp(unlock);
        vm.prank(parent);
        assertTrue(nest.claimGift(id));
    }

    function test_claim_ineligibleVaultRefundsGiver() public {
        uint256 id = _sendNow(restricted, 100e6);
        vm.expectEmit(true, true, true, true);
        emit StockNest.GiftRefunded(id, ameliaId, grandma, StockNest.RefundReason.Ineligible);
        vm.prank(parent);
        assertFalse(nest.claimGift(id));
        assertEq(uint8(_status(id)), uint8(StockNest.Status.Refunded));
        assertEq(restricted.balanceOf(vault), 0);
        assertEq(usdc.balanceOf(grandma), 1_000e6, "refunded in full");
        assertEq(usdc.balanceOf(treasury), 0);
    }

    function test_claim_deliversOnceVaultIsAllowlisted() public {
        uint256 id = _sendNow(restricted, 100e6);
        vm.prank(owner);
        registry.setMember(allowPolicy, vault, true);
        vm.prank(parent);
        assertTrue(nest.claimGift(id));
        assertGt(restricted.balanceOf(vault), 0);
    }

    function test_claim_cannotClaimTwice() public {
        uint256 id = _sendNow(apple, 10e6);
        vm.startPrank(parent);
        nest.claimGift(id);
        vm.expectRevert(StockNest.NotPending.selector);
        nest.claimGift(id);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- expiry & refunds

    function test_refund_afterExpiry() public {
        uint256 id = _send(apple, 100e6, 0, uint64(block.timestamp + 5 minutes));
        vm.expectRevert(StockNest.NotRefundable.selector);
        nest.refundGift(id);

        vm.warp(block.timestamp + 5 minutes + 1);
        vm.prank(parent);
        vm.expectRevert(StockNest.GiftExpired.selector);
        nest.claimGift(id);

        vm.expectEmit(true, true, true, true);
        emit StockNest.GiftRefunded(id, ameliaId, grandma, StockNest.RefundReason.Expired);
        vm.prank(makeAddr("anyone"));
        nest.refundGift(id);
        assertEq(usdc.balanceOf(grandma), 1_000e6);
        assertEq(uint8(_status(id)), uint8(StockNest.Status.Refunded));

        vm.expectRevert(StockNest.NotPending.selector);
        nest.refundGift(id);
    }

    function test_refund_ineligibleBeforeExpiry() public {
        uint256 id = _sendNow(restricted, 40e6);
        nest.refundGift(id);
        assertEq(usdc.balanceOf(grandma), 1_000e6);
    }

    function test_send_validatesDates() public {
        uint64 q = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, q);
        vm.startPrank(grandma);
        vm.expectRevert(StockNest.BadDates.selector); // window too short
        nest.sendGift(ameliaId, address(apple), 10e6, AAPL_PRICE, q, sig, 0, uint64(block.timestamp + 60), 0);
        vm.expectRevert(StockNest.BadDates.selector); // window too long
        nest.sendGift(ameliaId, address(apple), 10e6, AAPL_PRICE, q, sig, 0, uint64(block.timestamp + 400 days), 0);
        uint64 unlock = uint64(block.timestamp + 10 days);
        vm.expectRevert(StockNest.BadDates.selector); // expires before it unlocks
        nest.sendGift(ameliaId, address(apple), 10e6, AAPL_PRICE, q, sig, unlock, unlock - 1, 0);
        vm.stopPrank();
    }

    function test_isEligible() public view {
        assertTrue(nest.isEligible(ameliaId, address(apple)));
        assertFalse(nest.isEligible(ameliaId, address(restricted)));
    }

    // ---------------------------------------------------------------- quote checks

    function test_send_rejectsWrongSigner() public {
        uint64 q = uint64(block.timestamp + 120);
        bytes32 h = nest.quoteHash(address(apple), AAPL_PRICE, q);
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(0xBAD, keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h)));
        vm.prank(grandma);
        vm.expectRevert(StockNest.BadQuote.selector);
        nest.sendGift(ameliaId, address(apple), 10e6, AAPL_PRICE, q, abi.encodePacked(r, s, v), 0, q + WEEK, 0);
    }

    function test_send_rejectsTamperedPrice() public {
        uint64 q = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, q);
        vm.prank(grandma);
        vm.expectRevert(StockNest.BadQuote.selector);
        nest.sendGift(ameliaId, address(apple), 10e6, AAPL_PRICE / 2, q, sig, 0, q + WEEK, 0);
    }

    function test_send_rejectsExpiredQuote() public {
        uint64 q = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, q);
        vm.warp(block.timestamp + 121);
        vm.prank(grandma);
        vm.expectRevert(StockNest.QuoteExpired.selector);
        nest.sendGift(ameliaId, address(apple), 10e6, AAPL_PRICE, q, sig, 0, q + WEEK, 0);
    }

    function test_send_enforcesAmountBounds() public {
        uint64 q = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, q);
        vm.startPrank(grandma);
        vm.expectRevert(StockNest.BadAmount.selector);
        nest.sendGift(ameliaId, address(apple), 0.5e6, AAPL_PRICE, q, sig, 0, q + WEEK, 0);
        vm.expectRevert(StockNest.BadAmount.selector);
        nest.sendGift(ameliaId, address(apple), 10_001e6, AAPL_PRICE, q, sig, 0, q + WEEK, 0);
        vm.stopPrank();
    }

    function test_send_rejectsUnknownNestAndUnlistedStock() public {
        uint64 q = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, q);
        vm.startPrank(grandma);
        vm.expectRevert(StockNest.UnknownNest.selector);
        nest.sendGift(999, address(apple), 10e6, AAPL_PRICE, q, sig, 0, q + WEEK, 0);
        bytes memory sig2 = _sign(address(usdc), AAPL_PRICE, q);
        vm.expectRevert(StockNest.NotListed.selector);
        nest.sendGift(ameliaId, address(usdc), 10e6, AAPL_PRICE, q, sig2, 0, q + WEEK, 0);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- guardian

    function test_onlyGuardianCanWithdraw() public {
        uint256 shares = _gift(apple, 100e6);
        vm.prank(grandma);
        vm.expectRevert(NestVault.NotGuardian.selector);
        NestVault(vault).withdraw(address(apple), grandma, shares);

        vm.prank(parent);
        NestVault(vault).withdraw(address(apple), parent, shares);
        assertEq(apple.balanceOf(parent), shares);
    }

    function test_guardianCanHandOver() public {
        address older = makeAddr("amelia-at-18");
        vm.prank(parent);
        NestVault(vault).setGuardian(older);
        assertEq(NestVault(vault).guardian(), older);
    }

    // ---------------------------------------------------------------- B20 behaviour

    function test_splitMultiplierUpdatesUIBalance() public {
        uint256 shares = _gift(apple, 100e6);
        vm.prank(owner);
        apple.updateUIMultiplier(2e18, "2-for-1 split");
        assertEq(apple.balanceOfUI(vault), shares * 2);
        assertEq(apple.balanceOf(vault), shares, "raw balance unchanged");
    }

    function test_giftAfterSplitUsesUIAmounts() public {
        vm.prank(owner);
        apple.updateUIMultiplier(2e18, "2-for-1 split");
        uint256 uiShares = _gift(apple, 100e6);
        assertApproxEqAbs(apple.balanceOfUI(vault), uiShares, 2);
    }

    function test_blockedAccountCannotTransfer() public {
        uint256 shares = _gift(apple, 100e6);
        vm.prank(owner);
        registry.setMember(openPolicy, parent, true); // block the parent
        vm.prank(parent);
        vm.expectRevert(abi.encodeWithSelector(TestB20.PolicyForbids.selector, parent));
        NestVault(vault).withdraw(address(apple), parent, shares);
    }

    // ---------------------------------------------------------------- share gifts

    function test_sendShares_escrowsThenDelivers() public {
        address uncle = makeAddr("uncle");
        vm.prank(address(nest));
        apple.mint(uncle, 1e18);
        vm.startPrank(uncle);
        apple.approve(address(nest), 0.5e18);
        uint256 id = nest.sendShares(ameliaId, address(apple), 0.5e18, 0, uint64(block.timestamp + WEEK), 0);
        vm.stopPrank();
        assertEq(apple.balanceOf(address(nest)), 0.5e18);
        vm.prank(parent);
        nest.claimGift(id);
        assertEq(apple.balanceOf(vault), 0.5e18);
        assertEq(apple.balanceOf(uncle), 0.5e18);
    }

    function test_sendShares_refundsSharesAfterExpiry() public {
        address uncle = makeAddr("uncle");
        vm.prank(address(nest));
        apple.mint(uncle, 1e18);
        vm.startPrank(uncle);
        apple.approve(address(nest), 1e18);
        uint256 id = nest.sendShares(ameliaId, address(apple), 1e18, 0, uint64(block.timestamp + 5 minutes), 0);
        vm.stopPrank();
        vm.warp(block.timestamp + 6 minutes);
        nest.refundGift(id);
        assertEq(apple.balanceOf(uncle), 1e18);
    }

    // ---------------------------------------------------------------- faucet & fuzz

    function test_faucetCooldown() public {
        vm.prank(grandma);
        vm.expectRevert();
        usdc.faucet();
        vm.warp(block.timestamp + 1 hours);
        vm.prank(grandma);
        usdc.faucet();
        assertEq(usdc.balanceOf(grandma), 2_000e6);
    }

    function testFuzz_shareMathMatchesPrice(uint256 usdcAmount, uint256 price) public {
        usdcAmount = bound(usdcAmount, 1e6, 1_000e6);
        price = bound(price, 1e8, 10_000e8);
        uint64 q = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), price, q);
        vm.prank(grandma);
        uint256 id = nest.sendGift(ameliaId, address(apple), usdcAmount, price, q, sig, 0, q + WEEK, 0);
        (,,,,, uint256 shares,,,,) = nest.gifts(id);
        // value (shares * price) equals USDC paid, within rounding
        assertApproxEqAbs(shares * price / 1e20, usdcAmount, 1);
    }

    function testFuzz_escrowAlwaysSettlesOnce(uint256 usdcAmount, uint32 wait) public {
        usdcAmount = bound(usdcAmount, 1e6, 1_000e6);
        uint256 id = _send(apple, usdcAmount, 0, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + wait);
        if (wait <= 1 days) {
            vm.prank(parent);
            nest.claimGift(id);
            assertEq(usdc.balanceOf(treasury), usdcAmount);
        } else {
            nest.refundGift(id);
            assertEq(usdc.balanceOf(grandma), 1_000e6);
        }
        assertEq(usdc.balanceOf(address(nest)), 0, "escrow empty after settlement");
    }
}
