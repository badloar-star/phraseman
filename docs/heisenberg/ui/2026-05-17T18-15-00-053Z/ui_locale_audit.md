# Heisenberg UI Locale Audit

Generated: 2026-05-17T18:15:00.052Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 579
- triLang calls: 1506
- Static triLang calls: 1506
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 10
- triLang missing locale units: 5
- triLang calls missing all planned locales: 1
- Helper missing locale units: 50
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 1
- local-trilang-helper-missing-planned-locales: 10
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/premium_modal.tsx: 11 findings, 55 missing locale units
- components/LangContext.tsx: 5 findings, 5 missing locale units
- constants/i18n.ts: 1 findings, 5 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:951 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:1638 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(item.textRu, item.textUk, item.textEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2027 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.ru, row.uk, row.es)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2459 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(tag.ru, tag.uk, tag.es)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2497 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(hero.titleRu, hero.titleUk, hero.titleEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2500 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(hero.subtitleRu, hero.subtitleUk, hero.subtitleEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2538 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(b.ru, b.uk, b.es)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2591 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.freeRu, row.freeUk, row.freeEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2592 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.titleRu, row.titleUk, row.titleEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2593 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.premRu, row.premUk, row.premEs)
- [warning] local-trilang-helper-missing-planned-locales app/premium_modal.tsx:2595 missing: pt-BR, vi, id, tr, pl: Local helper L(ru, uk, es) returns triLang without planned interface locales. | L(row.premRu2!, row.premUk2!, row.premEs2!)
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PT_BR | PTBR missing: pt-BR: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx VI missing: vi: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx ID missing: id: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx TR missing: tr: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PL missing: pl: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] i18n-t-bundle-missing-planned-locales constants/i18n.ts:37 T.<locale> missing: pt-BR, vi, id, tr, pl: constants/i18n.ts does not define UI string bundles for all planned interface locales.
