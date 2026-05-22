# Heisenberg UI Locale Audit

Generated: 2026-05-20T07:05:24.140Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 617
- triLang calls: 1551
- Static triLang calls: 1551
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- Locale object findings: 13
- triLang missing locale units: 0
- triLang calls missing all planned locales: 0
- Helper missing locale units: 0
- Locale object missing locale units: 65
- Locale objects missing all planned locales: 13
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-all-planned-locales: 13

## Top Files
- app/diagnosis_training_conjunction_logic.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_determiner_this_that_these_those.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_modal_base_form.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_pronoun_case.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_pronoun_possessive.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_quantifier_some_any.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_there_is_are.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_to_be_present_agreement.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_verb_present_continuous_basic.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_verb_present_simple_negative_question.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_verb_present_simple_statement.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_verb_present_simple_vs_continuous.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_verb_third_person.ts: 1 findings, 5 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_conjunction_logic.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_determiner_this_that_these_those.ts:13 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_modal_base_form.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_pronoun_case.ts:15 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_pronoun_possessive.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_quantifier_some_any.ts:15 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_there_is_are.ts:13 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_to_be_present_agreement.ts:15 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_verb_present_continuous_basic.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_verb_present_simple_negative_question.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_verb_present_simple_statement.ts:13 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_verb_present_simple_vs_continuous.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_verb_third_person.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es, ...PLANNED_LOCALE_FALLBACK, }
