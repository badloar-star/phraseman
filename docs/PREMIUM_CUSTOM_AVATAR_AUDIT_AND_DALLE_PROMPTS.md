# Premium Custom Avatars: DALL-E Only Production Plan

Date: 2026-05-18

## Scope

Paid custom avatars are the shop items `custom-gen-01` through `custom-gen-30`.

Runtime wiring:

- `constants/custom_avatars.ts` defines `CUSTOM_AVATARS` and `CUSTOM_AVATAR_SHOP`.
- `CUSTOM_AVATAR_SHOP` includes only ids starting with `custom-gen-`.
- `components/CustomAvatarBadge.tsx` draws the colored hexagon in code.
- Foreground assets must stay at:
  - `assets/images/avatars/custom-idea-XX-black.webp`
  - `assets/images/avatars/custom-idea-XX-white.webp`

The old generated paid avatar foregrounds should be replaced. Do not replace the normal level avatars or the non-shop `custom-01` through `custom-35` logo files.

## Art Direction

Use the user's references as the target quality bar:

- premium realistic 3D rendered collectible icon;
- icy silver, pearl, graphite, and blue-white crystal highlights;
- academic fantasy busts, readable animal-head avatars, and royal symbol avatars;
- thick crystal bevels and one large blue-white jewel/glint as the luxury detail;
- centered object, no text, no letters, no numbers, no UI card frame;
- readable at 44 px after being placed over a hexagon gradient;
- two color variants per avatar:
  - dark: graphite/navy object with bright silver bevels;
  - light: pearl white/silver object with dark navy edge definition.

## Small-Icon Readability Rules

The avatars render around 44-64 px in the shop, so the icon must be designed as a bold silhouette first and a detailed render second.

- Use one huge subject only.
- Use 2-3 large forms maximum.
- Avoid tiny starfields, dots, filigree, runes, chains, page-line clutter, and micro-symbols.
- Make the object fill roughly 78-89% of the transparent square after trimming, then verify against the hexagon safe area.
- Keep every visible pixel inside the central hexagon safe area; do not let shoulders, ears, antlers, glow, or collars touch the badge rim.
- Prefer thick handles, thick rims, chunky bevels, and clear negative space.
- The 44 px QA sheet is the final judge. If the motif is not identifiable there, regenerate or reject it.

## DALL-E Generation Checklist

Before generating:

- [ ] Keep ids and filenames stable so owned purchases still resolve.
- [ ] Generate 30 unique motifs.
- [ ] Generate the dark and light variant from the same composition.
- [ ] Use a flat removable chroma-key background or true transparent output if available.
- [ ] Never use SVG/vector/manual drawing as the source art.

Per generated avatar:

- [ ] Realistic premium material, not flat icon art.
- [ ] One clear main subject only.
- [ ] 2-3 large forms maximum.
- [ ] Strong silhouette at 44 px.
- [ ] Foreground stays inside the hexagon safe area after export.
- [ ] No tiny starfield, dots, filigree, page-line clutter, or many small symbols.
- [ ] No text, glyphs, fake runes, letters, numbers, logos, watermarks.
- [ ] No full hexagon badge inside the generated image; the app supplies the hexagon.
- [ ] No noisy black square background in final exported asset.
- [ ] Dark variant works on light/warm hex gradients.
- [ ] Light variant works on dark/cool hex gradients.

Final QA:

- [ ] Exactly 60 WebP files exist.
- [ ] All are `512x512`.
- [ ] All have alpha.
- [ ] `CUSTOM_AVATAR_SHOP` still contains 30 ids.
- [ ] `rg "custom-idea-" constants app components functions tests` has no broken reference.
- [ ] Contact sheet reviewed at normal size and 44 px.

## Master DALL-E Prompt

Use this as the base for each icon. Replace `<motif>` and `<name>`.

```text
Create a premium realistic 3D rendered collectible avatar icon for a mobile language-learning game.

Reference style: icy silver fantasy-academic relic icon, polished pearl/graphite material, thick crystal bevels, one large blue-white jewel/glint, high-end game reward quality. It should feel expensive enough for a paid avatar shop.

Asset requirements:
- CRITICAL SMALL-ICON RULES: final avatar is 44-64 px. Use one huge readable subject only. Use 2-3 large forms maximum. No tiny starfield, no dots, no filigree, no complex frame, no many small symbols. Use thick beveled edges, strong silhouette, and strong contrast;
- one centered foreground object only;
- square composition;
- very generous padding;
- object fills about 76-80% of the icon before local safe-area fitting;
- subject must fit inside an invisible central hexagon/circle safe zone; nothing may touch or approach the edges;
- readable at 44 px;
- no text, no letters, no numbers, no watermark, no logo;
- no full hexagon badge and no UI card;
- no background scene;
- no cast shadow or floor.

Make two matching variants from the same composition:
1. Dark variant: graphite and deep navy body with bright silver/ice bevels.
2. Light variant: pearl white and silver body with dark navy edge definition.

Background for extraction: perfectly flat solid #00ff00 chroma-key background, no gradient, no texture, no shadows, and do not use #00ff00 anywhere in the icon.

Icon name: <name>.
Main motif: <motif>.
```

## Prompt Bank

1. `custom-gen-01` Hooded Oracle: one hooded scholar bust, smooth face silhouette, one large blue forehead crystal.
2. `custom-gen-02` Ancient Philosopher: one classical philosopher bust with short beard and one large blue chest crystal.
3. `custom-gen-03` Masked Scholar: one masked scholar bust with high collar and one large blue medallion.
4. `custom-gen-04` Crowned Mentor: one wise mentor bust with a simple three-point crown and one central blue crystal.
5. `custom-gen-05` Armored Guardian: one noble armored bust with smooth helmet and one large blue breastplate crystal.
6. `custom-gen-06` Young Mage: one youthful mage bust with smooth hood and one large crystal brooch.
7. `custom-gen-07` Clear Orator: one confident orator bust with a simple theatrical collar and one throat gem.
8. `custom-gen-08` Librarian Sage: one sage bust with bold round spectacles and one large blue brooch.
9. `custom-gen-09` Star Priestess: one serene priestess bust with smooth hood and one forehead crystal.
10. `custom-gen-10` Astral Knight: one closed-helm knight bust with broad simple shoulders and one blue chest gem.
11. `custom-gen-11` Wise Owl: one owl head/bust with huge readable eyes and one blue chest crystal.
12. `custom-gen-12` Noble Wolf: one forward-facing wolf head/bust with strong ears and one blue chest crystal.
13. `custom-gen-13` Clever Fox: one fox head/bust with clear triangular ears and one blue chest crystal.
14. `custom-gen-14` Regal Stag: one stag head/bust with compact thick crystal antlers and one blue chest crystal.
15. `custom-gen-15` Lion Scholar: one lion head/bust with simplified broad mane and one blue chest crystal.
16. `custom-gen-16` Raven Scribe: one raven head/bust with bold beak silhouette and one blue chest crystal.
17. `custom-gen-17` Crystal Cat: one cat head/bust with readable ears and eyes and one blue chest crystal.
18. `custom-gen-18` Scholar Bear: one bear head/bust with rounded ears and one blue chest crystal.
19. `custom-gen-19` Crystal Horse: one horse head/bust with broad simplified mane and one blue chest crystal.
20. `custom-gen-20` Crystal Dolphin: one dolphin head/bust with smooth silhouette and one blue medallion.
21. `custom-gen-21` Royal Crown Sigil: one royal crown emblem with three thick points and one big central blue crystal.
22. `custom-gen-22` Crystal Scepter: one upright royal scepter with a thick short staff and one large blue crystal head.
23. `custom-gen-23` Sovereign Orb: one royal orb with a thick silver ring and one large blue crystal core.
24. `custom-gen-24` Heraldic Shield: one royal shield with a thick silver border and one central blue crystal diamond.
25. `custom-gen-25` Throne Crest: one compact throne crest with high back, armrests, and one blue crystal in the backrest.
26. `custom-gen-26` Royal Diadem: one compact jeweled diadem arc with three thick crystal points and one blue center jewel.
27. `custom-gen-27` Royal Chalice: one ceremonial chalice with thick handles and one large blue crystal cup core.
28. `custom-gen-28` Crowned Key: one ornate royal key with a crown-shaped head and one blue crystal in the bow.
29. `custom-gen-29` Laurel Medal: one royal laurel medal with a thick wreath arc and one large blue crystal medallion.
30. `custom-gen-30` Imperial Sun Seal: one royal sun seal with thick rays and one large blue crystal disk.

## Produced Assets

Final app assets:

- `assets/images/avatars/custom-idea-01-black.webp` through `custom-idea-30-black.webp`
- `assets/images/avatars/custom-idea-01-white.webp` through `custom-idea-30-white.webp`

QA artifacts:

- `qa-artifacts/premium-avatar-bust-animal-dalle-candidates.png`
- `qa-artifacts/premium-avatar-royal-dalle-candidates.png`
- `qa-artifacts/premium-custom-avatars-expanded-royal-contact-sheet.png`
- `qa-artifacts/premium-custom-avatars-expanded-royal-44px-no-labels.png`
- `qa-artifacts/premium-avatar-expanded-royal-dalle-extraction-manifest.json`
- `qa-artifacts/premium-avatar-expanded-royal-dalle-sources/`
- `qa-artifacts/premium-custom-avatars-bust-animal-contact-sheet.png`
- `qa-artifacts/premium-custom-avatars-bust-animal-44px-no-labels.png`
- `qa-artifacts/premium-avatar-bust-animal-dalle-extraction-manifest.json`
- `qa-artifacts/premium-avatar-bust-animal-dalle-sources/`

Important: the final foreground art comes from DALL-E/image generation sources only. No SVG/vector generator is part of the production path.
