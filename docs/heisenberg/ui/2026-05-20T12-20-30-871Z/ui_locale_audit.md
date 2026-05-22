# Heisenberg UI Locale Audit

Generated: 2026-05-20T12:20:30.855Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 628
- triLang calls: 1554
- Static triLang calls: 1554
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
- app/lesson_intro_screens_fr.ts: 1 findings, 5 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens_fr.ts:28 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { labelRU: index === 0 ? 'модель' : 'пример', labelUK: index === 0 ? 'модель' : 'приклад', labelES: index === 0 ? 'modèle' : 'exemple', en: frenchParts(exampleText(example)), ru: e
