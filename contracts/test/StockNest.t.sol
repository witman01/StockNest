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

    function _gift(TestB20 token, uint256 usdcAmount) internal returns (uint256) {
        uint64 expiry = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(token), AAPL_PRICE, expiry);
        vm.prank(grandma);
        return nest.giftWithUSDC(ameliaId, address(token), usdcAmount, AAPL_PRICE, expiry, sig, keccak256("Happy birthday"));
    }

    // ---------------------------------------------------------------- nests

    function test_createNest_setsGuardianAndVault() public view {
        (address v, address g, bytes32 slug) = nest.nests(ameliaId);
        assertEq(g, parent);
        assertEq(slug, keccak256("amelia"));
        assertEq(NestVault(v).guardian(), parent);
        assertEq(nest.nestIdBySlug(keccak256("amelia")), ameliaId);
    }

    function test_createNest_rejectsDuplicateSlug() public {
        vm.expectRevert(StockNest.SlugTaken.selector);
        nest.createNest(keccak256("amelia"));
    }

    // ---------------------------------------------------------------- USDC → stock

    function test_giftWithUSDC_deliversShares() public {
        uint256 shares = _gift(apple, 100e6);
        // $100 / $345.30 = 0.289603... shares
        assertApproxEqAbs(shares, 0.2896032435563278e18, 1e6);
        assertEq(apple.balanceOf(vault), shares);
        assertEq(usdc.balanceOf(treasury), 100e6);
        assertEq(usdc.balanceOf(grandma), 900e6);
    }

    function test_giftWithUSDC_emitsDelivered() public {
        uint64 expiry = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, expiry);
        vm.expectEmit(true, true, true, false);
        emit StockNest.GiftDelivered(ameliaId, grandma, address(apple), 50e6, 0, AAPL_PRICE, bytes32(0));
        vm.prank(grandma);
        nest.giftWithUSDC(ameliaId, address(apple), 50e6, AAPL_PRICE, expiry, sig, bytes32(0));
    }

    function test_giftWithUSDC_refundsWhenPolicyBlocksVault() public {
        uint256 shares = _gift(restricted, 100e6);
        assertEq(shares, 0);
        assertEq(restricted.balanceOf(vault), 0);
        assertEq(usdc.balanceOf(grandma), 1_000e6, "refunded in full");
        assertEq(usdc.balanceOf(treasury), 0);
    }

    function test_giftWithUSDC_deliversOnceVaultIsAllowlisted() public {
        vm.prank(owner);
        registry.setMember(allowPolicy, vault, true);
        uint256 shares = _gift(restricted, 100e6);
        assertGt(shares, 0);
        assertEq(restricted.balanceOf(vault), shares);
    }

    function test_giftWithUSDC_rejectsWrongSigner() public {
        uint64 expiry = uint64(block.timestamp + 120);
        bytes32 h = nest.quoteHash(address(apple), AAPL_PRICE, expiry);
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(0xBAD, keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h)));
        vm.prank(grandma);
        vm.expectRevert(StockNest.BadQuote.selector);
        nest.giftWithUSDC(ameliaId, address(apple), 10e6, AAPL_PRICE, expiry, abi.encodePacked(r, s, v), 0);
    }

    function test_giftWithUSDC_rejectsTamperedPrice() public {
        uint64 expiry = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, expiry);
        vm.prank(grandma);
        vm.expectRevert(StockNest.BadQuote.selector);
        nest.giftWithUSDC(ameliaId, address(apple), 10e6, AAPL_PRICE / 2, expiry, sig, 0);
    }

    function test_giftWithUSDC_rejectsExpiredQuote() public {
        uint64 expiry = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, expiry);
        vm.warp(block.timestamp + 121);
        vm.prank(grandma);
        vm.expectRevert(StockNest.QuoteExpired.selector);
        nest.giftWithUSDC(ameliaId, address(apple), 10e6, AAPL_PRICE, expiry, sig, 0);
    }

    function test_giftWithUSDC_enforcesAmountBounds() public {
        uint64 expiry = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, expiry);
        vm.startPrank(grandma);
        vm.expectRevert(StockNest.BadAmount.selector);
        nest.giftWithUSDC(ameliaId, address(apple), 0.5e6, AAPL_PRICE, expiry, sig, 0);
        vm.expectRevert(StockNest.BadAmount.selector);
        nest.giftWithUSDC(ameliaId, address(apple), 10_001e6, AAPL_PRICE, expiry, sig, 0);
        vm.stopPrank();
    }

    function test_giftWithUSDC_rejectsUnknownNestAndUnlistedStock() public {
        uint64 expiry = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), AAPL_PRICE, expiry);
        vm.startPrank(grandma);
        vm.expectRevert(StockNest.UnknownNest.selector);
        nest.giftWithUSDC(999, address(apple), 10e6, AAPL_PRICE, expiry, sig, 0);
        vm.expectRevert(StockNest.NotListed.selector);
        nest.giftWithUSDC(ameliaId, address(usdc), 10e6, AAPL_PRICE, expiry, sig, 0);
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

    // ---------------------------------------------------------------- direct share gifts

    function test_giftShares_movesOwnedShares() public {
        // Give the uncle some shares first, then he gifts half.
        address uncle = makeAddr("uncle");
        vm.prank(parent);
        uint256 tobiId = nest.createNest(keccak256("tobi"));
        (address tobiVault,,) = nest.nests(tobiId);
        vm.prank(address(nest));
        apple.mint(uncle, 1e18);

        vm.startPrank(uncle);
        apple.approve(address(nest), 0.5e18);
        nest.giftShares(tobiId, address(apple), 0.5e18, keccak256("For Tobi"));
        vm.stopPrank();
        assertEq(apple.balanceOf(tobiVault), 0.5e18);
        assertEq(apple.balanceOf(uncle), 0.5e18);
    }

    function test_giftShares_revertsWhenVaultNotAllowed() public {
        address uncle = makeAddr("uncle");
        vm.prank(owner);
        registry.setMember(allowPolicy, uncle, true);
        vm.prank(address(nest));
        restricted.mint(uncle, 1e18);
        vm.startPrank(uncle);
        restricted.approve(address(nest), 1e18);
        vm.expectRevert(StockNest.RecipientNotAllowed.selector);
        nest.giftShares(ameliaId, address(restricted), 1e18, 0);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- faucet

    function test_faucetCooldown() public {
        vm.prank(grandma);
        vm.expectRevert();
        usdc.faucet();
        vm.warp(block.timestamp + 1 hours);
        vm.prank(grandma);
        usdc.faucet();
        assertEq(usdc.balanceOf(grandma), 2_000e6);
    }

    function testFuzz_giftSharesMathMatchesPrice(uint256 usdcAmount, uint256 price) public {
        usdcAmount = bound(usdcAmount, 1e6, 1_000e6);
        price = bound(price, 1e8, 10_000e8);
        uint64 expiry = uint64(block.timestamp + 120);
        bytes memory sig = _sign(address(apple), price, expiry);
        vm.prank(grandma);
        uint256 shares = nest.giftWithUSDC(ameliaId, address(apple), usdcAmount, price, expiry, sig, 0);
        // value delivered (shares * price) equals USDC paid, within rounding
        assertApproxEqAbs(shares * price / 1e20, usdcAmount, 1);
    }
}
