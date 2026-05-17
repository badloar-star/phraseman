# Heisenberg runbook: pt-BR

## Command
Run again: `npm run heisenberg -- --lang pt-BR`

## Generated files
Workspace: `docs/heisenberg/pt-br/2026-05-17T18-31-48-514Z`
- `manifest.json`: machine-readable summary.
- `inventory.json`: repo file inventory and marker counts.
- `localized_items.jsonl`: extracted localizable strings and source fields (`localized_items_sample.jsonl` in audit-only runs).
- `translation_blocks/*.jsonl`: bounded translation/rewrite batches.
- `research_checklist.md`: source-based research gates.
- `guard_report.json`: overwrite/mixing safety report.
- `existing_locale_audit.md/json`: generated when the target already exists as an app locale.

## Integration gate
Do not integrate target text into app code until all translation blocks, language research notes, and tests are green. The current app has many hard-coded ru/uk/es contracts; Heisenberg keeps the new language isolated first.

## Suggested verification
- `npm run heisenberg -- --lang <locale> --audit-only`
- `npm run heisenberg:batch:audit`
- `npm run heisenberg:batch:audit:strict`
- `npm run heisenberg:gate`
- `npm run audit:translations`
- `npm run lesson:qa:summary`
- `npm test -- --runTestsByPath tests/heisenberg_pipeline.test.ts tests/locale_ru_uk_es.test.ts tests/quiz_source_locale.test.ts tests/quiz_spanish_locale.test.ts tests/daily_phrase_locale.test.ts --runInBand`
- `npx tsc --noEmit --pretty false`
