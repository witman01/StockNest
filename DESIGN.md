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

## 4. Color: "Paper"

White paper, ink black, one cornflower accent. Chosen by the team on 2026-11-26 over the original green/honey look and a charcoal/electric-blue look.

| Token | Hex | Use |
|---|---|---|
| Paper White | `#FFFFFF` | Page and cards |
| Ink Black | `#050505` | Text, outlines on featured cards, primary-button hover |
| Cornflower Blue | `#548CFF` | The accent: key words in headlines, dot art, glints |
| Deep Cornflower | `#1F4FD1` | Primary buttons and links (passes AA on white) |
| Cornflower soft | `#EAF1FF` | Selected tiles, quiet highlights |
| Hairline | `#E3E6ED` | Rules, card borders |
| Ink 2 / Ink 3 | `#4A4D55` / `#8A8E99` | Body copy / captions |

Rules: one accent only. Status colors (error `#C0261E`, pending `#8A5A00`) never double as decoration. Stock series colors stay fixed per stock.

## 5. Typography

- **Geist** for everything readable: headlines semibold with tight tracking (−0.035em), body 15–16px.
- **Geist Mono** for labels, eyebrows, step counters and button text: 11–13px, uppercase, +0.06–0.1em tracking.
- Headlines put the meaningful words in cornflower: "Every kid **deserves** a share of **the future.**"

## 6. Space, shape, depth

- Square: buttons have no radius; cards 6px at most; inputs 3px. Avatars and stock logos stay round.
- Depth comes from hairlines and ink outlines, not soft shadows. A featured card can lift with a flat offset shadow in cornflower soft (`8px 8px 0 #D3E1FF`).
- Framed hero with "+" corner marks, like a technical drawing.

## 7. Components

- **Buttons:** primary = deep cornflower fill, turns ink on hover; secondary = ink outline on white. Mono uppercase label; a trailing → nudges right on hover.
- **Cards:** white, 1px hairline. Featured cards use a 1px ink border.
- **Inputs:** 1px border, focus = ink border + soft cornflower ring.
- **Step labels:** "STEP 01" in mono cornflower above the section title.
- **Nav:** plain links; an ink underline grows in on hover and marks the current page. Phones get a full-width drop-down.

## 8. Illustration: the cornflower mountain

The hero art is a dithered dot "mountain" whose ridge climbs like a long-run stock chart (`DitherMountain`). Dots are cornflower, pale cornflower and paper-grey. Child avatars stay as friendly illustrations.

## 9. Motion

Motion should feel like a live market, calm and precise, never bouncy-cartoon.
- **Hero:** the headline rises word by word; the mountain plots in from left to right with an ink "plot head"; then its columns keep rising and falling like live prices while stock logos (TSLA, MSFT, AAPL, NVDA, AMZN) bounce along the ridge. Gift cards pop in and float gently.
- **Scroll:** sections fade up as they enter; allocation bars grow in; dollar totals count up.
- **Hover:** arrows nudge, step cells get a cornflower rule sweeping across, the featured nest card lifts.
- Everything is visible at rest without JS. `prefers-reduced-motion` gets a still mountain and no reveals.

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
