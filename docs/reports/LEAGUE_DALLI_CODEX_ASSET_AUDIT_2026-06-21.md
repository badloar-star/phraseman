# League DALL-E Codex Asset Audit - 2026-06-21

## Scope

Audit and upgrade weekly league visuals:

- Foreground league icons: replace existing v5 transparent heraldry with v6 Codex/DALL-E badge cutouts.
- New league card backgrounds: v6 Codex/DALL-E generated cards.
- New foreground league icons: v6 Codex/DALL-E generated transparent badge cutouts.
- App wiring: `app/league_engine.ts`, `app/club_screen.tsx`, OTA bundling, and tests.

## Findings

1. The app already used 12 v5 transparent heraldry icons from `assets/images/levels/league-v5-heraldry/`.
2. The league preview card still used a shared gradient/decorative background, so swiping leagues changed the icon and text but not the world/material behind the league.
3. `tests/league_icon_assets.test.ts` was stale: it still enforced v4 `league-v4-icons`, while production code already referenced v5 heraldry.
4. `app.json` bundled v5 heraldry but had no dedicated paths for new large league cards or v6 foreground icons.
5. The v5 heraldry icons needed per-league offset compensation; the new v6 icon set is centered on a stable `384x384` transparent canvas, so legacy offsets were removed.

## Design Direction

Applied `ui-ux-pro-max` guidance for a gamified language-learning mobile app:

- Use vibrant, block-based, high-contrast visual language for motivation.
- Keep text native and localized; generated art must not contain text, letters, numbers, or logos.
- Separate foreground identity from background atmosphere: v6 transparent icons carry the readable league mark, v6 cards carry the emotional/rank environment.
- Add a dark readability veil over background art so league names and XP bonus pills pass contrast on mobile.

## Codex/DALL-E Generation

Generation mode: Codex in-thread DALL-E, not API.

Safety choice: one 3x4 card atlas and one 3x4 icon atlas instead of 24 separate image generations, avoiding a large base64 batch in the Codex session.

Card source:

- Codex generated image root: `C:\Users\badlo\.codex\generated_images\019eeb6a-29a9-7db3-a85c-1962b4cbeb6b`
- Exported atlas: `.codex-tmp/league-assets/dalli-sources/league_cards_v1/league_cards_atlas_v1.png`
- Export report: `.codex-tmp/league-assets/atlas-export.json`

Icon source:

- Exported atlas: `.codex-tmp/league-assets/icon-dalli-sources/league_icons_v1/league_icons_atlas_v1.png`
- Export report: `.codex-tmp/league-assets/icon-atlas-export.json`

Final cards:

- `assets/images/levels/league-v6-cards/league-card-med.webp`
- `assets/images/levels/league-v6-cards/league-card-bronz.webp`
- `assets/images/levels/league-v6-cards/league-card-serebro.webp`
- `assets/images/levels/league-v6-cards/league-card-zoloto.webp`
- `assets/images/levels/league-v6-cards/league-card-platina.webp`
- `assets/images/levels/league-v6-cards/league-card-izumrud.webp`
- `assets/images/levels/league-v6-cards/league-card-sapfir.webp`
- `assets/images/levels/league-v6-cards/league-card-rubin.webp`
- `assets/images/levels/league-v6-cards/league-card-almaz.webp`
- `assets/images/levels/league-v6-cards/league-card-cherniy-almaz.webp`
- `assets/images/levels/league-v6-cards/league-card-efir.webp`
- `assets/images/levels/league-v6-cards/league-card-vishaya.webp`

All final cards are WebP `768x363`.
The final card builder now preserves the native atlas tile crop. Because padded `16:9` conversion created visible horizontal seams, final cards must not add vertical padding, mirror extension, or `cover` crop.

Final icons:

- `assets/images/levels/league-v6-icons/league-icon-med.webp`
- `assets/images/levels/league-v6-icons/league-icon-bronz.webp`
- `assets/images/levels/league-v6-icons/league-icon-serebro.webp`
- `assets/images/levels/league-v6-icons/league-icon-zoloto.webp`
- `assets/images/levels/league-v6-icons/league-icon-platina.webp`
- `assets/images/levels/league-v6-icons/league-icon-izumrud.webp`
- `assets/images/levels/league-v6-icons/league-icon-sapfir.webp`
- `assets/images/levels/league-v6-icons/league-icon-rubin.webp`
- `assets/images/levels/league-v6-icons/league-icon-almaz.webp`
- `assets/images/levels/league-v6-icons/league-icon-cherniy-almaz.webp`
- `assets/images/levels/league-v6-icons/league-icon-efir.webp`
- `assets/images/levels/league-v6-icons/league-icon-vishaya.webp`

All final icons are transparent WebP `384x384`.
The icon cutouts now reserve a larger transparent safety area: source content is fitted into a `312x312` inner box on the `384x384` canvas.
The icon builder now trims only `14px` of atlas gutter and runs an artifact cleanup pass for tall dark side columns, preventing both clipped shields and black grid-line leftovers.

## Implementation

- Added `cardImageUri` to `ClubDef` and `LEAGUES`.
- Wired every league to a v6 icon and v6 card in `app/league_engine.ts`.
- Rendered the current/preview league card as the top card background in `app/club_screen.tsx`.
- Corrected the league preview card insertion: it now uses a dedicated rounded native-aspect mask container with `overflow:'hidden'`, shared `borderRadius`, and `StyleSheet.absoluteFillObject` for the card image and overlays.
- Corrected the card asset pipeline: `scripts/build-league-card-assets.mjs` now writes native-aspect card assets directly from cleaned atlas crops, avoiding both source-scene cropping and padding seams.
- Reduced preview icon pressure inside the card: the UI renders bundled icons with a `0.94` safe scale, and the source assets have extra alpha padding so shields do not look cropped.
- Corrected the icon asset pipeline: `scripts/build-league-icon-assets.mjs` now removes atlas gutter/grid artifacts without using the previous over-wide trim that clipped shield tips.
- Kept the old gradient/card structure as fallback if a card asset is missing.
- Removed legacy v5 per-league icon offsets because v6 icons are centered cutouts.
- Added `assets/images/levels/league-v6-icons/*.webp` and `assets/images/levels/league-v6-cards/*.webp` to Expo OTA asset bundling.
- Added `scripts/build-league-card-assets.mjs` to rebuild cards from the exported Codex/DALL-E atlas and produce a manifest/contact sheet.
- Added `scripts/build-league-icon-assets.mjs` to rebuild transparent icons from the exported Codex/DALL-E atlas and produce a manifest/contact sheet.

## Verification

Ran:

```bash
npx jest --runTestsByPath tests/league_icon_assets.test.ts tests/league_current_icon_content_alignment.test.ts --no-cache --runInBand
```

Result:

- 2 test suites passed.
- 7 tests passed.

Visual QA artifacts:

- `.codex-tmp/league-assets/current-heraldry-contact.png`
- `.codex-tmp/league-assets/league-v6-cards-contact.png`
- `.codex-tmp/league-assets/league-v6-cards-with-heraldry-preview.png`
- `.codex-tmp/league-assets/league-v6-icons-alpha-check.png`
- `.codex-tmp/league-assets/league-v6-cards-with-v6-icons-preview.png`
- `.codex-tmp/league-assets/league-v6-fixed-card-layout-preview.png`
- `.codex-tmp/league-assets/league-v6-no-crop-app-preview.png`
- `.codex-tmp/league-assets/league-v6-native-aspect-no-strip-preview.png`
