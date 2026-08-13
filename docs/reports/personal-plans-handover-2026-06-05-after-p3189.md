# Personal Plans Handover - 2026-06-05 After P3.189

## Current User Contract

The user wants Personal Plans content generation to continue in a strict one-step rhythm:

- One user message `дальше` means: generate/finish exactly one day for exactly one plan.
- Continue in order by plan/day, not by random gaps.
- Always start from Day 1 and move forward.
- For each completed day, answer in chat with the full task list: phrases, options, distractors, word banks, quiz choices, and explanations where relevant.
- Do not show fake progress or placeholders as completed.
- Use the existing generator pipeline, not hand-written isolated content.
- The first task of every day must remain the main phrase lesson/introduction. Later tasks may vary by day.
- The user currently wants content generation work, not UI redesign work.

## Progress State

Completed and certified:

- Voyazh Days 1-6
- Mitap Days 1-5
- Gavan Days 1-5
- Impuls Days 1-5
- Echo Days 1-5

Next required step when user says `дальше`:

- Mitap Day 6

Then continue:

- Gavan Day 6
- Impuls Day 6
- Echo Day 6
- Voyazh Day 7
- Mitap Day 7
- and so on.

## Latest Checkpoint

Latest progress checkpoint in `docs/reports/personal-plans-fill-progress-data.json`:

- `P3.189 Voyazh Day 6 generator-backed certified content`

`Voyazh Day 6` is now certified with:

- Title: `Исправить проблему в поездке`
- Packet: `voyazh_d006_generator_packet`
- Lesson: `voyazh_d006_content_unit`
- Quiz: `voyazh_day_6_quiz`
- Status: `valid_non_live_dry_run`

## Important Generator Fixes Just Completed

The user audited the generated modes and found a real quality bug:

- Correct answers were often first in choice modes.
- `listen build` / phrase build word banks started with the correct words in the exact answer order.
- Quiz explanations were generic, e.g. `правильная фраза дня` / `другая фраза из этого дня`.
- Missing-word options also had the correct word first.

This was fixed at generator/runtime-source level, not only in one day.

Files touched for this fix:

- `app/personal_plan_option_ordering.ts`
  - New stable deterministic shuffle helpers.
- `app/personal_plan_choose_natural_phrase_items.ts`
  - Choice options now stable-shuffled and correct answer is not pinned first.
- `app/personal_plan_listen_choose_items.ts`
  - Listen-choice options now stable-shuffled and correct answer is not pinned first.
- `app/personal_plan_listen_build_items.ts`
  - Word bank now stable-shuffled and no longer begins in answer order.
- `app/personal_plan_missing_word_items.ts`
  - Missing-word options now stable-shuffled and correct answer is not pinned first.
- `app/personal_plan_exercise.tsx`
  - Local phrase-build word options now stable-shuffled.
- `app/personal_plan_quizzes.ts`
  - Generated quiz choices now stable-shuffled.
  - Correct index is calculated after shuffle.
  - Generated quiz explanations now use livelier Russian feedback similar to old manual quiz style.

Guard test added:

- `tests/personal_plan_generated_option_ordering.test.ts`

This test checks:

- Generated missing-word correct option is not first.
- Generated choose-natural correct option is not first.
- Generated listen-choose correct option is not first.
- Generated listen-build word bank does not start in final answer order.
- Generated quiz correct option is not first.
- Generated quiz explanations are Russian and not generic dry templates.

## Locale/Explanation Fixes

Earlier in this same workstream, generated explanations had English leakage. That was fixed and guarded.

Relevant test:

- `tests/personal_plan_generated_feedback_locale.test.ts`

It now includes:

- `voyazh_d006_content_unit`

It blocks English generator phrases and also blocks the dry Russian templates:

- `правильная фраза дня`
- `другая фраза из этого дня`

## Voyazh Day 6 Content

Phrases:

1. `I need to change the room.` = `Мне нужно поменять номер.`
2. `The key does not work.` = `Ключ не работает.`
3. `There is a small problem.` = `Есть небольшая проблема.`
4. `Can you check the booking?` = `Можете проверить бронирование?`
5. `I think this is the wrong bag.` = `Думаю, это не та сумка.`
6. `Please help me fix this.` = `Пожалуйста, помогите мне это исправить.`

Task order:

1. `plan_phrase_lesson`
2. `plan_listen_build`
3. `plan_phrase_recall`
4. `plan_choose_natural_phrase`
5. `plan_missing_word`
6. `plan_listen_choose`
7. `plan_pronunciation_repeat`
8. `plan_quiz`

Visible task count by selected time:

- 5 min: 2 tasks
- 10 min: 3 tasks
- 15 min: 4 tasks
- 20 min: 5 tasks

This is because Day 6 is treated as a light day by the existing runtime rule. Extra tasks are reachable through the add-more flow.

## Tests Last Run

Command:

```bash
npx jest tests/personal_plan_generated_option_ordering.test.ts tests/personal_plan_missing_word_live_route.test.ts tests/personal_plan_voyazh_day6_real_content.test.ts tests/personal_plan_fill_progress_day6_repair_accuracy.test.ts tests/personal_plan_generated_feedback_locale.test.ts tests/personal_plan_fill_progress_live_report.test.ts --runInBand
```

Result:

- 6 suites passed
- 20 tests passed

Also ran live-data audit script:

```bash
npx tsx .codex-tmp/audit-personal-plan-generated-options.ts
```

Important audit result after fixes:

- `choose natural`: 0 correct-first on sampled generated days.
- `listen choose`: 0 correct-first on sampled generated days.
- `listen build`: 0 word banks start in answer order on sampled generated days.
- `quiz`: 0 correct-first on sampled generated days.
- `quiz generic explanations`: 0 on sampled generated days.

Sampled days:

- `voyazh_d001_content_unit`
- `voyazh_d005_content_unit`
- `mitap_d005_content_unit`
- `gavan_d005_content_unit`
- `impuls_d005_content_unit`
- `echo_d005_content_unit`
- `voyazh_d006_content_unit`

## Files Added During Latest Work

- `app/personal_plan_option_ordering.ts`
- `tests/personal_plan_generated_option_ordering.test.ts`
- `tests/personal_plan_voyazh_day6_real_content.test.ts`
- `.codex-tmp/audit-personal-plan-generated-options.ts`
- `.codex-tmp/inspect-voyazh-day6-full.ts`
- `.codex-tmp/inspect-voyazh-day6-compact.ts`

The `.codex-tmp` files are temporary inspection/audit helpers.

## Files Updated During Latest Work

Core content/generator/runtime:

- `app/personal_plan_catalog.ts`
- `app/personal_plan_generation_dry_run_harness.ts`
- `app/personal_plan_phrase_lessons.ts`
- `app/personal_plan_choose_natural_phrase_items.ts`
- `app/personal_plan_listen_choose_items.ts`
- `app/personal_plan_listen_build_items.ts`
- `app/personal_plan_missing_word_items.ts`
- `app/personal_plan_exercise.tsx`
- `app/personal_plan_quizzes.ts`

Reports/tests:

- `docs/reports/personal-plans-fill-progress-data.json`
- `tests/personal_plan_fill_progress_day6_repair_accuracy.test.ts`
- `tests/personal_plan_generated_feedback_locale.test.ts`
- `tests/personal_plan_generated_option_ordering.test.ts`
- `tests/personal_plan_voyazh_day6_real_content.test.ts`

## Existing Dirty Worktree Warning

The worktree contains many unrelated changes from other workstreams, including UI, assets, functions, and generated files. Do not revert them.

Use targeted diffs only for Personal Plans files. Avoid broad cleanup.

## How To Continue

When the user says `дальше`, do this:

1. Generate/finish `Mitap Day 6`.
2. Use the same generator-backed pattern as previous days.
3. Add/adjust focused tests for `Mitap Day 6`.
4. Update `docs/reports/personal-plans-fill-progress-data.json` only for real progress.
5. Run narrow tests.
6. In the final chat response, include the complete generated task content:
   - phrases
   - word distractors
   - missing-word items
   - choose-natural options
   - listen-choose options
   - listen-build target/bank
   - quiz choices and answers
   - mention verification run

Do not skip the full chat dump. The user explicitly requires it.

## User Tone/Preference

The user is under pressure and can be direct/angry when progress looks fake or vague. Best response style:

- Be direct.
- Do not over-explain technical internals unless asked.
- Show concrete progress.
- Admit if something is not normal.
- Never claim a plan/day is done unless tests and progress data agree.
- Keep moving.
