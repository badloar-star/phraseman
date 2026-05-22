# Heisenberg UI Locale Audit

Generated: 2026-05-19T17:57:44.763Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 615
- triLang calls: 1548
- Static triLang calls: 1548
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- Locale object findings: 24
- triLang missing locale units: 0
- triLang calls missing all planned locales: 0
- Helper missing locale units: 0
- Locale object missing locale units: 120
- Locale objects missing all planned locales: 24
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-all-planned-locales: 24

## Top Files
- app/diagnosis_training_adjective_comparison.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_adjective_vs_adverb.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_adverb_frequency_position.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_article_a_an.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_article_the_specific.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_article_zero.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_future_present_continuous_arrangements.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_future_will_going_to.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_imperative_basic.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_infinitive_vs_gerund_basic.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_modal_can_could_ability_request.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_modal_force.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_modal_may_might_probability.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_modal_should_must_have_to.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_noun_singular_plural_basic.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_object_order_give_me_it.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_phrasal_particle_pair.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_preposition_common_verb_patterns.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_preposition_direction_to_into_from.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_preposition_duration_for_since.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_preposition_place_in_on_at.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_preposition_time_in_on_at.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_preposition_time_place.ts: 1 findings, 5 missing locale units
- app/diagnosis_training_word_order_basic_question.ts: 1 findings, 5 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_adjective_comparison.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_adjective_vs_adverb.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_adverb_frequency_position.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_article_a_an.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_article_the_specific.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_article_zero.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_future_present_continuous_arrangements.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_future_will_going_to.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_imperative_basic.ts:13 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_infinitive_vs_gerund_basic.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_modal_can_could_ability_request.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_modal_force.ts:13 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_modal_may_might_probability.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_modal_should_must_have_to.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_noun_singular_plural_basic.ts:13 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_object_order_give_me_it.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_phrasal_particle_pair.ts:13 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_preposition_common_verb_patterns.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_preposition_direction_to_into_from.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_preposition_duration_for_since.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_preposition_place_in_on_at.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_preposition_time_in_on_at.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_preposition_time_place.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] locale-object-missing-all-planned-locales app/diagnosis_training_word_order_basic_question.ts:14 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru, uk, es }
