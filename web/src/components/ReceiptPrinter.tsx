"use client";

import { useMemo } from "react";

export type ReceiptRow = [label: string, value: string];

/** Barcode bars from a seed string, so each receipt gets its own pattern. */
function bars(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: 46 }, (_, i) => { h = Math.imul(h ^ (h >>> 13), 1274126177) + i; return 1 + ((h >>> 0) % 3); });
}
const short = (h: string) => (h.length > 14 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h);

/**
 * A little receipt printer: the head shuttles, the light blinks, and a paper receipt
 * feeds out line by line, then gets stamped. Used when a nest is created and when a gift is sent.
 */
export function ReceiptPrinter({ kicker, amount, rows, stamp, tx, footer }: {
  kicker: string; amount: string; rows: ReceiptRow[]; stamp: string; tx?: string; footer?: string;
}) {
  const now = useMemo(() => new Date().toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), []);
  const code = useMemo(() => bars(tx || kicker + amount), [tx, kicker, amount]);

  return (
    <div className="mx-auto w-full max-w-[360px]" aria-label={`Receipt: ${kicker}, ${amount}`} role="img">
      {/* printer */}
      <div className="relative z-[2] mx-auto w-full">
        <div className="mx-auto h-3 w-[76%] rounded-t-[6px] bg-[#16181D]" />
        <div className="rounded-[6px] bg-[#050505] px-4 pb-3.5 pt-3 shadow-[0_12px_30px_rgba(0,0,0,.35)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-white/45">StockNest · Print</span>
            <span className="printer-led h-2.5 w-2.5 rounded-full bg-[#548CFF]" />
          </div>
          <div className="mt-2.5 rounded-[4px] border border-white/10 bg-[#0E1015] px-3 py-3">
            <div className="relative h-5">
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
              <div className="printer-head absolute top-0 h-5 w-9 rounded-[3px] border border-white/20 bg-[#1B1E26]">
                <span className="absolute -bottom-2 left-1/2 h-2 w-px -translate-x-1/2 bg-[#548CFF]" />
              </div>
            </div>
            <div className="mt-2.5 h-[3px] rounded-full bg-[#1F4FD1]/70" />
          </div>
        </div>
        <div className="mx-auto -mt-1 h-2 w-[88%] rounded-b-[2px] bg-black" />
      </div>

      {/* paper, fed out of the slot */}
      <div className="relative mx-auto -mt-1 w-[86%] overflow-hidden">
        <div className="receipt-feed relative bg-white px-5 pb-7 pt-5 text-ink shadow-[0_14px_28px_rgba(5,5,5,.18)]"
          style={{ clipPath: "polygon(0 0,100% 0,100% calc(100% - 8px),95% 100%,90% calc(100% - 8px),85% 100%,80% calc(100% - 8px),75% 100%,70% calc(100% - 8px),65% 100%,60% calc(100% - 8px),55% 100%,50% calc(100% - 8px),45% 100%,40% calc(100% - 8px),35% 100%,30% calc(100% - 8px),25% 100%,20% calc(100% - 8px),15% 100%,10% calc(100% - 8px),5% 100%,0 calc(100% - 8px))" }}>
          <div className="flex items-center justify-between">
            <b className="text-[17px] font-semibold tracking-[-.02em]">StockNest</b>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-ink-3">Receipt</span>
          </div>
          <div className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-[#1F4FD1]">{kicker}</div>
          <div className="num mt-1 text-[30px] font-semibold leading-tight tracking-[-.03em]">{amount}</div>
          <div className="my-3 border-t border-dashed border-[#CDD2DC]" />
          <dl className="grid gap-1.5 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-ink-3">{k}</dt>
                <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="my-3 border-t border-dashed border-[#CDD2DC]" />
          <div className="flex items-center justify-between font-mono text-[10px] text-ink-3">
            <span>{now}</span>{tx && <span>{short(tx)}</span>}
          </div>
          <div className="mt-3 flex h-9 items-stretch gap-[1.5px]" aria-hidden>
            {code.map((w, i) => <i key={i} className="bg-ink" style={{ width: w }} />)}
          </div>
          {footer && <p className="mt-2.5 text-center font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-3">{footer}</p>}

          <div className="receipt-stamp absolute bottom-7 right-3 grid h-[70px] w-[70px] place-items-center rounded-full border-[2.5px] border-[#1F4FD1] text-center font-mono text-[11px] font-bold uppercase leading-tight tracking-[.08em] text-[#1F4FD1]">
            <span>{stamp}<br />✓</span>
          </div>
        </div>
      </div>
    </div>
  );
}
