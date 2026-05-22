# Heisenberg Pipeline Audit

Date: 2026-05-19

## Scope

Audited and updated:

- `scripts/heisenberg_pipeline.cjs`
- `scripts/lib/heisenberg_core.cjs`
- `scripts/heisenberg_ui_locale_audit.ts`
- `scripts/heisenberg_semantic_audit.ts`
- `scripts/lib/heisenberg_semantic_core.cjs`
- `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`
- Heisenberg regression tests and generated gate reports.

## Summary

Heisenberg is green for the current batch source-locale contract.

The pipeline now has three layers:

- coverage: batch locale coverage, expected units, existing-locale blockers;
- semantics: deterministic checks for encoding, protected English anchors, source-locale drift, and stale quiz payloads;
- process: mandatory Agent Review Board with fixed reviewer roles and prompts.

Current batch source locales:

- `es`
- `pt-BR`
- `vi`
- `id`
- `tr`
- `pl`

Current state:

- UI activation audit reports `activationReady=yes`.
- Batch coverage reports `0` partial units and `0` missing-all units.
- Semantic strict audit reports `0` blockers and `0` warnings. The diagnosis-training ES readiness backlog is closed instead of being treated as ready just because fields are non-empty. Planned-locale fallback risks are closed for the scanned diagnosis helpers, and planned-language catch-up is tracked separately for ES-active diagnosis trainings.
- HTML visible text and selected localized attributes are extracted into Heisenberg inventory.
- Pre-release audit passes.
- Full Jest passes with the Heisenberg regression contracts included.

## Latest Verified Commands

These commands were verified on 2026-05-19 after the Agent Review Board and audit-contract updates:

```bash
npm test -- --runInBand
npm run audit:pre-release
npm run heisenberg:gate
npm run heisenberg:ui-audit
npm run heisenberg:semantic-audit:strict
node scripts/audit_vocab_and_distractors.mjs
node scripts/audit_phrase_plausibility.mjs
npm test -- --runTestsByPath tests/quiz_spanish_locale.test.ts tests/quiz_source_locale.test.ts --runInBand
npx tsc --noEmit --pretty false
npm run lint
git diff --check
```

Observed results:

- `npm test -- --runInBand`: `138` suites passed, `1265` tests passed.
- `npm run audit:pre-release`: passed.
- `npm run heisenberg:gate`: passed.
- `npm run heisenberg:ui-audit`: `activationReady=yes`, `0` findings, `0` missing triLang locale units.
- `npm run heisenberg:semantic-audit:strict`: `0` blockers, `0` warnings.
- `node scripts/audit_vocab_and_distractors.mjs`: `0` findings.
- `node scripts/audit_phrase_plausibility.mjs`: active issues `high=0`, `med=0`, `low=0`; semantic cross-reference list `43`.
- `npm test -- --runTestsByPath tests/locale_ru_uk_es.test.ts tests/daily_tasks_es_locale.test.ts tests/quiz_spanish_locale.test.ts tests/quiz_source_locale.test.ts --runInBand`: `4` suites passed, `35` tests passed.
- `npm run audit:translations`: `1600` phrases scanned, `0` findings.
- full quiz source-locale coverage for `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`: `easy=301/301`, `medium=231/231`, `hard=297/297`, issues `0`.
- `npm test -- --runTestsByPath tests/heisenberg_pipeline.test.ts tests/heisenberg_ui_locale_audit.test.ts tests/heisenberg_semantic_audit.test.ts --runInBand`: `3` suites passed, `57` tests passed.
- `npm test -- --runTestsByPath tests/quiz_spanish_locale.test.ts tests/quiz_source_locale.test.ts tests/heisenberg_ui_locale_audit.test.ts --runInBand`: `3` suites passed, `27` tests passed.
- `npm test -- --runTestsByPath tests/trainer_modes.test.ts --runInBand`: `1` suite passed, `166` tests passed.
- `npx tsc --noEmit --pretty false`: passed.
- `npm run lint`: exited with code `0`, with historical warnings and no errors.
- `git diff --check`: passed.

Latest report paths observed in this run:

- Batch gate: `docs/heisenberg/batch/2026-05-20T07-19-05-679Z`
- Existing Spanish audit: `docs/heisenberg/es/2026-05-20T07-19-05-830Z`
- UI audit: `docs/heisenberg/ui/2026-05-20T07-18-24-450Z`
- Semantic strict: `docs/heisenberg/semantic/2026-05-20T07-18-24-161Z`

## Open Translation Backlog From 2026-05-19

Status: Closed.

The semantic audit now includes a diagnosis-training readiness reviewer. It scans learner-facing `TriText` copy and reports Spanish fields that are present but still look like English placeholder/source copy while `supportedLocales` does not include `es`.

Latest result:

- `0` diagnosis-training ES readiness warnings.
- `0` diagnosis-training planned-language catch-up warnings.
- `0` diagnosis-training planned-locale ES fallback risk warnings.
- `0` diagnosis guidedMode planned-locale inheritance findings.
- `0` filtered planned-vs-ES runtime findings after protected English study-target anchors are excluded.
- `0` semantic blockers.
- Report: `docs/heisenberg/semantic/2026-05-20T07-18-24-161Z`

This protects the shared answer arrays: English study-target choices remain common arrays, while source-language prompts and explanations must be translated in their locale-specific fields before Spanish is activated for those trainings.

Planned-language inheritance from `es` through scanned diagnosis-training `tri()` helpers has been removed, so `pt-BR`, `vi`, `id`, `tr`, and `pl` no longer pretend to be translated when explicit planned-locale copy is missing.

The remaining static English generic default in `modal_force` was replaced with a Spanish generic default, so a future omitted `es` argument will not leak the old English placeholder into Spanish UI copy.

Diagnosis guidedMode prompts now have a runtime regression guard in `tests/trainer_modes.test.ts`: all `218` guided tasks must expose prompt copy, and planned locales may not be missing or equal to `es`. Legacy helpers that copied `es` into `pt-BR`, `vi`, `id`, `tr`, and `pl` were switched to localized generic planned fallbacks, with explicit planned keys so the static UI audit also stays green.

Planned-language catch-up to the currently active Spanish level is closed. `phrasal_particle_pair` was brought from `161` missing planned `TriText` units per planned language to `0`, `modal_force` from `164` to `0`, `article_a_an` from `209` to `0`, `adverb_frequency_position` from `201` to `0`, `preposition_time_in_on_at` from `201` to `0`, `preposition_place_in_on_at` from `120` to `0`, `article_the_specific` from `215` to `0`, `article_zero` from `215` to `0`, `preposition_time_place` from `216` to `0`, `preposition_duration_for_since` from `201` to `0`, `adjective_comparison` to `0`, `adjective_vs_adverb` to `0`, and `noun_singular_plural_basic` to `0`; all thirteen no longer appear in the catch-up report.

Spanish readiness is now complete for the scanned diagnosis-training backlog with the planned languages kept level. `preposition_direction_to_into_from`, `preposition_direction`, `preposition_common_verb_patterns`, `object_order_give_me_it`, `word_order_basic_statement`, `word_order_basic_question`, `imperative_basic`, `condition_zero_first`, `condition_second_basic`, `relative_clauses_who_which_that`, `reported_speech_basic`, `verb_past_simple_regular_irregular`, `verb_past_simple_negative_question`, `verb_present_perfect_basic`, `present_perfect_vs_past_simple`, `present_perfect_questions_negatives`, `present_perfect_for_since`, `past_continuous_basic`, `past_simple_vs_past_continuous`, `used_to_basic`, `future_present_continuous_arrangements`, `verb_was_were`, `future_will_going_to`, `infinitive_vs_gerund_basic`, `too_enough`, `modifier_very_really_quite`, `modal_may_might_probability`, `modal_can_could_ability_request`, `modal_should_must_have_to`, and `noun_possessive_apostrophe_s` are activated for `es`, and planned-language catch-up remains `0`.

## Closed Findings From 2026-05-17

### Strict gate command

Status: Closed.

`npm run heisenberg:gate` now runs the strict batch audit path, existing-locale blockers, selected localization checks, TypeScript, and semantic audit.

### Missing-all coverage units

Status: Closed for the current contracted surfaces.

Batch coverage now reports both partial units and units missing from every required batch locale. The current gate reports:

- partial units: `0`
- missing-all units: `0`

The current expected contracts cover:

- structured quiz source-locale payload ranges;
- Daily Phrase source-locale fields;
- irregular verb source-locale labels.

### Daily Phrase missing source-locale copy

Status: Closed for the current contracted range.

Daily Phrase `sourceLocales` coverage is part of the batch contract and semantic strict checks.

### Structured quiz semantic coverage

Status: Closed for the current contracted ranges.

Semantic audit resolves quiz source-locale payloads from:

- inline Spanish copy;
- inline `sourceLocales`;
- structured payloads in `app/quiz_source_locale_payloads.ts`.

Hard quiz structured payload fallback is verified through ordinal `297`. Previously stale hard payloads `268` through `272` were refreshed against the current runtime quiz entries before expanding the safe range, so the structured payload layer no longer drifts from `app/quiz_data.ts`.

### Agent Review Board

Status: Added and tested.

Every generated run now includes `agent_review_board.md`, and the pipeline exposes a mandatory reviewer board with these stable roles:

- Chief Editor
- Grammar Pedagogy Reviewer
- Runtime Integrity Reviewer
- Surface Owner
- Activation Gate Reviewer

The role list and generated markdown are covered by `tests/heisenberg_pipeline.test.ts`.

### UI activation audit and `sourceLocales`

Status: Added and tested.

`npm run heisenberg:ui-audit` reports `activationReady=yes` for the current scanned UI/admin contract. Structured `sourceLocales` maps count as planned-language coverage when they include the required locale keys.

This behavior is covered by `tests/heisenberg_ui_locale_audit.test.ts`.

### HTML extraction

Status: Added and tested.

Heisenberg now extracts visible HTML text plus selected localized attributes from `.html` files:

- `title`
- `placeholder`
- `aria-label`
- `alt`

The extractor skips comments, `script`, `style`, `code`, `pre`, `kbd`, and `samp` content to avoid turning implementation details into translation units.
It also recognizes HTML sidecar strings in `data-i18n-<locale>` and derived attributes such as `data-i18n-es-aria` / `data-i18n-es-alt`, so static pages can keep a Russian default while carrying Spanish copy that the public-site helper can activate.

For existing Spanish app-locale audits, HTML-only gaps are reported as `HTML Coverage Backlog` instead of blocking the app UI/explanation gate. The latest existing-locale audit shows:

- item coverage gap files: `0`
- HTML coverage backlog files: `0`
- HTML partial coverage files: `0`

Current HTML backlog:

- none

Current HTML partial coverage:

- none

This behavior is covered by `tests/heisenberg_pipeline.test.ts`.

### Lesson Word Spanish Gloss Audit

Status: Updated and verified.

`scripts/audit-lesson-words-es.mjs` now audits the live `app/lesson_words.tsx` vocabulary source and counts all Spanish coverage paths used at runtime:

- inline `es` fields;
- curated `app/lesson_words_es_map.ts`;
- generated `app/lesson_words_es_by_en.ts`.

Latest result:

- lesson word rows: `1252`
- unique English keys: `765`
- missing Spanish glosses: `0`

This avoids stale false positives from older `docs/reports/lesson_words_en_ru_uk.json` snapshots.

### Intro Spanish Audit

Status: Updated and verified.

`scripts/audit-intro-spanish.mjs` now audits the current per-lesson intro sources (`app/lesson_intro_screens_lesson*_v2.ts`) instead of older aggregator files.

Latest result:

- files scanned: `22`
- `textRU` / `textES`: `83 / 83`
- `trRU` / `trES`: `214 / 214`
- status: `OK`

### Spanish POS Heuristic

Status: Updated and verified.

`scripts/audit_es_pos_heuristic.mjs` now allowlists normal Spanish nouns that look like infinitives by suffix (`azúcar`, `alquiler`, `lugar`, `mujer`), avoiding false positives while keeping the noun/verb mismatch scan active.

Latest result:

- noun rows that look like infinitives: `0`
- verb rows that look noun-like: `0`

### Lesson Deep Content Audit

Status: Refined and verified.

`npm run audit:lesson-deep-content` runs through `tools/lesson_qa/node_stubs.cjs`, which supplies Node-safe React Native stubs for lesson data imports. The deep audit now has explicit review allowlists for intentional Latin grammar markers and expected multi-POS English headwords, so it reports actual content risks instead of known pedagogical cases.

Latest result:

- high: `0`
- medium: `0`
- low: `0`

`npm run audit:correct-presence` also reports `0` issues for phrase slots and generated options.

### Daily Tasks And Personal Training

Status: Updated and verified.

`scripts/_verify-daily-es-keys.mjs` now parses only the production `ALL_TASKS` array in `app/daily_tasks.ts`, avoiding false positives from locale keys inside runtime toast payloads.

Latest daily task result:

- daily task ids: `162`
- Spanish keys: `162`
- missing: `0`
- extra: `0`

Personal training copy audit is clean after replacing one internal grammar label in learner-facing RU/UK feedback.

Latest personal training result:

- `npm run training:personal:copy-audit:strict`: `0` errors, `0` warnings

### Quiz Spanish Source Coverage

Status: Extended and verified.

The direct quiz source-locale validator found the remaining source prompt gap in the tail of the hard quiz pool. Hard ordinals `276` through `297` now carry Spanish prompt copy through `es` / `explanationsES` and planned-language source payloads through `app/quiz_source_locale_payloads.ts`, so quiz source text no longer falls back to Russian for those questions.

The older hard structured payloads for ordinals `268` through `272` were also refreshed to match the current runtime choices and `correct` indexes before the hard payload safe range was extended to `297`.

During the same pass, three answer-key mismatches were corrected where the positive explanation pointed at a different option than `correct`:

- `Stop beating around the bush`
- `Seldom have I seen such exquisite beauty`
- `I insist that he be present at the meeting`

Latest quiz source coverage for `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`:

- easy: `301 / 301`, issues `0`
- medium: `231 / 231`, issues `0`
- hard: `297 / 297`, issues `0`

### Vocabulary And Distractor Audit

Status: Refined and verified.

`scripts/audit_vocab_and_distractors.mjs` now separates real distractor risks from expected grammar-marker cases. The infinitive marker `to`, marker buckets, and known article/open preposition noise are no longer counted as cross-class defects.

Latest result:

- total findings: `0`
- report: `docs/reports/content_audit_vocab_distractors_2026-05-19.md`

### Phrase Plausibility Audit

Status: Refined and verified.

`scripts/audit_phrase_plausibility.mjs` now reports old manually named semantic-audit phrase ids as an informational cross-reference instead of active `low` issues. Active findings are reserved for current heuristic matches.

Latest result:

- high: `0`
- medium: `0`
- low: `0`
- semantic cross-reference ids: `43`
- reports:
  - `docs/reports/phrase_plausibility_audit.md`
  - `docs/reports/phrase_plausibility_audit.ru.md`
  - `docs/reports/phrase_plausibility_audit.json`

## Regression Contract

For any change to Heisenberg extraction, coverage, UI audit, semantic audit, or Agent Review Board behavior, run:

```bash
npm test -- --runTestsByPath tests/heisenberg_pipeline.test.ts tests/heisenberg_ui_locale_audit.test.ts tests/heisenberg_semantic_audit.test.ts --runInBand
npm run heisenberg:ui-audit
npm run heisenberg:semantic-audit:strict
npm run heisenberg:gate
npx tsc --noEmit --pretty false
git diff --check
```

Before release, also run:

```bash
npm test -- --runInBand
npm run audit:pre-release
npm run lint
```

## Remaining Non-Blocking Notes

### Lint warnings

`npm run lint` exits successfully, but the repo still has historical warnings, mostly old unused variables, hook dependency warnings, and style warnings outside the Heisenberg core path.

These are not Heisenberg blockers while lint exits with code `0` and reports no errors.

### Generated reports

Repeated gate and audit runs generate timestamped folders under `docs/heisenberg/*`. Keep the latest report paths in PR notes or audit notes. Do not treat older generated run folders as product input for new Heisenberg scans.

### Future coverage contracts

The current gate is green for the contracted surfaces. If new localized surfaces are added, define expected units first, then make batch coverage and semantic audit consume the same contract.

### HTML Spanish backlog

HTML extraction now exposes standalone admin/public web pages that are Russian-source pages without Spanish HTML counterparts. This is visible in existing-locale reports as `HTML Coverage Backlog`, but it is not an app UI activation blocker.

Treat this as a separate website/admin localization backlog if Spanish public/admin pages are required.
