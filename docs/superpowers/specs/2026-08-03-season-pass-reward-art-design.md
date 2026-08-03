# Season Pass Reward Art Redesign

**Date:** 2026-08-03

**Status:** approved by owner
**Surface:** `app/season_pass.tsx` and `components/SeasonGiftModal.tsx`

## Goal

Make every non-system Season Pass reward immediately recognizable at phone size. Replace the reused placeholder art with unique generated art, enlarge the reward visuals in the track, and replace the existing season aura stages with distinct animated auras.

## Scope

The redesign covers all non-system Season Pass reward kinds:

1. battery
2. league boost
3. club totem
4. golden lesson
5. collection magnet
6. turbo regeneration
7. tournament ticket
8. time machine
9. friend shield
10. choice of three
11. XP bank
12. Plus days
13. profile frame
14. nickname color
15. custom avatar
16. card pack

Aura art is a separate progression with five distinct visuals:

1. aura stage I
2. aura stage II
3. aura stage III
4. aura stage IV / season finale
5. secret aura

Pearls and any other system-owned currency art continue to use the existing theme-aware currency components and assets.

## Theme Model

Only two generated art families are required:

- **Light:** used by `sagePorcelain`, the canonical light theme returned by `isLightThemeMode`.
- **Dark:** used by every other `ThemeMode`.

Each reward has one light and one dark file. Each aura has three independently animated files per theme: a structural base, an energy-flow ribbon, and particles/highlights. Theme selection is centralized in `app/season_pass_track_config.ts`; screens and modals request an asset through typed resolver functions instead of reading a shared constant directly.

## Art Direction

Reward icons use a consistent premium collectible-object language:

- centered single object;
- large, unmistakable silhouette;
- three-quarter 3D illustration with restrained material detail;
- no text, numerals, logos, characters, or watermarks;
- transparent background after local chroma-key removal;
- generous safe padding but no tiny subject inside a large canvas;
- unique object metaphor for every reward kind.

The light set uses saturated materials, darker edge definition, and restrained highlights so it remains visible on porcelain cards. The dark set uses brighter rim light and controlled glow so it remains visible on dark and colored themes. The object identity and composition stay aligned between the two sets.

## Generation Strategy

Use Codex built-in image generation, not a project API key. To avoid storing dozens of independent base64 generations in the session, generate eight source atlases:

1. light reward atlas: 4 × 4 cells;
2. dark reward atlas: 4 × 4 cells;
3. light aura base atlas: five isolated aura cells;
4. light aura flow atlas: five isolated aura cells;
5. light aura particles atlas: five isolated aura cells;
6. dark aura base atlas: five isolated aura cells;
7. dark aura flow atlas: five isolated aura cells;
8. dark aura particles atlas: five isolated aura cells.

Every atlas uses a flat removable chroma-key background, fixed cell ordering, no labels, and no object crossing a cell boundary. Local tooling crops the cells, removes the key color, validates alpha coverage, resizes, and writes compressed WebP files. Raw atlases and intermediate PNGs stay in `.codex-tmp/season-pass-art/`; only final wired WebP files enter `assets/images/season/`.

## Track Layout

The current 34 px reward art is too small. The redesigned track uses:

- approximately 56–60 px reward art;
- approximately 60–64 px aura art;
- row height around 108 px so art and two-line labels do not collide;
- a vertical art-first card composition;
- claim and lock indicators pinned to a corner rather than consuming the icon row;
- unchanged tap behavior and a minimum 44 × 44 px interactive target;
- unchanged Season Pass mechanics, reward ordering, prices, claims, and system currency rendering.

Labels remain authored text and may wrap to two balanced lines. The art must remain the first visual read.

## Aura Progression And Motion

The aura family communicates progression rather than recoloring one ring. Every aura is assembled from three transparent layers so its movement reads as internal energy rather than a single rotating sticker:

- **Base:** the stable silhouette and soft breathing glow.
- **Flow:** one incomplete ribbon/arc that rotates independently from the base.
- **Particles:** sparse highlights that rotate at a third speed and twinkle through opacity.

- **Stage I:** restrained luminous seed ring; slow breathing pulse.
- **Stage II:** clean circular base with one separate C-shaped energy ribbon; no drooping double-loop silhouette.
- **Stage III:** asymmetric prismatic spiral; pulse, rotation, and brighter halo.
- **Stage IV / finale:** dense crowned vortex with the strongest motion and glow.
- **Secret:** unmistakable purple eclipse/vortex, visually separate from the four-stage path.

Animation uses transform and opacity only. The base, flow, and particles use different durations and may rotate in opposite directions; their pulse/twinkle phases are also independent. Infinite loops run only while the screen is focused and the app is active, stop during background/inactive states, clean up on unmount, and render a static frame when Reduced Motion is enabled.

## Integration

The same theme-aware art resolvers are used by:

- the Season Pass track;
- the reward modal hero art;
- choice-of-three reward rows.

Static `require()` calls wire every generated asset 1:1 before generation. No unused generated file is allowed under `assets/images/**`.

## Verification

Focused tests must prove:

- all sixteen non-system reward kinds have distinct light and dark asset paths;
- all five aura variants have distinct base, flow, and particle paths for both light and dark themes;
- `sagePorcelain` resolves the light family and every other theme resolves the dark family;
- pearls still use the existing system icon path;
- track reward and aura dimensions meet the new visibility floor;
- aura animation contains focus, AppState, cleanup, and Reduced Motion gates;
- generated WebP files exist, have alpha, are compressed, and are referenced by static `require()` calls;
- existing Season Pass reward behavior remains intact.

## Non-Goals

- No changes to reward values, schedule, ownership, purchase, claim, or application behavior.
- No unique art set for every individual dark theme.
- No replacement of currency, shard, or pearl assets.
- No redesign of unrelated gift inventories or general avatar auras.
