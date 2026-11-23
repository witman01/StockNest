import Link from "next/link";
import { DynamicIsland } from "./DynamicIsland";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-[72px] max-w-[1160px] items-center justify-between gap-3 px-4 md:px-8">
        <Link href="/" aria-label="StockNest home"><Logo /></Link>
        <div className="absolute left-1/2 top-[14px] hidden -translate-x-1/2 lg:block"><DynamicIsland /></div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="hidden px-2 font-medium text-ink-2 hover:text-ink xl:block">For parents</Link>
          <ThemeToggle />
          <Button href="/create" size="sm" className="max-[380px]:px-3.5! max-[380px]:text-[14px]!"><span className="hidden sm:inline">Create a Stock Nest</span><span className="sm:hidden">Start a Nest</span></Button>
        </div>
      </div>
      <div className="flex justify-center px-4 pb-2.5 lg:hidden"><DynamicIsland /></div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line pb-10 pt-10 text-sm text-ink-3">
      <div className="mx-auto grid max-w-[1160px] gap-8 px-4 md:grid-cols-[1.2fr_1fr_auto] md:items-start md:px-8">
        <div>
          <Logo size={30} />
          <p className="mt-3 max-w-[300px] text-ink-2">Give today. Grow tomorrow. Real stocks as gifts, built together by family.</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-6 gap-y-2.5 font-medium text-ink-2">
          <Link href="/#how" className="hover:text-ink">How it works</Link>
          <Link href="/n/amelia" className="hover:text-ink">Example nest</Link>
          <Link href="/#base" className="hover:text-ink">Why Base</Link>
          <Link href="/dashboard" className="hover:text-ink">For parents</Link>
          <Link href="/create" className="hover:text-ink">Create a nest</Link>
        </nav>
        <a href="https://base.org" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-ink transition hover:border-ink-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/base.svg" alt="" width={30} height={30} />
          <span className="leading-tight"><span className="block text-xs text-ink-3">Built on</span><b className="text-lg">Base</b></span>
        </a>
      </div>
      <div className="mx-auto mt-8 flex max-w-[1160px] flex-wrap justify-between gap-2 border-t border-line px-4 pt-6 text-xs md:px-8">
        <span>Made for the Base Stocks Maxxing hackathon</span>
        <span>Live prices from Chainlink on Base. Stock purchases are simulated on testnet. Not available to US persons.</span>
      </div>
    </footer>
  );
}
