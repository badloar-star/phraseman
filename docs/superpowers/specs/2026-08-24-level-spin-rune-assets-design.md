# Level Spin Rune Assets

## Objective

Replace the seven star-shaped reward images with a coherent family of premium rune-stone assets. The level-spin reward mechanics and existing internal asset identifiers remain unchanged.

## Scope

The following production assets are replaced in place:

- `stars_10.webp`
- `stars_20.webp`
- `stars_50.webp`
- `stars_100.webp`
- `stars_250.webp`
- `stars_500.webp`
- `stars_1000.webp`

No other reward family, reward probability, grant logic, balance field, or visible reward quantity changes in this work.

## Visual System

The family consists of isolated tactile rune stones rather than stars, coins, crystals, celestial medallions, or mechanical compasses.

- Primary material: matte obsidian.
- Secondary material: restrained warm porcelain.
- Accent material: muted champagne metal.
- Silhouette: compact stone tablet with softly rounded, deliberately irregular edges.
- Rune: one large abstract angular carved glyph per asset, unmistakably a rune and never a five-point star.
- Rendering: premium soft 3D, controlled studio key light, subtle internal self-shadowing.
- Background: genuine transparent alpha from generation; no floor, backdrop, cast shadow, glow, vignette, or checkerboard.
- Content: no letters, digits, words, logos, UI cards, stars, rainbow color, neon color, or small decorative clutter.
- Framing: centered three-quarter view, complete object inside the square canvas, with 12–15% transparent padding.

## Value Progression

The palette remains constant across all seven rewards. Value is expressed structurally:

- `10`: one simple obsidian rune stone with a shallow porcelain-carved glyph.
- `20`: slightly thicker stone with a narrow champagne edge inset.
- `50`: double-layer tablet with a deeper rune cut.
- `100`: larger faceted stone with a restrained porcelain inner plate.
- `250`: architectural double frame and more pronounced relief.
- `500`: monumental stacked stone with a refined champagne binding.
- `1000`: the most substantial carved monolith, with the deepest layered construction and highest material finish.

Each tier must still read as the same family at small mobile UI size. No tier may reintroduce a star silhouette or become a circular astrological seal.

## Delivery Workflow

Assets are generated and reviewed one at a time, beginning with `stars_10`. Each generated source must have genuine alpha from the image generator. Failed transparency, fake checkerboards, matte contamination, clipped edges, or an ambiguous star-like rune cause regeneration; local background removal is not allowed.

Only after owner approval of one asset may the next tier be generated. Approved sources are resized and compressed to 512×512 WebP with alpha preserved, then replace the corresponding existing production file.

## Verification

For every asset:

1. Confirm square RGBA source with true transparency and transparent corners.
2. Inspect full size for clean edges and transparent negative spaces.
3. Inspect at approximately 300 px on black, white, theme-card, and saturated-color backgrounds.
4. Inspect at the real reward-art size for rune legibility and family consistency.
5. Confirm there is no five-point star, text, numeral, background, or baked cast shadow.
6. Confirm the final WebP is 512×512, has alpha, is statically referenced, and passes the focused reward-asset tests.

