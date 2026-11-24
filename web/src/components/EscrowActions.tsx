"use client";

import { Gift as GiftIcon, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { syncGift } from "@/lib/api";
import { txUrl } from "@/lib/chain";
import type { Gift } from "@/lib/nests";
import { claimOnchainGift, connectWallet, hasBrowserWallet, walletError } from "@/lib/wallet";
import { Button, Chip } from "./ui";

const when = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** Re-render every 15s so a wrapped gift flips to "opening" on time. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);
  return now;
}

/**
 * Status of an onchain gift. A gift always ends up in the child's vault:
 * wrapped gifts wait for the parent's opening day, then the server delivers them.
 * The only refund is a stock the child's vault isn't allowed to hold.
 */
export function EscrowActions({ slug, gift, onUpdated }: {
  slug: string; gift: Gift; role?: "guardian" | "public"; onUpdated: (g: Gift) => void;
}) {
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  const pending = gift.status === "pending" && !!gift.chainGiftId;
  const locked = !!gift.unlockAt && new Date(gift.unlockAt).getTime() > now;

  // Opened but not delivered yet: ask the server to deliver it (it pays the gas).
  useEffect(() => {
    if (!pending || locked || tried.current) return;
    tried.current = true;
    setBusy(true);
    syncGift(slug, gift.id).then(({ gift: g }) => onUpdated(g)).catch(() => {}).finally(() => setBusy(false));
  }, [pending, locked, slug, gift.id, onUpdated]);

  if (gift.status === "returned") {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <Chip tone="error" xs>Stock not allowed for this nest, money returned to giver</Chip>
        {txUrl(gift.settleTxHash ?? "") && <a className="text-forest underline" href={txUrl(gift.settleTxHash!)!} target="_blank" rel="noopener noreferrer">receipt</a>}
      </div>
    );
  }
  if (gift.status === "delivered" && gift.settleTxHash) {
    return txUrl(gift.settleTxHash) ? (
      <div className="mt-1 text-xs text-ink-3">In the nest, <a className="text-forest underline" href={txUrl(gift.settleTxHash)!} target="_blank" rel="noopener noreferrer">delivery receipt</a></div>
    ) : null;
  }
  if (!pending) return null;

  async function deliverWithWallet() {
    setBusy(true);
    setError(null);
    try {
      const wallet = await connectWallet(hasBrowserWallet() ? "injected" : "smart");
      const txHash = await claimOnchainGift(wallet, gift.chainGiftId!);
      const { gift: updated } = await syncGift(slug, gift.id, txHash);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error && !("code" in e) && !("shortMessage" in e) ? e.message : walletError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-xl bg-honey-soft px-3 py-2.5 text-sm">
      <div className="flex items-start gap-2 text-ink-2">
        {locked ? <Lock size={15} className="mt-0.5 shrink-0 text-[var(--honey-ink)]" /> : <GiftIcon size={15} className="mt-0.5 shrink-0 text-[var(--honey-ink)]" />}
        <span>
          {locked
            ? <>Wrapped until <b className="text-ink">{when(gift.unlockAt!)}</b>. It goes into the nest automatically that day.</>
            : busy ? <>Opening it into the nest…</> : <>Open and on its way into the nest.</>}
        </span>
      </div>
      {!locked && !busy && (
        <Button size="sm" className="mt-2" onClick={deliverWithWallet}><GiftIcon size={15} />Deliver now</Button>
      )}
      {error && <p role="alert" className="mt-2 font-semibold text-error">{error}</p>}
    </div>
  );
}
