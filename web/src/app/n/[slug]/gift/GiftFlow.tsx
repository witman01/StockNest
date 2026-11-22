"use client";

import clsx from "clsx";
import { ArrowLeft, CreditCard, Info, Mail, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChildAvatar } from "@/components/ChildAvatar";
import { Celebration, DeliveryTracker } from "@/components/Celebration";
import { StockLogo } from "@/components/StockLogo";
import { Button, Card, Chip, Toggle } from "@/components/ui";
import type { Gift, GiftMode, PublicNest } from "@/lib/nests";
import { sendGift } from "@/lib/api";
import { DEMO_WALLET, STOCKS, stockBy } from "@/lib/stocks";
import { shares as fmtShares, usd } from "@/lib/format";

const OCCASIONS = ["🎂 Birthday", "🎄 Holiday", "🎓 Graduation", "💛 Just because"];
const AMOUNTS = [10, 25, 50, 100];
type Pay = "email" | "wallet";
type Phase = "idle" | "signing" | "executing";

const inputCls = "w-full rounded-[10px] border-2 border-line bg-paper px-3.5 py-3 text-base outline-none transition focus:border-forest";

export function GiftFlow({ nest }: { nest: PublicNest }) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<GiftMode>("buy");
  const [ticker, setTicker] = useState<string>("");
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [ownShares, setOwnShares] = useState("0.5");
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [message, setMessage] = useState("");
  const [pay, setPay] = useState<Pay>("email");
  const [phase, setPhase] = useState<Phase>("idle");
  const [sent, setSent] = useState<Gift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracked, setTracked] = useState(0);

  // Order stocks: parents' picks first.
  const list = useMemo(() => {
    const picks = nest?.picks ?? [];
    return [...STOCKS].sort((a, b) => Number(picks.includes(b.ticker)) - Number(picks.includes(a.ticker)));
  }, [nest]);

  useEffect(() => { if (nest && !ticker) setTicker(nest.picks[0] ?? "SPY"); }, [nest, ticker]);

  const stock = stockBy(ticker || nest.picks[0] || "SPY");
  const owned = DEMO_WALLET[stock.ticker] ?? 0;
  const own = parseFloat(ownShares) || 0;
  const giftShares = mode === "buy" ? amount / stock.price : own;
  const giftUsd = mode === "buy" ? amount : own * stock.price;
  const amountOk = mode === "buy" ? amount >= 1 && amount <= 10000 : own > 0 && own <= owned;
  const canNext = step === 1 ? !!ticker && (mode === "buy" || owned > 0) : step === 2 ? amountOk : true;
  const kid = nest.childName;

  function selectMode(m: GiftMode) {
    setMode(m);
    if (m === "own" && !DEMO_WALLET[ticker]) setTicker(Object.keys(DEMO_WALLET)[0]);
  }

  async function confirm() {
    setError(null);
    setPhase("signing");
    // DEMO: the wallet signature is simulated. The gift itself is saved by the server.
    // With contracts, this becomes: wallet call → USDC → swap → nest, tracked from onchain events.
    await new Promise((r) => setTimeout(r, 900));
    setPhase("executing");
    try {
      const [{ gift }] = await Promise.all([
        sendGift(nest.slug, {
          mode, ticker: stock.ticker,
          ...(mode === "buy" ? { usd: amount } : { shares: own }),
          from: name.trim(), isPrivate, occasion, message: message.trim(),
        }),
        new Promise((r) => setTimeout(r, 1100)),
      ]);
      setTracked(0);
      setSent(gift);
      [1, 2, 3].forEach((n) => setTimeout(() => setTracked(n), 500 + n * 650));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setPhase("idle");
    }
  }

  const next = () => { if (step < 4) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } else confirm(); };
  const back = () => (step > 1 ? setStep(step - 1) : router.push(`/n/${nest.slug}`));
  const nextLabel = step < 4 ? "Continue"
    : phase === "signing" ? "Waiting for your confirmation…"
    : phase === "executing" ? (mode === "buy" ? `Buying ${stock.name} on Base…` : "Sending on Base…")
    : mode === "buy" ? `Confirm & gift ${usd(amount, amount % 1 ? 2 : 0)} of ${stock.name}` : `Send ${fmtShares(own)} ${stock.ticker} to ${kid}`;

  const trackerRows = mode === "buy"
    ? [{ label: "USDC received", meta: usd(giftUsd, 2) }, { label: `${stock.name} purchased`, meta: `${fmtShares(giftShares)} ${stock.ticker}` }, { label: `Delivered to ${kid}'s nest`, meta: "Base" }]
    : [{ label: "Eligibility checked", meta: "✓ allowed" }, { label: `${stock.ticker} sent`, meta: `${fmtShares(giftShares)} ${stock.ticker}` }, { label: `Delivered to ${kid}'s nest`, meta: "Base" }];

  return (
    <div className="mx-auto max-w-[560px] px-4 pb-16 pt-4">
      <Card className="liquid">
        <div className="mb-4 flex items-center gap-2">
          <button onClick={back} className="inline-flex h-11 items-center gap-1 px-1 font-semibold text-forest"><ArrowLeft size={18} />Back</button>
          <div className="flex-1 text-center">
            <div className="text-xs font-bold uppercase tracking-[.06em] text-ink-2">Step {step} of 4</div>
            <div className="mt-1.5 flex justify-center gap-1.5">{[1, 2, 3, 4].map((i) => <i key={i} className={clsx("h-1.5 w-7 rounded-full transition-colors", i <= step ? "bg-forest" : "bg-sand")} />)}</div>
          </div>
          <span className="w-[72px]" />
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-honey-soft px-3.5 py-3">
          <ChildAvatar kind={nest.avatar} photo={nest.photo} showPhoto={nest.showPhoto} size={44} className="border-2!" />
          <div className="min-w-0 flex-1"><div className="text-[13px] text-ink-3">Your gift for</div><b className="block truncate">{nest.childName}<span className="hidden sm:inline">&apos;s Stock Nest</span></b></div>
          <div className="flex shrink-0 items-center gap-2 text-right">
            <div className="leading-tight">
              <b className="num font-display block text-xl">{mode === "buy" ? usd(amount, amount % 1 ? 2 : 0) : `${fmtShares(own)} sh`}</b>
              <span className="text-sm text-ink-3"><span className="sm:hidden">{stock.ticker}</span><span className="hidden sm:inline">of {stock.name}</span></span>
            </div>
            <StockLogo ticker={stock.ticker} size={36} />
          </div>
        </div>

        <div key={step} className="step-in">
            {step === 1 && (
              <div>
                <h2 className="font-display text-[26px] font-semibold leading-tight">Which stock would you like to gift {kid}?</h2>
                <div className="my-4 grid grid-cols-2 rounded-full bg-sand p-1">
                  {(["buy", "own"] as const).map((m) => (
                    <button key={m} onClick={() => selectMode(m)} className={clsx("rounded-full px-2 py-2.5 text-[15px] font-semibold transition", mode === m ? "bg-paper text-forest shadow-soft" : "text-ink-2")}>
                      {m === "buy" ? "Buy with USDC" : "Gift stock I own"}
                    </button>
                  ))}
                </div>
                <p className="-mt-1 mb-4 text-sm text-ink-3">{mode === "buy" ? `Pay in USDC and we'll buy the tokenized stock for ${kid}.` : "Send tokenized shares you already hold on Base. We check eligibility first."}</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {list.map((s) => {
                    const held = DEMO_WALLET[s.ticker];
                    const disabled = mode === "own" && !held;
                    const pick = nest.picks.includes(s.ticker);
                    return (
                      <button key={s.ticker} disabled={disabled} onClick={() => setTicker(s.ticker)}
                        className={clsx("relative flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                          ticker === s.ticker ? "border-forest bg-forest-soft" : "border-line bg-paper hover:border-ink-3")}>
                        {pick && mode === "buy" && <span className="absolute -top-2.5 right-2.5"><Chip tone="honey" xs>Parents&apos; pick</Chip></span>}
                        <StockLogo ticker={s.ticker} size={44} />
                        <span className="min-w-0">
                          <b className="block text-[15px]">{s.name}</b>
                          <small className="num text-[13px] text-ink-2">
                            {mode === "own" ? (held ? <>You hold {fmtShares(held)}, <span className="text-forest">✓ eligible</span></> : "Not in your wallet") : <>{s.ticker}, {usd(s.price, 2)}</>}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {mode === "buy" && <p className="mt-3 text-xs text-ink-3">Demo prices. Live quotes will come from the execution route.</p>}
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="font-display text-[26px] font-semibold leading-tight">How much {stock.name} would you like to gift?</h2>
                {mode === "buy" ? (
                  <>
                    <div className="my-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {AMOUNTS.map((a) => (
                        <button key={a} onClick={() => { setAmount(a); setCustom(""); }}
                          className={clsx("num h-16 rounded-2xl border-2 text-xl font-bold transition", !custom && amount === a ? "border-forest bg-forest text-white" : "border-line bg-paper")}>${a}</button>
                      ))}
                    </div>
                    <label htmlFor="custom" className="mb-2 block text-sm font-semibold">Or enter another amount</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-ink-2">$</span>
                      <input id="custom" className={clsx(inputCls, "num pl-8")} inputMode="decimal" placeholder="e.g. 75" value={custom}
                        onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ""); setCustom(v); setAmount(parseFloat(v) || 0); }} />
                    </div>
                  </>
                ) : (
                  <>
                    <label htmlFor="own" className="mb-2 mt-4 block text-sm font-semibold">Shares to gift</label>
                    <div className="flex gap-2">
                      <input id="own" className={clsx(inputCls, "num")} inputMode="decimal" value={ownShares} onChange={(e) => setOwnShares(e.target.value.replace(/[^\d.]/g, ""))} />
                      <Button variant="secondary" size="sm" className="h-[52px]!" onClick={() => setOwnShares(String(owned))}>Max</Button>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-3">You hold {fmtShares(owned)} {stock.ticker} in your connected wallet (demo).</p>
                  </>
                )}
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-forest-soft px-4 py-3.5">
                  <StockLogo ticker={stock.ticker} size={40} />
                  <div>
                    <b className="num font-display text-xl">{mode === "buy" ? `≈ ${fmtShares(giftShares)} shares` : `≈ ${usd(giftUsd, 2)} today`}</b>
                    <div className="num text-sm text-ink-3">{mode === "buy" ? `of ${stock.name} at ${usd(stock.price, 2)}, fractional shares OK` : `${fmtShares(giftShares)} ${stock.ticker} at ${usd(stock.price, 2)}`}</div>
                  </div>
                </div>
                <p className={clsx("mt-2.5 text-sm", amountOk ? "text-ink-3" : "text-error")}>
                  {amountOk ? (mode === "buy" ? "Gifts can be from $1 to $10,000." : "") : mode === "buy" ? "Please enter an amount between $1 and $10,000." : "You can't gift more shares than you hold."}
                </p>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="font-display text-[26px] font-semibold leading-tight">Add a personal note</h2>
                <label htmlFor="name" className="mb-2 mt-5 block text-sm font-semibold">Your name</label>
                <input id="name" className={inputCls} placeholder="e.g. Grandma Rose" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3.5">
                  <div><b className="text-[15px]">Give privately</b><div className="text-sm text-ink-3">Hide your name and amount on the public page</div></div>
                  <Toggle on={isPrivate} onChange={setIsPrivate} label="Give privately" />
                </div>
                <p className="mb-2 mt-5 text-sm font-semibold">Occasion</p>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => (
                    <button key={o} onClick={() => setOccasion(o)} className={clsx("rounded-full px-4 py-2.5 text-[15px] font-semibold transition", occasion === o ? "bg-honey" : "bg-honey-soft")}>{o}</button>
                  ))}
                </div>
                <label htmlFor="msg" className="mb-2 mt-5 block text-sm font-semibold">Message for {kid} <span className="font-normal text-ink-3">(optional)</span></label>
                <textarea id="msg" maxLength={240} className={clsx(inputCls, "font-display min-h-24 text-[17px] italic")} placeholder={`Happy birthday, ${kid}! Own a little piece of the future.`} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="font-display text-[26px] font-semibold leading-tight">Review your stock gift</h2>
                {mode === "buy" && (
                  <>
                    <p className="mb-2 mt-5 text-sm font-semibold">Pay with</p>
                    <div className="grid gap-2.5">
                      {[
                        { id: "email" as const, icon: Mail, t: "Continue with email", d: "New here? We'll set up a secure wallet for you. No seed phrase needed.", bg: "bg-forest-soft" },
                        { id: "wallet" as const, icon: Wallet, t: "Connect a wallet", d: "Coinbase Wallet, MetaMask or another Base wallet", bg: "bg-onchain-soft" },
                      ].map(({ id, icon: Icon, t, d, bg }) => (
                        <button key={id} onClick={() => setPay(id)} className={clsx("flex items-center gap-3.5 rounded-2xl border-2 p-3.5 text-left transition", pay === id ? "border-forest bg-forest-soft" : "border-line bg-paper")}>
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-forest ${bg}`}><Icon size={19} /></span>
                          <span><b className="block">{t}</b><small className="text-sm text-ink-2">{d}</small></span>
                        </button>
                      ))}
                      <button disabled className="flex cursor-not-allowed items-center gap-3.5 rounded-2xl border-2 border-line p-3.5 text-left opacity-55">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-sand"><CreditCard size={19} /></span>
                        <span><b className="block">Debit or credit card</b><small className="text-sm text-ink-2">Coming soon</small></span>
                      </button>
                    </div>
                  </>
                )}
                <div className="mt-4 overflow-hidden rounded-2xl border border-line text-[15px]">
                  {[
                    ["Gift for", nest.nestName],
                    ["Stock", <span key="s" className="inline-flex items-center gap-2"><StockLogo ticker={stock.ticker} size={22} />{stock.name} ({stock.ticker})</span>],
                    mode === "buy" ? ["You pay", `${usd(amount, 2)} USDC`] : ["You send", `${fmtShares(own)} ${stock.ticker}`],
                    mode === "buy" ? [`${kid} receives`, `≈ ${fmtShares(giftShares)} ${stock.ticker}`] : ["Eligibility", "✓ Nest can receive this token"],
                    ["Route", mode === "buy" ? "USDC → swap → nest" : "Direct transfer → nest"],
                    ["From", isPrivate ? "Private gift" : name.trim() || "Someone who loves you"],
                    ["Occasion", occasion],
                    ["Network", <Chip key="n" tone="base" xs>Base Sepolia testnet</Chip>],
                  ].map(([k, v], i) => (
                    <div key={i} className="flex justify-between gap-4 border-b border-line px-4 py-3 last:border-0"><span className="shrink-0 text-ink-2">{k}</span><span className="num text-right font-semibold">{v}</span></div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2.5 rounded-2xl bg-sky-soft p-3.5 text-sm text-ink-2">
                  <Info size={18} className="mt-0.5 shrink-0 text-forest" />
                  <span>{mode === "buy"
                    ? `The final number of shares depends on the price when the order fills (max 1% slippage). If the stock can't be bought or delivered to ${kid}'s nest, your USDC is refunded automatically.`
                    : `The token's transfer policy is checked before sending. Shares go to ${kid}'s guardian-managed nest, not a child's personal wallet.`} This is a demo, so no real money moves.</span>
                </div>
              </div>
            )}
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-error-soft px-4 py-3 text-sm font-semibold text-error">{error}</p>}
        <Button block className="mt-6" onClick={next} disabled={!canNext || phase !== "idle"}>
          {phase !== "idle" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {nextLabel}
        </Button>
      </Card>

      <Celebration
        open={!!sent}
        onClose={() => { router.push(`/n/${nest.slug}`); router.refresh(); }}
        steps={["Stock", "Note", "Gift"]}
        title={<>Give today.<br />Grow tomorrow.</>}
        subtitle={<>{sent && !sent.isPrivate && name.trim() ? `Thank you, ${name.trim()}! ` : ""}Your <b>{fmtShares(giftShares)} {stock.name}</b> is on its way to {kid}&apos;s Stock Nest.</>}
        shareUrl={typeof window !== "undefined" ? `${window.location.origin}/n/${nest.slug}` : ""}
        shareTitle={`Gift ${kid} a stock 🎁`}
        shareLine={`Help spread the word and share ${kid}'s nest`}
        secondary={{ label: `View ${kid}'s gift page`, href: `/n/${nest.slug}` }}
      >
        <DeliveryTracker rows={trackerRows} doneCount={tracked} />
        <div className="mt-2 text-center"><Chip tone="base">Receipt {sent?.txHash}</Chip></div>
      </Celebration>
    </div>
  );
}
