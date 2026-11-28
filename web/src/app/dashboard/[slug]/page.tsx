"use client";

import clsx from "clsx";
import { ArrowLeft, Copy, Download, ExternalLink, Lock, Share2 } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ChildAvatar } from "@/components/ChildAvatar";
import { OnchainCard } from "@/components/OnchainCard";
import { StockLogo } from "@/components/StockLogo";
import { AllocationBar, Button, Card, Chip, SeriesDot, StatusChip, Toggle, shareLink, useToast } from "@/components/ui";
import { fetchMyNests, getOwned, updateNest } from "@/lib/api";
import { nestTotals, type Gift, type Nest } from "@/lib/nests";
import { stockBy } from "@/lib/stocks";
import { txUrl } from "@/lib/chain";
import { EscrowActions } from "@/components/EscrowActions";
import { shares, shortDate, usd } from "@/lib/format";

type Filter = "all" | "pending" | "delivered" | "progress" | "returned";
const FILTERS: { id: Filter; label: string; match: (g: Gift) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "pending", label: "Wrapped", match: (g) => g.status === "pending" },
  { id: "delivered", label: "Delivered", match: (g) => g.status === "delivered" },
  { id: "progress", label: "In progress", match: (g) => g.status === "usdc_received" || g.status === "buying" },
  { id: "returned", label: "Returned", match: (g) => g.status === "returned" || g.status === "failed" },
];

type State = { status: "loading" } | { status: "denied" } | { status: "ready"; nest: Nest; token: string | null };

export default function NestDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [state, setState] = useState<State>({ status: "loading" });
  const { toast, toastNode } = useToast();

  useEffect(() => {
    (async () => {
      const token = getOwned()[slug] ?? null;
      if (token) {
        const { nests } = await fetchMyNests({ [slug]: token });
        if (nests[0]) return setState({ status: "ready", nest: nests[0], token });
      }
      setState({ status: "denied" });
    })().catch(() => setState({ status: "denied" }));
  }, [slug]);

  if (state.status === "loading") return <div className="py-24"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-forest border-t-transparent" /></div>;
  if (state.status === "denied") {
    return (
      <div className="mx-auto max-w-[520px] px-4 py-20 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-sand"><Lock /></span>
        <h1 className="font-display text-3xl font-semibold">Only the parent can see this</h1>
        <p className="mt-3 text-ink-2">This dashboard opens on the device that created the nest. Wallet sign-in, which works on any device, is coming soon.</p>
        <div className="mt-6 flex justify-center gap-3"><Button href={`/n/${slug}`} variant="secondary">View public page</Button><Button href="/dashboard">My dashboard</Button></div>
      </div>
    );
  }
  return <Tracker nest={state.nest} token={state.token} toast={toast} toastNode={toastNode} onSaved={(n) => setState({ ...state, nest: n })} />;
}

function Tracker({ nest, token, toast, toastNode, onSaved }: { nest: Nest; token: string | null; toast: (m: string) => void; toastNode: React.ReactNode; onSaved: (n: Nest) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const t = useMemo(() => nestTotals(nest), [nest]);
  const example = !token;
  const url = typeof window !== "undefined" ? `${window.location.origin}/n/${nest.slug}` : `/n/${nest.slug}`;

  const counts = {
    pending: nest.gifts.filter((g) => g.status === "pending").length,
    delivered: nest.gifts.filter((g) => g.status === "delivered").length,
    progress: nest.gifts.filter((g) => g.status === "usdc_received" || g.status === "buying").length,
    returned: nest.gifts.filter((g) => g.status === "returned" || g.status === "failed").length,
  };
  const givers = useMemo(() => {
    const m = new Map<string, { name: string; gifts: number; usd: number; private: boolean }>();
    for (const g of nest.gifts.filter((x) => x.status !== "returned" && x.status !== "failed" && x.status !== "pending")) {
      const k = g.from;
      const e = m.get(k) ?? { name: g.from, gifts: 0, usd: 0, private: g.isPrivate };
      e.gifts++; e.usd += g.usd;
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.usd - a.usd);
  }, [nest]);
  const rows = nest.gifts.filter(FILTERS.find((f) => f.id === filter)!.match);

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Date", "From", "Private", "Stock", "Shares", "USD at gift", "Occasion", "Message", "Status", "Receipt"];
    const body = nest.gifts.map((g) => [g.createdAt, g.from, g.isPrivate ? "yes" : "no", g.ticker, g.shares, g.usd, g.occasion, g.message, g.status, g.txHash ?? ""].map(esc).join(","));
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${nest.slug}-gifts.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-16 pt-4 md:px-8">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 font-semibold text-forest"><ArrowLeft size={18} />All nests</Link>
      {example && <div className="mb-5 rounded-2xl border border-line bg-honey-soft px-5 py-3.5 text-sm"><b>Example data.</b> <span className="text-ink-2">Settings are read-only here. Create your own nest to manage it.</span></div>}

      {/* header */}
      <div className="mb-6 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 sm:flex sm:flex-wrap">
        <ChildAvatar kind={nest.avatar} photo={nest.photo} showPhoto={nest.showPhoto} size={64} />
        <div className="min-w-0 sm:flex-1">
          <h1 className="font-display text-[24px] font-semibold leading-tight sm:text-[28px] md:text-[36px]">{nest.nestName}</h1>
          <p className="break-all text-sm text-ink-3">Created {shortDate(nest.createdAt)}. Shared at <span className="text-ink-2">{url.replace(/^https?:\/\//, "")}</span></p>
        </div>
        <div className="col-span-2 flex flex-wrap gap-2">
          <Button href={`/n/${nest.slug}`} variant="secondary" size="sm"><ExternalLink size={16} />View page</Button>
          <Button size="sm" onClick={() => shareLink(url, `Gift ${nest.childName} a stock 🎁`, toast)}><Share2 size={16} />Share</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card className="p-5">
          <div className="text-sm text-ink-3">Gifted in stocks</div>
          <div className="num font-display mt-1.5 text-[30px] font-bold">{usd(t.total)}</div>
          {nest.goal ? (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-forest" style={{ width: `${t.pct * 100}%` }} /></div>
              <div className="num mt-1.5 text-xs text-ink-3">{Math.round(t.pct * 100)}% of {usd(nest.goal)} goal</div>
            </>
          ) : <div className="mt-1 text-xs text-ink-3">No goal set</div>}
        </Card>
        <Card className="p-5"><div className="text-sm text-ink-3">Stock gifts</div><div className="num font-display mt-1.5 text-[30px] font-bold">{t.giftCount}</div><div className="mt-1 text-xs text-ink-3">{counts.progress ? `${counts.progress} in progress` : "All settled"}</div></Card>
        <Card className="p-5"><div className="text-sm text-ink-3">Family givers</div><div className="num font-display mt-1.5 text-[30px] font-bold">{t.givers}</div></Card>
        <Card className="p-5"><div className="text-sm text-ink-3">Different stocks</div><div className="num font-display mt-1.5 text-[30px] font-bold">{t.holdings.length}</div></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="grid gap-6">
          {/* holdings */}
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-xl font-bold">{nest.childName}&apos;s stocks</h2><Chip tone="base">Held in the nest</Chip></div>
            {t.holdings.length === 0 ? <p className="py-4 text-ink-3">No stocks yet. Share the link with family to get the first gift.</p> : (
              <>
                <AllocationBar holdings={t.holdings} className="mb-2" />
                {t.holdings.map((h) => (
                  <div key={h.ticker} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                    <StockLogo ticker={h.ticker} size={38} />
                    <div className="min-w-0 flex-1"><b className="flex items-center gap-2">{stockBy(h.ticker).name}<SeriesDot ticker={h.ticker} /></b><div className="num text-sm text-ink-3">{shares(h.shares)} shares from {h.gifts} {h.gifts === 1 ? "gift" : "gifts"}</div></div>
                    <div className="text-right"><b className="num">{usd(h.usd)}</b><div className="num text-xs text-ink-3">{Math.round((h.usd / (t.total || 1)) * 100)}% of nest</div></div>
                  </div>
                ))}
              </>
            )}
          </Card>

          {/* gifts */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Every gift</h2>
              <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!nest.gifts.length}><Download size={16} />Export CSV</Button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Filter gifts by status">
              {FILTERS.map((f) => {
                const n = f.id === "all" ? nest.gifts.length : counts[f.id as keyof typeof counts];
                return (
                  <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
                    className={clsx("rounded-full px-3.5 py-1.5 text-sm font-semibold transition", filter === f.id ? "bg-forest text-white" : "bg-sand text-ink-2 hover:text-ink")}>
                    {f.label} <span className="num opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
            {rows.length === 0 && <p className="py-6 text-center text-ink-3">Nothing here yet.</p>}
            {rows.map((g) => (
              <div key={g.id} className="flex gap-3 border-b border-line py-3.5 last:border-0">
                <StockLogo ticker={g.ticker} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <b>{g.from}</b>
                    {g.isPrivate && <Chip xs>Private, hidden on public page</Chip>}
                    <Chip tone="honey" xs>{g.occasion}</Chip>
                  </div>
                  <div className="num mt-0.5 text-sm text-ink-2">{shares(g.shares)} {stockBy(g.ticker).name}{g.mode === "own" ? ", sent from their own shares" : ""}</div>
                  {g.message && <p className="font-display mt-1 break-words italic text-ink-2">&ldquo;{g.message}&rdquo;</p>}
                  <div className="mt-1 text-xs text-ink-3">{shortDate(g.createdAt)}{txUrl(g.txHash ?? "") ? <>, <a className="text-forest underline" href={txUrl(g.txHash!)!} target="_blank" rel="noopener noreferrer">receipt on BaseScan</a></> : g.txHash ? ", simulated" : ""}</div>
                  <EscrowActions slug={nest.slug} gift={g} role="guardian"
                    onUpdated={(u) => onSaved({ ...nest, gifts: nest.gifts.map((x) => (x.id === u.id ? u : x)) })} />
                </div>
                <div className="text-right"><b className="num">{usd(g.usd)}</b><div className="mt-0.5"><StatusChip status={g.status} /></div></div>
              </div>
            ))}
          </Card>
        </div>

        <div className="grid gap-6">
          {/* givers */}
          <Card>
            <h2 className="mb-1 text-xl font-bold">Family givers</h2>
            {givers.length === 0 && <p className="py-4 text-ink-3">No givers yet.</p>}
            {givers.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                <span className="num w-5 text-sm font-bold text-ink-3">{i + 1}</span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-forest-soft font-bold text-forest">{p.name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="text-xs text-ink-3">{p.gifts} {p.gifts === 1 ? "gift" : "gifts"}{p.private ? ", gives privately" : ""}</span></div>
                <b className="num">{usd(p.usd)}</b>
              </div>
            ))}
          </Card>

          <OnchainCard nest={nest} token={token} onLinked={onSaved} />

          <Settings nest={nest} token={token} toast={toast} onSaved={onSaved} />

          <Card className="bg-forest-soft shadow-none">
            <h3 className="text-lg font-bold">Gift progress, honestly</h3>
            <p className="mt-1.5 text-sm text-ink-2">Amounts show the value when each gift was made, not today&apos;s value. A gift is <b>in progress</b> while USDC is received and the stock is being bought, and <b>returned</b> if a stock&apos;s transfer rules don&apos;t allow delivery.</p>
          </Card>
        </div>
      </div>
      {toastNode}
    </div>
  );
}

function Settings({ nest, token, toast, onSaved }: { nest: Nest; token: string | null; toast: (m: string) => void; onSaved: (n: Nest) => void }) {
  const [showAmounts, setShowAmounts] = useState(nest.showAmounts);
  const [showPhoto, setShowPhoto] = useState(nest.showPhoto);
  const [goal, setGoal] = useState(nest.goal ? String(nest.goal) : "");
  const [note, setNote] = useState(nest.note);
  const [saving, setSaving] = useState(false);
  const readOnly = !token;
  const dirty = showAmounts !== nest.showAmounts || showPhoto !== nest.showPhoto || goal !== (nest.goal ? String(nest.goal) : "") || note !== nest.note;

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const g = parseInt(goal, 10);
      await updateNest(nest.slug, token, { showAmounts, showPhoto, note: note.trim(), goal: g > 0 ? g : null });
      onSaved({ ...nest, showAmounts, showPhoto, note: note.trim(), goal: g > 0 ? g : undefined });
      toast("Saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-xl font-bold">Page settings</h2>
      <fieldset disabled={readOnly} className="grid gap-3 disabled:opacity-60">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3"><span className="text-[15px]">Show gift amounts publicly</span><Toggle on={showAmounts} onChange={setShowAmounts} label="Show gift amounts publicly" /></div>
        {nest.photo && <div className="flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3"><span className="text-[15px]">Show {nest.childName}&apos;s photo</span><Toggle on={showPhoto} onChange={setShowPhoto} label="Show photo" /></div>}
        <label className="text-sm font-semibold" htmlFor="goal">Goal</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-ink-2">$</span>
          <input id="goal" inputMode="numeric" placeholder="No goal" value={goal ? Number(goal).toLocaleString("en-US") : ""}
            onChange={(e) => setGoal(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9))}
            className="num w-full rounded-[3px] border border-[#CDD2DC] bg-paper py-3 pl-8 pr-3.5 outline-none focus:border-forest" />
        </div>
        <label className="text-sm font-semibold" htmlFor="note">Note to family</label>
        <textarea id="note" maxLength={180} value={note} onChange={(e) => setNote(e.target.value)}
          className="font-display min-h-20 w-full rounded-[3px] border border-[#CDD2DC] bg-paper px-3.5 py-3 italic outline-none focus:border-forest" />
      </fieldset>
      {!readOnly && <Button block className="mt-4" onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : dirty ? "Save changes" : "Saved"}</Button>}
      {!readOnly && (
        <button className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest" onClick={async () => { try { await navigator.clipboard.writeText(`${location.origin}/n/${nest.slug}`); toast("Link copied"); } catch { /* ignore */ } }}>
          <Copy size={14} />Copy the gift link
        </button>
      )}
    </Card>
  );
}
