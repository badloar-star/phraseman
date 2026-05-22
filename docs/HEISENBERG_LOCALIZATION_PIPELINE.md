# Heisenberg Localization Pipeline

Heisenberg is the repo-level pipeline for adding a new source language for users who learn English from their own language.

It does not write a new language directly into existing `ru` / `uk` / `es` fields. The first stage is always isolated: inventory, research checklist, guard report, and translation blocks under `docs/heisenberg/<locale>/<run-id>/`.

## Command

```bash
npm run heisenberg -- --lang fr
npm run heisenberg -- fr-FR
npm run heisenberg -- --lang de --audit-only
npm run heisenberg:batch:audit
npm run heisenberg:gate
npm run heisenberg:semantic-audit
```

## What It Generates

- `manifest.json`: run summary, counts, surfaces, checks.
- `inventory.json`: every scanned file with localization markers.
- `localized_items.jsonl`: extracted localized strings from code/JSON surfaces (`localized_items_sample.jsonl` in `--audit-only` runs).
- HTML inventory includes visible text plus selected localized attributes (`title`, `placeholder`, `aria-label`, `alt`) while skipping implementation-only `script`, `style`, `code`, `pre`, `kbd`, and `samp` content.
- `translation_blocks/*.jsonl`: bounded work batches grouped by surface.
- `agent_review_board.md`: mandatory "office" of reviewer roles, prompts, checks, and verdict format for each translation block.
- `research_checklist.md`: required external-source research gates.
- `guard_report.json`: language isolation and collision checks.
- `batch_locale_coverage.json`: item-level coverage report for batch locales (`pt-BR`, `vi`, `id`, `tr`, `pl`), showing which language is missing from a partially localized unit and which expected units are missing from every batch language.
- `existing_locale_audit.md/json`: generated when the requested locale already exists in the app, for example `es`.
- `RUNBOOK.md`: exact next commands and integration notes.
- `docs/heisenberg/semantic/<run-id>/semantic_audit.json`: semantic-risk report for translated content.

By default, translation blocks include product surfaces only. The inventory still scans the whole repository. Use `--include-supporting` when docs/tests/scripts also need translation blocks.
Generated Heisenberg outputs under `docs/heisenberg/*` and local tool settings under `.claude/*` are skipped so a new run does not audit old run artifacts as product input.

## Current Contract

The app currently has many hard-coded `ru` / `uk` / `es` contracts:

- UI packs: `constants/i18n.ts`, `components/LangContext.tsx`, and many `triLang(...)` call sites.
- Course content: `app/lesson_data_*`, `app/lesson_intro_screens_*`, `app/lesson_help.tsx`.
- Quizzes: `app/quiz_data.ts`, `app/quiz_data_es_l2.ts`, `app/quizzes/*`.
- Personal trainings and admin export: `app/diagnosis_training_*`, `app/personal_training_taxonomy.ts`, `admin/personal-trainings.js`.
- Reports, rewards, arena, daily tasks, public web/admin/legal surfaces.

Because of that, a new language must first be created outside those fields and integrated through a deliberate locale registry/refactor. This prevents a new language from overwriting or mixing with existing content.

For existing app locales, Heisenberg switches to production-audit mode. Spanish is the important case right now:

- `es` means interface/explanation language for people learning English.
- Spanish UI is controlled by `SPANISH_UI_LOCALE_ENABLED`, not the dev study-target switch.
- The study target must stay `en`.
- Dev-only Spanish-as-study-target code (`StudyTargetLang = 'es'`, `spanishStudyActive`, etc.) is a separate experiment and must not drive Spanish UI localization.
- Before production, every Spanish UI fallback must be explicit instead of silently returning Russian.
- In non-audit runs for an existing locale, translation blocks contain only source rows from files that have RU/UK localized items but no extracted target-locale items.
- For existing `es`, block instructions are strict: create or fill only explicit ES fields/items, and do not write Spanish text into `ru` or `uk`.

## Research Gate

Each language run must document external sources before translation/rewrite:

- W3C language tags / HTML language metadata.
- Unicode CLDR locale data and plural rules.
- ICU MessageFormat or Fluent-style plural/select requirements.
- CEFR alignment for lesson/quiz levels.
- English grammar references such as British Council LearnEnglish.
- Language-specific learner-error research for speakers of the target language.

## Mandatory Agent Review Board

Every translation block must pass an agent-style review board before integration. Treat it like an office with departments: each role owns a different failure mode, and the block moves forward only when every role returns `GO` or an explicit `HOLD` has been fixed.

The generated `agent_review_board.md` contains the exact prompts and verdict format. The mandatory roles are:

- Chief Editor: checks natural target-language copy, product tone, and non-literal rewrites.
- Grammar Pedagogy Reviewer: checks that explanations teach English to the target-language learner and preserve protected English examples.
- Runtime Integrity Reviewer: checks IDs, placeholders, indexes, locale keys, source maps, and code/data shape.
- Surface Owner: checks the surface context: lesson, quiz, training, rewards, admin, legal, or support.
- Activation Gate Reviewer: checks coverage, semantic/UI audit risk, research notes, and whether the block can move toward UI activation.

Verdicts are strict:

- `GO`: no blocker for this role.
- `HOLD`: fix or document a small issue before continuing.
- `BLOCKED`: do not integrate the block.

Suggested role prompt template:

```text
You are the <Role Name> for this Heisenberg localization block.
Review only the provided block and the relevant surrounding context.
Return blockers first. Preserve English study-target text, IDs, placeholders,
answer choices, indexes, and locale contracts. End with:
Role: <Role Name>
Verdict: GO | HOLD | BLOCKED
Findings:
- file/path:line - issue or confirmation
Required fixes:
- smallest actionable fix, or "none"
```

## Block Rules

Each block must be reviewed independently:

- Keep English answer choices, correct indexes, IDs, and placeholders stable.
- Rewrite explanations for the target-language learner, not as literal translations.
- Preserve product names, URLs, and app-specific mechanics.
- For existing app locales like Spanish, integrate into the matching locale fields (`es`, `titleEs`, `literal_es`, etc.) only.
- Record grammar decisions and citations in the language report.
- Record the Agent Review Board verdicts for the block.
- Run tests after each integration stage.

## Integration Gate

No generated target language should be applied to production app files until:

- All translation blocks are complete.
- `npm run heisenberg:batch:audit` passes without batch coverage gaps, including structured quiz payloads and Daily Phrase `sourceLocales`.
- `npm run heisenberg:gate` passes when you need the release gate: strict batch coverage, strict existing-locale blockers, selected localization tests, TypeScript, and semantic audit.
- `npm run heisenberg:semantic-audit:strict` has no semantic blockers.
- Every mandatory Agent Review Board role has returned `GO`, or all `HOLD` items have been fixed and re-reviewed.
- `npm run heisenberg:ui-audit` has been reviewed. It is allowed to report `activationReady=no` while planned locales are being prepared, but the report must be used as the backlog for UI/admin activation work.
- The Heisenberg regression tests pass: `tests/heisenberg_pipeline.test.ts`, `tests/heisenberg_ui_locale_audit.test.ts`, and `tests/heisenberg_semantic_audit.test.ts`.
- `guard_report.json` has no unresolved collision.
- Language research notes are complete.
- Existing localization tests still pass.
- A new locale architecture is added instead of expanding ad hoc `ru` / `uk` / `es` triples in-place.
- Existing-locale HTML-only gaps are reported as `HTML Coverage Backlog`; they are website/admin localization backlog, not app UI activation blockers.

## Regression Contract

When changing Heisenberg extraction, coverage, UI activation, semantic audit, or the Agent Review Board contract, run at least:

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

`npm run lint` currently has historical warnings, but must exit with code `0` and no errors.

## Batch Mode

The current Heisenberg batch source locales are:

- `es`
- `pt-BR`
- `vi`
- `id`
- `tr`
- `pl`

Use batch mode when the work must never skip one of the approved interface/explanation languages:

```bash
npm run heisenberg:batch:audit
npm run heisenberg:batch:audit:strict
npm run heisenberg:gate
```

This runs `audit-only` for every batch locale and writes a batch manifest under `docs/heisenberg/batch/<run-id>/manifest.json`.

`heisenberg:batch:audit` is the normal coverage audit. `heisenberg:batch:audit:strict` also fails when an existing app locale, currently Spanish, reports production blockers. `heisenberg:gate` adds the selected test/check suite on top.

Spanish is special because it already exists as an app locale. The coverage contract therefore supports per-surface locale requirements:

- structured quiz payloads require `pt-BR`, `vi`, `id`, `tr`, and `pl`, because Spanish quiz/runtime copy lives in the existing Spanish architecture;
- Daily Phrase requires `pt-BR`, `vi`, `id`, `tr`, and `pl` under `sourceLocales`, and Spanish under legacy `literal_es`, `meaning_es`, and `text_es`;
- irregular verbs require all six Heisenberg batch languages (`es`, `pt-BR`, `vi`, `id`, `tr`, `pl`) in their source-locale map.

The current expected batch coverage contracts include:

- Structured quiz payloads: `medium 111-231`, `hard 1-100`, with `prompt` and four explanations.
- Daily Phrase: IDs `11-186`, with `literal`, `meaning`, and `text` under `sourceLocales` for the five new languages, plus Spanish `literal_es`, `meaning_es`, and `text_es`.
- Irregular verbs: all lesson irregular verb bases, with a separate source-locale label for every Heisenberg batch language.

## Semantic Audit

The semantic audit is a deterministic review layer. It does not replace a human/native-speaker review, but it catches issues that coverage tests cannot see:

- broken encoding / mojibake;
- source-language text falling back to another source language;
- English answer choices accidentally becoming localized;
- translated quiz explanations losing protected English terms from their matching answer choice explanation;
- possible explanation-index drift after translation;
- Daily Phrase explanations missing the English idiom anchor.
- Daily Phrase source-locale copies missing `literal`, `meaning`, or `text` for any batch language.
- System flashcards missing Spanish copy, Spanish `sourceLocales` sync, or the currently locked batch category coverage.
- Irregular verb source-locale labels missing any batch language, falling back to Russian/Ukrainian, or drifting from the Spanish legacy field.

Run:

```bash
npm run heisenberg:semantic-audit
npm run heisenberg:semantic-audit:strict
```

Warnings mean "review this"; blockers mean "do not integrate until fixed".
The Markdown report also groups repeated warnings across locales into review groups, so one content issue repeated in `pt-BR`, `vi`, `id`, `tr`, and `pl` can be triaged once instead of five separate times.

Current manual triage lives in `docs/heisenberg/semantic/SEMANTIC_TRIAGE.md`. Use it to separate accepted heuristic noise from content polish tasks before editing translations.

## UI Activation Audit

`npm run heisenberg:ui-audit` checks whether planned interface languages are safe to expose in the UI language picker.

It now scans:

- app UI surfaces under `app/`, `components/`, and `constants/`;
- admin JavaScript under `admin/`;
- direct `triLang(...)` calls;
- local helper calls that still pass only `ru`, `uk`, and `es`;
- direct object literals with `ru`, `uk`, and `es` keys but no planned locale keys.
- structured `sourceLocales` maps, which count as planned-language coverage when they contain the required locale keys.

The audit is intentionally report-only: it does not fail `heisenberg:gate`, because planned languages can be prepared gradually. The important signal is `activationReady`:

- `activationReady=yes`: planned interface languages are structurally present in scanned UI/admin locale objects.
- `activationReady=no`: do not enable the planned languages in production UI yet; use `topFiles` and `findings` as the translation backlog.

Known nuance: legacy content can still be reported when the planned-language copy lives in a surface-specific sidecar that the UI audit does not know how to resolve. `sourceLocales` maps are recognized directly; other sidecars need an explicit audit rule or a documented triage decision.
