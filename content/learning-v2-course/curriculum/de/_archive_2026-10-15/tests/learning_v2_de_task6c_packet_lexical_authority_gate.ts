import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const AUTHORITY_PATH =
  "docs/v2/curriculum/de/TASK6C_PACKET_LEXICAL_ALLOCATION_AUTHORITY_2026-10-11.md";
const SCHEMA_PATH =
  "modules/learning-v2/curriculum/de/registries/task6c_packet_lexical_allocation_schema_de_v1.json";
const LEGACY_SCHEMA_MIRROR_PATH =
  "docs/v2/curriculum/de/task6c_packet_lexical_allocation_schema_de_v1.json";
const RECEIPT_PATH =
  "docs/v2/curriculum/de/TASK6C_PACKET_LEXICAL_ALLOCATION_RECEIPT_2026-10-11.md";
const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json";
const RECEIPT_BINDING = /^<!-- TASK6C_AUTHORITY_SCHEMA_SHA256: ([a-f0-9]{64}) -->$/mu;

assert.ok(
  fs.existsSync(AUTHORITY_PATH),
  "task6c_packet_lexical_authority_missing",
);
assert.ok(
  fs.existsSync(SCHEMA_PATH),
  "task6c_packet_lexical_allocation_schema_missing",
);
assert.ok(fs.existsSync(LEGACY_SCHEMA_MIRROR_PATH), "task6c_legacy_schema_mirror_missing");
assert.ok(fs.existsSync(RECEIPT_PATH), "task6c_packet_lexical_receipt_missing");

type RecordValue = Record<string, unknown>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validateReceiptBinding(rawSchema: string, receipt: string): void {
  const match = receipt.match(RECEIPT_BINDING);
  assert.ok(match, "task6c_schema_receipt_binding_missing");
  assert.equal(sha256(rawSchema), match[1], "task6c_schema_receipt_binding_mismatch");
}

function validateLegacyMirror(rawCanonical: string, rawMirror: string): void {
  assert.equal(rawMirror, rawCanonical, "task6c_legacy_schema_mirror_drift");
  assert.equal(sha256(rawMirror), sha256(rawCanonical), "task6c_legacy_schema_mirror_hash_drift");
}

function validateHoldClauses(authority: string, receipt: string): void {
  const required = [
    /\*\*Status:\*\* `PENDING \/ NOT_CANONICAL \/ TASK7_UNLOCK_FORBIDDEN`/u,
    /\*\*Gate state:\*\* `HOLD`/u,
    /`task7Unlock=false`/u,
    /Task 7 packet materialization stays blocked/u,
    /`NON_AUTHORITATIVE_MIRROR`/u,
  ];
  for (const pattern of required) {
    assert.match(authority, pattern, "task6c_authority_hold_clause_missing");
    assert.match(receipt, pattern, "task6c_receipt_hold_clause_missing");
  }
  const forbidden = [
    /canonicalRegistryStatus=CANONICAL/u,
    /`task7Unlock=true`/u,
    /(?:["'`])?task7Unlock(?:["'`])?\s*:\s*true/iu,
    /\*\*Status:\*\* `(?:APPROVED|CANONICAL|TASK7_UNLOCK_ALLOWED)`/u,
    /\*\*Gate state:\*\* `(?:PASS|UNLOCKED|AUTHORIZED)`/u,
    /^(?:Task 7|packet materialization|release)\b[^\n.]*(?:authorized|unlocked)/imu,
    /Task 7 packet materialization may proceed/iu,
  ];
  for (const pattern of forbidden) {
    assert.doesNotMatch(authority, pattern, "task6c_authority_contradictory_hold_clause");
    assert.doesNotMatch(receipt, pattern, "task6c_receipt_contradictory_hold_clause");
  }
}

function assertRecord(value: unknown, label: string): asserts value is RecordValue {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), label);
}

function sourcePacketIds(task5: RecordValue): string[] {
  const lessons = task5.lessons;
  assert.ok(Array.isArray(lessons), "task6c_task5_lessons_missing");
  return lessons.flatMap((lesson) => {
    assertRecord(lesson, "task6c_task5_lesson_record_required");
    assert.ok(Array.isArray(lesson.chapters), "task6c_task5_chapters_missing");
    return lesson.chapters.flatMap((chapter) => {
      assertRecord(chapter, "task6c_task5_chapter_record_required");
      assert.ok(Array.isArray(chapter.packetIds), "task6c_task5_packet_ids_missing");
      return chapter.packetIds as string[];
    });
  });
}

function validateProposedAllocation(
  value: RecordValue,
  task5PacketIds: readonly string[],
  requiredTask5SourcePlanIds: readonly string[],
): void {
  assert.equal(value.status, "PROPOSED_NOT_CANONICAL", "task6c_proposal_status_required");
  assert.equal(value.task7Unlock, false, "task6c_task7_unlock_forbidden");
  assert.ok(Array.isArray(value.allocations), "task6c_allocations_array_required");
  const allocations = value.allocations as RecordValue[];
  assert.ok(allocations.length >= task5PacketIds.length, "task6c_packet_coverage_minimum_required");
  assert.ok(allocations.length <= task5PacketIds.length * 5, "task6c_packet_coverage_maximum_required");
  const packetCounts = new Map<string, number>();
  const firstIntroductions = new Set<string>();
  const preservedTask5SourcePlanIds = new Set<string>();
  const task5SourcePlanIdSet = new Set(requiredTask5SourcePlanIds);
  for (const row of allocations) {
    assertRecord(row, "task6c_allocation_record_required");
    assert.equal(Object.keys(row).sort().join(","), "canonicalSenseId,firstIntroductionPacketId,sourceKind,sourcePlanId", "task6c_allocation_closed_schema");
    assert.equal(typeof row.canonicalSenseId, "string", "task6c_canonical_id_required");
    assert.ok((row.canonicalSenseId as string).trim().length > 0, "task6c_empty_canonical_sense");
    assert.equal(typeof row.firstIntroductionPacketId, "string", "task6c_first_intro_required");
    assert.equal(typeof row.sourcePlanId, "string", "task6c_source_plan_required");
    assert.ok(
      row.sourceKind === "TASK5_CHECKPOINT" || row.sourceKind === "TASK6C_ADDITIVE",
      "task6c_source_kind_invalid",
    );
    assert.ok(task5PacketIds.includes(row.firstIntroductionPacketId as string), "task6c_unknown_packet");
    assert.ok(!firstIntroductions.has(row.canonicalSenseId as string), "task6c_duplicate_canonical_intro");
    const nextCount = (packetCounts.get(row.firstIntroductionPacketId as string) ?? 0) + 1;
    assert.ok(nextCount <= 5, "task6c_packet_sense_count_exceeds_max");
    packetCounts.set(row.firstIntroductionPacketId as string, nextCount);
    firstIntroductions.add(row.canonicalSenseId as string);
    if (task5SourcePlanIdSet.has(row.sourcePlanId as string)) {
      preservedTask5SourcePlanIds.add(row.sourcePlanId as string);
    }
  }
  for (const packetId of task5PacketIds) {
    assert.ok((packetCounts.get(packetId) ?? 0) >= 1, "task6c_omitted_packet");
  }
  assert.deepEqual(
    [...preservedTask5SourcePlanIds].sort(),
    [...requiredTask5SourcePlanIds].sort(),
    "task6c_task5_source_plan_not_preserved",
  );
}

function validateTask5Checkpoint(value: RecordValue): void {
  assert.ok(Array.isArray(value.plannedNewLexicalSenses), "task6c_checkpoint_lexical_array_required");
  assert.ok(value.plannedNewLexicalSenses.length > 0, "task6c_empty_checkpoint");
  for (const sense of value.plannedNewLexicalSenses) {
    assertRecord(sense, "task6c_checkpoint_sense_record_required");
    assert.equal(typeof sense.id, "string", "task6c_checkpoint_sense_id_required");
    assert.ok((sense.id as string).trim().length > 0, "task6c_checkpoint_sense_id_empty");
  }
}

function validateSchemaSourceIdentity(value: RecordValue): void {
  assertRecord(value.sourceIdentities, "task6c_source_identities_required");
  assertRecord(value.sourceIdentities.task5ChapterBlueprints, "task6c_task5_identity_required");
  assert.equal(
    value.sourceIdentities.task5ChapterBlueprints.path,
    TASK5_PATH,
    "task6c_task5_source_path_drift",
  );
  assert.equal(
    value.sourceIdentities.task5ChapterBlueprints.canonicalSha256,
    hashCanonicalBody(JSON.parse(fs.readFileSync(TASK5_PATH, "utf8"))),
    "task6c_task5_digest_drift",
  );
}

const rawSchema = fs.readFileSync(SCHEMA_PATH, "utf8");
const rawLegacySchemaMirror = fs.readFileSync(LEGACY_SCHEMA_MIRROR_PATH, "utf8");
const receipt = fs.readFileSync(RECEIPT_PATH, "utf8");
const authority = fs.readFileSync(AUTHORITY_PATH, "utf8");
validateReceiptBinding(rawSchema, receipt);
assert.throws(
  () => validateReceiptBinding(`${rawSchema} `, receipt),
  /task6c_schema_receipt_binding_mismatch/u,
);
validateLegacyMirror(rawSchema, rawLegacySchemaMirror);
assert.throws(
  () => validateLegacyMirror(rawSchema, `${rawLegacySchemaMirror} `),
  /task6c_legacy_schema_mirror_drift/u,
);
validateHoldClauses(authority, receipt);
assert.throws(
  () => validateHoldClauses(authority.replaceAll("`task7Unlock=false`", "`task7Unlock=true`"), receipt),
  /task6c_authority_hold_clause_missing/u,
);
assert.throws(
  () => validateHoldClauses(`${authority}\nTask 7 packet materialization is authorized.`, receipt),
  /task6c_authority_contradictory_hold_clause/u,
);
assert.throws(
  () => validateHoldClauses(authority, `${receipt}\nTask 7 packet materialization is authorized.`),
  /task6c_receipt_contradictory_hold_clause/u,
);
const additiveForgeries = [
  "**Status:** `APPROVED`",
  "**Status:** `CANONICAL`",
  "**Status:** `TASK7_UNLOCK_ALLOWED`",
  '"task7Unlock": true',
  "Task 7 packet materialization may proceed",
];
for (const forged of additiveForgeries) {
  assert.throws(
    () => validateHoldClauses(`${authority}\n${forged}`, receipt),
    /task6c_authority_contradictory_hold_clause/u,
  );
  assert.throws(
    () => validateHoldClauses(authority, `${receipt}\n${forged}`),
    /task6c_receipt_contradictory_hold_clause/u,
  );
}
const schema = JSON.parse(rawSchema) as RecordValue;
assert.deepEqual(Object.keys(schema).sort(), [
  "allocationStatus",
  "authorityVersion",
  "canonicalRegistryStatus",
  "coverageRequirement",
  "sourceIdentities",
  "task7Unlock",
]);
assert.equal(schema.authorityVersion, "learning-v2-german-task6c-packet-lexical-allocation.v1");
assert.equal(schema.allocationStatus, "PENDING");
assert.equal(schema.canonicalRegistryStatus, "NOT_CANONICAL");
assert.equal(schema.task7Unlock, false);
validateSchemaSourceIdentity(schema);
assertRecord(schema.coverageRequirement, "task6c_coverage_requirement_required");
assert.equal(schema.coverageRequirement.packetCount, 1792);
assert.equal(schema.coverageRequirement.minimumNewSensesPerPacket, 1);
assert.equal(schema.coverageRequirement.maximumNewSensesPerPacket, 5);

const task5 = JSON.parse(fs.readFileSync(TASK5_PATH, "utf8")) as RecordValue;
const packetIds = sourcePacketIds(task5);
assert.equal(packetIds.length, 1792, "task6c_task5_topology_drift");
const task5CheckpointPlans = (task5.lessons as RecordValue[]).flatMap((lesson) =>
  (lesson.chapters as RecordValue[]).flatMap((chapter) => {
    assertRecord(chapter.checkpoint, "task6c_task5_checkpoint_required");
    validateTask5Checkpoint(chapter.checkpoint);
    return chapter.checkpoint.plannedNewLexicalSenses as RecordValue[];
  }),
);
assert.equal(task5CheckpointPlans.length, 288, "task6c_task5_checkpoint_plan_count_drift");
const task5SourcePlanIds = task5CheckpointPlans.map((plan) => {
  assert.equal(typeof plan.id, "string", "task6c_task5_source_plan_id_required");
  return plan.id as string;
});
assert.equal(new Set(task5SourcePlanIds).size, 288, "task6c_task5_source_plan_duplicate");

const fixture = {
  status: "PROPOSED_NOT_CANONICAL",
  task7Unlock: false,
  allocations: packetIds.map((packetId, index) => ({
    canonicalSenseId: `test_sense_${index + 1}`,
    firstIntroductionPacketId: packetId,
    sourceKind: "TASK5_CHECKPOINT",
    sourcePlanId: task5SourcePlanIds[index % task5SourcePlanIds.length],
  })),
};
fixture.allocations.push({
  canonicalSenseId: "test_sense_multi_packet",
  firstIntroductionPacketId: packetIds[0],
  sourceKind: "TASK5_CHECKPOINT",
  sourcePlanId: task5SourcePlanIds[0],
});
validateProposedAllocation(fixture, packetIds, task5SourcePlanIds);

const omittedPacket = structuredClone(fixture);
omittedPacket.allocations = omittedPacket.allocations.filter(
  (row) => row.firstIntroductionPacketId !== packetIds[1],
);
assert.throws(() => validateProposedAllocation(omittedPacket, packetIds, task5SourcePlanIds), /task6c_omitted_packet/u);
const duplicateCanonical = structuredClone(fixture);
duplicateCanonical.allocations[1].canonicalSenseId = duplicateCanonical.allocations[0].canonicalSenseId;
assert.throws(() => validateProposedAllocation(duplicateCanonical, packetIds, task5SourcePlanIds), /task6c_duplicate_canonical_intro/u);
const emptyCheckpoint = structuredClone(fixture);
emptyCheckpoint.allocations[0].canonicalSenseId = "";
assert.throws(() => validateProposedAllocation(emptyCheckpoint, packetIds, task5SourcePlanIds), /task6c_empty_canonical_sense/u);
assert.throws(
  () => validateTask5Checkpoint({ plannedNewLexicalSenses: [] }),
  /task6c_empty_checkpoint/u,
);
const evidenceMismatch = structuredClone(schema);
(evidenceMismatch.sourceIdentities as RecordValue).task5ChapterBlueprints = {
  ...((schema.sourceIdentities as RecordValue).task5ChapterBlueprints as RecordValue),
  canonicalSha256: "0".repeat(64),
};
assert.throws(
  () => validateSchemaSourceIdentity(evidenceMismatch),
  /task6c_task5_digest_drift/u,
);
const missingPlan = structuredClone(fixture);
for (const row of missingPlan.allocations) {
  if (row.sourcePlanId === task5SourcePlanIds[0]) row.sourcePlanId = task5SourcePlanIds[1];
}
assert.throws(
  () => validateProposedAllocation(missingPlan, packetIds, task5SourcePlanIds),
  /task6c_task5_source_plan_not_preserved/u,
);

process.stdout.write("TASK6C_PACKET_LEXICAL_ALLOCATION authority=PENDING canonical=NOT_CANONICAL task7Unlock=false topology=1792 status=HOLD\n");
