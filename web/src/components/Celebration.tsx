"use client";

import confetti from "canvas-confetti";
import { Check, Lock, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { LogoMark } from "./Logo";
import { Button, shareLink, useToast } from "./ui";

const COLORS = ["#548CFF", "#FFFFFF", "#B9CEFF", "#1F4FD1", "#050505", "#DCE7FF"];

type Props = {
  open: boolean;
  onClose: () => void;
  steps: [string, string, string];
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children?: React.ReactNode;
  shareUrl: string;
  shareTitle: string;
  shareLine: string;
  secondary: { label: string; href: string };
  /** A printed receipt shown at the top (nest created / gift sent). */
  receipt?: React.ReactNode;
};

export function Celebration({ open, onClose, steps, title, subtitle, children, shareUrl, shareTitle, shareLine, secondary, receipt }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast, toastNode } = useToast();

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let fire: confetti.CreateTypes | null = null;
    if (!reduce && canvasRef.current) {
      fire = confetti.create(canvasRef.current, { resize: true, useWorker: true });
      const base = { colors: COLORS, ticks: 320, gravity: 0.9, scalar: 1.1, shapes: ["square", "square", "circle"] as confetti.Shape[] };
      fire({ ...base, particleCount: 90, spread: 70, startVelocity: 48, origin: { x: 0.2, y: 0.25 }, angle: 60 });
      fire({ ...base, particleCount: 90, spread: 70, startVelocity: 48, origin: { x: 0.8, y: 0.25 }, angle: 120 });
      const end = Date.now() + 2600;
      const rain = () => {
        fire?.({ ...base, particleCount: 4, startVelocity: 0, spread: 180, origin: { x: Math.random(), y: -0.05 }, gravity: 0.6, drift: Math.random() - 0.5 });
        if (Date.now() < end) raf = requestAnimationFrame(rain);
      };
      raf = requestAnimationFrame(rain);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      fire?.reset();
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          role="dialog" aria-modal="true" aria-label="Celebration" data-theme="light"
          className="cel-in fixed inset-0 z-[100] overflow-y-auto text-ink"
          style={{ background: "radial-gradient(120% 80% at 50% 0%, #3D6FEA 0%, #1F4FD1 55%, #12348F 100%)" }}
        >
          <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[2] h-full w-full" />
          <button onClick={onClose} aria-label="Close" className="fixed right-3.5 top-3.5 z-[3] grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">
            <X size={22} />
          </button>

          <div className="cel-pop relative z-[1] mx-auto grid max-w-[460px] gap-3 px-4 pb-8 pt-14 sm:gap-4">
            {receipt ? <div className="pb-2">{receipt}</div> : (
              <div className="grid place-items-center rounded-[6px] bg-white p-3.5 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
                <span className="flex items-center gap-2.5 text-xl font-semibold tracking-[-.02em]"><LogoMark size={30} /><span>StockNest</span></span>
              </div>
            )}

            <div className="rounded-[6px] bg-white px-5 pb-6 pt-6 text-center sm:px-6 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
              <div className="relative mx-auto mb-1.5 flex max-w-[300px] justify-between">
                <div className="absolute left-[16%] right-[16%] top-[17px] h-[3px] rounded bg-forest" />
                {steps.map((s, i) => (
                  <div key={s} className="cel-step relative grid w-1/3 justify-items-center gap-2 text-sm font-semibold text-ink-2" style={{ animationDelay: `${0.3 + i * 0.15}s` }}>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-white ring-[5px] ring-white"><Check size={16} strokeWidth={3} /></span>
                    {s}
                  </div>
                ))}
              </div>
              <h2 className="font-display mb-2.5 mt-5 text-[34px] font-semibold leading-[1.05] sm:text-[42px]">{title}</h2>
              <p className="mx-auto max-w-[360px] text-base text-ink-2 sm:text-[17px]">{subtitle}</p>
              {children && <div className="mb-1 mt-4 text-left">{children}</div>}
              <p className="mb-2.5 mt-5">{shareLine}</p>
              <Button block onClick={() => shareLink(shareUrl, shareTitle, toast)}>Share link</Button>
              <Button variant="ghost" href={secondary.href} className="mt-2">{secondary.label}</Button>
            </div>

            <div className="flex items-center justify-center gap-2.5 rounded-[6px] bg-white p-5 text-[17px] text-ink-2 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
              Powered by <b className="flex items-center gap-2 text-[19px] text-ink"><i className="inline-block h-5 w-5 rounded bg-onchain" />Base</b>
            </div>
            <div className="flex items-center justify-center gap-2 font-medium text-white/75"><Lock size={17} />Secured onchain</div>
          </div>
          {toastNode}
        </div>
      )}
    </>
  );
}

/** Step-by-step tracker that ticks as each state confirms. */
export function DeliveryTracker({ rows, doneCount }: { rows: { label: string; meta: string }[]; doneCount: number }) {
  return (
    <div>
      {rows.map((r, i) => {
        const done = i < doneCount;
        return (
          <div key={r.label} className={`flex items-center gap-3 py-2.5 text-[15px] font-semibold transition-colors ${done ? "text-ink" : "text-ink-3"}`}>
            <span className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-2 transition-all duration-300 ${done ? "border-forest bg-forest text-white" : "border-line"}`}>
              {done ? <Check size={13} strokeWidth={3} /> : i === doneCount ? <span className="h-2 w-2 animate-pulse rounded-full bg-honey" /> : null}
            </span>
            {r.label}
            <small className="num ml-auto text-[13px] font-medium text-ink-3">{r.meta}</small>
          </div>
        );
      })}
    </div>
  );
}
