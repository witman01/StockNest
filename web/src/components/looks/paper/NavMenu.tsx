"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "./nav";


/** Desktop links + a full-width drop-down on phones. */
export function NavMenu() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <nav className="hidden items-center gap-7 text-[14px] text-ink-2 md:flex" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={clsx("transition hover:text-ink", path === n.href && "text-ink")}>{n.label}</Link>
        ))}
      </nav>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}
        className="grid h-10 w-10 place-items-center border border-line text-ink md:hidden">
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-line bg-paper md:hidden">
          <nav className="mx-auto grid max-w-[1180px] px-4" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center justify-between border-b border-line py-4 text-[15px] font-medium last:border-0">
                {n.label}<span className="mono-label text-forest">→</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
