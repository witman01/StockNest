# StockNest

**Give them stocks, not just presents.**

StockNest is a family stock-gifting app on Base. A parent creates a **Stock Nest** for their child and shares one link. Grandparents, aunts, uncles and friends open it, pick a stock, and gift a real tokenized share with a personal message. The parent tracks every gift from a dashboard.

Built for the Base **Stocks Maxxing** hackathon, Programmable Stock Markets track.

## What works today

- **Create a Stock Nest:** child's display name, photo or avatar, the stocks family can gift, an optional goal, and a note to family.
- **Shareable gift page** (`/n/<child>`): the child's photo, progress, holdings and a family gift timeline. Link previews on WhatsApp and Telegram show the child's photo.
- **Gift a Stock flow:** pick a stock, choose an amount (or send shares you own), add a message, then review. A celebration screen tracks delivery.
- **Parent dashboard** (`/dashboard`): every nest, every gift with its status, top givers, CSV export, and privacy and goal settings.
- **Privacy by default:** no surnames or birthdays, private gifts hidden on the public page, amounts optional, and photos stripped of location data.

> **Demo status:** wallet signatures and stock purchases are simulated and prices are demo values. The Base Sepolia contracts and wallet sign-in are next on the roadmap.

## Run it locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. With no configuration, data is saved to `web/.data/`, a local file database that is git-ignored and seeded with an example family.

### Use Supabase (for sharing across devices and deploying)

1. Create a Supabase project and run `web/supabase/schema.sql` in its SQL editor.
2. Copy `web/.env.example` to `web/.env.local` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Restart `npm run dev`. The app switches to Supabase automatically.

## Tech

Next.js 15 (App Router), React 19, Tailwind CSS v4, Motion, Supabase (Postgres + Storage), and zod.

| Path | What's there |
|---|---|
| `web/src/app` | Pages and API routes (`/api/nests`, `/api/uploads`, `/api/parent/nests`) |
| `web/src/lib/server` | Data store (local file or Supabase), auth keys, validation and rate limiting |
| `web/src/components` | UI, the animated family scene, the Dynamic Island ticker and the celebration screen |
| `DESIGN.md` | The design system: brand, colors, type, components and voice |

## Roadmap

1. Stock Nest contracts on Base Sepolia (guardian-managed nest, USDC to tokenized stock to nest, transfer-policy checks and refunds)
2. Wallet sign-in with Coinbase Smart Wallet and sponsored gas
3. Live stock prices
4. Scheduled gifts (for example, a share every birthday)
