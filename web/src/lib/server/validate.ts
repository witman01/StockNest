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
}).refine((g) => (g.mode === "buy" ? g.usd !== undefined : g.shares !== undefined), { message: "Amount is required." });

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
