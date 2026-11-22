import { getRepo } from "@/lib/server/repo";

const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

/** Serves photos stored by the local file repo (Supabase serves its own). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const bytes = await getRepo().readPhoto(file);
  if (!bytes) return new Response("Not found", { status: 404 });
  const ext = file.split(".").pop() as keyof typeof TYPES;
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": TYPES[ext], "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
