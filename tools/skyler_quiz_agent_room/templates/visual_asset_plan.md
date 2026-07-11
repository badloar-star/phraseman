# Skyler Visual Asset Plan

Category id: `<category-id>`

Target: `<en|fr|smartest>`

## Mandatory Start Gate

This DALL-E/imagegen visual asset kickoff / AI visual asset pass happens before quiz drafting
and before app integration. Every selected category needs theme card backgrounds
and theme logos (one topic plaque and one topic icon) for every active app visual
family / all active app theme modes in the style of existing Phraseman assets.

Protocol tokens: before quiz drafting; theme card backgrounds; all active app theme modes.

## Active App Visual Families

| Visual family | Existing reference style | Required theme card background / topic plaque | Required theme logo / topic icon |
| --- | --- | --- | --- |
| forest | `assets/images/home_menu/home-forest-*.webp` | `assets/images/quizzes/theme_cards/quiz-theme-<category-id>-forest.webp` | `assets/images/quizzes/theme_logos/quiz-theme-<category-id>-forest.webp` |
| dark | `assets/images/home_menu/home-dark-*.webp` | `assets/images/quizzes/theme_cards/quiz-theme-<category-id>-dark.webp` | `assets/images/quizzes/theme_logos/quiz-theme-<category-id>-dark.webp` |
| neon | `assets/images/home_menu/home-neon-*.webp` | `assets/images/quizzes/theme_cards/quiz-theme-<category-id>-neon.webp` | `assets/images/quizzes/theme_logos/quiz-theme-<category-id>-neon.webp` |
| neonGreen | `assets/images/home_menu/home-neon-green-*.webp` | `assets/images/quizzes/theme_cards/quiz-theme-<category-id>-neon-green.webp` | `assets/images/quizzes/theme_logos/quiz-theme-<category-id>-neon-green.webp` |
| gold | `assets/images/home_menu/home-gold-*.webp` | `assets/images/quizzes/theme_cards/quiz-theme-<category-id>-gold.webp` | `assets/images/quizzes/theme_logos/quiz-theme-<category-id>-gold.webp` |
| coral | `assets/images/home_menu/home-coral-*.webp` | `assets/images/quizzes/theme_cards/quiz-theme-<category-id>-coral.webp` | `assets/images/quizzes/theme_logos/quiz-theme-<category-id>-coral.webp` |
| minimalLight | `assets/images/home_menu/home-minimal-light-*.webp` | `assets/images/quizzes/theme_cards/quiz-theme-<category-id>-minimal-light.webp` | `assets/images/quizzes/theme_logos/quiz-theme-<category-id>-minimal-light.webp` |
| minimalDark | `assets/images/home_menu/home-minimal-dark-*.webp` | `assets/images/quizzes/theme_cards/quiz-theme-<category-id>-minimal-dark.webp` | `assets/images/quizzes/theme_logos/quiz-theme-<category-id>-minimal-dark.webp` |

## Style Contract

- Use the approved May 26, 2026 quiz visual baseline: DALL-E raster artwork,
  same style as the app `Ð›ÐµÐ³ÐºÐ¾ / Ð¡Ñ€ÐµÐ´Ð½Ðµ / Ð¡Ð»Ð¾Ð¶Ð½Ð¾` level cards, polished
  mobile-game illustration, dark glossy rounded plaque, silver bevel, muted
  green/olive glow, readable centered object, soft depth, controlled rim light,
  no generated UI text inside the bitmap.
- Do not create plaque or icon artwork as SVG/vector/code-drawn shapes.
- Theme card backgrounds / topic plaques are wider cards with room for
  app-rendered text overlays. Keep the left half quiet and put topic detail on
  the right half.
- Theme logos / topic icons are compact centered glyphs that remain readable at
  small sizes.
- Keep the topic concrete and safe. For medical topics, show learning/clinic
  objects such as clipboard, stethoscope, calendar, bandage, prescription paper,
  and gentle health symbols. Do not show blood, needles as the main hero,
  alarming injuries, diagnosis, or treatment claims.
- Preserve one shared thematic quiz composition across all app visual families:
  same proportions, same quiet left text zone, same right-side object zone, and
  matching compact dark rounded-square icon. Do not create a separate
  cyber/neon/flat style per family.
- Avoid the rejected cyberpunk direction: no city backdrops, hacker/circuit
  grids, harsh neon tubes, magenta/cyan noise, wires, robots, weapons, skulls,
  or busy tech panels.

## DALL-E Prompt Checklist

- [ ] Prompt includes category id and target.
- [ ] Prompt names the active app visual family.
- [ ] Prompt requests either `theme card background` / `topic plaque` or
  `theme logo` / `topic icon`.
- [ ] Prompt references existing Phraseman style and forbids text.
- [ ] Prompt uses the approved anchor: premium mobile-game DALL-E raster art,
      same style as the app quiz level cards, dark rounded glass/enamel plaque,
      silver bevel, muted green/olive glow, left half reserved for app text,
      matching compact dark rounded-square icon, no text, no letters, no
      numbers, no symbols, not cyberpunk.
- [ ] Prompt includes safe subject constraints.
- [ ] Output path is recorded under `assets/images/quizzes/theme_cards/` or `assets/images/quizzes/theme_logos/`.

## Asset Manifest

Fill this after generation or queuing.

| Visual family | Topic plaque path | Topic icon path | Prompt path | Status |
| --- | --- | --- | --- | --- |
| forest |  |  |  | pending |
| dark |  |  |  | pending |
| neon |  |  |  | pending |
| neonGreen |  |  |  | pending |
| gold |  |  |  | pending |
| coral |  |  |  | pending |
| minimalLight |  |  |  | pending |
| minimalDark |  |  |  | pending |
