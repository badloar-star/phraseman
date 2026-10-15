import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { inspectGermanTask7V2L01C04BueroSourceHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c04_buero_source_hold_de_v1";

const ROOT = path.resolve(__dirname, "..");
const MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c04_buero_source_hold_de_v1.ts",
);
const EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_buero_source_hold_v1",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C04_BUERO_SOURCE_HOLD_RECEIPT_2026-10-12.md",
);

assert.equal(fs.existsSync(MODULE), true, "task7_buero_module_missing");
assert.equal(fs.existsSync(EVIDENCE), true, "task7_buero_evidence_missing");
assert.equal(fs.existsSync(RECEIPT), true, "task7_buero_receipt_missing");

assert.deepEqual(inspectGermanTask7V2L01C04BueroSourceHoldDeV1(), {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c04_buero_v1",
  checkpointPacketId: "de_l01_c04_s32",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

function copiedEvidence(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-buero-hold-"));
  fs.cpSync(EVIDENCE, root, { recursive: true });
  return root;
}
function expectFailure(code: string, action: () => void): void {
  assert.throws(action, new RegExp(code, "u"));
}

const sourceDrift = copiedEvidence();
fs.appendFileSync(path.join(sourceDrift, "extraction_map.json"), " ");
expectFailure("task7_buero_extraction_map", () =>
  inspectGermanTask7V2L01C04BueroSourceHoldDeV1({
    evidenceRootForTest: sourceDrift,
  }),
);

const wrongLemma = copiedEvidence();
const wrongLemmaPath = path.join(wrongLemma, "extraction_map.json");
fs.writeFileSync(
  wrongLemmaPath,
  fs.readFileSync(wrongLemmaPath, "utf8").replace('"Büro"', '"Büros"'),
);
expectFailure("task7_buero_extraction_map", () =>
  inspectGermanTask7V2L01C04BueroSourceHoldDeV1({
    evidenceRootForTest: wrongLemma,
  }),
);

const wrongPlan = copiedEvidence();
const wrongPlanPath = path.join(wrongPlan, "manifest.json");
fs.writeFileSync(
  wrongPlanPath,
  fs
    .readFileSync(wrongPlanPath, "utf8")
    .replace(
      "de_lex_plan_l01_c04_buero_v1",
      "de_lex_plan_l01_c04_guten_tag_v1",
    ),
);
expectFailure("task7_buero_manifest", () =>
  inspectGermanTask7V2L01C04BueroSourceHoldDeV1({
    evidenceRootForTest: wrongPlan,
  }),
);

const wrongCheckpoint = copiedEvidence();
const wrongCheckpointPath = path.join(wrongCheckpoint, "manifest.json");
fs.writeFileSync(
  wrongCheckpointPath,
  fs
    .readFileSync(wrongCheckpointPath, "utf8")
    .replace("de_l01_c04_s32", "de_l01_c04_s31"),
);
expectFailure("task7_buero_manifest", () =>
  inspectGermanTask7V2L01C04BueroSourceHoldDeV1({
    evidenceRootForTest: wrongCheckpoint,
  }),
);

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  ["TASK7_BUERO_MODULE_SHA256", MODULE],
  ["TASK7_BUERO_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  [
    "TASK7_BUERO_EXTRACTION_MAP_SHA256",
    path.join(EVIDENCE, "extraction_map.json"),
  ],
  [
    "TASK7_BUERO_CAPTURE_SCRIPT_SHA256",
    path.join(
      ROOT,
      "scripts/capture_learning_v2_de_task7_v2_l01_c04_buero_sources.mjs",
    ),
  ],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receipt,
  );
  assert.ok(match, `task7_buero_receipt_binding_missing:${label}`);
  assert.equal(
    match[1],
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  );
}
assert.match(receipt, /SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING/u);
assert.doesNotMatch(
  receipt,
  /CANONICAL_ADMITTED|RELEASED|TASK7_UNLOCK_ALLOWED/u,
);
process.stdout.write(
  "TASK7_V2_L01C04_BUERO_SOURCE_HOLD_GATE PASS status=HOLD sourcePlan=de_lex_plan_l01_c04_buero_v1 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
