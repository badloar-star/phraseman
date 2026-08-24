# Home Theme Assets — Full Generation Specification

## Owner decision

Regenerate and wire only theme-changing raster art that is visible on Home. The exact slots are:

1. Lessons
2. Flashcards
3. League
4. Daily Survey
5. Last Lesson / Continue Lesson
6. Phrase of the Day

MAX is explicitly excluded because its existing live animated image is final. Practice, Diagnostic Test, Gifts, and Daily Challenge are removed/excluded and must not receive generated art.

Removed legacy themes `minimalDark`, `candyBlue`, `business`, and `businessLight` must not appear in prompts, filenames, maps, previews, or bundled assets.

## Live theme matrix

Generate exactly the six slots for exactly these nine `ThemeMode` values:

| Order | Theme | Material language | Core palette |
|---:|---|---|---|
| 1 | `ember` | terracotta ceramic, leather, warm paper, antique brass, dark wood | terracotta, ivory, cocoa, muted olive |
| 2 | `indigo` | indigo textile/enamel, warm paper, antique silver | deep indigo, lavender, ivory, silver |
| 3 | `sagePorcelain` | matte porcelain, linen, pale wood, botanical relief | sage, porcelain, cream, eucalyptus |
| 4 | `olive` | aged leather, olive ceramic, walnut, parchment | olive, moss, parchment, walnut |
| 5 | `midnight` | dark lacquer, smoked glass, moonlit silver | navy, ink, blue-gray, silver |
| 6 | `aurora` | opalescent glass, frosted ceramic, pearl finish | teal, violet, cyan, soft pearl |
| 7 | `volt` | graphite, neon-lime enamel, technical ceramic | graphite, lime, charcoal, pale gray |
| 8 | `dark` | forest leather, dark wood, oxidized metal | forest green, near-black, bronze, cream |
| 9 | `gold` | ivory enamel, polished gold, champagne metal | ivory, gold, amber, dark cocoa |

The geometry and meaning of a slot stay stable across themes. Theme variants change palette, materials, lighting, flowers, and restrained ornament only.

## Studied-language invariant

- Interface theme never selects the depicted language.
- The current studied course is English, so every theme uses only English words and British cultural motifs.
- Different themes may use different English words, but must never introduce French or Spanish because of theme color.
- British architecture/cultural identity remains consistent across themes.
- Survey is product feedback, not course content, so it uses no landmark or language-specific word.
- Phrase of the Day contains no literal phrase because the real phrase is dynamic.

## Approved visual grammar

- Premium compact soft tactile 3D still-life.
- The three authoritative Ember references (Lessons, Flashcards, League) define the scale and density for the whole family: a compact 2-4-object cluster occupying roughly 60-75% of a square canvas, with generous clear space around it.
- Owner-approved Indigo exception: a richer Lessons still-life may use more of the canvas when every object remains fully inside the frame and the complete composition passes the real 118 px tile check. Do not force an arbitrary 68% scale; reduce object count if readability fails.
- Supporting objects must overlap into one readable tabletop composition. Never turn a slot into one oversized isolated sheet, book, scroll, panel, or full-frame product close-up.
- Keep the same three-quarter camera angle, rounded tactile modelling, soft studio key light, contact-shadow scale, edge softness, and visual weight across all six slots.
- One strong silhouette per slot, readable at actual Home size.
- Rounded physical materials, controlled studio illumination, clean edge separation.
- No logo, watermark, UI card background, full screen mockup, character, microphone, or speculative object.
- No generated shadow baked into a floor. Production shadow is reconstructed after alpha extraction.
- Do not generate text except the single English word intentionally embedded in the Flashcards master.

## Authoritative Ember references

These files define the approved family. They are references, not automatic production outputs.

| Slot | Reference |
|---|---|
| Lessons | `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-lessons-transparent.png` |
| Flashcards | `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-flashcards-english-transparent.png` |
| League | `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-league-english-shield-approved.png` |
| Last Lesson geometry reference only | `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-continue-top-spiral-workbook-approved-source.png` |
| Daily Survey V2 style candidate | `.codex-tmp/theme-assets-v2/home-matte-sources/ember/ember-survey-compact-still-life-v2.png` |
| Last Lesson V2 style candidate | `.codex-tmp/theme-assets-v2/home-matte-sources/ember/ember-last-lesson-compact-still-life-v2.png` |
| Phrase of the Day V2 style candidate | `.codex-tmp/theme-assets-v2/home-matte-sources/ember/ember-phrase-of-day-compact-still-life-v2.png` |
| Indigo materials only (not shield geometry) | `.codex-tmp/theme-assets-v2/indigo-style-reference/indigo-league-material-style-reference.png` |

The three `*-v1.png` matte previews under `.codex-tmp/theme-assets-v2/home-matte-sources/ember/` are rejected for scale/style: they are oversized monolithic close-ups. Rejected remote-control/panel survey images under `.codex-tmp/theme-assets-v2/daily-survey/**` are also negative references only. Never use any of them as image inputs.

## Slot contracts

### Lessons

- Composition: compact stack of two or three books, small globe, restrained plant, study cup.
- No readable text.
- English/British semantic cues; do not substitute another country's architecture.
- Must not resemble Last Lesson: this slot is a catalogue/study collection, not one unfinished task.

### Flashcards

- Composition: two or three physical vocabulary cards plus one restrained British cultural landmark/motif and small plant/decor.
- At least one card contains one clear English word; optional small translation uses the app interface language only if rendered accurately.
- Do not use French/Spanish words in the English course.
- No microphone or audio icon.

### League

- Exact master silhouette: `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-league-english-shield-approved.png`.
- Preserve outer shape, proportions, rim, Tower Bridge relief, English rose placement, and exactly three ascending diagonal bands.
- Vary palette, material, light, and surface finish only.
- For Indigo, use the material-only reference above for deep textile indigo, warm ivory relief, matte antique-silver rim, and lavender rose. Its outer shield shape is rejected and must not replace the exact master silhouette.
- No trophy or cup.

### Daily Survey

- Must read as a paper questionnaire, never an electronic device.
- Compact still-life: one small thin warm-ivory questionnaire card, a terracotta pencil/stylus, and one restrained English rose/olive sprig or tiny potted plant.
- The card is angled and subordinate to the overall cluster, not enlarged into a full-frame folio or sheet.
- An optional small embossed question-mark symbol may appear at top.
- Exactly three thin engraved answer rows with tiny radio circles; exactly one radio is selected.
- Explicit negative prompt: no oversized panel or sheet, remote control, control panel, keypad, switches, doorbell, giant pill buttons, thick chassis, clipboard, lesson notebook, flashcards, or reward.

### Last Lesson / Continue Lesson

- Compact tabletop cluster: one small top-spiral workbook plus its pen and at most one tiny supporting object such as a terracotta inkpot/cup or muted-olive sprig.
- The workbook keeps the approved semantic geometry but must match the visual mass of the Flashcards reference; it must not fill the canvas as a giant close-up.
- Seven top rings; theme-colored cover behind warm current page.
- Three embossed unfinished exercise lines; final line ends in an open circle.
- Two filled progress dots plus one hollow dot.
- Lifted lower-right page corner, small side loop/bookmark, pen held horizontally at the bottom.
- No architecture, building, book stack, flashcards, microphone, or test imagery.

### Phrase of the Day

- Compact 2-3-object still-life: one small folded quotation slip/card, one terracotta day/sun seal, and one English rose sprig or tiny plant pot.
- The quotation slip is not a giant scroll and does not fill the canvas.
- One pair of embossed quotation marks; no literal phrase.
- One small day/sun seal.
- One restrained British/English botanical cue, preferably an English rose for the current course.
- No microphone, speaker, sound wave, questionnaire, lesson sheet, book, landmark diorama, or readable text.

## Neutral matte contract

Generate source art on an achromatic matte, never green, magenta, pink, or blue chroma key.

- Target matte: exact `#808080`, RGB `(128, 128, 128)`.
- The prompt must request a flat edge-to-edge neutral gray studio matte.
- No checkerboard, grid, texture, horizon, floor, colored light spill, or colored rim light.
- Self-shading is allowed; cast shadow onto the matte is prohibited.
- If image generation introduces a neutral vignette despite the prompt, keep the file only as a source and normalize border-connected neutral matte pixels locally before alpha extraction.
- Never attempt alpha extraction from green or magenta. Those colors contaminate warm ivory, gold, hairline metal, and translucent edge pixels with green/pink halos.

## Alpha extraction contract

Matte sources stay outside `assets/images/**`.

1. Detect only border-connected neutral-gray pixels.
2. Protect enclosed warm-ivory surfaces; never make all light pixels transparent.
3. Build a feathered alpha edge.
4. Decontaminate semi-transparent edge RGB against matte `M=(128,128,128)` using un-premultiplication: `F=(C-(1-A)M)/A` for stable `A`.
5. Reconstruct one controlled soft contact shadow after extraction; it must fade into alpha and must not create a floor rectangle.
6. Verify on black, white, theme-card, and saturated-blue QA backgrounds. Gray halo, holes, checker remnants, or rectangular matte edges fail.
7. Production PNG metadata must report `channels=4`, `hasAlpha=true`, and all four corner alpha values equal to zero.

## Production dimensions and compression

- Preserve a square or near-square high-resolution source around 1200–1400 px.
- Crop transparent bounds consistently per slot while keeping identical padding across themes.
- Produce the exact dimensions expected by the target component, then WebP-compress at quality 70–78 with alpha preserved.
- Produce a 68 × 68 QA thumbnail for Survey and any other slot rendered near that size.
- Only final compressed RGBA WebP belongs under `assets/images/**`; source PNGs, rejected variants, composites, masks, and prompts stay in `.codex-tmp/theme-assets-v2/**`.

## Wire-first asset map

Before generating a theme variant, confirm a static `require()` exists or add it in the same change.

- Lessons, Flashcards, League: `app/home_menu_icons.ts`.
- Last Lesson: `app/home_last_lesson_assets.ts`.
- Daily Survey and Phrase of the Day: create one focused static map such as `app/home_supporting_art.ts`, then consume it from `components/SurveyTaskCard.tsx` and `components/DailyPhraseCard.tsx`.
- Do not add unused theme files.
- Do not reintroduce removed Home keys or generate assets for keys not rendered on Home.

## Generation order and approval gates

1. Finish the six Ember masters.
2. Validate semantic distinction at thumbnail size.
3. Generate all six Indigo variants from the approved geometry.
4. Continue theme by theme in the matrix order.
5. One built-in image generation call at a time; save and verify immediately.
6. Stop a theme if any slot changes meaning or geometry.
7. Do not run a large parallel in-thread batch; checkpoint files after every asset and compact/start a fresh session after each theme if session size or memory rises.

## Definition of done

- 54 final assets: 6 slots × 9 live themes.
- Zero files for removed themes or excluded features.
- Every production file has a static consumer.
- Every file passes semantic review, 68 px/readability review where relevant, RGBA metadata, four-background halo review, compression, and focused app tests.
- MAX and unrelated user changes remain untouched.
