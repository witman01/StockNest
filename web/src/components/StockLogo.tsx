/* eslint-disable @next/next/no-img-element */
import clsx from "clsx";
import { stockBy } from "@/lib/stocks";

export function StockLogo({ ticker, size = 44, className }: { ticker: string; size?: number; className?: string }) {
  const s = stockBy(ticker);
  const isIndex = false;
  return (
    <span
      className={clsx("grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-white", className)}
      style={{ width: size, height: size }}
      title={`${s.name} (${s.ticker})`}
    >
      <img
        src={s.logo}
        alt={`${s.name} logo`}
        width={isIndex ? size : Math.round(size * 0.52)}
        height={isIndex ? size : Math.round(size * 0.52)}
        className={isIndex ? "h-full w-full" : ""}
      />
    </span>
  );
}
