import { NextResponse } from "next/server";
import { isAddress, type Hex } from "viem";
import { dripGas } from "@/lib/server/onchain";
import { rateLimited } from "@/lib/server/ratelimit";

/** Top up an empty testnet wallet with a little gas so it can send a gift (Base Sepolia only). */
export async function POST(req: Request) {
  if (rateLimited(req, "gas", 3, 60 * 60_000)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const { address } = (await req.json().catch(() => ({}))) as { address?: string };
  if (!address || !isAddress(address)) return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  return NextResponse.json(await dripGas(address as Hex));
}
