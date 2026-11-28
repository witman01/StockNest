"use client";

import clsx from "clsx";
import { Baby, CalendarHeart, Check, Copy, Eye, Gift, LineChart, MessageCircleHeart, ShieldCheck, Sparkles, Sprout, Wallet, type LucideIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AVATAR_KINDS, ChildAvatar } from "@/components/ChildAvatar";
import { Celebration } from "@/components/Celebration";
import { PhotoUpload } from "@/components/PhotoUpload";
import { DatePicker } from "@/components/DatePicker";
import { StockLogo } from "@/components/StockLogo";
import { Button, Card, Toggle, useToast } from "@/components/ui";
import { giftTiming, type AvatarKind, type Gift as GiftT } from "@/lib/nests";
import { createNest, saveOwned, sendGift, uploadPhoto } from "@/lib/api";
import { networkName, onchainEnabled } from "@/lib/chain";
import { connectWallet, createOnchainNest, hasBrowserWallet, sendStockGift, walletError } from "@/lib/wallet";

type Created = { slug: string; token: string; nestName: string; childName: string; avatar: AvatarKind; photo?: string; showPhoto: boolean };
import { STOCKS, stockBy } from "@/lib/stocks";
import { shares, usd } from "@/lib/format";

const Label = ({ children, htmlFor, hint, first }: { children: React.ReactNode; htmlFor?: string; hint?: string; first?: boolean }) => (
  <label htmlFor={htmlFor} className={clsx("mb-2 block text-sm font-semibold", first ? "mt-0" : "mt-5")}>{children} {hint && <span className="font-normal text-ink-3">({hint})</span>}</label>
);
const isoDay = (days: number) => new Date(Date.now() + days * 86400e3).toISOString().slice(0, 10);
const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** One numbered step of the form. */
function Section({ n, icon: Icon, title, sub, right, children }: { n: number; icon: LucideIcon; title: string; sub: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-5! md:p-6!">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center border border-ink bg-forest-soft text-forest">
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="mono-label text-forest">Step {String(n).padStart(2, "0")}</span>
          <h2 className="mt-0.5 text-lg font-semibold leading-tight tracking-[-.01em]">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-3">{sub}</p>
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}
const inputCls = "w-full rounded-[3px] border border-[#CDD2DC] bg-paper px-3.5 py-3 text-base outline-none transition focus:border-ink focus:shadow-[0_0_0_3px_#D3E1FF]";

export default function CreatePage() {
  const { toast, toastNode } = useToast();

  const [childName, setChildName] = useState("");
  const [nestName, setNestName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [childTouched, setChildTouched] = useState(false);
  const [avatar, setAvatar] = useState<AvatarKind>("sprout");
  const [photo, setPhoto] = useState<string | undefined>();
  const [showPhoto, setShowPhoto] = useState(true);
  const [picks, setPicks] = useState<string[]>(["AAPL", "NVDA", "MSFT"]);
  const [goal, setGoal] = useState("");
  const [note, setNote] = useState("");
  const [parentNames, setParentNames] = useState("");
  const [showAmounts, setShowAmounts] = useState(true);
  const [opensMode, setOpensMode] = useState<"now" | "date">("now");
  const [opensOn, setOpensOn] = useState("");
  const rules = { opensOn: opensMode === "date" && opensOn ? opensOn : undefined };
  const [created, setCreated] = useState<Created | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vault, setVault] = useState<"none" | "busy" | "done">("none");
  const [vaultError, setVaultError] = useState<string | null>(null);
  // Optional: the parent's own first gift, chosen before the nest is created.
  const [firstOn, setFirstOn] = useState(false);
  const [firstPick, setFirstPick] = useState("");
  const [firstAmount, setFirstAmount] = useState(50);
  const [firstMsg, setFirstMsg] = useState("");
  const firstTicker = picks.includes(firstPick) ? firstPick : picks[0] ?? "AAPL";
  const [progress, setProgress] = useState("");
  const [firstGift, setFirstGift] = useState<GiftT | null>(null);
  // Nest saved server-side but the first gift didn't finish yet: retries reuse it instead of making a duplicate.
  const draft = useRef<{ slug: string; token: string; finalName: string; photo?: string; chainNestId?: number } | null>(null);

  /** Parent's own first gift, done before the nest is shown as ready: vault → gift → nest. */
  async function runFirstGift(d: NonNullable<typeof draft.current>): Promise<GiftT> {
    const from = parentNames.trim() || "Mum & Dad";
    const message = firstMsg.trim();
    const occasion = "💛 Just because";
    if (!onchainEnabled) {
      setProgress("Adding your gift…");
      return (await sendGift(d.slug, { mode: "buy", ticker: firstTicker, usd: firstAmount, from, isPrivate: false, occasion, message })).gift;
    }
    setProgress("Opening your wallet…");
    const wallet = await connectWallet(hasBrowserWallet() ? "injected" : "smart");
    if (!d.chainNestId) {
      setProgress(`Creating ${childName.trim()}'s vault on ${networkName}…`);
      const nestTx = await createOnchainNest(wallet, d.slug, d.token);
      setProgress("Linking the vault…");
      const res = await fetch(`/api/nests/${encodeURIComponent(d.slug)}/chain`, {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${d.token}` }, body: JSON.stringify({ txHash: nestTx }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't link the vault.");
      d.chainNestId = Number(data.chainNestId);
      setVault("done");
    }
    setProgress("Getting a live price…");
    const qr = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticker: firstTicker }) });
    const quote = await qr.json();
    if (!qr.ok) throw new Error(quote.error || "Couldn't get a price right now.");
    const { unlockAt } = giftTiming(rules);
    const txHash = await sendStockGift({ wallet, nestId: d.chainNestId, usdAmount: firstAmount, quote, message, unlockAt, onStep: setProgress });
    // The server delivers it into the nest right away (or on the opening day).
    setProgress(unlockAt ? "Wrapping your gift…" : "Putting it in the nest…");
    const { gift } = await sendGift(d.slug, { mode: "buy", ticker: firstTicker, txHash, from, isPrivate: false, occasion, message });
    return gift;
  }

  function finish(d: NonNullable<typeof draft.current>, gift: GiftT | null) {
    saveOwned(d.slug, d.token);
    draft.current = null;
    setFirstGift(gift);
    setCreated({ slug: d.slug, token: d.token, nestName: d.finalName, childName: childName.trim(), avatar, photo, showPhoto: !!photo && showPhoto });
  }

  async function setUpVault(): Promise<boolean> {
    if (!created) return false;
    setVault("busy");
    setVaultError(null);
    try {
      const wallet = await connectWallet(hasBrowserWallet() ? "injected" : "smart");
      const txHash = await createOnchainNest(wallet, created.slug, created.token);
      const res = await fetch(`/api/nests/${encodeURIComponent(created.slug)}/chain`, {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${created.token}` }, body: JSON.stringify({ txHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't link the vault.");
      setVault("done");
      return true;
    } catch (e) {
      setVault("none");
      setVaultError(e instanceof Error && !("code" in e) && !("shortMessage" in e) ? e.message : walletError(e));
      return false;
    }
  }

  const goalNum = parseFloat(goal);
  const errors = useMemo(() => ({
    childName: childName.trim().length < 1 ? "Please add a display name." : null,
    picks: picks.length < 1 ? "Pick at least one stock." : null,
    opens: opensMode === "date" && !(opensOn && opensOn > isoDay(0)) ? "Pick a day in the future." : null,
  }), [childName, picks, opensMode, opensOn]);
  const valid = !errors.childName && !errors.picks && !errors.opens;

  function togglePick(t: string) {
    setPicks((p) => (p.includes(t) ? p.filter((x) => x !== t) : p.length < 6 ? [...p, t] : p));
  }

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      let d = draft.current;
      if (!d) {
        setProgress("Creating your nest…");
        const photoUrl = photo ? await uploadPhoto(photo) : undefined;
        const finalName = nestName.trim() || `${childName.trim()}'s Stock Nest`;
        const { slug, manageToken } = await createNest({
          childName: childName.trim(), nestName: finalName, avatar, photo: photoUrl, showPhoto: !!photo && showPhoto,
          note: note.trim(), parentNames: parentNames.trim(), goal: goalNum > 0 ? Math.round(goalNum) : undefined, picks, showAmounts, ...rules,
        });
        d = { slug, token: manageToken, finalName, photo: photoUrl };
        setVault("none");
      }
      if (!firstOn) return finish(d, null);
      draft.current = d;
      finish(d, await runFirstGift(d));
    } catch (e) {
      setError(e instanceof Error && !("code" in e) && !("shortMessage" in e) ? e.message : walletError(e));
    } finally {
      setSaving(false);
      setProgress("");
    }
  }

  const url = created && typeof window !== "undefined" ? `${window.location.origin}/n/${created.slug}` : "";

  return (
    <div className="mx-auto grid max-w-[1160px] gap-6 px-4 pb-16 pt-4 md:px-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      <div>
        <div className="mb-5 px-1">
          <span className="mono-label text-forest">For parents & guardians</span>
          <h1 className="font-display mt-1.5 text-[32px] font-semibold leading-tight md:text-[40px]">Create a Stock Nest</h1>
          <p className="mt-2 text-ink-2">Five quick steps. We only ask for what the gift page needs: no surnames, birthdays or schools.</p>
        </div>

        <div className="grid gap-4">
          {/* 1 — who */}
          <Section n={1} icon={Baby} title="Who is this nest for?" sub="Family sees this name and picture on the gift page.">
            <Label htmlFor="childName" first>Child&apos;s display name</Label>
            <input id="childName" className={inputCls} value={childName} maxLength={24} placeholder="e.g. Zara" onBlur={() => setChildTouched(true)}
              onChange={(e) => { setChildName(e.target.value); if (!nameTouched) setNestName(`${e.target.value.trim() || "Your child"}'s Stock Nest`); }} />
            {errors.childName && childTouched && <p className="mt-1.5 text-sm text-error">{errors.childName}</p>}

            <Label>Photo or avatar</Label>
            <PhotoUpload value={photo} onChange={(p) => { setPhoto(p); if (p) setShowPhoto(true); }} />
            {photo && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3.5">
                <div>
                  <b className="flex items-center gap-1.5 text-[15px]"><Eye size={16} />Show photo on the shared page</b>
                  <div className="text-sm text-ink-3">Anyone with the link can see it, including in link previews.</div>
                </div>
                <Toggle on={showPhoto} onChange={setShowPhoto} label="Show photo on shared page" />
              </div>
            )}
            {!photo || !showPhoto ? (
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="mr-1 text-sm text-ink-3">{photo ? "Shown instead:" : "Or pick one:"}</span>
                {AVATAR_KINDS.map((k) => (
                  <button key={k} type="button" onClick={() => setAvatar(k)} aria-label={`${k} avatar`} aria-pressed={avatar === k}
                    className={clsx("rounded-full border-[3px] p-0 transition", avatar === k ? "scale-105 border-forest" : "border-transparent opacity-80 hover:opacity-100")}>
                    <ChildAvatar kind={k} size={48} ring={false} />
                  </button>
                ))}
              </div>
            ) : null}

            <Label htmlFor="nestName">Nest name</Label>
            <input id="nestName" className={inputCls} value={nestName} maxLength={40} placeholder={`${childName.trim() || "Your child"}'s Stock Nest`} onChange={(e) => { setNestName(e.target.value); setNameTouched(true); }} />
          </Section>

          {/* 2 — stocks */}
          <Section n={2} icon={LineChart} title="Stocks family can gift" sub={`Choose up to 6. ${picks.length}/6 picked.`}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STOCKS.map((s) => {
                const on = picks.includes(s.ticker);
                return (
                  <button key={s.ticker} type="button" onClick={() => togglePick(s.ticker)} aria-pressed={on}
                    className={clsx("relative flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition", on ? "border-forest bg-forest-soft" : "border-line bg-paper hover:border-ink-3")}>
                    <StockLogo ticker={s.ticker} size={34} />
                    <span className="min-w-0 leading-tight"><b className="block truncate text-[15px]">{s.name}</b><span className="text-xs text-ink-3">{s.ticker}</span></span>
                    {on && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-forest text-white"><Check size={12} strokeWidth={3} /></span>}
                  </button>
                );
              })}
            </div>
            {errors.picks ? <p className="mt-2 text-sm text-error">{errors.picks}</p> : <p className="mt-2.5 text-sm text-ink-3">Only tokenized stocks available on Base. You can change these anytime.</p>}
          </Section>

          {/* 3 — gift rules */}
          <Section n={3} icon={CalendarHeart} title="When do gifts open?" sub="You decide once. Every gift follows it, so givers never have to choose.">
            <div className="grid grid-cols-2 gap-2">
              {([["now", Sparkles, "Straight away", "Each gift lands in the nest as it's sent"], ["date", CalendarHeart, "On a special day", "Wrapped until a birthday or holiday"]] as const).map(([id, Icon, t, d]) => {
                const on = opensMode === id;
                return (
                  <button key={id} type="button" aria-pressed={on} onClick={() => { setOpensMode(id); if (id === "date" && !opensOn) setOpensOn(isoDay(30)); }}
                    className={clsx("flex items-start gap-2.5 rounded-2xl border-2 p-3 text-left transition", on ? "border-forest bg-forest-soft" : "border-line bg-paper hover:border-ink-3")}>
                    <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-xl", on ? "bg-forest text-white" : "bg-sand text-forest")}><Icon size={17} /></span>
                    <span className="leading-tight"><b className="block text-[15px]">{t}</b><span className="text-[13px] text-ink-3">{d}</span></span>
                  </button>
                );
              })}
            </div>
            {opensMode === "date" && (
              <div className="mt-2.5">
                <DatePicker value={opensOn} onChange={setOpensOn} />
              </div>
            )}
            <p className="mt-3 flex gap-2 text-sm text-ink-3">
              <Sprout size={16} className="mt-0.5 shrink-0 text-forest" />
              <span>{opensMode === "date"
                ? <>Gifts sent before then wait safely in escrow, then go into {childName.trim() || "your child"}&apos;s nest automatically that day. Nothing to accept, nothing bounces back.</>
                : <>Every gift goes straight into {childName.trim() || "your child"}&apos;s nest. Nothing to accept, nothing bounces back.</>}</span>
            </p>
          </Section>

          {/* 4 — note */}
          <Section n={4} icon={MessageCircleHeart} title="A note for family & friends" sub="Shown at the top of the gift page.">
            <Label htmlFor="note" first>Your note</Label>
            <textarea id="note" className={clsx(inputCls, "font-display min-h-24 text-[17px] italic")} value={note} maxLength={180} onChange={(e) => setNote(e.target.value)}
              placeholder={`Instead of another toy this year, help us give ${childName.trim() || "our child"} a piece of the companies shaping their future.`} />
            <div className="grid gap-x-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="parents" hint="signed as">From</Label>
                <input id="parents" className={inputCls} placeholder="e.g. Daniel & Grace" value={parentNames} onChange={(e) => setParentNames(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="goal" hint="optional">Goal</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-ink-2">$</span>
                  <input id="goal" className={clsx(inputCls, "num pl-8")} inputMode="numeric" value={goal ? Number(goal).toLocaleString("en-US") : ""} placeholder="5,000" onChange={(e) => setGoal(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9))} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3.5">
              <div><b className="text-[15px]">Show gift amounts publicly</b><div className="text-sm text-ink-3">Off: only you see amounts. Everyone sees messages.</div></div>
              <Toggle on={showAmounts} onChange={setShowAmounts} label="Show amounts publicly" />
            </div>
          </Section>

          {/* 5 — first gift */}
          <Section n={5} icon={Gift} title="Start it off yourself" sub="Optional. Family is more likely to give when the nest isn't empty."
            right={<Toggle on={firstOn} onChange={setFirstOn} label="Add the first gift yourself" />}>
            {firstOn ? (
              <>
                <p className="mb-2 text-sm font-semibold">Stock</p>
                <div className="flex flex-wrap gap-2">
                  {picks.map((t) => (
                    <button key={t} type="button" onClick={() => setFirstPick(t)} aria-pressed={firstTicker === t}
                      className={clsx("flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-semibold transition", firstTicker === t ? "border-forest bg-forest-soft" : "border-line bg-paper hover:border-ink-3")}>
                      <StockLogo ticker={t} size={24} />{stockBy(t).name}
                    </button>
                  ))}
                </div>
                <p className="mb-2 mt-4 text-sm font-semibold">Amount (USDC)</p>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 50, 100, 250].map((a) => (
                    <button key={a} type="button" onClick={() => setFirstAmount(a)} aria-pressed={firstAmount === a}
                      className={clsx("num h-12 rounded-xl border-2 font-bold transition", firstAmount === a ? "border-forest bg-forest text-white" : "border-line bg-paper")}>${a}</button>
                  ))}
                </div>
                <Label htmlFor="firstMsg" hint="optional">Your message</Label>
                <input id="firstMsg" className={inputCls} maxLength={240} value={firstMsg} onChange={(e) => setFirstMsg(e.target.value)}
                  placeholder={`Welcome to your nest, ${childName.trim() || "little one"}!`} />
                <p className="mt-2 text-sm text-ink-3">
                  {onchainEnabled
                    ? <>When you tap Create, your wallet opens to set up {childName.trim() || "your child"}&apos;s vault on {networkName} and send this gift{opensMode === "date" ? "" : ", which goes straight into the nest"}. The nest is only finished once your gift is in.</>
                    : <>Your gift is added as the nest is created.</>}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-3">Switch on to add a stock gift of your own before you share the link.</p>
            )}
          </Section>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-error-soft px-4 py-3 text-sm font-semibold text-error">{error}</p>}
        <Button block className="mt-6" onClick={submit} disabled={!valid || saving}>
          {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {saving ? progress || "Creating your nest…" : !firstOn ? "Create Stock Nest" : draft.current ? `Try again: add my $${firstAmount} gift` : `Create nest & add my $${firstAmount} gift`}
        </Button>
        {!saving && error && draft.current && (
          <button type="button" className="mt-2 w-full text-center text-sm font-semibold text-forest underline" onClick={() => { setError(null); finish(draft.current!, null); }}>
            Skip the gift and finish creating the nest
          </button>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-ink-3"><ShieldCheck size={15} />No personal details go onchain. Not available to US persons.</p>
      </div>

      {/* live preview */}
      <div className="lg:sticky lg:top-24">
        <p className="mb-2.5 ml-1 mono-label text-ink-2">Live preview: what family sees</p>
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-float">
          <div className="h-28 wash" />
          <div className="relative -mt-14 px-6 pb-6 text-center">
            <ChildAvatar kind={avatar} photo={photo} showPhoto={showPhoto} size={104} className="mx-auto mb-3" alt={`${childName} photo`} />
            <h2 className="font-display text-[28px] font-semibold">{nestName || `${childName.trim() || "Your child"}'s Stock Nest`}</h2>
            {note && <p className="font-display mx-auto mt-2 max-w-[400px] italic text-ink-2">&ldquo;{note}&rdquo;</p>}
            {parentNames && <p className="mt-1.5 text-sm text-ink-3">from {parentNames}</p>}
            <p className="mb-2.5 mt-5 mono-label text-ink-3">Gift one of these stocks</p>
            <div className="flex flex-wrap justify-center gap-2">
              {picks.map((t) => (
                <span key={t} className="flex items-center gap-2 rounded-full bg-sand py-1 pl-1 pr-3 text-[13px] font-semibold"><StockLogo ticker={t} size={24} />{stockBy(t).name}</span>
              ))}
            </div>
            {rules.opensOn && <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-honey-soft px-3 py-1 text-[13px] font-semibold"><CalendarHeart size={14} />Gifts open {fmtDay(rules.opensOn)}</div>}
            <div className="num mt-4 text-sm text-ink-3">{goalNum > 0 ? `Goal $${goalNum.toLocaleString()} in stock gifts` : "No goal set"}</div>
            <div className="mt-4 h-[50px] bg-forest font-mono text-[13px] font-semibold uppercase leading-[50px] tracking-[.06em] text-white">Gift a stock →</div>
          </div>
        </div>
      </div>

      <Celebration
        open={!!created}
        onClose={() => setCreated(null)}
        steps={["Details", "Stocks", "Share"]}
        title={<>Your nest<br />is ready.</>}
        subtitle={<>{created?.nestName} is live. Family can now gift {created?.childName} real stocks.</>}
        shareUrl={url}
        shareTitle={`Gift ${created?.childName ?? ""} a stock 🎁`}
        shareLine="Help spread the word and share this nest"
        secondary={{ label: "Open my parent dashboard", href: created ? `/dashboard/${created.slug}` : "/dashboard" }}
      >
        {created && (
          <div className="flex items-center gap-2 rounded-2xl bg-sand py-1.5 pl-3.5 pr-1.5 text-[15px] font-semibold">
            <ChildAvatar kind={created.avatar} photo={created.photo} showPhoto={created.showPhoto} size={30} ring={false} />
            <span className="min-w-0 flex-1 truncate">{url.replace(/^https?:\/\//, "")}</span>
            <button className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-forest px-3.5 text-sm font-bold text-forest"
              onClick={async () => { try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast(url); } }}>
              <Copy size={14} />Copy
            </button>
          </div>
        )}
        {created && firstGift && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border-2 border-forest bg-forest-soft/40 p-3.5 text-left">
            <StockLogo ticker={firstGift.ticker} size={36} />
            <div className="min-w-0 flex-1">
              <b className="flex items-center gap-1.5 text-[15px]"><Check size={16} className="text-forest" />First gift in: {shares(firstGift.shares)} {stockBy(firstGift.ticker).name}</b>
              <span className="text-sm text-ink-2">
                {firstGift.status === "pending"
                  ? <>{usd(firstGift.usd, 2)} from you, wrapped until {firstGift.unlockAt ? new Date(firstGift.unlockAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "the big day"}, then it goes into the nest automatically.</>
                  : <>{usd(firstGift.usd, 2)} from you{onchainEnabled && firstGift.status === "delivered" ? <>, delivered to {created.childName}&apos;s vault on {networkName}</> : null}.</>}
              </span>
            </div>
          </div>
        )}
        {created && !firstGift && (
          <div className="mt-3 rounded-2xl border border-line p-3.5 text-left">
            <b className="block text-[15px]">Start it off yourself <span className="font-normal text-ink-3">(optional)</span></b>
            <p className="mt-0.5 text-sm text-ink-2">Nests fill faster when family opens the link and sees the first gift is already there.</p>
            <div className="mt-3 grid gap-2">
              {onchainEnabled && (
                vault === "done"
                  ? <p className="flex items-center gap-1.5 text-sm font-semibold text-forest"><Check size={16} />{created.childName}&apos;s vault is live on {networkName}. Your wallet is the guardian.</p>
                  : <Button size="sm" variant="secondary" onClick={setUpVault} disabled={vault === "busy"}>
                      <Wallet size={15} />{vault === "busy" ? "Creating the vault…" : `1. Set up ${created.childName}'s vault on Base`}
                    </Button>
              )}
              <Button size="sm" href={`/n/${created.slug}/gift?from=parent`}>
                <Gift size={15} />{onchainEnabled ? "2. " : ""}Add the first gift
              </Button>
            </div>
            {onchainEnabled && vault !== "done" && <p className="mt-2 text-xs text-ink-3">The vault lets family gift real (testnet) tokenized stocks. Your wallet becomes the guardian, and only you can withdraw.</p>}
            {vaultError && <p role="alert" className="mt-2 text-sm font-semibold text-error">{vaultError}</p>}
          </div>
        )}
      </Celebration>
      {toastNode}
    </div>
  );
}
