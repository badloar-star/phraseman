import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

const CHECKPOINT =
  "docs/v2/curriculum/de/TASK6C_FULL_REGISTRY_L01_CHECKPOINT_2026-10-11.md";
const CONTRACT =
  "docs/v2/curriculum/de/task6c-full-registry-l01-v1/target-allocation.json";
const TASK5 = "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json";
const ENGLISH = "modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts";
const KERNEL =
  "modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts";
const REGISTRY =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";
type Row = Record<string, unknown>;
const sha = (path: string) =>
  createHash("sha256")
    .update(fs.readFileSync(path, "utf8"), "utf8")
    .digest("hex");
const checkpoint = fs.readFileSync(CHECKPOINT, "utf8");
const raw = fs.readFileSync(CONTRACT, "utf8");
const contract = JSON.parse(raw) as Row;

assert.match(
  checkpoint,
  /Task 5: `32\/32`, `224\/224`, `1792\/1792`/u,
  "task6c_checkpoint_task5_truth_missing",
);
assert.match(
  checkpoint,
  /Task 7: `HOLD 0\/1792`/u,
  "task6c_checkpoint_task7_hold_missing",
);
const artifactDigest = checkpoint.match(
  /<!-- TASK6C_L01_TARGET_ALLOCATION_SHA256: ([a-f0-9]{64}) -->/u,
);
assert.ok(artifactDigest, "task6c_target_artifact_digest_missing");
assert.equal(
  artifactDigest[1],
  sha(CONTRACT),
  "task6c_target_artifact_digest_drift",
);

function validate(value: Row): void {
  assert.deepEqual(
    Object.keys(value).sort(),
    [
      "allocation",
      "authority",
      "bindings",
      "schemaVersion",
      "status",
      "task7Unlock",
    ],
    "task6c_l01_closed_schema",
  );
  assert.equal(
    value.status,
    "PLANNED_NOT_CANONICAL_HOLD",
    "task6c_l01_promotion_forbidden",
  );
  assert.equal(value.task7Unlock, false, "task6c_l01_unlock_forbidden");
  assert.deepEqual(
    value.authority,
    {
      canonicalRegistry: "NOT_CANONICAL",
      packetMaterialization: "HOLD",
      learnerFacing: "HOLD",
      release: "HOLD",
    },
    "task6c_l01_approval_or_evidence_injection",
  );
  const bindings = value.bindings as Record<string, Row>;
  assert.deepEqual(
    Object.keys(bindings).sort(),
    ["englishSurface", "task5", "task6Kernel", "task6Registry"],
    "task6c_l01_bindings_closed_schema",
  );
  for (const [key, path] of Object.entries({
    task5: TASK5,
    englishSurface: ENGLISH,
    task6Kernel: KERNEL,
    task6Registry: REGISTRY,
  })) {
    assert.equal(bindings[key].path, path, `task6c_l01_${key}_static_path`);
    assert.equal(
      bindings[key].sha256,
      sha(path),
      `task6c_l01_${key}_byte_drift`,
    );
  }
  const allocation = value.allocation as Row;
  assert.deepEqual(
    Object.keys(allocation).sort(),
    [
      "additiveCheckpointFirstIntroductions",
      "minimumPlannedSenses",
      "nonCheckpointFirstIntroductions",
      "packetIds",
      "task5CheckpointSenses",
    ],
    "task6c_l01_allocation_closed_schema",
  );
  const task5 = JSON.parse(fs.readFileSync(TASK5, "utf8")) as {
    lessons: Array<{
      lessonId: string;
      chapters: Array<{
        packetIds: string[];
        checkpoint: { plannedNewLexicalSenses: Array<{ id: string }> };
      }>;
    }>;
  };
  const l01 = task5.lessons.find((lesson) => lesson.lessonId === "de_l01")!;
  const expectedPackets = l01.chapters.flatMap((chapter) => chapter.packetIds);
  assert.deepEqual(
    allocation.packetIds,
    expectedPackets,
    "task6c_l01_packet_set_mismatch",
  );
  const expectedPlans = l01.chapters
    .flatMap((chapter) =>
      chapter.checkpoint.plannedNewLexicalSenses.map((plan) => plan.id),
    )
    .sort();
  const checkpointRows = allocation.task5CheckpointSenses as Row[];
  const nonCheckpointRows = allocation.nonCheckpointFirstIntroductions as Row[];
  const additiveRows = allocation.additiveCheckpointFirstIntroductions as Row[];
  assert.equal(
    allocation.minimumPlannedSenses,
    70,
    "task6c_l01_total_planned_senses",
  );
  assert.equal(nonCheckpointRows.length, 49, "task6c_l01_noncheckpoint_count");
  assert.equal(additiveRows.length, 7, "task6c_l01_additive_checkpoint_count");
  for (const row of checkpointRows) {
    assert.deepEqual(
      Object.keys(row).sort(),
      ["firstIntroductionPacketId", "plannedSenseId", "sourcePlanId"],
      "task6c_l01_task5_checkpoint_schema",
    );
    assert.equal(
      typeof row.sourcePlanId,
      "string",
      "task6c_l01_task5_sourceplan_required",
    );
  }
  for (const row of nonCheckpointRows) {
    assert.deepEqual(
      Object.keys(row).sort(),
      ["firstIntroductionPacketId", "plannedSenseId", "sourcePlanId"],
      "task6c_l01_noncheckpoint_schema",
    );
    assert.equal(
      row.sourcePlanId,
      null,
      "task6c_l01_noncheckpoint_sourceplan_forbidden",
    );
  }
  const firstIntroductions = [...nonCheckpointRows, ...additiveRows];
  assert.equal(
    new Set(firstIntroductions.map((row) => row.plannedSenseId)).size,
    56,
    "task6c_l01_first_intro_duplicate",
  );
  assert.equal(
    new Set([
      ...checkpointRows.map((row) => row.plannedSenseId),
      ...firstIntroductions.map((row) => row.plannedSenseId),
    ]).size,
    70,
    "task6c_l01_total_planned_sense_duplicate",
  );
  const expectedCheckpointPackets = expectedPackets.filter((packetId) =>
    /s(?:08|16|24|32|40|48|56)$/u.test(packetId),
  );
  assert.deepEqual(
    additiveRows.map((row) => row.firstIntroductionPacketId).sort(),
    expectedCheckpointPackets.sort(),
    "task6c_l01_additive_checkpoint_packet_set",
  );
  assert.equal(
    new Set(additiveRows.map((row) => row.firstIntroductionPacketId)).size,
    7,
    "task6c_l01_additive_checkpoint_packet_duplicate",
  );
  const perPacket = new Map<string, number>();
  for (const row of [...checkpointRows, ...firstIntroductions]) {
    assert.ok(
      expectedPackets.includes(row.firstIntroductionPacketId as string),
      "task6c_l01_first_intro_unknown_packet",
    );
    perPacket.set(
      row.firstIntroductionPacketId as string,
      (perPacket.get(row.firstIntroductionPacketId as string) ?? 0) + 1,
    );
  }
  for (const packetId of expectedPackets)
    assert.ok(
      (perPacket.get(packetId) ?? 0) >= 1 &&
        (perPacket.get(packetId) ?? 0) <= 5,
      "task6c_l01_packet_cardinality",
    );
  for (const row of additiveRows) {
    assert.deepEqual(
      Object.keys(row).sort(),
      ["firstIntroductionPacketId", "plannedSenseId", "role", "sourcePlanId"],
      "task6c_l01_additive_schema",
    );
    assert.equal(
      row.role,
      "ADDITIVE_CHECKPOINT_PLACEHOLDER",
      "task6c_l01_additive_role_required",
    );
    assert.equal(
      row.sourcePlanId,
      null,
      "task6c_l01_additive_sourceplan_forbidden",
    );
  }
  assert.deepEqual(
    checkpointRows.map((row) => row.sourcePlanId).sort(),
    expectedPlans,
    "task6c_l01_source_plan_set_mismatch",
  );
  assert.equal(
    new Set(checkpointRows.map((row) => row.sourcePlanId)).size,
    14,
    "task6c_l01_source_plan_duplicate",
  );
  const checkpointPacketByPlan = new Map(
    l01.chapters.flatMap((chapter) =>
      chapter.checkpoint.plannedNewLexicalSenses.map((plan) => [
        plan.id,
        chapter.packetIds.at(-1)!,
      ]),
    ),
  );
  for (const row of checkpointRows) {
    const ownCheckpoint = checkpointPacketByPlan.get(
      row.sourcePlanId as string,
    );
    assert.ok(ownCheckpoint, "task6c_l01_source_plan_checkpoint_missing");
    assert.ok(
      expectedPackets.indexOf(row.firstIntroductionPacketId as string) <
        expectedPackets.indexOf(ownCheckpoint),
      "task6c_l01_sourceplan_chronology_conflict",
    );
  }
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8")) as {
    authorityContext: {
      lexicalMappings: Array<{
        sourcePlanId: string;
        canonicalId: string;
        plannedWordFirstPacketId: string;
      }>;
    };
  };
  const canonical = new Map(
    registry.authorityContext.lexicalMappings.map((row) => [
      row.sourcePlanId,
      row,
    ]),
  );
  for (const row of checkpointRows) {
    const protectedRow = canonical.get(row.sourcePlanId as string);
    if (protectedRow)
      assert.equal(
        row.firstIntroductionPacketId,
        protectedRow.plannedWordFirstPacketId,
        "task6c_l01_protected_sourceplan_chronology_conflict",
      );
  }
}

validate(contract);
const conflict = structuredClone(contract);
((conflict.allocation as Row).task5CheckpointSenses as Row[]).find(
  (row) => row.sourcePlanId === "de_lex_plan_l01_c01_nachbarin_v1",
)!.firstIntroductionPacketId = "de_l01_c01_s02";
assert.throws(
  () => validate(conflict),
  /task6c_l01_protected_sourceplan_chronology_conflict/u,
);
const lateHallo = structuredClone(contract);
((lateHallo.allocation as Row).task5CheckpointSenses as Row[]).find(
  (row) => row.sourcePlanId === "de_lex_plan_l01_c01_hallo_v1",
)!.firstIntroductionPacketId = "de_l01_c07_s56";
assert.throws(
  () => validate(lateHallo),
  /task6c_l01_sourceplan_chronology_conflict/u,
);
const approval = structuredClone(contract);
approval.approval = "PASS";
assert.throws(() => validate(approval), /task6c_l01_closed_schema/u);
const evidence = structuredClone(contract);
(evidence.allocation as Row).evidence = [];
assert.throws(() => validate(evidence), /task6c_l01_allocation_closed_schema/u);
const omitted = structuredClone(contract);
(omitted.allocation as Row).additiveCheckpointFirstIntroductions = (
  (omitted.allocation as Row).additiveCheckpointFirstIntroductions as Row[]
).slice(1);
assert.throws(
  () => validate(omitted),
  /task6c_l01_additive_checkpoint_count|task6c_l01_packet_cardinality/u,
);
const additiveCollision = structuredClone(contract);
(
  (additiveCollision.allocation as Row)
    .additiveCheckpointFirstIntroductions as Row[]
)[0].plannedSenseId = (
  (additiveCollision.allocation as Row).nonCheckpointFirstIntroductions as Row[]
)[0].plannedSenseId;
assert.throws(
  () => validate(additiveCollision),
  /task6c_l01_first_intro_duplicate/u,
);
const additiveMoved = structuredClone(contract);
(
  (additiveMoved.allocation as Row)
    .additiveCheckpointFirstIntroductions as Row[]
)[0].firstIntroductionPacketId = "de_l01_c01_s07";
assert.throws(
  () => validate(additiveMoved),
  /task6c_l01_additive_checkpoint_packet_set/u,
);
const additiveExtra = structuredClone(contract);
(
  (additiveExtra.allocation as Row)
    .additiveCheckpointFirstIntroductions as Row[]
).push({
  plannedSenseId: "de_plan_l01_additive_checkpoint_extra_v1",
  sourcePlanId: null,
  firstIntroductionPacketId: "de_l01_c01_s08",
  role: "ADDITIVE_CHECKPOINT_PLACEHOLDER",
});
assert.throws(
  () => validate(additiveExtra),
  /task6c_l01_additive_checkpoint_count/u,
);
const overCapacity = structuredClone(contract);
for (let index = 1; index <= 4; index += 1) {
  ((overCapacity.allocation as Row).nonCheckpointFirstIntroductions as Row[])[
    index
  ].firstIntroductionPacketId = "de_l01_c01_s01";
}
assert.throws(() => validate(overCapacity), /task6c_l01_packet_cardinality/u);
const authorityEscape = structuredClone(contract);
authorityEscape.status = "CANONICAL";
assert.throws(
  () => validate(authorityEscape),
  /task6c_l01_promotion_forbidden/u,
);
const task5Injection = structuredClone(contract);
(
  (task5Injection.allocation as Row).task5CheckpointSenses as Row[]
)[0].canonicalSenseId = "de_lex_injected_v1";
assert.throws(
  () => validate(task5Injection),
  /task6c_l01_task5_checkpoint_schema/u,
);
const nonCheckpointInjection = structuredClone(contract);
(
  (nonCheckpointInjection.allocation as Row)
    .nonCheckpointFirstIntroductions as Row[]
)[0].evidence = ["invented"];
assert.throws(
  () => validate(nonCheckpointInjection),
  /task6c_l01_noncheckpoint_schema/u,
);
const additiveInjection = structuredClone(contract);
(
  (additiveInjection.allocation as Row)
    .additiveCheckpointFirstIntroductions as Row[]
)[0].task7Unlock = true;
assert.throws(() => validate(additiveInjection), /task6c_l01_additive_schema/u);
process.stdout.write(
  "TASK6C_L01_FULL_REGISTRY_CHECKPOINT packets=56 plannedFirstIntroductions=56 checkpointPlans=14 totalPlannedSenses=70 protectedCanonical=2 status=HOLD\\n",
);
