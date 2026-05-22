# Heisenberg UI Locale Audit

Generated: 2026-05-21T15:50:32.781Z
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
- Locale object missing locale units: 4
- Locale objects missing all planned locales: 0
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-planned-locales: 1

## Top Files
- app/flashcards_collection.tsx: 1 findings, 4 missing locale units

## First Findings
- [warning] locale-object-missing-planned-locales app/flashcards_collection.tsx:1234 missing: pt-BR, vi, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { id: editingId ?? `custom_${Date.now()}`, en: draftEN.trim(), ru: localizedFields.baseRu, uk: localizedFields.baseUk, es: localizedFields.baseEs, sourceLocales: localizedFields.pl
