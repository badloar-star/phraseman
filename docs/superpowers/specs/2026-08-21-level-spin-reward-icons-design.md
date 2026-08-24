# Level Spin Reward Icons — Design Specification

**Date:** 2026-08-21

**Status:** owner-approved redesign

**Scope:** the 35 rewards in Level Spin catalog v2

## Goal

Replace the generic post-reveal gift placeholder with a coherent collection of
premium Phraseman artifacts. The collection must feel like one restrained
product system, not a set of unrelated colorful game rewards.

The same universal assets are used in every interface theme. This work does not
change reward probabilities, economy behavior, or star-ledger behavior.

## Owner decisions

- Generate the reward object itself, not a box, chest, emoji, or flat icon.
- Remove all baked text, numbers, `XP`, durations, and quantities from art.
- Render the localized reward name and amount separately in the interface.
- Use one common neutral material foundation across the entire collection.
- Give each reward family one restrained accent; values inside a family do not
  change hue.
- Values differ through silhouette, scale, construction, material, and detail.
- Use the approved Home asset grammar from
  `C:\Users\badlo\OneDrive\Desktop\ЭТАЛОН_HOME_ASSETS`.
- Use matte museum-artifact direction: premium, architectural, quiet, and
  tactile; no cartoon clay, toy styling, neon, candy color, or excessive glow.
- Avatar and aura artwork remains removed from this scope.

## Collection story

Every reward is a physical artifact from the Phraseman world:

- XP: knowledge crystals, codices, and knowledge vaults.
- Pearls: porcelain shells and reliquaries.
- Stars: astronomical medallions and celestial seals.
- Energy: sealed energy cores and vessels.
- Hints: study lamps and optical instruments.
- Chain protection: a shield-seal surrounded by a linked rim.
- XP banks: paired sealed knowledge tablets.
- Timed multipliers: hourglasses and chronometers.
- Plus days: access passes and keys.

The family must remain recognizable in grayscale. Color supports identity but
never carries it alone.

## Material and color system

All 35 assets share this foundation:

| Role | Color | Use |
|---|---|---|
| Obsidian | `#14171A` | structure, deep recesses, universal dark contour |
| Graphite | `#262A2E` | secondary structure and matte surfaces |
| Porcelain | `#E6E0D3` | light planes and universal light contour |
| Champagne metal | `#A68B60` | restrained hardware and rarity detail |

Each family adds only one muted accent:

| Family | Accent | Color |
|---|---|---|
| XP and XP banks | Smoky indigo | `#59607A` |
| Pearls | Sage celadon | `#75877A` |
| Stars | Antique bronze | `#8E7858` |
| Energy | Deep forest | `#3F6653` |
| Hints | Muted amber | `#987746` |
| Chain protection | Sealing-wax oxblood | `#74464A` |
| Timed multipliers | Deep teal | `#3C6868` |
| Plus access | Stone taupe | `#847968` |

Rules:

- No second saturated accent inside an asset.
- No rainbow, iridescent color cycling, acid lime, hot pink, bright cyan, or
  category-by-value recoloring.
- Champagne metal grows slightly more visible with rarity, but never becomes a
  bright gold fill.
- Every silhouette includes a light porcelain edge and a dark obsidian edge so
  the same file reads on light, dark, warm, cool, and saturated themes.
- Illumination is matte studio light. A faint contained internal light is
  allowed only where physically necessary for a crystal or energy core; no
  exterior bloom or neon rim.

## Family construction and value progression

Every production file is universal and maps directly to the catalog ID:
`assets/images/level-spin-rewards/<giftId>.webp`.

### XP and stored XP — smoky indigo

| ID | Artifact |
|---|---|
| `xp_250` | One compact knowledge crystal in a small architectural mount |
| `xp_500` | Two interlocked crystals using the same mount grammar |
| `xp_1000` | Three-crystal cluster in a wider base |
| `xp_3000` | Open knowledge tablet with a restrained crystal spine |
| `xp_5000` | Closed bound knowledge codex with a crystal clasp |
| `xp_10000` | Tall prism held by a substantial collar |
| `xp_25000` | Crowned multi-prism cluster with layered hardware |
| `xp_50000` | Monumental knowledge crystal in an architectural frame |
| `xp_bank_150` | Two simple sealed knowledge tablets held by a plain band |
| `xp_bank_300` | Paired tablets held by a polished clasp |
| `xp_bank_600` | Twin prisms joined by a structural bridge |

### Pearls — sage celadon

| ID | Artifact |
|---|---|
| `pearls_5` | Small open porcelain shell with a restrained pearl cluster |
| `pearls_10` | Rounded pearl cup with a ribbed shell structure |
| `pearls_20` | Symmetrical double-shell reliquary |
| `pearls_50` | Closed shell reliquary with a visible pearl aperture |
| `pearls_100` | Layered shell holding a short pearl strand |
| `pearls_250` | Crystal-edged shell holding one large pearl |
| `pearls_500` | Monumental layered shell crown with refined metal hardware |

### Unified stars — antique bronze

| ID | Artifact |
|---|---|
| `stars_10` | One thick star token in a shallow ring mount |
| `stars_20` | Two nested star tokens |
| `stars_50` | Astronomical star medallion with a radial rim |
| `stars_100` | Layered star seal with a deeper mount |
| `stars_250` | Faceted star held in an architectural cradle |
| `stars_500` | Double-star celestial sculpture |
| `stars_1000` | Monumental celestial seal with the richest restrained hardware |

### Energy, hints, protection, time, and Plus

| ID | Family | Artifact |
|---|---|---|
| `energy_full` | Energy | Full sealed energy vessel with one contained core |
| `energy_plus2` | Energy | Two-cell energy capsule |
| `energy_plus3` | Energy | Three-cell energy capsule with stronger construction |
| `hint_1` | Hints | One compact study lamp or optical lens |
| `hint_3` | Hints | Three-lens study instrument using the same base grammar |
| `chain_shield_1` | Protection | Shield-seal surrounded by one linked structural rim |
| `xp_2x_24h` | Time | Compact double-sided hourglass with a knowledge core |
| `xp_2x_48h` | Time | Layered chronometer with twin knowledge chambers |
| `plus_days_3` | Plus | Restrained three-part access pass without lettering |
| `plus_days_7` | Plus | More substantial access key with an opal-like neutral core |

## Value hierarchy

Rarity changes construction, not hue:

| Tier | Visual treatment |
|---|---|
| Ordinary | One solid object, few parts, matte porcelain/enamel, minimal metal |
| Rare | Layered structure, stronger rim, more precise hardware |
| Ultra | Larger architectural silhouette, crystal and polished metal detail |
| Exceptional Plus | Most refined proportions and material finish, still restrained |

No tier receives a new accent color, rainbow finish, brighter saturation, crown
of particles, or external glow.

## Text and UI composition

- The bitmap contains no text, number, letter, quantity, duration, or logo.
- The existing localized reward title remains the source of truth.
- The result UI places the localized name and value outside the image using the
  current theme's typography and accessible foreground colors.
- Accessibility labels come from the same localized live title; they are not
  inferred from image content.
- Amount text must remain readable independently of the image at all consumer
  sizes.

## Production and wiring

- Source PNGs and QA composites stay in ignored task-owned directories.
- Only final optimized 512×512 RGBA WebP files enter
  `assets/images/level-spin-rewards/`.
- `app/level_spin_reward_assets.ts` contains exactly one literal static
  `require()` for each of the 35 v2 catalog IDs.
- `components/LevelSpinRewardArt.tsx` renders the asset with `expo-image`,
  `contentFit="contain"`, explicit dimensions, and a localized accessibility
  label.
- Level Spin result surfaces use the new renderer and separate UI text.
- Historical v1/non-v2 gift IDs retain the generic fallback.
- The pre-open animated chest and unrelated gift/referral/league art remain.

## Generation and QA workflow

1. Generate one artifact at a time using the approved Home references and the
   family palette in this document.
2. Reject wrong family color, cartoon/toy styling, baked text, unrelated symbols,
   clipped geometry, excessive gloss, neon, or exterior glow.
3. Require a transparent exterior. The already owner-approved deterministic
   cleanup may remove only a generated exterior checkerboard; it must not alter
   the artifact, recolor it, repaint edges, or invent missing geometry.
4. Validate four-channel alpha, transparent corners, and non-touching bounds.
5. QA on white, black, saturated blue, and the app dark-card background at 300
   px and 118 px.
6. Compare every new artifact with the preceding members of its family for
   shared structure, identical accent family, and credible value progression.
7. Compress approved sources to 512×512 WebP at quality 70–78 with alpha.

## Replacement policy

The colorful text-baked experimental assets generated before this redesign are
rejected. They must not be shipped. Replace files at the same catalog paths with
new no-text artifacts; do not delete unrelated assets or functionality.

## Acceptance criteria

- Exactly 35 universal asset IDs match the v2 catalog; no theme variants.
- Zero baked text, numbers, letters, quantities, durations, or logos.
- All members of one family share one accent and construction grammar.
- Values inside a family differ through shape, scale, material, and detail.
- The full collection uses only the common neutral foundation and eight muted
  family accents defined above.
- Every production asset has alpha and remains recognizable at 43, 77, 108,
  118, and 126 px.
- Every artifact reads on all live themes using internal light and dark edges.
- No avatar or aura artwork is generated.
- Tests cover exact map membership, static require paths, absence of theme
  variants, and historical fallback behavior.

## Out of scope

- Reward contents, weights, economy behavior, star-ledger behavior.
- The pre-open chest animation.
- Legacy non-v2 gifts.
- Per-theme assets.
- Avatar or aura artwork.
