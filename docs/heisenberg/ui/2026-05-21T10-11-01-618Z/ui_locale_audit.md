# Heisenberg UI Locale Audit

Generated: 2026-05-21T10:11:01.616Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 648
- triLang calls: 1650
- Static triLang calls: 1650
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- Locale object findings: 9
- triLang missing locale units: 5
- triLang calls missing all planned locales: 1
- Helper missing locale units: 0
- Locale object missing locale units: 45
- Locale objects missing all planned locales: 9
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-all-planned-locales: 9
- trilang-missing-all-planned-locales: 1

## Top Files
- app/lesson_help.tsx: 5 findings, 25 missing locale units
- app/_admin_settings_testers.tsx: 4 findings, 20 missing locale units
- app/league_engine.ts: 1 findings, 5 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/_admin_settings_testers.tsx:946 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'French не засеян English-dev фикстурами: нужны отдельные source-gated данные', uk: 'French не засіяно English-dev фікстурами: потрібні окремі source-gated дані', es: 'French
- [warning] locale-object-missing-all-planned-locales app/_admin_settings_testers.tsx:963 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'French legacy /review preview заблокирован: нужны source-gated French SRS данные', uk: 'French legacy /review preview заблоковано: потрібні source-gated French SRS дані', es
- [warning] locale-object-missing-all-planned-locales app/_admin_settings_testers.tsx:979 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: ruCopy.toast, uk: ukCopy.toast, es: ruCopy.toast, }
- [warning] locale-object-missing-all-planned-locales app/_admin_settings_testers.tsx:1736 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'French review test bench заблокирован: нет source-gated French SRS фикстур', uk: 'French review test bench заблоковано: немає source-gated French SRS фікстур', es: 'French r
- [warning] trilang-missing-all-planned-locales app/league_engine.ts:315 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: club.nameRU, uk: club.nameUK, es: club.nameES, ...plannedNames, }
- [warning] locale-object-missing-all-planned-locales app/lesson_help.tsx:468 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: theory.titleRU, uk: theory.titleUK, es: spanishBackup, }
- [warning] locale-object-missing-all-planned-locales app/lesson_help.tsx:518 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: screen.titleRU, uk: screen.titleUK ?? screen.titleRU, es: screen.titleES ?? screen.titleRU, }
- [warning] locale-object-missing-all-planned-locales app/lesson_help.tsx:537 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: screen.linesRU, uk: screen.linesUK ?? screen.linesRU, es: screen.linesES ?? screen.linesRU, }
- [warning] locale-object-missing-all-planned-locales app/lesson_help.tsx:556 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: screen.textRU ?? screen.textUK, uk: screen.textUK ?? screen.textRU, es: screen.textES ?? screen.textRU, }
- [warning] locale-object-missing-all-planned-locales app/lesson_help.tsx:586 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: example?.ru ?? example?.trRU ?? example?.uk ?? example?.trUK, uk: example?.uk ?? example?.trUK ?? example?.ru ?? example?.trRU, es: example?.es ?? example?.trES ?? example?.r
