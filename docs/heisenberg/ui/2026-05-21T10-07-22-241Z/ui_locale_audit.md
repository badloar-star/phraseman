# Heisenberg UI Locale Audit

Generated: 2026-05-21T10:07:22.174Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 648
- triLang calls: 1650
- Static triLang calls: 1650
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- Locale object findings: 19
- triLang missing locale units: 5
- triLang calls missing all planned locales: 1
- Helper missing locale units: 0
- Locale object missing locale units: 95
- Locale objects missing all planned locales: 19
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-all-planned-locales: 19
- trilang-missing-all-planned-locales: 1

## Top Files
- app/lesson_intro_screens.tsx: 8 findings, 40 missing locale units
- app/lesson_help.tsx: 5 findings, 25 missing locale units
- app/_admin_settings_testers.tsx: 4 findings, 20 missing locale units
- components/ReportErrorButton.tsx: 2 findings, 10 missing locale units
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
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens.tsx:122 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: ex.trRU, uk: ex.trUK, es: ex.trES }
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens.tsx:145 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: screen.linesRU, uk: screen.linesUK, es: screen.linesES }
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens.tsx:159 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: screen.subtitleRU, uk: screen.subtitleUK, es: screen.subtitleES }
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens.tsx:172 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: screen.titleRU, uk: screen.titleUK, es: screen.titleES }
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens.tsx:185 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: screen.textRU, uk: screen.textUK, es: screen.textES }
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens.tsx:231 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: value.ru, uk: value.uk, es: value.es }
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens.tsx:251 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: ex[`${base}RU`], uk: ex[`${base}UK`], es: ex[`${base}ES`], }
- [warning] locale-object-missing-all-planned-locales app/lesson_intro_screens.tsx:618 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: km.defaultTitleRU, uk: km.defaultTitleUK, es: km.defaultTitleES, }
- [warning] locale-object-missing-all-planned-locales components/ReportErrorButton.tsx:56 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Другое', uk: 'Інше', es: 'Otro', }
- [warning] locale-object-missing-all-planned-locales components/ReportErrorButton.tsx:305 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: ruCopy || REPORT_CATEGORY_OTHER_LABEL.ru, uk: ukCopy || REPORT_CATEGORY_OTHER_LABEL.uk, es: esCopy || REPORT_CATEGORY_OTHER_LABEL.es, }
