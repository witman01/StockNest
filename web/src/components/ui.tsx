"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { GiftStatus } from "@/lib/nests";
import { stockBy } from "@/lib/stocks";

type BtnProps = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  block?: boolean;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({ variant = "primary", size = "md", block, href, className, children, ...rest }: BtnProps) {
  const cls = clsx(
    "btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-mono font-semibold uppercase tracking-[.06em] transition duration-200 ease-[var(--ease-nest)] active:translate-y-px disabled:cursor-not-allowed disabled:border-line disabled:bg-sand disabled:text-ink-3",
    size === "md" ? "h-[50px] px-6 text-[13px]" : "h-[40px] px-4 text-[12px]",
    variant === "primary" && "border border-forest bg-forest text-white hover:border-ink hover:bg-ink",
    variant === "secondary" && "border border-ink bg-paper text-ink hover:bg-forest-soft",
    variant === "ghost" && "h-11! border-0 px-2! text-forest hover:underline",
    block && "w-full",
    className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-[var(--radius-card)] border border-line bg-paper p-6", className)}>{children}</div>;
}

const chipTones = {
  forest: "bg-forest-soft text-forest",
  honey: "bg-honey-soft text-[var(--honey-ink)]",
  pending: "bg-honey-soft text-pending",
  sand: "bg-sand text-ink-2",
  error: "bg-error-soft text-error",
  base: "bg-onchain-soft text-onchain",
};
export function Chip({ tone = "sand", xs, className, children }: { tone?: keyof typeof chipTones; xs?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold", xs ? "px-2 py-px text-xs" : "px-3 py-1 text-[13px]", chipTones[tone], className)}>
      {tone === "base" && <i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-onchain" />}
      {children}
    </span>
  );
}

const STATUS: Record<GiftStatus, { label: string; tone: keyof typeof chipTones }> = {
  pending: { label: "Wrapped", tone: "honey" },
  usdc_received: { label: "USDC received", tone: "sand" },
  buying: { label: "Buying stock", tone: "pending" },
  delivered: { label: "Delivered", tone: "forest" },
  returned: { label: "Returned", tone: "error" },
  failed: { label: "Failed", tone: "error" },
};
export function StatusChip({ status }: { status: GiftStatus }) {
  const s = STATUS[status];
  return <Chip tone={s.tone} xs>{s.label}</Chip>;
}

export function ProgressRing({ pct, size = 120, label }: { pct: number; size?: number; label?: string }) {
  const r = 52, c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setShown(pct)); return () => cancelAnimationFrame(t); }, [pct]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-sand)" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-forest)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown)} style={{ transition: "stroke-dashoffset 1.2s var(--ease-nest)" }} />
      </svg>
      <div className="num absolute inset-0 grid place-items-center font-display text-2xl font-bold">{label ?? `${Math.round(pct * 100)}%`}</div>
    </div>
  );
}

/** Part-to-whole bar. Colors follow the stock (fixed palette slot); hover shows a label. */
export function AllocationBar({ holdings, className, showValues = true }: { holdings: { ticker: string; usd: number }[]; className?: string; showValues?: boolean }) {
  const total = holdings.reduce((s, h) => s + h.usd, 0) || 1;
  const [hover, setHover] = useState<number | null>(null);
  let left = 0;
  const segs = holdings.map((h) => { const w = (h.usd / total) * 100; const s = { ...h, w, left }; left += w; return s; });
  const active = hover !== null ? segs[hover] : null;
  return (
    <div className={clsx("relative", className)} onMouseLeave={() => setHover(null)}>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-sand" role="img"
        aria-label={segs.map((s) => `${stockBy(s.ticker).name} ${Math.round(s.w)}%`).join(", ")}>
        {segs.map((s, i) => (
          <i key={s.ticker} onMouseEnter={() => setHover(i)}
            className={clsx("block h-full transition-opacity", hover !== null && hover !== i && "opacity-40")}
            style={{ width: `${s.w}%`, background: stockBy(s.ticker).color }} />
        ))}
      </div>
      {active && (
        <div className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-cream shadow-float"
          style={{ left: `${Math.min(88, Math.max(12, active.left + active.w / 2))}%` }}>
          {stockBy(active.ticker).name}: {Math.round(active.w)}%{showValues && active.usd > 0 ? `, $${Math.round(active.usd).toLocaleString("en-US")}` : ""}
        </div>
      )}
    </div>
  );
}

/** Legend swatch: identity is carried by this dot plus the stock name/logo beside it. */
export function SeriesDot({ ticker }: { ticker: string }) {
  return <i className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stockBy(ticker).color }} aria-hidden />;
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={clsx("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-forest" : "bg-line")}>
      <span className={clsx("absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-soft transition-all duration-200", on ? "left-[23px]" : "left-[3px]")} />
    </button>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2200); return () => clearTimeout(t); }, [msg]);
  const node = (
    <div className={clsx("fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream transition-transform duration-300", msg ? "translate-y-0" : "translate-y-[140px]")}>
      {msg}
    </div>
  );
  return { toast: setMsg, toastNode: node };
}

export async function shareLink(url: string, title: string, toast: (m: string) => void) {
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
  } catch { /* user cancelled */ return; }
  try { await navigator.clipboard.writeText(url); toast("Link copied, ready to share"); } catch { toast(url); }
}
