import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { Gift } from "@/lib/nests";
import { getRepo } from "@/lib/server/repo";
import { rateLimited } from "@/lib/server/ratelimit";
import { firstError, GiftInput } from "@/lib/server/validate";
import { priceOf } from "@/lib/server/prices";

/**
 * Record a stock gift.
 * DEMO: execution is simulated, so the gift is marked delivered straight away.
 * With contracts, this becomes "usdc_received" and an indexer moves it through
 * buying, then delivered (or returned), as onchain events arrive.
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

  // Never trust client maths: price the gift on the server from the live feed.
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
