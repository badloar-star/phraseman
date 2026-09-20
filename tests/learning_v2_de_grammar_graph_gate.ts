import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1,
  type GermanResearchEvidenceStatusDeV1,
} from "../modules/learning-v2/curriculum/de/research_evidence_bindings_de_v1";

type GrammarConstruct = Readonly<{
  id: string;
  form: string;
  function: string;
  scope: Readonly<{ receptive: boolean; productive: boolean }>;
  exclusions: readonly string[];
  prerequisiteIds: readonly string[];
  firstIntroductionPacketId: string;
  guidedTargetPacketIds: readonly string[];
  retrievalTargetPacketIds: readonly string[];
  productionTargetPacketIds: readonly string[];
  transferTargetPacketIds: readonly string[];
  delayedTargetPacketIds: readonly string[];
  evidenceStatus: GermanResearchEvidenceStatusDeV1 | "PEDAGOGICAL_INFERENCE";
  evidenceIds: readonly string[];
}>;

type PrerequisiteEdge = Readonly<{
  id: string;
  prerequisiteId: string;
  dependentId: string;
  evidenceIds: readonly string[];
}>;

const ROOT = "de_gc_pre_a1_formulaic_chunks_v1";
const CONSTRUCT_PATH = resolve(
  process.cwd(),
  "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json",
);
const GRAPH_PATH = resolve(
  process.cwd(),
  "modules/learning-v2/curriculum/de/graphs/prerequisite_dag_de_v1.json",
);

const CONSTRUCT_KEYS = [
  "id",
  "form",
  "function",
  "scope",
  "exclusions",
  "prerequisiteIds",
  "firstIntroductionPacketId",
  "guidedTargetPacketIds",
  "retrievalTargetPacketIds",
  "productionTargetPacketIds",
  "transferTargetPacketIds",
  "delayedTargetPacketIds",
  "evidenceStatus",
  "evidenceIds",
] as const;
const EDGE_KEYS = ["id", "prerequisiteId", "dependentId", "evidenceIds"] as const;
const TARGET_KEYS = [
  "guidedTargetPacketIds",
  "retrievalTargetPacketIds",
  "productionTargetPacketIds",
  "transferTargetPacketIds",
  "delayedTargetPacketIds",
] as const;
const SESSION_ID = /^de_l(\d{2})_c(\d{2})_s(\d{2})$/u;
const CONSTRUCT_ID = /^de_gc_[a-z0-9]+(?:_[a-z0-9]+)*_v1$/u;
const EDGE_ID = /^de_edge_gc_[a-z0-9]+(?:_[a-z0-9]+)*_v1$/u;

const evidenceStatusById = new Map<string, GermanResearchEvidenceStatusDeV1>(
  GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1.map((binding) => [binding.id, binding.status]),
);
const evidenceLimitationById = new Map<string, string>(
  GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1.map((binding) => [binding.id, binding.limitation]),
);
const MANDATED_BRANCHES = Object.freeze({
  formulaicPersonalFinite: [
    "de_gc_pre_a1_formulaic_chunks_v1",
    "de_gc_personal_reference_v1",
    "de_gc_finite_present_agreement_v1",
  ],
  v2VerberstW: [
    "de_gc_statement_v2_v1",
    "de_gc_yes_no_verberst_v1",
    "de_gc_w_element_v2_v1",
  ],
  nounPackage: ["de_gc_noun_article_singular_plural_v1"],
  caseProgression: [
    "de_gc_nominative_subject_v1",
    "de_gc_frequent_accusative_frames_v1",
    "de_gc_dative_recipient_frames_v1",
    "de_gc_dative_location_frames_v1",
    "de_gc_two_object_case_contrast_v1",
    "de_gc_limited_functional_genitive_v1",
  ],
  negation: [
    "de_gc_nein_nicht_contrast_v1",
    "de_gc_kein_nominal_negation_v1",
    "de_gc_nicht_position_focus_v1",
    "de_gc_doch_response_contrast_v1",
  ],
  separableBracket: ["de_gc_separable_verb_bracket_v1"],
  modalBracket: ["de_gc_modal_finite_bare_infinitive_v1"],
  prepositionCase: [
    "de_gc_local_preposition_governed_case_v1",
    "de_gc_temporal_preposition_governed_case_v1",
    "de_gc_wechselpreposition_relation_contrast_v1",
  ],
  pronounCase: [
    "de_gc_pronoun_reference_chain_v1",
    "de_gc_accusative_personal_pronouns_v1",
    "de_gc_dative_personal_pronouns_v1",
  ],
  adjectiveAgreement: [
    "de_gc_predicative_adjective_v1",
    "de_gc_staged_nominal_group_agreement_v1",
  ],
  perfekt: [
    "de_gc_finite_haben_present_v1",
    "de_gc_finite_sein_present_v1",
    "de_gc_controlled_partizip_ii_v1",
    "de_gc_perfekt_haben_classes_v1",
    "de_gc_perfekt_sein_classes_v1",
  ],
  preterite: [
    "de_gc_spoken_preterite_island_v1",
    "de_gc_broader_narrative_preterite_v1",
  ],
  verbletzt: [
    "de_gc_introduced_verbletzt_clause_v1",
    "de_gc_connector_topology_contrast_v1",
  ],
  clustersReflexive: [
    "de_gc_infinitive_verb_cluster_v1",
    "de_gc_lexical_reflexive_v1",
    "de_gc_formal_sie_sich_v1",
    "de_gc_reciprocal_reference_v1",
  ],
  relatives: ["de_gc_relative_clause_gender_case_v1"],
  passive: ["de_gc_event_passive_v1", "de_gc_state_passive_v1"],
  future: [
    "de_gc_present_future_reference_v1",
    "de_gc_werden_infinitive_meanings_v1",
  ],
  b1Integration: [
    "de_gc_register_repair_mediation_v1",
    "de_gc_functional_b1_integration_v1",
    "de_gc_limited_modal_perfekt_v1",
  ],
});

const PEDAGOGICAL_INFERENCE_IDS = new Set([
  "de_gc_finite_present_agreement_v1",
  "de_gc_finite_haben_present_v1",
  "de_gc_finite_sein_present_v1",
  "de_gc_predicative_adjective_v1",
  "de_gc_reciprocal_reference_v1",
  "de_gc_infinitive_verb_cluster_v1",
  "de_gc_broader_narrative_preterite_v1",
  "de_gc_limited_functional_genitive_v1",
]);

const semanticEvidenceByConstruct = new Map<string, Set<string>>();
const specificInferenceRationaleById = new Map<string, RegExp>([
  [
    "de_gc_finite_present_agreement_v1",
    /finite present agreement is a pedagogical inference.+subject-person evidence.+not a direct source claim/iu,
  ],
  [
    "de_gc_finite_haben_present_v1",
    /finite haben staging is a pedagogical inference.+present-agreement and Perfekt evidence.+not a direct source claim/iu,
  ],
  [
    "de_gc_finite_sein_present_v1",
    /finite sein staging is a pedagogical inference.+present-agreement and Perfekt evidence.+not a direct source claim/iu,
  ],
  [
    "de_gc_predicative_adjective_v1",
    /predicative staging.+pedagogical inference.+not a direct source claim/iu,
  ],
  [
    "de_gc_reciprocal_reference_v1",
    /reciprocal interpretation.+einander contrast.+pedagogical inferences.+not direct source claims/iu,
  ],
  [
    "de_gc_infinitive_verb_cluster_v1",
    /infinitive-cluster staging is a pedagogical inference.+modal and modal-Perfekt evidence.+not a direct source claim/iu,
  ],
  [
    "de_gc_broader_narrative_preterite_v1",
    /broader narrative Präteritum staging is a pedagogical inference.+past-register evidence.+not a direct source claim/iu,
  ],
  [
    "de_gc_limited_functional_genitive_v1",
    /limited functional Genitiv staging is a pedagogical inference.+case and nominal-group evidence.+not a direct source claim/iu,
  ],
]);
assert.deepEqual(
  [...specificInferenceRationaleById.keys()].sort(),
  [...PEDAGOGICAL_INFERENCE_IDS].sort(),
  "every pedagogical inference requires a construct-specific audit contract",
);
function bindSemanticEvidence(constructIds: readonly string[], evidenceIds: readonly string[]): void {
  for (const constructId of constructIds) {
    semanticEvidenceByConstruct.set(constructId, new Set(evidenceIds));
  }
}
bindSemanticEvidence(["de_gc_pre_a1_formulaic_chunks_v1"], ["DE-RSCH-CEFR-003"]);
bindSemanticEvidence(
  ["de_gc_personal_reference_v1", "de_gc_pronoun_reference_chain_v1"],
  ["DE-GRM-PRON-001"],
);
bindSemanticEvidence(
  ["de_gc_finite_present_agreement_v1", "de_gc_finite_haben_present_v1", "de_gc_finite_sein_present_v1"],
  ["DE-GRM-SYNTAX-001", "DE-GRM-PRON-001", "DE-GRM-PERFEKT-001"],
);
bindSemanticEvidence(
  ["de_gc_noun_article_singular_plural_v1"],
  ["DE-GRM-NP-001", "DE-GRM-GENDER-001", "DE-GRM-PLURAL-001"],
);
bindSemanticEvidence(
  [
    "de_gc_nominative_subject_v1",
    "de_gc_frequent_accusative_frames_v1",
    "de_gc_dative_recipient_frames_v1",
    "de_gc_dative_location_frames_v1",
    "de_gc_two_object_case_contrast_v1",
    "de_gc_limited_functional_genitive_v1",
  ],
  ["DE-GRM-CASE-001", "DE-GRM-ADP-001", "DE-GRM-NP-001"],
);
bindSemanticEvidence(
  ["de_gc_statement_v2_v1", "de_gc_yes_no_verberst_v1", "de_gc_w_element_v2_v1"],
  ["DE-GRM-SYNTAX-001", "DE-GRM-SYNTAX-002"],
);
bindSemanticEvidence(
  [
    "de_gc_nein_nicht_contrast_v1",
    "de_gc_kein_nominal_negation_v1",
    "de_gc_nicht_position_focus_v1",
    "de_gc_doch_response_contrast_v1",
  ],
  ["DE-GRM-NEG-001"],
);
bindSemanticEvidence(["de_gc_separable_verb_bracket_v1"], ["DE-GRM-SYNTAX-004"]);
bindSemanticEvidence(
  ["de_gc_modal_finite_bare_infinitive_v1", "de_gc_infinitive_verb_cluster_v1"],
  ["DE-GRM-MODAL-001", "DE-GRM-MODALPERF-001", "DE-GRM-SYNTAX-001"],
);
bindSemanticEvidence(
  [
    "de_gc_local_preposition_governed_case_v1",
    "de_gc_temporal_preposition_governed_case_v1",
    "de_gc_wechselpreposition_relation_contrast_v1",
  ],
  ["DE-GRM-ADP-001", "DE-GRM-CASE-001"],
);
bindSemanticEvidence(
  ["de_gc_accusative_personal_pronouns_v1", "de_gc_dative_personal_pronouns_v1"],
  ["DE-GRM-PRON-001", "DE-GRM-CASE-001"],
);
bindSemanticEvidence(
  ["de_gc_predicative_adjective_v1", "de_gc_staged_nominal_group_agreement_v1"],
  ["DE-GRM-NP-001"],
);
bindSemanticEvidence(
  ["de_gc_controlled_partizip_ii_v1", "de_gc_perfekt_haben_classes_v1", "de_gc_perfekt_sein_classes_v1"],
  ["DE-GRM-PERFEKT-001"],
);
bindSemanticEvidence(
  ["de_gc_spoken_preterite_island_v1", "de_gc_broader_narrative_preterite_v1"],
  ["DE-GRM-PAST-001"],
);
bindSemanticEvidence(
  ["de_gc_present_future_reference_v1"],
  ["DE-GRM-FUTURE-001"],
);
bindSemanticEvidence(
  ["de_gc_werden_infinitive_meanings_v1"],
  ["DE-GRM-FUTURE-002"],
);
bindSemanticEvidence(
  ["de_gc_introduced_verbletzt_clause_v1", "de_gc_connector_topology_contrast_v1"],
  ["DE-GRM-SYNTAX-001", "DE-GRM-SYNTAX-002", "DE-GRM-SYNTAX-003"],
);
bindSemanticEvidence(
  ["de_gc_lexical_reflexive_v1", "de_gc_formal_sie_sich_v1", "de_gc_reciprocal_reference_v1"],
  ["DE-GRM-REFL-001", "DE-GRM-PRON-001"],
);
bindSemanticEvidence(["de_gc_relative_clause_gender_case_v1"], ["DE-GRM-REL-001", "DE-GRM-CASE-001"]);
bindSemanticEvidence(["de_gc_event_passive_v1", "de_gc_state_passive_v1"], ["DE-GRM-PASS-001", "DE-GRM-PERFEKT-001"]);
bindSemanticEvidence(["de_gc_limited_modal_perfekt_v1"], ["DE-GRM-MODALPERF-001", "DE-GRM-MODAL-001", "DE-GRM-PERFEKT-001"]);
bindSemanticEvidence(
  ["de_gc_register_repair_mediation_v1"],
  ["DE-RSCH-CEFR-002", "DE-RSCH-CEFR-008", "DE-RSCH-CEFR-009", "DE-REG-DUSIE-001", "DE-RSCH-GOETHE-001"],
);
bindSemanticEvidence(
  ["de_gc_functional_b1_integration_v1"],
  ["DE-RSCH-CEFR-002", "DE-RSCH-CEFR-005", "DE-RSCH-CEFR-008", "DE-RSCH-CEFR-009"],
);

const EXPECTED_EDGE_EVIDENCE_GROUPS = Object.freeze({
  "DE-GRM-ADP-001": [
    "de_gc_local_preposition_governed_case_v1->de_gc_wechselpreposition_relation_contrast_v1",
  ],
  "DE-GRM-ADP-001|DE-GRM-CASE-001": [
    "de_gc_frequent_accusative_frames_v1->de_gc_local_preposition_governed_case_v1",
    "de_gc_frequent_accusative_frames_v1->de_gc_temporal_preposition_governed_case_v1",
    "de_gc_dative_location_frames_v1->de_gc_wechselpreposition_relation_contrast_v1",
  ],
  "DE-GRM-CASE-001": [
    "de_gc_noun_article_singular_plural_v1->de_gc_nominative_subject_v1",
    "de_gc_nominative_subject_v1->de_gc_frequent_accusative_frames_v1",
    "de_gc_statement_v2_v1->de_gc_frequent_accusative_frames_v1",
    "de_gc_frequent_accusative_frames_v1->de_gc_dative_recipient_frames_v1",
    "de_gc_dative_recipient_frames_v1->de_gc_dative_location_frames_v1",
    "de_gc_frequent_accusative_frames_v1->de_gc_two_object_case_contrast_v1",
    "de_gc_dative_recipient_frames_v1->de_gc_two_object_case_contrast_v1",
    "de_gc_two_object_case_contrast_v1->de_gc_limited_functional_genitive_v1",
    "de_gc_limited_functional_genitive_v1->de_gc_functional_b1_integration_v1",
  ],
  "DE-GRM-CASE-001|DE-GRM-NP-001": [
    "de_gc_staged_nominal_group_agreement_v1->de_gc_limited_functional_genitive_v1",
  ],
  "DE-GRM-CASE-001|DE-GRM-PRON-001": [
    "de_gc_frequent_accusative_frames_v1->de_gc_accusative_personal_pronouns_v1",
    "de_gc_dative_recipient_frames_v1->de_gc_dative_personal_pronouns_v1",
  ],
  "DE-GRM-FUTURE-001": [
    "de_gc_finite_present_agreement_v1->de_gc_present_future_reference_v1",
  ],
  "DE-GRM-FUTURE-001|DE-GRM-FUTURE-002": [
    "de_gc_present_future_reference_v1->de_gc_werden_infinitive_meanings_v1",
  ],
  "DE-GRM-FUTURE-002": [
    "de_gc_werden_infinitive_meanings_v1->de_gc_functional_b1_integration_v1",
  ],
  "DE-GRM-FUTURE-002|DE-GRM-MODAL-001": [
    "de_gc_modal_finite_bare_infinitive_v1->de_gc_werden_infinitive_meanings_v1",
  ],
  "DE-GRM-GENDER-001|DE-GRM-PLURAL-001": [
    "de_gc_pre_a1_formulaic_chunks_v1->de_gc_noun_article_singular_plural_v1",
  ],
  "DE-GRM-MODAL-001": [
    "de_gc_statement_v2_v1->de_gc_modal_finite_bare_infinitive_v1",
    "de_gc_modal_finite_bare_infinitive_v1->de_gc_infinitive_verb_cluster_v1",
  ],
  "DE-GRM-MODALPERF-001": [
    "de_gc_infinitive_verb_cluster_v1->de_gc_limited_modal_perfekt_v1",
    "de_gc_limited_modal_perfekt_v1->de_gc_functional_b1_integration_v1",
  ],
  "DE-GRM-MODALPERF-001|DE-GRM-MODAL-001": [
    "de_gc_modal_finite_bare_infinitive_v1->de_gc_limited_modal_perfekt_v1",
  ],
  "DE-GRM-MODALPERF-001|DE-GRM-PERFEKT-001": [
    "de_gc_perfekt_haben_classes_v1->de_gc_limited_modal_perfekt_v1",
  ],
  "DE-GRM-NEG-001": [
    "de_gc_statement_v2_v1->de_gc_nein_nicht_contrast_v1",
    "de_gc_nein_nicht_contrast_v1->de_gc_kein_nominal_negation_v1",
    "de_gc_nein_nicht_contrast_v1->de_gc_nicht_position_focus_v1",
    "de_gc_nicht_position_focus_v1->de_gc_doch_response_contrast_v1",
    "de_gc_yes_no_verberst_v1->de_gc_doch_response_contrast_v1",
  ],
  "DE-GRM-NEG-001|DE-GRM-CASE-001": [
    "de_gc_nominative_subject_v1->de_gc_kein_nominal_negation_v1",
  ],
  "DE-GRM-NEG-001|DE-GRM-NP-001": [
    "de_gc_noun_article_singular_plural_v1->de_gc_kein_nominal_negation_v1",
  ],
  "DE-GRM-NEG-001|DE-RSCH-GOETHE-001": [
    "de_gc_doch_response_contrast_v1->de_gc_register_repair_mediation_v1",
  ],
  "DE-GRM-NP-001": [
    "de_gc_statement_v2_v1->de_gc_predicative_adjective_v1",
    "de_gc_noun_article_singular_plural_v1->de_gc_predicative_adjective_v1",
    "de_gc_predicative_adjective_v1->de_gc_staged_nominal_group_agreement_v1",
    "de_gc_noun_article_singular_plural_v1->de_gc_staged_nominal_group_agreement_v1",
  ],
  "DE-GRM-NP-001|DE-GRM-CASE-001": [
    "de_gc_frequent_accusative_frames_v1->de_gc_staged_nominal_group_agreement_v1",
    "de_gc_dative_recipient_frames_v1->de_gc_staged_nominal_group_agreement_v1",
  ],
  "DE-GRM-PASS-001": [
    "de_gc_event_passive_v1->de_gc_state_passive_v1",
    "de_gc_finite_sein_present_v1->de_gc_state_passive_v1",
    "de_gc_state_passive_v1->de_gc_functional_b1_integration_v1",
  ],
  "DE-GRM-PASS-001|DE-GRM-PERFEKT-001": [
    "de_gc_controlled_partizip_ii_v1->de_gc_event_passive_v1",
  ],
  "DE-GRM-PASS-001|DE-GRM-SYNTAX-004": [
    "de_gc_separable_verb_bracket_v1->de_gc_event_passive_v1",
  ],
  "DE-GRM-PAST-001": [
    "de_gc_perfekt_haben_classes_v1->de_gc_spoken_preterite_island_v1",
    "de_gc_perfekt_sein_classes_v1->de_gc_spoken_preterite_island_v1",
    "de_gc_spoken_preterite_island_v1->de_gc_broader_narrative_preterite_v1",
    "de_gc_broader_narrative_preterite_v1->de_gc_functional_b1_integration_v1",
  ],
  "DE-GRM-PAST-001|DE-GRM-MODAL-001": [
    "de_gc_modal_finite_bare_infinitive_v1->de_gc_spoken_preterite_island_v1",
  ],
  "DE-GRM-PERFEKT-001": [
    "de_gc_finite_haben_present_v1->de_gc_perfekt_haben_classes_v1",
    "de_gc_controlled_partizip_ii_v1->de_gc_perfekt_haben_classes_v1",
    "de_gc_separable_verb_bracket_v1->de_gc_perfekt_haben_classes_v1",
    "de_gc_finite_sein_present_v1->de_gc_perfekt_sein_classes_v1",
    "de_gc_controlled_partizip_ii_v1->de_gc_perfekt_sein_classes_v1",
    "de_gc_perfekt_haben_classes_v1->de_gc_perfekt_sein_classes_v1",
  ],
  "DE-GRM-PERFEKT-001|DE-GRM-SYNTAX-004": [
    "de_gc_separable_verb_bracket_v1->de_gc_controlled_partizip_ii_v1",
  ],
  "DE-GRM-PRON-001": [
    "de_gc_pre_a1_formulaic_chunks_v1->de_gc_personal_reference_v1",
    "de_gc_personal_reference_v1->de_gc_pronoun_reference_chain_v1",
    "de_gc_noun_article_singular_plural_v1->de_gc_pronoun_reference_chain_v1",
    "de_gc_statement_v2_v1->de_gc_pronoun_reference_chain_v1",
    "de_gc_pronoun_reference_chain_v1->de_gc_accusative_personal_pronouns_v1",
    "de_gc_pronoun_reference_chain_v1->de_gc_dative_personal_pronouns_v1",
  ],
  "DE-GRM-REFL-001": [
    "de_gc_accusative_personal_pronouns_v1->de_gc_lexical_reflexive_v1",
    "de_gc_lexical_reflexive_v1->de_gc_formal_sie_sich_v1",
    "de_gc_lexical_reflexive_v1->de_gc_reciprocal_reference_v1",
    "de_gc_personal_reference_v1->de_gc_reciprocal_reference_v1",
    "de_gc_formal_sie_sich_v1->de_gc_reciprocal_reference_v1",
  ],
  "DE-GRM-REFL-001|DE-GRM-PRON-001": [
    "de_gc_pronoun_reference_chain_v1->de_gc_formal_sie_sich_v1",
  ],
  "DE-GRM-REL-001": [
    "de_gc_introduced_verbletzt_clause_v1->de_gc_relative_clause_gender_case_v1",
    "de_gc_noun_article_singular_plural_v1->de_gc_relative_clause_gender_case_v1",
    "de_gc_relative_clause_gender_case_v1->de_gc_functional_b1_integration_v1",
  ],
  "DE-GRM-REL-001|DE-GRM-CASE-001": [
    "de_gc_frequent_accusative_frames_v1->de_gc_relative_clause_gender_case_v1",
    "de_gc_dative_recipient_frames_v1->de_gc_relative_clause_gender_case_v1",
  ],
  "DE-GRM-SYNTAX-001": [
    "de_gc_personal_reference_v1->de_gc_finite_present_agreement_v1",
  ],
  "DE-GRM-SYNTAX-001|DE-GRM-PERFEKT-001": [
    "de_gc_finite_present_agreement_v1->de_gc_finite_haben_present_v1",
    "de_gc_finite_present_agreement_v1->de_gc_finite_sein_present_v1",
  ],
  "DE-GRM-SYNTAX-001|DE-GRM-SYNTAX-002": [
    "de_gc_finite_present_agreement_v1->de_gc_statement_v2_v1",
  ],
  "DE-GRM-SYNTAX-001|DE-GRM-SYNTAX-003": [
    "de_gc_statement_v2_v1->de_gc_introduced_verbletzt_clause_v1",
    "de_gc_separable_verb_bracket_v1->de_gc_introduced_verbletzt_clause_v1",
  ],
  "DE-GRM-SYNTAX-002": [
    "de_gc_nominative_subject_v1->de_gc_statement_v2_v1",
    "de_gc_statement_v2_v1->de_gc_yes_no_verberst_v1",
    "de_gc_statement_v2_v1->de_gc_w_element_v2_v1",
  ],
  "DE-GRM-SYNTAX-002|DE-GRM-SYNTAX-003": [
    "de_gc_statement_v2_v1->de_gc_connector_topology_contrast_v1",
  ],
  "DE-GRM-SYNTAX-003": [
    "de_gc_introduced_verbletzt_clause_v1->de_gc_connector_topology_contrast_v1",
  ],
  "DE-GRM-SYNTAX-004": [
    "de_gc_statement_v2_v1->de_gc_separable_verb_bracket_v1",
  ],
  "DE-RSCH-GOETHE-001": [
    "de_gc_connector_topology_contrast_v1->de_gc_register_repair_mediation_v1",
  ],
  "DE-RSCH-GOETHE-001|DE-REG-DUSIE-001": [
    "de_gc_register_repair_mediation_v1->de_gc_functional_b1_integration_v1",
  ],
} satisfies Readonly<Record<string, readonly string[]>>);

const expectedEdgeEvidenceByPair = new Map<string, readonly string[]>();
for (const [evidenceKey, pairs] of Object.entries(EXPECTED_EDGE_EVIDENCE_GROUPS)) {
  const evidenceIds = evidenceKey.split("|");
  for (const pair of pairs) {
    assert.ok(!expectedEdgeEvidenceByPair.has(pair), `duplicate edge evidence contract: ${pair}`);
    expectedEdgeEvidenceByPair.set(pair, evidenceIds);
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function assertClosedKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label}: closed keys`);
}

function assertNonEmptyStrings(value: unknown, label: string): asserts value is string[] {
  assert.ok(Array.isArray(value) && value.length > 0, `${label}: non-empty array required`);
  assert.equal(new Set(value).size, value.length, `${label}: duplicate values`);
  value.forEach((item, index) => {
    assert.equal(typeof item, "string", `${label}[${index}]: string required`);
    assert.ok(item.trim().length > 0, `${label}[${index}]: blank string forbidden`);
  });
}

function packetOrdinal(packetId: string): number {
  const match = SESSION_ID.exec(packetId);
  assert.ok(match, `canonical German packet ID required: ${packetId}`);
  const lesson = Number(match[1]);
  const chapter = Number(match[2]);
  const session = Number(match[3]);
  assert.ok(lesson >= 1 && lesson <= 32, `lesson out of range: ${packetId}`);
  assert.ok(session >= 1 && session <= 56, `session out of range: ${packetId}`);
  assert.equal(chapter, Math.floor((session - 1) / 8) + 1, `chapter/session mismatch: ${packetId}`);
  return (lesson - 1) * 56 + session;
}

function packetCoordinates(packetId: string): Readonly<{
  lesson: number;
  chapter: number;
  session: number;
}> {
  const match = SESSION_ID.exec(packetId);
  assert.ok(match, `canonical German packet ID required: ${packetId}`);
  return {
    lesson: Number(match[1]),
    chapter: Number(match[2]),
    session: Number(match[3]),
  };
}

function assertLifecycle(construct: GrammarConstruct): void {
  const targetIds = TARGET_KEYS.map((key) => {
    assert.equal(construct[key].length, 1, `${construct.id}.${key}: exactly one planned target required`);
    return construct[key][0];
  });
  const lifecycleIds = [construct.firstIntroductionPacketId, ...targetIds];
  assert.equal(new Set(lifecycleIds).size, lifecycleIds.length, `${construct.id}: lifecycle packet reuse`);
  const ordinals = lifecycleIds.map(packetOrdinal);
  for (let index = 1; index < ordinals.length; index += 1) {
    assert.ok(ordinals[index - 1] < ordinals[index], `${construct.id}: lifecycle stage order invalid`);
  }
  const [introduction, guided, retrieval, production, transfer, delayed] = lifecycleIds.map(packetCoordinates);
  assert.equal(introduction.chapter, 1, `${construct.id}: introduction must be in chapter 1`);
  assert.equal(guided.chapter, 2, `${construct.id}: guided target must be in chapter 2`);
  assert.equal(retrieval.chapter, 3, `${construct.id}: retrieval target must be in chapter 3`);
  assert.equal(production.chapter, 4, `${construct.id}: production target must be in chapter 4`);
  assert.ok(transfer.chapter >= 6, `${construct.id}: transfer target must be in chapter 6 or 7`);
  assert.equal(delayed.chapter, 7, `${construct.id}: delayed target must be in chapter 7`);
  if (introduction.lesson < 32) {
    assert.ok(delayed.lesson > introduction.lesson, `${construct.id}: delayed target must cross a lesson boundary`);
  } else {
    assert.equal(delayed.lesson, 32, `${construct.id}: final-course delayed target must stay in lesson 32`);
  }
}

function assertRegistryLifecycleUniqueness(registry: readonly GrammarConstruct[]): void {
  const ownerByPacketId = new Map<string, string>();
  for (const construct of registry) {
    const packetEntries: readonly (readonly [string, string])[] = [
      ["firstIntroductionPacketId", construct.firstIntroductionPacketId],
      ...TARGET_KEYS.flatMap((key) => construct[key].map((packetId) => [key, packetId] as const)),
    ];
    for (const [stage, packetId] of packetEntries) {
      const owner = ownerByPacketId.get(packetId);
      assert.equal(
        owner,
        undefined,
        `${construct.id}.${stage}: lifecycle packet collision at ${packetId} with ${owner}`,
      );
      ownerByPacketId.set(packetId, `${construct.id}.${stage}`);
    }
  }
}

function assertEvidenceSemantics(construct: GrammarConstruct): void {
  const allowedEvidenceIds = semanticEvidenceByConstruct.get(construct.id);
  assert.ok(allowedEvidenceIds, `${construct.id}: semantic evidence rule missing`);
  for (const evidenceId of construct.evidenceIds) {
    assert.ok(
      allowedEvidenceIds.has(evidenceId),
      `${construct.id}: semantically unrelated evidence ID ${evidenceId}`,
    );
  }
  if (construct.evidenceStatus === "PEDAGOGICAL_INFERENCE") {
    assert.ok(PEDAGOGICAL_INFERENCE_IDS.has(construct.id), `${construct.id}: unsupported inference status`);
    assert.ok(
      construct.exclusions.some((value) => /blueprint inference.+not a source-assigned CEFR sequence/iu.test(value)),
      `${construct.id}: pedagogical inference limitation missing`,
    );
    const specificRationale = specificInferenceRationaleById.get(construct.id);
    assert.ok(specificRationale, `${construct.id}: construct-specific inference audit contract missing`);
    assert.match(
      construct.exclusions.join(" "),
      specificRationale,
      `${construct.id}: exact inference rationale missing`,
    );
    return;
  }
  assert.equal(construct.evidenceStatus, "DIRECT_SOURCE", `${construct.id}: grammar evidence status invalid`);
  assert.ok(!PEDAGOGICAL_INFERENCE_IDS.has(construct.id), `${construct.id}: inference mislabeled as direct source`);
  for (const evidenceId of construct.evidenceIds) {
    assert.equal(
      evidenceStatusById.get(evidenceId),
      "DIRECT_SOURCE",
      `${construct.id}: direct-source label conflicts with canonical binding`,
    );
  }
}

function assertEdgeEvidenceSemantics(
  edge: PrerequisiteEdge,
  registry: ReadonlyMap<string, GrammarConstruct>,
): void {
  const pair = `${edge.prerequisiteId}->${edge.dependentId}`;
  const expectedEvidenceIds = expectedEdgeEvidenceByPair.get(pair);
  assert.ok(expectedEvidenceIds, `${edge.id}: missing explicit edge evidence contract for ${pair}`);
  assert.deepEqual(
    [...edge.evidenceIds].sort(),
    [...expectedEvidenceIds].sort(),
    `${edge.id}: edge evidence contract mismatch`,
  );
  assert.ok(registry.has(edge.prerequisiteId) && registry.has(edge.dependentId));
}

const REQUIRED_BRANCH_PATHS = [
  ["de_gc_pre_a1_formulaic_chunks_v1", "de_gc_personal_reference_v1", "de_gc_finite_present_agreement_v1"],
  ["de_gc_finite_present_agreement_v1", "de_gc_statement_v2_v1", "de_gc_yes_no_verberst_v1"],
  ["de_gc_statement_v2_v1", "de_gc_w_element_v2_v1"],
  ["de_gc_noun_article_singular_plural_v1", "de_gc_nominative_subject_v1", "de_gc_frequent_accusative_frames_v1", "de_gc_dative_recipient_frames_v1", "de_gc_two_object_case_contrast_v1", "de_gc_limited_functional_genitive_v1"],
  ["de_gc_nein_nicht_contrast_v1", "de_gc_kein_nominal_negation_v1"],
  ["de_gc_nein_nicht_contrast_v1", "de_gc_nicht_position_focus_v1", "de_gc_doch_response_contrast_v1"],
  ["de_gc_statement_v2_v1", "de_gc_separable_verb_bracket_v1"],
  ["de_gc_statement_v2_v1", "de_gc_modal_finite_bare_infinitive_v1"],
  ["de_gc_frequent_accusative_frames_v1", "de_gc_local_preposition_governed_case_v1", "de_gc_wechselpreposition_relation_contrast_v1"],
  ["de_gc_frequent_accusative_frames_v1", "de_gc_temporal_preposition_governed_case_v1"],
  ["de_gc_dative_recipient_frames_v1", "de_gc_dative_location_frames_v1", "de_gc_wechselpreposition_relation_contrast_v1"],
  ["de_gc_pronoun_reference_chain_v1", "de_gc_accusative_personal_pronouns_v1"],
  ["de_gc_pronoun_reference_chain_v1", "de_gc_dative_personal_pronouns_v1"],
  ["de_gc_predicative_adjective_v1", "de_gc_staged_nominal_group_agreement_v1"],
  ["de_gc_finite_haben_present_v1", "de_gc_perfekt_haben_classes_v1", "de_gc_perfekt_sein_classes_v1"],
  ["de_gc_controlled_partizip_ii_v1", "de_gc_perfekt_haben_classes_v1"],
  ["de_gc_perfekt_haben_classes_v1", "de_gc_spoken_preterite_island_v1", "de_gc_broader_narrative_preterite_v1"],
  ["de_gc_modal_finite_bare_infinitive_v1", "de_gc_spoken_preterite_island_v1"],
  ["de_gc_statement_v2_v1", "de_gc_introduced_verbletzt_clause_v1", "de_gc_connector_topology_contrast_v1"],
  ["de_gc_accusative_personal_pronouns_v1", "de_gc_lexical_reflexive_v1", "de_gc_formal_sie_sich_v1"],
  ["de_gc_formal_sie_sich_v1", "de_gc_reciprocal_reference_v1"],
  ["de_gc_modal_finite_bare_infinitive_v1", "de_gc_infinitive_verb_cluster_v1", "de_gc_limited_modal_perfekt_v1"],
  ["de_gc_introduced_verbletzt_clause_v1", "de_gc_relative_clause_gender_case_v1"],
  ["de_gc_controlled_partizip_ii_v1", "de_gc_event_passive_v1", "de_gc_state_passive_v1"],
  ["de_gc_present_future_reference_v1", "de_gc_werden_infinitive_meanings_v1"],
  ["de_gc_connector_topology_contrast_v1", "de_gc_register_repair_mediation_v1", "de_gc_functional_b1_integration_v1"],
] as const;

function assertRequiredBranchPaths(pairs: ReadonlySet<string>): void {
  for (const path of REQUIRED_BRANCH_PATHS) {
    for (let index = 1; index < path.length; index += 1) {
      const pair = `${path[index - 1]}->${path[index]}`;
      assert.ok(pairs.has(pair), `required German branch edge missing: ${pair}`);
    }
  }
}

const constructs = readJson<GrammarConstruct[]>(CONSTRUCT_PATH);
const edges = readJson<PrerequisiteEdge[]>(GRAPH_PATH);
assert.ok(Array.isArray(constructs) && constructs.length >= 48, "native German construct inventory is incomplete");
assert.ok(Array.isArray(edges) && edges.length > 0, "prerequisite DAG is empty");

const constructsById = new Map<string, GrammarConstruct>();
const seenIntroductionPackets = new Set<string>();
for (const [index, construct] of constructs.entries()) {
  const label = `construct[${index}]`;
  assertClosedKeys(construct as unknown as Record<string, unknown>, CONSTRUCT_KEYS, label);
  assert.match(construct.id, CONSTRUCT_ID, `${label}: stable de_gc ID required`);
  assert.ok(!constructsById.has(construct.id), `${label}: duplicate ID ${construct.id}`);
  constructsById.set(construct.id, construct);
  assert.ok(construct.form.trim().length > 0, `${construct.id}: form required`);
  assert.ok(construct.function.trim().length > 0, `${construct.id}: function required`);
  assert.deepEqual(Object.keys(construct.scope).sort(), ["productive", "receptive"]);
  assert.equal(typeof construct.scope.receptive, "boolean");
  assert.equal(typeof construct.scope.productive, "boolean");
  assert.ok(construct.scope.receptive || construct.scope.productive, `${construct.id}: empty scope`);
  assertNonEmptyStrings(construct.exclusions, `${construct.id}.exclusions`);
  assert.ok(Array.isArray(construct.prerequisiteIds), `${construct.id}.prerequisiteIds`);
  assert.equal(new Set(construct.prerequisiteIds).size, construct.prerequisiteIds.length);
  assert.match(construct.firstIntroductionPacketId, SESSION_ID);
  assert.ok(
    !seenIntroductionPackets.has(construct.firstIntroductionPacketId),
    `${construct.id}: introduction packet reused`,
  );
  seenIntroductionPackets.add(construct.firstIntroductionPacketId);
  assert.ok(
    construct.evidenceStatus === "DIRECT_SOURCE" || construct.evidenceStatus === "PEDAGOGICAL_INFERENCE",
    `${construct.id}: invalid grammar evidence status`,
  );
  assertNonEmptyStrings(construct.evidenceIds, `${construct.id}.evidenceIds`);
  for (const evidenceId of construct.evidenceIds) {
    assert.ok(evidenceStatusById.has(evidenceId), `${construct.id}: unknown evidence ID ${evidenceId}`);
  }
  assertEvidenceSemantics(construct);
  if (construct.scope.productive) {
    for (const key of TARGET_KEYS) {
      assertNonEmptyStrings(construct[key], `${construct.id}.${key}`);
    }
    assertLifecycle(construct);
  }
}

assertRegistryLifecycleUniqueness(constructs);

const lifecycleCollisionFixture = constructs.map((construct, index) =>
  index === 1
    ? {
        ...construct,
        guidedTargetPacketIds: constructs[0].guidedTargetPacketIds,
      }
    : construct,
);
assert.throws(
  () => assertRegistryLifecycleUniqueness(lifecycleCollisionFixture),
  /lifecycle packet collision/u,
);

const swappedLifecycleFixture: GrammarConstruct = {
  ...constructs[0],
  guidedTargetPacketIds: constructs[0].retrievalTargetPacketIds,
  retrievalTargetPacketIds: constructs[0].guidedTargetPacketIds,
};
assert.throws(() => assertLifecycle(swappedLifecycleFixture), /lifecycle stage order invalid/u);

const unrelatedEvidenceFixture: GrammarConstruct = {
  ...constructsById.get("de_gc_present_future_reference_v1")!,
  evidenceIds: ["DE-GRM-PASS-001"],
};
assert.throws(() => assertEvidenceSemantics(unrelatedEvidenceFixture), /semantically unrelated evidence ID/u);

const nearTopicPredicativeDirectFixture: GrammarConstruct = {
  ...constructsById.get("de_gc_predicative_adjective_v1")!,
  evidenceStatus: "DIRECT_SOURCE",
  evidenceIds: ["DE-GRM-NP-001"],
};
assert.throws(
  () => assertEvidenceSemantics(nearTopicPredicativeDirectFixture),
  /inference mislabeled as direct source/u,
);

const nearTopicReciprocalDirectFixture: GrammarConstruct = {
  ...constructsById.get("de_gc_reciprocal_reference_v1")!,
  evidenceStatus: "DIRECT_SOURCE",
  evidenceIds: ["DE-GRM-REFL-001"],
};
assert.throws(
  () => assertEvidenceSemantics(nearTopicReciprocalDirectFixture),
  /inference mislabeled as direct source/u,
);

for (const constructId of PEDAGOGICAL_INFERENCE_IDS) {
  const inferenceWithoutSpecificRationaleFixture: GrammarConstruct = {
    ...constructsById.get(constructId)!,
    exclusions: ["its placement is a blueprint inference, not a source-assigned CEFR sequence"],
  };
  assert.throws(
    () => assertEvidenceSemantics(inferenceWithoutSpecificRationaleFixture),
    /exact inference rationale missing/u,
    `${constructId}: generic inference boilerplate must not satisfy the audit contract`,
  );
}

assert.ok(constructsById.has(ROOT), "PRE_A1 root construct is missing");
assert.deepEqual(constructsById.get(ROOT)?.prerequisiteIds, [], "PRE_A1 root must not have prerequisites");
for (const [branch, constructIds] of Object.entries(MANDATED_BRANCHES)) {
  for (const constructId of constructIds) {
    assert.ok(constructsById.has(constructId), `${branch}: missing ${constructId}`);
  }
}

const edgeByPair = new Map<string, PrerequisiteEdge>();
const dependents = new Map<string, string[]>(constructs.map((construct) => [construct.id, []]));
const indegree = new Map<string, number>(constructs.map((construct) => [construct.id, 0]));
const edgeIds = new Set<string>();
for (const [index, edge] of edges.entries()) {
  const label = `edge[${index}]`;
  assertClosedKeys(edge as unknown as Record<string, unknown>, EDGE_KEYS, label);
  assert.match(edge.id, EDGE_ID, `${label}: stable German edge ID required`);
  assert.ok(!edgeIds.has(edge.id), `${label}: duplicate edge ID ${edge.id}`);
  edgeIds.add(edge.id);
  assert.ok(constructsById.has(edge.prerequisiteId), `${edge.id}: unknown prerequisite`);
  assert.ok(constructsById.has(edge.dependentId), `${edge.id}: unknown dependent`);
  assert.notEqual(edge.prerequisiteId, edge.dependentId, `${edge.id}: self edge`);
  assertNonEmptyStrings(edge.evidenceIds, `${edge.id}.evidenceIds`);
  for (const evidenceId of edge.evidenceIds) {
    assert.ok(evidenceStatusById.has(evidenceId), `${edge.id}: unknown evidence ID ${evidenceId}`);
    assert.ok(!evidenceId.startsWith("DE-RSCH-CEFR-"), `${edge.id}: CEFR does not prescribe sequence`);
    assert.equal(
      evidenceLimitationById.get(evidenceId),
      "NO_OWNER_DECISION_OR_BLUEPRINT_SEQUENCE",
      `${edge.id}: source must retain the canonical no-sequence-attribution limitation`,
    );
  }
  assertEdgeEvidenceSemantics(edge, constructsById);
  const pair = `${edge.prerequisiteId}->${edge.dependentId}`;
  assert.ok(!edgeByPair.has(pair), `${edge.id}: duplicate construct relationship`);
  edgeByPair.set(pair, edge);
  dependents.get(edge.prerequisiteId)?.push(edge.dependentId);
  indegree.set(edge.dependentId, (indegree.get(edge.dependentId) ?? 0) + 1);
  assert.ok(
    packetOrdinal(constructsById.get(edge.prerequisiteId)!.firstIntroductionPacketId) <
      packetOrdinal(constructsById.get(edge.dependentId)!.firstIntroductionPacketId),
    `${edge.id}: future prerequisite`,
  );
}

assert.deepEqual(
  [...edgeByPair.keys()].sort(),
  [...expectedEdgeEvidenceByPair.keys()].sort(),
  "DAG relationships and explicit edge evidence contracts diverge",
);

const unrelatedEdgeEvidenceFixture: PrerequisiteEdge = {
  ...edges[0],
  evidenceIds: ["DE-GRM-PASS-001"],
};
assert.throws(
  () => assertEdgeEvidenceSemantics(unrelatedEdgeEvidenceFixture, constructsById),
  /edge evidence contract mismatch/u,
);

const nearTopicWrongEdgeEvidenceFixture: PrerequisiteEdge = {
  ...edgeByPair.get("de_gc_finite_present_agreement_v1->de_gc_statement_v2_v1")!,
  evidenceIds: ["DE-GRM-PERFEKT-001"],
};
assert.throws(
  () => assertEdgeEvidenceSemantics(nearTopicWrongEdgeEvidenceFixture, constructsById),
  /edge evidence contract mismatch/u,
);

const declaredPairs = new Set<string>();
for (const construct of constructs) {
  for (const prerequisiteId of construct.prerequisiteIds) {
    assert.ok(constructsById.has(prerequisiteId), `${construct.id}: unknown prerequisite ${prerequisiteId}`);
    const pair = `${prerequisiteId}->${construct.id}`;
    declaredPairs.add(pair);
    assert.ok(edgeByPair.has(pair), `${construct.id}: missing graph edge ${pair}`);
  }
}
assert.deepEqual([...edgeByPair.keys()].sort(), [...declaredPairs].sort(), "construct prerequisites and DAG edges diverge");
assertRequiredBranchPaths(new Set(edgeByPair.keys()));

const rewiredYesNoFixture = new Set(edgeByPair.keys());
rewiredYesNoFixture.delete("de_gc_statement_v2_v1->de_gc_yes_no_verberst_v1");
rewiredYesNoFixture.add("de_gc_pre_a1_formulaic_chunks_v1->de_gc_yes_no_verberst_v1");
assert.throws(() => assertRequiredBranchPaths(rewiredYesNoFixture), /required German branch edge missing/u);

const missingModalPreteriteFixture = new Set(edgeByPair.keys());
missingModalPreteriteFixture.delete(
  "de_gc_modal_finite_bare_infinitive_v1->de_gc_spoken_preterite_island_v1",
);
assert.throws(
  () => assertRequiredBranchPaths(missingModalPreteriteFixture),
  /required German branch edge missing/u,
);

const missingFormalReciprocalFixture = new Set(edgeByPair.keys());
missingFormalReciprocalFixture.delete("de_gc_formal_sie_sich_v1->de_gc_reciprocal_reference_v1");
assert.throws(
  () => assertRequiredBranchPaths(missingFormalReciprocalFixture),
  /required German branch edge missing/u,
);

for (const forbiddenPair of [
  "de_gc_temporal_preposition_governed_case_v1->de_gc_present_future_reference_v1",
  "de_gc_introduced_verbletzt_clause_v1->de_gc_infinitive_verb_cluster_v1",
  "de_gc_infinitive_verb_cluster_v1->de_gc_event_passive_v1",
  "de_gc_introduced_verbletzt_clause_v1->de_gc_broader_narrative_preterite_v1",
  "de_gc_formal_sie_sich_v1->de_gc_register_repair_mediation_v1",
]) {
  assert.ok(!edgeByPair.has(forbiddenPair), `overstrong prerequisite edge forbidden: ${forbiddenPair}`);
}

const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
const topologicalOrder: string[] = [];
while (queue.length > 0) {
  const id = queue.shift()!;
  topologicalOrder.push(id);
  for (const dependentId of dependents.get(id) ?? []) {
    const next = (indegree.get(dependentId) ?? 0) - 1;
    indegree.set(dependentId, next);
    if (next === 0) queue.push(dependentId);
  }
}
assert.equal(topologicalOrder.length, constructs.length, "prerequisite graph contains a cycle");
assert.deepEqual(
  topologicalOrder.filter((id) => constructsById.get(id)?.prerequisiteIds.length === 0),
  [ROOT],
  "PRE_A1 must be the sole root",
);

const reachable = new Set<string>([ROOT]);
const frontier = [ROOT];
while (frontier.length > 0) {
  for (const dependentId of dependents.get(frontier.shift()!) ?? []) {
    if (!reachable.has(dependentId)) {
      reachable.add(dependentId);
      frontier.push(dependentId);
    }
  }
}
assert.equal(reachable.size, constructs.length, "not every construct is reachable from PRE_A1");

const verbletzt = constructsById.get("de_gc_introduced_verbletzt_clause_v1")!;
assert.match(verbletzt.form, /whole verb complex.+including the finite verb.+right bracket/iu);
assert.doesNotMatch(`${verbletzt.form} ${verbletzt.function}`, /finite.+left.+non.?finite.+right/iu);

const formalSie = constructsById.get("de_gc_formal_sie_sich_v1")!;
assert.match(`${formalSie.form} ${formalSie.function}`, /formal `?Sie`?.+`?sich`?/u);

const reciprocal = constructsById.get("de_gc_reciprocal_reference_v1")!;
assert.match(reciprocal.form, /wir.+uns.+ihr.+euch.+sie\/Sie.+sich/iu);
assert.match(reciprocal.exclusions.join(" "), /\*?wir.+sich.+\*?ihr.+sich/iu);

const localPreposition = constructsById.get("de_gc_local_preposition_governed_case_v1")!;
assert.match(localPreposition.form, /local.+Akkusativ.+relation/iu);
assert.deepEqual(localPreposition.prerequisiteIds, ["de_gc_frequent_accusative_frames_v1"]);
const temporalPreposition = constructsById.get("de_gc_temporal_preposition_governed_case_v1")!;
assert.match(temporalPreposition.form, /temporal.+Akkusativ.+relation/iu);
assert.deepEqual(temporalPreposition.prerequisiteIds, ["de_gc_frequent_accusative_frames_v1"]);
const dativeLocation = constructsById.get("de_gc_dative_location_frames_v1")!;
assert.match(dativeLocation.form, /local.+Dativ.+relation/iu);
assert.ok(dativeLocation.prerequisiteIds.includes("de_gc_dative_recipient_frames_v1"));

const perfektHaben = constructsById.get("de_gc_perfekt_haben_classes_v1")!;
assert.deepEqual(
  new Set(perfektHaben.prerequisiteIds),
  new Set([
    "de_gc_finite_haben_present_v1",
    "de_gc_controlled_partizip_ii_v1",
    "de_gc_separable_verb_bracket_v1",
  ]),
);
const perfektSein = constructsById.get("de_gc_perfekt_sein_classes_v1")!;
assert.deepEqual(
  new Set(perfektSein.prerequisiteIds),
  new Set([
    "de_gc_finite_sein_present_v1",
    "de_gc_controlled_partizip_ii_v1",
    "de_gc_perfekt_haben_classes_v1",
  ]),
);

const presentFuture = constructsById.get("de_gc_present_future_reference_v1")!;
const werdenFuture = constructsById.get("de_gc_werden_infinitive_meanings_v1")!;
assert.notEqual(presentFuture.id, werdenFuture.id);
assert.ok(presentFuture.evidenceIds.includes("DE-GRM-FUTURE-001"));
assert.ok(werdenFuture.evidenceIds.includes("DE-GRM-FUTURE-002"));
assert.ok(
  packetOrdinal(presentFuture.firstIntroductionPacketId) <
    packetOrdinal(werdenFuture.firstIntroductionPacketId),
  "Präsens future reference must precede werden + Infinitiv",
);

for (const [constructId, minimumLesson] of [
  ["de_gc_limited_functional_genitive_v1", 29],
  ["de_gc_limited_modal_perfekt_v1", 30],
  ["de_gc_register_repair_mediation_v1", 31],
  ["de_gc_functional_b1_integration_v1", 32],
] as const) {
  assert.ok(
    packetCoordinates(constructsById.get(constructId)!.firstIntroductionPacketId).lesson >= minimumLesson,
    `${constructId}: late functional B1 placement required`,
  );
}
assert.equal(
  Math.max(...constructs.map((construct) => packetCoordinates(construct.delayedTargetPacketIds[0]).lesson)),
  32,
  "grammar lifecycle must extend through lesson 32",
);

const forbiddenEnglishOrder = /present continuous|simple present|simple past|past continuous|english tense/iu;
for (const construct of constructs) {
  assert.doesNotMatch(
    `${construct.form} ${construct.function} ${construct.exclusions.join(" ")}`,
    forbiddenEnglishOrder,
    `${construct.id}: English-order contamination`,
  );
}

process.stdout.write(
  `LEARNING V2 GERMAN GRAMMAR GRAPH GATE: PASS (${constructs.length} constructs; ${edges.length} edges; 18 branches)\n`,
);
