# Heisenberg UI Locale Audit

Generated: 2026-05-21T16:13:31.440Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 655
- triLang calls: 1689
- Static triLang calls: 1689
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- Locale object findings: 2
- triLang missing locale units: 0
- triLang calls missing all planned locales: 0
- Helper missing locale units: 0
- Locale object missing locale units: 10
- Locale objects missing all planned locales: 2
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-all-planned-locales: 2

## Top Files
- app/achievements.ts: 2 findings, 10 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/achievements.ts:67 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: (achievement) => achievement.nameRu, uk: (achievement) => achievement.nameUk, es: (achievement) => achievement.nameEs ?? ACHIEVEMENT_ES[achievement.id]?.nameEs, }
- [warning] locale-object-missing-all-planned-locales app/achievements.ts:73 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: (achievement) => achievement.descRu, uk: (achievement) => achievement.descUk, es: (achievement) => achievement.descEs ?? ACHIEVEMENT_ES[achievement.id]?.descEs, }
