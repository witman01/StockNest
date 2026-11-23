"use client";

import { createCoinbaseWalletSDK } from "@coinbase/wallet-sdk";
import {
  createPublicClient, createWalletClient, custom, encodeFunctionData, http, keccak256, numberToHex, parseUnits, toBytes,
  type Address, type EIP1193Provider, type Hex, type WalletClient,
} from "viem";
import { chain, networkName, rpcUrl, stockNestAbi, stockNestAddress, testUsdcAbi, usdcAddress } from "./chain";

export type WalletKind = "smart" | "injected";
export type Connected = { kind: WalletKind; address: Address; client: WalletClient; provider: EIP1193Provider };

export const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

let sdkProvider: EIP1193Provider | null = null;

function smartWalletProvider(): EIP1193Provider {
  if (!sdkProvider) {
    const sdk = createCoinbaseWalletSDK({
      appName: "StockNest",
      appLogoUrl: `${window.location.origin}/icon.svg`,
      appChainIds: [chain.id],
      preference: { options: "smartWalletOnly" },
    });
    sdkProvider = sdk.getProvider() as unknown as EIP1193Provider;
  }
  return sdkProvider;
}

export const hasBrowserWallet = () => typeof window !== "undefined" && !!(window as unknown as { ethereum?: unknown }).ethereum;

export async function connectWallet(kind: WalletKind): Promise<Connected> {
  const provider = kind === "smart" ? smartWalletProvider() : ((window as unknown as { ethereum?: EIP1193Provider }).ethereum as EIP1193Provider);
  if (!provider) throw new Error("No browser wallet found. Try Coinbase Smart Wallet instead.");
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
  if (!accounts?.[0]) throw new Error("No account was shared.");
  await ensureChain(provider);
  const client = createWalletClient({ chain, transport: custom(provider), account: accounts[0] });
  return { kind, address: accounts[0], client, provider };
}

async function ensureChain(provider: EIP1193Provider) {
  const current = (await provider.request({ method: "eth_chainId" })) as string;
  if (parseInt(current, 16) === chain.id) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: numberToHex(chain.id) }] });
  } catch (e) {
    if ((e as { code?: number }).code !== 4902) throw e;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId: numberToHex(chain.id), chainName: networkName, nativeCurrency: chain.nativeCurrency, rpcUrls: [rpcUrl] }],
    });
  }
}

/** Plain-language wallet errors. */
export function walletError(e: unknown): string {
  const err = e as { code?: number; shortMessage?: string; message?: string; cause?: { code?: number } };
  const code = err.code ?? err.cause?.code;
  const msg = `${err.shortMessage ?? ""} ${err.message ?? ""}`.toLowerCase();
  if (code === 4001 || msg.includes("user rejected") || msg.includes("denied")) return "You cancelled in your wallet. Nothing was sent.";
  if (msg.includes("insufficient funds") || msg.includes("exceeds the balance")) return `Your wallet needs a little ${networkName} ETH for gas. Get some free from a faucet, then try again.`;
  if (msg.includes("faucetcooldown")) return "You've used the test USDC faucet in the last hour. Try a smaller gift or wait a bit.";
  if (msg.includes("quoteexpired")) return "The price quote expired. Please try again.";
  if (msg.includes("notguardian")) return "Only the nest's guardian wallet can accept gifts. Connect the guardian wallet and try again.";
  if (msg.includes("stilllocked")) return "This gift is still locked until its unlock date.";
  if (msg.includes("giftexpired")) return "This gift has expired. It can now be refunded to the giver.";
  if (msg.includes("notrefundable")) return "This gift can't be refunded yet: it hasn't expired and the nest can receive it.";
  if (msg.includes("notpending")) return "This gift was already accepted or refunded.";
  return err.shortMessage || "Something went wrong in your wallet. Please try again.";
}

export const memoHash = (message: string) => keccak256(toBytes(message));

type Quote = { token: Address; price: string; expiry: string; signature: Hex };

/**
 * Send a USDC → stock gift into the StockNest escrow. Smart wallets get one
 * confirmation for [faucet if needed, approve if needed, send]; other wallets
 * confirm each step. unlockAt/expiresAt are unix seconds (unlockAt 0 = now).
 */
export async function sendStockGift(opts: {
  wallet: Connected; nestId: number; usdAmount: number; quote: Quote; message: string;
  unlockAt: number; expiresAt: number; onStep?: (s: string) => void;
}): Promise<Hex> {
  const { wallet, nestId, usdAmount, quote, message, unlockAt, expiresAt, onStep } = opts;
  const amount = parseUnits(usdAmount.toFixed(2), 6);
  const [balance, allowance, last] = await Promise.all([
    publicClient.readContract({ address: usdcAddress, abi: testUsdcAbi, functionName: "balanceOf", args: [wallet.address] }),
    publicClient.readContract({ address: usdcAddress, abi: testUsdcAbi, functionName: "allowance", args: [wallet.address, stockNestAddress] }),
    publicClient.readContract({ address: usdcAddress, abi: testUsdcAbi, functionName: "lastFaucet", args: [wallet.address] }),
  ]);

  const calls: { to: Address; data: Hex; label: string }[] = [];
  if (balance < amount) {
    if (amount > balance + 1_000_000_000n) throw new Error("Test gifts can be up to $1,000 at a time.");
    if (last !== 0n && BigInt(Math.floor(Date.now() / 1000)) < last + 3600n) throw new Error("You've used the test USDC faucet in the last hour. Try a smaller gift or wait a bit.");
    calls.push({ to: usdcAddress, data: encodeFunctionData({ abi: testUsdcAbi, functionName: "faucet" }), label: "Getting free test USDC" });
  }
  if (allowance < amount) {
    calls.push({ to: usdcAddress, data: encodeFunctionData({ abi: testUsdcAbi, functionName: "approve", args: [stockNestAddress, amount] }), label: "Approving USDC" });
  }
  calls.push({
    to: stockNestAddress,
    data: encodeFunctionData({
      abi: stockNestAbi, functionName: "sendGift",
      args: [BigInt(nestId), quote.token, amount, BigInt(quote.price), BigInt(quote.expiry), quote.signature, BigInt(unlockAt), BigInt(expiresAt), memoHash(message)],
    }),
    label: "Sending your gift",
  });

  // One-tap batch (EIP-5792) for smart wallets, with optional gas sponsorship.
  if (wallet.kind === "smart") {
    try {
      onStep?.("Confirm once in your wallet");
      const paymaster = process.env.NEXT_PUBLIC_PAYMASTER_URL;
      const { id } = await wallet.client.sendCalls({
        account: wallet.address,
        chain,
        calls: calls.map(({ to, data }) => ({ to, data })),
        ...(paymaster ? { capabilities: { paymasterService: { url: paymaster } } } : {}),
      });
      onStep?.("Sending your gift on Base");
      const result = await wallet.client.waitForCallsStatus({ id, timeout: 120_000 });
      const receipts = result.receipts ?? [];
      const last = receipts[receipts.length - 1];
      if (result.status !== "success" || !last?.transactionHash) throw new Error("The gift transaction didn't go through.");
      return last.transactionHash;
    } catch (e) {
      const code = (e as { code?: number }).code;
      if (code !== 4200 && code !== -32601 && code !== 5700) throw e; // fall back only if batching is unsupported
    }
  }

  // Step-by-step for wallets without batching.
  let hash: Hex = "0x";
  for (const c of calls) {
    onStep?.(c.label);
    hash = await wallet.client.sendTransaction({ account: wallet.address, chain, to: c.to, data: c.data });
    const r = await publicClient.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`${c.label} failed onchain.`);
  }
  return hash;
}

/** Guardian creates the onchain nest (vault) for a slug. */
export async function createOnchainNest(wallet: Connected, slug: string): Promise<Hex> {
  const hash = await wallet.client.writeContract({
    account: wallet.address, chain, address: stockNestAddress, abi: stockNestAbi, functionName: "createNest", args: [keccak256(toBytes(slug))],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Guardian accepts an escrow gift (or it's refunded if the vault isn't eligible). */
export async function claimOnchainGift(wallet: Connected, giftId: number): Promise<Hex> {
  const hash = await wallet.client.writeContract({
    account: wallet.address, chain, address: stockNestAddress, abi: stockNestAbi, functionName: "claimGift", args: [BigInt(giftId)],
  });
  const r = await publicClient.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("Accepting the gift failed onchain.");
  return hash;
}

/** Anyone can return an expired (or ineligible) gift to its giver. */
export async function refundOnchainGift(wallet: Connected, giftId: number): Promise<Hex> {
  const hash = await wallet.client.writeContract({
    account: wallet.address, chain, address: stockNestAddress, abi: stockNestAbi, functionName: "refundGift", args: [BigInt(giftId)],
  });
  const r = await publicClient.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("The refund failed onchain.");
  return hash;
}
