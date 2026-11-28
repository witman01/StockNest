import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { RevealObserver } from "@/components/RevealObserver";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "StockNest: Give them stocks, not just presents",
  description: "A family stock-gifting platform on Base. Create a Stock Nest for your child and let family gift real tokenized stocks with a message.",
  icons: { icon: "/icon.svg?v=paper", apple: "/icon.svg?v=paper" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Scroll reveals only hide content when JS runs and the visitor hasn't asked for less motion. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if("IntersectionObserver"in window&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion")}catch(e){}` }} />
      </head>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <RevealObserver />
      </body>
    </html>
  );
}
