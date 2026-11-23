"use client";

import { Clock, Gift as GiftIcon, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { syncGift } from "@/lib/api";
import { txUrl } from "@/lib/chain";
import type { Gift } from "@/lib/nests";
import { claimOnchainGift, connectWallet, hasBrowserWallet, refundOnchainGift, walletError } from "@/lib/wallet";
import { Button, Chip } from "./ui";

const when = (d: string) => new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Re-render every 15s so "locked" / "expired" flip on time. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);
  return now;
}

/**
 * Escrow gift status and actions.
 * guardian: accept (claim) once unlocked; after expiry, return it to the giver.
 * public:   anyone can return an expired gift to its giver.
 */
export function EscrowActions({ slug, gift, role, onUpdated }: {
  slug: string; gift: Gift; role: "guardian" | "public"; onUpdated: (g: Gift) => void;
}) {
  const now = useNow();
  const [busy, setBusy] = useState<"" | "claim" | "refund">("");
  const [error, setError] = useState<string | null>(null);

  if (gift.status === "returned" && gift.refundReason) {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <Chip tone="error" xs>{gift.refundReason === "expired" ? "Expired, refunded to giver" : "Not eligible, refunded to giver"}</Chip>
        {txUrl(gift.settleTxHash ?? "") && <a className="text-forest underline" href={txUrl(gift.settleTxHash!)!} target="_blank" rel="noopener noreferrer">refund receipt</a>}
      </div>
    );
  }
  if (gift.status === "delivered" && gift.settleTxHash) {
    return txUrl(gift.settleTxHash) ? (
      <div className="mt-1 text-xs text-ink-3">Accepted, <a className="text-forest underline" href={txUrl(gift.settleTxHash)!} target="_blank" rel="noopener noreferrer">delivery receipt</a></div>
    ) : null;
  }
  if (gift.status !== "pending" || !gift.chainGiftId) return null;

  const locked = !!gift.unlockAt && new Date(gift.unlockAt).getTime() > now;
  const expired = !!gift.expiresAt && new Date(gift.expiresAt).getTime() < now;

  async function run(kind: "claim" | "refund") {
    setBusy(kind);
    setError(null);
    try {
      const wallet = await connectWallet(hasBrowserWallet() ? "injected" : "smart");
      const txHash = kind === "claim" ? await claimOnchainGift(wallet, gift.chainGiftId!) : await refundOnchainGift(wallet, gift.chainGiftId!);
      const { gift: updated } = await syncGift(slug, gift.id, txHash);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error && !("code" in e) && !("shortMessage" in e) ? e.message : walletError(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-2 rounded-xl bg-honey-soft px-3 py-2.5 text-sm">
      <div className="flex items-start gap-2 text-ink-2">
        <Clock size={15} className="mt-0.5 shrink-0 text-[var(--honey-ink)]" />
        <span>
          {expired
            ? <>Not accepted in time (expired {when(gift.expiresAt!)}). It can go back to the giver.</>
            : locked
            ? <>Wrapped until <b className="text-ink">{when(gift.unlockAt!)}</b>. Still the giver&apos;s, held in escrow.</>
            : <>Waiting to be accepted. Still the giver&apos;s, held in escrow until {when(gift.expiresAt!)}.</>}
        </span>
      </div>
      {(role === "guardian" || expired) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {role === "guardian" && !expired && (
            <Button size="sm" onClick={() => run("claim")} disabled={!!busy || locked}>
              <GiftIcon size={15} />{busy === "claim" ? "Accepting…" : locked ? "Locked" : "Accept gift"}
            </Button>
          )}
          {expired && (
            <Button size="sm" variant="secondary" onClick={() => run("refund")} disabled={!!busy}>
              <Undo2 size={15} />{busy === "refund" ? "Returning…" : "Return to giver"}
            </Button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 font-semibold text-error">{error}</p>}
    </div>
  );
}
