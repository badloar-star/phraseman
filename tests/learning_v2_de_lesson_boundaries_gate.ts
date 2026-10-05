import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1 } from "../modules/learning-v2/curriculum/de/research_evidence_bindings_de_v1";

type JsonRecord = Record<string, unknown>;
type GrammarConstruct = Readonly<{
  id: string;
  prerequisiteIds: readonly string[];
  firstIntroductionPacketId: string;
  guidedTargetPacketIds: readonly string[];
  retrievalTargetPacketIds: readonly string[];
  productionTargetPacketIds: readonly string[];
  transferTargetPacketIds: readonly string[];
  delayedTargetPacketIds: readonly string[];
  evidenceIds: readonly string[];
}>;

const LESSONS_PATH = resolve(
  process.cwd(),
  "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json",
);
const CONSTRUCTS_PATH = resolve(
  process.cwd(),
  "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json",
);
const ROOT_KEYS = [
  "schemaVersion",
  "targetLanguage",
  "sequencePolicy",
  "topology",
  "standardPolicy",
  "evidenceEnvelopePolicy",
  "ownerDecisionBoundary",
  "lessons",
] as const;
const LESSON_KEYS = [
  "id",
  "ordinal",
  "cefrBand",
  "title",
  "scenario",
  "scenarioDomain",
  "canDoTerritory",
  "grammarBoundary",
  "introducedConstructIds",
  "extendedConstructIds",
  "reviewedConstructIds",
  "prohibitedConstructIds",
  "prerequisiteLessonIds",
  "chapterOutcomes",
  "lexicalDomains",
  "plannedPronunciationTargetIds",
  "pronunciationPlanStatus",
  "pragmatics",
  "crossLessonRecall",
  "session56Final",
  "accessibilityAlternative",
  "evidenceIds",
  "uncertaintyStatus",
] as const;
const L10_LESSON_KEYS = [...LESSON_KEYS, "localRelationContract"] as const;
const LOCAL_RELATION_CONTRACT_KEYS = [
  "constructId",
  "licensedSemantics",
  "forbiddenSemantics",
  "evidenceAnchors",
] as const;
const CHAPTER_KEYS = ["id", "ordinal", "outcome"] as const;
const RECALL_KEYS = ["fromLessonId", "constructIds", "responsibility"] as const;
const SESSION_56_KEYS = [
  "sessionId",
  "transferSituation",
  "requiredConstructIds",
  "evidenceDimensions",
  "independent",
  "changedContextRequired",
] as const;
const LATE_B1_SESSION_KEYS = [...SESSION_56_KEYS, "evidenceModes"] as const;
const L32_SESSION_KEYS = [
  ...LATE_B1_SESSION_KEYS,
  "assessmentStrands",
  "contextSelectedConstructIds",
  "contextSelectionRule",
] as const;
const ASSESSMENT_STRAND_KEYS = [
  "id",
  "mode",
  "task",
  "evidenceDimensions",
] as const;
const LIFECYCLE_TARGET_KEYS = [
  "guidedTargetPacketIds",
  "retrievalTargetPacketIds",
  "productionTargetPacketIds",
  "transferTargetPacketIds",
  "delayedTargetPacketIds",
] as const;
const LESSON_ID = /^de_l(\d{2})$/u;
const CONSTRUCT_ID = /^de_gc_[a-z0-9]+(?:_[a-z0-9]+)*_v1$/u;
const PRONUNCIATION_PLAN_ID = /^de_pron_plan_[a-z0-9]+(?:_[a-z0-9]+)*_v1$/u;
const CLAUSE_BRACKET_RHYTHM_TARGET_ID = "de_pron_plan_clause_bracket_rhythm_v1";
const L12_PRONUNCIATION_TARGET_IDS = [
  "de_pron_plan_case_marker_perception_v1",
] as const;
const L24_RECEPTIVE_BOUNDARY =
  "known active completed-event clauses used for contrast plus exactly one known finite separable clause from L08 used only as a receptive contrast";
const L24_CANONICAL_OBJECT_SHA256 =
  "c04a3b85a017855eba5bfdaac514dca66b27255d275fffb6e4c67c176244d8b3";
const L24_L08_RECALL_RESPONSIBILITY =
  "retrieve exactly one known finite split clause from L08 as reception-only contrast; a Partizip II whole does not count as evidence of the finite separable-verb bracket";
const L24_CROSS_LESSON_RECALL = [
  {
    fromLessonId: "de_l08",
    constructIds: ["de_gc_separable_verb_bracket_v1"],
    responsibility: L24_L08_RECALL_RESPONSIBILITY,
  },
  {
    fromLessonId: "de_l15",
    constructIds: [
      "de_gc_controlled_partizip_ii_v1",
      "de_gc_perfekt_haben_classes_v1",
    ],
    responsibility:
      "contrast participle brackets by function rather than surface form",
  },
] as const;
const L27_PLAN_RECALL_AUTHORITY = [
  {
    fromLessonId: "de_l26",
    constructIds: ["de_gc_werden_infinitive_meanings_v1"],
    responsibility:
      "retrieve certainty contrasts under connected-project conditions",
  },
  {
    fromLessonId: "de_l22",
    constructIds: ["de_gc_relative_clause_gender_case_v1"],
    responsibility: "maintain precise reference during mediation",
  },
  {
    fromLessonId: "de_l18",
    constructIds: ["de_gc_connector_topology_contrast_v1"],
    responsibility:
      "retrieve the established deshalb-plus-V2 versus weil-plus-verb-final topology while mediating a revised shared plan",
  },
  {
    fromLessonId: "de_l24",
    constructIds: ["de_gc_event_passive_v1"],
    responsibility:
      "retrieve process passive meaning to distinguish an ongoing project process from an existing result",
  },
  {
    fromLessonId: "de_l25",
    constructIds: ["de_gc_state_passive_v1"],
    responsibility:
      "retrieve state passive meaning to distinguish an existing project result from an ongoing process",
  },
] as const;
const L27_PLAN_RECALL_AUTHORITY_SHA256 =
  "38da89e2562454a1daebb1c1ddb124d36ad487b0aabccb6d807a68744ca6473a";
const L27_CANONICAL_OBJECT_SHA256 =
  "ca4411b999f2f0e199c1de2b352b8f606e89969713f4c5350ed5f5f5e40bc9d5";
const L28_PLAN_RECALL_AUTHORITY = [
  {
    fromLessonId: "de_l16",
    constructIds: [
      "de_gc_spoken_preterite_island_v1",
      "de_gc_perfekt_sein_classes_v1",
    ],
    responsibility:
      "contrast bounded spoken forms and completed events with the selected narrative register",
  },
  {
    fromLessonId: "de_l15",
    constructIds: ["de_gc_perfekt_haben_classes_v1"],
    responsibility:
      "retrieve verified haben-class completed-event brackets for contrast with the selected narrative set",
  },
  {
    fromLessonId: "de_l18",
    constructIds: ["de_gc_connector_topology_contrast_v1"],
    responsibility:
      "retrieve the established connector-topology contrast while sequencing cause and result in a connected account",
  },
] as const;
const L28_PLAN_RECALL_AUTHORITY_SHA256 =
  "4498cc546c93be421b36baa5fd911c755af937e58c07a5d0cc7cba74d3b68b6c";
const L28_CANONICAL_OBJECT_SHA256 =
  "bbed0011f3a848a569cf608a0de706d82a5503b0a137235d60dbddf412bc8328";
const L29_PLAN_RECALL_AUTHORITY = [
  {
    fromLessonId: "de_l13",
    constructIds: ["de_gc_staged_nominal_group_agreement_v1"],
    responsibility:
      "retain nominal-group cues while adding a bounded genitive relation",
  },
  {
    fromLessonId: "de_l12",
    constructIds: ["de_gc_two_object_case_contrast_v1"],
    responsibility:
      "retain the established dative-recipient and accusative-transferred-entity contrast while adding a bounded genitive relation",
  },
  {
    fromLessonId: "de_l22",
    constructIds: ["de_gc_relative_clause_gender_case_v1"],
    responsibility: "contrast clause-internal case with a nominal relationship",
  },
  {
    fromLessonId: "de_l28",
    constructIds: ["de_gc_broader_narrative_preterite_v1"],
    responsibility:
      "retrieve a bounded past account when explaining how a document situation arose",
  },
] as const;
const L29_PLAN_RECALL_AUTHORITY_SHA256 =
  "9132d6885fc12dd807b12cf537f6e19b8a9c328e2a4c9093b5d08e9eb9433124";
const L29_EVIDENCE_IDS = [
  "DE-GRM-CASE-001",
  "DE-GRM-ADP-001",
  "DE-GRM-NP-001",
  "DE-RSCH-CEFR-009",
] as const;
const L29_EVIDENCE_IDS_SHA256 =
  "b05eeca3ce0f6992804f7edf96532d28ddf23b6453a9c4e75259c1a58700ee7e";
const L29_CANONICAL_OBJECT_SHA256 =
  "414e499f0ff839d80ca6df6af2a29c3a1f7e3b9ec133b2f8aa1549fed5207295";
const L30_PLAN_RECALL_AUTHORITY = [
  {
    fromLessonId: "de_l20",
    constructIds: ["de_gc_infinitive_verb_cluster_v1"],
    responsibility:
      "retrieve right-bracket control before adding finite haben around the selected warten müssen cluster",
  },
  {
    fromLessonId: "de_l15",
    constructIds: ["de_gc_perfekt_haben_classes_v1"],
    responsibility:
      "contrast ordinary haben plus Partizip II with the source-attested haben plus warten plus müssen Ersatzinfinitiv pattern",
  },
  {
    fromLessonId: "de_l09",
    constructIds: ["de_gc_modal_finite_bare_infinitive_v1"],
    responsibility:
      "retain the known finite-modal plus bare-infinitive bracket only as a form contrast and do not substitute it for the selected Perfekt cluster",
  },
  {
    fromLessonId: "de_l16",
    constructIds: ["de_gc_spoken_preterite_island_v1"],
    responsibility:
      "contrast known musste warten with hat/haben warten müssen without claiming an absolute register split",
  },
  {
    fromLessonId: "de_l29",
    constructIds: ["de_gc_limited_functional_genitive_v1"],
    responsibility:
      "preserve the exact delayed L29 bounded document relation at de_l30_c07_s49 without using Genitiv to generate a new modal-Perfekt frame",
  },
] as const;
const L30_PLAN_RECALL_AUTHORITY_SHA256 =
  "445b40b2409bc26790f0158dc72339df4592bc7af53b7bd5e506f3244c7683ea";
const L30_EVIDENCE_IDS = [
  "DE-GRM-MODALPERF-001",
  "DE-GRM-MODAL-001",
  "DE-GRM-PERFEKT-001",
  "DE-GRM-PAST-001",
] as const;
const L30_EVIDENCE_IDS_SHA256 =
  "4e01f56d92da435c5f3feddd4f26864e4b3b7b1f1c0a533200ce26227161014a";
const L30_PRODUCTIVE_NO_EXPANSION =
  "only the source-attested active modal Perfekt cluster hat/haben warten müssen with a known participant; no other lexical infinitive or modal";
const L30_EXCLUDED_NO_EXPANSION =
  "hätte or hätten, passive or werden clusters, missed-obligation counterfactuals, Plusquamperfekt, subordinate-clause auxiliary order, other lexical infinitives or modals, and general modal Perfekt production";
const L30_LEGAL_FUTURE_PROHIBITED_CONSTRUCT_IDS = [
  "de_gc_register_repair_mediation_v1",
  "de_gc_functional_b1_integration_v1",
] as const;
const L30_FORBIDDEN_ALREADY_INTRODUCED_CONSTRUCT_IDS = [
  "de_gc_event_passive_v1",
  "de_gc_state_passive_v1",
  "de_gc_werden_infinitive_meanings_v1",
] as const;
const L30_FORBIDDEN_PRODUCTIVE_SURFACES = [
  "hätte",
  "hätten",
  "passive",
  "werden",
  "worden",
  "wurde",
  "wurden",
] as const;
const L30_CANONICAL_OBJECT_SHA256 =
  "cacba03eeaad98dd132ede35b32e43ab93d25de87abe04b8350117e179b3bca9";
const L31_PLAN_RECALL_AUTHORITY = [
  {
    fromLessonId: "de_l19",
    constructIds: ["de_gc_formal_sie_sich_v1"],
    responsibility: "maintain formal reference under mediation pressure",
  },
  {
    fromLessonId: "de_l14",
    constructIds: ["de_gc_doch_response_contrast_v1"],
    responsibility:
      "reuse correction without treating disagreement as hostility",
  },
  {
    fromLessonId: "de_l30",
    constructIds: ["de_gc_limited_modal_perfekt_v1"],
    responsibility:
      "reformulate a bounded missed-obligation account without forcing the cluster into every response",
  },
] as const;
const L31_PLAN_RECALL_AUTHORITY_SHA256 =
  "690ee83181d4637f14df842202b0434336bb002a8f5699c4625a0d665ce3a738";
const L31_EVIDENCE_IDS = [
  "DE-RSCH-CEFR-002",
  "DE-RSCH-CEFR-008",
  "DE-RSCH-CEFR-009",
  "DE-REG-DUSIE-001",
] as const;
const L31_EVIDENCE_IDS_SHA256 =
  "af70ba975f650240bfbebb8a4d124f6b47a8c183727a34a0e4362243d504c016";
const L31_GRAMMAR_BOUNDARY = {
  productive:
    "neutral-register reformulation using known formal address, connector topology and corrective response frames",
  receptive: "clear familiar-domain positions and requests that need mediation",
  excluded:
    "a universal du-or-Sie workplace rule and any new hidden grammar operation",
} as const;
const L31_GRAMMAR_BOUNDARY_SHA256 =
  "17f92071b09f3abe3d33fa86adc23afecb0b9cd8d85672ef02992082a8690840";
const L31_CONSTRUCT_ROLE_SETS = {
  introduced: ["de_gc_register_repair_mediation_v1"],
  extended: [
    "de_gc_connector_topology_contrast_v1",
    "de_gc_doch_response_contrast_v1",
    "de_gc_formal_sie_sich_v1",
  ],
  reviewed: [
    "de_gc_relative_clause_gender_case_v1",
    "de_gc_limited_functional_genitive_v1",
    "de_gc_limited_modal_perfekt_v1",
  ],
  prohibited: ["de_gc_functional_b1_integration_v1"],
} as const;
const L31_CONSTRUCT_ROLE_SETS_SHA256 =
  "0205a64c59426d93e8bbdfea959f114e4b353aad04f875ec7287279a026740ff";
const L31_PREREQUISITE_LESSON_IDS = [
  "de_l01",
  "de_l02",
  "de_l04",
  "de_l05",
  "de_l06",
  "de_l08",
  "de_l14",
  "de_l17",
  "de_l18",
] as const;
const L31_PREREQUISITE_LESSON_IDS_SHA256 =
  "af4647a5c8ee74e6a5b49374eb3f87eb0a9c50935e2d08bf1e9edd9896d01492";
const L31_CHAPTER_OUTCOMES = [
  {
    id: "de_l31_ch01",
    ordinal: 1,
    outcome:
      "identify the main point and register relationship in a misunderstanding",
  },
  {
    id: "de_l31_ch02",
    ordinal: 2,
    outcome: "ask a neutral clarification question",
  },
  {
    id: "de_l31_ch03",
    ordinal: 3,
    outcome:
      "reformulate one person's spoken or written digital information for another",
  },
  {
    id: "de_l31_ch04",
    ordinal: 4,
    outcome: "correct a negative assumption without escalating tone",
  },
  {
    id: "de_l31_ch05",
    ordinal: 5,
    outcome: "mediate a workable next step between two positions",
  },
  {
    id: "de_l31_ch06",
    ordinal: 6,
    outcome: "repair address choice reference or connector topology",
  },
  {
    id: "de_l31_ch07",
    ordinal: 7,
    outcome:
      "transfer neutral mediation to a new mixed-register dispute through a short digital reply and spoken follow-up",
  },
] as const;
const L31_CHAPTER_OUTCOMES_SHA256 =
  "81b47a0bd202944bb155f79699c2d898438b27d7fe4c1a236688120574e80d95";
const L31_PRAGMATICS =
  "preserve each stated relationship, distinguish report from endorsement and avoid universal address defaults";
const L31_SESSION_56_FINAL = {
  sessionId: "de_l31_c07_s56",
  transferSituation:
    "read a short familiar-topic digital exchange, write a neutral reply that keeps the interaction moving, then mediate the misunderstanding and relay an agreed next step",
  requiredConstructIds: [
    "de_gc_register_repair_mediation_v1",
    "de_gc_connector_topology_contrast_v1",
    "de_gc_doch_response_contrast_v1",
    "de_gc_formal_sie_sich_v1",
    "de_gc_limited_modal_perfekt_v1",
  ],
  evidenceDimensions: [
    "reception",
    "production",
    "interaction",
    "mediation",
    "repair",
    "register",
    "changed_context_transfer",
  ],
  evidenceModes: ["written_digital_interaction", "spoken_interaction"],
  independent: true,
  changedContextRequired: true,
} as const;
const L31_SESSION_56_FINAL_SHA256 =
  "a7d5aa7b88c02a3c98ed19a7750f34a5fd12dff1cc1b9db3190bc2ca29f11593";
const L31_CANONICAL_OBJECT_SHA256 =
  "914369c6dd4f0255c2745fc4fd9358e866cfe95c75cf697549802cf0750a0d22";
const ACTIVE_BRACKET_CONSTRUCT_IDS = new Set([
  "de_gc_separable_verb_bracket_v1",
  "de_gc_modal_finite_bare_infinitive_v1",
  "de_gc_perfekt_haben_classes_v1",
  "de_gc_perfekt_sein_classes_v1",
  "de_gc_introduced_verbletzt_clause_v1",
  "de_gc_infinitive_verb_cluster_v1",
  "de_gc_event_passive_v1",
  "de_gc_state_passive_v1",
  "de_gc_werden_infinitive_meanings_v1",
  "de_gc_limited_modal_perfekt_v1",
]);
const PACKET_ID = /^de_l(\d{2})_c(\d{2})_s(\d{2})$/u;
const EVIDENCE_DIMENSIONS = new Set([
  "reception",
  "production",
  "interaction",
  "mediation",
  "repair",
  "register",
  "changed_context_transfer",
]);
const B1_EXIT_DIMENSIONS = [...EVIDENCE_DIMENSIONS];
const L32_EVIDENCE_MODES = [
  "written_digital_interaction",
  "spoken_interaction",
  "typed_mediation",
  "spoken_or_typed_production",
] as const;
const SCENARIO_DOMAINS = new Set([
  "everyday",
  "travel",
  "service",
  "work",
  "community",
]);
const evidenceIds = new Set<string>(
  GERMAN_RESEARCH_EVIDENCE_BINDINGS_DE_V1.map((binding) => binding.id),
);

function assertPlainRecord(
  value: unknown,
  label: string,
): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`plain_record_required:${label}`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`plain_record_required:${label}`);
  }
}

function assertClosedKeys(
  record: JsonRecord,
  keys: readonly string[],
  label: string,
): void {
  for (const key of Object.keys(record)) {
    if (!keys.includes(key)) throw new Error(`unknown_key:${label}:${key}`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(record, key))
      throw new Error(`missing_key:${label}:${key}`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`nonempty_string_required:${label}`);
}

function assertStringArray(
  value: unknown,
  label: string,
): asserts value is string[] {
  if (!Array.isArray(value)) throw new Error(`array_required:${label}`);
  const seen = new Set<string>();
  for (const item of value) {
    assertString(item, label);
    if (seen.has(item))
      throw new Error(`duplicate_array_item:${label}:${item}`);
    seen.add(item);
  }
}

function expectExact(value: unknown, expected: unknown, label: string): void {
  if (value !== expected) throw new Error(`${label}:${String(value)}`);
}

function hasExactL27PlanRecallAuthority(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const canonical = JSON.stringify(value);
  return (
    canonical === JSON.stringify(L27_PLAN_RECALL_AUTHORITY) &&
    createHash("sha256").update(canonical).digest("hex") ===
      L27_PLAN_RECALL_AUTHORITY_SHA256
  );
}

function hasExactL28PlanRecallAuthority(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const canonical = JSON.stringify(value);
  return (
    canonical === JSON.stringify(L28_PLAN_RECALL_AUTHORITY) &&
    createHash("sha256").update(canonical).digest("hex") ===
      L28_PLAN_RECALL_AUTHORITY_SHA256
  );
}

function hasExactL29PlanRecallAuthority(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const canonical = JSON.stringify(value);
  return (
    canonical === JSON.stringify(L29_PLAN_RECALL_AUTHORITY) &&
    createHash("sha256").update(canonical).digest("hex") ===
      L29_PLAN_RECALL_AUTHORITY_SHA256
  );
}
function hasExactL30PlanRecallAuthority(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const canonical = JSON.stringify(value);
  return (
    canonical === JSON.stringify(L30_PLAN_RECALL_AUTHORITY) &&
    createHash("sha256").update(canonical).digest("hex") ===
      L30_PLAN_RECALL_AUTHORITY_SHA256
  );
}

function hasExactL31PlanRecallAuthority(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const canonical = JSON.stringify(value);
  return (
    canonical === JSON.stringify(L31_PLAN_RECALL_AUTHORITY) &&
    createHash("sha256").update(canonical).digest("hex") ===
      L31_PLAN_RECALL_AUTHORITY_SHA256
  );
}

function hasExactL31Value(
  value: unknown,
  expected: unknown,
  expectedSha256: string,
): boolean {
  const canonical = JSON.stringify(value);
  return (
    canonical === JSON.stringify(expected) &&
    createHash("sha256").update(canonical).digest("hex") === expectedSha256
  );
}

function validateExactL31Authority(candidate: JsonRecord): void {
  if (
    !hasExactL31Value(
      candidate.evidenceIds,
      L31_EVIDENCE_IDS,
      L31_EVIDENCE_IDS_SHA256,
    )
  )
    throw new Error("l31_evidence_authority_invalid");

  if (
    JSON.stringify(candidate.introducedConstructIds) !==
    JSON.stringify(L31_CONSTRUCT_ROLE_SETS.introduced)
  )
    throw new Error("l31_introduced_construct_set_invalid");
  if (
    JSON.stringify(candidate.extendedConstructIds) !==
    JSON.stringify(L31_CONSTRUCT_ROLE_SETS.extended)
  )
    throw new Error("l31_extended_construct_set_invalid");
  if (
    JSON.stringify(candidate.reviewedConstructIds) !==
    JSON.stringify(L31_CONSTRUCT_ROLE_SETS.reviewed)
  )
    throw new Error("l31_reviewed_construct_set_invalid");
  if (
    JSON.stringify(candidate.prohibitedConstructIds) !==
    JSON.stringify(L31_CONSTRUCT_ROLE_SETS.prohibited)
  )
    throw new Error("l31_prohibited_construct_set_invalid");
  const roleSets = {
    introduced: candidate.introducedConstructIds,
    extended: candidate.extendedConstructIds,
    reviewed: candidate.reviewedConstructIds,
    prohibited: candidate.prohibitedConstructIds,
  };
  if (
    createHash("sha256").update(JSON.stringify(roleSets)).digest("hex") !==
    L31_CONSTRUCT_ROLE_SETS_SHA256
  )
    throw new Error("l31_construct_role_sets_identity_invalid");

  const grammar = candidate.grammarBoundary as JsonRecord;
  if (grammar.productive !== L31_GRAMMAR_BOUNDARY.productive)
    throw new Error("l31_productive_boundary_invalid");
  if (grammar.receptive !== L31_GRAMMAR_BOUNDARY.receptive)
    throw new Error("l31_receptive_boundary_invalid");
  if (grammar.excluded !== L31_GRAMMAR_BOUNDARY.excluded)
    throw new Error("l31_excluded_boundary_invalid");
  if (
    !hasExactL31Value(
      grammar,
      L31_GRAMMAR_BOUNDARY,
      L31_GRAMMAR_BOUNDARY_SHA256,
    )
  )
    throw new Error("l31_grammar_boundary_identity_invalid");

  if (
    !hasExactL31Value(
      candidate.chapterOutcomes,
      L31_CHAPTER_OUTCOMES,
      L31_CHAPTER_OUTCOMES_SHA256,
    )
  )
    throw new Error("l31_chapter_outcomes_invalid");
  if (candidate.pragmatics !== L31_PRAGMATICS)
    throw new Error("l31_pragmatics_register_invalid");

  const final = candidate.session56Final as JsonRecord;
  if (
    JSON.stringify(final.requiredConstructIds) !==
    JSON.stringify(L31_SESSION_56_FINAL.requiredConstructIds)
  )
    throw new Error("l31_final_required_constructs_invalid");
  if (
    !hasExactL31Value(final, L31_SESSION_56_FINAL, L31_SESSION_56_FINAL_SHA256)
  )
    throw new Error("l31_final_transfer_evidence_invalid");

  if (
    !hasExactL31Value(
      candidate.prerequisiteLessonIds,
      L31_PREREQUISITE_LESSON_IDS,
      L31_PREREQUISITE_LESSON_IDS_SHA256,
    )
  )
    throw new Error("l31_prerequisite_list_invalid");
}

function validateL31CanonicalObjectIdentity(candidate: JsonRecord): void {
  if (
    createHash("sha256").update(JSON.stringify(candidate)).digest("hex") !==
    L31_CANONICAL_OBJECT_SHA256
  )
    throw new Error("l31_canonical_object_identity_invalid");
}

function lessonOrdinalFromId(id: string, label: string): number {
  const match = LESSON_ID.exec(id);
  if (!match) throw new Error(`lesson_id_invalid:${label}:${id}`);
  return Number(match[1]);
}

function introductionPosition(packetId: string, label: string): number {
  const match = PACKET_ID.exec(packetId);
  if (!match)
    throw new Error(
      `construct_introduction_packet_invalid:${label}:${packetId}`,
    );
  return Number(match[1]) * 10_000 + Number(match[2]) * 100 + Number(match[3]);
}

function introductionLesson(packetId: string, label: string): number {
  const match = PACKET_ID.exec(packetId);
  if (!match)
    throw new Error(
      `construct_introduction_packet_invalid:${label}:${packetId}`,
    );
  return Number(match[1]);
}

function expectedCefrBand(ordinal: number): string {
  if (ordinal === 1) return "PRE_A1";
  if (ordinal <= 8) return "A1";
  if (ordinal <= 16) return "A2";
  return "B1";
}

function scanForEnglishContamination(value: unknown, path = "root"): void {
  if (typeof value === "string") {
    if (
      /(^|[^a-z0-9])en_l\d{2}([^a-z0-9]|$)/iu.test(value) ||
      /(^|[^a-z0-9])en_gc_/iu.test(value) ||
      /(?:^|[\\/])en(?:[\\/]|$)/iu.test(value) ||
      /episode_\d+/iu.test(value)
    )
      throw new Error(`english_contamination:${path}:${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanForEnglishContamination(item, `${path}[${index}]`),
    );
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value))
      scanForEnglishContamination(child, `${path}.${key}`);
  }
}

function validateTask3Chronology(
  constructs: readonly GrammarConstruct[],
): void {
  const byId = new Map(
    constructs.map((construct) => [construct.id, construct]),
  );
  for (const construct of constructs) {
    const dependentPosition = introductionPosition(
      construct.firstIntroductionPacketId,
      construct.id,
    );
    for (const prerequisiteId of construct.prerequisiteIds) {
      const prerequisite = byId.get(prerequisiteId);
      if (!prerequisite)
        throw new Error(
          `unknown_construct_prerequisite:${construct.id}:${prerequisiteId}`,
        );
      if (
        introductionPosition(
          prerequisite.firstIntroductionPacketId,
          prerequisite.id,
        ) >= dependentPosition
      ) {
        throw new Error(
          `future_construct_prerequisite:${construct.id}:${prerequisiteId}`,
        );
      }
    }
  }
}

function prerequisiteLessonClosure(
  introducedConstructIds: readonly string[],
  constructById: ReadonlyMap<string, GrammarConstruct>,
  lessonOrdinal: number,
): string[] {
  const prerequisiteConstructIds = new Set<string>();
  const visit = (constructId: string): void => {
    const construct = constructById.get(constructId);
    if (!construct)
      throw new Error(
        `unknown_construct_for_prerequisite_closure:${constructId}`,
      );
    for (const prerequisiteId of construct.prerequisiteIds) {
      if (prerequisiteConstructIds.has(prerequisiteId)) continue;
      prerequisiteConstructIds.add(prerequisiteId);
      visit(prerequisiteId);
    }
  };
  introducedConstructIds.forEach(visit);
  return [
    ...new Set(
      [...prerequisiteConstructIds]
        .map((constructId) =>
          introductionLesson(
            constructById.get(constructId)!.firstIntroductionPacketId,
            constructId,
          ),
        )
        .filter((ordinal) => ordinal < lessonOrdinal),
    ),
  ]
    .sort((left, right) => left - right)
    .map((ordinal) => `de_l${String(ordinal).padStart(2, "0")}`);
}

function validateBlueprint(
  raw: unknown,
  constructs: readonly GrammarConstruct[],
): void {
  assertPlainRecord(raw, "root");
  assertClosedKeys(raw, ROOT_KEYS, "root");
  scanForEnglishContamination(raw);
  expectExact(
    raw.schemaVersion,
    "learning-v2-german-lesson-boundaries.v1",
    "schema_version_invalid",
  );
  expectExact(raw.targetLanguage, "de", "target_language_invalid");

  assertPlainRecord(raw.sequencePolicy, "sequencePolicy");
  assertClosedKeys(
    raw.sequencePolicy,
    ["basis", "englishOrdinalReuse"],
    "sequencePolicy",
  );
  expectExact(
    raw.sequencePolicy.basis,
    "GERMAN_TASK3_DAG",
    "sequence_basis_invalid",
  );
  expectExact(
    raw.sequencePolicy.englishOrdinalReuse,
    "FORBIDDEN",
    "english_ordinal_reuse_not_forbidden",
  );

  assertPlainRecord(raw.topology, "topology");
  assertClosedKeys(
    raw.topology,
    [
      "lessons",
      "chaptersPerLesson",
      "sessionsPerLesson",
      "finalSessionOrdinal",
    ],
    "topology",
  );
  expectExact(raw.topology.lessons, 32, "topology_lesson_count_invalid");
  expectExact(
    raw.topology.chaptersPerLesson,
    7,
    "topology_chapter_count_invalid",
  );
  expectExact(
    raw.topology.sessionsPerLesson,
    56,
    "topology_session_count_invalid",
  );
  expectExact(
    raw.topology.finalSessionOrdinal,
    56,
    "topology_final_session_invalid",
  );

  assertPlainRecord(raw.standardPolicy, "standardPolicy");
  assertClosedKeys(
    raw.standardPolicy,
    ["production", "regionalReception"],
    "standardPolicy",
  );
  assertPlainRecord(raw.standardPolicy.production, "standardPolicy.production");
  assertClosedKeys(
    raw.standardPolicy.production,
    ["locale", "variety", "approvalStatus", "regionalProductionForbidden"],
    "standardPolicy.production",
  );
  expectExact(
    raw.standardPolicy.production.locale,
    "de-DE",
    "production_baseline_invalid",
  );
  assertString(
    raw.standardPolicy.production.variety,
    "standardPolicy.production.variety",
  );
  expectExact(
    raw.standardPolicy.production.approvalStatus,
    "OWNER_APPROVED",
    "production_approval_invalid",
  );
  assertStringArray(
    raw.standardPolicy.production.regionalProductionForbidden,
    "production.regionalProductionForbidden",
  );
  if (
    JSON.stringify(
      raw.standardPolicy.production.regionalProductionForbidden,
    ) !== JSON.stringify(["AT", "CH"])
  ) {
    throw new Error("dach_production_exclusion_invalid");
  }

  assertPlainRecord(
    raw.standardPolicy.regionalReception,
    "standardPolicy.regionalReception",
  );
  assertClosedKeys(
    raw.standardPolicy.regionalReception,
    [
      "regions",
      "policy",
      "inventoryDecisionId",
      "inventoryStatus",
      "approvedItemIds",
      "candidateItemIds",
    ],
    "standardPolicy.regionalReception",
  );
  assertStringArray(
    raw.standardPolicy.regionalReception.regions,
    "regionalReception.regions",
  );
  if (
    JSON.stringify(raw.standardPolicy.regionalReception.regions) !==
    JSON.stringify(["AT", "CH"])
  ) {
    throw new Error("dach_receptive_boundary_invalid");
  }
  expectExact(
    raw.standardPolicy.regionalReception.policy,
    "LABELLED_RECEPTIVE_ONLY",
    "dach_receptive_policy_invalid",
  );
  expectExact(
    raw.standardPolicy.regionalReception.inventoryDecisionId,
    "DE-OWNER-PENDING-001",
    "dach_inventory_decision_invalid",
  );
  expectExact(
    raw.standardPolicy.regionalReception.inventoryStatus,
    "PENDING_HOLD",
    "dach_inventory_status_invalid",
  );
  assertStringArray(
    raw.standardPolicy.regionalReception.approvedItemIds,
    "regionalReception.approvedItemIds",
  );
  assertStringArray(
    raw.standardPolicy.regionalReception.candidateItemIds,
    "regionalReception.candidateItemIds",
  );
  if (
    raw.standardPolicy.regionalReception.approvedItemIds.length !== 0 ||
    raw.standardPolicy.regionalReception.candidateItemIds.length !== 0
  )
    throw new Error("pending_regional_inventory_materialized");

  assertPlainRecord(raw.evidenceEnvelopePolicy, "evidenceEnvelopePolicy");
  assertClosedKeys(
    raw.evidenceEnvelopePolicy,
    [
      "introducedConstructEvidence",
      "extendedReviewedConstructEvidence",
      "additionalLessonEvidence",
    ],
    "evidenceEnvelopePolicy",
  );
  expectExact(
    raw.evidenceEnvelopePolicy.introducedConstructEvidence,
    "TASK3_EXACT_IDS_REQUIRED_AS_SUBSET",
    "introduced_evidence_policy_invalid",
  );
  expectExact(
    raw.evidenceEnvelopePolicy.extendedReviewedConstructEvidence,
    "CANONICAL_TASK3_REFERENCE_BY_CONSTRUCT_ID",
    "extended_reviewed_evidence_policy_invalid",
  );
  expectExact(
    raw.evidenceEnvelopePolicy.additionalLessonEvidence,
    "KNOWN_CAN_DO_PRAGMATICS_OR_STANDARD_IDS_ALLOWED",
    "additional_evidence_policy_invalid",
  );

  if (
    !Array.isArray(raw.ownerDecisionBoundary) ||
    raw.ownerDecisionBoundary.length !== 2
  ) {
    throw new Error("owner_decision_boundary_invalid");
  }
  const expectedPendingDecisions = [
    "DE-OWNER-PENDING-001",
    "DE-OWNER-PENDING-002",
  ];
  raw.ownerDecisionBoundary.forEach((candidate, index) => {
    assertPlainRecord(candidate, `ownerDecisionBoundary[${index}]`);
    assertClosedKeys(
      candidate,
      ["id", "status", "promotedToApproved"],
      `ownerDecisionBoundary[${index}]`,
    );
    expectExact(
      candidate.id,
      expectedPendingDecisions[index],
      "pending_owner_decision_id_invalid",
    );
    if (
      candidate.status !== "PENDING_HOLD" ||
      candidate.promotedToApproved !== false
    ) {
      throw new Error(
        `pending_owner_decision_promoted:${String(candidate.id)}`,
      );
    }
  });

  if (!Array.isArray(raw.lessons) || raw.lessons.length !== 32) {
    throw new Error(
      `lesson_count_invalid:${Array.isArray(raw.lessons) ? raw.lessons.length : "not_array"}`,
    );
  }
  validateTask3Chronology(constructs);
  const constructById = new Map(
    constructs.map((construct) => [construct.id, construct]),
  );
  if (constructById.size !== constructs.length)
    throw new Error("task3_construct_id_duplicate");
  const lessonIds = new Set<string>();
  const ordinals = new Set<number>();
  const introducedAcrossCourse = new Map<string, string>();
  const coveredDomains = new Set<string>();
  const canDoTerritories = new Set<string>();
  const chapterIds = new Set<string>();
  const chapterOutcomeTexts = new Set<string>();
  const finalSessionIds = new Set<string>();
  const finalTransferSituations = new Set<string>();

  raw.lessons.forEach((candidate, index) => {
    const expectedOrdinal = index + 1;
    assertPlainRecord(candidate, `lessons[${index}]`);
    assertClosedKeys(
      candidate,
      expectedOrdinal === 10 ? L10_LESSON_KEYS : LESSON_KEYS,
      `lessons[${index}]`,
    );
    assertString(candidate.id, `lessons[${index}].id`);
    if (/^en_/iu.test(candidate.id))
      throw new Error(`english_lesson_id:${candidate.id}`);
    const idOrdinal = lessonOrdinalFromId(candidate.id, `lessons[${index}].id`);
    if (lessonIds.has(candidate.id))
      throw new Error(`duplicate_lesson_id:${candidate.id}`);
    lessonIds.add(candidate.id);
    if (
      candidate.ordinal !== expectedOrdinal ||
      idOrdinal !== expectedOrdinal ||
      ordinals.has(expectedOrdinal)
    ) {
      throw new Error(
        `lesson_ordinal_invalid:${candidate.id}:${String(candidate.ordinal)}`,
      );
    }
    ordinals.add(expectedOrdinal);
    expectExact(
      candidate.cefrBand,
      expectedCefrBand(expectedOrdinal),
      `cefr_band_invalid:${candidate.id}`,
    );
    assertString(candidate.title, `${candidate.id}.title`);
    if (
      candidate.id === "de_l12" &&
      candidate.title !== "Wer bekommt was – und wohin?"
    ) {
      throw new Error("l12_active_contract_title_invalid");
    }
    assertString(candidate.scenario, `${candidate.id}.scenario`);
    assertString(candidate.canDoTerritory, `${candidate.id}.canDoTerritory`);
    if (canDoTerritories.has(candidate.canDoTerritory)) {
      throw new Error(`duplicate_can_do_territory:${candidate.id}`);
    }
    canDoTerritories.add(candidate.canDoTerritory);
    assertString(candidate.scenarioDomain, `${candidate.id}.scenarioDomain`);
    if (!SCENARIO_DOMAINS.has(candidate.scenarioDomain)) {
      throw new Error(
        `scenario_domain_invalid:${candidate.id}:${candidate.scenarioDomain}`,
      );
    }
    coveredDomains.add(candidate.scenarioDomain);

    assertPlainRecord(
      candidate.grammarBoundary,
      `${candidate.id}.grammarBoundary`,
    );
    assertClosedKeys(
      candidate.grammarBoundary,
      ["productive", "receptive", "excluded"],
      `${candidate.id}.grammarBoundary`,
    );
    for (const key of ["productive", "receptive", "excluded"] as const) {
      assertString(
        candidate.grammarBoundary[key],
        `${candidate.id}.grammarBoundary.${key}`,
      );
    }

    const constructArrayKeys = [
      "introducedConstructIds",
      "extendedConstructIds",
      "reviewedConstructIds",
      "prohibitedConstructIds",
    ] as const;
    for (const key of constructArrayKeys) {
      assertStringArray(candidate[key], `${candidate.id}.${key}`);
      for (const constructId of candidate[key]) {
        if (/^en_/iu.test(constructId))
          throw new Error(
            `english_construct_id:${candidate.id}:${constructId}`,
          );
        if (
          !CONSTRUCT_ID.test(constructId) ||
          !constructById.has(constructId)
        ) {
          throw new Error(
            `unknown_construct_reference:${candidate.id}:${key}:${constructId}`,
          );
        }
      }
    }
    if (expectedOrdinal === 31) validateExactL31Authority(candidate);
    const introducedConstructIds = candidate.introducedConstructIds as string[];
    const extendedConstructIds = candidate.extendedConstructIds as string[];
    const reviewedConstructIds = candidate.reviewedConstructIds as string[];
    const prohibitedConstructIds = candidate.prohibitedConstructIds as string[];
    const activeConstructs = [
      ...introducedConstructIds,
      ...extendedConstructIds,
      ...reviewedConstructIds,
    ];
    if (new Set(activeConstructs).size !== activeConstructs.length) {
      throw new Error(`construct_role_overlap:${candidate.id}`);
    }
    for (const constructId of introducedConstructIds) {
      const previousLesson = introducedAcrossCourse.get(constructId);
      if (previousLesson)
        throw new Error(
          `construct_introduced_twice:${constructId}:${previousLesson}:${candidate.id}`,
        );
      introducedAcrossCourse.set(constructId, candidate.id);
    }
    const expectedIntroduced = constructs
      .filter(
        (construct) =>
          introductionLesson(
            construct.firstIntroductionPacketId,
            construct.id,
          ) === expectedOrdinal,
      )
      .map((construct) => construct.id)
      .sort();
    assert.deepEqual(
      [...introducedConstructIds].sort(),
      expectedIntroduced,
      `task3_introduction_chronology_mismatch:${candidate.id}`,
    );
    for (const constructId of [
      ...extendedConstructIds,
      ...reviewedConstructIds,
    ]) {
      const construct = constructById.get(constructId)!;
      if (
        introductionLesson(construct.firstIntroductionPacketId, constructId) >=
        expectedOrdinal
      ) {
        throw new Error(
          `construct_not_available_for_recall:${candidate.id}:${constructId}`,
        );
      }
    }
    for (const constructId of prohibitedConstructIds) {
      const construct = constructById.get(constructId)!;
      if (
        introductionLesson(construct.firstIntroductionPacketId, constructId) <=
        expectedOrdinal
      ) {
        throw new Error(
          `prohibited_construct_not_future:${candidate.id}:${constructId}`,
        );
      }
    }

    assertStringArray(
      candidate.prerequisiteLessonIds,
      `${candidate.id}.prerequisiteLessonIds`,
    );
    for (const prerequisiteLessonId of candidate.prerequisiteLessonIds) {
      const prerequisiteOrdinal = lessonOrdinalFromId(
        prerequisiteLessonId,
        `${candidate.id}.prerequisiteLessonIds`,
      );
      if (prerequisiteOrdinal >= expectedOrdinal) {
        throw new Error(
          `lesson_prerequisite_not_earlier:${candidate.id}:${prerequisiteLessonId}`,
        );
      }
    }
    const expectedPrerequisiteLessonIds = prerequisiteLessonClosure(
      introducedConstructIds,
      constructById,
      expectedOrdinal,
    );
    if (
      JSON.stringify(candidate.prerequisiteLessonIds) !==
      JSON.stringify(expectedPrerequisiteLessonIds)
    ) {
      throw new Error(
        `lesson_prerequisite_closure_mismatch:${candidate.id}:expected=${expectedPrerequisiteLessonIds.join(",")}`,
      );
    }

    if (
      !Array.isArray(candidate.chapterOutcomes) ||
      candidate.chapterOutcomes.length !== 7
    ) {
      throw new Error(`chapter_count_invalid:${candidate.id}`);
    }
    const outcomes = new Set<string>();
    candidate.chapterOutcomes.forEach((chapter, chapterIndex) => {
      assertPlainRecord(
        chapter,
        `${candidate.id}.chapterOutcomes[${chapterIndex}]`,
      );
      assertClosedKeys(
        chapter,
        CHAPTER_KEYS,
        `${candidate.id}.chapterOutcomes[${chapterIndex}]`,
      );
      const chapterOrdinal = chapterIndex + 1;
      assertString(
        chapter.id,
        `${candidate.id}.chapterOutcomes[${chapterIndex}].id`,
      );
      expectExact(
        chapter.id,
        `${candidate.id}_ch${String(chapterOrdinal).padStart(2, "0")}`,
        `chapter_id_invalid:${candidate.id}`,
      );
      expectExact(
        chapter.ordinal,
        chapterOrdinal,
        `chapter_ordinal_invalid:${candidate.id}`,
      );
      assertString(
        chapter.outcome,
        `${candidate.id}.chapterOutcomes[${chapterIndex}].outcome`,
      );
      if (outcomes.has(chapter.outcome))
        throw new Error(`duplicate_chapter_outcome:${candidate.id}`);
      outcomes.add(chapter.outcome);
      if (chapterIds.has(chapter.id))
        throw new Error(`duplicate_global_chapter_id:${String(chapter.id)}`);
      chapterIds.add(chapter.id);
      if (chapterOutcomeTexts.has(chapter.outcome)) {
        throw new Error(
          `duplicate_global_chapter_outcome:${candidate.id}:${chapter.outcome}`,
        );
      }
      chapterOutcomeTexts.add(chapter.outcome);
    });

    assertStringArray(
      candidate.lexicalDomains,
      `${candidate.id}.lexicalDomains`,
    );
    if (candidate.lexicalDomains.length === 0)
      throw new Error(`lexical_domains_empty:${candidate.id}`);
    assertStringArray(
      candidate.plannedPronunciationTargetIds,
      `${candidate.id}.plannedPronunciationTargetIds`,
    );
    if (
      candidate.id === "de_l12" &&
      JSON.stringify(candidate.plannedPronunciationTargetIds) !==
        JSON.stringify(L12_PRONUNCIATION_TARGET_IDS)
    ) {
      throw new Error("l12_pronunciation_targets_invalid");
    }
    if (candidate.plannedPronunciationTargetIds.length === 0)
      throw new Error(`pronunciation_plan_empty:${candidate.id}`);
    for (const pronunciationId of candidate.plannedPronunciationTargetIds) {
      if (!PRONUNCIATION_PLAN_ID.test(pronunciationId)) {
        throw new Error(
          `pronunciation_plan_id_invalid:${candidate.id}:${pronunciationId}`,
        );
      }
    }
    if (
      candidate.plannedPronunciationTargetIds.includes(
        CLAUSE_BRACKET_RHYTHM_TARGET_ID,
      ) &&
      !activeConstructs.some((constructId) =>
        ACTIVE_BRACKET_CONSTRUCT_IDS.has(constructId),
      )
    ) {
      throw new Error(
        `pronunciation_bracket_target_without_active_construct:${candidate.id}`,
      );
    }
    expectExact(
      candidate.pronunciationPlanStatus,
      "PLANNED_TASK6_RECONCILIATION_REQUIRED",
      `pronunciation_plan_not_pending_task6:${candidate.id}`,
    );
    assertString(candidate.pragmatics, `${candidate.id}.pragmatics`);

    if (!Array.isArray(candidate.crossLessonRecall))
      throw new Error(`cross_lesson_recall_array_required:${candidate.id}`);
    if (expectedOrdinal > 1 && candidate.crossLessonRecall.length === 0) {
      throw new Error(`cross_lesson_recall_missing:${candidate.id}`);
    }
    if (
      expectedOrdinal === 27 &&
      !hasExactL27PlanRecallAuthority(candidate.crossLessonRecall)
    ) {
      throw new Error("l27_plan_recall_authority_invalid");
    }
    if (
      expectedOrdinal === 28 &&
      !hasExactL28PlanRecallAuthority(candidate.crossLessonRecall)
    ) {
      throw new Error("l28_plan_recall_authority_invalid");
    }
    if (
      expectedOrdinal === 29 &&
      !hasExactL29PlanRecallAuthority(candidate.crossLessonRecall)
    ) {
      throw new Error("l29_plan_recall_authority_invalid");
    }
    if (
      expectedOrdinal === 30 &&
      !hasExactL30PlanRecallAuthority(candidate.crossLessonRecall)
    )
      throw new Error("l30_plan_recall_authority_invalid");
    if (
      expectedOrdinal === 31 &&
      !hasExactL31PlanRecallAuthority(candidate.crossLessonRecall)
    )
      throw new Error("l31_plan_recall_authority_invalid");
    if (expectedOrdinal === 31) {
      validateExactL31Authority(candidate);
      validateL31CanonicalObjectIdentity(candidate);
    }
    candidate.crossLessonRecall.forEach((recall, recallIndex) => {
      assertPlainRecord(
        recall,
        `${candidate.id}.crossLessonRecall[${recallIndex}]`,
      );
      assertClosedKeys(
        recall,
        RECALL_KEYS,
        `${candidate.id}.crossLessonRecall[${recallIndex}]`,
      );
      assertString(
        recall.fromLessonId,
        `${candidate.id}.crossLessonRecall[${recallIndex}].fromLessonId`,
      );
      const fromOrdinal = lessonOrdinalFromId(
        recall.fromLessonId,
        `${candidate.id}.crossLessonRecall`,
      );
      if (fromOrdinal >= expectedOrdinal) {
        throw new Error(
          `cross_lesson_recall_not_prior:${candidate.id}:${recall.fromLessonId}`,
        );
      }
      assertStringArray(
        recall.constructIds,
        `${candidate.id}.crossLessonRecall[${recallIndex}].constructIds`,
      );
      if (recall.constructIds.length === 0)
        throw new Error(`cross_lesson_recall_constructs_empty:${candidate.id}`);
      for (const constructId of recall.constructIds) {
        const construct = constructById.get(constructId);
        if (!construct)
          throw new Error(
            `unknown_recall_construct:${candidate.id}:${constructId}`,
          );
        const exactIntroductionOrdinal = introductionLesson(
          construct.firstIntroductionPacketId,
          constructId,
        );
        if (exactIntroductionOrdinal !== fromOrdinal) {
          throw new Error(
            `recall_provenance_mismatch:${candidate.id}:${constructId}:expected=de_l${String(exactIntroductionOrdinal).padStart(2, "0")}`,
          );
        }
      }
      assertString(
        recall.responsibility,
        `${candidate.id}.crossLessonRecall[${recallIndex}].responsibility`,
      );
    });

    assertPlainRecord(
      candidate.session56Final,
      `${candidate.id}.session56Final`,
    );
    const expectedSessionKeys =
      expectedOrdinal === 32
        ? L32_SESSION_KEYS
        : expectedOrdinal === 31
          ? LATE_B1_SESSION_KEYS
          : SESSION_56_KEYS;
    assertClosedKeys(
      candidate.session56Final,
      expectedSessionKeys,
      `${candidate.id}.session56Final`,
    );
    expectExact(
      candidate.session56Final.sessionId,
      `${candidate.id}_c07_s56`,
      `session56_contract_invalid:${candidate.id}`,
    );
    assertString(
      candidate.session56Final.transferSituation,
      `${candidate.id}.session56Final.transferSituation`,
    );
    if (finalSessionIds.has(candidate.session56Final.sessionId as string)) {
      throw new Error(`duplicate_final_session_id:${candidate.id}`);
    }
    finalSessionIds.add(candidate.session56Final.sessionId as string);
    if (
      finalTransferSituations.has(candidate.session56Final.transferSituation)
    ) {
      throw new Error(`duplicate_final_transfer_situation:${candidate.id}`);
    }
    finalTransferSituations.add(candidate.session56Final.transferSituation);
    assertStringArray(
      candidate.session56Final.requiredConstructIds,
      `${candidate.id}.session56Final.requiredConstructIds`,
    );
    if (candidate.session56Final.requiredConstructIds.length === 0) {
      throw new Error(`session56_required_constructs_empty:${candidate.id}`);
    }
    for (const constructId of candidate.session56Final.requiredConstructIds) {
      const construct = constructById.get(constructId);
      if (!construct)
        throw new Error(
          `unknown_session56_construct:${candidate.id}:${constructId}`,
        );
      if (
        introductionLesson(construct.firstIntroductionPacketId, constructId) >
        expectedOrdinal
      ) {
        throw new Error(
          `future_session56_construct:${candidate.id}:${constructId}`,
        );
      }
    }
    for (const introducedId of introducedConstructIds) {
      if (
        !candidate.session56Final.requiredConstructIds.includes(introducedId)
      ) {
        throw new Error(
          `introduced_construct_missing_from_final:${candidate.id}:${introducedId}`,
        );
      }
    }
    assertStringArray(
      candidate.session56Final.evidenceDimensions,
      `${candidate.id}.session56Final.evidenceDimensions`,
    );
    for (const dimension of candidate.session56Final.evidenceDimensions) {
      if (!EVIDENCE_DIMENSIONS.has(dimension))
        throw new Error(
          `evidence_dimension_invalid:${candidate.id}:${dimension}`,
        );
    }
    for (const requiredDimension of [
      "reception",
      "production",
      "interaction",
      "changed_context_transfer",
    ]) {
      if (
        !candidate.session56Final.evidenceDimensions.includes(requiredDimension)
      ) {
        throw new Error(
          `session56_core_dimension_missing:${candidate.id}:${requiredDimension}`,
        );
      }
    }
    expectExact(
      candidate.session56Final.independent,
      true,
      `session56_not_independent:${candidate.id}`,
    );
    expectExact(
      candidate.session56Final.changedContextRequired,
      true,
      `session56_changed_context_missing:${candidate.id}`,
    );

    if (expectedOrdinal >= 31) {
      assertStringArray(
        candidate.session56Final.evidenceModes,
        `${candidate.id}.session56Final.evidenceModes`,
      );
      if (
        !candidate.session56Final.evidenceModes.includes(
          "written_digital_interaction",
        )
      ) {
        throw new Error(
          `late_b1_written_digital_interaction_missing:${candidate.id}`,
        );
      }
    }
    if (expectedOrdinal === 32) {
      if (
        JSON.stringify(candidate.session56Final.evidenceModes) !==
        JSON.stringify(L32_EVIDENCE_MODES)
      ) {
        throw new Error("l32_evidence_modes_invalid");
      }
      assertStringArray(
        candidate.session56Final.contextSelectedConstructIds,
        `${candidate.id}.session56Final.contextSelectedConstructIds`,
      );
      for (const constructId of candidate.session56Final
        .contextSelectedConstructIds) {
        const construct = constructById.get(constructId);
        if (!construct)
          throw new Error(`unknown_context_selected_construct:${constructId}`);
        if (
          introductionLesson(
            construct.firstIntroductionPacketId,
            constructId,
          ) >= expectedOrdinal
        ) {
          throw new Error(
            `context_selected_construct_not_prior:${constructId}`,
          );
        }
        if (
          candidate.session56Final.requiredConstructIds.includes(constructId)
        ) {
          throw new Error(
            `context_selected_construct_also_required:${constructId}`,
          );
        }
      }
      assertPlainRecord(
        candidate.session56Final.contextSelectionRule,
        `${candidate.id}.contextSelectionRule`,
      );
      assertClosedKeys(
        candidate.session56Final.contextSelectionRule,
        ["minimum", "maximum", "policy"],
        `${candidate.id}.contextSelectionRule`,
      );
      expectExact(
        candidate.session56Final.contextSelectionRule.minimum,
        0,
        "l32_context_selection_minimum_invalid",
      );
      expectExact(
        candidate.session56Final.contextSelectionRule.maximum,
        2,
        "l32_context_selection_maximum_invalid",
      );
      expectExact(
        candidate.session56Final.contextSelectionRule.policy,
        "CONTEXT_REQUIRED_NOT_CHECKLIST",
        "l32_context_selection_policy_invalid",
      );
      if (
        !Array.isArray(candidate.session56Final.assessmentStrands) ||
        candidate.session56Final.assessmentStrands.length !== 4
      ) {
        throw new Error("l32_assessment_strands_missing");
      }
      const strandIds = new Set<string>();
      const strandDimensions = new Set<string>();
      const strandModes: string[] = [];
      let hasWrittenDigitalStrand = false;
      candidate.session56Final.assessmentStrands.forEach(
        (strand, strandIndex) => {
          assertPlainRecord(
            strand,
            `${candidate.id}.assessmentStrands[${strandIndex}]`,
          );
          assertClosedKeys(
            strand,
            ASSESSMENT_STRAND_KEYS,
            `${candidate.id}.assessmentStrands[${strandIndex}]`,
          );
          assertString(
            strand.id,
            `${candidate.id}.assessmentStrands[${strandIndex}].id`,
          );
          assertString(
            strand.mode,
            `${candidate.id}.assessmentStrands[${strandIndex}].mode`,
          );
          assertString(
            strand.task,
            `${candidate.id}.assessmentStrands[${strandIndex}].task`,
          );
          assertStringArray(
            strand.evidenceDimensions,
            `${candidate.id}.assessmentStrands[${strandIndex}].evidenceDimensions`,
          );
          if (strandIds.has(strand.id))
            throw new Error(`duplicate_l32_assessment_strand:${strand.id}`);
          strandIds.add(strand.id);
          if (
            !(
              (candidate.session56Final as JsonRecord).evidenceModes as string[]
            ).includes(strand.mode)
          ) {
            throw new Error(
              `l32_strand_mode_undeclared:${strand.id}:${strand.mode}`,
            );
          }
          strandModes.push(strand.mode);
          if (strand.mode === "written_digital_interaction")
            hasWrittenDigitalStrand = true;
          for (const dimension of strand.evidenceDimensions) {
            if (!EVIDENCE_DIMENSIONS.has(dimension))
              throw new Error(`l32_strand_dimension_invalid:${dimension}`);
            strandDimensions.add(dimension);
          }
        },
      );
      if (
        new Set(strandModes).size !== L32_EVIDENCE_MODES.length ||
        JSON.stringify([...strandModes].sort()) !==
          JSON.stringify([...L32_EVIDENCE_MODES].sort())
      ) {
        throw new Error("l32_strand_mode_bijection_invalid");
      }
      if (!hasWrittenDigitalStrand)
        throw new Error("l32_written_digital_strand_missing");
      for (const dimension of B1_EXIT_DIMENSIONS) {
        if (!strandDimensions.has(dimension))
          throw new Error(`l32_strand_dimension_missing:${dimension}`);
      }
      if (
        JSON.stringify(candidate.session56Final.requiredConstructIds) !==
        JSON.stringify([
          "de_gc_functional_b1_integration_v1",
          "de_gc_register_repair_mediation_v1",
        ])
      ) {
        throw new Error("l32_required_core_constructs_invalid");
      }
    }
    if (expectedOrdinal === 10) {
      assertPlainRecord(
        candidate.localRelationContract,
        `${candidate.id}.localRelationContract`,
      );
      assertClosedKeys(
        candidate.localRelationContract,
        LOCAL_RELATION_CONTRACT_KEYS,
        `${candidate.id}.localRelationContract`,
      );
      expectExact(
        candidate.localRelationContract.constructId,
        "de_gc_local_preposition_governed_case_v1",
        "l10_local_relation_construct_invalid",
      );
      assertStringArray(
        candidate.localRelationContract.licensedSemantics,
        `${candidate.id}.localRelationContract.licensedSemantics`,
      );
      assertStringArray(
        candidate.localRelationContract.forbiddenSemantics,
        `${candidate.id}.localRelationContract.forbiddenSemantics`,
      );
      assertStringArray(
        candidate.localRelationContract.evidenceAnchors,
        `${candidate.id}.localRelationContract.evidenceAnchors`,
      );
      const expectedAnchors = [
        "scenario",
        "canDoTerritory",
        "grammarBoundary.productive",
        "grammarBoundary.receptive",
        "de_l10_ch05",
        "de_l10_ch07",
        "session56Final.transferSituation",
      ];
      if (
        JSON.stringify(candidate.localRelationContract.licensedSemantics) !==
          JSON.stringify(["DIRECTIONAL_PATH", "BOUNDED_DESTINATION"]) ||
        JSON.stringify(candidate.localRelationContract.forbiddenSemantics) !==
          JSON.stringify(["STATIC_LOCATION", "DATIVE_LOCATION"]) ||
        JSON.stringify(candidate.localRelationContract.evidenceAnchors) !==
          JSON.stringify(expectedAnchors)
      ) {
        throw new Error("l10_local_relation_contract_invalid");
      }
      const chapterById = new Map(
        candidate.chapterOutcomes.map((chapter) => {
          const record = chapter as JsonRecord;
          return [record.id as string, record.outcome as string];
        }),
      );
      const anchoredText = new Map<string, string>([
        ["scenario", candidate.scenario],
        ["canDoTerritory", candidate.canDoTerritory],
        [
          "grammarBoundary.productive",
          (candidate.grammarBoundary as JsonRecord).productive as string,
        ],
        [
          "grammarBoundary.receptive",
          (candidate.grammarBoundary as JsonRecord).receptive as string,
        ],
        ["de_l10_ch05", chapterById.get("de_l10_ch05")!],
        ["de_l10_ch07", chapterById.get("de_l10_ch07")!],
        [
          "session56Final.transferSituation",
          candidate.session56Final.transferSituation,
        ],
      ]);
      for (const anchor of expectedAnchors) {
        const text = anchoredText.get(anchor)!;
        if (
          !/\bequipment\b/iu.test(text) ||
          !/\b(?:mov(?:e|es|ing|ement)|destination|direction|route|path)\b/iu.test(
            text,
          ) ||
          /\b(?:stand|stands|standing|static)\b/iu.test(text)
        ) {
          throw new Error(`l10_directional_anchor_invalid:${anchor}`);
        }
      }
      if (
        /delivery negotiation/iu.test(
          (candidate.grammarBoundary as JsonRecord).receptive as string,
        )
      ) {
        throw new Error("l10_stale_delivery_negotiation");
      }
    }

    assertString(
      candidate.accessibilityAlternative,
      `${candidate.id}.accessibilityAlternative`,
    );
    assertStringArray(candidate.evidenceIds, `${candidate.id}.evidenceIds`);
    if (candidate.evidenceIds.length === 0)
      throw new Error(`evidence_ids_empty:${candidate.id}`);
    for (const evidenceId of candidate.evidenceIds) {
      if (!evidenceIds.has(evidenceId))
        throw new Error(
          `unknown_research_evidence:${candidate.id}:${evidenceId}`,
        );
    }
    const introducedEvidenceIds = new Set(
      introducedConstructIds.flatMap(
        (constructId) => constructById.get(constructId)!.evidenceIds,
      ),
    );
    for (const evidenceId of introducedEvidenceIds) {
      if (!candidate.evidenceIds.includes(evidenceId)) {
        throw new Error(
          `introduced_construct_evidence_missing:${candidate.id}:${evidenceId}`,
        );
      }
    }
    if (
      candidate.id === "de_l13" &&
      JSON.stringify(candidate.evidenceIds) !==
        JSON.stringify(["DE-GRM-ADJ-001", "DE-GRM-NP-001", "DE-GRM-CASE-001"])
    ) {
      throw new Error(
        "introduced_construct_evidence_missing:de_l13:DE-GRM-ADJ-001",
      );
    }
    if (candidate.id === "de_l15") {
      const chapter04 = candidate.chapterOutcomes.find(
        (chapter) => (chapter as JsonRecord).id === "de_l15_ch04",
      ) as JsonRecord;
      if (
        chapter04.outcome !==
        "sequence two completed errands with newly grounded temporal adverbs zuerst and dann"
      ) {
        throw new Error("l15_c04_sequence_lexical_contract_invalid");
      }
    }
    if (
      expectedOrdinal >= 31 &&
      !candidate.evidenceIds.includes("DE-RSCH-CEFR-009")
    ) {
      throw new Error(
        `late_b1_digital_research_binding_missing:${candidate.id}`,
      );
    }
    expectExact(
      candidate.uncertaintyStatus,
      "RESOLVED_WITHIN_TASK4",
      `uncertainty_status_invalid:${candidate.id}`,
    );
    if (expectedOrdinal === 24) {
      if (candidate.grammarBoundary.receptive !== L24_RECEPTIVE_BOUNDARY) {
        throw new Error("l24_finite_separable_receptive_boundary_invalid");
      }
      const l24Recalls = candidate.crossLessonRecall as JsonRecord[];
      const l08Recalls = l24Recalls.filter(
        (recall) => recall.fromLessonId === "de_l08",
      );
      if (l08Recalls.length !== 1) {
        throw new Error("l24_l08_separable_recall_count_invalid");
      }
      const l08Recall = l08Recalls[0];
      if (
        JSON.stringify(l08Recall.constructIds) !==
        JSON.stringify(["de_gc_separable_verb_bracket_v1"])
      ) {
        throw new Error("l24_l08_separable_recall_construct_invalid");
      }
      if (l08Recall.responsibility !== L24_L08_RECALL_RESPONSIBILITY) {
        throw new Error("l24_partizip_not_finite_separable_guard_invalid");
      }
      if (
        JSON.stringify(l24Recalls) !== JSON.stringify(L24_CROSS_LESSON_RECALL)
      ) {
        throw new Error("l24_cross_lesson_recall_contract_invalid");
      }
      const l24Final = candidate.session56Final as JsonRecord;
      if (
        !(l24Final.requiredConstructIds as string[]).includes(
          "de_gc_separable_verb_bracket_v1",
        )
      ) {
        throw new Error("l24_separable_final_evidence_invalid");
      }
      const l24CanonicalObjectSha256 = createHash("sha256")
        .update(JSON.stringify(candidate))
        .digest("hex");
      if (l24CanonicalObjectSha256 !== L24_CANONICAL_OBJECT_SHA256) {
        throw new Error("l24_canonical_object_identity_invalid");
      }
    }
    if (expectedOrdinal === 27) {
      const l27CanonicalObjectSha256 = createHash("sha256")
        .update(JSON.stringify(candidate))
        .digest("hex");
      if (l27CanonicalObjectSha256 !== L27_CANONICAL_OBJECT_SHA256) {
        throw new Error("l27_canonical_object_identity_invalid");
      }
    }
    if (expectedOrdinal === 28) {
      const l28CanonicalObjectSha256 = createHash("sha256")
        .update(JSON.stringify(candidate))
        .digest("hex");
      if (l28CanonicalObjectSha256 !== L28_CANONICAL_OBJECT_SHA256) {
        throw new Error("l28_canonical_object_identity_invalid");
      }
    }
    if (expectedOrdinal === 29) {
      if (
        JSON.stringify(candidate.evidenceIds) !==
          JSON.stringify(L29_EVIDENCE_IDS) ||
        createHash("sha256")
          .update(JSON.stringify(candidate.evidenceIds))
          .digest("hex") !== L29_EVIDENCE_IDS_SHA256
      ) {
        throw new Error("l29_evidence_authority_invalid");
      }
      const l29CanonicalObjectSha256 = createHash("sha256")
        .update(JSON.stringify(candidate))
        .digest("hex");
      if (l29CanonicalObjectSha256 !== L29_CANONICAL_OBJECT_SHA256) {
        throw new Error("l29_canonical_object_identity_invalid");
      }
    }
    if (expectedOrdinal === 30) {
      const grammar = candidate.grammarBoundary as JsonRecord;
      const final = candidate.session56Final as JsonRecord;
      const surface = [
        candidate.title,
        candidate.scenario,
        candidate.canDoTerritory,
        grammar.productive,
        ...(candidate.chapterOutcomes as JsonRecord[]).map((c) => c.outcome),
        ...(candidate.lexicalDomains as string[]),
        candidate.pragmatics,
        final.transferSituation,
        candidate.accessibilityAlternative,
      ]
        .join(" ")
        .toLowerCase();
      for (const forbidden of L30_FORBIDDEN_PRODUCTIVE_SURFACES)
        if (surface.includes(forbidden))
          throw new Error(`l30_forbidden_productive_surface:${forbidden}`);
      if (grammar.productive !== L30_PRODUCTIVE_NO_EXPANSION)
        throw new Error("l30_productive_no_expansion_invalid");
      if (grammar.excluded !== L30_EXCLUDED_NO_EXPANSION)
        throw new Error("l30_excluded_no_expansion_invalid");
      if (
        JSON.stringify(candidate.prohibitedConstructIds) !==
        JSON.stringify(L30_LEGAL_FUTURE_PROHIBITED_CONSTRUCT_IDS)
      )
        throw new Error("l30_future_prohibited_contract_invalid");
      const active = [
        ...(candidate.introducedConstructIds as string[]),
        ...(candidate.extendedConstructIds as string[]),
        ...(candidate.reviewedConstructIds as string[]),
        ...(final.requiredConstructIds as string[]),
      ];
      for (const forbidden of L30_FORBIDDEN_ALREADY_INTRODUCED_CONSTRUCT_IDS)
        if (active.includes(forbidden))
          throw new Error(`l30_forbidden_known_construct:${forbidden}`);
      if (
        JSON.stringify(candidate.evidenceIds) !==
          JSON.stringify(L30_EVIDENCE_IDS) ||
        createHash("sha256")
          .update(JSON.stringify(candidate.evidenceIds))
          .digest("hex") !== L30_EVIDENCE_IDS_SHA256
      )
        throw new Error("l30_evidence_authority_invalid");
      if (
        createHash("sha256").update(JSON.stringify(candidate)).digest("hex") !==
        L30_CANONICAL_OBJECT_SHA256
      )
        throw new Error("l30_canonical_object_identity_invalid");
    }
  });

  for (const domain of SCENARIO_DOMAINS) {
    if (!coveredDomains.has(domain))
      throw new Error(`can_do_domain_missing:${domain}`);
  }
  const hasA2WorkCanDo = raw.lessons.some((lessonCandidate, index) => {
    const lesson = lessonCandidate as JsonRecord;
    return (
      index + 1 >= 9 && index + 1 <= 16 && lesson.scenarioDomain === "work"
    );
  });
  if (!hasA2WorkCanDo) throw new Error("a2_work_domain_missing");
  if (introducedAcrossCourse.size !== constructById.size) {
    const missing = [...constructById.keys()].filter(
      (id) => !introducedAcrossCourse.has(id),
    );
    throw new Error(`task3_construct_coverage_incomplete:${missing.join(",")}`);
  }
  for (const construct of constructs) {
    const introductionOrdinal = introductionLesson(
      construct.firstIntroductionPacketId,
      construct.id,
    );
    const lifecycleLessonOrdinals = new Set<number>();
    for (const key of LIFECYCLE_TARGET_KEYS) {
      for (const packetId of construct[key]) {
        lifecycleLessonOrdinals.add(
          introductionLesson(packetId, `${construct.id}.${key}`),
        );
      }
    }
    for (const lifecycleOrdinal of lifecycleLessonOrdinals) {
      const lifecycleLesson = raw.lessons[lifecycleOrdinal - 1] as JsonRecord;
      if (!lifecycleLesson)
        throw new Error(
          `lifecycle_target_lesson_missing:${construct.id}:${lifecycleOrdinal}`,
        );
      const lifecycleLessonId = lifecycleLesson.id as string;
      const roleIds = [
        ...(lifecycleLesson.introducedConstructIds as string[]),
        ...(lifecycleLesson.extendedConstructIds as string[]),
        ...(lifecycleLesson.reviewedConstructIds as string[]),
      ];
      if (!roleIds.includes(construct.id)) {
        throw new Error(
          `lifecycle_role_ownership_missing:${construct.id}:${lifecycleLessonId}`,
        );
      }
      const final = lifecycleLesson.session56Final as JsonRecord;
      if (!(final.requiredConstructIds as string[]).includes(construct.id)) {
        throw new Error(
          `lifecycle_final_ownership_missing:${construct.id}:${lifecycleLessonId}`,
        );
      }
      if (lifecycleOrdinal > introductionOrdinal) {
        const recalls = lifecycleLesson.crossLessonRecall as JsonRecord[];
        if (
          !recalls.some((recall) =>
            (recall.constructIds as string[]).includes(construct.id),
          )
        ) {
          throw new Error(
            `lifecycle_recall_ownership_missing:${construct.id}:${lifecycleLessonId}`,
          );
        }
      }
    }
  }
  const lesson32 = raw.lessons[31] as JsonRecord;
  const lesson32Final = lesson32.session56Final as JsonRecord;
  const lesson32Dimensions = lesson32Final.evidenceDimensions as string[];
  for (const dimension of B1_EXIT_DIMENSIONS) {
    if (!lesson32Dimensions.includes(dimension))
      throw new Error(`b1_exit_dimensions_missing:${dimension}`);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectFailure(
  blueprint: unknown,
  constructs: readonly GrammarConstruct[],
  mutate: (candidate: JsonRecord, grammar: GrammarConstruct[]) => void,
  expected: RegExp,
): void {
  const candidate = clone(blueprint) as JsonRecord;
  const grammar = clone(constructs) as GrammarConstruct[];
  mutate(candidate, grammar);
  let validationError: unknown;
  try {
    validateBlueprint(candidate, grammar);
  } catch (error) {
    validationError = error;
  }
  assert.ok(validationError instanceof Error, "validation failure expected");
  assert.match(validationError.message, expected);
}

const raw = JSON.parse(readFileSync(LESSONS_PATH, "utf8")) as unknown;
const constructs = JSON.parse(
  readFileSync(CONSTRUCTS_PATH, "utf8"),
) as GrammarConstruct[];
const directL27AuthorityProbe = clone(
  ((raw as JsonRecord).lessons as JsonRecord[])[26].crossLessonRecall,
) as JsonRecord[];
assert.equal(
  hasExactL27PlanRecallAuthority(directL27AuthorityProbe.slice(0, 2)),
  false,
  "L27 authority must fail when the required L18/L24/L25 rows are absent",
);
assert.equal(
  hasExactL27PlanRecallAuthority(clone(L27_PLAN_RECALL_AUTHORITY)),
  true,
  "L27 authority must pass only for the exact five-row contract",
);
const directL28AuthorityProbe = clone(
  ((raw as JsonRecord).lessons as JsonRecord[])[27].crossLessonRecall,
) as JsonRecord[];
assert.equal(
  hasExactL28PlanRecallAuthority(directL28AuthorityProbe.slice(0, 1)),
  false,
  "L28 authority must fail while the required L15/L18 rows are absent",
);
assert.equal(
  hasExactL28PlanRecallAuthority(clone(L28_PLAN_RECALL_AUTHORITY)),
  true,
  "L28 authority must pass only for the exact ordered three-row contract",
);
assert.equal(
  hasExactL29PlanRecallAuthority(clone(L29_PLAN_RECALL_AUTHORITY)),
  true,
  "L29 authority must pass only for the exact ordered four-row contract",
);
assert.equal(
  hasExactL30PlanRecallAuthority(clone(L30_PLAN_RECALL_AUTHORITY)),
  true,
  "L30 authority must pass only for the exact ordered five-row contract",
);
assert.equal(
  hasExactL31PlanRecallAuthority(clone(L31_PLAN_RECALL_AUTHORITY)),
  true,
  "L31 authority must pass only for the exact ordered three-row contract",
);
validateBlueprint(raw, constructs);

const expectL31Failure = (
  mutate: (lesson31: JsonRecord) => void,
  expected: RegExp,
): void =>
  expectFailure(
    raw,
    constructs,
    (candidate) => mutate((candidate.lessons as JsonRecord[])[30]),
    expected,
  );

// H01-H04: exact L19 recall row.
expectL31Failure((lesson) => {
  lesson.crossLessonRecall = (lesson.crossLessonRecall as JsonRecord[]).filter(
    (row) => row.fromLessonId !== "de_l19",
  );
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[])[0].fromLessonId = "de_l18";
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[])[0].constructIds = [
    "de_gc_connector_topology_contrast_v1",
  ];
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[])[0].responsibility =
    "maintain formal reference";
}, /^l31_plan_recall_authority_invalid$/u);

// H05-H08: exact L14 recall row.
expectL31Failure((lesson) => {
  lesson.crossLessonRecall = (lesson.crossLessonRecall as JsonRecord[]).filter(
    (row) => row.fromLessonId !== "de_l14",
  );
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[])[1].fromLessonId = "de_l13";
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[])[1].constructIds = [
    "de_gc_formal_sie_sich_v1",
  ];
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[])[1].responsibility =
    "reuse correction";
}, /^l31_plan_recall_authority_invalid$/u);

// H09-H12: exact L30 recall row.
expectL31Failure((lesson) => {
  lesson.crossLessonRecall = (lesson.crossLessonRecall as JsonRecord[]).filter(
    (row) => row.fromLessonId !== "de_l30",
  );
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[])[2].fromLessonId = "de_l29";
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[])[2].constructIds = [
    "de_gc_limited_functional_genitive_v1",
  ];
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[])[2].responsibility =
    "reformulate a missed-obligation account";
}, /^l31_plan_recall_authority_invalid$/u);

// H13-H14: recall order and exact cardinality.
expectL31Failure((lesson) => {
  const rows = lesson.crossLessonRecall as JsonRecord[];
  lesson.crossLessonRecall = [rows[1], rows[0], rows[2]];
}, /^l31_plan_recall_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.crossLessonRecall as JsonRecord[]).push({
    fromLessonId: "de_l01",
    constructIds: ["de_gc_statement_v2_v1"],
    responsibility: "extra recall row",
  });
}, /^l31_plan_recall_authority_invalid$/u);

// H15-H20: evidence omissions, order and exact cardinality.
for (const evidenceId of L31_EVIDENCE_IDS)
  expectL31Failure((lesson) => {
    lesson.evidenceIds = (lesson.evidenceIds as string[]).filter(
      (id) => id !== evidenceId,
    );
  }, /^l31_evidence_authority_invalid$/u);
expectL31Failure((lesson) => {
  const evidence = lesson.evidenceIds as string[];
  lesson.evidenceIds = [evidence[1], evidence[0], evidence[2], evidence[3]];
}, /^l31_evidence_authority_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.evidenceIds as string[]).push("DE-GRM-MODALPERF-001");
}, /^l31_evidence_authority_invalid$/u);

// H21-H24: exact construct-role sets and order.
expectL31Failure((lesson) => {
  lesson.introducedConstructIds = [];
}, /^l31_introduced_construct_set_invalid$/u);
expectL31Failure((lesson) => {
  const ids = lesson.extendedConstructIds as string[];
  lesson.extendedConstructIds = [ids[1], ids[0], ids[2]];
}, /^l31_extended_construct_set_invalid$/u);
expectL31Failure((lesson) => {
  const ids = lesson.reviewedConstructIds as string[];
  lesson.reviewedConstructIds = [ids[1], ids[0], ids[2]];
}, /^l31_reviewed_construct_set_invalid$/u);
expectL31Failure((lesson) => {
  lesson.prohibitedConstructIds = [];
}, /^l31_prohibited_construct_set_invalid$/u);

// H25-H27: productive, receptive and excluded grammar boundaries.
expectL31Failure((lesson) => {
  (lesson.grammarBoundary as JsonRecord).productive =
    "general register repair with new grammar";
}, /^l31_productive_boundary_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.grammarBoundary as JsonRecord).receptive =
    "all positions and requests that need mediation";
}, /^l31_receptive_boundary_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.grammarBoundary as JsonRecord).excluded =
    "a universal du-or-Sie workplace rule";
}, /^l31_excluded_boundary_invalid$/u);

// H28-H32: outcomes, pragmatics, final and fallback canonical identity.
expectL31Failure((lesson) => {
  (lesson.chapterOutcomes as JsonRecord[])[0].outcome =
    "identify any relationship in any misunderstanding";
}, /^l31_chapter_outcomes_invalid$/u);
expectL31Failure((lesson) => {
  lesson.pragmatics = "choose the correct address form for every workplace";
}, /^l31_pragmatics_register_invalid$/u);
expectL31Failure((lesson) => {
  const final = lesson.session56Final as JsonRecord;
  final.requiredConstructIds = (final.requiredConstructIds as string[]).filter(
    (id) => id !== "de_gc_limited_modal_perfekt_v1",
  );
}, /^l31_final_required_constructs_invalid$/u);
expectL31Failure((lesson) => {
  (lesson.session56Final as JsonRecord).transferSituation =
    "mediate the same memorized exchange";
}, /^l31_final_transfer_evidence_invalid$/u);
expectL31Failure((lesson) => {
  lesson.title = "Missverständnisse lösen";
}, /^l31_canonical_object_identity_invalid$/u);

expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    lesson30.crossLessonRecall = (
      lesson30.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l20");
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    lesson30.crossLessonRecall = (
      lesson30.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l15");
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    lesson30.crossLessonRecall = (
      lesson30.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l09");
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    lesson30.crossLessonRecall = (
      lesson30.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l16");
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    lesson30.crossLessonRecall = (
      lesson30.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l29");
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const recall = (lesson30.crossLessonRecall as JsonRecord[]).find(
      (entry) => entry.fromLessonId === "de_l20",
    )!;
    recall.constructIds = ["de_gc_separable_verb_bracket_v1"];
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const recall = (lesson30.crossLessonRecall as JsonRecord[]).find(
      (entry) => entry.fromLessonId === "de_l15",
    )!;
    recall.responsibility =
      "contrast ordinary Perfekt with the selected cluster";
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const recall = (lesson30.crossLessonRecall as JsonRecord[]).find(
      (entry) => entry.fromLessonId === "de_l09",
    )!;
    recall.fromLessonId = "de_l08";
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const recall = (lesson30.crossLessonRecall as JsonRecord[]).find(
      (entry) => entry.fromLessonId === "de_l16",
    )!;
    recall.responsibility = "contrast Präteritum and modal Perfekt";
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const recall = (lesson30.crossLessonRecall as JsonRecord[]).find(
      (entry) => entry.fromLessonId === "de_l29",
    )!;
    recall.responsibility = "retain the previous document relation";
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const recalls = lesson30.crossLessonRecall as JsonRecord[];
    lesson30.crossLessonRecall = [
      recalls[1],
      recalls[0],
      recalls[2],
      recalls[3],
      recalls[4],
    ];
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    (lesson30.crossLessonRecall as JsonRecord[]).push({
      fromLessonId: "de_l01",
      constructIds: ["de_gc_statement_v2_v1"],
      responsibility: "extra recall row",
    });
  },
  /^l30_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    lesson30.evidenceIds = (lesson30.evidenceIds as string[]).filter(
      (id) => id !== "DE-GRM-MODALPERF-001",
    );
  },
  /^introduced_construct_evidence_missing:de_l30:DE-GRM-MODALPERF-001$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const evidence = lesson30.evidenceIds as string[];
    lesson30.evidenceIds = [evidence[1], evidence[0], evidence[2], evidence[3]];
  },
  /^l30_evidence_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    (lesson30.evidenceIds as string[]).push("DE-GRM-ADJ-001");
  },
  /^l30_evidence_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    lesson30.title = "Was hätte erledigt werden müssen?";
  },
  /^l30_forbidden_productive_surface:hätte$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const boundary = lesson30.grammarBoundary as JsonRecord;
    boundary.productive = "finite haben plus a passive werden cluster";
  },
  /^l30_forbidden_productive_surface:passive$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const outcomes = lesson30.chapterOutcomes as JsonRecord[];
    outcomes[2].outcome = "report one completed situation with werden";
  },
  /^l30_forbidden_productive_surface:werden$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    (lesson30.extendedConstructIds as string[]).push("de_gc_event_passive_v1");
  },
  /^l30_forbidden_known_construct:de_gc_event_passive_v1$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    (lesson30.extendedConstructIds as string[]).push("de_gc_state_passive_v1");
  },
  /^l30_forbidden_known_construct:de_gc_state_passive_v1$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    (lesson30.extendedConstructIds as string[]).push(
      "de_gc_werden_infinitive_meanings_v1",
    );
  },
  /^l30_forbidden_known_construct:de_gc_werden_infinitive_meanings_v1$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    (lesson30.prohibitedConstructIds as string[]).push(
      "de_gc_event_passive_v1",
    );
  },
  /^prohibited_construct_not_future:de_l30:de_gc_event_passive_v1$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const boundary = lesson30.grammarBoundary as JsonRecord;
    boundary.excluded = (boundary.excluded as string).replace(
      "passive or werden clusters, ",
      "",
    );
  },
  /^l30_excluded_no_expansion_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    lesson30.prohibitedConstructIds = (
      lesson30.prohibitedConstructIds as string[]
    ).filter((id) => id !== "de_gc_register_repair_mediation_v1");
  },
  /^l30_future_prohibited_contract_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const final = lesson30.session56Final as JsonRecord;
    final.requiredConstructIds = (
      final.requiredConstructIds as string[]
    ).filter((id) => id !== "de_gc_limited_functional_genitive_v1");
  },
  /^l30_canonical_object_identity_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson30 = (candidate.lessons as JsonRecord[])[29];
    const prerequisites = lesson30.prerequisiteLessonIds as string[];
    prerequisites.splice(prerequisites.indexOf("de_l20"), 0, "de_l16");
  },
  /^lesson_prerequisite_closure_mismatch:de_l30:expected=de_l01,de_l02,de_l03,de_l04,de_l08,de_l09,de_l15,de_l20$/u,
);

expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    lesson29.crossLessonRecall = (
      lesson29.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l12");
  },
  /^l29_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    const recall = (lesson29.crossLessonRecall as JsonRecord[]).find(
      (entry) => entry.fromLessonId === "de_l12",
    )!;
    recall.fromLessonId = "de_l11";
  },
  /^l29_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    const recall = (lesson29.crossLessonRecall as JsonRecord[]).find(
      (entry) => entry.fromLessonId === "de_l12",
    )!;
    recall.constructIds = ["de_gc_staged_nominal_group_agreement_v1"];
  },
  /^l29_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    const recall = (lesson29.crossLessonRecall as JsonRecord[]).find(
      (entry) => entry.fromLessonId === "de_l12",
    )!;
    recall.responsibility = "retain two-object case control";
  },
  /^l29_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    const recalls = lesson29.crossLessonRecall as JsonRecord[];
    lesson29.crossLessonRecall = [
      recalls[1],
      recalls[0],
      recalls[2],
      recalls[3],
    ];
  },
  /^l29_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    (lesson29.crossLessonRecall as JsonRecord[]).push({
      fromLessonId: "de_l01",
      constructIds: ["de_gc_statement_v2_v1"],
      responsibility: "extra recall row",
    });
  },
  /^l29_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    lesson29.evidenceIds = (lesson29.evidenceIds as string[]).filter(
      (id) => id !== "DE-GRM-ADP-001",
    );
  },
  /^l29_evidence_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    const evidence = lesson29.evidenceIds as string[];
    lesson29.evidenceIds = [evidence[1], evidence[0], evidence[2], evidence[3]];
  },
  /^l29_evidence_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    (lesson29.evidenceIds as string[]).push("DE-GRM-ADJ-001");
  },
  /^l29_evidence_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson29 = (candidate.lessons as JsonRecord[])[28];
    lesson29.title = "Dokumente und Zugehörigkeit erweitert";
  },
  /^l29_canonical_object_identity_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson27 = (candidate.lessons as JsonRecord[])[26];
    lesson27.crossLessonRecall = (
      lesson27.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l18");
  },
  /^l27_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    lesson28.crossLessonRecall = (
      lesson28.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l15");
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    const l15Recall = (lesson28.crossLessonRecall as JsonRecord[]).find(
      (recall) => recall.fromLessonId === "de_l15",
    )!;
    l15Recall.constructIds = ["de_gc_controlled_partizip_ii_v1"];
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    const l15Recall = (lesson28.crossLessonRecall as JsonRecord[]).find(
      (recall) => recall.fromLessonId === "de_l15",
    )!;
    l15Recall.responsibility =
      "retrieve completed-event brackets for narrative contrast";
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    const l15Recall = (lesson28.crossLessonRecall as JsonRecord[]).find(
      (recall) => recall.fromLessonId === "de_l15",
    )!;
    l15Recall.fromLessonId = "de_l14";
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    lesson28.crossLessonRecall = (
      lesson28.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l18");
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    const l18Recall = (lesson28.crossLessonRecall as JsonRecord[]).find(
      (recall) => recall.fromLessonId === "de_l18",
    )!;
    l18Recall.constructIds = ["de_gc_introduced_verbletzt_clause_v1"];
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    const l18Recall = (lesson28.crossLessonRecall as JsonRecord[]).find(
      (recall) => recall.fromLessonId === "de_l18",
    )!;
    l18Recall.responsibility =
      "retrieve connector topology while sequencing the account";
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    const l18Recall = (lesson28.crossLessonRecall as JsonRecord[]).find(
      (recall) => recall.fromLessonId === "de_l18",
    )!;
    l18Recall.fromLessonId = "de_l17";
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    (lesson28.crossLessonRecall as JsonRecord[]).push({
      fromLessonId: "de_l01",
      constructIds: ["de_gc_statement_v2_v1"],
      responsibility: "extra recall row",
    });
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    const recalls = lesson28.crossLessonRecall as JsonRecord[];
    lesson28.crossLessonRecall = [recalls[1], recalls[0], recalls[2]];
  },
  /^l28_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson28 = (candidate.lessons as JsonRecord[])[27];
    lesson28.title = "Eine Geschichte klar erzählen";
  },
  /^l28_canonical_object_identity_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson27 = (candidate.lessons as JsonRecord[])[26];
    lesson27.title = "Projekt-Update erweitert";
  },
  /^l27_canonical_object_identity_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson27 = (candidate.lessons as JsonRecord[])[26];
    const l24Recall = (lesson27.crossLessonRecall as JsonRecord[]).find(
      (recall) => recall.fromLessonId === "de_l24",
    )!;
    l24Recall.constructIds = ["de_gc_state_passive_v1"];
  },
  /^l27_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson27 = (candidate.lessons as JsonRecord[])[26];
    const l25Recall = (lesson27.crossLessonRecall as JsonRecord[]).find(
      (recall) => recall.fromLessonId === "de_l25",
    )!;
    l25Recall.responsibility =
      "retrieve state passive meaning during project mediation";
  },
  /^l27_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson27 = (candidate.lessons as JsonRecord[])[26];
    (lesson27.crossLessonRecall as JsonRecord[]).push({
      fromLessonId: "de_l01",
      constructIds: ["de_gc_statement_v2_v1"],
      responsibility: "extra recall row",
    });
  },
  /^l27_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as unknown[]).pop();
  },
  /lesson_count_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as unknown[]).push(
      clone((candidate.lessons as unknown[])[31]),
    );
  },
  /lesson_count_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[1].id = "de_l01";
  },
  /duplicate_lesson_id/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    ((candidate.lessons as JsonRecord[])[0].chapterOutcomes as unknown[]).pop();
  },
  /chapter_count_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (
      (candidate.lessons as JsonRecord[])[0].session56Final as JsonRecord
    ).sessionId = "de_l01_c07_s55";
  },
  /session56_contract_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[0].prerequisiteLessonIds = ["de_l02"];
  },
  /lesson_prerequisite_not_earlier/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[1].prerequisiteLessonIds = [];
  },
  /lesson_prerequisite_closure_mismatch:de_l02/u,
);
expectFailure(
  raw,
  constructs,
  (_candidate, grammar) => {
    const target = grammar.find(
      (construct) => construct.id === "de_gc_personal_reference_v1",
    )!;
    (target as unknown as { prerequisiteIds: string[] }).prerequisiteIds = [
      "de_gc_finite_present_agreement_v1",
    ];
  },
  /future_construct_prerequisite/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[0].id = "en_l01";
  },
  /english_contamination/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[0].scenario =
      "modules/learning-v2/curriculum/en/copied.json";
  },
  /english_contamination/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lessons = candidate.lessons as JsonRecord[];
    const firstOutcome = (lessons[0].chapterOutcomes as JsonRecord[])[0]
      .outcome;
    (lessons[1].chapterOutcomes as JsonRecord[])[0].outcome = firstOutcome;
  },
  /duplicate_global_chapter_outcome/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson6 = (candidate.lessons as JsonRecord[])[5];
    lesson6.reviewedConstructIds = (
      lesson6.reviewedConstructIds as string[]
    ).filter((id) => id !== "de_gc_w_element_v2_v1");
  },
  /lifecycle_role_ownership_missing:de_gc_w_element_v2_v1:de_l06/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson6 = (candidate.lessons as JsonRecord[])[5];
    for (const recall of lesson6.crossLessonRecall as JsonRecord[]) {
      recall.constructIds = (recall.constructIds as string[]).filter(
        (id) => id !== "de_gc_w_element_v2_v1",
      );
    }
  },
  /lifecycle_recall_ownership_missing:de_gc_w_element_v2_v1:de_l06/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson6 = (candidate.lessons as JsonRecord[])[5];
    const final = lesson6.session56Final as JsonRecord;
    final.requiredConstructIds = (
      final.requiredConstructIds as string[]
    ).filter((id) => id !== "de_gc_w_element_v2_v1");
  },
  /lifecycle_final_ownership_missing:de_gc_w_element_v2_v1:de_l06/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson31 = (candidate.lessons as JsonRecord[])[30];
    const formalRecall = (lesson31.crossLessonRecall as JsonRecord[]).find(
      (recall) =>
        (recall.constructIds as string[]).includes("de_gc_formal_sie_sich_v1"),
    )!;
    formalRecall.fromLessonId = "de_l30";
  },
  /^l31_plan_recall_authority_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson2 = (candidate.lessons as JsonRecord[])[1];
    lesson2.evidenceIds = (lesson2.evidenceIds as string[]).filter(
      (id) => id !== "DE-GRM-PRON-001",
    );
  },
  /introduced_construct_evidence_missing:de_l02:DE-GRM-PRON-001/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson13 = (candidate.lessons as JsonRecord[])[12];
    lesson13.evidenceIds = (lesson13.evidenceIds as string[]).filter(
      (id) => id !== "DE-GRM-ADJ-001",
    );
  },
  /introduced_construct_evidence_missing:de_l13:DE-GRM-ADJ-001/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson15 = (candidate.lessons as JsonRecord[])[14];
    const chapter04 = (lesson15.chapterOutcomes as JsonRecord[]).find(
      (chapter) => chapter.id === "de_l15_ch04",
    )!;
    chapter04.outcome = "sequence two completed errands with known connectors";
  },
  /l15_c04_sequence_lexical_contract_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    (lesson24.grammarBoundary as JsonRecord).receptive =
      "known active completed-event clauses used for contrast";
  },
  /l24_finite_separable_receptive_boundary_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    (lesson24.grammarBoundary as JsonRecord).receptive =
      "known active completed-event clauses used for contrast plus two known finite separable clauses from L08 used only as a receptive contrast";
  },
  /l24_finite_separable_receptive_boundary_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    lesson24.crossLessonRecall = (
      lesson24.crossLessonRecall as JsonRecord[]
    ).filter((recall) => recall.fromLessonId !== "de_l08");
  },
  /l24_l08_separable_recall_count_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    const recalls = lesson24.crossLessonRecall as JsonRecord[];
    recalls.splice(1, 0, clone(recalls[0]));
  },
  /l24_l08_separable_recall_count_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    const l08Recall = (lesson24.crossLessonRecall as JsonRecord[])[0];
    l08Recall.constructIds = ["de_gc_accusative_personal_pronouns_v1"];
  },
  /l24_l08_separable_recall_construct_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    const l08Recall = (lesson24.crossLessonRecall as JsonRecord[])[0];
    l08Recall.responsibility =
      "retrieve exactly one known finite split clause from L08 as reception-only contrast";
  },
  /l24_partizip_not_finite_separable_guard_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    const l15Recall = (lesson24.crossLessonRecall as JsonRecord[])[1];
    l15Recall.responsibility = "contrast known participle brackets";
  },
  /l24_cross_lesson_recall_contract_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    const final = lesson24.session56Final as JsonRecord;
    final.requiredConstructIds = (
      final.requiredConstructIds as string[]
    ).filter(
      (constructId) => constructId !== "de_gc_separable_verb_bracket_v1",
    );
  },
  /l24_separable_final_evidence_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    const final = lesson24.session56Final as JsonRecord;
    final.evidenceDimensions = (final.evidenceDimensions as string[]).filter(
      (dimension) => dimension !== "reception",
    );
  },
  /^session56_core_dimension_missing:de_l24:reception$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    lesson24.crossLessonRecall = null;
  },
  /^cross_lesson_recall_array_required:de_l24$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    lesson24.session56Final = null;
  },
  /^plain_record_required:de_l24\.session56Final$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    const final = lesson24.session56Final as JsonRecord;
    final.requiredConstructIds = (
      final.requiredConstructIds as string[]
    ).filter(
      (constructId) => constructId !== "de_gc_controlled_partizip_ii_v1",
    );
  },
  /^l24_canonical_object_identity_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    const final = lesson24.session56Final as JsonRecord;
    final.requiredConstructIds = [
      ...(final.requiredConstructIds as string[]),
      "de_gc_statement_v2_v1",
    ];
  },
  /^l24_canonical_object_identity_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson24 = (candidate.lessons as JsonRecord[])[23];
    (lesson24.grammarBoundary as JsonRecord).productive =
      "finite werden plus controlled participle in event, recipient, and agent passive clauses";
  },
  /^l24_canonical_object_identity_invalid$/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lessons = candidate.lessons as JsonRecord[];
    for (let index = 8; index <= 15; index += 1) {
      if (lessons[index].scenarioDomain === "work")
        lessons[index].scenarioDomain = "service";
    }
  },
  /a2_work_domain_missing/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson10 = (candidate.lessons as JsonRecord[])[9];
    (lesson10.grammarBoundary as JsonRecord).receptive =
      "known equipment direction frames supporting delivery negotiation";
  },
  /l10_stale_delivery_negotiation/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson10 = (candidate.lessons as JsonRecord[])[9];
    lesson10.scenario =
      "equipment stands in a workplace area during a handover";
    lesson10.canDoTerritory =
      "say where equipment stands during a colleague handover";
    const chapters = lesson10.chapterOutcomes as JsonRecord[];
    chapters[4].outcome = "say where equipment stands at work";
    chapters[6].outcome =
      "transfer where equipment stands to another workplace handover";
    (lesson10.session56Final as JsonRecord).transferSituation =
      "tell a colleague where equipment stands in another work area";
  },
  /l10_directional_anchor_invalid:scenario/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson10 = (candidate.lessons as JsonRecord[])[9];
    const grammarBoundary = lesson10.grammarBoundary as JsonRecord;
    grammarBoundary.productive =
      "equipment stands in a static workplace location";
    grammarBoundary.receptive =
      "known static location frames where equipment stands";
  },
  /l10_directional_anchor_invalid:grammarBoundary\.productive/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const final = (candidate.lessons as JsonRecord[])[31]
      .session56Final as JsonRecord;
    final.evidenceModes = (final.evidenceModes as string[]).filter(
      (mode) => mode !== "written_digital_interaction",
    );
  },
  /late_b1_written_digital_interaction_missing:de_l32/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const final = (candidate.lessons as JsonRecord[])[31]
      .session56Final as JsonRecord;
    (final.assessmentStrands as JsonRecord[])[0].mode = "undeclared_mode";
  },
  /l32_strand_mode_undeclared/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const final = (candidate.lessons as JsonRecord[])[31]
      .session56Final as JsonRecord;
    for (const strand of final.assessmentStrands as JsonRecord[]) {
      strand.mode = "written_digital_interaction";
    }
  },
  /l32_strand_mode_bijection_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const final = (candidate.lessons as JsonRecord[])[31]
      .session56Final as JsonRecord;
    (final.assessmentStrands as unknown[]).pop();
  },
  /l32_assessment_strands_missing/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const final = (candidate.lessons as JsonRecord[])[31]
      .session56Final as JsonRecord;
    final.requiredConstructIds = ["de_gc_functional_b1_integration_v1"];
  },
  /l32_required_core_constructs_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const final = (candidate.lessons as JsonRecord[])[31]
      .session56Final as JsonRecord;
    (final.contextSelectionRule as JsonRecord).maximum = 3;
  },
  /l32_context_selection_maximum_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const final = (candidate.lessons as JsonRecord[])[31]
      .session56Final as JsonRecord;
    final.requiredConstructIds = [
      ...(final.requiredConstructIds as string[]),
      "de_gc_relative_clause_gender_case_v1",
    ];
  },
  /context_selected_construct_also_required|l32_required_construct_checklist_too_large/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const final = (candidate.lessons as JsonRecord[])[31]
      .session56Final as JsonRecord;
    final.evidenceDimensions = (final.evidenceDimensions as string[]).filter(
      (item) => item !== "mediation",
    );
  },
  /b1_exit_dimensions_missing/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    ((candidate.standardPolicy as JsonRecord).production as JsonRecord).locale =
      "de-AT";
  },
  /production_baseline_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (
      (candidate.standardPolicy as JsonRecord).regionalReception as JsonRecord
    ).regions = ["AT"];
  },
  /dach_receptive_boundary_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const pending = (candidate.ownerDecisionBoundary as JsonRecord[])[0];
    pending.status = "APPROVED";
    pending.promotedToApproved = true;
  },
  /pending_owner_decision_promoted/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (
      (candidate.standardPolicy as JsonRecord).regionalReception as JsonRecord
    ).approvedItemIds = ["de_reg_at_item_001"];
  },
  /pending_regional_inventory_materialized/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[0].pronunciationPlanStatus = "APPROVED";
  },
  /pronunciation_plan_not_pending_task6/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[11].title =
      "Geben, bringen, hinstellen";
  },
  /l12_active_contract_title_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[11].plannedPronunciationTargetIds = [
      "de_pron_plan_sentence_focus_v1",
    ];
  },
  /l12_pronunciation_targets_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[11].plannedPronunciationTargetIds = [];
  },
  /l12_pronunciation_targets_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    (candidate.lessons as JsonRecord[])[11].plannedPronunciationTargetIds = [
      "de_pron_plan_case_marker_perception_v1",
      "de_pron_plan_sentence_focus_v1",
    ];
  },
  /l12_pronunciation_targets_invalid/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    const lesson11 = (candidate.lessons as JsonRecord[])[10];
    lesson11.plannedPronunciationTargetIds = [
      ...(lesson11.plannedPronunciationTargetIds as string[]),
      CLAUSE_BRACKET_RHYTHM_TARGET_ID,
    ];
  },
  /pronunciation_bracket_target_without_active_construct:de_l11/u,
);
expectFailure(
  raw,
  constructs,
  (candidate) => {
    candidate.unexpectedField = true;
  },
  /unknown_key:root/u,
);

const blueprint = raw as JsonRecord;
const lessons = blueprint.lessons as JsonRecord[];
const chapterCount = lessons.reduce(
  (count, lesson) => count + (lesson.chapterOutcomes as unknown[]).length,
  0,
);
const finalCount = lessons.filter((lesson) => lesson.session56Final).length;
process.stdout.write(
  `LEARNING V2 GERMAN LESSON BOUNDARIES GATE: PASS (${lessons.length} lessons; ${chapterCount} chapter outcomes; ${finalCount} session-56 finals; ${constructs.length} Task3 constructs; DACH PENDING/HOLD)\n`,
);
