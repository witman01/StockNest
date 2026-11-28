"use client";

import clsx from "clsx";
import { CalendarHeart, ChevronDown } from "lucide-react";
import { useMemo } from "react";

/** Dates are yyyy-mm-dd strings (UTC midnight), matching the nest's opensOn. */
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parts = (s: string) => ({ y: +s.slice(0, 4), m: +s.slice(5, 7) - 1, d: +s.slice(8, 10) });
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const MAX_YEARS = 20; // the contract allows gifts to open up to 20 years ahead
const MONTHS = Array.from({ length: 12 }, (_, m) => new Date(Date.UTC(2000, m, 1)).toLocaleDateString(undefined, { month: "long", timeZone: "UTC" }));

export const prettyDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const todayIso = () => new Date().toISOString().slice(0, 10);
function plusDays(days: number) { return new Date(Date.now() + days * 86400e3).toISOString().slice(0, 10); }
/** Next occurrence of a month/day strictly after today. */
function nextOf(month: number, day: number) {
  const t = todayIso(), y = new Date().getUTCFullYear();
  const a = iso(y, month, day);
  return a > t ? a : iso(y + 1, month, day);
}

/** A native select dressed as a square Paper field: on phones it opens the system wheel. */
function Field({ id, label, value, onChange, children, className }: { id: string; label: string; value: number; onChange: (v: number) => void; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={id} className={clsx("relative block", className)}>
      <span className="mono-label mb-1.5 block text-ink-3">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(+e.target.value)}
        className="num h-12 w-full cursor-pointer appearance-none rounded-[3px] border border-[#CDD2DC] bg-paper pl-3.5 pr-9 text-[15px] font-semibold text-ink outline-none transition hover:border-ink focus:border-ink focus:shadow-[0_0_0_3px_#D3E1FF]">
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute bottom-4 right-3 text-ink-3" />
    </label>
  );
}

/**
 * Pick the day gifts open: quick picks for common days, then Day / Month / Year.
 * Days before tomorrow and after 20 years can't be picked.
 */
export function DatePicker({ value, onChange, label = "Gifts open on" }: { value: string; onChange: (d: string) => void; label?: string }) {
  const min = plusDays(1);
  const max = useMemo(() => { const p = parts(min); return iso(p.y + MAX_YEARS - 1, 11, 31); }, [min]);
  const cur = parts(value || min);
  const lo = parts(min);

  const quick = useMemo(() => [
    { t: "In a month", d: plusDays(30) },
    { t: "Christmas", d: nextOf(11, 25) },
    { t: "New Year", d: nextOf(0, 1) },
    { t: "In a year", d: plusDays(365) },
    { t: "In 5 years", d: plusDays(5 * 365 + 1) },
  ], []);

  /** Change one part; keep the day valid for the month and the date inside [min, max]. */
  const set = (p: Partial<{ y: number; m: number; d: number }>) => {
    const y = p.y ?? cur.y, m = p.m ?? cur.m;
    const d = Math.min(p.d ?? cur.d, daysIn(y, m));
    let next = iso(y, m, d);
    if (next < min) next = min;
    if (next > max) next = max;
    onChange(next);
  };

  const years = Array.from({ length: MAX_YEARS }, (_, i) => lo.y + i);

  return (
    <div className="border border-line bg-paper p-3.5" role="group" aria-label={label}>
      <div className="flex flex-wrap gap-1.5">
        {quick.map((q) => (
          <button key={q.t} type="button" onClick={() => onChange(q.d)} aria-pressed={value === q.d}
            className={clsx("border px-3 py-1.5 text-[13px] font-semibold transition", value === q.d ? "border-ink bg-ink text-white" : "border-line bg-paper text-ink hover:border-ink")}>
            {q.t}
          </button>
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
        <Field id="opens-day" label="Day" value={cur.d} onChange={(d) => set({ d })}>
          {Array.from({ length: daysIn(cur.y, cur.m) }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d} disabled={iso(cur.y, cur.m, d) < min}>{d}</option>
          ))}
        </Field>
        <Field id="opens-month" label="Month" value={cur.m} onChange={(m) => set({ m })}>
          {MONTHS.map((name, m) => (
            <option key={m} value={m} disabled={cur.y === lo.y && m < lo.m}>{name}</option>
          ))}
        </Field>
        <Field id="opens-year" label="Year" value={cur.y} onChange={(y) => set({ y })}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Field>
      </div>

      {value && (
        <div key={value} className="fade-up mt-3 flex items-center gap-2 bg-forest-soft px-3 py-2.5 text-sm">
          <CalendarHeart size={16} className="shrink-0 text-forest" />
          <span>Gifts open <b>{prettyDay(value)}</b></span>
        </div>
      )}
    </div>
  );
}
