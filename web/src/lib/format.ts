export const usd = (n: number, digits = 0) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const shares = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 });

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export const slugify = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "nest";

export const firstName = (s: string) => s.trim().split(/\s+/)[0] ?? s;
