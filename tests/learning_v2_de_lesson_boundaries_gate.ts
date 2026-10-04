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
validateBlueprint(raw, constructs);

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
  /recall_provenance_mismatch:de_l31:de_gc_formal_sie_sich_v1:expected=de_l19/u,
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
