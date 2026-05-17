# Heisenberg UI Locale Audit

Generated: 2026-05-17T18:30:53.898Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1505
- Static triLang calls: 1505
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- triLang missing locale units: 0
- triLang calls missing all planned locales: 0
- Helper missing locale units: 0
- Bundle missing locale units: 10

## Finding Codes
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- components/LangContext.tsx: 5 findings, 5 missing locale units
- constants/i18n.ts: 1 findings, 5 missing locale units

## First Findings
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PT_BR | PTBR missing: pt-BR: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx VI missing: vi: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx ID missing: id: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx TR missing: tr: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PL missing: pl: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] i18n-t-bundle-missing-planned-locales constants/i18n.ts:39 T.<locale> missing: pt-BR, vi, id, tr, pl: constants/i18n.ts does not define UI string bundles for all planned interface locales.
