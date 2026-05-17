# Heisenberg UI Locale Audit

Generated: 2026-05-17T18:25:01.898Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1506
- Static triLang calls: 1506
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 4
- triLang missing locale units: 5
- triLang calls missing all planned locales: 1
- Helper missing locale units: 20
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 1
- local-trilang-helper-missing-planned-locales: 4
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/premium_modal.tsx: 5 findings, 25 missing locale units
- components/LangContext.tsx: 5 findings, 5 missing locale units
- constants/i18n.ts: 1 findings, 5 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:1023 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2531 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(tag.ru, tag.uk, tag.es)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2569 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(hero.titleRu, hero.titleUk, hero.titleEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2572 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(hero.subtitleRu, hero.subtitleUk, hero.subtitleEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2610 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(b.ru, b.uk, b.es)
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PT_BR | PTBR missing: pt-BR: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx VI missing: vi: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx ID missing: id: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx TR missing: tr: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PL missing: pl: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] i18n-t-bundle-missing-planned-locales constants/i18n.ts:39 T.<locale> missing: pt-BR, vi, id, tr, pl: constants/i18n.ts does not define UI string bundles for all planned interface locales.
