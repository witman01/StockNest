import { NextResponse } from "next/server";
import { z } from "zod";
import { priceOf } from "@/lib/server/prices";
import { quotesEnabled, signQuote } from "@/lib/server/onchain";
import { rateLimited } from "@/lib/server/ratelimit";
import { TICKERS } from "@/lib/stocks";

const Body = z.object({ ticker: z.enum(TICKERS as [string, ...string[]]) });

/**
 * A signed live price quote for an onchain gift. The price comes from the
 * Chainlink feed on Base mainnet; the StockNest contract on Base Sepolia only
 * accepts quotes signed by our quote signer, valid for 5 minutes.
 */
export async function POST(req: Request) {
  if (rateLimited(req, "quote", 30)) return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  if (!quotesEnabled()) return NextResponse.json({ error: "Onchain gifts aren't switched on yet." }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown stock." }, { status: 400 });
  const price = await priceOf(parsed.data.ticker);
  if (!(price > 0)) return NextResponse.json({ error: "No price available right now." }, { status: 503 });
  return NextResponse.json({ ...(await signQuote(parsed.data.ticker, price)), priceUsd: price });
}
