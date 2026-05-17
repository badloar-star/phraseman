# Heisenberg UI Locale Audit

Generated: 2026-05-17T16:39:32.039Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1510
- Static triLang calls: 1508
- Dynamic triLang calls: 2
- triLang missing locale units: 65
- triLang calls missing all planned locales: 13
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 13
- dynamic-trilang-copy: 2
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/(tabs)/friends.tsx: 4 findings, 20 missing locale units
- app/diagnostic_test.tsx: 2 findings, 10 missing locale units
- components/AchievementToast.tsx: 2 findings, 10 missing locale units
- components/LangContext.tsx: 5 findings, 5 missing locale units
- app/exam.tsx: 1 findings, 5 missing locale units
- app/hint.tsx: 1 findings, 5 missing locale units
- app/lesson_help.tsx: 1 findings, 5 missing locale units
- app/premium_modal.tsx: 1 findings, 5 missing locale units
- app/preposition_drill.tsx: 1 findings, 5 missing locale units
- constants/i18n.ts: 1 findings, 5 missing locale units
- components/DeleteAccountConfirmModal.tsx: 1 findings, 0 missing locale units
- components/ReleaseNotesModal.tsx: 1 findings, 0 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:859 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:945 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1138 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1239 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1141 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1290 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/exam.tsx:363 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/hint.tsx:1155 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: hint.titleRU, uk: hint.titleUK, es: hint.titleES }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19384 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: theory.titleUK, ru: theory.titleRU, es: theoryTitleEs }
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:943 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:494 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: item.explainUK, ru: item.explainRU, es: item.explainES ?? item.explainRU, }
- [warning] trilang-missing-all-planned-locales components/AchievementToast.tsx:200 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: displayedToast.nameUk, ru: displayedToast.nameRu, es: displayedToast.nameEs ?? displayedToast.nameRu, }
- [warning] trilang-missing-all-planned-locales components/AchievementToast.tsx:205 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: displayedToast.descUk, ru: displayedToast.descRu, es: displayedToast.descEs ?? displayedToast.descRu, }
- [warning] dynamic-trilang-copy components/DeleteAccountConfirmModal.tsx:37: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, copy)
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PT_BR | PTBR missing: pt-BR: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx VI missing: vi: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx ID missing: id: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx TR missing: tr: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PL missing: pl: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] dynamic-trilang-copy components/ReleaseNotesModal.tsx:137: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, TEXT.body)
- [warning] i18n-t-bundle-missing-planned-locales constants/i18n.ts:37 T.<locale> missing: pt-BR, vi, id, tr, pl: constants/i18n.ts does not define UI string bundles for all planned interface locales.
