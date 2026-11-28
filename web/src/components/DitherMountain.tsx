"use client";

import { useEffect, useRef } from "react";
import { StockLogo } from "./StockLogo";

/** Stocks that bounce along the ridge: where they sit (0..1 across) and their little tag. */
const CHIPS = [
  { ticker: "TSLA", at: 0.2, tag: "+1.8%", speed: 1.15, phase: 0.0 },
  { ticker: "MSFT", at: 0.38, tag: "+0.9%", speed: 0.95, phase: 1.3 },
  { ticker: "AAPL", at: 0.55, tag: "+2.4%", speed: 1.25, phase: 2.1 },
  { ticker: "NVDA", at: 0.71, tag: "+3.1%", speed: 1.05, phase: 0.7 },
  { ticker: "AMZN", at: 0.86, tag: "+1.2%", speed: 1.35, phase: 2.8 },
];

/** Stable 0..1 noise per grid cell, so the dither doesn't flicker between frames. */
const hash = (i: number, j: number) => {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/**
 * The hero art: a dithered cornflower "mountain" whose ridge climbs like a long-run stock chart.
 * It plots itself in from left to right, then the columns keep rising and falling like live
 * prices while stock logos bounce along the top. Static for reduced-motion visitors.
 */
export function DitherMountain({ className, chips = true }: { className?: string; chips?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const chipEls = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const c = canvas.current!, box = wrap.current!;
    const g = c.getContext("2d")!;
    const still = !document.documentElement.classList.contains("motion");
    const t0 = performance.now();
    let w = 0, h = 0, step = 6, raf = 0, visible = true, last = 0;

    const ridge = (x: number) => { const t = x / w; return h * (0.94 - 0.8 * Math.pow(t, 1.25)) + Math.sin(t * 17) * h * 0.035 + Math.sin(t * 43) * h * 0.014; };
    const back = (x: number) => { const t = x / w; return h * (0.55 - 0.2 * Math.sin(t * 3 + 0.5)); };
    // live wiggle: neighbouring columns move together, like a price series ticking
    const wiggle = (x: number, t: number) => (Math.sin(t * 1.4 + x * 0.017) * 0.6 + Math.sin(t * 2.3 + x * 0.043) * 0.4) * h * 0.04;

    const size = () => {
      w = c.clientWidth; h = c.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = w * dpr; c.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      step = w < 640 ? 5 : 6;
    };

    const draw = (t: number, progress: number) => {
      g.clearRect(0, 0, w, h);
      const s = step - 1.5, head = progress * w;
      for (let x = 0, i = 0; x < w; x += step, i++) {
        if (x > head) break;
        const tx = x / w;
        const off = still ? 0 : Math.round(wiggle(x, t) / step) * step;
        const r1 = ridge(x) + off, r2 = back(x);
        const nearHead = progress < 1 && head - x < step * 6;
        for (let y = 0, j = 0; y < h; y += step, j++) {
          const n = hash(i, j), n2 = hash(j + 911, i + 37);
          if (y > r1) {
            const depth = Math.min(1, (y - r1) / (h * 0.45));
            if (n < 0.16 + 0.8 * tx * (0.35 + depth)) { g.fillStyle = nearHead ? "#1F4FD1" : n2 < 0.5 + tx * 0.45 ? "#548CFF" : "#B9CEFF"; g.fillRect(x, y, s, s); }
            else if (n2 < 0.55) { g.fillStyle = "#E4EBF8"; g.fillRect(x, y, s, s); }
          } else if (y > r1 - step * 1.1 && n < 0.75) {
            g.fillStyle = "#548CFF"; g.fillRect(x, y, s, s);
          } else if (y > r2 && tx < 0.8 && n < 0.4) {
            g.fillStyle = n2 < 0.18 ? "#C9D8F7" : "#EEF2F9"; g.fillRect(x, y, s, s);
          }
        }
      }
      // plot head while drawing in
      if (progress < 1) { g.fillStyle = "#050505"; g.fillRect(Math.floor(head / step) * step, ridge(head) - step * 2, step - 1.5, step - 1.5); }

      // stocks bouncing on the ridge
      CHIPS.forEach((chip, k) => {
        const el = chipEls.current[k];
        if (!el) return;
        const x = chip.at * w;
        const shown = progress >= chip.at;
        const off = still ? 0 : Math.round(wiggle(x, t) / step) * step;
        const ground = ridge(x) + off;
        const hop = still ? 0 : Math.abs(Math.sin(t * Math.PI * chip.speed * 0.5 + chip.phase)) * Math.min(34, h * 0.09);
        const squash = still ? 1 : hop < 3 ? 0.9 : 1;
        el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${ground - el.offsetHeight - 4 - hop}px) scale(${1 / squash}, ${squash})`;
        el.style.opacity = shown ? "1" : "0";
      });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || now - last < 33) return; // ~30fps is plenty for dots
      last = now;
      const t = (now - t0) / 1000;
      draw(t, Math.min(1, t / 1.6));
    };

    size();
    if (still) draw(0, 1); else raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(() => { size(); if (still) draw(0, 1); });
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(box);
    const onVis = () => { visible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return (
    <div ref={wrap} className={`relative ${className ?? ""}`} aria-hidden="true">
      <canvas ref={canvas} className="absolute inset-0 block h-full w-full" />
      {chips && CHIPS.map((chip, k) => (
        <div key={chip.ticker} ref={(el) => { chipEls.current[k] = el; }} className={`ridge-chip flex flex-col items-center gap-1 opacity-0 transition-opacity duration-300 ${k % 2 ? "max-sm:hidden!" : ""}`}>
          <span className="tag border border-ink bg-paper px-1.5 py-0.5 text-[#1F4FD1]">{chip.ticker} {chip.tag}</span>
          <StockLogo ticker={chip.ticker} size={34} className="border-ink! shadow-[0_6px_14px_rgba(31,79,209,.25)]" />
        </div>
      ))}
    </div>
  );
}
