"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { EscrowActions } from "@/components/EscrowActions";
import { ChildAvatar } from "@/components/ChildAvatar";
import { StockLogo } from "@/components/StockLogo";
import { AllocationBar, Button, Card, Chip, ProgressRing, SeriesDot, shareLink, useToast } from "@/components/ui";
import type { PublicNest } from "@/lib/nests";
import { stockBy } from "@/lib/stocks";
import { addressUrl, txUrl } from "@/lib/chain";
import { shares, shortDate, usd } from "@/lib/format";

const AV_COLORS = ["#0C513F", "#4E8F86", "#B7834F", "#3E5A73", "#8A948F", "#6B4226"];

export function GiftPage({ nest: initial }: { nest: PublicNest }) {
  const [nest, setNest] = useState(initial);
  const { toast, toastNode } = useToast();
  const t = nest.totals;
  const share = () => shareLink(window.location.href, `Gift ${nest.childName} a stock 🎁`, toast);

  return (
    <div className="mx-auto max-w-[560px] px-4 pb-16 pt-4">
      <div className="fade-up overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
        <div className="wash relative h-32 overflow-hidden">
          <span className="fs-twinkle absolute left-[30%] top-6 text-honey">✦</span>
          <span className="fs-twinkle absolute right-[22%] top-10 text-sage" style={{ animationDelay: "1s" }}>✦</span>
        </div>
        <div className="relative -mt-14 px-6 pb-6 text-center">
          <ChildAvatar kind={nest.avatar} photo={nest.photo} showPhoto={nest.showPhoto} size={112} className="mx-auto mb-3" alt={nest.childName} />
          {nest.milestone && <Chip tone="honey">{nest.milestone}</Chip>}
          <h1 className="font-display mt-2.5 text-[32px] font-semibold leading-tight">{nest.nestName}</h1>
          {nest.note && <p className="font-display mx-auto mt-2.5 max-w-[420px] text-lg italic text-ink-2">&ldquo;{nest.note}&rdquo;</p>}
          <p className="mt-1.5 text-sm text-ink-3">from {nest.parentNames}</p>

          <div className="my-6 flex items-center justify-center gap-5 text-left">
            {nest.goal ? <ProgressRing pct={t.pct} /> : null}
            <div>
              <div className="num font-display text-[34px] font-bold leading-none">{usd(t.total)}</div>
              <div className="mt-1 text-ink-2">gifted in stocks so far</div>
              <div className="num mt-0.5 text-sm text-ink-3">{nest.goal ? `of a ${usd(nest.goal)} goal, ` : ""}{t.giftCount} {t.giftCount === 1 ? "gift" : "gifts"}</div>
            </div>
          </div>

          <div className="grid gap-2.5">
            <Button href={`/n/${nest.slug}/gift`} block>🎁 Gift a Stock</Button>
            <Button variant="secondary" block onClick={share}><Share2 size={18} />Share with family</Button>
          </div>
          <p className="mt-3.5 text-[13px] text-ink-3">Values are shown at the time of each gift. Stocks can go up or down. Demo prices.</p>
        </div>
      </div>

      {t.holdings.length > 0 && (
        <>
          <div className="mx-1 mb-3 mt-8 flex items-center justify-between"><h2 className="font-display text-[26px] font-semibold">{nest.childName}&apos;s stocks</h2>{nest.vault && addressUrl(nest.vault) ? <a href={addressUrl(nest.vault)!} target="_blank" rel="noopener noreferrer"><Chip tone="base">Vault on BaseScan ↗</Chip></a> : <Chip tone="base">Held on Base</Chip>}</div>
          <Card className="px-5 py-3">
            <AllocationBar holdings={t.holdings} showValues={nest.showAmounts} className="mb-1.5 mt-2" />
            {t.holdings.map((h) => (
              <div key={h.ticker} className="flex items-center gap-3 border-b border-line py-3.5 last:border-0">
                <StockLogo ticker={h.ticker} size={42} />
                <div className="min-w-0 flex-1">
                  <b className="flex items-center gap-2">{stockBy(h.ticker).name}<SeriesDot ticker={h.ticker} /></b>
                  <div className="num text-sm text-ink-3">{shares(h.shares)} shares from {h.gifts} {h.gifts === 1 ? "gift" : "gifts"}</div>
                </div>
                {nest.showAmounts && <div className="text-right"><b className="num">{usd(h.usd)}</b><div className="text-xs text-ink-3">gifted</div></div>}
              </div>
            ))}
          </Card>
        </>
      )}

      <div className="mx-1 mb-3 mt-8 flex items-center justify-between"><h2 className="font-display text-[26px] font-semibold">Family gifts</h2><span className="text-sm text-ink-3">{nest.gifts.length} {nest.gifts.length === 1 ? "gift" : "gifts"}</span></div>
      <Card className="px-5 py-1">
        {nest.gifts.length === 0 && (
          <div className="py-10 text-center">
            <p className="font-display text-xl">The nest is waiting for its first twig 🪺</p>
            <p className="mt-1.5 text-ink-2">Be the first to gift {nest.childName} a stock.</p>
          </div>
        )}
        {nest.gifts.map((g, i) => {
          const s = stockBy(g.ticker);
          return (
            <div key={g.id} className="flex gap-3.5 border-b border-line py-4 last:border-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold text-white" style={{ background: g.isPrivate ? "#8A948F" : AV_COLORS[i % AV_COLORS.length] }}>
                {g.isPrivate ? "♥" : g.from.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1"><b>{g.from}</b><Chip tone="honey" xs>{g.occasion}</Chip></div>
                <div className="mt-1 flex items-center gap-2 text-sm text-ink-2">
                  <StockLogo ticker={g.ticker} size={22} />
                  <span className="num">{g.status === "pending" ? "is gifting" : "gifted"} <b className="text-ink">{g.shares ? `${shares(g.shares)} ` : ""}{s.name}</b>{g.usd ? ` (${usd(g.usd)})` : ""}{g.mode === "own" ? " from their own shares" : ""}</span>
                </div>
                {g.message && <p className="font-display my-1.5 break-words text-[17px] italic">&ldquo;{g.message}&rdquo;</p>}
                <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-3">
                  <span>{shortDate(g.createdAt)}</span>
                  {g.status === "pending" ? <Chip tone="honey" xs>Waiting to be accepted</Chip> : g.status === "buying" ? <Chip tone="pending" xs>Buying stock</Chip> : g.status === "usdc_received" ? <Chip xs>USDC received</Chip> : txUrl(g.txHash ?? "") ? <a href={txUrl(g.txHash!)!} target="_blank" rel="noopener noreferrer"><Chip tone="base" xs>Receipt ↗</Chip></a> : <Chip xs>Simulated</Chip>}
                </div>
                <EscrowActions slug={nest.slug} gift={g} role="public"
                  onUpdated={(u) => setNest({ ...nest, gifts: u.status === "pending" ? nest.gifts.map((x) => (x.id === u.id ? u : x)) : nest.gifts.filter((x) => x.id !== u.id) })} />
              </div>
            </div>
          );
        })}
      </Card>
      <p className="mt-5 text-center text-sm text-ink-3">Made with StockNest 🪺 <a href="/create" className="underline">Create a nest for your child</a></p>
      {toastNode}
    </div>
  );
}
