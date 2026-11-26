import clsx from "clsx";

/** Charcoal concept mark: a rising line resting in a nest, in sand and electric blue. */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#2F6BFF" />
      <path d="M9 23h22c-.9 6-5.2 9-11 9s-10.1-3-11-9Z" fill="#F4EEE2" />
      <path d="M11 19l5.5-5.5 4 3L28 9" stroke="#F4EEE2" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ className, size = 26, light = false }: { className?: string; size?: number; light?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className={clsx("text-[15px] font-bold tracking-[.16em]", light ? "text-white" : "text-ink")}>STOCKNEST</span>
    </span>
  );
}
