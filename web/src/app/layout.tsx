import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"], style: ["normal", "italic"] });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "StockNest: Give them stocks, not just presents",
  description: "A family stock-gifting platform on Base. Create a Stock Nest for your child and let family gift real tokenized stocks with a message.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${fraunces.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint (default: dark). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("stocknest.theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}` }} />
      </head>
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
