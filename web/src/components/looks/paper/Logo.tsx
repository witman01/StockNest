import clsx from "clsx";

/** Paper concept mark: an ink nest with a cornflower line climbing out of it. */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      <rect width="40" height="40" fill="#050505" />
      <path d="M9 22.5h22c-.9 6.2-5.2 9.5-11 9.5s-10.1-3.3-11-9.5Z" fill="#FFFFFF" />
      <path d="M11 18.5l5.5-5.5 4 3 7.5-8" stroke="#548CFF" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
    </svg>
  );
}

export function Logo({ className, size = 30, light = false }: { className?: string; size?: number; light?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className={clsx("text-[19px] font-semibold tracking-[-.02em]", light ? "text-white" : "text-ink")}>StockNest</span>
    </span>
  );
}
