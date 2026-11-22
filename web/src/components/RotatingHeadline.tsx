"use client";

import { useEffect, useState } from "react";

/** Plain-language lines that explain StockNest without any jargon. */
const LINES: [string, string][] = [
  ["Give them stocks,", "not just presents."],
  ["One link.", "The whole family gives."],
  ["Grandma picks Apple.", "Uncle picks NVIDIA."],
  ["Every gift is a real share,", "with a message."],
  ["Their first portfolio,", "built by family."],
];

const SHOW_MS = 2300;
const OUT_MS = 200;

export function RotatingHeadline() {
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t2: ReturnType<typeof setTimeout>;
    const t1 = setInterval(() => {
      setLeaving(true);
      t2 = setTimeout(() => { setI((n) => (n + 1) % LINES.length); setLeaving(false); }, OUT_MS);
    }, SHOW_MS);
    return () => { clearInterval(t1); clearTimeout(t2); };
  }, []);

  const [a, b] = LINES[i];
  let w = 0;
  const words = (text: string, green: boolean) =>
    text.split(" ").map((word) => {
      const n = w++;
      return (
        <span key={`${i}-${n}`} className={`hl-word ${leaving ? "hl-out" : "hl-in"} ${green ? "text-forest" : ""}`}
          style={{ animationDelay: `${(leaving ? n * 0.012 : n * 0.035)}s` }}>
          {word}&nbsp;
        </span>
      );
    });

  return (
    <h1 className="font-display text-[42px] font-semibold leading-[1.06] sm:text-[52px] lg:text-[62px]">
      <span className="sr-only">Give them stocks, not just presents.</span>
      <span aria-hidden className="block min-h-[3.2em] sm:min-h-[2.15em]">
        <span className="block">{words(a, false)}</span>
        <span className="block">{words(b, true)}</span>
      </span>
      <span aria-hidden className="mt-3 flex gap-1.5">
        {LINES.map((_, n) => (
          <span key={n} className={`h-1.5 rounded-full transition-all duration-500 ${n === i ? "w-8 bg-forest" : "w-1.5 bg-line"}`} />
        ))}
      </span>
    </h1>
  );
}
