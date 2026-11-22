import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SEED_NESTS, type Gift, type Nest } from "@/lib/nests";

/** A nest as stored on the server: the public shape plus the owner's key hash. */
export type NestRecord = Nest & { manageTokenHash?: string };

export interface Repo {
  readonly kind: "file" | "supabase";
  getNest(slug: string): Promise<NestRecord | null>;
  slugExists(slug: string): Promise<boolean>;
  createNest(nest: NestRecord): Promise<void>;
  updateNest(slug: string, patch: Partial<Nest>): Promise<void>;
  addGift(slug: string, gift: Gift): Promise<void>;
  savePhoto(id: string, bytes: Buffer, ext: "jpg" | "png" | "webp"): Promise<string>;
  readPhoto(file: string): Promise<Buffer | null>;
}

/* ================================================================== */
/* File repo: zero-setup local development (.data/ in the web folder)  */
/* ================================================================== */

type FileDB = { nests: NestRecord[] };
const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const UPLOADS = path.join(DATA_DIR, "uploads");

class FileRepo implements Repo {
  readonly kind = "file" as const;
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<FileDB> {
    try {
      return JSON.parse(await fs.readFile(DB_FILE, "utf8")) as FileDB;
    } catch {
      const seeded: FileDB = { nests: structuredClone(SEED_NESTS) };
      await this.write(seeded);
      return seeded;
    }
  }
  private async write(db: FileDB) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, DB_FILE);
  }
  /** Serialise writes so concurrent gifts can't clobber each other. */
  private mutate<T>(fn: (db: FileDB) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const db = await this.read();
      const out = await fn(db);
      await this.write(db);
      return out;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async getNest(slug: string) { return (await this.read()).nests.find((n) => n.slug === slug) ?? null; }
  async slugExists(slug: string) { return !!(await this.getNest(slug)); }
  createNest(nest: NestRecord) { return this.mutate((db) => { db.nests.unshift(nest); }); }
  updateNest(slug: string, patch: Partial<Nest>) {
    return this.mutate((db) => {
      const n = db.nests.find((x) => x.slug === slug);
      if (n) Object.assign(n, patch);
    });
  }
  addGift(slug: string, gift: Gift) {
    return this.mutate((db) => {
      const n = db.nests.find((x) => x.slug === slug);
      if (!n) throw new Error("Nest not found");
      n.gifts.unshift(gift);
    });
  }
  async savePhoto(id: string, bytes: Buffer, ext: "jpg" | "png" | "webp") {
    await fs.mkdir(UPLOADS, { recursive: true });
    await fs.writeFile(path.join(UPLOADS, `${id}.${ext}`), bytes);
    return `/api/uploads/${id}.${ext}`;
  }
  async readPhoto(file: string) {
    if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(file)) return null;
    try { return await fs.readFile(path.join(UPLOADS, file)); } catch { return null; }
  }
}

/* ================================================================== */
/* Supabase repo: production (see supabase/schema.sql)                 */
/* ================================================================== */

type NestRow = {
  slug: string; child_name: string; nest_name: string; avatar: Nest["avatar"]; photo_url: string | null;
  show_photo: boolean; note: string; parent_names: string; milestone: string | null; goal: number | null;
  picks: string[]; show_amounts: boolean; manage_token_hash: string | null; created_at: string;
};
type GiftRow = {
  id: string; nest_slug: string; giver: string; is_private: boolean; ticker: string; shares: number; usd: number;
  occasion: string; message: string; mode: Gift["mode"]; status: Gift["status"]; tx_hash: string | null; created_at: string;
};

const toNestRow = (n: NestRecord): NestRow => ({
  slug: n.slug, child_name: n.childName, nest_name: n.nestName, avatar: n.avatar, photo_url: n.photo ?? null,
  show_photo: n.showPhoto, note: n.note, parent_names: n.parentNames, milestone: n.milestone ?? null, goal: n.goal ?? null,
  picks: n.picks, show_amounts: n.showAmounts, manage_token_hash: n.manageTokenHash ?? null, created_at: n.createdAt,
});
const toGiftRow = (slug: string, g: Gift): GiftRow => ({
  id: g.id, nest_slug: slug, giver: g.from, is_private: g.isPrivate, ticker: g.ticker, shares: g.shares, usd: g.usd,
  occasion: g.occasion, message: g.message, mode: g.mode, status: g.status, tx_hash: g.txHash ?? null, created_at: g.createdAt,
});
const fromRows = (r: NestRow, gifts: GiftRow[]): NestRecord => ({
  slug: r.slug, childName: r.child_name, nestName: r.nest_name, avatar: r.avatar, photo: r.photo_url ?? undefined,
  showPhoto: r.show_photo, note: r.note, parentNames: r.parent_names, milestone: r.milestone ?? undefined,
  goal: r.goal ?? undefined, picks: r.picks, showAmounts: r.show_amounts, manageTokenHash: r.manage_token_hash ?? undefined,
  createdAt: r.created_at,
  gifts: gifts.map((g) => ({
    id: g.id, from: g.giver, isPrivate: g.is_private, ticker: g.ticker, shares: Number(g.shares), usd: Number(g.usd),
    occasion: g.occasion, message: g.message, mode: g.mode, status: g.status, txHash: g.tx_hash ?? undefined, createdAt: g.created_at,
  })),
});

class SupabaseRepo implements Repo {
  readonly kind = "supabase" as const;
  private seeded: Promise<void> | null = null;
  constructor(private db: SupabaseClient, private bucket: string) {}

  /** Make sure the example nests exist (first request only). */
  private ensureSeeded() {
    this.seeded ??= (async () => {
      const { data } = await this.db.from("nests").select("slug").in("slug", SEED_NESTS.map((n) => n.slug));
      const have = new Set((data ?? []).map((r) => r.slug));
      for (const n of SEED_NESTS.filter((x) => !have.has(x.slug))) {
        await this.db.from("nests").insert(toNestRow(n));
        if (n.gifts.length) await this.db.from("gifts").insert(n.gifts.map((g) => toGiftRow(n.slug, g)));
      }
    })().catch((e) => { this.seeded = null; throw e; });
    return this.seeded;
  }

  async getNest(slug: string) {
    await this.ensureSeeded();
    const { data: n, error } = await this.db.from("nests").select("*").eq("slug", slug).maybeSingle<NestRow>();
    if (error) throw error;
    if (!n) return null;
    const { data: gifts, error: e2 } = await this.db.from("gifts").select("*").eq("nest_slug", slug).order("created_at", { ascending: false });
    if (e2) throw e2;
    return fromRows(n, (gifts ?? []) as GiftRow[]);
  }
  async slugExists(slug: string) {
    const { count } = await this.db.from("nests").select("slug", { count: "exact", head: true }).eq("slug", slug);
    return (count ?? 0) > 0;
  }
  async createNest(nest: NestRecord) {
    const { error } = await this.db.from("nests").insert(toNestRow(nest));
    if (error) throw error;
  }
  async updateNest(slug: string, patch: Partial<Nest>) {
    const row: Partial<NestRow> = {};
    if (patch.nestName !== undefined) row.nest_name = patch.nestName;
    if (patch.note !== undefined) row.note = patch.note;
    if ("goal" in patch) row.goal = patch.goal ?? null;
    if (patch.picks) row.picks = patch.picks;
    if (patch.showAmounts !== undefined) row.show_amounts = patch.showAmounts;
    if (patch.showPhoto !== undefined) row.show_photo = patch.showPhoto;
    const { error } = await this.db.from("nests").update(row).eq("slug", slug);
    if (error) throw error;
  }
  async addGift(slug: string, gift: Gift) {
    const { error } = await this.db.from("gifts").insert(toGiftRow(slug, gift));
    if (error) throw error;
  }
  async savePhoto(id: string, bytes: Buffer, ext: "jpg" | "png" | "webp") {
    const file = `${id}.${ext}`;
    const { error } = await this.db.storage.from(this.bucket).upload(file, bytes, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: false });
    if (error) throw error;
    return this.db.storage.from(this.bucket).getPublicUrl(file).data.publicUrl;
  }
  async readPhoto() { return null; }
}

/* ================================================================== */

let repo: Repo | null = null;

export function getRepo(): Repo {
  if (repo) return repo;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  repo = url && key
    ? new SupabaseRepo(createClient(url, key, { auth: { persistSession: false } }), process.env.SUPABASE_PHOTO_BUCKET || "child-photos")
    : new FileRepo();
  return repo;
}
