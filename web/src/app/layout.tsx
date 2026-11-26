import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Instrument_Serif, Inter_Tight, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteHeader as PaperHeader } from "@/components/looks/paper/SiteHeader";
import { SiteHeader as CharcoalHeader } from "@/components/looks/charcoal/SiteHeader";
import { LookSwitcher } from "@/components/looks/LookSwitcher";
import { LOOK_BOOT } from "@/components/looks/boot";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"], style: ["normal", "italic"] });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
// Fonts for the alternative looks: only fetched when a look uses them.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", preload: false });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", preload: false });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", preload: false });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", preload: false });
const fontVars = [fraunces, jakarta, geist, geistMono, interTight, instrument].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "StockNest: Give them stocks, not just presents",
  description: "A family stock-gifting platform on Base. Create a Stock Nest for your child and let family gift real tokenized stocks with a message.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" data-look="original" className={fontVars} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme and look before paint (default: dark, original). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("stocknest.theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}` + LOOK_BOOT }} />
      </head>
      <body>
        <LookSwitcher />
        <div className="only-original"><SiteHeader /></div>
        <div className="only-paper"><PaperHeader /></div>
        <div className="only-charcoal"><CharcoalHeader /></div>
        <main>{children}</main>
      </body>
    </html>
  );
}
