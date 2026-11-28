import { ArrowRightLeft, CalendarHeart, Lock, MessageCircleHeart, ShieldCheck, Sprout } from "lucide-react";
import { DitherMountain } from "@/components/DitherMountain";
import { StockLogo } from "@/components/StockLogo";
import { ChildAvatar } from "@/components/ChildAvatar";
import { CountUp } from "@/components/CountUp";
import { SiteFooter } from "@/components/SiteHeader";
import { Button, AllocationBar } from "@/components/ui";
import { SEED_NESTS, nestTotals } from "@/lib/nests";
import { STOCKS, stockBy } from "@/lib/stocks";
import { shares, usd } from "@/lib/format";

/** Corner "+" marks on a framed block, like a technical drawing. */
const Plus = ({ className }: { className: string }) => <span aria-hidden className={`pointer-events-none absolute font-mono text-[15px] leading-none text-ink ${className}`}>+</span>;
const d = (ms: number) => ({ animationDelay: `${ms}ms` });
const rd = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export default function Home() {
  const amelia = SEED_NESTS[0];
  const t = nestTotals(amelia);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-8">
        <div className="relative border-x border-line">
          <Plus className="-bottom-[8px] -left-[5px]" /><Plus className="-bottom-[8px] -right-[5px]" />
          <div className="px-5 pb-2 pt-12 md:px-10 md:pt-16">
            <span className="rise mono-label inline-flex items-center gap-2 border border-line px-2.5 py-1.5 text-ink-2" style={d(0)}>
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#548CFF] opacity-60" /><span className="relative h-2 w-2 rounded-full bg-[#1F4FD1]" /></span>
              Live on Base Sepolia
            </span>
            <h1 className="font-display mt-6 max-w-[15ch] text-[44px] font-semibold leading-[.98] text-balance sm:text-[64px] lg:text-[88px]">
              <span className="rise inline-block" style={d(80)}>Every kid</span>{" "}
              <em className="rise inline-block" style={d(180)}>deserves</em>{" "}
              <span className="rise inline-block" style={d(280)}>a share of</span>{" "}
              <em className="rise inline-block" style={d(380)}>the future.</em>
            </h1>
            <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <p className="rise max-w-[44ch] text-[15px] leading-relaxed text-ink-2" style={d(520)}>
                Grandma picks Apple, an uncle picks NVIDIA. Each gift becomes a real tokenized share in your child&apos;s nest on Base, with their message attached.
              </p>
              <div className="rise flex flex-wrap gap-2.5" style={d(620)}>
                <Button href="/create">Start a nest <span className="arr">→</span></Button>
                <Button href="/n/amelia" variant="secondary">See an example</Button>
              </div>
            </div>
          </div>

          {/* the cornflower mountain, with stocks bouncing along the ridge */}
          <div className="relative mt-4">
            <DitherMountain className="h-[300px] w-full sm:h-[360px] lg:h-[440px]" />
            <div className="pop-in absolute left-4 top-4 hidden max-w-[260px] sm:block md:left-10" style={d(1500)}>
              <div className="float-bob border border-ink bg-paper p-3 text-[13px]">
                <div className="flex items-center gap-2.5">
                  <StockLogo ticker="AAPL" size={34} />
                  <div><b>Grandma gifted {amelia.gifts[0].shares.toFixed(2)} Apple</b><div className="mono-label text-forest">Birthday</div></div>
                </div>
                <p className="mt-2 text-ink-2">&ldquo;Own a little piece of the future, my darling.&rdquo;</p>
              </div>
            </div>
            <div className="pop-in absolute bottom-5 right-4 md:right-10" style={d(1800)}>
              <div className="float-bob border border-ink bg-paper p-3 text-[13px]" style={d(-2500)}>
                <div className="flex items-center gap-2"><ChildAvatar kind="amelia" size={26} ring={false} /><b>{amelia.nestName}</b></div>
                <AllocationBar holdings={t.holdings} className="my-2 w-[200px]" />
                <div className="text-ink-2"><b className="text-ink"><CountUp value={t.total} /></b> from {t.givers} family members</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- STOCKS ROW ---------------- */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-8" aria-label="Stocks families can gift">
        <div className="flex flex-col gap-4 border-b border-line py-7 md:flex-row md:items-center md:gap-8">
          <span className="mono-label shrink-0 text-ink-3">Gift shares of</span>
          <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="marquee flex w-max gap-8">
              {[...STOCKS, ...STOCKS].map((s, i) => (
                <span key={i} className="flex items-center gap-2 text-[15px] font-semibold text-ink-3 transition hover:text-ink" aria-hidden={i >= STOCKS.length}>
                  <StockLogo ticker={s.ticker} size={22} />{s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 md:px-8">
        <div className="reveal border-b border-line py-14 md:py-20">
          <span className="mono-label text-forest">How it works</span>
          <h2 className="font-display mt-3 max-w-[18ch] text-[32px] font-semibold leading-[1.02] text-balance md:text-[48px]">Gifting a stock should feel like <em>sending a card.</em></h2>
        </div>
        <div className="grid border-b border-line md:grid-cols-3">
          {[
            { k: "Step 1 · Parent", icon: Sprout, title: "Make a nest", body: "Add your child's name and photo, pick the stocks family can gift and one opening day, like a birthday." },
            { k: "Step 2 · Family", icon: MessageCircleHeart, title: "Share one link", body: "Send it on WhatsApp or by text. Relatives choose a stock and an amount from $1. No brokerage account needed." },
            { k: "Step 3 · Child", icon: CalendarHeart, title: "It lands on the day", body: "Each gift waits wrapped in escrow and goes into the nest automatically. Nothing to accept, nothing bounces back." },
          ].map(({ k, icon: Icon, title, body }, i) => (
            <div key={k} style={rd(i * 120)} className={`reveal step-cell group py-8 md:px-8 ${i > 0 ? "border-t border-line md:border-l md:border-t-0" : "md:pl-0"}`}>
              <div className="flex items-center justify-between"><span className="mono-label text-forest">{k}</span><Icon size={18} className="text-ink-3 transition group-hover:text-forest" /></div>
              <h3 className="mt-5 text-[22px] font-semibold tracking-[-.02em]">{title}</h3>
              <p className="mt-2 leading-relaxed text-ink-2">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- EXAMPLE NEST ---------------- */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-8">
        <div className="grid border-b border-line lg:grid-cols-[1.1fr_.9fr]">
          <div className="py-14 lg:border-r lg:border-line lg:py-20 lg:pr-12">
            <div className="reveal">
              <span className="mono-label text-forest">One nest per child</span>
              <h2 className="font-display mt-3 text-[32px] font-semibold leading-[1.02] text-balance md:text-[46px]">One link. <em>Every gift,</em> in one nest.</h2>
            </div>
            <ul className="mt-8 grid gap-6">
              {[
                { icon: Sprout, t: "The gift is the stock", d: "Givers choose the company, so the child owns the real thing, not a voucher." },
                { icon: MessageCircleHeart, t: "Every share carries a message", d: "“Grandma gave you this Apple share on your 5th birthday.” A portfolio with a family story." },
                { icon: ArrowRightLeft, t: "No stock needed to give", d: "Pay in USDC and the share is bought for the child in the same step." },
              ].map(({ icon: Icon, t: title, d: desc }, i) => (
                <li key={title} className="reveal group flex gap-4" style={rd(i * 110)}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-line text-forest transition group-hover:border-forest group-hover:bg-forest-soft"><Icon size={18} /></span>
                  <div><b className="block">{title}</b><span className="text-ink-2">{desc}</span></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="py-10 lg:py-20 lg:pl-12">
            <div className="reveal border border-ink bg-paper transition duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0_#D3E1FF]" style={rd(150)}>
              <div className="mono-label flex items-center justify-between border-b border-line px-4 py-3.5 text-ink-3"><span>{amelia.nestName}</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#548CFF]" />Base</span></div>
              <div className="px-4 pb-2 pt-5">
                <b className="block text-[40px] font-semibold tracking-[-.04em]"><CountUp value={t.total} /></b>
                <span className="text-sm text-ink-2">from {t.givers} family members</span>
                <div className="grow-x mt-4"><AllocationBar holdings={t.holdings} /></div>
              </div>
              {t.holdings.map((h) => (
                <div key={h.ticker} className="flex items-center gap-3 border-t border-line px-4 py-3 transition hover:bg-sand">
                  <StockLogo ticker={h.ticker} size={34} />
                  <div className="min-w-0 flex-1"><b className="text-[15px]">{stockBy(h.ticker).name}</b><div className="num text-[13px] text-ink-3">{shares(h.shares)} shares from {h.gifts} gifts</div></div>
                  <b className="num">{usd(h.usd)}</b>
                </div>
              ))}
              <div className="border-t border-line p-4"><Button href="/n/amelia/gift" block>Gift a stock <span className="arr">→</span></Button></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- WHY BASE ---------------- */}
      <section id="base" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-14 md:px-8 md:py-20">
        <div className="reveal relative overflow-hidden bg-ink px-6 py-10 text-white md:p-14">
          <span className="mono-label text-[#8FB2FF]">Why Base</span>
          <h2 className="font-display mt-3 max-w-[20ch] text-[32px] font-semibold leading-[1.02] md:text-[46px]">A new stock primitive: <em>the gift.</em></h2>
          <p className="mt-4 max-w-[60ch] text-[#B8BCC6]">Tokenized stocks on Base can be held, transferred and programmed onchain. StockNest turns that into a gift a family funds together, delivered to a parent-managed nest.</p>
          <div className="mt-10 grid border-t border-white/15 md:grid-cols-3">
            {[
              { t: "USDC → stock → nest", d: "A giver pays in USDC. The chosen tokenized stock is bought at a live Chainlink price and sent to the nest." },
              { t: "Wrapped until the day", d: "Gifts can wait in escrow until a birthday the parent picks, then go in automatically." },
              { t: "Checkable by anyone", d: "Every purchase and delivery is recorded on Base, so anyone can check it and no one has to." },
            ].map((x, i) => (
              <div key={x.t} className={`reveal py-6 md:px-6 ${i > 0 ? "border-t border-white/15 md:border-l md:border-t-0" : "md:pl-0"}`} style={rd(200 + i * 120)}>
                <h3 className="text-lg font-semibold">{x.t}</h3><p className="mt-1.5 text-[15px] text-[#B8BCC6]">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex gap-2 border-t border-white/15 pt-5 text-sm text-[#9DA2AD]">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            Stocks can go down as well as up. Values are shown at the time of each gift and aren&apos;t a promise of growth. Only a stock the child isn&apos;t allowed to hold is refunded to the giver.
          </p>
        </div>
      </section>

      {/* ---------------- CLOSING ---------------- */}
      <section className="pb-20">
        <div className="reveal mx-auto max-w-[760px] px-4 text-center">
          <p className="text-[24px] font-medium leading-snug tracking-[-.02em] text-ink text-balance md:text-[32px]">
            &ldquo;A child may forget the toy from their fifth birthday. Imagine opening your first portfolio and finding the Apple share
            <span className="text-[#548CFF]"> your grandmother gave you,</span> with her message still attached.&rdquo;
          </p>
          <div className="mt-8 flex justify-center"><Button href="/create">Start your child&apos;s nest <span className="arr">→</span></Button></div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ink-3"><Lock size={14} />Your child&apos;s details stay private. Only what you choose is shown.</p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
