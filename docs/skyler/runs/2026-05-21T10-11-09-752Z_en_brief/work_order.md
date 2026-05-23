# Skyler Work Order

Target: `en`
Category: `kitchen-and-cooking`

## Steps

- [x] Confirm the user selected this category.
- [x] Complete source matrix with at least two strong sources.
- [x] Write category brief.
- [x] Build item blueprint.
- [x] Draft 100-item quiz pack.
- [x] Attach source IDs to every item.
- [x] Add localized prompts for all active interface locales.
- [x] Add locale review notes for all active interface locales.
- [x] Run `npm run skyler:quiz -- --mode gate --draft docs/skyler/runs/2026-05-21T10-11-09-752Z_en_brief/pack-001.draft.json`.
- [x] Add non-UI thematic adapter and runtime coverage tests.
- [x] Add category navigation or thematic quiz entry point.
- [x] Enforce daily free-limit on thematic quiz start and restart.
- [x] Resolve standalone `app/quizzes.tsx` parity by delegating it to `app/(tabs)/quizzes.tsx`.
- [x] Match standard quiz runtime rules: 10 randomized questions per thematic session with shuffled choices.
- [x] Keep all approved correct answers unique across the 100-item kitchen pool.

## Track-Specific Note

English packs can map to the existing quiz flow after schema review.
