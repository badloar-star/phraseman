# Tournament Theme Personalization

**Date:** 2026-08-03

**Status:** approved by owner
**Surface:** every player-facing Tournament screen and shared Tournament UI component

> **Owner override (2026-08-03):** ship only `backdrop` and `podium`. Decorative
> `header` and `ornament` layers, assets, mappings, and screen placements are removed.
> Any older four-slot wording below is historical and superseded by this override.

## Goal

Remove the empty, generic appearance from the Tournament flow. Every selectable app theme must give the Tournament its own authored environment, materials, silhouettes, decorative language, and celebration treatment. This is not a recolor of one common composition.

The redesign must preserve Tournament mechanics, navigation, timing, scoring, entry rules, economy, accessibility, and data contracts.

## Screen Inventory

The visual system covers the complete player flow:

1. Tournament hub: `app/(tabs)/tournaments.tsx`;
2. lobby: `app/tournament_lobby.tsx`;
3. live round and round intro: `app/tournament_round.tsx` and `components/tournament/TournamentRoundIntro.tsx`;
4. intermediate table / watch state: `app/tournament_table.tsx`;
5. final results: `app/tournament_results.tsx`;
6. answer review: `app/tournament_review.tsx`;
7. season table: `app/tournament_season.tsx`;
8. tickets: `app/tournament_tickets.tsx`;
9. loading, offline, cancelled, and unavailable states in `components/tournament/TournamentEdgeState.tsx`;
10. Tournament sheets and overlays rendered by the hub and shared Tournament primitives.

## Chosen Direction

Each selectable theme receives a separately authored Tournament visual kit. A kit is generated and art-directed from that theme's existing home assets. Kits may share slot names and layout contracts, but they must not share the same raster composition with different colors.

Each kit contains four wired, compressed WebP slots:

1. `backdrop` — a full-screen environmental field with quiet central reading space;
2. `header` — a transparent upper composition for the hub, lobby, season, and tickets screens;
3. `podium` — a transparent celebration base for results and top-three tables;
4. `ornament` — a transparent motif sheet used sparingly at corners, separators, empty states, and transition moments.

The four slots are reused differently by screen role. Reuse creates consistency inside one theme without making different themes copies of each other.

## Theme Art Direction

The nine selectable themes are independent art families:

- `indigo`: deep indigo lacquer, faceted violet glass, clean silver geometry, focused academic prestige;
- `sagePorcelain`: matte celadon porcelain, warm ivory ceramic, dark jade details, restrained antique brass;
- `midnight`: navy enamel, ivory paper, silver edging, sapphire light, formal night-time study atmosphere;
- `ember`: charcoal surfaces, blackened metal, copper hardware, controlled ember light and sparse sparks;
- `aurora`: layered translucent glass, cool prismatic ribbons, soft polar light, airy luminous depth;
- `volt`: dark technical panels, electric yellow-green energy paths, machined hardware, precise high-energy accents;
- `dark`: deep forest materials, carved dark wood or stone, mossy light, restrained natural depth;
- `coral`: warm coral ceramic, terracotta and shell-like forms, cream highlights, soft coastal light;
- `gold`: black and warm ivory architectural forms, substantial brushed gold, ceremonial light, premium restraint.

These descriptions control form, material, lighting, and environment — not merely hue. Generated kits must be compared with the real home assets for the same theme before acceptance.

Removed legacy modes do not add bundled files:

- `minimalDark` and `candyBlue` resolve to `indigo`;
- `business` resolves to `gold`;
- `businessLight` resolves to `sagePorcelain`.

## Screen Composition

### Hub, lobby, season, and tickets

Use the full thematic backdrop plus the theme-specific header composition. The header art occupies previously empty upper space and frames the title without sitting behind body copy. Cards remain content-first and use existing theme-aware surfaces.

### Live round and answer review

Use a quieter crop of the backdrop with lower contrast and no large header object. Decorative motifs stay outside the question and answer zones. Correctness, selection, timer, and difficulty states keep their existing semantic colors and cannot depend on decoration alone.

### Intermediate table and results

Use the themed podium and a more celebratory backdrop treatment. The podium supports player placement visually but never replaces place numbers or labels. Existing medal metals remain gold, silver, and bronze so placement recognition stays consistent across themes.

### Edge and empty states

Use one theme ornament or header fragment at reduced prominence. Empty states must look intentional rather than blank, while retry and exit controls remain the first interaction target.

## Component Architecture

Add a typed, static asset resolver with one source of truth:

- `components/tournament/tournament_theme_assets.ts` owns every static `require()`;
- `getTournamentThemeAssets(themeMode)` returns the four-slot kit;
- all nine selectable themes have four distinct paths;
- removed modes map to existing kits without extra files.

Add one shared rendering primitive:

- `components/tournament/TournamentBackdrop.tsx` renders the backdrop, optional header/podium/ornament layers, safe gradients, and focus-gated motion;
- a required `variant` selects `hub`, `lobby`, `play`, `table`, `results`, `review`, `season`, `tickets`, or `edge` composition;
- screens provide content only and do not construct asset paths or duplicate theme switches.

Extend `TournamentV2` only with derived overlay/scrim tokens needed for readable composition. Raster identity stays in the asset resolver, not in palette math.

## Motion

The Tournament should feel alive without running hot:

- slow background light breathing through opacity;
- rare, low-count motif drift for hub, lobby, and results only;
- a short entrance reveal for header and podium layers;
- no continuous decorative motion on the live question layer;
- transform and opacity only;
- all loops gated by `useIsScreenFocused()`, active `AppState`, and Reduced Motion;
- static fallback frame when motion is disabled;
- no new timer faster than 1000 ms.

Existing Tournament feedback and scoring animation timings remain unchanged.

## Asset Generation And Weight

Wire all static `require()` slots before generation. Generate each theme kit from that theme's real home assets as direct style references. Raw generations, atlases, chroma-key sources, crops, and previews stay under `.codex-tmp/tournament-theme-art/`.

To respect Codex bulk-image safety, generate one four-cell atlas per theme, checkpoint each completed theme, export results immediately, and split generation into small batches rather than retaining a large in-thread batch. Only final transparent or full-bleed WebP files enter `assets/images/tournament/themes/<theme>/`.

Final asset rules:

- no text, letters, numerals, logos, watermarks, or UI controls inside the art;
- no fantasy/RPG iconography unrelated to the source theme;
- no object may intrude into protected title, question, answer, timer, or CTA zones;
- WebP quality chosen by visual comparison at device size, approximately 58–76;
- alpha preserved for `header`, `podium`, and `ornament`;
- each kit is budgeted independently; the complete nine-theme set targets at most 1.2 MB;
- no unused variants or raw sources in `assets/images/**`.

## Accessibility And Interaction

- Normal text retains at least 4.5:1 contrast against the composed background.
- A gradient or scrim protects text when a background crop is visually active.
- Lime, neon-green, and correct-state fills always use dark foreground text and icons.
- Interactive targets remain at least 44 × 44 px and keep accessibility labels and roles.
- Decoration is non-interactive, hidden from accessibility traversal, and cannot be the only carrier of status.
- Dynamic Type behavior and existing authored line wrapping remain intact.

## Performance

- Every background uses a fixed reserved layer so content does not jump during hydration.
- Theme assets resolve synchronously from static `require()` calls.
- Screen variants reuse one mounted rendering primitive and avoid per-render image-map construction.
- Invisible tabs and blurred Tournament screens remain frozen under existing performance contracts.
- Decorative animation stops on blur/background and is not mounted where the variant disables motion.
- Assets are preloaded only for the active theme and upcoming Tournament screen, not all nine kits at startup.

## Testing And Verification

Focused contracts must prove:

- all nine selectable themes have four distinct static asset paths;
- legacy theme mappings resolve without adding files;
- every final asset exists, is WebP, respects dimensions/alpha rules, and stays within the total budget;
- all player-facing Tournament screens render `TournamentBackdrop` with the correct variant;
- no Tournament screen constructs dynamic asset paths;
- round and review variants keep decoration outside protected content regions;
- background motion contains focus, AppState, cleanup, and Reduced Motion gates;
- Tournament mechanics and existing focused Tournament contracts remain unchanged;
- Metro registers and serves every wired file;
- representative screenshots cover at least `indigo`, `sagePorcelain`, `midnight`, `ember`, `aurora`, `volt`, `dark`, `coral`, and `gold` on hub, play, and results variants.

## Non-Goals

- No recoloring of a shared raster composition.
- No changes to Tournament scoring, timing, schedules, rooms, matchmaking, bots, economy, rewards, or navigation.
- No redesign of avatars, collectibles, league assets, or unrelated screens.
- No new theme modes and no restoration of removed themes.
- No replacement of semantic correct, wrong, warning, medal, or rank indicators with decorative art.
