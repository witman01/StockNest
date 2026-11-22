/**
 * The tokenized stocks StockNest offers: Coinbase B20 tokens on Base.
 * Token and price-feed addresses are Base mainnet (from base.org/assets and
 * docs.base.org). Prices come live from the Chainlink feeds (see lib/server/prices.ts).
 * `price` is only a fallback if the feeds can't be reached.
 */
export type Stock = {
  ticker: string;
  /** Onchain token symbol (Coinbase tokenized stocks carry a "c" suffix). */
  symbol: string;
  name: string;
  /** Fallback price in USD, used only when the live feed is unavailable. */
  price: number;
  logo: string;
  /** Chart color: a fixed slot from the validated categorical palette (follows the stock, never its rank). */
  color: string;
  /** B20 token on Base mainnet. */
  token: `0x${string}`;
  /** Chainlink price feed on Base mainnet (8 decimals). */
  feed: `0x${string}`;
};

export const STOCKS: Stock[] = [
  { ticker: "AAPL", symbol: "AAPLc", name: "Apple", price: 345.3, logo: "/logos/apple.svg", color: "var(--series-1)", token: "0xb200000000000000000000C2e324d24d7eEcd1fb", feed: "0x787f13dEa48Db0897CbCDD985de77809D837F988" },
  { ticker: "NVDA", symbol: "NVDAc", name: "NVIDIA", price: 129.82, logo: "/logos/nvidia.svg", color: "var(--series-2)", token: "0xb20000000000000000000078ee7ce2fE4908108C", feed: "0x04689a41629776563E6822F76f2e57D148d28513" },
  { ticker: "MSFT", symbol: "MSFTc", name: "Microsoft", price: 489.2, logo: "/logos/microsoft.svg", color: "var(--series-3)", token: "0xB200000000000000000000Ab99cFa739E253872B", feed: "0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c" },
  { ticker: "AMZN", symbol: "AMZNc", name: "Amazon", price: 250.88, logo: "/logos/amazon.svg", color: "var(--series-4)", token: "0xb200000000000000000000d9192b6B456483C2E8", feed: "0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295" },
  { ticker: "GOOGL", symbol: "GOOGLc", name: "Alphabet", price: 269.72, logo: "/logos/google.svg", color: "var(--series-5)", token: "0xb2000000000000000000002D0BA3164cc74f58B7", feed: "0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2" },
  { ticker: "META", symbol: "METAc", name: "Meta", price: 567.18, logo: "/logos/meta.svg", color: "var(--series-6)", token: "0xb2000000000000000000008bC8786B856E61707C", feed: "0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D" },
  { ticker: "TSLA", symbol: "TSLAc", name: "Tesla", price: 350.45, logo: "/logos/tesla.svg", color: "var(--series-7)", token: "0xb2000000000000000000001e800a7f5189430cD0", feed: "0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4" },
  { ticker: "MSTR", symbol: "MSTRc", name: "Strategy", price: 79.37, logo: "/logos/strategy.svg", color: "var(--series-8)", token: "0xb2000000000000000000004884b426556b92883d", feed: "0xB3cE282CD188b35DA0E38D8Bc7d58e33173D202a" },
];

export const TICKERS = STOCKS.map((s) => s.ticker);
export const stockBy = (ticker: string): Stock => STOCKS.find((s) => s.ticker === ticker) ?? STOCKS[0];

/** Demo: tokenized shares the connected giver already holds (for "Gift stock I own"), until wallet balances are read. */
export const DEMO_WALLET: Record<string, number> = { AAPL: 3.2, NVDA: 1.5, MSFT: 0.8 };
