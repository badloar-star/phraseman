# Phraseman Avatar Price Showcase — Design

## Goal

Create a standalone, browser-ready HTML showcase for the 43 priced avatar pairs numbered 41–83. The page must make the price ladder and increasing visual rarity immediately understandable while showing that every dark/light pair consists of two independent generations.

## Scope

- Display exactly 43 active priced pairs from `collection-manifest.json`.
- Price groups: 10 × 50, 10 × 70, 10 × 100, 10 × 150, and 3 × 300 pearls.
- Use the final normalized WebP assets already stored under `avatar-NN/pairs/`.
- Do not integrate the mockup into the production app, economy, navigation, or asset maps.
- Do not display removed mechanical avatars, people, robots, machines, or vehicles.

## Visual Direction

Use a premium dark showroom rather than a plain table. Each tier receives a distinct accessible accent color and rarity label, but color is reinforced by price and text so it is never the only signal. Cards use restrained translucent surfaces, crisp borders, generous spacing, and a consistent hexagonal display stage. Lime or neon-green filled controls always use dark foreground text.

The page has a compact hero summary, sticky price filters, tier sections, and a responsive card grid. Cards show the dark generation on the left and the light generation on the right with persistent labels. Higher tiers gain progressively richer card framing and subtle visual emphasis without changing asset scale or making lower tiers look defective.

## Components

1. **Hero summary** — collection title, 43-pair count, five price groups, and the independent-generation rule.
2. **Sticky filter bar** — `Все`, `50`, `70`, `100`, `150`, and `300`; each control is keyboard accessible, at least 44 px high, and includes pair counts.
3. **Tier section** — price, rarity name, short explanation, pair count, and responsive grid.
4. **Avatar card** — number, Russian archetype, slug, price pill, two labeled image stages, and optional rarity treatment.
5. **Empty state** — shown only if filtering yields no cards.

## Interaction

- Clicking or keyboard-activating a price filter shows only that tier; `Все` restores the full collection.
- The selected filter uses `aria-pressed="true"` and a visible focus state.
- Cards have a restrained 180–240 ms border/shadow transition with no layout-shifting scale animation.
- Motion is disabled when `prefers-reduced-motion: reduce` is active.
- Images use meaningful alt text, explicit dimensions, and lazy loading.

## Data Flow

The standalone HTML embeds a generated JavaScript data array derived from the manifest at build time. Asset URLs remain relative to the showcase file, so a simple local static server can display every image. No API, database, account state, or payment logic is involved.

## Responsive Behavior

- 1440 px: three cards per row.
- 1024 px: two cards per row.
- 768 px and below: one card per row.
- 375 px: both variants remain side by side inside the card without horizontal page scrolling.

## Verification

- Confirm 43 cards and exact tier counts of 10/10/10/10/3.
- Confirm 86 distinct visible image elements and no missing asset requests.
- Confirm filters, keyboard focus, `aria-pressed`, and responsive layouts at 375, 768, 1024, and 1440 px.
- Confirm no production files or app behavior are modified.
- Capture a browser screenshot of the completed showcase.
