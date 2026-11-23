import { ACCEPT_WINDOWS, DEFAULT_ACCEPT_WINDOW } from "@/lib/nests";
import { z } from "zod";
import { STOCKS } from "@/lib/stocks";

const TICKERS = STOCKS.map((s) => s.ticker) as [string, ...string[]];
const clean = (max: number) => z.string().trim().max(max);

export const CreateNestInput = z.object({
  childName: clean(24).min(1, "Please add a display name."),
  nestName: clean(40).optional().default(""),
  avatar: z.enum(["amelia", "tobi", "sprout", "bear"]),
  photo: z.string().regex(/^(\/api\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)|https:\/\/[^\s]+)$/).optional(),
  showPhoto: z.boolean().default(true),
  note: clean(180).default(""),
  parentNames: clean(60).default(""),
  goal: z.number().int().positive().max(100_000_000).optional(),
  picks: z.array(z.enum(TICKERS)).min(1, "Pick at least one stock.").max(6),
  showAmounts: z.boolean().default(true),
  /** Gifts open on this day (yyyy-mm-dd). Must be in the future, at most 20 years out. */
  opensOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => {
    const t = Date.parse(`${d}T00:00:00Z`);
    return t > Date.now() && t < Date.now() + 20 * 365 * 86400e3;
  }, "Pick a date in the future.").optional(),
  acceptWindow: z.union(ACCEPT_WINDOWS.map((w) => z.literal(w.secs)) as unknown as [z.ZodLiteral<number>, z.ZodLiteral<number>]).default(DEFAULT_ACCEPT_WINDOW),
});

export const GiftInput = z.object({
  mode: z.enum(["buy", "own"]),
  ticker: z.enum(TICKERS),
  /** buy mode: USD amount. */
  usd: z.number().min(1).max(10_000).optional(),
  /** own mode: shares sent. */
  shares: z.number().positive().max(1_000_000).optional(),
  from: clean(60).default(""),
  isPrivate: z.boolean().default(false),
  occasion: clean(30).min(1),
  message: clean(240).default(""),
  /** Onchain gift: the server verifies this transaction instead of trusting the amounts. */
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
}).refine((g) => g.txHash || (g.mode === "buy" ? g.usd !== undefined : g.shares !== undefined), { message: "Amount is required." });

export const UpdateNestInput = z.object({
  nestName: clean(40).min(1).optional(),
  note: clean(180).optional(),
  goal: z.number().int().positive().max(100_000_000).nullable().optional(),
  picks: z.array(z.enum(TICKERS)).min(1).max(6).optional(),
  showAmounts: z.boolean().optional(),
  showPhoto: z.boolean().optional(),
});

export function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Invalid request.";
}
