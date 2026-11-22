export type Stock = {
  ticker: string;
  name: string;
  /** Demo price in USD. Replace with a live quote from the execution route. */
  price: number;
  logo: string;
  /** Chart color: a fixed slot from the validated categorical palette (follows the stock, never its rank). */
  color: string;
};

export const STOCKS: Stock[] = [
  { ticker: "SPY", name: "S&P 500 Index", price: 590.0, logo: "/logos/sp500.svg", color: "var(--series-1)" },
  { ticker: "AAPL", name: "Apple", price: 228.4, logo: "/logos/apple.svg", color: "var(--series-2)" },
  { ticker: "NVDA", name: "NVIDIA", price: 142.1, logo: "/logos/nvidia.svg", color: "var(--series-3)" },
  { ticker: "MSFT", name: "Microsoft", price: 431.2, logo: "/logos/microsoft.svg", color: "var(--series-4)" },
  { ticker: "AMZN", name: "Amazon", price: 201.3, logo: "/logos/amazon.svg", color: "var(--series-5)" },
  { ticker: "GOOGL", name: "Alphabet", price: 172.5, logo: "/logos/google.svg", color: "var(--series-6)" },
  { ticker: "TSLA", name: "Tesla", price: 248.9, logo: "/logos/tesla.svg", color: "var(--series-7)" },
  { ticker: "COIN", name: "Coinbase", price: 265.8, logo: "/logos/coinbase.svg", color: "var(--series-8)" },
  { ticker: "META", name: "Meta", price: 585.2, logo: "/logos/meta.svg", color: "var(--series-other)" },
  { ticker: "NFLX", name: "Netflix", price: 905.4, logo: "/logos/netflix.svg", color: "var(--series-other)" },
];

export const stockBy = (ticker: string): Stock => STOCKS.find((s) => s.ticker === ticker) ?? STOCKS[0];

/** Demo: tokenized shares the connected giver already holds (for "Gift stock I own"). */
export const DEMO_WALLET: Record<string, number> = { AAPL: 3.2, SPY: 0.8, NVDA: 1.5 };
