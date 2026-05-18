# Level Gift Chest Icons: Audit, Checklist, and DALL-E Prompts

Date: 2026-05-18

## Scope

This audit covers gift-box and chest visuals used for level-up gifts, premium level gifts, progress-map gift markers, daily treasure chests, friend gifts, league chests, and social gift achievements.

Primary runtime files:

- `components/LevelGiftModal.tsx`
- `components/LevelGiftDualModal.tsx`
- `app/progress_map.tsx`
- `app/level_gift_system.ts`
- `components/DailyTreasureChest.tsx`
- `components/LeagueChestOpenModal.tsx`
- `app/friend_gifts.ts`
- `app/achievements.ts`
- `app/achievements_screen.tsx`
- `constants/theme.ts`

## Current Asset Inventory

Level gift chest assets live in `assets/images/levels/`.

| File | Used in code | Dimensions | Format | Bytes | Notes |
| --- | --- | ---: | --- | ---: | --- |
| `GIF_COMMON.webp` | Yes | 512x512 | WebP VP8X | 33,716 | Current common chest. Name is missing the `T` in `GIFT`. |
| `GIFT_RARE.webp` | Yes | 512x512 | WebP VP8X | 59,878 | Current rare chest. |
| `GIFT_EPIC.webp` | Yes | 512x512 | WebP VP8X | 57,012 | Current epic chest. |
| `GIFT_PREMIUM.webp` | Yes | 512x512 | WebP VP8X | 52,052 | Current premium second chest. |
| `GIF COMMON.webp` | No | 512x512 | WebP VP8X | 33,716 | Duplicate with a space. |
| `GIFT RARE.webp` | No | 512x512 | WebP VP8X | 59,878 | Duplicate with a space. |
| `GIFT EPIC.webp` | No | 512x512 | WebP VP8X | 57,012 | Duplicate with a space. |
| `GIFT PREMIUM.webp` | No | 512x512 | WebP VP8X | 52,052 | Duplicate with a space. |

## Runtime Usage

- `components/LevelGiftModal.tsx` maps `common`, `rare`, and `epic` to chest WEBP files.
- `components/LevelGiftDualModal.tsx` uses the same three F2P chest files plus `GIFT_PREMIUM.webp`.
- `app/progress_map.tsx` uses the same chest files for claimed, unclaimed, and upcoming level gifts.
- `components/DailyTreasureChest.tsx` does not use the chest assets. It draws a chest with emoji text (`box` and `money bag`) inside styled React Native views.
- `components/LeagueChestOpenModal.tsx`, `app/(tabs)/home.tsx`, `app/club_screen.tsx`, and friend screens mostly use `Ionicons` gift icons, not the level gift chest art.
- `app/achievements_screen.tsx` uses separate social gift achievement WEBP files: `social_gift_send`, `social_gift_5`, `social_gift_10`, `social_gift_25`, `social_gift_100`.

## Gift Level Model

The actual level-gift rarity model is in `app/level_gift_system.ts`.

| Visual level | Backing data | Current visual | Proposed visual role |
| --- | --- | --- | --- |
| Common | `GiftRarity = common` | `GIF_COMMON.webp` | Starter gift box. Clean, quiet, readable. |
| Rare | `GiftRarity = rare` | `GIFT_RARE.webp` | Stronger locked chest with cooler glow. |
| Epic | `GiftRarity = epic` | `GIFT_EPIC.webp` | Ornate reward chest with richer shape and light. |
| Premium | Premium second chest | `GIFT_PREMIUM.webp` | Separate luxury chest, visually above epic. |

Roll behavior:

- Normal levels: 60% common, 30% rare, 10% epic.
- Round levels: 60% rare, 40% epic.
- Milestones exist at levels `5, 10, 15, 20, 25, 30, 35, 40, 45, 50`.
- Premium users see a dual modal: one F2P gift chest plus one premium chest.

## Theme Model

Active theme modes from `constants/theme.ts`:

| Theme mode | Existing interface feel | Chest art direction |
| --- | --- | --- |
| `minimalLight` | Paper, graphite, warm neutral | Ivory paper chest, graphite seams, restrained brass seal. |
| `minimalDark` | Charcoal, blue accent | Graphite chest, blue enamel trim, satin highlights. |
| `dark` | Deep forest green | Jade/forest chest, warm gold clasp, organic but crisp. |
| `neon` | Black, lime cyber accent | Obsidian tech chest, lime edge light, clean cyber bevels. |
| `coral` | Cocoa, wine, coral rose | Cocoa lacquer chest, coral glow, rose-gold metal. |
| `gold` | Piano black, champagne metal | Black-gold luxury chest, champagne trim, premium jewelry finish. |

Current state: all themes reuse the same chest art. Only modal chrome changes. For the requested art direction, the production target should be 24 icons: 4 gift levels times 6 theme modes.

## Design Research Notes

- Material icon guidance emphasizes a unified visual system across icons while allowing each icon to stay distinct. This supports one shared chest silhouette system with per-rarity and per-theme variations. Source: https://m1.material.io/style/icons.html
- Material sizing guidance uses 48dp product icons and safe live areas. In this app the chests render at about 40-114 px, so the silhouette must pass a 44 px readability check. Source: https://m1.material.io/style/icons.html
- Google Play icon specs are launcher-oriented, but the production discipline is useful here: 512x512 source art, sRGB, no external drop shadow baked into final assets, and lighting inside the artwork only. Source: https://developer.android.google.cn/distribute/google-play/resources/icon-design-specifications?hl=en
- OpenAI image generation docs note that image models can struggle with exact text and consistency. The chest prompts therefore ban text, labels, logos, and numbers, and use a shared composition grid. Source: https://developers.openai.com/api/docs/guides/image-generation

## Audit Findings

1. The core level gift chest system is already asset-based, not emoji-based, which is good for a premium mobile UI.
2. The naming has a production smell: `GIF_COMMON.webp` should eventually become `GIFT_COMMON.webp`, with code updated atomically.
3. Space-name duplicates are unused and should not be referenced by Metro. Keep only if they are intentional backups.
4. Current chests are theme-agnostic. This weakens themes like `gold`, `neon`, and `minimalLight`, which have very different material languages.
5. Daily treasure chest still uses emoji inside styled views. It will feel disconnected if level gift chests become premium rendered assets.
6. Gift achievement icons are separate and should not be replaced in the first pass unless the product goal expands from level gifts to all social gift achievements.
7. The app uses gift emojis in headings and labels. That is fine as copy decoration, but reward objects themselves should be image assets for consistency.

## Recommended Production Set

Target directory:

```text
assets/images/level_gifts/
  minimalLight/common.webp
  minimalLight/rare.webp
  minimalLight/epic.webp
  minimalLight/premium.webp
  minimalDark/common.webp
  ...
  gold/premium.webp
```

Compatibility fallback:

- Keep current `assets/images/levels/GIF_COMMON.webp`, `GIFT_RARE.webp`, `GIFT_EPIC.webp`, and `GIFT_PREMIUM.webp` until the themed mapping is wired and verified.
- Add a helper such as `giftChestImageForTheme(themeMode, rarity, premiumVisual)` in a later implementation pass.

## Visual System

Shared rules for all 24 icons:

- 512x512 square source.
- Single centered object.
- Transparent background for production if available; otherwise use flat chroma-key `#00FF00` and remove it.
- Chest occupies 78-86% of canvas width.
- Same camera angle across all icons: front three-quarter, lid visible, clasp centered.
- No text, letters, numbers, logos, stickers, faces, or UI labels.
- No external cast shadow outside the object. Internal bevel shadows are allowed.
- Silhouette readable at 44 px.
- Rarity differences must survive grayscale: common = simple box, rare = reinforced chest, epic = ornate magical chest, premium = luxury lockbox with unique crown-like clasp.

## Theme Palette Matrix

| Theme | Common | Rare | Epic | Premium |
| --- | --- | --- | --- | --- |
| `minimalLight` | Ivory, graphite, muted brass | Ivory + steel blue | Ivory + warm amber | Ivory lacquer + champagne |
| `minimalDark` | Charcoal, slate | Charcoal + electric blue | Charcoal + gold-amber | Black graphite + platinum blue |
| `dark` | Forest wood, jade | Deep green + cyan gem | Emerald + gold | Dark jade + antique gold |
| `neon` | Matte black + lime pinline | Black + cyan/lime glass | Black + lime plasma | Obsidian + acid-lime luxury |
| `coral` | Cocoa + soft coral seal | Wine + coral enamel | Rose gold + ember coral | Cocoa lacquer + rose gold |
| `gold` | Piano black + old brass | Black + champagne silver | Black + antique gold | Black-gold jewelry finish |

## Production Checklist

Before generation:

- [ ] Confirm the 24-icon target: 4 gift levels x 6 app themes.
- [ ] Decide whether final assets should be true transparent WebP or generated on chroma-key and post-processed.
- [ ] Decide whether `GIF_COMMON.webp` is renamed to `GIFT_COMMON.webp` during implementation.
- [ ] Keep the existing four runtime chest assets as fallback.
- [ ] Create a contact sheet for review before replacing app assets.

For each generated icon:

- [ ] No text, logo, number, watermark, or unreadable pseudo-lettering.
- [ ] Same camera angle and visual bounds as the rest of the set.
- [ ] Rarity is clear from silhouette, not only color.
- [ ] Theme is clear from material and palette, not only a tint overlay.
- [ ] Center clasp is visible at 44 px.
- [ ] Lid/body separation is visible at 44 px.
- [ ] No thin sparkles that turn into noise at 44 px.
- [ ] No dark fringe after background removal.
- [ ] Works on both dark and light modal backgrounds.

After export:

- [ ] Export every icon as 512x512 WebP with alpha.
- [ ] Build a 24-icon contact sheet at full size and at 44 px.
- [ ] Verify in `LevelGiftModal`, `LevelGiftDualModal`, and `progress_map`.
- [ ] Check Android and iOS rendering through Expo Image/React Native Image.
- [ ] Confirm bundle-size impact.
- [ ] Remove or archive duplicate space-name files after code no longer references them.

## DALL-E Base Prompt

Use this for one production icon at a time.

```text
Create one premium mobile game reward chest icon for a language-learning app.
It is a single centered gift box / treasure chest hybrid, front three-quarter view, lid visible, centered clasp.
The icon must be readable at 44 px and polished at 512 px.

Canvas:
square 1:1 composition, one object only, generous padding, transparent background if possible.
If transparency is not available, use a perfectly flat solid #00FF00 chroma-key background and do not use #00FF00 inside the object.
No scene, no floor, no external cast shadow, no background texture.

Style:
high-end 3D rendered mobile game icon, crisp bevels, tactile materials, clean silhouette, soft upper-left studio light, subtle lower-right internal shadow, controlled highlights.
No text, no letters, no numbers, no logos, no watermark, no characters, no faces.

Rarity:
<RARITY_INSERT>

Interface theme:
<THEME_INSERT>
```

## Rarity Inserts

Common:

```text
Rarity: common starter gift. Simple sturdy box, small centered clasp, minimal trim, calm reward feeling, low visual complexity. It should look useful and pleasant but clearly below rare, epic, and premium.
```

Rare:

```text
Rarity: rare gift chest. Reinforced corners, stronger metal bands, small gemstone in the clasp, brighter rim light, medium complexity. It must feel meaningfully better than common without becoming ornate.
```

Epic:

```text
Rarity: epic gift chest. Ornate lid, richer gemstone clasp, elegant magical glow from seams, premium bevels, ceremonial silhouette. It must feel like a milestone reward but remain readable at 44 px.
```

Premium:

```text
Rarity: premium bonus chest. Luxury lockbox, crown-like central clasp, jewelry-grade metal trim, refined glow, highest value in the set. It must clearly sit above epic but avoid clutter.
```

## Theme Inserts

Minimal Light:

```text
Theme: minimalLight. Warm ivory paper and porcelain surfaces, graphite seams, muted brass details, soft paper-like highlights, restrained Apple-like clarity, no heavy glow.
```

Minimal Dark:

```text
Theme: minimalDark. Satin charcoal body, graphite panels, cool blue enamel accents, subtle steel highlights, quiet dark-mode utility, no neon overload.
```

Dark Forest:

```text
Theme: dark. Deep forest green and jade body, warm gold clasp, organic polished wood-and-gem material, friendly learning-game mood, high contrast on dark green UI.
```

Neon:

```text
Theme: neon. Matte black obsidian body, acid-lime edge light, small cyan glass accents, cyber arcade finish, sharp controlled glow, clean black silhouette.
```

Coral:

```text
Theme: coral. Dark cocoa lacquer body, wine shadows, coral enamel glow, rose-gold trim, warm premium finish, no pink noise or over-saturated bloom.
```

Gold:

```text
Theme: gold. Piano black body, champagne and antique-gold metal trim, ivory highlights, luxury jewelry finish, refined black-gold contrast, no purple.
```

## Contact Sheet Prompt For First Generation

Use this prompt to create a review sheet before requesting separate production exports.

```text
Create a clean 6 by 4 contact sheet of premium mobile game reward chest icons for a language-learning app.

Columns are interface themes, left to right:
1 minimalLight, 2 minimalDark, 3 dark forest, 4 neon, 5 coral, 6 gold.

Rows are reward levels, top to bottom:
1 common, 2 rare, 3 epic, 4 premium.

Important: do not render any text labels, letters, numbers, UI words, row labels, column labels, logos, or watermarks.
Use only the icons arranged in a precise grid with equal spacing.
Each cell contains one centered gift box / treasure chest hybrid, front three-quarter view, lid visible, centered clasp.
All 24 icons must share the same camera angle, same scale, same visual bounds, and a unified mobile game icon style.

Canvas and background:
single square image, flat neutral dark background only for the contact sheet, clean spacing between icons.
No scene, no floor, no cast shadows outside each object.

Readability:
every chest must be recognizable at small mobile sizes.
Rarity must differ by silhouette and detail level, not only color:
common is simple, rare has reinforced bands and a small gem, epic is ornate and magical, premium is a luxury lockbox with a crown-like clasp.

Theme colors and materials:
minimalLight: ivory paper, graphite seams, muted brass.
minimalDark: charcoal, graphite, cool blue enamel.
dark forest: deep green, jade, warm gold.
neon: black obsidian, acid-lime edge light, cyan glass.
coral: cocoa lacquer, wine shadows, coral glow, rose-gold trim.
gold: piano black, champagne, antique gold, ivory highlights.

Style:
high-end 3D rendered mobile game icons, crisp bevels, tactile materials, soft upper-left studio light, subtle lower-right internal shadow, controlled highlights.
Avoid clutter, tiny sparkles, unreadable details, excessive bloom, characters, faces, stickers, and text.
```

## Acceptance Bar

The new icon set is successful if:

- A user can distinguish common, rare, epic, and premium at a glance.
- Each app theme gets a recognizable material palette, not just a hue shift.
- The icons feel like one family across all themes.
- The premium chest clearly beats epic without becoming noisy.
- The set passes 44 px readability on both light and dark UI.
- The implementation can fall back safely to the existing four assets.

## League Bonus Chest Addendum

League bonus gifts are a separate reward class and must not reuse normal level or premium chest art.
The accepted direction is DALL-E bitmap art: one unique 512 px chest per interface theme, then local
chroma-key background removal and WebP export into `assets/images/league_bonus/`.

Shared DALL-E prompt frame:

```text
Use case: stylized-concept. Asset type: mobile game reward icon, 512x512 source asset.
Primary request: Create ONE beautiful league bonus chest icon for a <theme> interface theme.
This is a special weekly league reward chest, not a normal gift box and not a normal premium chest.
Subject: a single distinctive championship chest with a built-in crown silhouette, league crest lock,
subtle laurel details, <theme materials>.
Style: premium mobile game icon, elegant stylized 3D render, interesting silhouette, readable at small size,
crisp edges, rich materials, no clutter.
Composition: centered single object, generous padding, slight three-quarter front view, no labels, no text,
no numbers, no watermark, no UI frame, no sprite sheet.
Background: perfectly flat solid <key color> chroma-key background for background removal. The background
must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Do not use <key color> anywhere in the subject.
```

Theme material overrides:

- `coral`: polished coral enamel, rose-gold metal, warm ruby highlights, small cool blue gem, key `#00ff00`.
- `dark`: deep emerald lacquer, black iron, luminous teal runes, lime-gold champion accents, key `#ff00ff`.
- `gold`: black lacquer body, antique gold trim, champagne highlights, ivory enamel, diamond-like gem, key `#00ff00`.
- `minimalDark`: graphite-black panels, cool platinum trim, cyan-blue glass glow, violet accent gem, key `#00ff00`.
- `minimalLight`: ivory-white enamel, sapphire-blue trim, soft champagne gold, orange-gold champion gem, key `#00ff00`.
- `neon`: glossy black body, electric lime trim, cyan light strips, hot pink gem accents, key `#ff0000`.
