import { NextResponse } from "next/server";
import { hashToken, newManageToken } from "@/lib/server/auth";
import { getRepo } from "@/lib/server/repo";
import { rateLimited } from "@/lib/server/ratelimit";
import { CreateNestInput, firstError } from "@/lib/server/validate";
import { slugify } from "@/lib/format";

/** Create a nest. Returns its slug and the parent's secret manage key (shown once). */
export async function POST(req: Request) {
  if (rateLimited(req, "create-nest", 10)) return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  const parsed = CreateNestInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const input = parsed.data;

  const repo = getRepo();
  const base = slugify(input.childName);
  let slug = base;
  for (let i = 2; await repo.slugExists(slug); i++) slug = `${base}-${i}`;

  const manageToken = newManageToken();
  await repo.createNest({
    slug,
    childName: input.childName,
    nestName: input.nestName || `${input.childName}'s Stock Nest`,
    avatar: input.avatar,
    photo: input.photo,
    showPhoto: !!input.photo && input.showPhoto,
    note: input.note,
    parentNames: input.parentNames || "the family",
    goal: input.goal,
    picks: input.picks,
    showAmounts: input.showAmounts,
    opensOn: input.opensOn,
    acceptWindow: input.acceptWindow,
    gifts: [],
    createdAt: new Date().toISOString(),
    manageTokenHash: hashToken(manageToken),
  });
  return NextResponse.json({ slug, manageToken }, { status: 201 });
}
