# Indigo personal-plan and Forest home assets

**Date:** 2026-08-24  
**Status:** approved by owner

## Goal

Replace the visible Midnight and generic-level fallbacks with exactly sixteen
connected DALL·E-generated assets:

- thirteen Indigo personal-plan assets;
- three Forest home-menu assets.

No speculative variant, alternate crop, unused `trainer.webp`, or retired-theme
asset is generated or added to `assets/images/**`.

## Art direction

### Indigo personal plans

Each image preserves the semantic object and immediately recognizable silhouette
of its Midnight counterpart, but is redrawn as an independent asset. The material
language uses deep indigo and navy bodies, violet/lavender edge light, restrained
warm ivory highlights, polished dimensional illustration, and clean transparent
edges. The result must read clearly at small mobile sizes without text, letters,
logos, or watermarks.

### Forest home menu

The three new images continue the existing Forest family: deep green leather,
muted brass, warm ivory paper, compact collectible-object composition, and a
transparent background. They must feel consistent with
`home-forest-lessons.webp`, `home-forest-cards.webp`, and the other connected
Forest home-menu assets.

## Exact deliverables

### Indigo, 512 x 512 WebP

All files live under `assets/images/personal_plan_tasks_fit/indigo/`:

1. `core_lesson.webp`
2. `recall.webp`
3. `practice.webp`
4. `choice.webp`
5. `listening.webp`
6. `sentence_build.webp`
7. `speaking.webp`
8. `flashcards.webp`
9. `route_gavan.webp`
10. `route_voyazh.webp`
11. `route_mitap.webp`
12. `route_impuls.webp`
13. `route_echo.webp`

`route_gavan.webp` is intentionally consumed by both the generic `route_phrase`
slot and the `gavan` route. No separate duplicate is generated.

### Forest, 256 x 256 WebP

All files live under `assets/images/home_menu/`:

1. `home-forest-exam.webp`
2. `home-forest-shop.webp`
3. `home-forest-hero-map.webp`

## Wiring contract

Before generation, add static `require()` paths for all sixteen target files:

- replace only the Indigo-to-Midnight entries in
  `app/personal_plan_task_visuals.ts`;
- replace only the three generic level-art fallbacks in the `dark`/Forest branch
  of `app/home_menu_icons.ts`.

Existing unrelated edits in those files and existing home-menu images are owner
work and must be preserved.

## Safe generation sequence

Use the built-in DALL·E/image generation capability only. Do not read or spend a
project/user OpenAI API key. Generate one asset per call and immediately export
the selected result from Codex storage to the ignored working directory
`.codex-tmp/theme-asset-generation/2026-08-24/` before the next call.

To respect the project session-size safety boundary, generation is split across
four fresh Codex tasks with four individual calls per task:

1. `core_lesson`, `recall`, `practice`, `choice`;
2. `listening`, `sentence_build`, `speaking`, `flashcards`;
3. `route_gavan`, `route_voyazh`, `route_mitap`, `route_impuls`;
4. `route_echo`, `home-forest-exam`, `home-forest-shop`,
   `home-forest-hero-map`.

Every Indigo call uses the corresponding Midnight image as a subject/silhouette
reference. Every Forest call uses the existing Forest family as the style
reference and the current generic fallback as the subject reference.

## Processing and verification

For each selected result:

1. preserve genuine transparency and remove no intentional internal details;
2. fit the subject inside the established safe area without clipping;
3. resize to the required square dimensions;
4. encode as WebP at production quality with alpha preserved;
5. visually inspect the final file;
6. verify exact dimensions, nonzero alpha content, transparent corners, and a
   valid WebP decode;
7. verify that the final path has exactly one intended static consumer and no
   generated extra is placed in the bundled asset tree.

After each batch, run the focused static-reference scanner and theme asset audit.
At the end, verify that no Indigo personal-plan slot aliases Midnight and that the
Forest exam, shop, and hero-map slots no longer point at level art.

