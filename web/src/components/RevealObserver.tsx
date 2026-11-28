"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Adds .in to every .reveal as it scrolls into view (see globals.css). Re-scans on navigation. */
export function RevealObserver() {
  const path = usePathname();
  useEffect(() => {
    if (!document.documentElement.classList.contains("motion")) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    const scan = () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [path]);
  return null;
}
