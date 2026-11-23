import { createPublicClient, decodeEventLog, encodeAbiParameters, http, keccak256, toBytes, type Hex } from "viem";
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
  expiresAt: string;
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
      unlockAt: iso(ev.args.unlockAt), expiresAt: iso(ev.args.expiresAt), memoHash: ev.args.memoHash, txHash,
    };
  }
  throw new Error("No StockNest gift found in that transaction.");
}

export type GiftSettlement = { status: "pending" | "delivered" | "returned"; refundReason?: "expired" | "ineligible"; settleTxHash?: Hex };

/**
 * The gift's current onchain state. With the claim/refund tx hash we read the exact
 * outcome from its event; without it we read the contract's stored status.
 */
export async function readGiftSettlement(giftId: number, settleTx?: Hex): Promise<GiftSettlement> {
  if (settleTx) {
    for (const ev of await ourLogs(settleTx)) {
      if (ev.eventName === "GiftClaimed" && Number(ev.args.giftId) === giftId) return { status: "delivered", settleTxHash: settleTx };
      if (ev.eventName === "GiftRefunded" && Number(ev.args.giftId) === giftId) {
        return { status: "returned", refundReason: ev.args.reason === 1 ? "expired" : "ineligible", settleTxHash: settleTx };
      }
    }
  }
  const g = await publicClient.readContract({ address: stockNestAddress, abi: stockNestAbi, functionName: "gifts", args: [BigInt(giftId)] });
  const status = g[8], expiresAt = g[7];
  if (status === 2) return { status: "delivered" };
  if (status === 3) return { status: "returned", refundReason: BigInt(Math.floor(Date.now() / 1000)) > expiresAt ? "expired" : "ineligible" };
  return { status: "pending" };
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
