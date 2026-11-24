import { defineChain, keccak256, parseAbi, toBytes, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import localDeployment from "./deployments/local.json";
import sepoliaDeployment from "./deployments/base-sepolia.json";

/**
 * Onchain config. Contract addresses come from the Foundry deploy script output
 * (contracts/deployments/*.json, copied into ./deployments).
 * NEXT_PUBLIC_STOCKNEST_NETWORK=local points the app at a local Anvil chain.
 */

export type Deployment = {
  chainId: number;
  deployedAtBlock: number;
  stockNest: string;
  usdc: string;
  policyRegistry: string;
  quoteSigner: string;
  nests: Record<string, { id: number; vault: string }>;
  tokens: Record<string, string>;
};

const NETWORK = process.env.NEXT_PUBLIC_STOCKNEST_NETWORK === "local" ? "local" : "base-sepolia";

const anvil = defineChain({
  id: 31337,
  name: "Local Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8547"] } },
});

export const deployment = (NETWORK === "local" ? localDeployment : sepoliaDeployment) as Deployment;
export const chain = NETWORK === "local" ? anvil : baseSepolia;
export const rpcUrl = NETWORK === "local" ? "http://127.0.0.1:8547" : process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org";
export const explorer = NETWORK === "local" ? null : "https://sepolia.basescan.org";
export const onchainEnabled = /^0x[0-9a-fA-F]{40}$/.test(deployment.stockNest);
export const networkName = NETWORK === "local" ? "Local test chain" : "Base Sepolia";

export const stockNestAddress = deployment.stockNest as Address;
export const usdcAddress = deployment.usdc as Address;
export const tokenAddress = (ticker: string) => deployment.tokens[ticker] as Address | undefined;
export const tickerForToken = (token: string) =>
  Object.entries(deployment.tokens).find(([, a]) => a.toLowerCase() === token.toLowerCase())?.[0];

export const txUrl = (hash: string) => (explorer && /^0x[0-9a-f]{64}$/i.test(hash) ? `${explorer}/tx/${hash}` : null);
export const addressUrl = (addr: string) => (explorer ? `${explorer}/address/${addr}` : null);
export const isRealTx = (hash?: string) => !!hash && /^0x[0-9a-f]{64}$/i.test(hash);

/** Stocks whose transfer policy is allowlist-only on testnet (gifts get refunded unless the nest is approved). */
export const RESTRICTED = new Set(["MSTR"]);

export const stockNestAbi = parseAbi([
  "function createNest(bytes32 slugHash) returns (uint256)",
  "function sendGift(uint256 nestId, address token, uint256 usdcAmount, uint256 price, uint64 quoteExpiry, bytes signature, uint64 unlockAt, bytes32 memoHash) returns (uint256)",
  "function claimGift(uint256 giftId) returns (bool)",
  "function refundGift(uint256 giftId)",
  "function isEligible(uint256 nestId, address token) view returns (bool)",
  "function gifts(uint256) view returns (uint256 nestId, address giver, address token, uint256 usdcAmount, uint256 rawShares, uint256 uiShares, uint64 unlockAt, uint8 status, bytes32 memoHash)",
  "function nests(uint256) view returns (address vault, address guardian, bytes32 slugHash)",
  "function nestIdBySlug(bytes32) view returns (uint256)",
  "function quoteHash(address token, uint256 price, uint64 expiry) view returns (bytes32)",
  "event NestCreated(uint256 indexed nestId, bytes32 indexed slugHash, address vault, address indexed guardian)",
  "event GiftSent(uint256 indexed giftId, uint256 indexed nestId, address indexed giver, address token, uint256 usdcAmount, uint256 uiShares, uint256 price, uint64 unlockAt, bytes32 memoHash)",
  "event GiftClaimed(uint256 indexed giftId, uint256 indexed nestId, address indexed token, uint256 uiShares)",
  "event GiftRefunded(uint256 indexed giftId, uint256 indexed nestId, address indexed giver, uint8 reason)",
  "error SlugTaken()", "error UnknownNest()", "error NotListed()", "error BadAmount()", "error QuoteExpired()", "error BadQuote()",
  "error BadDates()", "error UnknownGift()", "error NotPending()", "error StillLocked()", "error NotRefundable()",
]);

export const testUsdcAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function faucet()",
  "function lastFaucet(address) view returns (uint256)",
]);

export const testB20Abi = parseAbi([
  "function balanceOfUI(address) view returns (uint256)",
  "function canReceive(address) view returns (bool)",
  "function symbol() view returns (string)",
]);

/**
 * The nest's onchain key. Salted with the parent's private manage token so nobody
 * can read a public slug and register its vault first (the contract rejects a taken key).
 */
export const nestKey = (slug: string, manageToken: string): Hex => keccak256(toBytes(`stocknest:${slug}:${manageToken}`));
