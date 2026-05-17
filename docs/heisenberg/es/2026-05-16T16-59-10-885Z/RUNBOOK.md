# Heisenberg runbook: es

## Command
Run again: `npm run heisenberg -- --lang es`

## Generated files
Workspace: `docs/heisenberg/es/2026-05-16T16-59-10-885Z`
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
- `npm run audit:translations`
- `npm run lesson:qa:summary`
- `npm test -- --runTestsByPath tests/heisenberg_pipeline.test.ts tests/locale_ru_uk_es.test.ts tests/lesson_intro_screens_locale.test.ts --runInBand`
