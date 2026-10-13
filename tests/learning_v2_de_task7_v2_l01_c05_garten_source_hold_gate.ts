import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectGermanTask7V2L01C05GartenSourceHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c05_garten_source_hold_de_v1";

const ROOT = path.resolve(__dirname, "..");
const MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c05_garten_source_hold_de_v1.ts",
);
const EVIDENCE = path.join(ROOT, "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c05_garten_source_hold_v1");
const RECEIPT = path.join(ROOT, "docs/v2/curriculum/de/TASK7_V2_L01C05_GARTEN_SOURCE_HOLD_RECEIPT_2026-10-13.md");

assert.equal(fs.existsSync(MODULE), true, "task7_garten_module_missing");
assert.equal(fs.existsSync(EVIDENCE), true, "task7_garten_evidence_missing");
assert.equal(fs.existsSync(RECEIPT), true, "task7_garten_receipt_missing");
assert.deepEqual(inspectGermanTask7V2L01C05GartenSourceHoldDeV1(), {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c05_garten_v1",
  checkpointPacketId: "de_l01_c05_s40",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

function copyEvidence(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-garten-hold-"));
  fs.cpSync(EVIDENCE, root, { recursive: true });
  return root;
}
function expectFailure(code: string, action: () => void): void {
  assert.throws(action, new RegExp(code, "u"));
}

const mapDrift = copyEvidence();
fs.appendFileSync(path.join(mapDrift, "extraction_map.json"), " ");
expectFailure("task7_garten_extraction_map", () => inspectGermanTask7V2L01C05GartenSourceHoldDeV1({ evidenceRootForTest: mapDrift }));

const wrongLemma = copyEvidence();
const wrongLemmaPath = path.join(wrongLemma, "extraction_map.json");
const wrongLemmaMap = JSON.parse(fs.readFileSync(wrongLemmaPath, "utf8")) as { extraction: { sourceHeadword: string } };
wrongLemmaMap.extraction.sourceHeadword = "Gärten";
fs.writeFileSync(wrongLemmaPath, `${JSON.stringify(wrongLemmaMap, null, 2)}\n`);
expectFailure("task7_garten_extraction_map", () => inspectGermanTask7V2L01C05GartenSourceHoldDeV1({ evidenceRootForTest: wrongLemma }));

const wrongPlan = copyEvidence();
const wrongPlanPath = path.join(wrongPlan, "manifest.json");
const wrongPlanManifest = JSON.parse(fs.readFileSync(wrongPlanPath, "utf8")) as { allocation: { sourcePlanId: string } };
wrongPlanManifest.allocation.sourcePlanId = "de_lex_plan_l01_c05_das_ist_v1";
fs.writeFileSync(wrongPlanPath, `${JSON.stringify(wrongPlanManifest, null, 2)}\n`);
expectFailure("task7_garten_allocation", () => inspectGermanTask7V2L01C05GartenSourceHoldDeV1({ evidenceRootForTest: wrongPlan }));

const wrongCheckpoint = copyEvidence();
const wrongCheckpointPath = path.join(wrongCheckpoint, "manifest.json");
const wrongCheckpointManifest = JSON.parse(fs.readFileSync(wrongCheckpointPath, "utf8")) as { allocation: { checkpointPacketId: string } };
wrongCheckpointManifest.allocation.checkpointPacketId = "de_l01_c05_s39";
fs.writeFileSync(wrongCheckpointPath, `${JSON.stringify(wrongCheckpointManifest, null, 2)}\n`);
expectFailure("task7_garten_allocation", () => inspectGermanTask7V2L01C05GartenSourceHoldDeV1({ evidenceRootForTest: wrongCheckpoint }));

const outputAuthority = copyEvidence();
const outputAuthorityPath = path.join(outputAuthority, "manifest.json");
const outputAuthorityManifest = JSON.parse(fs.readFileSync(outputAuthorityPath, "utf8")) as { allocation: Record<string, unknown> };
outputAuthorityManifest.allocation.packetOutputPath = "release/de/l01/s05";
fs.writeFileSync(outputAuthorityPath, `${JSON.stringify(outputAuthorityManifest, null, 2)}\n`);
expectFailure("task7_garten_output_forbidden", () => inspectGermanTask7V2L01C05GartenSourceHoldDeV1({ evidenceRootForTest: outputAuthority }));

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  ["TASK7_GARTEN_MODULE_SHA256", MODULE],
  ["TASK7_GARTEN_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  ["TASK7_GARTEN_EXTRACTION_MAP_SHA256", path.join(EVIDENCE, "extraction_map.json")],
  ["TASK7_GARTEN_GATE_SHA256", path.join(ROOT, "tests/learning_v2_de_task7_v2_l01_c05_garten_source_hold_gate.ts")],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(receipt);
  assert.ok(match, `task7_garten_receipt_binding_missing:${label}`);
  assert.equal(match[1], crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"));
}
assert.match(receipt, /UNSUPPORTED_BY_CAPTURED_SOURCE/u);
assert.doesNotMatch(receipt, /CANONICAL_ADMITTED|RELEASED|TASK7_UNLOCK_ALLOWED/u);
process.stdout.write("TASK7_V2_L01C05_GARTEN_SOURCE_HOLD_GATE PASS status=HOLD sourcePlan=de_lex_plan_l01_c05_garten_v1 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n");
