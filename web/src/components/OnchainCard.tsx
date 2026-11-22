"use client";

import { ExternalLink, Link2, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { addressUrl, deployment, networkName, onchainEnabled, testB20Abi } from "@/lib/chain";
import type { Nest } from "@/lib/nests";
import { stockBy } from "@/lib/stocks";
import { shares } from "@/lib/format";
import { connectWallet, createOnchainNest, hasBrowserWallet, publicClient, walletError } from "@/lib/wallet";
import { StockLogo } from "./StockLogo";
import { Button, Card, Chip } from "./ui";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Parent dashboard: the nest's onchain vault (create it, see verified balances). */
export function OnchainCard({ nest, token, onLinked }: { nest: Nest; token: string | null; onLinked: (n: Nest) => void }) {
  const [balances, setBalances] = useState<{ ticker: string; ui: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!onchainEnabled || !nest.vault) return;
    let cancelled = false;
    (async () => {
      const entries = Object.entries(deployment.tokens);
      const results = await Promise.all(entries.map(([, addr]) =>
        publicClient.readContract({ address: addr as Address, abi: testB20Abi, functionName: "balanceOfUI", args: [nest.vault as Address] }).catch(() => 0n)));
      if (!cancelled) setBalances(entries.map(([ticker], i) => ({ ticker, ui: Number(results[i]) / 1e18 })).filter((b) => b.ui > 0));
    })();
    return () => { cancelled = true; };
  }, [nest.vault]);

  if (!onchainEnabled) return null;

  async function create(kind: "smart" | "injected") {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const wallet = await connectWallet(kind);
      const txHash = await createOnchainNest(wallet, nest.slug);
      const res = await fetch(`/api/nests/${encodeURIComponent(nest.slug)}/chain`, {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ txHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't link the vault.");
      onLinked({ ...nest, ...data });
    } catch (e) {
      setError(e instanceof Error && !("code" in e) && !("shortMessage" in e) ? e.message : walletError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Link2 size={19} className="text-forest" />Onchain nest</h2>
        <Chip tone="base">{networkName}</Chip>
      </div>

      {nest.vault ? (
        <>
          <p className="text-sm text-ink-2">{nest.childName}&apos;s stocks are held in a vault contract that only the guardian can withdraw from.</p>
          <div className="mt-3 grid gap-2 rounded-2xl bg-sand p-3.5 text-sm">
            <div className="flex justify-between gap-3"><span className="text-ink-3">Vault</span>
              {addressUrl(nest.vault) ? <a className="inline-flex items-center gap-1 font-semibold text-forest" href={addressUrl(nest.vault)!} target="_blank" rel="noopener noreferrer">{short(nest.vault)}<ExternalLink size={13} /></a> : <b>{short(nest.vault)}</b>}
            </div>
            {nest.guardian && <div className="flex justify-between gap-3"><span className="text-ink-3">Guardian</span><b>{short(nest.guardian)}</b></div>}
            <div className="flex justify-between gap-3"><span className="text-ink-3">Nest id</span><b>#{nest.chainNestId}</b></div>
          </div>
          <p className="mb-1 mt-4 flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck size={15} className="text-forest" />Verified balances, read from the chain</p>
          {balances === null && <p className="text-sm text-ink-3">Reading the vault…</p>}
          {balances?.length === 0 && <p className="text-sm text-ink-3">No onchain gifts yet.</p>}
          {balances?.map((b) => (
            <div key={b.ticker} className="flex items-center gap-2.5 border-b border-line py-2 last:border-0">
              <StockLogo ticker={b.ticker} size={26} />
              <span className="flex-1 text-sm">{stockBy(b.ticker).name} <span className="text-ink-3">{stockBy(b.ticker).symbol}</span></span>
              <b className="num text-sm">{shares(b.ui)}</b>
            </div>
          ))}
        </>
      ) : token ? (
        <>
          <p className="text-sm text-ink-2">Create {nest.childName}&apos;s vault on {networkName} so family can gift real (testnet) tokenized stocks. Your wallet becomes the guardian, and only you can withdraw.</p>
          <div className="mt-3 grid gap-2">
            <Button size="sm" onClick={() => create("smart")} disabled={busy}><Wallet size={16} />{busy ? "Creating…" : "Create with Smart Wallet"}</Button>
            {hasBrowserWallet() && <Button size="sm" variant="secondary" onClick={() => create("injected")} disabled={busy}>Use a browser wallet</Button>}
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-3">This nest isn&apos;t onchain yet.</p>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-error-soft px-3 py-2 text-sm font-semibold text-error">{error}</p>}
    </Card>
  );
}
