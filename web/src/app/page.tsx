import { ArrowRightLeft, CalendarHeart, HeartHandshake, Lock, MessageCircleHeart, ShieldCheck, Sprout } from "lucide-react";
import { FamilyScene } from "@/components/FamilyScene";
import { RotatingHeadline } from "@/components/RotatingHeadline";
import { StockLogo } from "@/components/StockLogo";
import { ChildAvatar } from "@/components/ChildAvatar";
import { SiteFooter } from "@/components/SiteHeader";
import { PaperHome } from "@/components/looks/paper/Home";
import { CharcoalHome } from "@/components/looks/charcoal/Home";
import { LogoMark } from "@/components/Logo";
import { Button, Card, Chip, AllocationBar } from "@/components/ui";
import { SEED_NESTS, nestTotals } from "@/lib/nests";
import { STOCKS, stockBy } from "@/lib/stocks";
import { shares, usd } from "@/lib/format";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs font-bold uppercase tracking-[.06em] text-forest">{children}</span>
);

function OriginalHome() {
  const amelia = SEED_NESTS[0];
  const t = nestTotals(amelia);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="pb-14 pt-6">
        <div className="mx-auto grid max-w-[1160px] items-center gap-10 px-4 md:px-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1.5 pr-3.5 text-[13px] font-semibold text-ink-2">
              <span className="rounded-full bg-forest-soft px-2 py-0.5 text-forest">New</span>
              Family stock gifting on
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/base.svg" alt="" width={14} height={14} />
              <b className="-ml-1 text-ink">Base</b>
            </span>
            <RotatingHeadline />
            <p className="mb-7 mt-4 max-w-[520px] text-lg leading-relaxed text-ink-2">
              StockNest gives every child a Stock Nest the whole family can fill. Grandma picks Apple, an uncle picks
              NVIDIA, and each gift becomes a real tokenized share on Base, with a message attached.
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
              <Button href="/create" className="max-sm:px-2! max-sm:text-[14px]! max-[380px]:text-[13px]!">Create a Stock Nest</Button>
              <Button href="/n/amelia" variant="secondary" className="max-sm:px-2! max-sm:text-[14px]! max-[380px]:text-[13px]!">See an example</Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-2">
              {["Gift real tokenized stocks", "Pay in USDC or send shares you own", "Managed by parents"].map((x) => (
                <span key={x} className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-forest" />{x}</span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[640px] pb-10 pt-20 sm:pt-16">
            <FamilyScene className="block h-auto w-full" />
            {/* top left: a gift with its message */}
            <div className="float-bob liquid absolute left-0 top-0 max-w-[250px] rounded-2xl bg-paper p-3 text-[13px] shadow-float">
              <div className="mb-1.5 flex items-center gap-2.5">
                <StockLogo ticker="AAPL" size={36} />
                <div><b>Grandma gifted {amelia.gifts[0].shares.toFixed(2)} Apple</b><div><Chip tone="honey" xs>🎂 Birthday</Chip></div></div>
              </div>
              <em className="font-display text-ink-2">&ldquo;Own a little piece of the future, my darling.&rdquo;</em>
            </div>
            {/* top right: family far away can give too */}
            <div className="float-bob liquid absolute right-0 top-2 hidden w-[218px] rounded-2xl bg-paper p-3 text-[13px] shadow-float sm:block" style={{ animationDelay: "-1.5s" }}>
              <div className="flex items-center gap-2.5">
                <StockLogo ticker="NVDA" size={36} />
                <div className="leading-snug"><b>Uncle James gifted 0.35 NVIDIA</b><div className="text-ink-3">Sent with love from Toronto</div></div>
              </div>
            </div>
            {/* bottom left: delivery receipt */}
            <div className="float-bob liquid absolute -bottom-12 left-0 hidden items-center gap-2.5 rounded-2xl bg-paper p-3 pr-4 text-[13px] shadow-float sm:flex" style={{ animationDelay: "-4.5s" }}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-base text-white">✓</span>
              <div className="leading-snug">
                <b>Delivered to Amelia&apos;s nest</b>
                <div className="flex items-center gap-1.5 text-ink-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logos/base.svg" alt="" width={12} height={12} />Verified on Base
                </div>
              </div>
            </div>
            {/* bottom right: the nest growing */}
            <div className="float-bob liquid absolute -bottom-12 right-0 min-w-[220px] rounded-2xl bg-paper p-3 text-[13px] shadow-float" style={{ animationDelay: "-3s" }}>
              <div className="flex items-center gap-2"><ChildAvatar kind="amelia" size={28} ring={false} /><b>{amelia.nestName}</b></div>
              <AllocationBar holdings={t.holdings} className="my-2" />
              <div className="num text-ink-2">{t.holdings.length} stocks, {usd(t.total)} from {t.givers} family members</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- LOGO MARQUEE ---------------- */}
      <section className="border-y border-line bg-paper py-6" aria-label="Stocks families can gift">
        <p className="mb-4 text-center text-xs font-bold uppercase tracking-[.06em] text-ink-3">Families can gift shares of</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div className="marquee flex w-max gap-4">
            {[...STOCKS, ...STOCKS].map((s, i) => (
              <span key={i} className="flex items-center gap-2.5 rounded-full border border-line bg-cream py-1.5 pl-1.5 pr-4 text-sm font-semibold" aria-hidden={i >= STOCKS.length}>
                <StockLogo ticker={s.ticker} size={32} />{s.name}<span className="font-medium text-ink-3">{s.ticker}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how" className="scroll-mt-24 py-16">
        <div className="mx-auto max-w-[1160px] px-4 md:px-8">
          <div className="mx-auto mb-10 max-w-[640px] text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="font-display mt-2 text-[28px] font-semibold leading-tight md:text-[36px]">Gifting a stock should feel like sending a birthday card</h2>
            <p className="mt-3 text-lg text-ink-2">It&apos;s set up by parents and easy enough for grandparents.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {[
              { n: 1, icon: Sprout, title: "Create a Stock Nest", body: "Add your child's name and photo, then choose the stocks family can gift, like Apple, NVIDIA or Tesla." },
              { n: 2, icon: HeartHandshake, title: "Share one link", body: "Send it on WhatsApp, Telegram or by text. Everyone uses one page, with no wallet addresses or brokerage accounts." },
              { n: 3, icon: MessageCircleHeart, title: "Family gifts stocks", body: "They pick a stock, an amount and a message. It lands in the child's nest, or stays wrapped until the day the parents chose, then opens in automatically." },
            ].map(({ n, icon: Icon, title, body }) => (
              <Card key={n} className="relative overflow-hidden">
                <span className="font-display absolute -right-2 -top-6 text-[120px] font-bold text-forest-soft">{n}</span>
                <span className="relative mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-forest text-white"><Icon size={22} /></span>
                <h3 className="relative text-xl font-bold">{title}</h3>
                <p className="relative mt-2 text-ink-2">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- EXAMPLE NEST ---------------- */}
      <section className="py-16">
        <div className="mx-auto grid max-w-[1160px] items-center gap-10 px-4 md:px-8 lg:grid-cols-2 lg:gap-16">
          <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-float">
            <div className="h-24 wash" />
            <div className="relative -mt-12 px-6 pb-6 text-center">
              <ChildAvatar kind="amelia" size={96} className="mx-auto mb-3" />
              <h3 className="font-display text-[26px] font-semibold">{amelia.nestName}</h3>
              <p className="font-display mt-1 italic text-ink-2">&ldquo;{amelia.note}&rdquo;</p>
              <AllocationBar holdings={t.holdings} className="mb-1 mt-5" />
              <div className="text-left">
                {t.holdings.map((h) => (
                  <div key={h.ticker} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                    <StockLogo ticker={h.ticker} size={38} />
                    <div className="min-w-0 flex-1"><b>{stockBy(h.ticker).name}</b><div className="num text-sm text-ink-3">{shares(h.shares)} shares from {h.gifts} gifts</div></div>
                    <b className="num">{usd(h.usd)}</b>
                  </div>
                ))}
              </div>
              <Button href="/n/amelia/gift" block className="mt-3">🎁 Gift a Stock</Button>
            </div>
          </div>
          <div>
            <Eyebrow>One nest per child</Eyebrow>
            <h2 className="font-display mt-2 text-[28px] font-semibold leading-tight md:text-[36px]">Stocks as gifts, and family as the investors</h2>
            <ul className="mt-6 grid gap-5">
              {[
                { icon: Sprout, bg: "bg-forest-soft", t: "The gift is the stock", d: "Givers choose the company or index fund, so the child owns the real thing, not a voucher." },
                { icon: MessageCircleHeart, bg: "bg-honey-soft", t: "Every share carries a message", d: "“Grandma gave you this Apple share on your 5th birthday.” It's a portfolio with a family story." },
                { icon: ArrowRightLeft, bg: "bg-sky-soft", t: "Two ways to give", d: "Pay in USDC and we buy the stock, or send tokenized shares you already own." },
                { icon: CalendarHeart, bg: "bg-sand", t: "Programmable stock gifts", d: "A share of Apple every birthday until 18. Scheduled gifts are coming soon." },
              ].map(({ icon: Icon, bg, t: title, d }) => (
                <li key={title} className="flex gap-4">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-forest ${bg}`}><Icon size={20} /></span>
                  <div><b className="block">{title}</b><span className="text-ink-2">{d}</span></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- WHY BASE ---------------- */}
      <section id="base" className="scroll-mt-24 pb-16">
        <div className="mx-auto max-w-[1160px] px-4 md:px-8">
          <div className="relative overflow-hidden rounded-[32px] bg-forest px-6 py-10 text-white md:p-14">
            <svg className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 opacity-10" viewBox="0 0 40 40"><path d="M19.5 18.5 L27.5 18.5 A8 8 0 1 1 19.5 10.5 Z" fill="#fff" /><path d="M21.6 16.4 V8.6 A7.8 7.8 0 0 1 29.4 16.4 Z" fill="#fff" /></svg>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-xs font-bold uppercase tracking-[.06em] text-white">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/base.svg" alt="Base" width={14} height={14} />
              </span>
              Why Base
            </span>
            <h2 className="font-display mt-2 max-w-[680px] text-[30px] font-semibold leading-tight md:text-[40px]">A new stock primitive: the gift.</h2>
            <p className="mt-3 max-w-[660px] text-lg text-[#cfe3da]">Tokenized stocks on Base can be held, transferred and programmed onchain. StockNest turns that into a stock gift that a family funds together and that is delivered to a guardian-managed nest.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { t: "USDC → Stock → Gift", d: "A giver pays in USDC. An integrated route buys the chosen B20 tokenized stock and delivers it to the child's nest." },
                { t: "Direct share gifting", d: "Already hold tokenized stocks? Gift them directly, once the token's transfer policy confirms the nest is eligible." },
                { t: "Verifiable family portfolio", d: "Every purchase, delivery and message reference is recorded on Base, so anyone can check it and no one has to." },
              ].map((x) => (
                <div key={x.t} className="rounded-2xl bg-white/[.08] p-5"><h3 className="text-lg font-bold">{x.t}</h3><p className="mt-1.5 text-[15px] text-[#cfe3da]">{x.d}</p></div>
              ))}
            </div>
            <p className="mt-6 flex gap-2 border-t border-white/15 pt-5 text-sm text-[#bcd6cb]">
              <ShieldCheck size={18} className="mt-0.5 shrink-0" />
              Honest by design: stocks can go down as well as up. Values are shown at the time of each gift and aren&apos;t a promise of growth. B20 transfer policies are checked before delivery, and only a stock the child isn&apos;t allowed to hold is refunded to the giver.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- CLOSING ---------------- */}
      <section className="pb-20 pt-4">
        <div className="mx-auto max-w-[740px] px-4 text-center">
          <LogoMark size={56} className="mx-auto mb-5" />
          <p className="font-display text-2xl italic leading-relaxed text-ink-2 md:text-[30px]">
            &ldquo;A child may forget the toy they got on their fifth birthday. But imagine opening your first portfolio and finding
            the Apple share your grandmother gave you, with her message still attached.&rdquo;
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/create">Start your child&apos;s Stock Nest</Button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ink-3"><Lock size={14} />Your child&apos;s details stay private. Only what you choose is shown.</p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}

/** All three looks render; CSS shows the one picked in the look switcher. */
export default function Home() {
  return (
    <>
      <div className="only-original"><OriginalHome /></div>
      <div className="only-paper"><PaperHome /></div>
      <div className="only-charcoal"><CharcoalHome /></div>
    </>
  );
}
