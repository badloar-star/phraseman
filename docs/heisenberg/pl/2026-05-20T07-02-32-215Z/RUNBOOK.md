# Heisenberg runbook: pl

## Command
Run again: `npm run heisenberg -- --lang pl`

## Generated files
Workspace: `docs/heisenberg/pl/2026-05-20T07-02-32-215Z`
- `manifest.json`: machine-readable summary.
- `inventory.json`: repo file inventory and marker counts.
- `localized_items.jsonl`: extracted localizable strings and source fields (`localized_items_sample.jsonl` in audit-only runs).
- `translation_blocks/*.jsonl`: bounded translation/rewrite batches.
- `agent_review_board.md`: mandatory reviewer roles, prompts, and verdict format.
- `research_checklist.md`: source-based research gates.
- `guard_report.json`: overwrite/mixing safety report.
- `existing_locale_audit.md/json`: generated when the target already exists as an app locale.

## Integration gate
Do not integrate target text into app code until all translation blocks, language research notes, and tests are green. The current app has many hard-coded ru/uk/es contracts; Heisenberg keeps the new language isolated first.

## Mandatory agent board
Before integration, run every role from `agent_review_board.md` on each translation block: Chief Editor, Grammar Pedagogy Reviewer, Runtime Integrity Reviewer, Surface Owner, and Activation Gate Reviewer. A block cannot move forward with an unresolved `BLOCKED` verdict.

## Suggested verification
- `npm run heisenberg -- --lang <locale> --audit-only`
- `npm run heisenberg:batch:audit`
- `npm run heisenberg:batch:audit:strict`
- `npm run heisenberg:gate`
- `npm run audit:translations`
- `npm run lesson:qa:summary`
- `npm test -- --runTestsByPath tests/heisenberg_pipeline.test.ts tests/locale_ru_uk_es.test.ts tests/quiz_source_locale.test.ts tests/quiz_spanish_locale.test.ts tests/daily_phrase_locale.test.ts --runInBand`
- `npx tsc --noEmit --pretty false`
