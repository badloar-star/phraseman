# Quiz Level Theme Audit And DALL-E Asset Pass

Date: 2026-05-18

## Scope

This audit covers the quiz level select screen shown in the mobile app:

- `app/(tabs)/quizzes.tsx`
- shared asset registry: `app/quizzes/constants.ts`
- generator: `scripts/generate-quiz-level-theme-assets.mjs`
- final assets under `assets/images/quizzes/level_cards/` and `assets/images/quizzes/level_logos/`

## Current Finding

The project already had a generated quiz theme asset pipeline and DALL-E source candidates:

- `qa-artifacts/recent-generated-quizzes-candidates.json`
- `qa-artifacts/quiz-level-theme-assets-manifest.json`
- `qa-artifacts/quiz-level-theme-assets-preview.webp`

The route `app/quizzes.tsx` was already wired to the new themed card and logo assets. The visible tab screen, `app/(tabs)/quizzes.tsx`, still rendered old level art from `assets/images/levels/easy.webp`, `medium.webp`, and `hard.webp`. That is why the UI could still look like the screenshot even though the new assets existed in the repository.

## App Style Read

The app style is a dark, gamified language-learning UI with fantasy reward framing:

- full-screen themed backdrops via `ScreenGradient` and `artBackdrop="quizzes"`;
- compact mobile cards with large labels, CEFR chips, and strong right-side reward icons;
- theme modes: `dark`, `neon`, `gold`, `coral`, `minimalLight`, and `minimalDark`;
- production constraints: fixed card/icon dimensions, no layout shifts, readable labels, accessible touch targets.

The recommended UI direction from `ui-ux-pro-max` is a vibrant, block-based gamified system. For this app, the practical interpretation is not a flat kid-style palette, but distinct collectible card treatments per theme: dark archive, neon circuit, golden sanctum, coral forge, ivory sketch, and graphite study.

## Asset System

Generated production set:

- Cards: `640x236` WebP
- Logos: `260x260` WebP with alpha
- Count: `18` pairs, meaning 6 themes times 3 levels

Level motifs:

- `easy` / `A1-A2`: shield/leaf gate, calmer starter silhouette
- `medium` / `B1-B2`: ember/dialogue mark, warmer and more active
- `hard` / `C1-C2`: crystal crown, higher prestige and sharper geometry

Theme art directions:

| Theme | Style | Primary feel |
| --- | --- | --- |
| dark | Dark archive | emerald, arcane, readable on deep green UI |
| neon | Neon circuit | cyan, acid, magenta, cyber reward |
| gold | Golden sanctum | premium relic, amber metal, warm prestige |
| coral | Coral forge | red/coral heat, energetic challenge |
| minimalLight | Ivory sketch | light parchment, refined lines, calmer contrast |
| minimalDark | Graphite study | restrained graphite, study-grid structure |

## DALL-E Prompt Strategy

DALL-E should produce theme source art without text, labels, numbers, or UI copy. The local generator then crops, overlays deterministic card texture, and creates stable logos. This keeps text readable and avoids image-model mistakes in UI labels.

Base prompt:

```text
Create one premium mobile game quiz level theme artwork for a language-learning app.
No text, no letters, no numbers, no watermark.
The image should work as source art for collectible quiz level cards and icons.
Use a rich fantasy game UI material style: polished glass, subtle metal trim, magical light, clean high-contrast shapes, and no busy scene details.
Keep the center and edges clean enough for mobile UI cropping.
Square composition, high detail, premium game asset polish.
```

Theme modifiers:

```text
Dark archive: deep emerald-black archive, old spellbook geometry, muted gold glints, serious and readable.
Neon circuit: dark cyber circuit board, cyan and magenta glow, energetic but not cluttered.
Golden sanctum: warm amber sanctuary, polished gold, circular relic geometry, premium and calm.
Coral forge: coral-red forge heat, ember lines, active challenge energy, controlled glow.
Ivory sketch: ivory parchment, fine pencil-like geometry, soft green and tan accents, clean light theme.
Graphite study: graphite-black study grid, steel-blue accents, precise academic structure, restrained glow.
```

## Implementation Notes

`app/(tabs)/quizzes.tsx` now uses:

- `QUIZ_LEVEL_CARD_BACKGROUNDS[themeMode][level]`
- `QUIZ_LEVEL_LOGOS[themeMode][level]`
- `ExpoImage` for cached card and logo rendering

The tab screen also now has explicit `minimalLight` and `minimalDark` palettes so those themes keep unique colors instead of falling back to the dark palette.

## Acceptance Checks

- All 18 card/logo pairs exist.
- Card dimensions are stable at `640x236`.
- Logo dimensions are stable at `260x260`.
- Logos keep alpha.
- The visible tab quiz level select uses the new assets.
- Theme colors remain unique per app theme.

