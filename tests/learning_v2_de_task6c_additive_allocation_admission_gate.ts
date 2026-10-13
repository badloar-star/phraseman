import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  germanTask6cAdditiveAllocationAdmissionTestHarnessDeV1,
  loadGermanTask6cAdditiveAllocationAdmissionDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_additive_allocation_admission_de_v1";
import { loadGermanTask6cValidatedFullAllocationForTask7DryRunDeV1 } from "../modules/learning-v2/curriculum/de/task6c_full_allocation_authority_de_v1";

const admitted = loadGermanTask6cAdditiveAllocationAdmissionDeV1();
assert.equal(admitted.status, "ADMITTED_FOR_TASK6C_ALLOCATION_ONLY");
assert.equal(admitted.rowsAdmitted, 2);
assert.equal(admitted.rowsPromoted, 0);
assert.equal(admitted.canonicalRegistryStatus, "NOT_CANONICAL");
assert.equal(admitted.canonicalPromotion, false);
assert.equal(admitted.task7Unlock, false);
assert.equal(admitted.packetMaterializationAuthority, false);
assert.equal(admitted.learnerFacingAuthority, false);
assert.equal(admitted.releaseAuthority, false);
assert.deepEqual(
  admitted.rows.map((row) => [
    row.sourcePlanId,
    row.targetPlaceholderPlanId,
    row.firstIntroductionPacketId,
    row.scoredPacketId,
  ]),
  [
    [
      "de_lex_plan_task6c_l01_c01_haus_v1",
      "de_plan_l01_nonc01_03_v1",
      "de_l01_c01_s03",
      "de_l01_c01_s05",
    ],
    [
      "de_lex_plan_task6c_l01_c01_name_v1",
      "de_plan_l01_nonc01_04_v1",
      "de_l01_c01_s04",
      "de_l01_c01_s06",
    ],
  ],
);
assert.ok(Object.isFrozen(admitted));
assert.ok(Object.isFrozen(admitted.rows));
assert.equal(loadGermanTask6cAdditiveAllocationAdmissionDeV1.length, 0);
const productionLoaderAsJavaScript =
  loadGermanTask6cAdditiveAllocationAdmissionDeV1 as unknown as (
    ...args: unknown[]
  ) => typeof admitted;
assert.equal(
  productionLoaderAsJavaScript("../../en/course_blueprint_en_v2.ts" as const)
    .rowsAdmitted,
  2,
);
assert.throws(
  () => loadGermanTask6cValidatedFullAllocationForTask7DryRunDeV1(),
  /TASK7_FULL_ALLOCATION_AUTHORITY_PARTIAL/u,
);
const canonicalRegistry = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json",
    ),
    "utf8",
  ),
) as { registry: { lexicalSenses: unknown[] } };
assert.equal(canonicalRegistry.registry.lexicalSenses.length, 2);

type MutableRegistry = {
  schemaVersion: string;
  status: string;
  rowsAdmitted: number;
  rowsPromoted: number;
  canonicalRegistryStatus: string;
  canonicalPromotion: boolean;
  task7Unlock: boolean;
  packetMaterializationAuthority: boolean;
  learnerFacingAuthority: boolean;
  releaseAuthority: boolean;
  sourceBindings: Record<string, unknown>;
  rows: Record<string, unknown>[];
};
const base =
  germanTask6cAdditiveAllocationAdmissionTestHarnessDeV1.readFixedRegistryForTest();
function rejects(
  mutate: (candidate: MutableRegistry) => void,
  code: RegExp,
): void {
  const candidate = structuredClone(base) as MutableRegistry;
  mutate(candidate);
  assert.throws(
    () =>
      germanTask6cAdditiveAllocationAdmissionTestHarnessDeV1.validateUntrustedRegistryForTest(
        candidate,
      ),
    code,
  );
}
for (const [field, value] of [
  ["status", "DIRECT_ADMITTED"],
  ["canonicalRegistryStatus", "CANONICAL"],
  ["canonicalPromotion", true],
  ["task7Unlock", true],
  ["packetMaterializationAuthority", true],
  ["learnerFacingAuthority", true],
  ["releaseAuthority", true],
] as const) {
  rejects(
    (candidate) => Object.assign(candidate, { [field]: value }),
    /task6c_additive_admission_(?:status|ceiling)_invalid/u,
  );
}
rejects((candidate) => {
  candidate.rows.pop();
}, /task6c_additive_admission_roster_invalid/u);
rejects((candidate) => {
  candidate.rows[0].translationRu = "дом";
}, /task6c_additive_admission_(?:schema|learner_surface)_invalid/u);
rejects((candidate) => {
  candidate.rows[0].sourcePlanId = "de_lex_plan_l01_c01_hallo_v1";
}, /task6c_additive_admission_(?:task5_collision|row_identity)_invalid/u);
rejects((candidate) => {
  candidate.rows[0].canonicalSenseId = "de_lex_l01_c01_nachbarin_v1";
}, /task6c_additive_admission_(?:canonical_collision|row_identity)_invalid/u);
rejects((candidate) => {
  candidate.rows[0].targetPlaceholderPlanId = "de_plan_l01_nonc01_04_v1";
}, /task6c_additive_admission_(?:target_binding|row_identity)_invalid/u);
rejects((candidate) => {
  candidate.rows[0].sourceAnchor = "d-1-1";
}, /task6c_additive_admission_row_identity_invalid/u);
rejects((candidate) => {
  candidate.rows[0].firstIntroductionPacketId = "de_l01_c01_s05";
}, /task6c_additive_admission_(?:chronology|row_identity)_invalid/u);
rejects((candidate) => {
  candidate.rows[0].scoredPacketId = "de_l01_c01_s08";
}, /task6c_additive_admission_(?:chronology|row_identity)_invalid/u);
rejects((candidate) => {
  candidate.rows[0].sourceChapterId = "de_l01_c02";
}, /task6c_additive_admission_(?:contact|row_identity)_invalid/u);
rejects((candidate) => {
  candidate.rows[1].sourcePlanId = candidate.rows[0].sourcePlanId;
}, /task6c_additive_admission_duplicate_invalid/u);
rejects((candidate) => {
  candidate.rows[0].voice = "audio";
}, /task6c_additive_admission_(?:schema|learner_surface)_invalid/u);
rejects((candidate) => {
  candidate.rows[0].sourcePlanId = "en_plan_l01_c01_house_v1";
}, /task6c_additive_admission_(?:english|row_identity)_invalid/u);
rejects((candidate) => {
  candidate.sourceBindings.targetAllocationPath =
    "../../en/course_blueprint_en_v2.ts";
}, /task6c_additive_admission_(?:source_binding|english)_invalid/u);

process.stdout.write(
  "TASK6C_ADDITIVE_ALLOCATION_ADMISSION rows=2 promoted=0 canonical=false task7=false learner=false hostile=PASS\n",
);
