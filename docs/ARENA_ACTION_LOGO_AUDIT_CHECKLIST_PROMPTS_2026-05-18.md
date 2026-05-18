# Arena action logo audit, checklist, and DALL-E prompt pack

Date: 2026-05-18

Scope: arena lobby action icons for Find Match, Invite Friend, and Throne of the Day across `dark`, `neon`, `gold`, `coral`, `minimalLight`, and `minimalDark` themes.

## Research summary

- Apple Human Interface Guidelines recommend a simple, unambiguous image that remains recognizable at every size. Interface icons should use streamlined shapes and only enough color/detail to communicate the idea. Source: https://developer.apple.com/design/human-interface-guidelines/icons
- Material Design icon guidance emphasizes consistency across a set and readability at small sizes. Source: https://m1.material.io/style/icons.html
- OpenAI image generation supports creating images from text prompts, and the official image generation guide documents transparent background generation for suitable image workflows. Source: https://platform.openai.com/docs/guides/image-generation

## Audit findings

- Current arena action assets read as circular medals inside rounded square wrappers. This creates a double-frame effect: card frame, icon square, circular medallion.
- The circle-heavy style competes with the CTA shape and makes the visual hierarchy feel busier than needed.
- At 52-64px display size, tiny ornaments and radial detail blur together. The strongest readable forms are the lightning, people, and throne silhouettes.
- Friend and throne icons currently share a similar medallion language. The themes need stronger differentiation through material, palette, and silhouette details.
- The visible `Ranked` label in the hero chrome adds English text inside a Ukrainian/Russian screen. It should be localized or removed from the visible label.

## Design direction

- Use logo-only transparent assets. No circular badge, no medallion, no square background baked into the asset.
- Use DALL-E source art as the master shape layer, then normalize alpha and derive theme variants from that art rather than rebuilding icons as flat SVG.
- Keep one strong metaphor per action:
  - Find Match: lightning bolt plus forward arrow.
  - Invite Friend: two angular friend silhouettes plus invitation/plane spark.
  - Throne: crown and throne silhouette.
- Preserve the app's fantasy arena mood, but reduce internal detail so icons stay legible at 44-64px.
- Keep theme identities distinct:
  - `dark`: emerald glass and arcane glow.
  - `neon`: synthwave cyan/magenta/high-voltage edges.
  - `gold`: premium metallic champagne and trophy shine.
  - `coral`: warm battle-flame coral and rose highlights.
  - `minimalLight`: ink/stone lines with restrained gold.
  - `minimalDark`: steel/cobalt low-light glyphs.

## Asset generation checklist

- [ ] 1:1 icon, centered, transparent background.
- [ ] No circular frame, no medallion, no badge, no card, no halo ring.
- [ ] No text, numbers, flags, brand marks, or copyrighted symbols.
- [ ] Clear silhouette at 44px and 64px.
- [ ] Transparent corners and transparent outer padding.
- [ ] Main action metaphor is readable before decorative details.
- [ ] Theme palette is distinct from the other five themes.
- [ ] Exports are WebP with alpha at 160x160.

## Integration checklist

- [ ] `app/arena_action_icons.ts` resolves all 18 action/theme assets.
- [ ] `app/image_preload.ts` preloads all 18 action/theme assets.
- [ ] Arena lobby wrappers do not add a visible icon background or circular mask.
- [ ] Hero mode label does not show the English word `Ranked` for RU/UK/ES/ID locales.
- [ ] CTA and secondary rows keep stable dimensions after larger transparent logos are inserted.

## QA checklist

- [ ] Run `node scripts/generate-arena-action-logo-assets.mjs`.
- [ ] Keep DALL-E originals in `qa-artifacts/arena-action-dalle-sources/` and do not delete the generated-image originals.
- [ ] Inspect `qa-artifacts/arena-action-logo-icons-preview.png` at 100 percent.
- [ ] Verify corner alpha and asset coverage with `tests/arena_action_icons_contract.test.ts`.
- [ ] Verify lobby copy with `tests/arena_lobby_copy.test.ts`.
- [ ] Check mobile screenshot for no text overlap and no double-framed medallion.

## DALL-E base prompt

Use this base prompt for every generated icon:

```text
Create a premium mobile game UI logo icon, transparent background, isolated centered glyph, no circle, no ring, no medallion, no badge, no square card, no text, no letters, no numbers. Clean readable silhouette for 44px and 64px app UI usage. High contrast, polished fantasy arena style, 1:1 composition, transparent PNG.
```

## DALL-E action prompts

Find Match:

```text
Base prompt. Subject: stylized lightning bolt fused with a forward arrow, meaning "find match" and fast matchmaking. Make the bolt the primary silhouette, with only a few angular spark accents. Avoid circular motion trails and radial frames.
```

Invite Friend:

```text
Base prompt. Subject: two angular friend silhouettes connected by a small invitation spark or paper-plane shape. Use faceted non-circular heads and shoulders so the icon does not look like a round badge. Friendly, cooperative, readable at small size.
```

Throne of the Day:

```text
Base prompt. Subject: crowned throne silhouette with a compact seat and crown crest. Powerful champion-of-the-day feel. Avoid circular laurels, round seals, medallions, and trophy cup confusion.
```

## DALL-E theme modifiers

Dark:

```text
Emerald arcane glass, deep obsidian shadows, sharp green highlights, subtle magical glow, restrained details.
```

Neon:

```text
Synthwave neon cyan, magenta, acid lime edge light, energetic arcade glow, crisp silhouette, no circular neon ring.
```

Gold:

```text
Premium metallic gold, champagne highlights, dark bronze shadow, trophy polish, bevel detail only on the glyph.
```

Coral:

```text
Warm coral flame, red-orange battle glow, rose highlights, energetic but clean, no radial fire circle.
```

Minimal Light:

```text
Light parchment and graphite ink, restrained gold accent, elegant flat emblem, very low ornament, clean alpha edge.
```

Minimal Dark:

```text
Dark steel, cobalt rim light, muted brass accent, tactical fantasy glyph, low-glow high-contrast silhouette.
```
