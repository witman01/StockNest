# StockNest — Design System

> **Give them stocks, not just presents.**
> *Give today. Grow tomorrow.*

StockNest is a family **stock-gifting** product on Base, built for the Base *Stocks Maxxing* hackathon (track: **Programmable Stock Markets**). A parent creates a **Stock Nest** for a child and shares one link. Family members choose a tokenized stock, pay in USDC (or send shares they already own), and the stock is delivered to the child's guardian-managed nest with a personal message attached.

This document defines how StockNest looks, sounds and behaves. Every screen, illustration and line of copy follows it.

---

## 1. Product narrative (what we are building)

**The gift is the stock.** It isn't cash and it isn't a voucher.

| Flow | What happens |
|---|---|
| **Primary: USDC → Stock → Gift** | The giver picks a stock (e.g. $50 of Apple) and pays in USDC. An integrated route buys the B20 tokenized stock, which is delivered to the child's nest. |
| **Alternative: Direct share gift** | The giver already holds a tokenized stock on Base. The token's transfer policy is checked, then the shares are sent straight to the nest. |

**Problem:** There is no simple, family-oriented way to gift tokenized stocks to children and build their portfolio together.
**Solution:** A personal Stock Nest page where family choose stocks, fund them in USDC or send shares they own, and leave a message with every gift.
**USP:** Tokenized stocks become gifts that families give, receive and build together.

Key product rules:
- **Parents curate.** The parent picks which eligible stocks family can gift ("Parents' picks").
- **The guardian manages the nest.** Stocks go to a guardian-managed nest contract and never to a child-controlled wallet.
- **Transfer policies are respected.** B20 tokens can restrict recipients, so eligibility is checked before delivery. If a gift can't be delivered, it is refunded or returned.
- **Paid ≠ purchased ≠ delivered.** Each is a separate, visible state.

---

## 2. Brand idea: the nest

A nest is built twig by twig, by many hands, to protect something small while it grows. In StockNest, each twig is a share that someone in the family gifted.

| Nest metaphor | Product meaning |
|---|---|
| The nest | The child's Stock Nest (their portfolio) |
| Each twig | A stock gift |
| The sprout | The child's future |
| The flock | Grandparents, aunts, uncles, friends |

### Logo
The mark is a **Forest rounded square with a cream woven nest cradling a honey "share"** (a pie with one slice lifted out), meaning a piece of a company held safely for a child. The wordmark is "Stock**Nest**" in Fraunces Bold, with "Nest" in Forest (or Honey on dark backgrounds). Source: `web/src/components/Logo.tsx`, favicon `web/public/icon.svg`.

### Personality
- **Warm, not childish.** The givers are adults, often grandparents.
- **Trustworthy, not corporate.** It should feel like a good family bank, without the trading terminal.
- **Honest, not hype.** Stocks go up and down. We never promise growth.
- **Simple, not technical.** Base works underneath, and nobody has to learn blockchain.

---

## 3. Design principles
1. **Grandma test.** Someone with no crypto or brokerage experience should be able to gift a stock in under a minute.
2. **People before numbers.** Faces, names and messages come first, then stock and shares, and hashes last (behind "Receipt").
3. **One obvious action per screen.** Each screen has a single Forest primary button.
4. **Show the truth.** Show only states the system can verify, and show prices as demo prices or live quotes, clearly labelled.
5. **Mobile first.** The gift page is opened from WhatsApp, so design at 375px first.

---

## 4. Color

The brand is anchored in **Forest `#0C513F`**: deep, calm, trustworthy and growing. **Honey** brings warmth and celebration. **Base Blue** is used *only* for onchain and verification UI. There is no orange or coral in the UI.

### Core tokens
| Token | Hex | Use |
|---|---|---|
| `--cream` | `#FBF7F0` | App background |
| `--paper` | `#FFFFFF` | Cards, sheets |
| `--sand` | `#F3ECE0` | Subtle fills, segmented controls, tracks |
| `--line` | `#E8DFD1` | Borders, hairlines |
| `--ink` | `#1F2A2E` | Primary text |
| `--ink-2` | `#55625F` | Secondary text |
| `--ink-3` | `#8A948F` | Hints, placeholders |

### Brand tokens
| Token | Hex | Role |
|---|---|---|
| `--forest` | `#0C513F` | **Primary**: buttons, logo, progress, selected states, celebration background |
| `--forest-dark` | `#083B2E` | Hover / pressed, celebration gradient edge |
| `--forest-soft` | `#E1EDE8` | Selected cards, tinted panels |
| `--mint` | `#CFE6DC` | Light accents, illustration |
| `--honey` | `#F2B34A` | Celebration, occasions, "Parents' pick" |
| `--honey-soft` | `#FCEFD3` | Hero wash, badges |
| `--sky` / `--sky-soft` | `#8FB8D8` / `#E4EFF7` | Info notices, illustration |
| `--sage` | `#4E8F86` | Secondary illustration/accent |

### Functional tokens
| Token | Hex | Meaning |
|---|---|---|
| `--base-blue` / `--base-soft` | `#0052FF` / `#E6EEFF` | Onchain only ("Held on Base", "Receipt", "Powered by Base") |
| `--pending` | `#9A6A12` on honey-soft | Buying / waiting |
| `--error` / `--error-soft` | `#B3261E` / `#FBE3E1` | Failed / returned |

### Stock logos
Stocks are identified by their **real company logo** on a white circle with a `--line` border (`<StockLogo>`; files live in `web/public/logos/`, sourced from Simple Icons and colored in each brand's own color). The list matches the Coinbase tokenized stocks (B20) live on Base: Apple, NVIDIA, Microsoft, Amazon, Alphabet, Meta, Tesla and Strategy. Logos identify a stock and never imply that the company endorses StockNest. Each stock also has a fixed **chart color** for allocation bars (see `web/src/lib/stocks.ts`).

### Rules
- Forest is the **one primary action** color. Text on Forest is always white.
- If it's blue, it's onchain. Base Blue never appears as decoration.
- All text pairs meet WCAG AA.

---

## 5. Typography
| Role | Font |
|---|---|
| Display & headings | **Fraunces** (soft serif), warm like a family album |
| UI & body | **Plus Jakarta Sans** |
| Numbers, shares, prices | Jakarta with `tabular-nums` |

Scale (mobile → desktop): display 40→60, h1 30→40, h2 24→30, h3 18→20, body 16, small 14, micro 12 uppercase. Gift messages use **Fraunces italic**. Inputs are never smaller than 16px.

---

## 6. Space, shape, depth
- Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Phone gutter is 16px.
- Radii: 10 (inputs), 16 (small cards), 24 (cards), pill (buttons and chips).
- Shadows are warm-tinted and soft: `--shadow-1` for cards, `--shadow-2` for floating cards.
- Touch targets are at least 44px. The content max width is 1160px and the gift page column is 560px.

---

## 7. Components

**Buttons:** Primary (Forest fill, pill, 52px), Secondary (Forest outline), Ghost (Forest text). Disabled uses sand with a visible reason.

**Stock card (picker):** a tile with the name, ticker and price (labelled "demo price" in the mockup). The selected card has a Forest border on forest-soft, and parent-curated stocks get a "Parents' pick" honey badge. In "Gift stock I own" mode, stocks the giver doesn't hold are disabled and held ones show "✓ eligible".

**Segmented control:** *Buy with USDC* | *Gift stock I own*.

**Share estimate panel:** a stock tile with "≈ 0.2189 shares of Apple at $228.40" and the note "fractional shares supported".

**Holdings row:** a tile with the name, shares and number of gifts on the left, and the **value at time of gift** on the right. We don't show live P&L in the MVP.

**Allocation bar:** a stacked pill bar with segments in the stock tile colors.

**Nest progress ring:** total value gifted against the optional goal, labelled "gifted in stocks so far".

**Gift timeline item:** avatar, name, occasion chip, "gifted **0.44 Apple (AAPL)** · $100", the message in Fraunces italic, the date, and a Base Receipt chip.

**Status chips (stock gifts):**
| Status | Style |
|---|---|
| USDC received | sand |
| Buying stock | pending (honey) |
| Delivered | forest |
| Returned / Refunded | error |
| Failed | error |

### 7.1 Celebration screen (signature moment)
A full-screen overlay that pops in after **creating a nest** and after **sending a stock gift**.
- **Background:** Forest radial gradient (`#17705A` → `#0C513F` → `#083B2E`).
- **Confetti** falls across the whole screen, *over* the cards, in honey, white, sky, mint, sage and pale gold. It plays for about 4s and is skipped under `prefers-reduced-motion`.
- **A stack of white rounded cards:**
  1. Logo card (StockNest mark and wordmark).
  2. Main card with a three-step check stepper (Forest circles, white checks, connecting line), a large Fraunces headline, a subtitle, an extra block, the line "Help spread the word…", a primary **Share link** button and a ghost secondary link.
  3. A "Powered by **Base**" card.
- **Footer line:** a 🔒 icon and "Secured onchain" in light text.

| Variant | Stepper | Headline | Extra block |
|---|---|---|---|
| Nest created | Details · Stocks · Share | "Your nest is ready." | Copyable nest link |
| Gift sent (buy) | Stock · Note · Gift | "Give today. Grow tomorrow." | Live tracker: USDC received ✓ → {Stock} purchased ✓ → Delivered to nest ✓, plus a receipt chip |
| Gift sent (direct) | Stock · Note · Gift | same | Eligibility checked ✓ → Shares sent ✓ → Delivered ✓ |

The tracker ticks only as each state is confirmed. Never jump straight to "Delivered".

---

## 8. Illustration: the StockNest family
Flat vector shapes with soft rounded geometry and no outlines, except thin ink lines for faces. Faces use dot eyes, a small smile and soft blush.

- **Palette:** Forest, mint, honey, sage, sky and warm neutrals. No orange or coral.
- **Cast** (reused for continuity): **Amelia** (5) with curly puffs and a sky dress, holding a **Forest gift box with a honey ribbon**. **Dad** in a Forest sweater. **Mum** in a honey top. **Grandma** with a grey bun, glasses and a mint cardigan, holding a stock gift card. **Grandpa** with a flat cap, white moustache, slate cardigan and walking cane. **Cousin Zara** (teen) with long braids and a mustard hoodie, sending a share from her phone. **Uncle James** with a beard and a sage shirt, waving from afar. **Biscuit**, the family dog.
- **Idle animation** (CSS only, in `globals.css`): characters breathe at offset rhythms, everyone blinks, the uncle waves, the dog wags its tail, shares fly from Zara's phone, hearts and shares drift upward, the sprout grows on load, and sparkles twinkle. All of it stops under `prefers-reduced-motion`. Source: `web/src/components/FamilyScene.tsx`.
- **Props:** the **share symbol** (a honey pie with a Forest slice lifted out, meaning "a piece of a company"), a sprout growing from a woven nest, honey hearts and sparkles.
- **Don'ts:** rockets, "to the moon", piles of cash, red/green trading candles, photoreal children, company logos.

## 9. Motion
200–300ms, `cubic-bezier(.2,.8,.2,1)`. The progress ring animates in on first view. The celebration card rises with a gentle scale, the confetti falls once, and the tracker steps tick about 0.7s apart. All motion respects reduced-motion settings.

## 10. Voice & copy
| Say | Don't say |
|---|---|
| Gift a Stock | Execute order / Buy |
| Stock Nest | Portfolio vault / Pool |
| Gifted in stocks so far | Portfolio value / P&L |
| ≈ 0.22 shares of Apple | 0.2189 AAPL-B20 position |
| Parents' pick | Recommended investment |
| Held on Base / Receipt | Tx hash 0x… |

**Honesty lines:**
- "Stocks can go up or down. Values are shown at the time of each gift."
- "If the stock can't be bought or delivered to the nest, your USDC is refunded automatically."
- "Shares go to the guardian-managed nest, not to a child's personal wallet."
- "Testnet demo · demo prices · no real money moves."
- Card payments and scheduled purchases are marked **"Coming soon"** until they're real.
- We never call a stock a recommendation.

## 11. Privacy for children
Show the display name and a photo or avatar only, and no surnames, birthdates or schools. The parent chooses whether amounts are public, and givers can give privately. No personal data about minors goes onchain.

**Child photo:** parents can upload a photo, which is shown in a circle on the gift page, the celebration and (with a backend) link previews.
- The photo is center-cropped to 512px and re-encoded as JPEG in the browser, which strips EXIF data, including GPS location.
- A "Show photo on the shared page" switch is on by default after upload, with the note "Anyone with the link can see it." When it's off, the chosen avatar is shown instead.
- The photo is never written onchain. In production it goes to private object storage and is served through the app.

## 12. Screen inventory (MVP)
1. **Landing:** "Give them stocks, not just presents", the family illustration, how it works, an example nest, and the Why Base / Programmable Stock Markets section.
2. **Create Stock Nest:** name, avatar, nest name, **stocks family can gift**, optional goal, a note to family, a live preview, then the **Nest-ready celebration**.
3. **Gift page:** avatar, note, progress ring, Gift a Stock, holdings and allocation, family gift timeline.
4. **Gift a Stock:** Choose stock (Buy/Own) → Amount (with share estimate) → Note → Review & pay, then the **Gift-sent celebration**.
5. **Parent dashboard:** nests, gift statuses (including a returned transfer-policy case), scheduled stock gifts, custody and eligibility, privacy.

The mockup at `mockup/index.html` implements this system.
