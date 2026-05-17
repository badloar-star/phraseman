# Heisenberg Pipeline Audit

Date: 2026-05-17

## Scope

Audited:

- `scripts/heisenberg_pipeline.cjs`
- `scripts/lib/heisenberg_core.cjs`
- `scripts/heisenberg_semantic_audit.ts`
- `scripts/lib/heisenberg_semantic_core.cjs`
- `app/source_locales.ts`
- `app/quiz_source_locale_payloads.ts`
- `app/idioms_data.ts`
- `admin/daily_phrases_seed.json`
- Heisenberg tests and latest generated reports.

## Summary

Heisenberg is now useful as a localization safety pipeline, but it is still stronger at detecting partial coverage than at proving full coverage. The main next upgrade should be a source-of-truth coverage contract: for every supported surface, Heisenberg should know the expected unit IDs and fail when a unit is missing in every new locale, not only when one locale is missing from an already-started unit.

Latest observed checks:

- `npm run heisenberg:batch:audit`: fails as intended with `missingAllLocaleUnits: 528` for Daily Phrase batch `sourceLocales`.
- `npm run heisenberg:batch:audit:strict`: fails as intended because Spanish existing-locale audit still has 3 blockers.
- `npm run heisenberg:semantic-audit:strict`: fails as intended with `880` Daily Phrase missing-copy blockers for `pt-BR`, `vi`, `id`, `tr`, and `pl`.
- `npx tsc --noEmit --pretty false`: passed in the latest verification after semantic changes.

## Findings

### 1. Strict batch audit does not fail on existing-locale blockers

Severity: High

Status: Fixed. `--existing-locale-strict`, `heisenberg:batch:audit:strict`, and `heisenberg:gate` now turn existing-locale blockers into a non-zero exit.

`npm run heisenberg:batch:audit` completed successfully even though the Spanish child run printed `existing-locale blockers: 3`.

Evidence:

- `scripts/heisenberg_pipeline.cjs` logs existing-locale blockers but does not turn them into a non-zero exit.
- Latest batch manifest marks the Spanish run as `ok: true` while its stdout includes `existing-locale blockers: 3`.

Risk:

The command name reads like a gate, but it can pass while Spanish production-audit blockers remain unresolved. This can create a false green signal before enabling the interface language.

Recommended fix:

Add a strict mode for existing-locale blockers:

- `--existing-locale-strict`, or
- make `--coverage-strict` fail when `existingLocaleAudit.blockers.length > 0`, or
- add a separate `heisenberg:gate` command that combines batch coverage, existing-locale blockers, semantic strict, and selected tests.

### 2. Coverage audit cannot detect a unit missing from all batch locales

Severity: High

Status: Partially fixed. Structured quiz payloads and Daily Phrase now have expected-unit contracts and report `missingAllLocaleUnits`. Other surfaces still need contracts.

`buildBatchLocaleCoverageAudit` groups only items that already exist in at least one required locale. If a new Daily Phrase, quiz range, lesson intro, or training block is not added to any of `pt-BR`, `vi`, `id`, `tr`, `pl`, the partial-coverage audit has no group to compare and cannot flag it.

Risk:

Heisenberg can prove "languages are not uneven inside started structured units", but it cannot yet prove "all expected units have been started". This matters for future batches such as Daily Phrase `187-196` or a new quiz range.

Recommended fix:

Add per-surface expected unit contracts:

- Daily Phrase expected IDs from `IDIOMS` / seed;
- Quiz expected ranges from `QUIZ_SOURCE_LOCALE_PAYLOADS` plus explicit declared ranges;
- Personal training IDs from taxonomy;
- lesson sections/intros from lesson registries.

Then report:

- `missingAllLocalesUnits`;
- `partialUnits`;
- `completeUnits`;
- `coverageBySurface`.

### 3. Semantic audit skips fully missing Daily Phrase locale copy

Severity: High

Status: Fixed. Missing or incomplete Daily Phrase source-locale copy now emits `daily-phrase-locale-copy-missing` blockers.

`auditDailyPhrase` currently continues when a locale copy is missing or incomplete. That avoids noise, but it means semantic strict cannot catch missing `sourceLocales.pt-BR/vi/id/tr/pl` for Daily Phrase at all.

Risk:

Daily Phrase can look semantically clean because the audit only checks records that already have localized copy.

Recommended fix:

Give semantic audit a declared expected Daily Phrase range per locale, then emit blockers for missing copy in strict mode. Keep "future planned languages" configurable so planned-but-not-started locales do not block until enabled.

### 4. Semantic audit skips fully missing structured quiz payload ordinals

Severity: Medium-High

`auditStructuredQuizPayloads` iterates over ordinals present in `QUIZ_SOURCE_LOCALE_PAYLOADS`. If a whole ordinal is absent, semantic audit does not know it should exist.

Risk:

The separate quiz tests currently hard-code `medium 111-231` and `hard 1-100`, so today those ranges are protected. But the semantic pipeline itself cannot enforce the next range unless tests are manually expanded.

Recommended fix:

Move expected quiz ranges into a shared source-of-truth, then make both tests and semantic audit consume it.

### 5. Admin/public/legal HTML is scanned but not extracted into translation units

Severity: Medium-High

`admin/index.html` has many localization markers and Cyrillic text, but inventory reports `localizedItems: 0` because extraction only handles JSON and code files. Raw HTML files are scanned for markers, but their text is not turned into translation block rows.

Risk:

The user explicitly expects admin/index/site sections to be part of Heisenberg. Today HTML pages can be invisible to the actual translation block workflow.

Recommended fix:

Add HTML extraction for:

- visible text nodes;
- `title`, `placeholder`, `aria-label`, `alt`, selected `data-*` copy attributes;
- inline script locale dictionaries when present.

Mark extracted HTML rows as `sourceKind: html-text` or `html-attribute`.

### 6. Daily Phrase tests still focus on Spanish ES fields, not all batch locales

Severity: Medium

Status: Partially fixed. The batch coverage gate now enforces Daily Phrase `sourceLocales` coverage for `pt-BR`, `vi`, `id`, `tr`, and `pl`. The dedicated Daily Phrase Jest test still needs expansion if we want a smaller focused failure outside the Heisenberg gate.

`tests/daily_phrase_locale.test.ts` verifies Spanish fields for IDs `11-186` and only has a small helper test for future `sourceLocales`. It does not require `pt-BR`, `vi`, `id`, `tr`, `pl` Daily Phrase copy.

Risk:

The app architecture is ready to hold future Daily Phrase languages, but the gate does not yet enforce those languages for real Daily Phrase content.

Recommended fix:

Add a batch Daily Phrase coverage contract:

- exact ID range per batch;
- all required locales;
- seed/runtime sync;
- no Cyrillic in non-Cyrillic locales;
- no Spanish/Portuguese/etc. leaking into `literal`, `meaning`, `text`, or `*_uk`.

### 7. Batch mode scans the repo once per locale

Severity: Medium

Batch mode spawns six child runs, and each child scans the whole repo. The latest audit scanned `1629` files six times.

Risk:

This is fine now, but it will get slow as the repo and language count grow.

Recommended fix:

Add a one-pass batch mode:

- scan inventory once;
- build guard/audit outputs per locale from the shared inventory;
- write one aggregate batch coverage report;
- optionally run child integration steps only when needed.

### 8. There is no single "green gate" command

Severity: Medium

Right now the safety story is split across:

- `heisenberg:batch:audit`;
- `heisenberg:semantic-audit:strict`;
- Jest subsets;
- `tsc`;
- manual triage.

Risk:

It is easy to run the coverage audit and think the whole pipeline is green.

Recommended fix:

Add:

```bash
npm run heisenberg:gate
```

It should run:

- batch audit with strict coverage;
- existing-locale blocker enforcement;
- semantic strict;
- Daily Phrase / Quiz locale tests;
- `tsc`.

### 9. Research gate is documented but not machine-enforced

Severity: Medium

The run generates `research_checklist.md`, but Heisenberg does not track whether research sources were actually checked, cited, or attached to a language report.

Risk:

The process can drift into "translation generation first, research later", especially when adding many languages at once.

Recommended fix:

Introduce per-locale research manifests:

- locale metadata;
- plural categories;
- cited grammar sources;
- learner-error map;
- reviewer notes;
- `researchStatus: pending | complete`.

Block integration when research is incomplete.

### 10. The public command/API is split between current and older names

Severity: Low

The current executable is `scripts/heisenberg_pipeline.cjs`, while earlier plans referenced `scripts/heisenberg/run_heisenberg_pipeline.mjs`.

Risk:

When moving to Mac, it is easy to run an outdated command from notes.

Recommended fix:

Add a tiny compatibility wrapper at `scripts/heisenberg/run_heisenberg_pipeline.mjs`, or update every old plan/runbook reference to the current command.

## Recommended Next Build Order

1. Make strict batch fail on existing-locale blockers.
2. Add source-of-truth expected unit contracts.
3. Add missing-all-locales coverage.
4. Add Daily Phrase batch coverage for `pt-BR`, `vi`, `id`, `tr`, `pl`.
5. Add HTML extraction for admin/public/legal pages.
6. Add `npm run heisenberg:gate`.
7. Move research from checklist-only to machine-readable per-locale manifest.
