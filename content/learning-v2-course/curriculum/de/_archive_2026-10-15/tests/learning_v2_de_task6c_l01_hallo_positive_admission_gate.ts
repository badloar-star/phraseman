import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  inspectGermanTask6cL01HalloPositiveAdmissionDeV1,
  type GermanTask6cL01HalloPositiveAdmissionOptionsDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l01_hallo_positive_admission_de_v1";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const PATHS = {
  task5V2: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
  lexicalV2:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v2.json",
  task6V2:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json",
  inventoryV2:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
  task5V3: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_hallo_positive_admission_v1/lexical_evidence.json",
  lexicalV3:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v3.json",
  task6V3:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json",
  inventoryV3:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v3.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_hallo_positive_admission_v1/manifest.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_HALLO_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
} as const;

const sha256 = (relativePath: string): string =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");

const V2_PRE = Object.fromEntries(
  [PATHS.task5V2, PATHS.lexicalV2, PATHS.task6V2, PATHS.inventoryV2].map(
    (relativePath) => [relativePath, sha256(relativePath)],
  ),
);

assert.deepEqual(V2_PRE, {
  [PATHS.task5V2]:
    "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  [PATHS.lexicalV2]:
    "31934e35b5278c7a7e901d08e02da5398f3503825782acbb604d06de094726a5",
  [PATHS.task6V2]:
    "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
  [PATHS.inventoryV2]:
    "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
});

const result = inspectGermanTask6cL01HalloPositiveAdmissionDeV1();
assert.deepEqual(result, {
  status: "PASS",
  decision: "EXACT_POSITIVE_CANONICAL_ADMISSION",
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v2",
  canonicalSenseId: "de_lex_l01_c01_hallo_v2",
  phraseFrameId: "de_pf_l01_c01_hallo_v2",
  exactSurface: "Hallo!",
  register: "colloquial",
  firstIntroductionPacketId: "de_l01_c01_s01",
  firstScoredUsePacketId: "de_l01_c01_s08",
  resolvedPlanIds: 7,
  unresolvedPlanIds: 281,
  packetIds: 1792,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

for (const relativePath of [
  PATHS.task5V3,
  PATHS.evidence,
  PATHS.lexicalV3,
  PATHS.task6V3,
  PATHS.inventoryV3,
  PATHS.manifest,
  PATHS.receipt,
]) {
  assert.equal(fs.existsSync(relativePath), true, `missing:${relativePath}`);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "de-hallo-admission-"));
const json = (relativePath: string): JsonRecord =>
  JSON.parse(fs.readFileSync(relativePath, "utf8")) as JsonRecord;
const writeHostile = (name: string, value: unknown): string => {
  const target = path.join(tempRoot, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
  return target;
};
const hostile = (
  option: keyof GermanTask6cL01HalloPositiveAdmissionOptionsDeV1,
  file: keyof typeof PATHS,
  name: string,
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void => {
  const value = json(PATHS[file]);
  mutate(value);
  assert.throws(
    () =>
      inspectGermanTask6cL01HalloPositiveAdmissionDeV1({
        [option]: writeHostile(name, value),
      }),
    expected,
  );
};

const hostileReceiptGrant = (claim: string, name: string): void => {
  const receipt = fs.readFileSync(PATHS.receipt, "utf8");
  const denied = `${claim}: \`false\``;
  assert.equal(
    receipt.includes(denied),
    true,
    `missing denied receipt claim:${claim}`,
  );
  const target = path.join(tempRoot, name);
  fs.writeFileSync(target, receipt.replace(denied, `${claim}: \`true\``));
  assert.throws(
    () =>
      inspectGermanTask6cL01HalloPositiveAdmissionDeV1({
        receiptPathForTest: target,
      }),
    /hallo_positive_receipt_boundary/u,
  );
};

const hostileReceiptReplacement = (
  from: string,
  to: string,
  name: string,
): void => {
  const receipt = fs.readFileSync(PATHS.receipt, "utf8");
  assert.equal(
    receipt.includes(from),
    true,
    `missing receipt evidence:${from}`,
  );
  const target = path.join(tempRoot, name);
  fs.writeFileSync(target, receipt.replace(from, to));
  assert.throws(
    () =>
      inspectGermanTask6cL01HalloPositiveAdmissionDeV1({
        receiptPathForTest: target,
      }),
    /hallo_positive_receipt_boundary/u,
  );
};

hostile(
  "task5PathForTest",
  "task5V3",
  "wrong-plan.json",
  (value) => {
    value.lessons[0].chapters[0].checkpoint.plannedNewLexicalSenses[0].id =
      "de_lex_plan_l01_c01_hallo_wrong";
  },
  /hallo_positive_task5_plan/u,
);
hostile(
  "lexicalRegistryPathForTest",
  "lexicalV3",
  "wrong-sense.json",
  (value) => {
    value.find((row: JsonRecord) => row.id === "de_lex_l01_c01_hallo_v2").id =
      "de_lex_l01_c01_hallo_wrong";
  },
  /hallo_positive_lexical_sense/u,
);
hostile(
  "lexicalEvidencePathForTest",
  "evidence",
  "neutral-register.json",
  (value) => {
    value.register = "neutral";
  },
  /hallo_positive_register/u,
);
hostile(
  "task5PathForTest",
  "task5V3",
  "merged-interaction.json",
  (value) => {
    value.lessons[0].chapters[0].lessonOutcome =
      "recognise a greeting and the participant named by a fixed chunk";
  },
  /hallo_positive_interaction_separation/u,
);
hostile(
  "task6PathForTest",
  "task6V3",
  "unattested-vocative.json",
  (value) => {
    value.registry.phraseFrames.find(
      (row: JsonRecord) => row.id === "de_pf_l01_c01_hallo_v2",
    ).frame = "Hallo, Nachbarin!";
  },
  /hallo_positive_exact_surface/u,
);
hostile(
  "inventoryPathForTest",
  "inventoryV3",
  "wrong-inventory.json",
  (value) => {
    value.counts.resolvedPlanIds = 6;
    value.counts.unresolvedPlanIds = 282;
  },
  /hallo_positive_inventory/u,
);

hostileReceiptGrant(
  "Preauthoring authority",
  "receipt-preauthoring-authority-granted.md",
);
hostileReceiptGrant(
  "Learner-facing authority",
  "receipt-learner-facing-authority-granted.md",
);
hostileReceiptGrant(
  "Release authorization",
  "receipt-release-authorization-granted.md",
);
hostileReceiptGrant("Task 7 unlock", "receipt-task7-unlock-granted.md");
hostileReceiptReplacement(
  "Consumer cutover: `NONE`",
  "Consumer cutover: `DEFAULT`",
  "receipt-consumer-cutover-granted.md",
);
hostileReceiptReplacement(
  '"temporalScope":"PREDATES_P1_AUTHORITY_BOUNDARY_REPAIR","controlling":false',
  '"temporalScope":"PREDATES_P1_AUTHORITY_BOUNDARY_REPAIR","controlling":true',
  "receipt-native-review-misrepresented.md",
);
hostileReceiptReplacement(
  '"hostileCases":["preauthoring=true","learner-facing=true","release=true"]',
  '"hostileCases":["preauthoring=true","learner-facing=true"]',
  "receipt-spec-review-scope-truncated.md",
);

const driftedTask6Path = path.join(tempRoot, "drifted-task6.json");
fs.copyFileSync(PATHS.task6V3, driftedTask6Path);
fs.appendFileSync(driftedTask6Path, " \n");
assert.throws(
  () =>
    inspectGermanTask6cL01HalloPositiveAdmissionDeV1({
      task6PathForTest: driftedTask6Path,
    }),
  /hallo_positive_artifact_drift/u,
);

assert.deepEqual(
  Object.fromEntries(
    [PATHS.task5V2, PATHS.lexicalV2, PATHS.task6V2, PATHS.inventoryV2].map(
      (relativePath) => [relativePath, sha256(relativePath)],
    ),
  ),
  V2_PRE,
  "hallo_positive_v2_bytes_changed",
);

process.stdout.write(
  "TASK6C_L01_HALLO_POSITIVE_ADMISSION_GATE PASS canonicalAdmission=true sourcePlan=de_lex_plan_l01_c01_hallo_v2 sense=de_lex_l01_c01_hallo_v2 surface=Hallo! register=colloquial introduction=de_l01_c01_s01 checkpoint=de_l01_c01_s08 resolved=7 unresolved=281 packets=1792 task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\n",
);
