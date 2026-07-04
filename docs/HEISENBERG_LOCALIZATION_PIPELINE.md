# Heisenberg Localization Pipeline

Heisenberg is the repo-level pipeline for adding a new source language for users who learn English from their own language.

It does not write a new language directly into existing `ru` / `uk` / `es` fields. The first stage is always isolated: inventory, research checklist, guard report, and translation blocks under `docs/heisenberg/<locale>/<run-id>/`.

## Final Production Goal

Heisenberg's final goal is not "some translations exist". Its final goal is a
fully production-ready source/interface language for `studyTarget=en`.

For every Heisenberg language, for example `es`, `pt-BR`, `vi`, `id`, `tr`,
`pl` or a future source locale, Heisenberg may say `ready` only when that
language is complete end-to-end:

- all user-facing UI/source-locale copy in scope is present and natural;
- English-learning explanations are rewritten for that source-language learner,
  not mechanically translated;
- lessons, quizzes, personal plan content, daily phrase, practice, flashcards,
  admin/reviewer surfaces and relevant AI prompt outputs have source-locale
  coverage;
- all future large language payloads are isolated source-locale pack candidates,
  not new app-bundled growth;
- pack manifests, hashes, byte sizes, schema/content versions, review status,
  semantic gates and provenance/evidence are valid;
- server/downloadable delivery is ready only after runtime loaders, cache states,
  offline fallback and no-splash-download rules pass;
- storage, cloud sync, cache keys, prompts and admin tools cannot mix this source
  locale with another source locale or with `studyTarget`;
- every required reviewer/gate/test returns `GO` or `PASS`;
- activation is explicitly approved and recorded.

`ready` is forbidden while any content is fallback, copied from another language,
wrong-language, unreviewed, app-bundled by default, or able to leak across
source locales. Heisenberg must never convert a source locale into a study
target; `sourceLocale=pl, studyTarget=en` means Polish explanations for learning
English, not a Polish course.

## 2026-06-26 Downloadable Pack Retrofit Rule

Before any new Heisenberg language work or continuation of batch locale work,
Heisenberg must read and obey:

- `docs/specs/2026-06-26-bootstrap-course-pack-master-audit.md`;
- `docs/specs/2026-06-26-language-pack-retrofit-plan.md`.

New large source-locale content must not be added directly to the initial app
bundle as the default path. Future Heisenberg output must first be an isolated
source-locale pack candidate with:

- `sourceLocale`;
- `studyTarget=en`;
- surface id;
- schema/content version;
- item counts;
- hash/byte size;
- provenance/research evidence;
- semantic gate status;
- review status;
- explicit no-fallback/no-copy verdict.

Existing app-bundled batch work is legacy compatibility input, not automatic
proof of app readiness. It must be re-audited and classified as one of:

- reusable pack candidate;
- repair-needed isolated packet;
- blocked from activation.

Heisenberg must never treat `sourceLocale` as `studyTarget`. For example,
`sourceLocale=pl` means Polish explanations for learning English, not a Polish
course.

## 2026-06-27 Course-Pack Gate Snapshot

The current plan-content server copy is staging/shadow only. It has passed
remote verification, server-shadow dual-read, disabled manifest/runtime/cache,
offline, rollback, storage/cloud isolation and reviewer/locale intake safety
reports, but production activation is still `HOLD`.

Current activation-readiness state:

- completed gates: `11`;
- blocked gates: `3`;
- remaining blockers: reviewer approval `0/546`, locale gates `0/546`, and
  product-owner activation approval;
- `COURSE_PACK_REMOTE_LOADING_ENABLED=false`;
- `activationApproved=false`;
- bundled `plan_content_*` payloads remain in the app.

Heisenberg must not infer reviewer or locale approval from translation
coverage, parity success, server upload success or dual-read success. The
report-only explicit reviewer/locale approval packet now exists at
`.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-packet.json`
with `546` queued rows, reviewer approved rows `0/546`, locale passed rows
`0/546` and filled artifact validation `missing`. The explicit approval intake
dry-run exists at
`.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-approval-intake-dry-run.json`
and is `HOLD` only because no external filled artifact exists. The next approved
process step is based on the reviewer/locale decision work-order at
`.codex-tmp/plan-content/staging-upload-20260627/reviewer-locale-decision-work-order-batches.json`.
That work-order is `PASS`/`READY_FOR_REVIEW` with `546` rows and `22` batches,
but reviewer approved rows and locale passed rows remain `0/546`. The next
pipeline step must validate externally filled batches; it must not generate
approvals, fake evidence ids or clear activation by itself.

## Mandatory Iteration Escalation Rule

Every Heisenberg continuation pass must leave the pipeline in a stronger state
than it found it, within the currently approved scope.

Each pass must:

- read the latest handoff, previous verdicts and relevant run artifacts before
  acting;
- name the exact scope for the pass before editing or generating;
- increase useful coverage compared with the previous pass by doing at least one
  real expansion: more surfaces audited, more blocks classified, more language
  tails mapped, more focused tests/checks added or run, more blockers resolved,
  or more pack metadata/evidence completed;
- treat "more work" as more verified progress, not wider unsafe edits;
- never increase volume by touching unrelated app code, bypassing gates, adding
  unapproved production content, or weakening language isolation;
- record completed work, commands/checks, blockers and residual risk in the run
  artifact or handoff;
- end with a `Next Pass Plan` that lists the next objective, exact files or
  artifacts to inspect, expected checks, and the stop conditions.

If no safe expansion is possible, the pass must produce blocker evidence and a
smallest-safe unblock plan instead of repeating the same verdict.

## Command

```bash
npm run heisenberg -- --lang fr
npm run heisenberg -- fr-FR
npm run heisenberg -- --lang de --audit-only
npm run heisenberg:batch:audit
npm run heisenberg:gate
npm run heisenberg:semantic-audit
npm run heisenberg:prompt-language-audit
npm run heisenberg:raw-strings
npm run heisenberg:translate -- --blocks docs/heisenberg/<locale>/<run-id>/translation_blocks --locale <locale>
```

## Locale Registry (single source of truth)

All locale lists, localized key markers, field-marker regexes, locale variable
names, and semantic language signals are derived from
`scripts/lib/heisenberg_locales.cjs`. Adding a new interface/source language
must be ONE entry in `LOCALE_REGISTRY` (code, English name, key word, status
flags, language signal words/diacritics). Do not hardcode locale lists in
pipeline scripts; require the registry instead.
`tests/heisenberg_locale_registry.test.ts` locks the derived structures.

## Prompt Language Contract Audit

`npm run heisenberg:prompt-language-audit` (read-only) verifies that every
active app locale is wired into the AI output-language contract and the
server-side user-facing copy maps: `functions/src/explain/explain_prompts.ts`
(`PROMPT_LANGUAGES`), `functions/src/ai_language_contract.ts`
(`AiOutputLang`), and locale Records in `re_engage_push.ts`,
`premium_expiry_reminder.ts`, `compass_chat_content.ts`. A missing locale in
any of these maps means users of that locale silently fall back to Russian —
this audit turns that silent fallback into an explicit `HOLD`. Run it (strict)
whenever a locale is added to the registry.

## Raw String Audit

`npm run heisenberg:raw-strings` (read-only) inverts the extractor logic: any
user-visible string literal in `app/` or `components/` that is NOT behind a
locale key or `triLang(...)`-style call is a finding. Cyrillic literals are
`blocker-candidate` (hardcoded Russian that every non-Russian user sees);
Latin sentence literals are warnings. This catches the class of bug the
locale-key extractor is structurally blind to (e.g. hardcoded RU buttons in
`components/CleanOnboarding.tsx`). Findings are the localization backlog for
those files; triage acceptable dev-only strings into the script allowlist.

## Translation Factory

`npm run heisenberg:translate` fills `translation_blocks/*.jsonl` with
machine-translation candidates through a fail-closed verification chain:

1. translate (structured LLM output, hard no-invention rules);
2. independent back-translation (source text hidden);
3. three-lens LLM judge (accuracy / naturalness / integrity), strict HOLD bias;
4. deterministic local checks: mojibake, placeholder parity, protected quoted
   English preserved, target-language signal, no Cyrillic leakage.

A row is `GO` only when every layer agrees; otherwise it is `HOLD` with
explicit reasons. Output rows carry `machineGenerated=true` and permanently
`reviewerImportAllowed=false`, `productionApplyAllowed=false`,
`activationApproved=false`: the factory produces content candidates for the
existing external review flow and can never approve or apply anything itself.
Default mode is a dry-run cost plan; live spend requires `--execute`,
`--limit` (max 100 rows per launch) and `PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1`
per the repo OpenAI dev-spend guard.

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

As of the 2026-06-26 retrofit plan, the deliberate integration path is:

1. audit existing surfaces;
2. produce isolated source-locale pack candidates;
3. validate manifests, hashes, coverage, semantic isolation and bundle boundary;
4. integrate runtime loaders only after the app has course-pack manifest/cache
   architecture;
5. apply to production files only with explicit approval and focused gates.

Directly expanding huge `app/` TypeScript payloads for future locales is a legacy
path and should be treated as `HOLD` unless explicitly approved for a narrow
compatibility shim.

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

For downloadable source-locale packs, the following additional gates are
mandatory before activation:

- pack manifest schema validates;
- content hash, byte size and item counts match;
- the pack declares `sourceLocale` and `studyTarget=en`;
- no runtime resolver silently falls back to Russian, Ukrainian, Spanish or any
  other source locale;
- no non-trivial localized field is copied from another source locale unless it
  is explicitly allowlisted as a valid shared proper noun/anchor;
- adding the pack does not add large content modules to the initial app bundle;
- runtime loader states exist for missing, downloading, ready, corrupt, stale and
  offline fallback.

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
