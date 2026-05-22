# Heisenberg UI Locale Audit

Generated: 2026-05-21T15:49:09.300Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 655
- triLang calls: 1688
- Static triLang calls: 1688
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
- app/flashcards_collection.tsx: 1 findings, 5 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/flashcards_collection.tsx:223 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, sourceLocales }
