import clsx from "clsx";

/**
 * StockNest mark: a woven nest cradling a "share", a honey pie with one
 * slice lifted out, meaning "a piece of a company, held safely for a child".
 */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#0C513F" />
      {/* the share: 3/4 pie */}
      <path d="M19.5 18.5 L27.5 18.5 A8 8 0 1 1 19.5 10.5 Z" fill="#F2B34A" />
      {/* lifted slice */}
      <path d="M21.6 16.4 V8.6 A7.8 7.8 0 0 1 29.4 16.4 Z" fill="#FCEFD3" />
      {/* nest */}
      <path d="M6.5 22.5 H33.5 C32.6 30.4 27.2 34.5 20 34.5 S7.4 30.4 6.5 22.5 Z" fill="#FBF7F0" />
      <path d="M10 26.5 H30 M13.5 30.5 H26.5" stroke="#0C513F" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, size = 36, light = false }: { className?: string; size?: number; light?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className={clsx("font-display text-[22px] font-bold tracking-tight", light ? "text-white" : "text-ink")}>
        Stock<span className={light ? "text-honey" : "text-forest"}>Nest</span>
      </span>
    </span>
  );
}
