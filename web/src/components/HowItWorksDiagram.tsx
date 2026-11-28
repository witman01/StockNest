import { ChildAvatar } from "./ChildAvatar";
import { StockLogo } from "./StockLogo";
import { stockBy } from "@/lib/stocks";

/**
 * The how-it-works story as a live diagram: the parent shares one link, three relatives
 * each send a stock, the gifts travel into Amelia's nest, and it all opens on her birthday.
 * One SVG (so it scales as a unit); cards are HTML inside foreignObject.
 */
const GIVERS = [
  { who: "Grandma", ticker: "AAPL", amt: "$50", y: 118 },
  { who: "Uncle Tobi", ticker: "NVDA", amt: "$25", y: 196 },
  { who: "Auntie Kemi", ticker: "TSLA", amt: "$20", y: 274 },
];
const NEST = { x: 352, y: 140, w: 196, h: 148 };
const DUR = 3.6;
const pathFor = (y: number) => `M178 ${y + 26} C 262 ${y + 26}, 270 ${NEST.y + NEST.h / 2}, ${NEST.x} ${NEST.y + NEST.h / 2}`;

export function HowItWorksDiagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 420" className={className} role="img"
      aria-label="Diagram: a parent shares one link, Grandma, Uncle Tobi and Auntie Kemi each send a stock, the gifts go into Amelia's nest, and it opens on her birthday.">
      {/* faint dot grid, like graph paper */}
      <defs>
        <pattern id="hiw-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#DCE3F0" /></pattern>
      </defs>
      <rect width="560" height="420" fill="url(#hiw-dots)" />

      {/* 1. parent shares the link → each giver */}
      <path d="M36 66 V 300" stroke="#050505" strokeWidth="1.2" fill="none" className="flow-dash" />
      {GIVERS.map((g) => <path key={g.who} d={`M36 ${g.y + 26} H 18`} stroke="#050505" strokeWidth="1.2" fill="none" />)}

      {/* 2. gifts travel into the nest */}
      {GIVERS.map((g) => <path key={g.who} d={pathFor(g.y)} stroke="#B9CEFF" strokeWidth="1.5" fill="none" />)}
      {GIVERS.map((g, i) => (
        <g key={g.who} opacity="0">
          <animateMotion dur={`${DUR}s`} begin={`${i * 1.2}s`} repeatCount="indefinite" path={pathFor(g.y)} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".5 0 .3 1" />
          <animate attributeName="opacity" dur={`${DUR}s`} begin={`${i * 1.2}s`} repeatCount="indefinite" values="0;1;1;0" keyTimes="0;.12;.85;1" />
          <circle r="13" fill="#FFFFFF" stroke="#050505" strokeWidth="1.2" />
          <image href={stockBy(g.ticker).logo} x="-7" y="-7" width="14" height="14" />
        </g>
      ))}

      {/* parent */}
      <foreignObject x="10" y="14" width="200" height="54">
        <div className="flex h-full items-center gap-2.5 border border-ink bg-paper px-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center bg-[#1F4FD1] font-mono text-[11px] font-semibold text-white">D&amp;G</span>
          <div className="leading-tight"><div className="font-mono text-[9.5px] font-semibold uppercase tracking-[.1em] text-[#1F4FD1]">Parent</div><div className="text-[12.5px] font-semibold">Shares one link</div></div>
        </div>
      </foreignObject>

      {/* givers */}
      {GIVERS.map((g) => (
        <foreignObject key={g.who} x="18" y={g.y} width="160" height="52">
          <div className="flex h-full items-center gap-2 border border-line bg-paper px-2">
            <StockLogo ticker={g.ticker} size={28} />
            <div className="min-w-0 leading-tight"><div className="truncate text-[12px] font-semibold">{g.who}</div><div className="font-mono text-[10px] text-ink-3">{g.amt} of {g.ticker}</div></div>
          </div>
        </foreignObject>
      ))}

      {/* the nest */}
      <rect x={NEST.x - 4} y={NEST.y - 4} width={NEST.w + 8} height={NEST.h + 8} fill="none" stroke="#548CFF" strokeWidth="2" className="nest-pulse" style={{ animationDelay: ".66s" }} />
      <foreignObject x={NEST.x} y={NEST.y} width={NEST.w} height={NEST.h}>
        <div className="flex h-full flex-col border border-ink bg-paper p-3">
          <div className="flex items-center gap-2">
            <ChildAvatar kind="amelia" size={36} ring={false} />
            <div className="leading-tight"><div className="text-[13px] font-semibold">Amelia&apos;s nest</div><div className="font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-3">Age 4 · Base</div></div>
          </div>
          <div className="mt-3 flex -space-x-1.5">
            {GIVERS.map((g) => <StockLogo key={g.ticker} ticker={g.ticker} size={24} className="ring-2 ring-paper" />)}
          </div>
          <div className="mt-auto">
            <div className="mb-1 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[.08em] text-ink-3"><span>3 gifts</span><span className="gift-pop text-[#1F4FD1]" style={{ animationDelay: ".66s" }}>+1 gift</span></div>
            <div className="h-1.5 overflow-hidden bg-sand"><div className="nest-fill h-full bg-[#548CFF]" /></div>
          </div>
        </div>
      </foreignObject>

      {/* 3. opens on the day */}
      <path d={`M${NEST.x + NEST.w / 2} ${NEST.y + NEST.h + 4} V 346`} stroke="#050505" strokeWidth="1.2" fill="none" className="flow-dash" />
      <foreignObject x={NEST.x} y="346" width={NEST.w} height="50">
        <div className="flex h-full items-center gap-2 bg-ink px-3 text-white">
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[.1em] text-[#8FB2FF]">Opens</span>
          <span className="text-[12.5px] font-semibold">12 March, her 5th birthday<span className="blink-cursor text-[#8FB2FF]">_</span></span>
        </div>
      </foreignObject>

      {/* step numbers */}
      {[{ x: 222, y: 40, n: "01" }, { x: 262, y: 108, n: "02" }, { x: 470, y: 328, n: "03" }].map((s) => (
        <text key={s.n} x={s.x} y={s.y} className="font-mono" fontSize="10" fontWeight="600" letterSpacing="1" fill="#8A8E99">{s.n}</text>
      ))}
    </svg>
  );
}
