"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChildAvatar } from "@/components/ChildAvatar";
import { StockLogo } from "@/components/StockLogo";
import { AllocationBar, Button, Card, Chip, StatusChip, shareLink, useToast } from "@/components/ui";
import { fetchMyNests, getOwned } from "@/lib/api";
import { nestTotals, type Nest } from "@/lib/nests";
import { stockBy } from "@/lib/stocks";
import { shares, shortDate, usd } from "@/lib/format";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; nests: Nest[] };

export default function Dashboard() {
  const [state, setState] = useState<State>({ status: "loading" });
  const { toast, toastNode } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const owned = getOwned();
        const mine = Object.keys(owned).length ? (await fetchMyNests(owned)).nests : [];
        setState({ status: "ready", nests: mine });
      } catch (e) {
        setState({ status: "error", message: e instanceof Error ? e.message : "Couldn't load your nests." });
      }
    })();
  }, []);

  if (state.status === "loading") return <div className="py-24"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-forest border-t-transparent" /></div>;
  if (state.status === "error") return <p className="py-24 text-center text-error">{state.message}</p>;

  const { nests } = state;
  if (nests.length === 0) {
    return (
      <div className="mx-auto max-w-[520px] px-4 py-20 text-center">
        <span className="text-xs font-bold uppercase tracking-[.06em] text-ink-2">Parent dashboard</span>
        <h1 className="font-display mt-2 text-3xl font-semibold">No nests yet</h1>
        <p className="mt-3 text-ink-2">Create a Stock Nest for your child and it will appear here, with every gift and giver. Nests you created on another device open there.</p>
        <div className="mt-6 flex justify-center"><Button href="/create"><Plus size={18} />Create a Stock Nest</Button></div>
      </div>
    );
  }
  const totals = nests.map((n) => ({ nest: n, t: nestTotals(n) }));
  const all = totals.reduce((a, { t }) => ({ usd: a.usd + t.total, gifts: a.gifts + t.giftCount }), { usd: 0, gifts: 0 });
  const givers = new Set(nests.flatMap((n) => n.gifts.map((g) => g.from)));
  const recent = nests.flatMap((n) => n.gifts.map((g) => ({ g, n }))).sort((a, b) => b.g.createdAt.localeCompare(a.g.createdAt)).slice(0, 6);

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-16 pt-4 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[.06em] text-ink-2">Parent dashboard</span>
          <h1 className="font-display mt-1 text-[30px] font-semibold md:text-[40px]">Your family&apos;s nests 👋</h1>
        </div>
        <Button href="/create" size="sm"><Plus size={18} />New Stock Nest</Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[["Gifted in stocks", usd(all.usd)], ["Stock gifts", String(all.gifts)], ["Family givers", String(givers.size)], [nests.length === 1 ? "Nest" : "Nests", String(nests.length)]].map(([k, v]) => (
          <Card key={k} className="p-5"><div className="text-sm text-ink-3">{k}</div><div className="num font-display mt-1.5 text-[30px] font-bold">{v}</div></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Card>
          <h2 className="mb-1 text-xl font-bold">Your children&apos;s nests</h2>
          {totals.map(({ nest, t }) => (
            <div key={nest.slug} className="flex items-center gap-4 border-b border-line py-4 last:border-0">
              <ChildAvatar kind={nest.avatar} photo={nest.photo} showPhoto={nest.showPhoto} size={60} className="border-2!" />
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap justify-between gap-2"><b>{nest.nestName}</b><span className="num text-ink-2">{usd(t.total)}{nest.goal ? ` of ${usd(nest.goal)}` : ""}</span></div>
                {t.holdings.length ? <AllocationBar holdings={t.holdings} /> : <div className="h-3 rounded-full bg-sand" />}
                <div className="mt-2 flex items-center gap-2 text-sm text-ink-3">
                  <span className="flex -space-x-1.5">{t.holdings.map((h) => <StockLogo key={h.ticker} ticker={h.ticker} size={24} />)}</span>
                  {t.holdings.length ? `${t.giftCount} gifts from ${t.givers} people` : "No gifts yet. Share the link!"}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button href={`/dashboard/${nest.slug}`} size="sm">Track <ArrowRight size={16} /></Button>
                  <Button href={`/n/${nest.slug}`} variant="secondary" size="sm">View page</Button>
                  <Button variant="ghost" size="sm" onClick={() => shareLink(`${window.location.origin}/n/${nest.slug}`, `Gift ${nest.childName} a stock 🎁`, toast)}>Share link</Button>
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <div className="mb-1 flex items-center justify-between gap-2"><h2 className="text-xl font-bold">Latest gifts</h2><Chip tone="base">Base Sepolia</Chip></div>
          {recent.length === 0 && <p className="py-6 text-ink-3">Gifts will show up here the moment family sends them.</p>}
          {recent.map(({ g, n }) => (
            <Link key={n.slug + g.id} href={`/dashboard/${n.slug}`} className="flex items-center gap-3 border-b border-line py-3 last:border-0 hover:opacity-80">
              <StockLogo ticker={g.ticker} size={38} />
              <div className="min-w-0 flex-1">
                <div className="truncate"><b>{g.from}</b> to {n.childName}</div>
                <div className="num truncate text-[13px] text-ink-3">{shares(g.shares)} {stockBy(g.ticker).ticker}, {shortDate(g.createdAt)}</div>
              </div>
              <div className="text-right"><b className="num">{usd(g.usd)}</b><div><StatusChip status={g.status} /></div></div>
            </Link>
          ))}
        </Card>
      </div>
      {toastNode}
    </div>
  );
}
