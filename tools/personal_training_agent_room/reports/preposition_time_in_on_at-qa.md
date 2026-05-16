# QA: preposition_time_in_on_at

Date: 2026-05-16

Room: Jesse Pinkman

Scope: draft-only content for `preposition_time_in_on_at`.

## Files

- Created `tools/personal_training_agent_room/drafts/preposition_time_in_on_at.draft.md`
- Created `tools/personal_training_agent_room/reports/preposition_time_in_on_at-qa.md`

## Requirement Check

- Training id is exactly `preposition_time_in_on_at`.
- No registry, taxonomy, or admin files were edited.
- Content is limited to choosing `at`, `on`, or `in` before time expressions.
- The learner-facing rule uses the required scale explanation:
  - RU: `Маленькое слово перед временем зависит от масштаба: at 7, on Monday, in May`.
  - UK: `Маленьке слово перед часом залежить від масштабу: at 7, on Monday, in May`.
  - ES: `La palabra pequena antes del tiempo depende de la escala: at 7, on Monday, in May`.
- The forbidden English grammar label is not used in learner copy.
- RU, UK, and ES copy are separated into their own sections.
- Every wrong option has specific feedback explaining why that option does not fit.

## Exercise Coverage

Shared prompt count: 12.

Covered time patterns:

- `at 7` exact clock time.
- `at noon`.
- `on Monday`.
- `on 12 May`.
- `in May`.
- `in 1998`.
- `in the morning`.
- `at night`.
- `on Friday morning`.
- `in summer`.
- `in two weeks`.
- `on Friday at 10`.

## Wrong Feedback Completeness

Each simple task has two wrong options. The mixed review task has two wrong option pairs.

- RU wrong feedback entries: 24 of 24.
- UK wrong feedback entries: 24 of 24.
- ES wrong feedback entries: 24 of 24.

Feedback is option-tied, not generic. Examples:

- `on` for `at 7`: explains that `on` is for a day/date, while `7` is an exact clock time.
- `in` for `on 12 May`: explains that `in May` works for a month alone, but `12 May` is a specific date.
- `at` for `in 1998`: explains that `at` is too exact for a year.
- `in` for `on Friday morning`: explains that `in the morning` works without a named day, but `Friday morning` contains a day.

## Scope Guard

No location examples are included. The only English examples are time expressions, dates, days, periods, or future-after-period blocks.

## Integration Note

The Jesse room protocol normally publishes to `app/diagnosis_training_<id>.ts` and checks registry wiring. This task was constrained to creating draft/report files only, so no app integration or registry sweep was performed as a file change.

## Result

Draft content is ready for a later integration pass into `app/diagnosis_training_preposition_time_in_on_at.ts`.

## QA Verdict

PASS.

Implementation integrator review completed for publish activation:

- Existing app file is present: `app/diagnosis_training_preposition_time_in_on_at.ts`.
- Registry route is present in `app/diagnosis_trainings.ts`.
- Content stays inside one mistake category: choosing `at`, `on`, or `in` for time expressions.
- The report confirms 12 prompts, RU/UK/ES coverage, no location drift, and option-specific feedback for every wrong answer.
- Approved for `status: active`.
