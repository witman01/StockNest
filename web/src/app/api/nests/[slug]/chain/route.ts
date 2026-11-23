import { NextResponse } from "next/server";
import { z } from "zod";
import type { Hex } from "viem";
import { bearer, tokenMatches } from "@/lib/server/auth";
import { verifyNestTx } from "@/lib/server/onchain";
import { getRepo } from "@/lib/server/repo";

const Body = z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) });

/** Link a nest to the onchain vault the guardian just created (verified from the receipt). */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = getRepo();
  const nest = await repo.getNest(slug);
  if (!nest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!tokenMatches(bearer(req), nest.manageTokenHash)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (nest.chainNestId) return NextResponse.json({ error: "This nest is already onchain." }, { status: 409 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid transaction." }, { status: 400 });
  try {
    const info = await verifyNestTx(parsed.data.txHash as Hex, slug, bearer(req)!);
    await repo.updateNest(slug, info);
    return NextResponse.json(info);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't verify the transaction." }, { status: 400 });
  }
}
