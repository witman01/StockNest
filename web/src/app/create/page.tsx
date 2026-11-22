"use client";

import clsx from "clsx";
import { Copy, Eye, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { AVATAR_KINDS, ChildAvatar } from "@/components/ChildAvatar";
import { Celebration } from "@/components/Celebration";
import { PhotoUpload } from "@/components/PhotoUpload";
import { StockLogo } from "@/components/StockLogo";
import { Button, Card, Toggle, useToast } from "@/components/ui";
import type { AvatarKind } from "@/lib/nests";
import { createNest, saveOwned, uploadPhoto } from "@/lib/api";

type Created = { slug: string; nestName: string; childName: string; avatar: AvatarKind; photo?: string; showPhoto: boolean };
import { STOCKS, stockBy } from "@/lib/stocks";

const Label = ({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) => (
  <label htmlFor={htmlFor} className="mb-2 mt-5 block text-sm font-semibold">{children} {hint && <span className="font-normal text-ink-3">({hint})</span>}</label>
);
const inputCls = "w-full rounded-[10px] border-2 border-line bg-paper px-3.5 py-3 text-base outline-none transition focus:border-forest";

export default function CreatePage() {
  const { toast, toastNode } = useToast();

  const [childName, setChildName] = useState("Amelia");
  const [nestName, setNestName] = useState("Amelia's Stock Nest");
  const [nameTouched, setNameTouched] = useState(false);
  const [avatar, setAvatar] = useState<AvatarKind>("amelia");
  const [photo, setPhoto] = useState<string | undefined>();
  const [showPhoto, setShowPhoto] = useState(true);
  const [picks, setPicks] = useState<string[]>(["SPY", "AAPL", "NVDA"]);
  const [goal, setGoal] = useState("5000");
  const [note, setNote] = useState("Help us give Amelia a head start. Gift her a piece of the companies shaping her future.");
  const [parentNames, setParentNames] = useState("");
  const [showAmounts, setShowAmounts] = useState(true);
  const [created, setCreated] = useState<Created | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const photoUrl = photo ? await uploadPhoto(photo) : undefined;
      const finalName = nestName.trim() || `${childName.trim()}'s Stock Nest`;
      const { slug, manageToken } = await createNest({
        childName: childName.trim(), nestName: finalName, avatar, photo: photoUrl, showPhoto: !!photo && showPhoto,
        note: note.trim(), parentNames: parentNames.trim(), goal: goalNum > 0 ? Math.round(goalNum) : undefined, picks, showAmounts,
      });
      saveOwned(slug, manageToken);
      setCreated({ slug, nestName: finalName, childName: childName.trim(), avatar, photo, showPhoto: !!photo && showPhoto });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
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
        <input id="childName" className={inputCls} value={childName} maxLength={24}
          onChange={(e) => { setChildName(e.target.value); if (!nameTouched) setNestName(`${e.target.value.trim() || "Your child"}'s Stock Nest`); }} />
        {errors.childName && <p className="mt-1.5 text-sm text-error">{errors.childName}</p>}

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
        <input id="nestName" className={inputCls} value={nestName} maxLength={40} onChange={(e) => { setNestName(e.target.value); setNameTouched(true); }} />

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
        <textarea id="note" className={clsx(inputCls, "font-display min-h-24 text-[17px] italic")} value={note} maxLength={180} onChange={(e) => setNote(e.target.value)} />

        <Label htmlFor="parents" hint="how the note is signed">From</Label>
        <input id="parents" className={inputCls} placeholder="e.g. Daniel & Grace" value={parentNames} onChange={(e) => setParentNames(e.target.value)} />

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3.5">
          <div><b className="text-[15px]">Show gift amounts publicly</b><div className="text-sm text-ink-3">Off means only you see amounts, and everyone sees messages.</div></div>
          <Toggle on={showAmounts} onChange={setShowAmounts} label="Show amounts publicly" />
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-error-soft px-4 py-3 text-sm font-semibold text-error">{error}</p>}
        <Button block className="mt-6" onClick={submit} disabled={!valid || saving}>
          {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {saving ? "Creating your nest…" : "Create Stock Nest"}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-ink-3"><ShieldCheck size={15} />No personal details go onchain.</p>
      </Card>

      {/* live preview */}
      <div className="lg:sticky lg:top-24">
        <p className="mb-2.5 ml-1 text-xs font-bold uppercase tracking-[.06em] text-ink-2">Live preview: what family sees</p>
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-float">
          <div className="h-28 wash" />
          <div className="relative -mt-14 px-6 pb-6 text-center">
            <ChildAvatar kind={avatar} photo={photo} showPhoto={showPhoto} size={104} className="mx-auto mb-3" alt={`${childName} photo`} />
            <h2 className="font-display text-[28px] font-semibold">{nestName || "Stock Nest"}</h2>
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
      </Celebration>
      {toastNode}
    </div>
  );
}
