"use client";

import type { Gift, GiftMode, Nest } from "./nests";

/* ---------------- owner keys (this browser's nests) ---------------- */

const OWNER_KEY = "stocknest.owner.v1";
export type Owned = Record<string, string>; // slug -> manage key

export function getOwned(): Owned {
  try { return JSON.parse(localStorage.getItem(OWNER_KEY) || "{}") as Owned; } catch { return {}; }
}
export function saveOwned(slug: string, token: string) {
  try { localStorage.setItem(OWNER_KEY, JSON.stringify({ ...getOwned(), [slug]: token })); } catch { /* storage blocked */ }
}

/* ---------------- API calls ---------------- */

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}
const json = (method: string, body: unknown, token?: string): RequestInit => ({
  method,
  headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});

export async function uploadPhoto(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const { url } = await call<{ url: string }>("/api/uploads", { method: "POST", headers: { "content-type": blob.type }, body: blob });
  return url;
}

export type CreateNestBody = {
  childName: string; nestName?: string; avatar: Nest["avatar"]; photo?: string; showPhoto: boolean;
  note: string; parentNames: string; goal?: number; picks: string[]; showAmounts: boolean;
  opensOn?: string; acceptWindow?: number;
};
export const createNest = (body: CreateNestBody) => call<{ slug: string; manageToken: string }>("/api/nests", json("POST", body));

export type GiftBody = { mode: GiftMode; ticker: string; usd?: number; shares?: number; from: string; isPrivate: boolean; occasion: string; message: string; txHash?: string };
export const sendGift = (slug: string, body: GiftBody) => call<{ gift: Gift }>(`/api/nests/${encodeURIComponent(slug)}/gifts`, json("POST", body));
/** Refresh an escrow gift from the chain after a claim or refund (txHash links the receipt). */
export const syncGift = (slug: string, id: string, txHash?: string) =>
  call<{ gift: Gift }>(`/api/nests/${encodeURIComponent(slug)}/gifts/${encodeURIComponent(id)}/sync`, json("POST", { txHash }));

export const fetchMyNests = (owned: Owned) => call<{ nests: Nest[] }>("/api/parent/nests", json("POST", { owned }));
export const fetchExampleNests = () => call<{ nests: Nest[] }>("/api/parent/nests", json("POST", { example: true }));

export type NestPatch = Partial<Pick<Nest, "nestName" | "note" | "picks" | "showAmounts" | "showPhoto">> & { goal?: number | null };
export const updateNest = (slug: string, token: string, patch: NestPatch) =>
  call<{ ok: true }>(`/api/nests/${encodeURIComponent(slug)}`, json("PATCH", patch, token));
