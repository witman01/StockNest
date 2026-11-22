import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Nest ownership (pre-wallet): when a parent creates a nest they get a secret
 * "manage key". Only its SHA-256 hash is stored. The key lives in the parent's
 * browser and unlocks the parent dashboard. Wallet sign-in replaces this later.
 */
export const newManageToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function tokenMatches(token: string | null | undefined, hash: string | undefined) {
  if (!token || !hash) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function bearer(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}
