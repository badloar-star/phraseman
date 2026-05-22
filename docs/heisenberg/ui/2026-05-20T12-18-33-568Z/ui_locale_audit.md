# Heisenberg UI Locale Audit

Generated: 2026-05-20T12:18:33.566Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 628
- triLang calls: 1552
- Static triLang calls: 1550
- Dynamic triLang calls: 2
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
- dynamic-trilang-copy: 2

## Top Files
- app/lesson_intro_screens_fr.ts: 1 findings, 5 missing locale units
- components/PremiumCelebrationModal.tsx: 2 findings, 0 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens_fr.ts:28 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { labelRU: index === 0 ? 'модель' : 'пример', labelUK: index === 0 ? 'модель' : 'приклад', labelES: index === 0 ? 'modèle' : 'exemple', en: frenchParts(exampleText(example)), ru: e
- [warning] dynamic-trilang-copy components/PremiumCelebrationModal.tsx:418: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, palette.title as any)
- [warning] dynamic-trilang-copy components/PremiumCelebrationModal.tsx:421: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, palette.subtitle as any)
