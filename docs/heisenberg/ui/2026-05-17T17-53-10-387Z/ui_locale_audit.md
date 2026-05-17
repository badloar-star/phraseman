# Heisenberg UI Locale Audit

Generated: 2026-05-17T17:53:10.386Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1511
- Static triLang calls: 1509
- Dynamic triLang calls: 2
- Legacy L(lang, ru, uk, es) helper calls: 0
- triLang missing locale units: 20
- triLang calls missing all planned locales: 4
- Helper missing locale units: 0
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 4
- dynamic-trilang-copy: 2
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/diagnostic_test.tsx: 2 findings, 10 missing locale units
- components/LangContext.tsx: 5 findings, 5 missing locale units
- app/lesson_help.tsx: 1 findings, 5 missing locale units
- app/premium_modal.tsx: 1 findings, 5 missing locale units
- constants/i18n.ts: 1 findings, 5 missing locale units
- components/DeleteAccountConfirmModal.tsx: 1 findings, 0 missing locale units
- components/ReleaseNotesModal.tsx: 1 findings, 0 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1141 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1290 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19384 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: theory.titleUK, ru: theory.titleRU, es: theoryTitleEs }
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:943 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] dynamic-trilang-copy components/DeleteAccountConfirmModal.tsx:37: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, copy)
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PT_BR | PTBR missing: pt-BR: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx VI missing: vi: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx ID missing: id: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx TR missing: tr: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PL missing: pl: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] dynamic-trilang-copy components/ReleaseNotesModal.tsx:137: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, TEXT.body)
- [warning] i18n-t-bundle-missing-planned-locales constants/i18n.ts:37 T.<locale> missing: pt-BR, vi, id, tr, pl: constants/i18n.ts does not define UI string bundles for all planned interface locales.
