"use client";

import { useEffect, useRef } from "react";

/**
 * The paper hero's art: a dithered dot "mountain" in cornflower blue whose ridge
 * climbs like a long-run stock chart. Drawn to canvas, redrawn on resize.
 */
export function DitherMountain({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const draw = () => {
      const w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = w * dpr; c.height = h * dpr;
      const g = c.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const step = w < 640 ? 5 : 6, s = step - 1.5;
      let seed = 11;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const ridge = (x: number) => { const t = x / w; return h * (0.97 - 0.86 * Math.pow(t, 1.25)) + Math.sin(t * 17) * h * 0.04 + Math.sin(t * 43) * h * 0.016; };
      const back = (x: number) => { const t = x / w; return h * (0.55 - 0.22 * Math.sin(t * 3 + 0.5)); };
      for (let x = 0; x < w; x += step) {
        const r1 = ridge(x), r2 = back(x), t = x / w;
        for (let y = 0; y < h; y += step) {
          if (y > r1) {
            const depth = Math.min(1, (y - r1) / (h * 0.45));
            const dens = 0.16 + 0.8 * t * (0.35 + depth);
            if (rnd() < dens) { g.fillStyle = rnd() < 0.5 + t * 0.45 ? "#548CFF" : "#B9CEFF"; g.fillRect(x, y, s, s); }
            else if (rnd() < 0.55) { g.fillStyle = "#E4EBF8"; g.fillRect(x, y, s, s); }
          } else if (Math.abs(y - r1) < step * 1.1 && rnd() < 0.7) {
            g.fillStyle = "#548CFF"; g.fillRect(x, y, s, s);
          } else if (y > r2 && t < 0.8 && rnd() < 0.4) {
            g.fillStyle = rnd() < 0.18 ? "#C9D8F7" : "#EEF2F9"; g.fillRect(x, y, s, s);
          }
        }
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
