import Link from "next/link";
import { Logo } from "./Logo";
import { NavMenu } from "./NavMenu";
import { NAV } from "./nav";
import { Button } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40">
      <Link href="/create" className="block bg-forest px-4 py-2 text-center text-[12.5px] text-white">
        <span className="mr-2 rounded-full border border-white/70 px-1.5 py-px text-[10px] font-bold tracking-[.06em]">NEW</span>
        StockNest is live on Base Sepolia. Start a nest in a minute →
      </Link>
      <div className="border-b border-line bg-cream/90 backdrop-blur-md">
        <div className="relative mx-auto flex h-[64px] max-w-[1180px] items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/" aria-label="StockNest home"><Logo /></Link>
          <div className="flex items-center gap-5">
            <NavMenu />
            <Button href="/create" size="sm" className="max-[380px]:px-3!">Start a nest</Button>
          </div>
        </div>
      </div>
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
        <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-ink transition hover:border-ink-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/base.svg" alt="" width={26} height={26} />
          <span className="leading-tight"><span className="block text-xs text-ink-3">Built on</span><b className="text-lg">Base</b></span>
        </a>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1180px] flex-wrap justify-between gap-3 border-t border-line px-4 pt-6 text-xs md:px-8">
        <span>Made for the Base Stocks Maxxing hackathon</span>
        <span>Live prices from Chainlink on Base. Testnet. Not available to US persons.</span>
      </div>
    </footer>
  );
}
