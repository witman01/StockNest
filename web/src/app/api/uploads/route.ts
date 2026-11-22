import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/server/repo";
import { rateLimited } from "@/lib/server/ratelimit";

const MAX = 1_500_000; // photos are resized to 512px in the browser first

function sniff(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 4).toString("hex") === "89504e47") return "png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

/** Upload a child photo. Body: raw image bytes. Returns { url }. */
export async function POST(req: Request) {
  if (rateLimited(req, "upload", 10)) return NextResponse.json({ error: "Too many uploads. Try again in a minute." }, { status: 429 });
  const bytes = Buffer.from(await req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX) return NextResponse.json({ error: "Photo must be under 1.5 MB." }, { status: 413 });
  const ext = sniff(bytes);
  if (!ext) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP image." }, { status: 415 });
  const url = await getRepo().savePhoto(randomBytes(16).toString("hex"), bytes, ext);
  return NextResponse.json({ url }, { status: 201 });
}
