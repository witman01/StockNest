import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { getRepo } from "@/lib/server/repo";
import { rateLimited } from "@/lib/server/ratelimit";
import { deliverGift, readGiftSettlement } from "@/lib/server/onchain";

/**
 * Bring an escrow gift up to date with the chain. If it has opened and is still
 * waiting, the server delivers it to the child's vault first (anyone may; the
 * contract only ever sends it there).
 * No auth needed: the outcome is read from the StockNest contract, never trusted from the client.
 * Body (optional): { txHash } of a delivery/refund transaction, to link its receipt.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  if (rateLimited(req, "gift-sync", 40)) return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  const { slug, id } = await params;
  const repo = getRepo();
  const nest = await repo.getNest(slug);
  const gift = nest?.gifts.find((g) => g.id === id);
  if (!nest || !gift) return NextResponse.json({ error: "Gift not found." }, { status: 404 });
  if (!gift.chainGiftId) return NextResponse.json({ error: "This gift isn't onchain." }, { status: 400 });
  if (gift.status !== "pending") return NextResponse.json({ gift });

  const body = (await req.json().catch(() => ({}))) as { txHash?: string };
  const txHash = typeof body.txHash === "string" && /^0x[0-9a-fA-F]{64}$/.test(body.txHash) ? (body.txHash as Hex) : undefined;

  let s;
  const open = !gift.unlockAt || Date.parse(gift.unlockAt) <= Date.now();
  try { s = txHash ? await readGiftSettlement(gift.chainGiftId, txHash) : open ? await deliverGift(gift.chainGiftId) : await readGiftSettlement(gift.chainGiftId); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't read the gift onchain." }, { status: 400 }); }
  if (s.status === "pending") return NextResponse.json({ gift });

  const patch = { status: s.status, refundReason: s.refundReason, settleTxHash: s.settleTxHash };
  await repo.updateGift(slug, id, patch);
  return NextResponse.json({ gift: { ...gift, ...patch } });
}
