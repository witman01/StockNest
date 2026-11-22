import { NextResponse } from "next/server";
import { toPublicNest } from "@/lib/nests";
import { bearer, tokenMatches } from "@/lib/server/auth";
import { getRepo } from "@/lib/server/repo";
import { firstError, UpdateNestInput } from "@/lib/server/validate";

type Ctx = { params: Promise<{ slug: string }> };

/** Public view of a nest (private details removed). */
export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const nest = await getRepo().getNest(slug);
  if (!nest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toPublicNest(nest));
}

/** Parent-only settings update. Requires the nest's manage key. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const repo = getRepo();
  const nest = await repo.getNest(slug);
  if (!nest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!tokenMatches(bearer(req), nest.manageTokenHash)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const parsed = UpdateNestInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const { goal, ...rest } = parsed.data;
  await repo.updateNest(slug, { ...rest, ...(goal !== undefined ? { goal: goal ?? undefined } : {}) });
  return NextResponse.json({ ok: true });
}
