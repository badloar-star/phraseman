# A1 Russian Phrase Illustrations — Design

## Goal

Create one visual-learning illustration for each of the 300 supplied Russian
phrases. The final images are intended to make the phrase understandable at a
glance without depending on on-image text.

## Deliverables

- 300 landscape PNG images, 1920 × 1080 (16:9), fully opaque.
- Stable zero-padded filenames matching the source order, for example
  `001-privet.png` and `300-poydyom.png`.
- A `manifest.csv` recording each index, source phrase, filename, and scene
  description, so the sequence remains reviewable and recoverable.

## Visual Direction

- Friendly high-end 3D animated-film illustration: expressive stylised people,
  rounded proportions, polished materials, soft studio lighting, and a warm,
  child-friendly mood.
- No alpha channel, black canvas, text, logo, watermark, or UI elements.
- Use the four supplied premium 16:9 background references (`set2_07` through
  `set2_10`) as the backdrop family. Rotate them while keeping the central
  field clear and subject contrast high.
- Use a single meaningful central mini-scene. Subjects are generally centered
  or lower-centred so decorative background edges are not obscured.

## Phrase-to-Scene Rules

- Concrete nouns: show the named object clearly and prominently.
- Colours and numbers: show a single unambiguous coloured object or a clearly
  countable group; do not include written numerals.
- Actions and commands: show the action at its most recognisable moment.
- People, pronouns, possessives, and basic grammar: use an easily readable
  two-person interaction or point-of-view composition rather than text.
- Questions and conversational phrases: use gesture, gaze, objects, and a
  simple scene context. Speech bubbles remain empty because the output must
  not contain text.
- Duplicate source phrases are separate deliverables with distinct scenes;
  they are not silently deduplicated.

## Generation Prompt Template

For each item, form a prompt using this invariant plus a phrase-specific
scene description:

> Create a 1920×1080 landscape educational illustration. A single clear scene
> depicting: [SCENE]. Friendly polished 3D animated-film style with expressive
> characters, rounded forms, detailed fabrics and props, soft warm studio
> lighting. Use a light premium decorative background inspired by the supplied
> pastel-and-gold 16:9 reference backgrounds, with a clear bright central area.
> Fully opaque image. No text, letters, numbers, logos, watermark, black
> background, transparency, or UI.

## Quality Gate

Every selected illustration is checked for:

1. Exact 16:9 opaque canvas at 1920×1080.
2. Correct, instantly recognisable phrase meaning.
3. No accidental text, symbols, watermark, alpha, black field, or cropped
   hands/faces/objects.
4. Subject readable against the selected background and with generous safe
   margins.
5. Style, lighting, and finish consistent across the set.

## Production Safety

This is a large visual set. First produce a small approval sample, then make
the remaining images in controlled chunks with a manifest and review
checkpoints. No generated image overwrites a user file.
