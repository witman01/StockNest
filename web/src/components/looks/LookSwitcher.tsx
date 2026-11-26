"use client";

import clsx from "clsx";
import { Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LOOK_KEY } from "./boot";

export const LOOKS = [
  { id: "original", label: "Original", dot: "#0C513F" },
  { id: "paper", label: "Paper", dot: "#548CFF" },
  { id: "charcoal", label: "Charcoal", dot: "#2F6BFF" },
] as const;
export type Look = (typeof LOOKS)[number]["id"];

/**
 * Slim bar above the site so friends can flip between the three designs.
 * It's styled the same in every look so it never blends in.
 */
export function LookSwitcher() {
  const [look, setLook] = useState<Look>("original");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setLook((document.documentElement.dataset.look as Look) || "original"); }, []);

  function pick(l: Look) {
    document.documentElement.dataset.look = l;
    try { localStorage.setItem(LOOK_KEY, l); } catch { /* private mode */ }
    setLook(l);
    window.dispatchEvent(new Event("resize")); // let canvases (the paper hero) redraw
  }
  async function copyLink() {
    const u = new URL(window.location.href);
    u.searchParams.set("look", look);
    try { await navigator.clipboard.writeText(u.toString()); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }

  return (
    <div className="relative z-50 bg-[#111111] text-[#EDEDED]" style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }}>
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-1.5 sm:justify-between md:px-8">
        <span className="text-[12.5px] text-[#A8A8A8]">Help us pick a look for StockNest:</span>
        <div className="flex items-center gap-1.5">
          <div role="radiogroup" aria-label="Site design" className="flex rounded-full bg-white/10 p-[3px]">
            {LOOKS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={look === l.id} onClick={() => pick(l.id)}
                className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition",
                  look === l.id ? "bg-white text-[#111]" : "text-[#CFCFCF] hover:text-white")}>
                <i className="h-2 w-2 rounded-full" style={{ background: l.dot }} />{l.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={copyLink} aria-label="Copy a link to this look"
            className="grid h-[30px] w-[30px] place-items-center rounded-full bg-white/10 text-[#CFCFCF] transition hover:text-white" title="Copy a link to this look">
            {copied ? <Check size={14} /> : <Link2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
