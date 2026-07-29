# Phraseman gift certificate assets

Date: 2026-07-29

## Goal

Create three distinct premium raster backgrounds for the live gift-certificate preview on `knowly-www/gift/index.html`: Month Phraseman Plus, Year Phraseman Plus, and Phraseman Pro lifetime.

## Approved direction

The shared concept is **Journey into English**. The set should feel cohesive, but each plan must be recognizable from color and symbolism before the plan name is read.

- **Month Plus — First Postcard:** coral, peach, warm cream, and a restrained ruby accent. A joyful beginning: an elegant open postcard/envelope motif, subtle speech-wave shapes, and a small sense of forward motion.
- **Year Plus — Grand Journey:** sapphire, royal blue, warm gold, and ivory. A richer, more expansive journey expressed through an abstract route, refined architectural silhouettes, and a horizon glow without literal branded landmarks.
- **Pro lifetime — Infinite Mastery:** graphite, deep emerald, antique gold, and warm black. The most premium tier, built around a tasteful continuous-loop motif, a seal-like focal detail, and a sense of permanence.

## Visual system

- Premium editorial illustration with softly rendered 3D paper, enamel, and foil details.
- Sophisticated adult learning product; no childish school clip art, flags, mascots, emojis, stock-photo people, or travel-agency styling.
- One coherent material language across all three assets, with distinct palettes and tier-specific symbolism.
- Dark text must be used on any bright lime, neon-green, or gold-filled surface.
- Strong silhouette and restrained decoration so the assets remain legible at mobile size.

## Composition and runtime contract

- Generate as landscape 3:2 certificate backgrounds.
- Keep the central content zone calm and low-detail for dynamic HTML text: recipient, sender, plan, and redemption code.
- Concentrate visual interest around the perimeter and corners; do not create a fake UI or baked-in text area.
- No baked-in words, letters, numerals, logos, watermarks, QR codes, or pseudo-text.
- The output is background art, not a complete flattened certificate. Live HTML remains the only source of text.
- Preserve a minimum readable contrast of 4.5:1 for live text through plan-specific overlays in the eventual integration.

## Deliverables

Save one final optimized WebP per plan under `knowly-www/assets/gift-certificates/`:

- `gift-certificate-monthly.webp`
- `gift-certificate-yearly.webp`
- `gift-certificate-lifetime.webp`

Keep generated originals outside the shipped website asset set. Only selected, resized, compressed finals belong under `knowly-www/assets/`.

## Generation prompts

All three prompts use the `stylized-concept` taxonomy and the built-in Codex image-generation tool. The provided screenshot is a layout/context reference, not an edit target.

### Monthly

Create a premium landscape gift-certificate background for a modern English-learning product. Theme: the first joyful month of a language journey. Editorial illustration with softly rendered 3D paper, a refined open postcard or envelope motif, subtle speech-wave curves, and restrained celebratory details around the perimeter. Coral, peach, warm cream, and a small ruby accent; tactile paper grain and delicate foil highlights. Keep the broad central zone calm, bright, and low-detail for live HTML text. Sophisticated and adult, warm and optimistic. No text, letters, numbers, logos, flags, people, school clip art, QR codes, pseudo-text, frames that imitate UI, or watermark.

### Yearly

Create a premium landscape gift-certificate background for a modern English-learning product. Theme: a grand year-long journey toward fluent English. Editorial illustration with softly rendered 3D paper, an elegant abstract route flowing toward a luminous horizon, refined non-branded architectural silhouettes, and subtle gold wayfinding details around the perimeter. Sapphire and royal blue with warm gold and ivory; tactile paper grain, enamel accents, and restrained foil highlights. Keep the broad central zone calm and low-detail for live HTML text. Accomplished, expansive, aspirational, and adult. No text, letters, numbers, logos, flags, people, literal famous landmarks, travel-agency imagery, QR codes, pseudo-text, fake UI, or watermark.

### Lifetime

Create a luxury landscape gift-certificate background for lifetime access to a modern English-learning product. Theme: infinite mastery and permanent access. Editorial illustration with softly rendered 3D materials, a tasteful continuous-loop motif and seal-like focal detail integrated around the perimeter, with subtle language-wave geometry. Graphite, deep emerald, antique gold, and warm black; tactile dark paper, enamel, and refined metallic foil. Keep the broad central zone calm and sufficiently light or evenly dark for high-contrast live HTML text. Exclusive, timeless, intelligent, and adult, without looking like a bank card. No text, letters, numbers, logos, crowns, people, school clip art, QR codes, pseudo-text, fake UI, or watermark.

## Acceptance criteria

- Exactly three final backgrounds exist, one for each current plan.
- Each asset is visually distinct at thumbnail size and recognizable by palette.
- The set shares a coherent premium material and illustration style.
- No generated text or pseudo-text is visible.
- The live text-safe central zone is uncluttered.
- Final WebPs are visually inspected and compressed before any website integration.
- No existing gift flow, pricing, payment behavior, or certificate text is removed or changed as part of asset generation.
