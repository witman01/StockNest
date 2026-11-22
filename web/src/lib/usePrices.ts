"use client";

import { useEffect, useState } from "react";
import { STOCKS } from "./stocks";

export type ClientPrice = { price: number; updatedAt: number; history: number[]; live: boolean };
export type ClientBook = { source: "chainlink" | "fallback" | "loading"; prices: Record<string, ClientPrice> };

const initial: ClientBook = {
  source: "loading",
  prices: Object.fromEntries(STOCKS.map((s) => [s.ticker, { price: s.price, updatedAt: 0, history: [s.price, s.price], live: false }])),
};

let shared: ClientBook = initial;
let started = false;
const listeners = new Set<(b: ClientBook) => void>();

async function refresh() {
  try {
    const res = await fetch("/api/prices");
    if (!res.ok) return;
    const b = (await res.json()) as ClientBook;
    shared = { source: b.source, prices: { ...shared.prices, ...b.prices } };
    listeners.forEach((l) => l(shared));
  } catch { /* keep last known prices */ }
}

/** Shared live price book: one fetch for the whole page, refreshed every minute. */
export function usePrices(): ClientBook {
  const [book, setBook] = useState<ClientBook>(shared);
  useEffect(() => {
    listeners.add(setBook);
    setBook(shared);
    if (!started) { started = true; refresh(); setInterval(refresh, 60_000); }
    return () => { listeners.delete(setBook); };
  }, []);
  return book;
}

export const priceFor = (book: ClientBook, ticker: string) => book.prices[ticker]?.price ?? STOCKS.find((s) => s.ticker === ticker)?.price ?? 0;
