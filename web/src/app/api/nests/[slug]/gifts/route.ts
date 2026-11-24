import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { giftTiming, opensAtMs, type Gift } from "@/lib/nests";
import { getRepo } from "@/lib/server/repo";
import { rateLimited } from "@/lib/server/ratelimit";
import { firstError, GiftInput } from "@/lib/server/validate";
import { priceOf } from "@/lib/server/prices";
import { deliverGift, memoHashOf, verifyGiftTx } from "@/lib/server/onchain";
import type { Hex } from "viem";

/**
 * Record a stock gift.
 * Onchain nests: the gift was sent to the StockNest escrow. If it's already open,
 * the server delivers it to the child's vault right away; if the nest opens on a
 * set day, it's "pending" until then and delivered then (see ./[id]/sync).
 * Other nests: execution is simulated and the gift is delivered straight away.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (rateLimited(req, "gift", 20)) return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  const { slug } = await params;
  const repo = getRepo();
  const nest = await repo.getNest(slug);
  if (!nest) return NextResponse.json({ error: "This nest isn't available." }, { status: 404 });

  const parsed = GiftInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const g = parsed.data;

  // Onchain gift: trust only what the transaction proves.
  if (g.txHash) {
    if (!nest.chainNestId) return NextResponse.json({ error: "This nest isn't onchain yet." }, { status: 400 });
    if (nest.gifts.some((x) => x.txHash?.toLowerCase() === g.txHash!.toLowerCase())) {
      return NextResponse.json({ error: "This gift is already recorded." }, { status: 409 });
    }
    let v;
    try { v = await verifyGiftTx(g.txHash as Hex); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't verify the transaction." }, { status: 400 }); }
    if (v.nestId !== nest.chainNestId) return NextResponse.json({ error: "That gift went to a different nest." }, { status: 400 });
    if (v.memoHash !== memoHashOf(g.message)) return NextResponse.json({ error: "The message doesn't match the onchain gift." }, { status: 400 });
    // The parent sets the opening day; a gift sent with another date isn't accepted here.
    const rule = giftTiming(nest);
    const nowSecs = Math.floor(Date.now() / 1000);
    const opens = Math.floor(opensAtMs(nest.opensOn) / 1000);
    const unlockSecs = Math.floor(Date.parse(v.unlockAt) / 1000);
    const unlockOk = unlockSecs === rule.unlockAt || (opens > 0 && unlockSecs === opens) || (rule.unlockAt === 0 && unlockSecs <= nowSecs);
    if (!unlockOk) return NextResponse.json({ error: "This gift doesn't follow the nest's gift rules." }, { status: 400 });
    const gift: Gift = {
      id: randomBytes(6).toString("hex"),
      from: g.from || "Someone who loves you",
      isPrivate: g.isPrivate,
      ticker: v.ticker,
      shares: +v.shares.toFixed(6),
      usd: +v.usd.toFixed(2),
      occasion: g.occasion,
      message: g.message,
      mode: "buy",
      status: v.status,
      txHash: v.txHash,
      chainGiftId: v.giftId,
      unlockAt: v.unlockAt,
      createdAt: new Date().toISOString(),
    };
    await repo.addGift(slug, gift);
    // Already open: deliver it into the child's vault now, so nobody has to accept it.
    if (unlockSecs <= nowSecs) {
      const s = await deliverGift(v.giftId).catch(() => null);
      if (s && s.status !== "pending") {
        const patch = { status: s.status, refundReason: s.refundReason, settleTxHash: s.settleTxHash };
        await repo.updateGift(slug, gift.id, patch);
        Object.assign(gift, patch);
      }
    }
    return NextResponse.json({ gift }, { status: 201 });
  }

  // A real onchain nest only takes real gifts: no free simulated ones padding its total.
  if (nest.chainNestId) {
    return NextResponse.json({ error: "This nest takes real onchain gifts only. Please send it with your wallet." }, { status: 400 });
  }

  // Simulated gift (nests that aren't onchain yet): price it on the server from the live feed.
  const price = await priceOf(g.ticker);
  const usd = g.mode === "buy" ? g.usd! : +(g.shares! * price).toFixed(2);
  const shares = g.mode === "buy" ? +(g.usd! / price).toFixed(6) : g.shares!;

  const gift: Gift = {
    id: randomBytes(6).toString("hex"),
    from: g.from || "Someone who loves you",
    isPrivate: g.isPrivate,
    ticker: g.ticker,
    shares,
    usd,
    occasion: g.occasion,
    message: g.message,
    mode: g.mode,
    status: "delivered",
    txHash: "0x" + randomBytes(4).toString("hex") + "…demo",
    createdAt: new Date().toISOString(),
  };
  await repo.addGift(slug, gift);
  return NextResponse.json({ gift }, { status: 201 });
}
