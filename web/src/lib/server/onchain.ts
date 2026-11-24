import { createPublicClient, createWalletClient, decodeEventLog, encodeAbiParameters, http, keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chain, deployment, nestKey, onchainEnabled, rpcUrl, stockNestAbi, stockNestAddress, tickerForToken, tokenAddress } from "@/lib/chain";

/** Server-side chain access: signs price quotes and verifies gift/nest transactions. */

export const publicClient = createPublicClient({ chain, transport: http(process.env.BASE_SEPOLIA_RPC || rpcUrl) });

export const quotesEnabled = () => onchainEnabled && /^0x[0-9a-fA-F]{64}$/.test(process.env.QUOTE_SIGNER_PRIVATE_KEY ?? "");

/** Sign a live price quote the StockNest contract will accept (see StockNest.quoteHash). */
export async function signQuote(ticker: string, priceUsd: number) {
  const token = tokenAddress(ticker);
  if (!token || !quotesEnabled()) throw new Error("Onchain gifts aren't configured.");
  const account = privateKeyToAccount(process.env.QUOTE_SIGNER_PRIVATE_KEY as Hex);
  const price = BigInt(Math.round(priceUsd * 1e8));
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 300); // contract allows up to 10 minutes
  const hash = keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint64" }],
      [BigInt(deployment.chainId), stockNestAddress, token, price, expiry],
    ),
  );
  const signature = await account.signMessage({ message: { raw: hash } });
  return { token, price: price.toString(), expiry: expiry.toString(), signature };
}

export const memoHashOf = (message: string) => keccak256(toBytes(message));

export type VerifiedGift = {
  status: "pending";
  giftId: number;
  nestId: number;
  giver: string;
  ticker: string;
  usd: number;
  shares: number;
  unlockAt: string;
  memoHash: Hex;
  txHash: Hex;
};

const iso = (secs: bigint) => new Date(Number(secs) * 1000).toISOString();

async function ourLogs(txHash: Hex) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 });
  if (receipt.status !== "success") throw new Error("That transaction failed onchain.");
  const out = [];
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== stockNestAddress.toLowerCase()) continue;
    try { out.push(decodeEventLog({ abi: stockNestAbi, data: log.data, topics: log.topics })); } catch { /* not one of ours */ }
  }
  return out;
}

/** Read a send transaction's receipt and decode the GiftSent event (the gift is now in escrow). */
export async function verifyGiftTx(txHash: Hex): Promise<VerifiedGift> {
  for (const ev of await ourLogs(txHash)) {
    if (ev.eventName !== "GiftSent") continue;
    const ticker = tickerForToken(ev.args.token);
    if (!ticker) continue;
    return {
      status: "pending", giftId: Number(ev.args.giftId), nestId: Number(ev.args.nestId), giver: ev.args.giver, ticker,
      usd: Number(ev.args.usdcAmount) / 1e6, shares: Number(ev.args.uiShares) / 1e18,
      unlockAt: iso(ev.args.unlockAt), memoHash: ev.args.memoHash, txHash,
    };
  }
  throw new Error("No StockNest gift found in that transaction.");
}

export type GiftSettlement = { status: "pending" | "delivered" | "returned"; refundReason?: "ineligible"; settleTxHash?: Hex };

/**
 * The gift's current onchain state. With the claim/refund tx hash we read the exact
 * outcome from its event; without it we read the contract's stored status.
 */
export async function readGiftSettlement(giftId: number, settleTx?: Hex): Promise<GiftSettlement> {
  if (settleTx) {
    for (const ev of await ourLogs(settleTx)) {
      if (ev.eventName === "GiftClaimed" && Number(ev.args.giftId) === giftId) return { status: "delivered", settleTxHash: settleTx };
      if (ev.eventName === "GiftRefunded" && Number(ev.args.giftId) === giftId) {
        return { status: "returned", refundReason: "ineligible", settleTxHash: settleTx };
      }
    }
  }
  const g = await publicClient.readContract({ address: stockNestAddress, abi: stockNestAbi, functionName: "gifts", args: [BigInt(giftId)] });
  const status = g[7];
  if (status === 2) return { status: "delivered" };
  if (status === 3) return { status: "returned", refundReason: "ineligible" };
  return { status: "pending" };
}

// ------------------------------------------------------------------ keeper

/**
 * Deliver an opened gift into the child's vault. The contract lets anyone do this
 * (the destination is fixed), so the server does it for the family: nobody has to
 * remember to accept. Paid for by the quote-signer wallet's testnet ETH.
 * If the vault can't hold the stock, the same call refunds the giver.
 */
let queue: Promise<unknown> = Promise.resolve();
const inFlight = new Map<number, Promise<GiftSettlement>>();

export function deliverGift(giftId: number): Promise<GiftSettlement> {
  if (!quotesEnabled()) return readGiftSettlement(giftId);
  const running = inFlight.get(giftId);
  if (running) return running;
  // One transaction at a time from the keeper wallet, so nonces never collide.
  const job = queue.then(async (): Promise<GiftSettlement> => {
    const now = await readGiftSettlement(giftId);
    if (now.status !== "pending") return now;
    const account = privateKeyToAccount(process.env.QUOTE_SIGNER_PRIVATE_KEY as Hex);
    const wallet = createWalletClient({ account, chain, transport: http(process.env.BASE_SEPOLIA_RPC || rpcUrl) });
    try {
      const hash = await wallet.writeContract({ address: stockNestAddress, abi: stockNestAbi, functionName: "claimGift", args: [BigInt(giftId)] });
      return await readGiftSettlement(giftId, hash);
    } catch {
      return readGiftSettlement(giftId); // e.g. still locked, or someone else delivered it first
    }
  });
  queue = job.catch(() => undefined);
  inFlight.set(giftId, job);
  return job.finally(() => inFlight.delete(giftId));
}

/** Verify a createNest transaction for this slug and return the onchain nest. */
export async function verifyNestTx(txHash: Hex, slug: string, manageToken: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 });
  if (receipt.status !== "success") throw new Error("That transaction failed onchain.");
  const slugHash = nestKey(slug, manageToken);
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== stockNestAddress.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: stockNestAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "NestCreated" && ev.args.slugHash === slugHash) {
        return { chainNestId: Number(ev.args.nestId), vault: ev.args.vault, guardian: ev.args.guardian };
      }
    } catch { /* not one of ours */ }
  }
  throw new Error("No matching nest found in that transaction.");
}

/** Demo nests are created by the deploy script; attach their onchain ids. */
export function seedChainInfo(slug: string) {
  const n = deployment.nests?.[slug];
  return n && onchainEnabled ? { chainNestId: n.id, vault: n.vault } : null;
}

/**
 * Testnet gas drip: a giver or parent with an empty wallet gets a tiny amount of
 * Base Sepolia ETH from the server, so nobody has to find a faucet. Once per
 * address per server run, and only while the wallet is nearly empty.
 */
const DRIP = 200_000_000_000_000n; // 0.0002 ETH: dozens of Base Sepolia transactions
const LOW = 50_000_000_000_000n; // 0.00005 ETH
const dripped = new Set<string>();

export async function dripGas(address: Hex): Promise<{ sent: boolean; reason?: string }> {
  if (!quotesEnabled()) return { sent: false, reason: "off" };
  const key = address.toLowerCase();
  if (dripped.has(key)) return { sent: false, reason: "already" };
  if ((await publicClient.getBalance({ address })) >= LOW) return { sent: false, reason: "has-gas" };
  dripped.add(key);
  const job = queue.then(async () => {
    const account = privateKeyToAccount(process.env.QUOTE_SIGNER_PRIVATE_KEY as Hex);
    const wallet = createWalletClient({ account, chain, transport: http(process.env.BASE_SEPOLIA_RPC || rpcUrl) });
    const hash = await wallet.sendTransaction({ to: address, value: DRIP });
    await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 });
    return { sent: true };
  });
  queue = job.catch(() => undefined);
  try { return await job; } catch { dripped.delete(key); return { sent: false, reason: "failed" }; }
}
