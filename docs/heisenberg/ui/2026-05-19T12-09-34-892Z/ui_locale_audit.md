# Heisenberg UI Locale Audit

Generated: 2026-05-19T12:09:34.891Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 615
- triLang calls: 1548
- Static triLang calls: 1548
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- Locale object findings: 1
- triLang missing locale units: 0
- triLang calls missing all planned locales: 0
- Helper missing locale units: 0
- Locale object missing locale units: 5
- Locale objects missing all planned locales: 1
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-all-planned-locales: 1

## Top Files
- app/quiz_data.ts: 1 findings, 5 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25207 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ordinal: index + 1, ru: entry.ru, uk: entry.uk, es: entry.es, choices: [...entry.choices], correct: Array.isArray(entry.correct) ? [...entry.correct] : entry.correct, explanation
