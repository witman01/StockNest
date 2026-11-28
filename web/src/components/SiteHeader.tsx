import Link from "next/link";
import { DynamicIsland } from "./DynamicIsland";
import { Logo } from "./Logo";
import { NavMenu } from "./NavMenu";
import { NAV } from "./nav";
import { Button } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="relative mx-auto flex h-[64px] max-w-[1180px] items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="StockNest home"><Logo /></Link>
          <DynamicIsland className="hidden w-[300px]! xl:block" />
        </div>
        <div className="flex items-center gap-6">
          <NavMenu />
          <Button href="/create" size="sm" className="max-[380px]:px-3!">Start a nest <span className="arr">→</span></Button>
        </div>
      </div>
      <div className="flex justify-center px-4 pb-2.5 xl:hidden"><DynamicIsland /></div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line pb-10 pt-12 text-sm text-ink-3">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 md:grid-cols-[1.3fr_1fr_auto] md:px-8">
        <div>
          <Logo />
          <p className="mt-3 max-w-[320px] text-ink-2">Real stocks as gifts, built together by family. Every share keeps the name and note of who sent it.</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-ink-2">
          {[...NAV, { href: "/create", label: "Create a nest" }].map((n) => <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>)}
        </nav>
        <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 border border-line px-4 py-3 text-ink transition hover:border-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/base.svg" alt="" width={26} height={26} />
          <span className="leading-tight"><span className="mono-label block text-ink-3">Built on</span><b className="text-lg">Base</b></span>
        </a>
      </div>
      <div className="mono-label mx-auto mt-10 flex max-w-[1180px] flex-wrap justify-between gap-3 border-t border-line px-4 pt-6 text-ink-3 md:px-8">
        <span>Base Stocks Maxxing hackathon</span>
        <span>Prices by Chainlink · testnet · not for US persons</span>
      </div>
    </footer>
  );
}
