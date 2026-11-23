// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {TestUSDC} from "../src/TestUSDC.sol";
import {PolicyRegistry} from "../src/PolicyRegistry.sol";
import {TestB20} from "../src/TestB20.sol";
import {StockNest} from "../src/StockNest.sol";

/// @notice Deploys the StockNest testnet stack to Base Sepolia.
///   PRIVATE_KEY   deployer (becomes owner, treasury and guardian of the demo nests)
///   QUOTE_SIGNER  address whose key the web server uses to sign live price quotes
///   DEMO_GUARDIAN (optional) wallet that becomes guardian of the demo nests, so it can accept gifts
/// Usage: forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
contract Deploy is Script {
    address deployer;
    TestUSDC usdc;
    PolicyRegistry registry;
    StockNest stockNest;
    uint64 openPolicy;
    uint64 restrictedPolicy;
    string tokensOut;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address signer = vm.envAddress("QUOTE_SIGNER");
        deployer = vm.addr(pk);
        address guardian = vm.envOr("DEMO_GUARDIAN", deployer);

        vm.startBroadcast(pk);
        usdc = new TestUSDC();
        registry = new PolicyRegistry(deployer);
        openPolicy = registry.createPolicy(PolicyRegistry.Kind.BLOCKLIST, deployer);
        restrictedPolicy = registry.createPolicy(PolicyRegistry.Kind.ALLOWLIST, deployer);
        stockNest = new StockNest(deployer, address(usdc), signer, deployer);

        _token("AAPL", "Apple", false);
        _token("NVDA", "NVIDIA", false);
        _token("MSFT", "Microsoft", false);
        _token("AMZN", "Amazon", false);
        _token("GOOGL", "Alphabet", false);
        _token("META", "Meta", false);
        _token("TSLA", "Tesla", false);
        // Restricted: allowlist-only, so gifts to an unlisted nest are refunded (demo of B20 policies).
        _token("MSTR", "Strategy", true);

        // Demo nests for the seeded families on the website.
        uint256 amelia = stockNest.createNestFor(keccak256(bytes("amelia")), guardian);
        uint256 tobi = stockNest.createNestFor(keccak256(bytes("tobi")), guardian);
        vm.stopBroadcast();

        _write(signer, amelia, tobi);
        console2.log("StockNest", address(stockNest));
        console2.log("TestUSDC", address(usdc));
    }

    function _token(string memory ticker, string memory name, bool restricted) internal {
        TestB20 t = new TestB20(
            string.concat(name, " (StockNest test)"),
            string.concat(ticker, "c"),
            bytes32(bytes(ticker)),
            registry,
            restricted ? restrictedPolicy : openPolicy,
            deployer
        );
        t.setMinter(address(stockNest));
        stockNest.listStock(address(t), true);
        tokensOut = vm.serializeAddress("tokens", ticker, address(t));
    }

    function _write(address signer, uint256 amelia, uint256 tobi) internal {
        (address ameliaVault,,) = stockNest.nests(amelia);
        (address tobiVault,,) = stockNest.nests(tobi);
        vm.serializeUint("ameliaNest", "id", amelia);
        string memory a = vm.serializeAddress("ameliaNest", "vault", ameliaVault);
        vm.serializeUint("tobiNest", "id", tobi);
        string memory b = vm.serializeAddress("tobiNest", "vault", tobiVault);
        vm.serializeString("nests", "amelia", a);
        string memory nestsOut = vm.serializeString("nests", "tobi", b);

        vm.serializeUint("root", "chainId", block.chainid);
        vm.serializeUint("root", "deployedAtBlock", block.number);
        vm.serializeAddress("root", "stockNest", address(stockNest));
        vm.serializeAddress("root", "usdc", address(usdc));
        vm.serializeAddress("root", "policyRegistry", address(registry));
        vm.serializeAddress("root", "quoteSigner", signer);
        vm.serializeString("root", "nests", nestsOut);
        string memory out = vm.serializeString("root", "tokens", tokensOut);
        vm.writeJson(out, string.concat("./deployments/", block.chainid == 84532 ? "base-sepolia" : "local", ".json"));
    }
}
