import { STOCKS } from "@/lib/stocks";

/**
 * Live prices from the Coinbase tokenized-stock Chainlink feeds on Base mainnet.
 * One batched JSON-RPC request reads latestRoundData plus the previous rounds
 * (for sparklines). Results are cached in memory for 60 seconds.
 */

export type PricePoint = { price: number; updatedAt: number; history: number[]; live: boolean };
export type PriceBook = { fetchedAt: number; source: "chainlink" | "fallback"; prices: Record<string, PricePoint> };

const RPC = process.env.BASE_MAINNET_RPC || "https://mainnet.base.org";
const HISTORY = 12;
const TTL_MS = 60_000;
const SEL_LATEST = "0xfeaf968c"; // latestRoundData()
const SEL_ROUND = "0x9a6fc8f5"; // getRoundData(uint80)

let cache: PriceBook | null = null;
let inflight: Promise<PriceBook> | null = null;

type RpcReq = { jsonrpc: "2.0"; id: number; method: "eth_call"; params: [{ to: string; data: string }, "latest"] };
const call = (id: number, to: string, data: string): RpcReq => ({ jsonrpc: "2.0", id, method: "eth_call", params: [{ to, data }, "latest"] });

/** Decode (roundId, answer, startedAt, updatedAt, answeredInRound). */
function decodeRound(hex?: string) {
  if (!hex || hex === "0x" || hex.length < 2 + 64 * 5) return null;
  const w = (i: number) => BigInt("0x" + hex.slice(2 + i * 64, 2 + (i + 1) * 64));
  let answer = w(1);
  if (answer >= 1n << 255n) answer -= 1n << 256n; // int256
  return { roundId: w(0), price: Number(answer) / 1e8, updatedAt: Number(w(3)) };
}

async function rpcBatch(reqs: RpcReq[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  for (let i = 0; i < reqs.length; i += 50) {
    const res = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(reqs.slice(i, i + 50)), cache: "no-store", signal: AbortSignal.timeout(15000) });
    const data = (await res.json()) as { id: number; result?: string }[];
    for (const r of Array.isArray(data) ? data : []) if (r.result) out.set(r.id, r.result);
  }
  return out;
}

function fallback(): PriceBook {
  const prices: Record<string, PricePoint> = {};
  for (const s of STOCKS) prices[s.ticker] = { price: s.price, updatedAt: 0, history: [s.price, s.price], live: false };
  return { fetchedAt: Date.now(), source: "fallback", prices };
}

async function load(): Promise<PriceBook> {
  // 1) latest round for every feed
  const latest = await rpcBatch(STOCKS.map((s, i) => call(i, s.feed, SEL_LATEST)));
  const rounds = STOCKS.map((s, i) => ({ s, r: decodeRound(latest.get(i)) }));

  // 2) previous rounds for sparklines (same phase: roundId - k)
  const histReqs: RpcReq[] = [];
  rounds.forEach(({ r }, i) => {
    if (!r) return;
    for (let k = HISTORY - 1; k >= 1; k--) {
      const id = r.roundId - BigInt(k);
      histReqs.push(call(1000 + i * 100 + k, STOCKS[i].feed, SEL_ROUND + id.toString(16).padStart(64, "0")));
    }
  });
  const hist = histReqs.length ? await rpcBatch(histReqs) : new Map<number, string>();

  const now = Date.now() / 1000;
  const prices: Record<string, PricePoint> = {};
  rounds.forEach(({ s, r }, i) => {
    if (!r || !(r.price > 0)) { prices[s.ticker] = { price: s.price, updatedAt: 0, history: [s.price, s.price], live: false }; return; }
    const history: number[] = [];
    for (let k = HISTORY - 1; k >= 1; k--) {
      const h = decodeRound(hist.get(1000 + i * 100 + k));
      if (h && h.price > 0) history.push(h.price);
    }
    history.push(r.price);
    // Feeds update on 0.5% moves or a 24h heartbeat, and go quiet outside market hours.
    prices[s.ticker] = { price: r.price, updatedAt: r.updatedAt, history: history.length > 1 ? history : [r.price, r.price], live: now - r.updatedAt < 6 * 3600 };
  });
  return { fetchedAt: Date.now(), source: "chainlink", prices };
}

export async function getPrices(): Promise<PriceBook> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache;
  inflight ??= load()
    .then((book) => (cache = book))
    .catch((e) => { console.error("[prices] feed read failed:", e); return cache ?? fallback(); })
    .finally(() => { inflight = null; });
  return inflight;
}

export async function priceOf(ticker: string): Promise<number> {
  const book = await getPrices();
  return book.prices[ticker]?.price ?? STOCKS.find((s) => s.ticker === ticker)?.price ?? 0;
}
