# Heisenberg UI Locale Audit

Generated: 2026-05-21T11:01:33.399Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 648
- triLang calls: 1650
- Static triLang calls: 1650
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- Locale object findings: 3
- triLang missing locale units: 0
- triLang calls missing all planned locales: 0
- Helper missing locale units: 0
- Locale object missing locale units: 13
- Locale objects missing all planned locales: 1
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-all-planned-locales: 1
- locale-object-missing-planned-locales: 2

## Top Files
- app/community_pack_create.tsx: 2 findings, 9 missing locale units
- app/community_packs/communityFirestore.ts: 1 findings, 4 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/community_pack_create.tsx:557 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ...row, en, ru, es: es || undefined, uk: note, sourceLocales: communitySourceLocalesWith(row.sourceLocales, plannedDraftLocale, translation), }
- [warning] locale-object-missing-planned-locales app/community_pack_create.tsx:571 missing: pt-BR, vi, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { id: `c${r.length + 1}`, en, ru, es: es || undefined, uk: note, sourceLocales: communitySourceLocalesWith(undefined, plannedDraftLocale, translation), }
- [warning] locale-object-missing-planned-locales app/community_packs/communityFirestore.ts:244 missing: pt-BR, vi, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { id: `${packId}_${id}`, en, ru, uk: ru, es: es || undefined, sourceLocales, description: descriptionNote || undefined, categoryId: 'custom', isSystem: true, source: 'lesson', sour
