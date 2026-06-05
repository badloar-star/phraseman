# Personal Plans Full Rebuild Readiness Audit - 2026-06-05

## Current Readiness

- Plans: 5.
- Days: 546.
- Tasks: 4,368.
- Required modes per day: 8.
- Material gaps in the current catalog gate: 0.
- Runtime audio for the approved generated listening assets: approved and registered.
- Production ready: false.

## Required Daily Modes

Every rebuilt day must include the full plan-native pool:

- `plan_phrase_lesson`
- `plan_missing_word`
- `plan_choose_natural_phrase`
- `plan_listen_choose`
- `plan_listen_build`
- `plan_pronunciation_repeat`
- `plan_phrase_recall`
- `plan_quiz`

Each mode currently appears 546 times across the catalog, once per day.

## Rebuild Scope

| Plan | Days | Tasks | Runtime-bound days | Scaffold days to rebuild |
| --- | ---: | ---: | ---: | ---: |
| Voyazh | 84 | 672 | 28 | 56 |
| Mitap | 112 | 896 | 28 | 84 |
| Gavan | 126 | 1,008 | 28 | 98 |
| Impuls | 140 | 1,120 | 28 | 112 |
| Echo | 84 | 672 | 28 | 56 |

Total scaffold days to rebuild: 406.

## What This Means In Plain Language

The app already has all plan days, all eight task types, route coverage, and launchable materials. The missing part is not "more empty tasks"; it is the premium content pass: replace every scaffold-generated day with authored day packets that feel written for the exact plan, then review them and attach evidence for audio and pronunciation.

Selected daily time stays the way the user requested: it only changes the first visible slice. The day still owns the full task pool, and "Add more tasks" can reveal the remaining tasks.

## Implementation Plan

1. Audit lock
   - Keep the current baseline: 546 days, 4,368 tasks, 8 modes per day.
   - Do not delete routes, audio registry, progress storage, or add-more behavior.

2. Regenerate authored day packets
   - Rebuild the 406 scaffold-generated days as plan-native day packets.
   - Each packet must include natural phrases, short translations, teaching notes, recall links, and user-facing copy.

3. Materialize every mode
   - For every rebuilt day, generate payloads for phrase build, missing word, natural choice, listen choose, listen build, pronunciation repeat, recall, and quiz.
   - Keep the current time-slice behavior intact.

4. Review and evidence
   - Human/content review must approve rebuilt packets.
   - Listening tasks need approved audio coverage.
   - Pronunciation tasks need real recording/scorer evidence before readiness is claimed.

5. Guarded source write and release gate
   - Only after review, write the rebuilt source/runtime catalog.
   - Run route, storage, materials, audio, pronunciation, TypeScript, and focused Personal Plans tests.

## Current Blockers

- 406 scaffold-generated days still need authored rebuild and review.
- Listening coverage beyond the approved generated audio set still needs approved audio or explicit mapping.
- Pronunciation still needs real recordings/scored attempts before production readiness.
- Final human acceptance is still required after all evidence gates pass.

## Fresh Verification

- `npx jest tests/personal_plan_full_rebuild_readiness_audit.test.ts --runInBand`
- `npx jest tests/personal_plan_full_catalog_task_materials.test.ts tests/personal_plan_generated_scaffold_task_routes.test.ts tests/personal_plan_generation_matrix_and_day1_content.test.ts tests/personal_plan_cycle_expansion_spec.test.ts --runInBand`
