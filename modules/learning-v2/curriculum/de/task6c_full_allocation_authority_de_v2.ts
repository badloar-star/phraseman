import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../policies/decision_registry";

type JsonRecord = Record<string, unknown>;
type HashBinding = Readonly<{ path: string; sha256: string }>;
type CanonicalHashBinding = Readonly<{
  path: string;
  sha256: string;
  canonicalBodySha256: string;
}>;

export type GermanTask7V2Resolution = Readonly<{
  sourcePlanId: string;
  checkpointPacketId: string;
  canonicalSenseId: string;
  firstIntroductionPacketId: string | null;
}>;

export type GermanTask7V2AllocationInventory = Readonly<{
  schemaVersion: "learning-v2-german-task7-allocation-inventory.v2";
  status: "V2_AUTHORITY_MIGRATED_PARTIAL";
  authority: Readonly<{
    classification: "PARTIAL_INVENTORY_ONLY";
    fullAllocationAuthority: false;
    preauthoringAuthority: false;
    ownerApproval: "NOT_REQUESTED_NOT_GRANTED";
    consumerCutover: "NONE";
    task7Unlock: false;
    learnerFacing: false;
    releaseAuthorized: false;
  }>;
  sourceBindings: Readonly<{
    task5V2: Readonly<{
      path: string;
      schemaVersion: string;
      byteSha256: string;
      canonicalBodySha256: string;
    }>;
    task6V2PhaseA: readonly HashBinding[];
    task6V2PhaseB: Readonly<{
      lexicalRegistry: CanonicalHashBinding;
      canonicalBundle: CanonicalHashBinding;
      gate: HashBinding;
      receipt: HashBinding;
      reviewSummaries: readonly Readonly<{
        role: "native" | "spec" | "adversarial";
        task: string;
        verdict: "PASS";
        p0: 0;
        p1: 0;
        p2: 0;
        runId: null;
        threadId: null;
        attestationStrength: "ORCHESTRATION_ATTESTED_SUMMARY_NOT_SELF_AUTHENTICATING";
      }>[];
    }>;
  }>;
  counts: Readonly<{
    task5PlanIds: 288;
    resolvedPlanIds: 6;
    unresolvedPlanIds: 282;
    packetIds: 1792;
    materializedPackets: 0;
  }>;
  inventoryDigests: Readonly<{
    task5PlanIdsCanonicalSha256: string;
    resolvedPlanIdsCanonicalSha256: string;
    unresolvedPlanIdsCanonicalSha256: string;
    packetIdsCanonicalSha256: string;
  }>;
  resolutions: readonly GermanTask7V2Resolution[];
  sequence: Readonly<{
    nextEligibleSessionId: "de_l01_s01";
    eligibilityKind: "NEXT_ORDERED_SESSION_AFTER_SEPARATE_TASK7_UNLOCK";
    currentlyMaterializable: false;
    prerequisiteLessonIds: readonly [];
    l02: Readonly<{
      sessionId: "de_l02_s01";
      eligibleFirst: false;
      blockedByLessonId: "de_l01";
      reason: "L01_PREREQUISITE_NOT_MATERIALIZED";
    }>;
  }>;
  materializedPacketPaths: readonly [];
}>;

export type GermanTask7V2InventoryAudit = Readonly<{
  status: "V2_AUTHORITY_MIGRATED_PARTIAL";
  task5PlanIds: 288;
  resolvedPlanIds: 6;
  unresolvedPlanIds: 282;
  packetIds: 1792;
  materializedPackets: 0;
  nextEligibleSessionId: "de_l01_s01";
  task7Unlock: false;
  learnerFacing: false;
  releaseAuthorized: false;
}>;

const migratedHoldBrand: unique symbol = Symbol("germanTask7V2MigratedHold");
export type GermanTask7V2AuthorityMigrationHold = Readonly<{
  status: "V2_AUTHORITY_MIGRATED_PARTIAL";
  authority: "HOLD";
  task5PlanIds: 288;
  resolvedPlanIds: 6;
  unresolvedPlanIds: 282;
  packetIds: 1792;
  materializedPackets: 0;
  nextEligibleSessionId: "de_l01_s01";
  currentlyMaterializable: false;
  task7Unlock: false;
  learnerFacing: false;
  releaseAuthorized: false;
  readonly [migratedHoldBrand]: true;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const INVENTORY_PATH =
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json";
const INVENTORY_SHA256 =
  "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415";
const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
const TASK5_BYTE_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const TASK5_CANONICAL_SHA256 =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const TASK6_PATH =
  "modules/learning-v2/curriculum/de/registries/" +
  "task6_canonical_registry_de_" +
  "v2.json";
const TASK6_BYTE_SHA256 =
  "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f";
const TASK6_CANONICAL_SHA256 =
  "08d18d36fe225e06ca992e7c862036604cb4d78e07eaa6ed7ce7b80db670c880";
const PLAN_IDS_SHA256 =
  "616df35b69fab6e6bb810c4fb4b09b192a1935051a180971c115df851419b541";
const RESOLVED_PLAN_IDS_SHA256 =
  "97766d3b4759e95714cbd941150e18ef81ed0bd002e1ac796327c002c96b55b0";
const UNRESOLVED_PLAN_IDS_SHA256 =
  "b62fabdfa8339b3347d293f20f5f4c724547555fa7df3d9b3c86c7721c2942ea";
const PACKET_IDS_SHA256 =
  "32a2320cf26729d24efc5884e0fe3c6e993e9eeeac693886a49fd566771a6d3f";

const PHASE_A_BINDINGS: readonly HashBinding[] = Object.freeze([
  Object.freeze({
    path: "modules/learning-v2/curriculum/de/lexical_registry_contract_de_v2.ts",
    sha256: "fc168070539f4639674949343166e8f44c7642a49f9bdc15e822c2b60834d955",
  }),
  Object.freeze({
    path: "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v2.ts",
    sha256: "1ff9c1669f799d6c88ec0a63b3466797c92677fe9ea5eff03afd9484c600a86c",
  }),
  Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task6_v2_verb_valency_adjudications_de_v1.json",
    sha256: "67132b351dab1ef2960d93bc98421625f75f1b832e1bb301263796a17275edd2",
  }),
  Object.freeze({
    path: "modules/learning-v2/curriculum/de/task6_registry_contract_de_v2.ts",
    sha256: "9402237e9f74883d60d327e09fe695c874878da5fbbdc3fdf4c4b6a5d7856bbe",
  }),
  Object.freeze({
    path: "tests/learning_v2_de_task6_v2_migration_gate.ts",
    sha256: "87c150ebd7bb971983a4fff3b651175d9776ad79e7b5bd666987a2ee7bc158f3",
  }),
  Object.freeze({
    path: "tests/learning_v2_de_wohnen_valency_adjudication_gate.ts",
    sha256: "fe87810c9b14799fc047d4a51ef6eaef92b3c40817a1fec463c9c78a14041984",
  }),
  Object.freeze({
    path: "docs/v2/curriculum/de/TASK6C_L02_SOURCE_ADMISSION_REVIEW_RECEIPT_2026-10-12.md",
    sha256: "e4a577acd94a6d6b21c8fa4d5b2351d655897c768a2cc612d27efe2f0bfe2a99",
  }),
  Object.freeze({
    path: "docs/v2/curriculum/de/TASK6_V2_MIGRATION_AUTHORITY_2026-10-12.md",
    sha256: "c20778aa5703fad7f50f2e57c012a22da3ab2cca57fdbfa883e93f31d873cebf",
  }),
]);

const PHASE_B_BINDINGS = Object.freeze({
  lexicalRegistry: Object.freeze({
    path:
      "modules/learning-v2/curriculum/de/registries/" +
      "lexical_senses_de_" +
      "v2.json",
    sha256: "31934e35b5278c7a7e901d08e02da5398f3503825782acbb604d06de094726a5",
    canonicalBodySha256:
      "7efff6e871d7de8235e3530248fc8f4c57a915d53458b82a629c89b9fd064a74",
  }),
  canonicalBundle: Object.freeze({
    path: TASK6_PATH,
    sha256: TASK6_BYTE_SHA256,
    canonicalBodySha256: TASK6_CANONICAL_SHA256,
  }),
  gate: Object.freeze({
    path: "tests/learning_v2_de_task6_canonical_registry_v2_gate.ts",
    sha256: "b0fd5ed0f11273a18d70c2d60e3171bc4e22c8bcbafcb92a6924be45a54d104b",
  }),
  receipt: Object.freeze({
    path: "docs/v2/curriculum/de/TASK6_V2_CANONICAL_REGISTRY_RECONCILIATION_RECEIPT_2026-10-12.md",
    sha256: "2b162e1ac798372327636bf29663c6a5378e629a63b51c0331379c31a291474e",
  }),
  reviewSummaries: Object.freeze([
    Object.freeze({
      role: "native",
      task: "/root/l02_task6_v2_phase_b/phase_b_native_review",
      verdict: "PASS",
      p0: 0,
      p1: 0,
      p2: 0,
      runId: null,
      threadId: null,
      attestationStrength:
        "ORCHESTRATION_ATTESTED_SUMMARY_NOT_SELF_AUTHENTICATING",
    }),
    Object.freeze({
      role: "spec",
      task: "/root/l02_task6_v2_phase_b/phase_b_spec_review",
      verdict: "PASS",
      p0: 0,
      p1: 0,
      p2: 0,
      runId: null,
      threadId: null,
      attestationStrength:
        "ORCHESTRATION_ATTESTED_SUMMARY_NOT_SELF_AUTHENTICATING",
    }),
    Object.freeze({
      role: "adversarial",
      task: "/root/l02_task6_v2_phase_b/phase_b_adversarial_review",
      verdict: "PASS",
      p0: 0,
      p1: 0,
      p2: 0,
      runId: null,
      threadId: null,
      attestationStrength:
        "ORCHESTRATION_ATTESTED_SUMMARY_NOT_SELF_AUTHENTICATING",
    }),
  ]),
});

const EXPECTED_RESOLUTIONS: readonly GermanTask7V2Resolution[] = Object.freeze([
  Object.freeze({
    sourcePlanId: "de_lex_plan_l01_c01_nachbarin_v1",
    checkpointPacketId: "de_l01_c01_s08",
    canonicalSenseId: "de_lex_l01_c01_nachbarin_v1",
    firstIntroductionPacketId: "de_l01_c01_s07",
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l01_c02_aufzug_v1",
    checkpointPacketId: "de_l01_c02_s16",
    canonicalSenseId: "de_lex_l01_c02_aufzug_v1",
    firstIntroductionPacketId: "de_l01_c02_s15",
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1",
    checkpointPacketId: "de_l02_c01_s08",
    canonicalSenseId: "de_lex_l02_c01_wohnen_v1",
    firstIntroductionPacketId: null,
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c01_kueche_v1",
    checkpointPacketId: "de_l02_c01_s08",
    canonicalSenseId: "de_lex_l02_c01_kueche_v1",
    firstIntroductionPacketId: null,
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c02_tasse_v1",
    checkpointPacketId: "de_l02_c02_s16",
    canonicalSenseId: "de_lex_l02_c02_tasse_v1",
    firstIntroductionPacketId: null,
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c02_teller_v1",
    checkpointPacketId: "de_l02_c02_s16",
    canonicalSenseId: "de_lex_l02_c02_teller_v1",
    firstIntroductionPacketId: null,
  }),
]);

const TOP_KEYS = [
  "schemaVersion",
  "status",
  "authority",
  "sourceBindings",
  "counts",
  "inventoryDigests",
  "resolutions",
  "sequence",
  "materializedPacketPaths",
] as const;
const MIGRATED = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(code);
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
}

function closed(
  value: JsonRecord,
  keys: readonly string[],
  code: string,
): void {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    fail(code);
  }
}

function normalized(input: unknown): unknown {
  try {
    return JSON.parse(canonicalJsonV1(input)) as unknown;
  } catch {
    fail("task7_v2_inventory_json");
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as JsonRecord)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readBytes(relativePath: string): Buffer {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function exactCanonical(
  actual: unknown,
  expected: unknown,
  code: string,
): void {
  if (canonicalJsonV1(actual) !== canonicalJsonV1(expected)) fail(code);
}

export function parseGermanTask7V2AllocationInventoryDeV2(
  input: unknown,
): GermanTask7V2AllocationInventory {
  const value = normalized(input);
  record(value, "task7_v2_inventory_record");
  closed(value, TOP_KEYS, "task7_v2_inventory_schema");
  if (
    value.schemaVersion !==
      "learning-v2-german-task7-allocation-inventory.v2" ||
    value.status !== "V2_AUTHORITY_MIGRATED_PARTIAL"
  ) {
    fail("task7_v2_inventory_version");
  }

  record(value.authority, "task7_v2_authority_record");
  closed(
    value.authority,
    [
      "classification",
      "fullAllocationAuthority",
      "preauthoringAuthority",
      "ownerApproval",
      "consumerCutover",
      "task7Unlock",
      "learnerFacing",
      "releaseAuthorized",
    ],
    "task7_v2_authority_schema",
  );
  if (
    value.authority.classification !== "PARTIAL_INVENTORY_ONLY" ||
    value.authority.fullAllocationAuthority !== false
  ) {
    fail("task7_v2_partial_brand");
  }
  if (value.authority.preauthoringAuthority !== false) {
    fail("task7_v2_preauthoring_forbidden");
  }
  if (value.authority.ownerApproval !== "NOT_REQUESTED_NOT_GRANTED") {
    fail("task7_v2_owner_approval_forbidden");
  }
  if (value.authority.consumerCutover !== "NONE") {
    fail("task7_v2_cutover_forbidden");
  }
  if (
    value.authority.task7Unlock !== false ||
    value.authority.learnerFacing !== false ||
    value.authority.releaseAuthorized !== false
  ) {
    fail("task7_v2_hold_boundary");
  }

  record(value.sourceBindings, "task7_v2_source_bindings");
  closed(
    value.sourceBindings,
    ["task5V2", "task6V2PhaseA", "task6V2PhaseB"],
    "task7_v2_source_bindings",
  );
  record(value.sourceBindings.task5V2, "task7_v2_task5_binding");
  exactCanonical(
    value.sourceBindings.task5V2,
    {
      path: TASK5_PATH,
      schemaVersion: "learning-v2-german-chapter-blueprints.v2",
      byteSha256: TASK5_BYTE_SHA256,
      canonicalBodySha256: TASK5_CANONICAL_SHA256,
    },
    "task7_v2_task5_binding",
  );
  exactCanonical(
    value.sourceBindings.task6V2PhaseA,
    PHASE_A_BINDINGS,
    "task7_v2_task6_phase_a_binding",
  );
  exactCanonical(
    value.sourceBindings.task6V2PhaseB,
    PHASE_B_BINDINGS,
    "task7_v2_task6_phase_b_binding",
  );

  record(value.counts, "task7_v2_counts");
  exactCanonical(
    value.counts,
    {
      task5PlanIds: 288,
      resolvedPlanIds: 6,
      unresolvedPlanIds: 282,
      packetIds: 1792,
      materializedPackets: 0,
    },
    "task7_v2_counts",
  );
  record(value.inventoryDigests, "task7_v2_inventory_digests");
  exactCanonical(
    value.inventoryDigests,
    {
      task5PlanIdsCanonicalSha256: PLAN_IDS_SHA256,
      resolvedPlanIdsCanonicalSha256: RESOLVED_PLAN_IDS_SHA256,
      unresolvedPlanIdsCanonicalSha256: UNRESOLVED_PLAN_IDS_SHA256,
      packetIdsCanonicalSha256: PACKET_IDS_SHA256,
    },
    "task7_v2_inventory_digests",
  );

  if (!Array.isArray(value.resolutions) || value.resolutions.length !== 6) {
    fail("task7_v2_resolution_count");
  }
  const senseIds = value.resolutions.map((row) => {
    record(row, "task7_v2_resolution_record");
    closed(
      row,
      [
        "sourcePlanId",
        "checkpointPacketId",
        "canonicalSenseId",
        "firstIntroductionPacketId",
      ],
      "task7_v2_resolution_schema",
    );
    return row.canonicalSenseId;
  });
  if (
    senseIds.some((id) => typeof id !== "string") ||
    new Set(senseIds).size !== senseIds.length
  ) {
    fail("task7_v2_duplicate_sense");
  }
  for (const row of value.resolutions) {
    const resolution = row as JsonRecord;
    if (
      typeof resolution.sourcePlanId === "string" &&
      resolution.sourcePlanId.startsWith("de_lex_plan_l02_") &&
      resolution.firstIntroductionPacketId !== null
    ) {
      fail("task7_v2_checkpoint_as_first_introduction");
    }
  }
  exactCanonical(
    value.resolutions,
    EXPECTED_RESOLUTIONS,
    "task7_v2_resolution_binding",
  );

  record(value.sequence, "task7_v2_sequence");
  if (
    value.sequence.nextEligibleSessionId !== "de_l01_s01" ||
    value.sequence.currentlyMaterializable !== false
  ) {
    fail("task7_v2_l01_prerequisite");
  }
  exactCanonical(
    value.sequence,
    {
      nextEligibleSessionId: "de_l01_s01",
      eligibilityKind: "NEXT_ORDERED_SESSION_AFTER_SEPARATE_TASK7_UNLOCK",
      currentlyMaterializable: false,
      prerequisiteLessonIds: [],
      l02: {
        sessionId: "de_l02_s01",
        eligibleFirst: false,
        blockedByLessonId: "de_l01",
        reason: "L01_PREREQUISITE_NOT_MATERIALIZED",
      },
    },
    "task7_v2_l01_prerequisite",
  );
  if (
    !Array.isArray(value.materializedPacketPaths) ||
    value.materializedPacketPaths.length !== 0
  ) {
    fail("task7_v2_materialization_forbidden");
  }

  return deepFreeze(value as unknown as GermanTask7V2AllocationInventory);
}

function deriveTask5Inventory(task5: unknown): Readonly<{
  packetIds: readonly string[];
  plans: readonly Readonly<{
    id: string;
    checkpointPacketId: string;
  }>[];
}> {
  record(task5, "task7_v2_task5_record");
  if (
    task5.schemaVersion !== "learning-v2-german-chapter-blueprints.v2" ||
    task5.targetLanguage !== "de" ||
    !Array.isArray(task5.lessons) ||
    task5.lessons.length !== 32
  ) {
    fail("task7_v2_task5_binding");
  }
  const packetIds: string[] = [];
  const plans: { id: string; checkpointPacketId: string }[] = [];
  for (const lessonValue of task5.lessons) {
    record(lessonValue, "task7_v2_task5_lesson");
    if (
      !Array.isArray(lessonValue.chapters) ||
      lessonValue.chapters.length !== 7
    ) {
      fail("task7_v2_packet_inventory");
    }
    for (const chapterValue of lessonValue.chapters) {
      record(chapterValue, "task7_v2_task5_chapter");
      if (
        !Array.isArray(chapterValue.packetIds) ||
        chapterValue.packetIds.length !== 8
      ) {
        fail("task7_v2_packet_inventory");
      }
      for (const packetId of chapterValue.packetIds) {
        if (
          typeof packetId !== "string" ||
          !/^de_l\d{2}_c\d{2}_s\d{2}$/u.test(packetId)
        ) {
          fail("task7_v2_packet_inventory");
        }
        packetIds.push(packetId);
      }
      record(chapterValue.checkpoint, "task7_v2_task5_checkpoint");
      if (
        typeof chapterValue.checkpoint.packetId !== "string" ||
        !Array.isArray(chapterValue.checkpoint.plannedNewLexicalSenses)
      ) {
        fail("task7_v2_plan_inventory");
      }
      for (const planValue of chapterValue.checkpoint.plannedNewLexicalSenses) {
        record(planValue, "task7_v2_task5_plan");
        if (typeof planValue.id !== "string") fail("task7_v2_plan_inventory");
        plans.push({
          id: planValue.id,
          checkpointPacketId: chapterValue.checkpoint.packetId,
        });
      }
    }
  }
  if (
    packetIds.length !== 1792 ||
    new Set(packetIds).size !== 1792 ||
    packetIds[0] !== "de_l01_c01_s01" ||
    hashCanonicalBody(packetIds) !== PACKET_IDS_SHA256
  ) {
    fail("task7_v2_packet_inventory");
  }
  const planIds = plans.map((plan) => plan.id);
  if (
    planIds.length !== 288 ||
    new Set(planIds).size !== 288 ||
    hashCanonicalBody(planIds) !== PLAN_IDS_SHA256
  ) {
    fail("task7_v2_plan_inventory");
  }
  if (hashCanonicalBody(task5) !== TASK5_CANONICAL_SHA256) {
    fail("task7_v2_task5_binding");
  }
  return deepFreeze({ packetIds, plans });
}

function validateTask6(
  task6: unknown,
  inventory: GermanTask7V2AllocationInventory,
): void {
  record(task6, "task7_v2_task6_record");
  if (hashCanonicalBody(task6) !== TASK6_CANONICAL_SHA256) {
    fail("task7_v2_task6_canonical_semantics");
  }
  record(task6.authority, "task7_v2_task6_authority");
  if (
    task6.schemaVersion !== "learning-v2-german-task6-canonical-registry.v2" ||
    task6.authority.status !== "TASK6_V2_CANONICAL_PARTIAL" ||
    task6.authority.rowsMaterialized !== 6 ||
    task6.authority.rowsPromoted !== 0 ||
    task6.authority.task7Unlock !== false ||
    task6.authority.learnerFacing !== false ||
    task6.authority.releaseAuthorized !== false ||
    task6.authority.consumerCutover !== "NONE"
  ) {
    fail("task7_v2_task6_authority");
  }
  record(task6.sourceBindings, "task7_v2_task6_bindings");
  record(task6.sourceBindings.task5V2, "task7_v2_task6_task5_binding");
  if (
    task6.sourceBindings.task5V2.path !== TASK5_PATH ||
    task6.sourceBindings.task5V2.byteSha256 !== TASK5_BYTE_SHA256 ||
    task6.sourceBindings.task5V2.canonicalBodySha256 !== TASK5_CANONICAL_SHA256
  ) {
    fail("task7_v2_task6_task5_binding");
  }
  record(task6.registry, "task7_v2_task6_registry");
  if (
    !Array.isArray(task6.registry.lexicalSenses) ||
    task6.registry.lexicalSenses.length !== 6
  ) {
    fail("task7_v2_task6_lexical_registry");
  }
  const senseIds = new Set(
    task6.registry.lexicalSenses.map((sense) => {
      record(sense, "task7_v2_task6_lexical_row");
      if (typeof sense.id !== "string") fail("task7_v2_task6_lexical_row");
      return sense.id;
    }),
  );
  record(task6.authorityContext, "task7_v2_task6_context");
  if (!Array.isArray(task6.authorityContext.lexicalMappings)) {
    fail("task7_v2_task6_context");
  }
  const mappings = new Map<string, JsonRecord>();
  for (const mappingValue of task6.authorityContext.lexicalMappings) {
    record(mappingValue, "task7_v2_task6_mapping");
    if (
      typeof mappingValue.sourcePlanId !== "string" ||
      typeof mappingValue.canonicalId !== "string" ||
      mappings.has(mappingValue.sourcePlanId)
    ) {
      fail("task7_v2_task6_mapping");
    }
    mappings.set(mappingValue.sourcePlanId, mappingValue);
  }
  for (const resolution of inventory.resolutions) {
    const mapping = mappings.get(resolution.sourcePlanId);
    if (
      mapping === undefined ||
      mapping.canonicalId !== resolution.canonicalSenseId ||
      !senseIds.has(resolution.canonicalSenseId)
    ) {
      fail("task7_v2_resolution_binding");
    }
    if (resolution.sourcePlanId.startsWith("de_lex_plan_l01_")) {
      if (
        mapping.plannedWordFirstPacketId !==
          resolution.firstIntroductionPacketId ||
        mapping.plannedFirstScoredUsePacketId !== resolution.checkpointPacketId
      ) {
        fail("task7_v2_resolution_binding");
      }
    } else {
      if (
        resolution.firstIntroductionPacketId !== null ||
        !Array.isArray(mapping.plannedUsePacketIds) ||
        !mapping.plannedUsePacketIds.includes(resolution.checkpointPacketId)
      ) {
        fail("task7_v2_checkpoint_as_first_introduction");
      }
    }
  }
}

export function validateGermanTask7V2InventoryAgainstSourcesForAuditDeV2(
  inputs: Readonly<{
    inventory: unknown;
    task5V2: unknown;
    task6V2: unknown;
  }>,
): GermanTask7V2InventoryAudit {
  const inventory = parseGermanTask7V2AllocationInventoryDeV2(inputs.inventory);
  const task5 = deriveTask5Inventory(inputs.task5V2);
  validateTask6(inputs.task6V2, inventory);
  const checkpointByPlan = new Map(
    task5.plans.map((plan) => [plan.id, plan.checkpointPacketId]),
  );
  for (const resolution of inventory.resolutions) {
    if (
      checkpointByPlan.get(resolution.sourcePlanId) !==
      resolution.checkpointPacketId
    ) {
      fail("task7_v2_resolution_binding");
    }
  }
  const resolvedIds = inventory.resolutions.map((row) => row.sourcePlanId);
  const resolvedSet = new Set(resolvedIds);
  const unresolvedIds = task5.plans
    .map((plan) => plan.id)
    .filter((id) => !resolvedSet.has(id));
  if (
    resolvedSet.size !== 6 ||
    hashCanonicalBody(resolvedIds) !== RESOLVED_PLAN_IDS_SHA256 ||
    unresolvedIds.length !== 282 ||
    hashCanonicalBody(unresolvedIds) !== UNRESOLVED_PLAN_IDS_SHA256
  ) {
    fail("task7_v2_resolution_partition");
  }
  return deepFreeze({
    status: "V2_AUTHORITY_MIGRATED_PARTIAL" as const,
    task5PlanIds: 288 as const,
    resolvedPlanIds: 6 as const,
    unresolvedPlanIds: 282 as const,
    packetIds: 1792 as const,
    materializedPackets: 0 as const,
    nextEligibleSessionId: "de_l01_s01" as const,
    task7Unlock: false as const,
    learnerFacing: false as const,
    releaseAuthorized: false as const,
  });
}

export function isGermanTask7V2AuthorityMigrationHoldDeV2(
  value: unknown,
): value is GermanTask7V2AuthorityMigrationHold {
  return value !== null && typeof value === "object" && MIGRATED.has(value);
}

/**
 * Fixed-path migration loader. It exposes HOLD state only and never accepts
 * caller-provided authority, owner approval, paths, hashes, or allocation rows.
 */
export function loadGermanTask7V2AuthorityMigrationHoldDeV2(
  ...callerSuppliedAuthority: readonly unknown[]
): GermanTask7V2AuthorityMigrationHold {
  if (callerSuppliedAuthority.length !== 0) {
    fail("task7_v2_caller_supplied_authority_forbidden");
  }
  const inventoryRaw = readBytes(INVENTORY_PATH);
  const task5Raw = readBytes(TASK5_PATH);
  const task6Raw = readBytes(TASK6_PATH);
  if (sha256(inventoryRaw) !== INVENTORY_SHA256) {
    fail("task7_v2_inventory_byte_binding");
  }
  if (sha256(task5Raw) !== TASK5_BYTE_SHA256) {
    fail("task7_v2_task5_binding");
  }
  if (sha256(task6Raw) !== TASK6_BYTE_SHA256) {
    fail("task7_v2_task6_phase_b_binding");
  }
  for (const binding of PHASE_A_BINDINGS) {
    if (sha256(readBytes(binding.path)) !== binding.sha256) {
      fail("task7_v2_task6_phase_a_binding");
    }
  }
  for (const binding of [
    PHASE_B_BINDINGS.lexicalRegistry,
    PHASE_B_BINDINGS.canonicalBundle,
    PHASE_B_BINDINGS.gate,
    PHASE_B_BINDINGS.receipt,
  ]) {
    if (sha256(readBytes(binding.path)) !== binding.sha256) {
      fail("task7_v2_task6_phase_b_binding");
    }
  }
  const audit = validateGermanTask7V2InventoryAgainstSourcesForAuditDeV2({
    inventory: JSON.parse(inventoryRaw.toString("utf8")) as unknown,
    task5V2: JSON.parse(task5Raw.toString("utf8")) as unknown,
    task6V2: JSON.parse(task6Raw.toString("utf8")) as unknown,
  });
  const hold = deepFreeze({
    status: audit.status,
    authority: "HOLD" as const,
    task5PlanIds: audit.task5PlanIds,
    resolvedPlanIds: audit.resolvedPlanIds,
    unresolvedPlanIds: audit.unresolvedPlanIds,
    packetIds: audit.packetIds,
    materializedPackets: audit.materializedPackets,
    nextEligibleSessionId: audit.nextEligibleSessionId,
    currentlyMaterializable: false as const,
    task7Unlock: audit.task7Unlock,
    learnerFacing: audit.learnerFacing,
    releaseAuthorized: audit.releaseAuthorized,
  });
  MIGRATED.add(hold);
  return hold as GermanTask7V2AuthorityMigrationHold;
}
