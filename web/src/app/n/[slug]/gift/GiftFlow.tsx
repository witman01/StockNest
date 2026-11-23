"use client";

import clsx from "clsx";
import { ArrowLeft, CreditCard, Info, Mail, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChildAvatar } from "@/components/ChildAvatar";
import { Celebration, DeliveryTracker } from "@/components/Celebration";
import { StockLogo } from "@/components/StockLogo";
import { Button, Card, Chip, Toggle } from "@/components/ui";
import type { Gift, GiftMode, PublicNest } from "@/lib/nests";
import { sendGift } from "@/lib/api";
import { isRealTx, networkName, onchainEnabled, RESTRICTED, txUrl } from "@/lib/chain";
import { connectWallet, hasBrowserWallet, sendStockGift, walletError } from "@/lib/wallet";
import { DEMO_WALLET, STOCKS, stockBy } from "@/lib/stocks";
import { shares as fmtShares, usd } from "@/lib/format";
import { priceFor, usePrices } from "@/lib/usePrices";

const OCCASIONS = ["🎂 Birthday", "🎄 Holiday", "🎓 Graduation", "💛 Just because"];
const AMOUNTS = [10, 25, 50, 100];
/** How long the parent has to accept before the giver can take the gift back. */
const WINDOWS = [
  { id: "30d", label: "30 days", secs: 30 * 86400 },
  { id: "7d", label: "7 days", secs: 7 * 86400 },
  { id: "90d", label: "90 days", secs: 90 * 86400 },
  { id: "demo", label: "6 minutes (demo)", secs: 6 * 60 },
];
const fmtDate = (d: Date | string) => new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDay = (d: Date | string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
type Pay = "email" | "wallet";
type Phase = "idle" | "signing" | "executing";

const inputCls = "w-full rounded-[10px] border-2 border-line bg-paper px-3.5 py-3 text-base outline-none transition focus:border-forest";

export function GiftFlow({ nest }: { nest: PublicNest }) {
  const router = useRouter();
  const fromParent = useSearchParams().get("from") === "parent";

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<GiftMode>("buy");
  const [ticker, setTicker] = useState<string>("");
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [ownShares, setOwnShares] = useState("0.5");
  const [name, setName] = useState(fromParent ? nest.parentNames || "Mum & Dad" : "");
  const [isPrivate, setIsPrivate] = useState(false);
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [message, setMessage] = useState("");
  const [pay, setPay] = useState<Pay>("email");
  const [stepMsg, setStepMsg] = useState("");
  const [browserWallet, setBrowserWallet] = useState(false);
  useEffect(() => setBrowserWallet(hasBrowserWallet()), []);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sent, setSent] = useState<Gift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligible, setEligible] = useState(false);
  const [tracked, setTracked] = useState(0);
  const [unlockOn, setUnlockOn] = useState(""); // yyyy-mm-dd, empty = can be accepted now
  const [windowId, setWindowId] = useState(WINDOWS[0].id);

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

  const onchain = onchainEnabled && !!nest.chainNestId && mode === "buy";
  const claimWindow = WINDOWS.find((w) => w.id === windowId) ?? WINDOWS[0];
  const unlockDate = unlockOn ? new Date(`${unlockOn}T00:00:00`) : null;
  const startsAt = unlockDate && unlockDate.getTime() > Date.now() ? unlockDate : new Date();
  const expiresDate = new Date(startsAt.getTime() + claimWindow.secs * 1000);
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
      const nowSecs = Math.floor(Date.now() / 1000);
      const unlockAt = unlockDate ? Math.max(0, Math.floor(unlockDate.getTime() / 1000)) : 0;
      // +2 minutes so the window still meets the contract minimum after the tx is mined.
      const expiresAt = Math.max(nowSecs, unlockAt) + claimWindow.secs + 120;
      const txHash = await sendStockGift({ wallet, nestId: nest.chainNestId!, usdAmount: amount, quote, message: msg, unlockAt, expiresAt, onStep: setStepMsg });
      setStepMsg("Recording your gift…");
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
        { label: "Sent to the StockNest escrow", meta: `${usd(sent!.usd, 2)} USDC` },
        { label: `Waiting for ${kid}'s parents to accept`, meta: sent!.unlockAt && new Date(sent!.unlockAt) > new Date() ? `opens ${fmtDay(sent!.unlockAt)}` : "any time now" },
        { label: `${fmtShares(sent!.shares)} ${stock.ticker} delivered to ${kid}'s nest`, meta: networkName },
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
                    <p className="mb-2 mt-5 text-sm font-semibold">When can {kid}&apos;s parents accept it?</p>
                    <div className="grid grid-cols-2 rounded-full bg-sand p-1">
                      {[["", "Right away"], ["date", "On a date"]].map(([v, l]) => (
                        <button key={l} onClick={() => setUnlockOn(v ? new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10) : "")}
                          className={clsx("rounded-full px-2 py-2.5 text-[15px] font-semibold transition", (v ? !!unlockOn : !unlockOn) ? "bg-paper text-forest shadow-soft" : "text-ink-2")}>{l}</button>
                      ))}
                    </div>
                    {unlockOn && (
                      <input type="date" aria-label="Unlock date" className={clsx(inputCls, "mt-2.5")} value={unlockOn}
                        min={new Date().toISOString().slice(0, 10)} onChange={(e) => setUnlockOn(e.target.value)} />
                    )}
                    <p className="mt-1.5 text-sm text-ink-3">{unlockOn ? `Locked until ${fmtDay(unlockDate!)}, like opening a present on the day.` : "They can accept it as soon as it arrives."}</p>
                    <label htmlFor="window" className="mb-2 mt-5 block text-sm font-semibold">If it isn&apos;t accepted within</label>
                    <select id="window" className={inputCls} value={windowId} onChange={(e) => setWindowId(e.target.value)}>
                      {WINDOWS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </select>
                    <p className="mt-1.5 text-sm text-ink-3">…you can take it back. Unclaimed gifts expire on {fmtDate(expiresDate)}.</p>
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
                      {[
                        { id: "email" as const, icon: Mail, t: "Continue with email or passkey", d: "Coinbase Smart Wallet. New here? It takes seconds, with no seed phrase.", bg: "bg-forest-soft", off: false },
                        { id: "wallet" as const, icon: Wallet, t: "Connect a browser wallet", d: browserWallet ? "MetaMask, Coinbase Wallet extension or another wallet" : "No browser wallet found on this device", bg: "bg-onchain-soft", off: !browserWallet },
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
                  </>
                )}
                <div className="mt-4 overflow-hidden rounded-2xl border border-line text-[15px]">
                  {[
                    ["Gift for", nest.nestName],
                    ["Stock", <span key="s" className="inline-flex items-center gap-2"><StockLogo ticker={stock.ticker} size={22} />{stock.name} ({stock.ticker})</span>],
                    mode === "buy" ? ["You pay", `${usd(amount, 2)} USDC`] : ["You send", `${fmtShares(own)} ${stock.ticker}`],
                    mode === "buy" ? [`${kid} receives`, `≈ ${fmtShares(giftShares)} ${stock.ticker}`] : ["Eligibility", "✓ Nest can receive this token"],
                    ["Route", onchain ? "USDC → escrow → parent accepts → nest" : mode === "buy" ? "USDC → swap → nest" : "Direct transfer → nest"],
                    ...(onchain ? [
                      ["Opens", unlockDate && unlockDate.getTime() > Date.now() ? fmtDay(unlockDate) : "Right away"],
                      ["Owner until accepted", "You (held in escrow)"],
                      ["Expires if not accepted", fmtDate(expiresDate)],
                    ] : []),
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
                    ? <>This is a real transaction on {networkName} (testnet), priced live from Chainlink. Your {usd(amount, 2)} USDC is held in the StockNest escrow and <b>stays yours until {kid}&apos;s parents accept it</b>. When they do, {kid}&apos;s nest is checked against {stock.name}&apos;s transfer rules: if it can receive it, the shares are delivered; if not, you&apos;re refunded. If nobody accepts it by {fmtDate(expiresDate)}, you can take it back.{restrictedPick && <> <b>{stock.name} is restricted on testnet and {kid}&apos;s nest isn&apos;t approved for it, so expect a refund.</b></>} If you don&apos;t have test USDC, your wallet gets 1,000 free in the same step.{!process.env.NEXT_PUBLIC_PAYMASTER_URL && <> Your wallet needs a little test ETH for gas (<a className="underline" href="https://portal.cdp.coinbase.com/products/faucet" target="_blank" rel="noopener noreferrer">free faucet</a>).</>}</>
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
          ? <>{sent && !sent.isPrivate && name.trim() ? `Thank you, ${name.trim()}! ` : ""}Your <b>{fmtShares(sent!.shares)} {stock.name}</b> is wrapped and waiting for {kid}&apos;s parents to accept it{sent!.unlockAt && new Date(sent!.unlockAt) > new Date() ? <> on or after {fmtDay(sent!.unlockAt)}</> : null}. Until then it&apos;s still yours, held in escrow on Base. If it isn&apos;t accepted by {fmtDate(sent!.expiresAt!)}, you can take it back from {kid}&apos;s page.</>
          : returned
          ? <>{stock.name} can&apos;t be delivered to {kid}&apos;s nest yet because of its transfer rules, so your test USDC was refunded automatically.</>
          : <>{sent && !sent.isPrivate && name.trim() ? `Thank you, ${name.trim()}! ` : ""}Your <b>{fmtShares(sent?.shares || giftShares)} {stock.name}</b> {sent && isRealTx(sent.txHash) ? "is now in" : "is on its way to"} {kid}&apos;s Stock Nest.</>}
        shareUrl={typeof window !== "undefined" ? `${window.location.origin}/n/${nest.slug}` : ""}
        shareTitle={`Gift ${kid} a stock 🎁`}
        shareLine={`Help spread the word and share ${kid}'s nest`}
        secondary={{ label: `View ${kid}'s gift page`, href: `/n/${nest.slug}` }}
      >
        <DeliveryTracker rows={trackerRows} doneCount={tracked} />
        <div className="mt-2 text-center">
          {sent && txUrl(sent.txHash ?? "")
            ? <a href={txUrl(sent.txHash!)!} target="_blank" rel="noopener noreferrer"><Chip tone="base">View receipt on BaseScan ↗</Chip></a>
            : <Chip tone="base">Demo receipt (simulated)</Chip>}
        </div>
      </Celebration>
    </div>
  );
}
