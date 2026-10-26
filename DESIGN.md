---
# gstack: design-md-format=spec
name: WTOKENS
description: "Military-grade arena control room — function-first density with electric accents that say this is where real money moves."
colors:
  primary: "#4de8a0"        # electric-green — action, money, success, CTAs
  on-primary: "#0a1a12"     # dark green for text on primary surfaces
  surface: "#0e1522"        # panel background
  surface-elevated: "#141d2e" # elevated panels, dropdowns, modals
  text: "#e8ecf4"           # primary text
  text-muted: "#8a96b0"     # secondary text, metadata
  accent: "#5ca8f5"         # blue — navigation, informational, links
  success: "#4de8a0"        # same as primary — money received, match won
  warning: "#f5a623"        # pending states, expiration, escrow locked
  error: "#f04040"          # disputes, losses, validation errors
  gold: "#ffd166"           # rankings, premium, win streaks
  background: "#060a14"     # deepest background layer
  line: "#1e2d44"           # borders, dividers
typography:
  display:
    fontFamily: "Satoshi"
    fontWeight: 700
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    letterSpacing: "-0.03em"
  display-landing:
    fontFamily: "Bebas Neue"
    fontWeight: 400
    fontSize: "clamp(3rem, 8vw, 6.5rem)"
    letterSpacing: "0.02em"
  body:
    fontFamily: "Inter"
    fontSize: "1rem"
    lineHeight: 1.6
  label:
    fontFamily: "Inter"
    fontSize: "0.75rem"
    letterSpacing: "0.12em"
    fontWeight: 650
  mono:
    fontFamily: "JetBrains Mono"
    fontFeature: "tnum"
    fontSize: "1rem"
    fontWeight: 500
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-hover:
    backgroundColor: "#6ff0b8"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text}"
    borderColor: "{colors.line}"
  button-discord:
    backgroundColor: "#1a4fa8"
    textColor: "#ffffff"
    borderColor: "#3870d4"
  input:
    borderColor: "{colors.line}"
    rounded: "{rounded.sm}"
    backgroundColor: "{colors.surface}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.line}"
  nav-link:
    textColor: "{colors.text-muted}"
  nav-link-active:
    textColor: "#c0d0f0"
    indicatorColor: "{colors.primary}"
---

# WTOKENS

## Overview

**Creative North Star:** Industrial-utilitarian arena control room with electric green accents — function-first density that says "this is where real money moves and skilled players prove it."

**Product context:** P2P competitive Fortnite arena with real-money escrow for Latin America (Argentina, Chile, Peru, Uruguay, Bolivia, Paraguay). Target audience: Hispanic gamers 16-25, Discord-native, mobile-heavy. React 19 + TypeScript frontend on Vercel, Java 21 backend.

**Mode per surface:**
- Landing page (`/`): Persuade — poster-like hero, 3D carousel, editorial sections
- Dashboard panel (`/app`): Operate — sidebar nav, data-dense matchfinder, wallet, history

**Reference sites:** FACEIT, Thunderpick, GG.BET, CMG (Checkmate Gaming), Players' Lounge

**Key characteristics:**
- Dark-mode-first, OLED-level depth for nighttime gaming sessions
- Electric green (`#4de8a0`) as the primary action color — money, success, CTAs
- Blue (`#5ca8f5`) for informational/navigational elements — two-accent system
- JetBrains Mono for all monetary amounts — precision and trust
- Dense dashboard, generous landing — different density per surface

## Colors

**Strategy:** Full palette — primary green for action/money, blue for information/navigation, gold for rankings, plus semantic colors for success/warning/error states.

**Dark mode decided by use scene:** Competitive gamers play at night, use Discord/Twitch in dark mode, and expect dark interfaces. Dark mode is the only mode.

The two-accent system separates intent: green means "this involves money or an action you should take" (CTAs, balances, match stakes, success states). Blue means "this is information or navigation" (links, breadcrumbs, mode labels, info alerts). This prevents accent ambiguity in a platform where the difference between "look at this" and "act on this" matters for real money.

Neutral surfaces derive from the deepest navy-black (`#060a14`) with progressively lighter panels (`#0e1522`, `#141d2e`) creating depth through layering. Borders (`#1e2d44`) are subtle enough to structure without visual noise. Text muted (`#8a96b0`) is cool-toned to recede against the warm green accent.

## Typography

**Display (Landing):** Bebas Neue — condensed, aggressive, athletic. Loaded via `@fontsource/bebas-neue` (already installed). Used only on the landing page hero and section headlines. Its extreme condensation and uppercase DNA make it a poster typeface, not a UI typeface.

**Display (Dashboard):** Satoshi 700 — geometric grotesk from Fontshare. Wider letterforms than Space Grotesk, distinctive `a` and `g`, fresher identity without being unfamiliar. Loaded via Fontshare CDN: `https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap`. Used for dashboard headings, section titles, the brand wordmark in the sidebar.

**Body/UI:** Inter Variable — the screen-reading workhorse. Already installed via `@fontsource-variable/inter`. Used for all body text, descriptions, navigation items, form labels. Fine as body/UI on an Operate surface despite being overused as display.

**Label/Eyebrow:** Inter 650 with `letter-spacing: 0.12em`, uppercase. Eyebrow text above sections, card metadata, status labels.

**Mono/Money:** JetBrains Mono 500 — tabular lining figures (`font-feature-settings: 'tnum'`) prevent digit-dancing when amounts update in real time. Loaded via Google Fonts. Used for all monetary amounts (`$25.00 USD`), match IDs (`FN-82914`), wallet balances, and the persistent header balance display.

**Scale:** Landing headlines up to `clamp(3rem, 8vw, 6.5rem)`. Dashboard headings `clamp(1.5rem, 3vw, 2rem)`. Body at `1rem` (14px base). Labels at `0.75rem`. Display type never exceeds 6rem on a non-poster page.

## Layout

**Landing (Persuade):** Creative-editorial. Max width 1260px. The 3D carousel is the centerpiece poster composition. Sections use scroll-reveal animations (`useScrollReveal`). Asymmetric community card with 1.1fr/1fr grid.

**Dashboard (Operate):** Grid-disciplined. Fixed sidebar (226px) + topbar (82px) + content area. Content max-width 1600px. Two-column layout for main content + side panel (265px). Mode cards in 2-column grid. Match history in table rows.

**Breakpoints:** Mobile breaks at 768px — sidebar becomes a drawer, single-column cards, simplified navigation.

## Elevation & Depth

Three surface levels create depth:
1. `--bg` (`#060a14`) — the deepest canvas
2. `--panel` (`#0e1522`) — cards, sidebar, content areas
3. `--panel-elevated` (`#141d2e`) — dropdowns, modals, hover states

Borders (`1px solid var(--line)`) define edges. No zero-offset glow or halo effects. Hover states use `translateY(-2px)` lift with border-color change — physical depth, not luminous.

## Shapes

- `sm` (4px): Inputs, small tags, inline elements
- `md` (8px): Buttons, status badges, navigation items
- `lg` (12px): Cards, panels, modals, hero sections
- `full` (9999px): Pills for kickers and carousel dots only

Nested inner radius = outer radius minus gap. No uniform bubbly radius on everything.

## Components

**button-primary:** Green background, dark text. Hover: lighter green + `translateY(-1px)`. Focus-visible: 2px solid green outline, 2px offset. Disabled: 0.4 opacity, `cursor: not-allowed`, no transform. Min-height 44px (touch target).

**button-discord:** Blue background (`#1a4fa8`), white text. Separate from primary to avoid confusion between "platform action" and "authentication action."

**card:** Panel background, line border, lg radius. Hover: border lightens to `#3a5070`, `translateY(-2px)`. Contains eyebrow (green label text), heading (Satoshi), body (Inter muted), footer with amount (JetBrains Mono green) and status badge.

**status badges:** Colored background tint + colored text. Open: green tint. Locked/Escrow: warning tint. Dispute: danger tint. No colored left-border.

**form-input:** Panel background, line border, sm radius. Focus: green outline. Error: danger border + error message below. Disabled: reduced opacity.

**alerts:** Full-width, md radius, subtle background tint + border matching severity. Icon in colored circle. Success/warning/error/info states.

## Do's and Don'ts

**Do:**
- Use JetBrains Mono for every number that represents money or a match identifier
- Use green for actions that involve money (deposit, create match, accept); blue for navigation and information
- Show wallet balance in the header at all times in the dashboard
- Design empty, loading, error, and long-content states for every component
- Respect `prefers-reduced-motion` for all animations

**Don't:**
- Use purple/violet gradients or blue-to-purple schemes
- Use zero-offset glowing borders or halo effects on dark surfaces
- Center-align everything — left-align body text and card content
- Use the same border-radius on every element — vary by component role
- Show fake player counts, invented payout amounts, or placeholder avatars
- Put a kicker chip above the hero headline on the landing — the headline carries its own weight
- Use gradient text for emphasis — use weight or color

## Motion

- **Approach:** Intentional — subtle entrance animations and meaningful state transitions. Not expressive everywhere; the product is a financial tool, not a game itself.
- **Easing:** enter `ease-out`, exit `ease-in`, move `cubic-bezier(0.22, 0.61, 0.36, 1)`
- **Duration:** micro 80-120ms (hover, focus), short 150-250ms (filter change, panel open), medium 300-450ms (carousel, page transition), long 400-700ms (scroll reveal entrance)
- **The one authored moment:** The 3D perspective carousel on the landing page — `perspective(1400px)`, `rotateY(±12deg)`, `translateZ(-250px)`. This is the expressive statement; the rest of the UI stays functional.
- **Reduced motion:** All motion respects `prefers-reduced-motion: reduce` via `motion.css`.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-26 | Initial design system created | Created by /design-consultation based on competitive research (FACEIT, Thunderpick, GG.BET, CMG, Players' Lounge) and product context (P2P Fortnite arena for LATAM). |
| 2026-10-26 | Cyan → Electric green accent | Green = money, go, success. Platform's identity is real-money competition; action color should reinforce financial safety and winning. |
| 2026-10-26 | Space Grotesk → Satoshi for dashboard display | Space Grotesk is overused in tech/gaming. Satoshi has same geometric DNA but fresher proportions and wider letterforms. |
| 2026-10-26 | Added JetBrains Mono for monetary amounts | Tabular lining figures prevent digit-dancing on live-updating balances. Monospace for money signals precision — what banks and trading platforms do. |
| 2026-10-26 | Two-accent system (green/blue) | Green = action/money, blue = information/navigation. Separates "act on this" from "look at this" in a platform where the distinction involves real money. |
