import { NextResponse } from "next/server";
import { z } from "zod";
import { SEED_NESTS, type Nest } from "@/lib/nests";
import { tokenMatches } from "@/lib/server/auth";
import { getRepo, type NestRecord } from "@/lib/server/repo";

const Body = z.object({
  owned: z.record(z.string().max(80), z.string().max(100)).default({}),
  example: z.boolean().optional(),
});

function strip(n: NestRecord): Nest {
  const copy: NestRecord = { ...n };
  delete copy.manageTokenHash;
  return copy;
}

/**
 * Full (owner) view of the nests this browser manages. The client sends
 * { slug: manageKey } pairs and only nests whose key matches are returned.
 * { example: true } returns the demo family for the example dashboard.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const repo = getRepo();

  if (parsed.data.example) {
    const nests = await Promise.all(SEED_NESTS.map((n) => repo.getNest(n.slug)));
    return NextResponse.json({ nests: nests.filter((n): n is NestRecord => !!n).map(strip), example: true });
  }

  const entries = Object.entries(parsed.data.owned).slice(0, 50);
  const found = await Promise.all(entries.map(async ([slug, token]) => {
    const n = await repo.getNest(slug);
    return n && tokenMatches(token, n.manageTokenHash) ? strip(n) : null;
  }));
  return NextResponse.json({ nests: found.filter(Boolean) });
}
