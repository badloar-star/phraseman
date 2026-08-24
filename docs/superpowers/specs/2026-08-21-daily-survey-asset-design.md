# Daily Survey themed asset design

## Decision

The approved concept is A: one compact feedback card with three tactile answer choices, exactly one selected choice, and one small stylus.

## Existing connected slot

- Home renders `SurveyTaskCard` only when an active survey offer exists.
- The visible art slot is 68 × 68 dp and currently loads the single static file `assets/images/survey/survey.webp`.
- The asset represents the product-feedback survey shown on Home. It is not the removed Daily Challenge feature.

## Meaning

The image must read as “choose an answer and share feedback.” It must not read as a lesson, flashcard deck, test, dialogue, voting campaign, gift, or reward chest.

## Fixed geometry across themes

- One softly rounded feedback card in a compact three-quarter view.
- Three clearly separated raised answer controls arranged vertically.
- Exactly one selected control, expressed through both inset depth and a small central mark so meaning does not depend on color alone.
- One short stylus resting beside the card without covering the answer controls.
- Strong centered silhouette with generous transparent padding and a contained contact shadow.
- No readable text, letters, numbers, flags, logos, or UI container background.

The card outline, camera angle, answer-control positions, selected state, stylus placement, padding, and visual mass remain consistent across all live interface themes.

## Theme variation

- Palette, lighting, surface material, stylus material, and restrained edge ornament may change.
- Ember uses terracotta ceramic/leather, warm ivory, dark cocoa, antique brass, and a tiny muted-olive accent.
- Other themes receive their own established palette and material language while preserving the approved geometry.
- This asset is product-feedback semantics, so it does not change architecture or language according to the studied course.

## Prohibited content

- No clipboard, checklist, paper form, book, notebook, flashcard, microphone, speaker, speech bubbles, architecture, landmark, character, shield, trophy, gift, chest, pearl, or reward token.
- No Practice or Diagnostic Test symbolism.
- No Daily Challenge symbolism.
- No MAX artwork or MAX-derived elements.

## Production requirements

- Match the approved compact soft tactile premium 3D family.
- Remain legible at 68 × 68 dp.
- Preview sources stay outside `assets/images/**` until visual approval.
- Final files require real alpha transparency, compressed WebP output, and one static `require()` per live theme before bundling.
- Generate no assets for removed legacy themes `minimalDark`, `candyBlue`, `business`, or `businessLight`.

## First preview

Generate one Ember master first. Once its geometry is visually approved, derive the other live themes by changing only materials, palette, lighting, and restrained ornament.
