"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StockLogo } from "./StockLogo";
import { STOCKS, stockBy } from "@/lib/stocks";
import { usePrices } from "@/lib/usePrices";

/**
 * A "dynamic island" style stock ticker. A black pill cycles through stocks
 * with rolling digits and a sparkline, and tapping it morphs it into a price
 * board with a spring animation. Prices are live Chainlink feeds on Base.
 */

const LIST = STOCKS.map((s) => s.ticker);
const UP = "#4ADE80";
const DOWN = "#F87171";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Roll({ value }: { value: string }) {
  return (
    <span className="num inline-flex leading-none" aria-label={value}>
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} aria-hidden className="relative inline-block h-[1.15em] w-[1ch] overflow-hidden">
            <span className="roll-col absolute left-0 top-0 flex flex-col" style={{ transform: `translateY(-${Number(ch) * 1.15}em)` }}>
              {"0123456789".split("").map((d) => <span key={d} className="block h-[1.15em] leading-[1.15em]">{d}</span>)}
            </span>
          </span>
        ) : <span key={i} aria-hidden className="leading-[1.15em]">{ch}</span>,
      )}
    </span>
  );
}

function Spark({ data, w = 46, h = 18 }: { data: number[]; w?: number; h?: number }) {
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * (h - 2) - 1}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  const id = `sg-${w}-${up ? "u" : "d"}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible" aria-hidden>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={up ? UP : DOWN} stopOpacity=".35" /><stop offset="1" stopColor={up ? UP : DOWN} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={up ? UP : DOWN} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Change({ data, className = "" }: { data: number[]; className?: string }) {
  const chg = (data[data.length - 1] / data[0] - 1) * 100;
  const up = chg >= 0;
  return <span className={`num font-bold ${className}`} style={{ color: up ? UP : DOWN }}>{up ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}%</span>;
}

export function DynamicIsland({ className = "" }: { className?: string }) {
  const book = usePrices();
  const hist: Record<string, number[]> = Object.fromEntries(LIST.map((t) => [t, book.prices[t]?.history ?? [0, 0]]));
  const anyLive = LIST.some((t) => book.prices[t]?.live);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // cycle the compact pill
  useEffect(() => {
    if (open) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % LIST.length), 3600);
    return () => clearInterval(id);
  }, [open]);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const t = LIST[idx];
  const data = hist[t];
  const compactW = 258 + t.length * 9;

  return (
    <div ref={ref} className={`relative h-11 w-[340px] max-w-full ${className}`}>
      <motion.div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={open ? "Stock prices" : `${stockBy(t).name} ${fmt(data[data.length - 1])}. Show all prices`}
        onClick={() => !open && setOpen(true)}
        onKeyDown={(e) => { if (!open && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); } }}
        className="absolute left-1/2 top-0 z-50 cursor-pointer overflow-hidden bg-[#050505] text-white shadow-[0_10px_30px_rgba(31,79,209,.25),inset_0_0_0_1px_rgba(255,255,255,.12)] outline-none focus-visible:ring-2 focus-visible:ring-[#548CFF]"
        style={{ x: "-50%" }}
        initial={false}
        animate={open ? { width: 340, height: 372, borderRadius: 28 } : { width: compactW, height: 44, borderRadius: 22 }}
        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.9 }}
      >
        {/* liquid sheen around the edge */}
        <span className="island-sheen pointer-events-none absolute inset-0 rounded-[inherit]" />

        <AnimatePresence initial={false} mode="popLayout">
          {!open ? (
            <motion.div
              key={`c-${t}`}
              className="relative flex h-11 items-center gap-2.5 whitespace-nowrap pl-1.5 pr-4"
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
              transition={{ duration: 0.35 }}
            >
              <StockLogo ticker={t} size={32} className="border-0" />
              <b className="font-mono text-[13px] tracking-[.06em]">{t}</b>
              <Spark data={data} />
              <span className="text-sm font-semibold"><Roll value={fmt(data[data.length - 1])} /></span>
              <Change data={data} className="text-xs" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              className="relative p-4"
              initial={{ opacity: 0, filter: "blur(8px)", scale: 0.96 }}
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, filter: "blur(8px)", scale: 0.96 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[.1em]"><span className={`h-2 w-2 rounded-full ${anyLive ? "animate-pulse" : ""}`} style={{ background: anyLive ? UP : "#9CA3AF" }} />{anyLive ? "Live prices" : "Market closed"}</span>
                <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-label="Close prices" className="grid h-7 w-7 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X size={15} /></button>
              </div>
              {LIST.map((tk) => (
                <div key={tk} className="flex items-center gap-2.5 py-[5px]">
                  <StockLogo ticker={tk} size={28} className="border-0" />
                  <div className="min-w-0 flex-1 leading-tight"><b className="block text-[13px]">{stockBy(tk).name}</b><span className="text-[11px] text-white/50">{tk}</span></div>
                  <Spark data={hist[tk]} w={52} h={20} />
                  <div className="w-[78px] text-right leading-tight">
                    <span className="block text-[13px] font-semibold"><Roll value={fmt(hist[tk][hist[tk].length - 1])} /></span>
                    <Change data={hist[tk]} className="text-[11px]" />
                  </div>
                </div>
              ))}
              <p className="mt-1.5 text-center text-[11px] text-white/40">
                {book.source === "chainlink" ? (anyLive ? "Live Chainlink prices on Base. Change over recent updates." : "Market closed. Last Chainlink prices on Base.") : "Loading live prices…"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
