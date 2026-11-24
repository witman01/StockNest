"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowUpRight, CalendarHeart, Coins, CreditCard, Gift as GiftIcon, Info, Lock, Mail, Send, Sprout, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChildAvatar } from "@/components/ChildAvatar";
import { Celebration, DeliveryTracker } from "@/components/Celebration";
import { StockLogo } from "@/components/StockLogo";
import { Button, Card, Chip, Toggle } from "@/components/ui";
import type { Gift, GiftMode, PublicNest } from "@/lib/nests";
import { sendGift } from "@/lib/api";
import { isRealTx, networkName, onchainEnabled, RESTRICTED, txUrl } from "@/lib/chain";
import { connectWallet, getTestFunds, hasBrowserWallet, sendStockGift, walletError } from "@/lib/wallet";
import { DEMO_WALLET, STOCKS, stockBy } from "@/lib/stocks";
import { giftTiming } from "@/lib/nests";
import { shares as fmtShares, usd } from "@/lib/format";
import { priceFor, usePrices } from "@/lib/usePrices";

const OCCASIONS = ["🎂 Birthday", "🎄 Holiday", "🎓 Graduation", "💛 Just because"];
const AMOUNTS = [10, 25, 50, 100];
const fmtDay = (d: Date | string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
type Pay = "email" | "wallet";
type Phase = "idle" | "signing" | "executing";

const inputCls = "w-full rounded-[10px] border-2 border-line bg-paper px-3.5 py-3 text-base outline-none transition focus:border-forest";

export function GiftFlow({ nest }: { nest: PublicNest }) {
  const router = useRouter();
  const params = useSearchParams();
  const fromParent = params.get("from") === "parent";
  // Parent picked their first gift on the create form: skip straight to the message step.
  const preTicker = fromParent && STOCKS.some((s) => s.ticker === params.get("t")) ? params.get("t")! : "";
  const preAmount = Math.min(10000, Math.max(1, Math.round(Number(params.get("amt")) || 0)));
  const prefilled = !!preTicker && Number(params.get("amt")) >= 1;

  const [step, setStep] = useState(prefilled ? 3 : 1);
  const [mode, setMode] = useState<GiftMode>("buy");
  const [ticker, setTicker] = useState<string>(preTicker);
  const [amount, setAmount] = useState(prefilled ? preAmount : 50);
  const [custom, setCustom] = useState(prefilled && !AMOUNTS.includes(preAmount) ? String(preAmount) : "");
  const [ownShares, setOwnShares] = useState("0.5");
  const [name, setName] = useState(fromParent ? nest.parentNames || "Mum & Dad" : "");
  const [isPrivate, setIsPrivate] = useState(false);
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [message, setMessage] = useState(fromParent ? (params.get("msg") ?? "").slice(0, 240) : "");
  const [pay, setPay] = useState<Pay>("wallet");
  const [stepMsg, setStepMsg] = useState("");
  const [browserWallet, setBrowserWallet] = useState(false);
  const [mmLink, setMmLink] = useState("");
  useEffect(() => {
    const has = hasBrowserWallet();
    setBrowserWallet(has);
    if (!has) setPay("email");
    setMmLink(`https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`);
  }, []);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sent, setSent] = useState<Gift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligible, setEligible] = useState(false);
  const [tracked, setTracked] = useState(0);

  // Order stocks: parents' picks first.
  const list = useMemo(() => {
    const picks = nest?.picks ?? [];
    return [...STOCKS].sort((a, b) => Number(picks.includes(b.ticker)) - Number(picks.includes(a.ticker)));
  }, [nest]);

  useEffect(() => { if (nest && !ticker) setTicker(nest.picks[0] ?? "AAPL"); }, [nest, ticker]);

  const stock = stockBy(ticker || nest.picks[0] || "AAPL");
  const book = usePrices();
  const livePrice = priceFor(book, stock.ticker);
  const owned = DEMO_WALLET[stock.ticker] ?? 0;
  const own = parseFloat(ownShares) || 0;
  const giftShares = mode === "buy" ? amount / livePrice : own;
  const giftUsd = mode === "buy" ? amount : own * livePrice;
  const amountOk = mode === "buy" ? amount >= 1 && amount <= 10000 : own > 0 && own <= owned;
  const canNext = step === 1 ? !!ticker && (mode === "buy" || owned > 0) : step === 2 ? amountOk : step === 4 ? eligible : true;
  const kid = nest.childName;

  function selectMode(m: GiftMode) {
    setMode(m);
    if (m === "own" && !DEMO_WALLET[ticker]) setTicker(Object.keys(DEMO_WALLET)[0]);
  }

  const onchainNest = onchainEnabled && !!nest.chainNestId;
  const onchain = onchainNest && mode === "buy";
  // Gift rules come from the nest (set by the parent), not the giver.
  const timing = giftTiming(nest);
  const unlockDate = timing.unlockAt ? new Date(timing.unlockAt * 1000) : null;
  const wrapped = !!unlockDate && unlockDate.getTime() > Date.now();
  const restrictedPick = RESTRICTED.has(stock.ticker);

  async function confirmOnchain() {
    setError(null);
    setPhase("signing");
    setStepMsg("Opening your wallet…");
    try {
      const wallet = await connectWallet(pay === "email" ? "smart" : "injected");
      setStepMsg("Getting a live price…");
      const qr = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticker: stock.ticker }) });
      const quote = await qr.json();
      if (!qr.ok) throw new Error(quote.error || "Couldn't get a price right now.");
      setPhase("executing");
      const msg = message.trim();
      const { unlockAt } = giftTiming(nest);
      const txHash = await sendStockGift({ wallet, nestId: nest.chainNestId!, usdAmount: amount, quote, message: msg, unlockAt, onStep: setStepMsg });
      setStepMsg(unlockAt ? "Wrapping your gift…" : `Putting it in ${kid}'s nest…`);
      const { gift } = await sendGift(nest.slug, { mode: "buy", ticker: stock.ticker, txHash, from: name.trim(), isPrivate, occasion, message: msg });
      setTracked(0);
      setSent(gift);
      setTimeout(() => setTracked(1), 900);
    } catch (e) {
      const m = e instanceof Error && !("code" in e) && !("shortMessage" in e) ? e.message : walletError(e);
      setError(m);
    } finally {
      setPhase("idle");
      setStepMsg("");
    }
  }

  async function confirm() {
    if (onchain) return confirmOnchain();
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
    : phase !== "idle" && stepMsg ? stepMsg
    : phase === "signing" ? "Waiting for your confirmation…"
    : phase === "executing" ? (onchain ? "Sending your gift on Base…" : mode === "buy" ? `Buying ${stock.name} on Base…` : "Sending on Base…")
    : mode === "buy" ? `Confirm & gift ${usd(amount, amount % 1 ? 2 : 0)} of ${stock.name}` : `Send ${fmtShares(own)} ${stock.ticker} to ${kid}`;

  const returned = sent?.status === "returned";
  const pending = sent?.status === "pending";
  const trackerRows = pending
    ? [
        { label: "Sent and held safely in escrow", meta: `${usd(sent!.usd, 2)} USDC` },
        { label: "Wrapped until the big day", meta: sent!.unlockAt ? fmtDay(sent!.unlockAt) : "soon" },
        { label: `${fmtShares(sent!.shares)} ${stock.ticker} goes into ${kid}'s nest`, meta: "automatically" },
      ]
    : returned
    ? [{ label: "USDC received", meta: usd(sent?.usd ?? 0, 2) }, { label: `${stock.name} isn't allowed for this nest yet`, meta: "policy check" }, { label: "USDC refunded to you", meta: usd(sent?.usd ?? 0, 2) }]
    : sent && isRealTx(sent.txHash)
    ? [{ label: "USDC received", meta: usd(sent.usd, 2) }, { label: `${stock.name} purchased`, meta: `${fmtShares(sent.shares)} ${stock.ticker}` }, { label: `Delivered to ${kid}'s nest`, meta: networkName }]
    : mode === "buy"
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
                    <button key={m} onClick={() => selectMode(m)} disabled={m === "own" && onchainNest}
                      className={clsx("rounded-full px-2 py-2.5 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50", mode === m ? "bg-paper text-forest shadow-soft" : "text-ink-2")}>
                      {m === "buy" ? "Buy with USDC" : onchainNest ? "Stock I own (soon)" : "Gift stock I own"}
                    </button>
                  ))}
                </div>
                <p className="-mt-1 mb-4 text-sm text-ink-3">{mode === "buy" ? <>Don&apos;t own any stock? No problem: pay in USDC and we buy the tokenized stock for {kid} in the same step.</> : "Send tokenized shares you already hold on Base. We check eligibility first."}</p>
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
                            {mode === "own" ? (held ? <>You hold {fmtShares(held)}, <span className="text-forest">✓ eligible</span></> : "Not in your wallet") : <>{s.ticker}, {usd(priceFor(book, s.ticker), 2)}{onchain && RESTRICTED.has(s.ticker) ? <span className="text-pending">, restricted</span> : null}</>}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {mode === "buy" && <p className="mt-3 text-xs text-ink-3">{book.source === "chainlink" ? "Live prices from Chainlink on Base." : "Showing last known prices."}{book.source === "chainlink" && !book.prices[stock.ticker]?.live ? " The US market is closed, so prices are from the last close." : ""}</p>}
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
                    <div className="num text-sm text-ink-3">{mode === "buy" ? `of ${stock.name} at ${usd(livePrice, 2)}, fractional shares OK` : `${fmtShares(giftShares)} ${stock.ticker} at ${usd(livePrice, 2)}`}</div>
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
                {onchain && (
                  <>
                    {/* gift rules, set by the parent */}
                    <p className="mb-2 mt-6 text-sm font-semibold">{kid}&apos;s gift rules <span className="font-normal text-ink-3">(set by {nest.parentNames && nest.parentNames !== "the family" ? nest.parentNames : `${kid}'s parents`})</span></p>
                    {/* timeline: sent → opens → in the nest */}
                    <ol className="grid grid-cols-3 rounded-2xl border border-line px-2 py-3 text-center text-[13px]">
                      {[
                        { icon: Send, t: "Sent", d: "Today" },
                        { icon: GiftIcon, t: "Opens", d: wrapped ? fmtDay(unlockDate!) : "Right away" },
                        { icon: Sprout, t: `In ${kid}'s nest`, d: "Automatically" },
                      ].map(({ icon: Icon, t, d }, i) => (
                        <li key={t} className="relative grid justify-items-center gap-1 px-1">
                          {i > 0 && <span className="absolute right-1/2 top-[15px] h-0.5 w-full bg-line" aria-hidden />}
                          <span className="relative grid h-8 w-8 place-items-center rounded-full bg-forest-soft text-forest"><Icon size={15} /></span>
                          <span className="leading-tight text-ink-3">{t}</span>
                          <b className="num leading-tight">{d}</b>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="font-display text-[26px] font-semibold leading-tight">Review your stock gift</h2>
                {mode === "buy" && (
                  <>
                    <p className="mb-2 mt-5 text-sm font-semibold">Pay with</p>
                    <div className="grid gap-2.5">
                      {!browserWallet && mmLink && (
                        <a href={mmLink} className="flex items-center gap-3.5 rounded-2xl border-2 border-line bg-paper p-3.5 text-left transition hover:border-ink-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-honey-soft text-forest"><Wallet size={19} /></span>
                          <span><b className="block">Open in the MetaMask app</b><small className="text-sm text-ink-2">On your phone? This opens this gift inside MetaMask so you can pay there.</small></span>
                        </a>
                      )}
                      {[
                        { id: "wallet" as const, icon: Wallet, t: "Connect a browser wallet", d: browserWallet ? "MetaMask, Rabby, Coinbase Wallet extension or another wallet" : "No browser wallet found on this device", bg: "bg-onchain-soft", off: !browserWallet },
                        { id: "email" as const, icon: Mail, t: "Coinbase Smart Wallet", d: "Email or passkey, no seed phrase. Opens keys.coinbase.com, which isn't available in every country.", bg: "bg-forest-soft", off: false },
                      ].map(({ id, icon: Icon, t, d, bg, off }) => (
                        <button key={id} disabled={off} onClick={() => setPay(id)} className={clsx("flex items-center gap-3.5 rounded-2xl border-2 p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50", pay === id ? "border-forest bg-forest-soft" : "border-line bg-paper")}>
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-forest ${bg}`}><Icon size={19} /></span>
                          <span><b className="block">{t}</b><small className="text-sm text-ink-2">{d}</small></span>
                        </button>
                      ))}
                      <button disabled className="flex cursor-not-allowed items-center gap-3.5 rounded-2xl border-2 border-line p-3.5 text-left opacity-55">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-sand"><CreditCard size={19} /></span>
                        <span><b className="block">Debit or credit card</b><small className="text-sm text-ink-2">Coming soon</small></span>
                      </button>
                    </div>
                    {onchain && <FundsHelp pay={pay} />}
                  </>
                )}
                <div className="mt-4 overflow-hidden rounded-2xl border border-line text-[15px]">
                  {[
                    ["Gift for", nest.nestName],
                    ["Stock", <span key="s" className="inline-flex items-center gap-2"><StockLogo ticker={stock.ticker} size={22} />{stock.name} ({stock.ticker})</span>],
                    mode === "buy" ? ["You pay", `${usd(amount, 2)} USDC`] : ["You send", `${fmtShares(own)} ${stock.ticker}`],
                    mode === "buy" ? [`${kid} receives`, `≈ ${fmtShares(giftShares)} ${stock.ticker}`] : ["Eligibility", "✓ Nest can receive this token"],
                    ["Route", onchain ? (wrapped ? `USDC → escrow → ${kid}'s nest` : `USDC → ${kid}'s nest`) : mode === "buy" ? "USDC → swap → nest" : "Direct transfer → nest"],
                    ...(onchain ? [["Opens", wrapped ? fmtDay(unlockDate!) : "Right away"]] : []),
                    ["From", isPrivate ? "Private gift" : name.trim() || "Someone who loves you"],
                    ["Occasion", occasion],
                    ["Network", <Chip key="n" tone="base" xs>{onchain ? networkName : "Simulated"}</Chip>],
                  ].map(([k, v], i) => (
                    <div key={i} className="flex justify-between gap-4 border-b border-line px-4 py-3 last:border-0"><span className="shrink-0 text-ink-2">{k}</span><span className="num text-right font-semibold">{v}</span></div>
                  ))}
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-line p-3.5 text-sm">
                  <input type="checkbox" checked={eligible} onChange={(e) => setEligible(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0C513F]" />
                  <span><b>I&apos;m not a US person and I&apos;m 18 or older.</b> <span className="text-ink-2">Tokenized stocks are only offered outside the United States.</span></span>
                </label>
                <div className="mt-4 flex gap-2.5 rounded-2xl bg-sky-soft p-3.5 text-sm text-ink-2">
                  <Info size={18} className="mt-0.5 shrink-0 text-forest" />
                  <span>{onchain
                    ? <>A real transaction on {networkName} (testnet), priced live from Chainlink. {wrapped ? <>Your gift stays wrapped in the StockNest escrow until <b>{fmtDay(unlockDate!)}</b>, then goes into {kid}&apos;s nest automatically.</> : <>Your gift goes straight into {kid}&apos;s nest.</>} Nobody has to accept it and it never bounces back. The one exception: if the rules don&apos;t let {kid}&apos;s nest hold {stock.name}, you get your USDC back in full.{restrictedPick && <> <b>{stock.name} is restricted on testnet and {kid}&apos;s nest isn&apos;t approved for it, so expect that refund.</b></>} No test USDC or gas? We add them for you in the same step.</>
                    : mode === "buy"
                    ? `Shares are priced live. If the stock can't be delivered to ${kid}'s nest, your USDC is refunded automatically. This nest isn't onchain yet, so this gift is simulated.`
                    : `The token's transfer policy is checked before sending. Shares go to ${kid}'s guardian-managed nest, not a child's personal wallet. Gifting shares you own is simulated in this demo.`}</span>
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
        subtitle={pending
          ? <>{sent && !sent.isPrivate && name.trim() ? `Thank you, ${name.trim()}! ` : ""}Your <b>{fmtShares(sent!.shares)} {stock.name}</b> is wrapped for {kid}.</>
          : returned
          ? <>{stock.name} can&apos;t be delivered to {kid}&apos;s nest yet because of its transfer rules, so your test USDC was refunded automatically.</>
          : <>{sent && !sent.isPrivate && name.trim() ? `Thank you, ${name.trim()}! ` : ""}Your <b>{fmtShares(sent?.shares || giftShares)} {stock.name}</b> {sent && isRealTx(sent.txHash) ? "is now in" : "is on its way to"} {kid}&apos;s Stock Nest.</>}
        shareUrl={typeof window !== "undefined" ? `${window.location.origin}/n/${nest.slug}` : ""}
        shareTitle={`Gift ${kid} a stock 🎁`}
        shareLine={`Help spread the word and share ${kid}'s nest`}
        secondary={{ label: `View ${kid}'s gift page`, href: `/n/${nest.slug}` }}
      >
        {sent && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-line px-3.5 py-3">
            <StockLogo ticker={sent.ticker} size={44} />
            <div className="min-w-0 flex-1">
              <b className="block">{fmtShares(sent.shares)} {stockBy(sent.ticker).name}</b>
              <span className="num text-sm text-ink-3">{usd(sent.usd, 2)} · {sent.occasion}</span>
              {sent.message && <span className="font-display block truncate text-sm italic text-ink-2">&ldquo;{sent.message}&rdquo;</span>}
            </div>
          </div>
        )}
        {pending ? (
          <div className="grid gap-2.5 rounded-2xl bg-sand px-4 py-3.5 text-[15px]">
            {[
              { icon: CalendarHeart, t: <>Opens on <b>{sent!.unlockAt ? fmtDay(sent!.unlockAt) : "the big day"}</b></> },
              { icon: Lock, t: <>Held safely in escrow on Base until then</> },
              { icon: Sprout, t: <>Then it goes into {kid}&apos;s nest <b>automatically</b>, nothing to accept</> },
            ].map(({ icon: Icon, t }, i) => (
              <div key={i} className="flex items-start gap-2.5 text-ink-2">
                <Icon size={17} className="mt-0.5 shrink-0 text-forest" /><span>{t}</span>
              </div>
            ))}
          </div>
        ) : (
          <DeliveryTracker rows={trackerRows} doneCount={tracked} />
        )}
        <div className="mt-3 text-center">
          {sent && txUrl(sent.txHash ?? "")
            ? <a href={txUrl(sent.txHash!)!} target="_blank" rel="noopener noreferrer"><Chip tone="base">View receipt on BaseScan ↗</Chip></a>
            : <Chip tone="base">Demo receipt (simulated)</Chip>}
        </div>
      </Celebration>
    </div>
  );
}

/**
 * "No USDC?" help, right where people pay. Testnet: one tap adds free gas and
 * 1,000 test USDC. Base mainnet: where to buy USDC or tokenized stocks.
 */
function FundsHelp({ pay }: { pay: Pay }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [msg, setMsg] = useState("");
  async function getFunds() {
    setState("busy");
    setMsg("Opening your wallet…");
    try {
      const wallet = await connectWallet(pay === "email" ? "smart" : "injected");
      const bal = await getTestFunds(wallet, setMsg);
      setMsg(`You have ${bal.toLocaleString("en-US", { maximumFractionDigits: 2 })} test USDC and gas. You're ready to gift.`);
      setState("done");
    } catch (e) {
      setMsg(e instanceof Error && !("code" in e) && !("shortMessage" in e) ? e.message : walletError(e));
      setState("idle");
    }
  }
  const links = [
    { t: "Swap to USDC on Uniswap", href: "https://app.uniswap.org/swap?chain=base&outputCurrency=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    { t: "Swap on Aerodrome", href: "https://aerodrome.finance/swap?to=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  ];
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-line p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-honey-soft text-forest"><Coins size={19} /></span>
        <div className="min-w-0 flex-1">
          <b className="block">Don&apos;t have USDC?</b>
          <small className="text-sm text-ink-2">On this testnet it&apos;s free: one tap adds 1,000 test USDC and gas to your wallet.</small>
          <div className="mt-2.5">
            <Button size="sm" variant={state === "done" ? "secondary" : "primary"} onClick={getFunds} disabled={state === "busy"}>
              {state === "busy" && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {state === "done" ? "Funds added ✓" : "Get free test USDC"}
            </Button>
          </div>
          {msg && <p className={clsx("mt-2 text-sm", state === "done" ? "font-semibold text-forest" : "text-ink-3")}>{msg}</p>}
          <p className="mt-3 text-xs text-ink-3">On Base mainnet, buy USDC in your wallet app or swap for it on a Base exchange:</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold">
            {links.map((l) => (
              <a key={l.t} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-forest underline">{l.t}<ArrowUpRight size={14} /></a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
