import { ArrowRightLeft, CalendarHeart, Lock, MessageCircleHeart, ShieldCheck, Sprout } from "lucide-react";
import { StockLogo } from "@/components/StockLogo";
import { ChildAvatar } from "@/components/ChildAvatar";
import { SiteFooter } from "./SiteHeader";
import { Button, AllocationBar } from "@/components/ui";
import { SEED_NESTS, nestTotals } from "@/lib/nests";
import { STOCKS, stockBy } from "@/lib/stocks";
import { shares, usd } from "@/lib/format";

// Illustrative growth line for the hero card (shape only, labelled as an example).
const LINE = [60, 57, 58, 52, 54, 47, 49, 41, 43, 36, 38, 30, 26, 28, 18, 12];
const pts = LINE.map((y, i) => `${(i / (LINE.length - 1)) * 300},${y}`).join(" L");

export function CharcoalHome() {
  const amelia = SEED_NESTS[0];
  const t = nestTotals(amelia);
  const top = t.holdings.slice(0, 2);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="mx-auto max-w-[1180px] px-4 pt-6 md:px-8">
        <div className="grid overflow-hidden rounded-[16px] border border-line bg-paper lg:grid-cols-2">
          <div className="relative z-10 px-6 pb-8 pt-12 md:px-10 md:pt-14">
            <span className="eyebrow-line">Giftable stock for the next generation</span>
            <h1 className="mt-6 text-[44px] font-semibold leading-[.98] tracking-[-.04em] text-balance text-[#F4EEE2] sm:text-[60px] lg:text-[74px]">
              The nest egg, rebuilt for <em>the onchain era.</em>
            </h1>
            <p className="mb-7 mt-6 max-w-[44ch] text-[15px] leading-relaxed text-ink-2">
              Grandma picks Apple, an uncle picks NVIDIA. Each gift becomes a real tokenized share in your child&apos;s nest on Base, with their message attached.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button href="/create">Start a nest</Button>
              <Button href="/n/amelia" variant="secondary">See an example</Button>
            </div>
            <div className="mt-11 grid grid-cols-3 border-t border-line">
              {[["$1", "smallest gift, fractional shares OK"], ["0", "gifts that bounce back for being unopened"], ["20 yrs", "longest a gift can stay wrapped"]].map(([b, s], i) => (
                <div key={b} className={`pt-4 ${i ? "border-l border-line pl-4" : "pr-4"}`}>
                  <b className="num block text-[24px] font-semibold tracking-[-.03em] text-[#F4EEE2] md:text-[30px]">{b}</b>
                  <small className="mt-1 block text-[12px] leading-snug text-ink-3">{s}</small>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-3">
              <small className="text-[11px]">Runs on</small>
              <b className="text-ink-2">Base</b>
              <span className="font-[family-name:var(--font-serif)] text-[17px] italic text-ink-2">Chainlink</span>
              <span className="text-[11.5px] font-bold tracking-[.16em] text-ink-2">USDC</span>
              <b className="text-ink-2">Smart Wallet</b>
            </div>
          </div>

          <div className="relative min-h-[460px] lg:min-h-[600px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-city.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_60%] grayscale-[.45] sepia-[.15]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#262624_0%,rgba(38,38,36,.55)_28%,rgba(30,30,28,.1)_70%),linear-gradient(0deg,rgba(30,30,28,.75),transparent_50%)]" />
            <div className="absolute inset-x-5 bottom-[108px] rounded-xl border border-[rgba(216,203,179,.18)] bg-[rgba(30,30,28,.78)] p-4 backdrop-blur-md md:inset-x-6">
              <div className="flex justify-between text-[11.5px] text-ink-3">
                <span className="flex items-center gap-2"><ChildAvatar kind="amelia" size={20} ring={false} />{amelia.nestName}</span>
                <span className="text-[#8FB0FF]"><span className="text-forest">●</span> Example</span>
              </div>
              <b className="num mt-2 block text-[28px] font-semibold tracking-[-.03em] text-[#F4EEE2]">{usd(t.total)} <small className="text-[12px] font-medium tracking-normal text-ink-3">from {t.givers} family members</small></b>
              <svg viewBox="0 0 300 72" preserveAspectRatio="none" className="mt-1 block h-[64px] w-full" aria-hidden>
                <defs><linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2F6BFF" stopOpacity=".35" /><stop offset="1" stopColor="#2F6BFF" stopOpacity="0" /></linearGradient></defs>
                <path d={`M${pts} L300,72 L0,72Z`} fill="url(#gB)" />
                <path d={`M${pts}`} fill="none" stroke="#2F6BFF" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="flex justify-between text-[10px] text-ink-3"><span>First gift</span><span>Birthday</span><span>Christmas</span><span>Today</span></div>
            </div>
            <div className="absolute inset-x-5 bottom-5 grid grid-cols-3 gap-2 md:inset-x-6">
              {top.map((h) => (
                <div key={h.ticker} className="flex h-[70px] flex-col justify-between rounded-lg border border-[rgba(216,203,179,.2)] bg-[rgba(216,203,179,.1)] px-2.5 py-2 backdrop-blur-md">
                  <small className="flex items-center gap-1.5 truncate text-[10px] text-ink-3"><StockLogo ticker={h.ticker} size={14} />{stockBy(h.ticker).name}</small>
                  <b className="num text-[14px] text-[#F4EEE2]">{shares(h.shares)} {h.ticker}</b>
                  <em className="text-[11px] not-italic text-[#8FB0FF]">{h.gifts} gifts</em>
                </div>
              ))}
              <div className="flex h-[70px] flex-col justify-between rounded-lg border border-[rgba(216,203,179,.2)] bg-[rgba(216,203,179,.1)] px-2.5 py-2 backdrop-blur-md">
                <small className="text-[10px] text-ink-3">Next gift</small>
                <b className="text-[14px] text-[#F4EEE2]">Wrapped</b>
                <em className="text-[11px] not-italic text-[#8FB0FF]">opens on her birthday</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- STOCKS ROW ---------------- */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-8" aria-label="Stocks families can gift">
        <div className="flex flex-col gap-4 py-8 md:flex-row md:items-center md:gap-8">
          <span className="eyebrow-line shrink-0">Gift shares of</span>
          <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="marquee flex w-max gap-8">
              {[...STOCKS, ...STOCKS].map((s, i) => (
                <span key={i} className="flex items-center gap-2 text-[15px] font-semibold text-ink-3" aria-hidden={i >= STOCKS.length}>
                  <StockLogo ticker={s.ticker} size={22} />{s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how" className="mx-auto max-w-[1180px] scroll-mt-28 px-4 py-12 md:px-8">
        <span className="eyebrow-line">How it works</span>
        <h2 className="mt-4 max-w-[20ch] text-[34px] font-semibold leading-[1.02] tracking-[-.035em] text-balance text-[#F4EEE2] md:text-[50px]">Gifting a stock should feel like <em>sending a card.</em></h2>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {[
            { k: "For parents", icon: Sprout, title: <>One nest, <em>one link</em></>, body: "Add your child's name and photo, pick the stocks family can gift and one opening day, like a birthday." },
            { k: "For family", icon: MessageCircleHeart, title: <>No brokerage <em>needed</em></>, body: "Choose a stock and an amount from $1. Pay in USDC and the share is bought in the same step." },
            { k: "For the child", icon: CalendarHeart, title: <>Always <em>arrives</em></>, body: "Gifts wait in escrow and go into the nest on the day. Nothing to accept, nothing bounces back." },
          ].map(({ k, icon: Icon, title, body }) => (
            <div key={k} className="rounded-[14px] border border-line p-6">
              <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-forest">{k}</span><Icon size={18} className="text-ink-3" /></div>
              <h3 className="mt-5 text-[22px] font-semibold tracking-[-.02em] text-[#F4EEE2]">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- EXAMPLE NEST ---------------- */}
      <section className="mx-auto max-w-[1180px] px-4 py-12 md:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="eyebrow-line">One nest per child</span>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.02] tracking-[-.035em] text-balance text-[#F4EEE2] md:text-[48px]">Stocks as gifts, <em>family as the investors.</em></h2>
            <ul className="mt-8 grid gap-6">
              {[
                { icon: Sprout, t: "The gift is the stock", d: "Givers choose the company, so the child owns the real thing, not a voucher." },
                { icon: MessageCircleHeart, t: "Every share carries a message", d: "“Grandma gave you this Apple share on your 5th birthday.” A portfolio with a family story." },
                { icon: ArrowRightLeft, t: "No stock needed to give", d: "Pay in USDC and the share is bought for the child in the same step." },
              ].map(({ icon: Icon, t: title, d }) => (
                <li key={title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-forest"><Icon size={18} /></span>
                  <div><b className="block text-[#F4EEE2]">{title}</b><span className="text-ink-3">{d}</span></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
            <div className="flex items-center gap-3 border-b border-line p-5">
              <ChildAvatar kind="amelia" size={44} ring={false} />
              <div className="min-w-0 flex-1"><b className="block text-[#F4EEE2]">{amelia.nestName}</b><span className="text-sm italic text-ink-3 font-[family-name:var(--font-serif)] text-[16px]">&ldquo;{amelia.note}&rdquo;</span></div>
            </div>
            <div className="px-5 pt-5">
              <b className="num block text-[38px] font-semibold tracking-[-.04em] text-[#F4EEE2]">{usd(t.total)}</b>
              <AllocationBar holdings={t.holdings} className="mt-3" />
            </div>
            <div className="mt-3">
              {t.holdings.map((h) => (
                <div key={h.ticker} className="flex items-center gap-3 border-t border-line px-5 py-3">
                  <StockLogo ticker={h.ticker} size={34} />
                  <div className="min-w-0 flex-1"><b className="text-[15px] text-[#F4EEE2]">{stockBy(h.ticker).name}</b><div className="num text-[13px] text-ink-3">{shares(h.shares)} shares from {h.gifts} gifts</div></div>
                  <b className="num text-[#F4EEE2]">{usd(h.usd)}</b>
                </div>
              ))}
            </div>
            <div className="border-t border-line p-5"><Button href="/n/amelia/gift" block>Gift a stock</Button></div>
          </div>
        </div>
      </section>

      {/* ---------------- WHY BASE ---------------- */}
      <section id="base" className="mx-auto max-w-[1180px] scroll-mt-28 px-4 py-12 md:px-8">
        <div className="relative overflow-hidden rounded-[16px] bg-forest px-6 py-10 text-white md:p-14">
          <span className="text-[11px] font-bold uppercase tracking-[.14em] text-white/75">Why Base</span>
          <h2 className="mt-3 max-w-[20ch] text-[34px] font-semibold leading-[1.02] tracking-[-.035em] md:text-[48px]">A new stock primitive: <em>the gift.</em></h2>
          <p className="mt-4 max-w-[60ch] text-white/80">Tokenized stocks on Base can be held, transferred and programmed onchain. StockNest turns that into a gift a family funds together, delivered to a parent-managed nest.</p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              { t: "USDC → stock → nest", d: "A giver pays in USDC. The chosen tokenized stock is bought at a live Chainlink price and sent to the nest." },
              { t: "Wrapped until the day", d: "Gifts can wait in escrow until a birthday the parent picks, then go in automatically." },
              { t: "Checkable by anyone", d: "Every purchase and delivery is recorded on Base, so anyone can check it and no one has to." },
            ].map((x) => (
              <div key={x.t} className="rounded-xl bg-white/10 p-5"><h3 className="text-lg font-semibold">{x.t}</h3><p className="mt-1.5 text-[15px] text-white/80">{x.d}</p></div>
            ))}
          </div>
          <p className="mt-6 flex gap-2 border-t border-white/20 pt-5 text-sm text-white/75">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            Stocks can go down as well as up. Values are shown at the time of each gift and aren&apos;t a promise of growth. Only a stock the child isn&apos;t allowed to hold is refunded to the giver.
          </p>
        </div>
      </section>

      {/* ---------------- CLOSING ---------------- */}
      <section className="pb-20 pt-8">
        <div className="mx-auto max-w-[760px] px-4 text-center">
          <p className="font-[family-name:var(--font-serif)] text-[28px] italic leading-snug text-ink-2 md:text-[38px]">
            &ldquo;A child may forget the toy from their fifth birthday. Imagine opening your first portfolio and finding the Apple share your grandmother gave you, with her message still attached.&rdquo;
          </p>
          <div className="mt-8 flex justify-center"><Button href="/create">Start your child&apos;s nest</Button></div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ink-3"><Lock size={14} />Your child&apos;s details stay private. Only what you choose is shown.</p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
