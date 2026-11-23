# StockNest contracts

Solidity contracts for StockNest on Base Sepolia, built with Foundry.

| Contract | What it does |
|---|---|
| `StockNest.sol` | Creates nests (the parent becomes guardian) and runs giftable stock positions. **Send:** the giver pays USDC (or deposits shares they own); the share amount is fixed at a signed live quote and the funds are held in escrow. Until the gift is accepted it still belongs to the giver. **Claim:** after an optional unlock date, the guardian accepts it; the child's vault is checked against the stock's B20 transfer policy, so eligible gifts are delivered and ineligible ones are refunded in the same transaction. **Refund:** if a gift isn't accepted before it expires, anyone can return it to the giver. Messages stay offchain; only their hash is recorded. |
| `NestVault.sol` | One per child. Holds the gifted stocks. Only the guardian can withdraw or hand over guardianship (for example, to the child at 18). |
| `TestB20.sol` | A testnet tokenized stock that mirrors Coinbase's B20 tokens on Base: UI multiplier for splits and dividends (`balanceOfUI`, `toUIAmount`, `fromUIAmount`, `updateUIMultiplier`), a transfer policy checked on every movement, and `transferWithMemo`. |
| `PolicyRegistry.sol` | B20-style transfer policies (`policyExists`, `isAuthorized`) with blocklist and allowlist kinds. |
| `TestUSDC.sol` | Test USDC (6 decimals) with a public faucet (1,000 per hour). |

**Pricing:** real B20 tokens and their Chainlink feeds live on Base mainnet. The web server reads the live mainnet price and signs a short-lived quote. `StockNest` only accepts quotes from the configured signer, bound to this chain, contract, token, price and expiry.

**Demo policy:** Strategy (MSTRc) uses an allowlist policy, so when a guardian accepts a Strategy gift for an unapproved nest, the giver is refunded. This shows the B20 eligibility check working live. Claim windows can be as short as 5 minutes on testnet so expiry refunds can be demoed.

## Commands

```bash
forge install foundry-rs/forge-std   # first time only
forge test                           # 29 tests, including fuzzing
```

Deploy to Base Sepolia (testnet keys only, kept in `contracts/.env`, which is git-ignored):

```bash
source .env   # PRIVATE_KEY, QUOTE_SIGNER, optional DEMO_GUARDIAN
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
# then copy deployments/base-sepolia.json to web/src/lib/deployments/
```
