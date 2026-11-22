import { NextResponse } from "next/server";
import { getPrices } from "@/lib/server/prices";

/** Live tokenized-stock prices (Chainlink on Base mainnet), cached ~60s. */
export async function GET() {
  const book = await getPrices();
  return NextResponse.json(book, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
