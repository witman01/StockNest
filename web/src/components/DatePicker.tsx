"use client";

import clsx from "clsx";
import { CalendarHeart, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

/** Dates are yyyy-mm-dd strings (UTC midnight), matching the nest's opensOn. */
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MAX_YEARS = 20; // the contract allows gifts to open up to 20 years ahead

export const prettyDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Next occurrence of a month/day strictly after today. */
function nextOf(month: number, day: number) {
  const t = todayIso();
  const y = new Date().getUTCFullYear();
  const a = iso(y, month, day);
  return a > t ? a : iso(y + 1, month, day);
}
function plusDays(days: number) {
  return new Date(Date.now() + days * 86400e3).toISOString().slice(0, 10);
}

/**
 * A friendly inline calendar: quick picks for common gift days, then a month grid.
 * Past days (and today) can't be picked.
 */
export function DatePicker({ value, onChange, label = "Gifts open on" }: { value: string; onChange: (d: string) => void; label?: string }) {
  const min = plusDays(1);
  const start = value || min;
  const [view, setView] = useState(() => ({ y: +start.slice(0, 4), m: +start.slice(5, 7) - 1 }));
  const [chooser, setChooser] = useState(false);
  const minY = +min.slice(0, 4), minM = +min.slice(5, 7) - 1;
  const years = Array.from({ length: MAX_YEARS }, (_, i) => minY + i);

  const quick = useMemo(() => [
    { t: "In a month", d: plusDays(30) },
    { t: "Christmas", d: nextOf(11, 25) },
    { t: "New Year", d: nextOf(0, 1) },
    { t: "In a year", d: plusDays(365) },
    { t: "In 5 years", d: plusDays(5 * 365 + 1) },
  ], []);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1));
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) out.push(iso(view.y, view.m, d));
    while (out.length % 7) out.push(null);
    return out;
  }, [view]);

  const monthName = new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  const canPrev = view.y * 12 + view.m > minY * 12 + minM;
  const canNext = view.y < minY + MAX_YEARS - 1 || view.m < 11;
  const shift = (n: number) => setView((v) => { const t = v.y * 12 + v.m + n; return { y: Math.floor(t / 12), m: t % 12 }; });
  const pick = (d: string) => { onChange(d); setView({ y: +d.slice(0, 4), m: +d.slice(5, 7) - 1 }); };
  const today = todayIso();

  return (
    <div className="rounded-2xl border border-line bg-paper p-3.5" role="group" aria-label={label}>
      <div className="flex flex-wrap gap-1.5">
        {quick.map((q) => (
          <button key={q.t} type="button" onClick={() => pick(q.d)} aria-pressed={value === q.d}
            className={clsx("rounded-full px-3 py-1.5 text-[13px] font-semibold transition", value === q.d ? "bg-forest text-white" : "bg-honey-soft text-ink hover:bg-honey")}>
            {q.t}
          </button>
        ))}
      </div>

      <div className="mt-3.5 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month"
          className="grid h-9 w-9 place-items-center rounded-full text-ink-2 transition hover:bg-sand disabled:opacity-30"><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => setChooser((c) => !c)} aria-expanded={chooser}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition hover:bg-sand">
          <b className="font-display text-[17px]">{monthName}</b>
          <ChevronDown size={16} className={clsx("text-ink-3 transition", chooser && "rotate-180")} />
        </button>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label="Next month"
          className="grid h-9 w-9 place-items-center rounded-full text-ink-2 transition hover:bg-sand disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>

      {chooser ? (
        <div className="mt-2">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">Year</p>
          <div className="grid max-h-[124px] grid-cols-5 gap-1.5 overflow-y-auto pr-1">
            {years.map((y) => (
              <button key={y} type="button" onClick={() => setView((v) => ({ y, m: y === minY && v.m < minM ? minM : v.m }))} aria-pressed={view.y === y}
                className={clsx("num h-9 rounded-xl text-[14px] font-semibold transition", view.y === y ? "bg-forest text-white" : "bg-sand text-ink hover:bg-forest-soft")}>{y}</button>
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wide text-ink-3">Month</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, m) => {
              const off = view.y === minY && m < minM;
              const name = new Date(Date.UTC(2000, m, 1)).toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
              return (
                <button key={m} type="button" disabled={off} onClick={() => { setView((v) => ({ ...v, m })); setChooser(false); }} aria-pressed={view.m === m}
                  className={clsx("h-9 rounded-xl text-[14px] font-semibold transition disabled:opacity-30", view.m === m ? "bg-forest text-white" : "bg-sand text-ink hover:bg-forest-soft")}>{name}</button>
              );
            })}
          </div>
        </div>
      ) : (<>

      <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wide text-ink-3">
        {WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const off = d < min;
          const on = d === value;
          return (
            <button key={d} type="button" disabled={off} onClick={() => pick(d)} aria-pressed={on} aria-label={prettyDay(d)}
              className={clsx("num mx-auto grid h-9 w-9 place-items-center rounded-full text-[14px] font-semibold transition",
                on ? "bg-forest text-white shadow-soft" : off ? "text-ink-3/40" : "text-ink hover:bg-forest-soft",
                d === today && !on && "ring-1 ring-line")}>
              {+d.slice(8)}
            </button>
          );
        })}
      </div>
      </>)}

      {value && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-forest-soft px-3 py-2.5 text-sm">
          <CalendarHeart size={16} className="shrink-0 text-forest" />
          <span>Gifts open <b>{prettyDay(value)}</b></span>
        </div>
      )}
    </div>
  );
}
