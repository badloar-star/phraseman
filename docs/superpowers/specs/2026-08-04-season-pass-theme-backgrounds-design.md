# Season Pass Theme Backgrounds — Design

Date: 2026-08-04
Status: approved by owner

## Goal

Give the Season Rewards track a unique background for every interface theme. The background must make the left lane read as the Free side and the right lane read as the Plus side while following the existing uneven central spine exactly.

## Scope

- Target screen: `app/season_pass.tsx`.
- Preserve all 60 rewards, their order, cards, labels, thresholds, claim behavior, purchase behavior, scrolling, and progress rendering.
- Add one unique generated background kit for every `ThemeMode`: `dark`, `gold`, `coral`, `minimalDark`, `midnight`, `ember`, `aurora`, `volt`, `business`, `businessLight`, `candyBlue`, `indigo`, and `sagePorcelain`.
- Do not reuse or alias another theme's background.

## Existing Geometry Contract

The divider is the existing season spine, not a new decorative approximation:

- row height: 142 px;
- central node column: 56 px;
- spine center: the physical horizontal center of the track;
- maximum lateral wave amplitude: 8 px;
- curve: the cubic Bézier path returned by `spineTrackPath()`;
- track length: 60 rows, or 8520 px before overscan;
- top overscan: `insets.top + 420`;
- bottom overscan: 220 px.

The raster art must not contain a baked-in divider. A baked curve would drift on different device widths and would not remain synchronized with the scroll coordinate system. The runtime uses the same path data as the visible spine to define the semantic boundary between the two visual zones.

## Visual Direction

Each theme kit is a two-zone, text-free background:

- Left / Free: restrained theme material, low-density particles, quieter lighting, modest reward motifs, and lower visual energy.
- Right / Plus: richer material, brighter premium lighting, gold-compatible highlights, denser reward particles, crystals or treasure energy, and visibly higher perceived value.
- Center: a calm transition area so the 56 px node column and the ±8 px spine remain legible.
- No words, letters, numbers, logos, badges, UI controls, or fake reward cards in the generated raster.

The art supports the existing cards rather than competing with them. Theme-aware overlays keep reward names, star thresholds, locks, and icons readable in both light and dark themes.

## Asset Contract

- Static local WebP assets only.
- Every file is referenced through a literal `require()` before it is accepted into `assets/images/**`.
- All 13 theme keys have distinct files and distinct content hashes.
- Generated sources and intermediate crops remain outside the bundled asset tree.
- Final bundled images are compressed WebP; no speculative variants are shipped.

## Rendering Architecture

1. A typed theme-to-background registry returns the exact asset for the active `ThemeMode`.
2. The background is mounted in the same FlatList coordinate system as the season spine.
3. The Free and Plus visual zones are separated using geometry derived from the same `spineTrackPath()` inputs used by the visible line.
4. The existing gray/gold progress spine remains on top and unchanged in behavior.
5. Reward rows, hit targets, accessibility labels, header, purchase sheet, and modals remain above the decorative background.
6. Decorative imagery is hidden from accessibility services and never intercepts touches.

## Performance and Accessibility

- Do not mount a generated image per reward card.
- Reuse a bounded background surface or repeatable texture strategy instead of decoding a full 8520 px bitmap.
- Keep the current 44 px minimum interactive targets and existing accessibility roles/labels.
- Use theme-aware scrims where required so normal text retains at least 4.5:1 contrast.
- The background has no semantic accessibility content.

## Verification

- Contract test covers all 13 `ThemeMode` keys with no fallback aliases.
- Contract test proves all assets are statically required and files exist.
- Hash check proves all 13 final backgrounds are distinct.
- Existing spine continuity tests remain green.
- Season pass source contract confirms the background is decorative, non-interactive, and rendered beneath the spine and reward content.
- Focused TypeScript/test gates run without updating snapshots or rewriting source.
- Visual inspection covers at least one dark theme, one light theme, one cinema theme, and both business themes at a narrow mobile width.

## Acceptance Criteria

1. The left side reads immediately as Free and the right side as Plus without relying only on the column labels.
2. The visual boundary follows the existing uneven spine rather than a straight or baked raster split.
3. Every interface theme has its own recognizable background.
4. Reward cards and text remain legible and fully interactive.
5. No existing season-pass functionality is removed or changed.
6. Bundled assets are wired, compressed, unique, and free of unused source files.
