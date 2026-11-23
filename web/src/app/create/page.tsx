"use client";

import clsx from "clsx";
import { Check, Copy, Eye, Gift, ShieldCheck, Wallet } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AVATAR_KINDS, ChildAvatar } from "@/components/ChildAvatar";
import { Celebration } from "@/components/Celebration";
import { PhotoUpload } from "@/components/PhotoUpload";
import { StockLogo } from "@/components/StockLogo";
import { Button, Card, Toggle, useToast } from "@/components/ui";
import type { AvatarKind, Gift as GiftT } from "@/lib/nests";
import { createNest, saveOwned, sendGift, syncGift, uploadPhoto } from "@/lib/api";
import { networkName, onchainEnabled } from "@/lib/chain";
import { claimOnchainGift, connectWallet, createOnchainNest, hasBrowserWallet, sendStockGift, walletError } from "@/lib/wallet";

type Created = { slug: string; token: string; nestName: string; childName: string; avatar: AvatarKind; photo?: string; showPhoto: boolean };
import { STOCKS, stockBy } from "@/lib/stocks";
import { shares, usd } from "@/lib/format";

const Label = ({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) => (
  <label htmlFor={htmlFor} className="mb-2 mt-5 block text-sm font-semibold">{children} {hint && <span className="font-normal text-ink-3">({hint})</span>}</label>
);
const inputCls = "w-full rounded-[10px] border-2 border-line bg-paper px-3.5 py-3 text-base outline-none transition focus:border-forest";

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

  /** Parent's own first gift, done before the nest is shown as ready: vault → gift → accept. */
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
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 86400 + 120;
    const txHash = await sendStockGift({ wallet, nestId: d.chainNestId, usdAmount: firstAmount, quote, message, unlockAt: 0, expiresAt, onStep: setProgress });
    setProgress("Recording your gift…");
    let { gift } = await sendGift(d.slug, { mode: "buy", ticker: firstTicker, txHash, from, isPrivate: false, occasion, message });
    // You're the giver and the guardian, so accept it into the nest right away.
    if (gift.chainGiftId) {
      try {
        setProgress("Accepting it into the nest…");
        const claimTx = await claimOnchainGift(wallet, gift.chainGiftId);
        gift = (await syncGift(d.slug, gift.id, claimTx)).gift;
      } catch { /* stays "waiting to be accepted"; they can accept it from the dashboard */ }
    }
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
  }), [childName, picks]);
  const valid = !errors.childName && !errors.picks;

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
          note: note.trim(), parentNames: parentNames.trim(), goal: goalNum > 0 ? Math.round(goalNum) : undefined, picks, showAmounts,
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
      <Card>
        <span className="text-xs font-bold uppercase tracking-[.06em] text-forest">For parents & guardians</span>
        <h1 className="font-display mt-1.5 text-[30px] font-semibold md:text-[38px]">Create a Stock Nest</h1>
        <p className="mt-2 text-ink-2">We only ask for what the gift page needs. No surnames, birthdays or schools.</p>

        <Label htmlFor="childName">Child&apos;s display name</Label>
        <input id="childName" className={inputCls} value={childName} maxLength={24} placeholder="e.g. Zara" onBlur={() => setChildTouched(true)}
          onChange={(e) => { setChildName(e.target.value); if (!nameTouched) setNestName(`${e.target.value.trim() || "Your child"}'s Stock Nest`); }} />
        {errors.childName && childTouched && <p className="mt-1.5 text-sm text-error">{errors.childName}</p>}

        <Label>Profile photo</Label>
        <PhotoUpload value={photo} onChange={(p) => { setPhoto(p); if (p) setShowPhoto(true); }} />
        {photo && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3.5">
            <div>
              <b className="flex items-center gap-1.5 text-[15px]"><Eye size={16} />Show photo on the shared page</b>
              <div className="text-sm text-ink-3">Anyone with the link can see it. It also appears when the link is shared.</div>
            </div>
            <Toggle on={showPhoto} onChange={setShowPhoto} label="Show photo on shared page" />
          </div>
        )}
        {!photo || !showPhoto ? (
          <>
            <p className="mb-2 mt-4 text-sm text-ink-2">{photo ? "We'll show this avatar instead:" : "No photo? Pick an avatar instead:"}</p>
            <div className="flex flex-wrap gap-2.5">
              {AVATAR_KINDS.map((k) => (
                <button key={k} type="button" onClick={() => setAvatar(k)} aria-label={`${k} avatar`} aria-pressed={avatar === k}
                  className={clsx("rounded-full border-[3px] p-0", avatar === k ? "border-forest" : "border-transparent")}>
                  <ChildAvatar kind={k} size={52} ring={false} />
                </button>
              ))}
            </div>
          </>
        ) : null}

        <Label htmlFor="nestName">Nest name</Label>
        <input id="nestName" className={inputCls} value={nestName} maxLength={40} placeholder={`${childName.trim() || "Your child"}'s Stock Nest`} onChange={(e) => { setNestName(e.target.value); setNameTouched(true); }} />

        <Label hint="choose up to 6">Stocks family can gift</Label>
        <div className="flex flex-wrap gap-2">
          {STOCKS.map((s) => {
            const on = picks.includes(s.ticker);
            return (
              <button key={s.ticker} type="button" onClick={() => togglePick(s.ticker)} aria-pressed={on}
                className={clsx("flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3.5 text-sm font-semibold transition", on ? "border-forest bg-forest-soft" : "border-line bg-paper hover:border-ink-3")}>
                <StockLogo ticker={s.ticker} size={28} />{s.name}
              </button>
            );
          })}
        </div>
        {errors.picks ? <p className="mt-1.5 text-sm text-error">{errors.picks}</p> : <p className="mt-2 text-sm text-ink-3">Only tokenized stocks eligible on Base are offered. You can change these anytime.</p>}

        <Label htmlFor="goal" hint="optional, total value gifted">Goal</Label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-ink-2">$</span>
          <input id="goal" className={clsx(inputCls, "num pl-8")} inputMode="numeric" value={goal ? Number(goal).toLocaleString("en-US") : ""} placeholder="5,000" onChange={(e) => setGoal(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9))} />
        </div>

        <Label htmlFor="note">A note to family & friends</Label>
        <textarea id="note" className={clsx(inputCls, "font-display min-h-24 text-[17px] italic")} value={note} maxLength={180} onChange={(e) => setNote(e.target.value)}
          placeholder={`Instead of another toy this year, help us give ${childName.trim() || "our child"} a piece of the companies shaping their future.`} />

        <Label htmlFor="parents" hint="how the note is signed">From</Label>
        <input id="parents" className={inputCls} placeholder="e.g. Daniel & Grace" value={parentNames} onChange={(e) => setParentNames(e.target.value)} />

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3.5">
          <div><b className="text-[15px]">Show gift amounts publicly</b><div className="text-sm text-ink-3">Off means only you see amounts, and everyone sees messages.</div></div>
          <Toggle on={showAmounts} onChange={setShowAmounts} label="Show amounts publicly" />
        </div>

        <div className={clsx("mt-4 rounded-2xl border-2 px-4 py-3.5 transition", firstOn ? "border-forest bg-forest-soft/40" : "border-dashed border-line")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <b className="flex items-center gap-1.5 text-[15px]"><Gift size={16} />Add the first gift yourself <span className="font-normal text-ink-3">(optional)</span></b>
              <div className="text-sm text-ink-3">Family is more likely to give when the nest isn&apos;t empty.</div>
            </div>
            <Toggle on={firstOn} onChange={setFirstOn} label="Add the first gift yourself" />
          </div>
          {firstOn && (
            <div className="mt-3">
              <p className="mb-2 text-sm font-semibold">Stock</p>
              <div className="flex flex-wrap gap-2">
                {picks.map((t) => (
                  <button key={t} type="button" onClick={() => setFirstPick(t)} aria-pressed={firstTicker === t}
                    className={clsx("flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-semibold transition", firstTicker === t ? "border-forest bg-paper" : "border-line bg-paper hover:border-ink-3")}>
                    <StockLogo ticker={t} size={24} />{stockBy(t).name}
                  </button>
                ))}
              </div>
              <p className="mb-2 mt-4 text-sm font-semibold">Amount (USDC)</p>
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((a) => (
                  <button key={a} type="button" onClick={() => setFirstAmount(a)} aria-pressed={firstAmount === a}
                    className={clsx("num h-12 rounded-xl border-2 font-bold transition", firstAmount === a ? "border-forest bg-forest text-white" : "border-line bg-paper")}>${a}</button>
                ))}
              </div>
              <label htmlFor="firstMsg" className="mb-2 mt-4 block text-sm font-semibold">Your message <span className="font-normal text-ink-3">(optional)</span></label>
              <input id="firstMsg" className={inputCls} maxLength={240} value={firstMsg} onChange={(e) => setFirstMsg(e.target.value)}
                placeholder={`Welcome to your nest, ${childName.trim() || "little one"}!`} />
              <p className="mt-2 text-sm text-ink-3">
                {onchainEnabled
                  ? <>When you tap Create, your wallet opens to set up {childName.trim() || "your child"}&apos;s vault on {networkName}, send this gift and accept it into the nest (a few confirmations). The nest is only finished once your gift is in.</>
                  : <>Your gift is added as the nest is created.</>}
              </p>
            </div>
          )}
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
      </Card>

      {/* live preview */}
      <div className="lg:sticky lg:top-24">
        <p className="mb-2.5 ml-1 text-xs font-bold uppercase tracking-[.06em] text-ink-2">Live preview: what family sees</p>
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-float">
          <div className="h-28 wash" />
          <div className="relative -mt-14 px-6 pb-6 text-center">
            <ChildAvatar kind={avatar} photo={photo} showPhoto={showPhoto} size={104} className="mx-auto mb-3" alt={`${childName} photo`} />
            <h2 className="font-display text-[28px] font-semibold">{nestName || `${childName.trim() || "Your child"}'s Stock Nest`}</h2>
            {note && <p className="font-display mx-auto mt-2 max-w-[400px] italic text-ink-2">&ldquo;{note}&rdquo;</p>}
            {parentNames && <p className="mt-1.5 text-sm text-ink-3">from {parentNames}</p>}
            <p className="mb-2.5 mt-5 text-xs font-bold uppercase tracking-[.06em] text-ink-3">Gift one of these stocks</p>
            <div className="flex flex-wrap justify-center gap-2">
              {picks.map((t) => (
                <span key={t} className="flex items-center gap-2 rounded-full bg-sand py-1 pl-1 pr-3 text-[13px] font-semibold"><StockLogo ticker={t} size={24} />{stockBy(t).name}</span>
              ))}
            </div>
            <div className="num mt-4 text-sm text-ink-3">{goalNum > 0 ? `Goal $${goalNum.toLocaleString()} in stock gifts` : "No goal set"}</div>
            <div className="mt-4 h-[52px] rounded-full bg-forest text-base font-bold leading-[52px] text-white">🎁 Gift a Stock</div>
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
                  ? <>{usd(firstGift.usd, 2)} is waiting for you to accept it on your dashboard.</>
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
