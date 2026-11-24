import { stockBy } from "./stocks";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AvatarKind = "amelia" | "tobi" | "sprout" | "bear";
export type GiftMode = "buy" | "own";
/** pending = sent onchain, held in escrow until it opens and is delivered to the child's vault. */
export type GiftStatus = "pending" | "usdc_received" | "buying" | "delivered" | "returned" | "failed";
/** The only refund: the child's vault can't legally hold that stock. */
export type RefundReason = "ineligible";

export type Gift = {
  id: string;
  from: string;
  isPrivate: boolean;
  ticker: string;
  shares: number;
  /** USD value at the time of the gift. */
  usd: number;
  occasion: string;
  message: string;
  mode: GiftMode;
  status: GiftStatus;
  createdAt: string;
  txHash?: string;
  /** Onchain escrow gift (StockNest.gifts id) and its dates. */
  chainGiftId?: number;
  unlockAt?: string;
  refundReason?: RefundReason;
  /** The claim or refund transaction. */
  settleTxHash?: string;
};

export type Nest = {
  slug: string;
  childName: string;
  nestName: string;
  avatar: AvatarKind;
  /** URL of the child's photo (served by /api/uploads or Supabase Storage). */
  photo?: string;
  showPhoto: boolean;
  note: string;
  parentNames: string;
  milestone?: string;
  goal?: number;
  picks: string[];
  showAmounts: boolean;
  gifts: Gift[];
  createdAt: string;
  /** Gift rules, set by the parent. Gifts stay wrapped until this day (yyyy-mm-dd, 00:00 UTC). */
  opensOn?: string;
  /** Onchain nest (StockNest contract) once the guardian has created it. */
  chainNestId?: number;
  vault?: string;
  guardian?: string;
};

/* ------------------------------------------------------------------ */
/* Gift rules                                                          */
/* ------------------------------------------------------------------ */

export const opensAtMs = (opensOn?: string) => (opensOn ? Date.parse(`${opensOn}T00:00:00Z`) : 0);

/**
 * The unlock time a gift sent now must use, from the nest's rules (unix seconds; 0 = opens now).
 * There's no expiry: once open, a gift is delivered to the child's vault automatically.
 */
export function giftTiming(nest: Pick<Nest, "opensOn">, nowMs = Date.now()) {
  const opens = Math.floor(opensAtMs(nest.opensOn) / 1000);
  return { unlockAt: opens > Math.floor(nowMs / 1000) ? opens : 0 };
}

/* ------------------------------------------------------------------ */
/* Seed data (demo)                                                    */
/* ------------------------------------------------------------------ */

const g = (id: string, from: string, ticker: string, usd: number, occasion: string, message: string, createdAt: string, extra: Partial<Gift> = {}): Gift => ({
  id, from, ticker, usd, occasion, message, createdAt,
  shares: +(usd / stockBy(ticker).price).toFixed(4),
  isPrivate: false, mode: "buy", status: "delivered",
  txHash: "0x" + id.padEnd(8, "0") + "…c21d",
  ...extra,
});

export const SEED_NESTS: Nest[] = [
  {
    slug: "amelia",
    childName: "Amelia",
    nestName: "Amelia's Stock Nest",
    avatar: "amelia",
    showPhoto: true,
    note: "Instead of another toy this year, gift Amelia a piece of the companies shaping her future.",
    parentNames: "Daniel & Grace",
    milestone: "🎂 Turning 5 on 12 March",
    goal: 5000,
    picks: ["AAPL", "NVDA", "MSFT", "AMZN"],
    showAmounts: true,
    createdAt: "2026-10-01T10:00:00Z",
    gifts: [
      g("a7f3", "Grandma Rose", "AAPL", 100, "🎂 Birthday", "Own a little piece of the future, my darling. Grandma loves you.", "2026-11-21T09:00:00Z"),
      g("b2c9", "Uncle James", "NVDA", 50, "🎂 Birthday", "Sending love from Toronto. May your future be powered by big ideas.", "2026-11-20T18:30:00Z", { status: "buying" }),
      g("c81e", "Aunt Sarah", "AMZN", 25, "💛 Just because", "For all the amazing things ahead of you.", "2026-11-18T12:00:00Z"),
      g("d44a", "A family friend", "MSFT", 150, "🎄 Holiday", "Merry Christmas, little one!", "2026-11-12T08:00:00Z", { isPrivate: true }),
      g("e9b0", "Grandpa Ade", "AMZN", 575, "🎓 Milestone", "For your first day of school. Proud of you, little star.", "2026-10-28T15:00:00Z"),
      g("f13d", "Mum & Dad", "AAPL", 550, "🌱 First gift", "The first twig in your nest. We love you endlessly.", "2026-10-01T10:30:00Z"),
      g("0a6c", "Cousin Zara", "NVDA", 300, "🎂 Birthday", "From your favourite cousin! Big things ahead.", "2026-10-15T16:20:00Z", { mode: "own" }),
    ],
  },
  {
    slug: "tobi",
    childName: "Tobi",
    nestName: "Tobi's Stock Nest",
    avatar: "tobi",
    showPhoto: true,
    note: "Help Tobi start his first portfolio. Every share comes with your story.",
    parentNames: "Daniel & Grace",
    goal: 2000,
    picks: ["AMZN", "GOOGL", "TSLA"],
    showAmounts: true,
    createdAt: "2026-10-20T10:00:00Z",
    gifts: [
      g("1b7e", "Grandma Rose", "GOOGL", 186, "💛 Just because", "For my little explorer.", "2026-11-10T10:00:00Z"),
      g("2c8f", "Aunt Sarah", "AMZN", 124, "🎂 Birthday", "For all the amazing things ahead.", "2026-11-19T10:00:00Z", { status: "usdc_received" }),
      g("3d9a", "Cousin Mo", "GOOGL", 34.5, "💛 Just because", "Token transfer policy: nest not yet eligible.", "2026-11-17T10:00:00Z", { mode: "own", status: "returned" }),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Derived helpers                                                     */
/* ------------------------------------------------------------------ */

export type Totals = ReturnType<typeof nestTotals>;
/** What a visitor's browser receives: no owner secrets, and private details removed. */
export type PublicNest = Omit<Nest, "gifts"> & { gifts: Gift[]; totals: Totals };

export const countsTowardNest = (gift: Gift) => gift.status === "delivered" || gift.status === "buying" || gift.status === "usdc_received";

export function nestTotals(nest: Nest) {
  const live = nest.gifts.filter(countsTowardNest);
  const total = live.reduce((s, x) => s + x.usd, 0);
  const map = new Map<string, { ticker: string; shares: number; usd: number; gifts: number }>();
  for (const x of live) {
    const h = map.get(x.ticker) ?? { ticker: x.ticker, shares: 0, usd: 0, gifts: 0 };
    h.shares += x.shares; h.usd += x.usd; h.gifts += 1;
    map.set(x.ticker, h);
  }
  const holdings = [...map.values()].sort((a, b) => b.usd - a.usd);
  const givers = new Set(live.map((x) => x.from)).size;
  return { total, holdings, givers, giftCount: live.length, pct: nest.goal ? Math.min(1, total / nest.goal) : 0 };
}


/** Strip private details before a nest leaves the server for a public page. */
export function toPublicNest(nest: Nest): PublicNest {
  const totals = nestTotals(nest);
  const { gifts, ...rest } = nest;
  const pub: PublicNest = {
    ...rest,
    photo: nest.showPhoto ? nest.photo : undefined,
    totals,
    gifts: gifts.filter((g) => countsTowardNest(g) || g.status === "pending").map((g) => ({
      ...g,
      from: g.isPrivate ? "A family friend" : g.from,
      usd: nest.showAmounts && !g.isPrivate ? g.usd : 0,
      shares: g.isPrivate ? 0 : g.shares,
    })),
  };
  if ("manageTokenHash" in pub) delete (pub as Record<string, unknown>).manageTokenHash;
  return pub;
}
