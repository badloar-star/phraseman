# Season Pass Fixed Theme Backgrounds — Design

Date: 2026-08-04
Status: approved by owner

## Goal

Give the Season Rewards screen one high-detail, continuous, fixed background for every interface theme. The reward list scrolls above the artwork; the artwork never tiles, repeats, jumps, or exposes a transition seam.

## Scope

- Target screen: `app/season_pass.tsx`.
- Preserve all rewards, cards, labels, thresholds, claims, purchase behavior, scrolling, modals, and accessibility behavior.
- Replace the existing 26 scrolling Free/Plus tiles with 13 newly generated portrait backgrounds: one distinct asset for every `ThemeMode`.
- The supported modes are `dark`, `gold`, `coral`, `minimalDark`, `midnight`, `ember`, `aurora`, `volt`, `business`, `businessLight`, `candyBlue`, `indigo`, and `sagePorcelain`.
- No theme may reuse or alias another theme's background.

## Visual Contract

Each asset is one unified portrait composition:

- Left / Free: quieter material, fewer highlights, restrained detail, and lower perceived value.
- Right / Plus: richer material, premium lighting, denser but controlled detail, and gold-compatible highlights.
- Center: a soft transition band with no hard raster seam. The live gold SVG spine sits over this band and remains the semantic boundary.
- Top: enough calm contrast for the status bar and season header.
- Whole canvas: continuous material and lighting with no horizontal bands, panel borders, tile edges, repeated motifs, or abrupt texture changes.
- No text, letters, numbers, logos, badges, controls, fake cards, or baked divider line.

The `ember` theme is explicitly non-volcanic: warm amber glass, dark plum, smoked bronze, and soft mineral light are allowed; fire, flames, lava, sparks, embers, magma, glowing cracks, and burnt landscapes are forbidden.

## Asset Contract

- Source generation target: full portrait image, 1024 × 1536 or larger.
- Final bundled asset: 768 × 1152 WebP at quality 40, encoded directly from the 1024 × 1536 PNG source.
- The complete 13-theme bundled set must not exceed 500,000 bytes; no single theme may exceed 110,000 bytes.
- One literal static `require()` per theme in `app/season_pass_theme_backgrounds.ts`.
- Generated originals and QA sheets stay outside `assets/images/**`; only final compressed WebP files are bundled.
- All 13 content hashes must be distinct.
- No 2×2 atlases, quadrant crops, upscaled 512 px halves, or repeatable tiles.

At a 390 px mobile viewport, the 768 px bundled width provides almost 2 source pixels per logical point. The original 1024 × 1536 PNG sources remain outside the bundle for future re-encoding without generational loss.

## Rendering Architecture

1. The registry returns one `ImageSourcePropType` for the active theme.
2. One decorative React Native `Image` is mounted as an absolute-fill child of the screen root, before the `FlatList`.
3. The image uses `resizeMode="cover"`, does not intercept touches, is hidden from accessibility, and remains fixed while the list scrolls.
4. A restrained theme-color scrim may sit above the image when needed for header and label contrast.
5. The long SVG track no longer contains image patterns, clip paths, or repeated raster fills. It keeps only the exact continuous gold spine and progress geometry above the fixed artwork.
6. Reward content and all interactive UI remain above both decorative layers.

## Performance and Accessibility

- Decode exactly one 768 × 1152 WebP for the active theme, not one image per reward and not an 8520 px bitmap.
- Theme switches replace the single image through the existing static registry.
- Decorative image and scrim use `pointerEvents="none"` and are not announced by accessibility services.
- Existing 44 px minimum touch targets and accessibility labels remain unchanged.
- Cards retain opaque or translucent theme surfaces sufficient for readable text; the background never becomes the only indicator of Free versus Plus.

## Verification

- TDD contract first fails against the old `{ free, plus }` registry and SVG patterns.
- Registry contract proves exactly 13 literal full-screen asset requires with no aliases.
- Image metadata contract proves WebP, 768 × 1152, a 500,000-byte total budget, a 110,000-byte per-file ceiling, and distinct hashes.
- Screen contract proves the absolute image renders before `FlatList`, uses `resizeMode="cover"`, is non-interactive, and no longer uses SVG image patterns for the background.
- Existing spine continuity tests prove the divider still extends through top and bottom overscan as one path.
- Visual QA checks every theme at full size, with special rejection rules for seams, low-detail/upscaled appearance, text artifacts, and forbidden fire/lava imagery in `ember`.

## Acceptance Criteria

1. The artwork does not move when rewards scroll.
2. No horizontal or central raster seam is visible anywhere on the screen.
3. The background appears continuous from the first visible pixel to the last.
4. Free reads calmer on the left and Plus reads richer on the right.
5. All 13 themes have distinct, full-resolution artwork.
6. `ember` contains no fire or lava family imagery.
7. The continuous gold divider remains visible from the beginning to the end of the reward track.
8. No existing season-pass functionality is removed.
