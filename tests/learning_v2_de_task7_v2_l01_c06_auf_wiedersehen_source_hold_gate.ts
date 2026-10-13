import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { inspectGermanTask7V2L01C06AufWiedersehenSourceHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c06_auf_wiedersehen_source_hold_de_v1";

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(ROOT, "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_auf_wiedersehen_source_hold_v1");
const RECEIPT = path.join(ROOT, "docs/v2/curriculum/de/TASK7_V2_L01C06_AUF_WIEDERSEHEN_SOURCE_HOLD_RECEIPT_2026-10-13.md");
function sha256(bytes: Buffer | string): string { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function copyEvidence(): string { const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-auf-wiedersehen-hold-")); fs.cpSync(EVIDENCE, root, { recursive: true }); return root; }
function expectFailure(code: string, action: () => void): void { assert.throws(action, new RegExp(code, "u")); }

assert.deepEqual(inspectGermanTask7V2L01C06AufWiedersehenSourceHoldDeV1(), {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c06_auf_wiedersehen_v1",
  checkpointPacketId: "de_l01_c06_s48",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

const rawDriftRoot = copyEvidence();
fs.appendFileSync(path.join(rawDriftRoot, "raw/goethe_a1_redemittel.pdf"), " ");
expectFailure("task7_auf_wiedersehen_raw_drift", () => inspectGermanTask7V2L01C06AufWiedersehenSourceHoldDeV1({ evidenceRootForTest: rawDriftRoot }));

const mapDriftRoot = copyEvidence();
fs.appendFileSync(path.join(mapDriftRoot, "extraction_map.json"), " ");
expectFailure("task7_auf_wiedersehen_extraction_map", () => inspectGermanTask7V2L01C06AufWiedersehenSourceHoldDeV1({ evidenceRootForTest: mapDriftRoot }));

const manifestDriftRoot = copyEvidence();
const manifestPath = path.join(manifestDriftRoot, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { allocation: { checkpointPacketId: string } };
manifest.allocation.checkpointPacketId = "de_l01_c06_s47";
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
expectFailure("task7_auf_wiedersehen_manifest", () => inspectGermanTask7V2L01C06AufWiedersehenSourceHoldDeV1({ evidenceRootForTest: manifestDriftRoot }));

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  ["TASK7_AUF_WIEDERSEHEN_MODULE_SHA256", path.join(ROOT, "modules/learning-v2/curriculum/de/task7_v2_l01_c06_auf_wiedersehen_source_hold_de_v1.ts")],
  ["TASK7_AUF_WIEDERSEHEN_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  ["TASK7_AUF_WIEDERSEHEN_EXTRACTION_MAP_SHA256", path.join(EVIDENCE, "extraction_map.json")],
  ["TASK7_AUF_WIEDERSEHEN_GATE_SHA256", path.join(ROOT, "tests/learning_v2_de_task7_v2_l01_c06_auf_wiedersehen_source_hold_gate.ts")],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(receipt);
  assert.ok(match, `task7_auf_wiedersehen_receipt_binding_missing:${label}`);
  assert.equal(match[1], sha256(fs.readFileSync(file)));
}
assert.match(receipt, /UNSUPPORTED_BY_CAPTURED_SOURCE/u);
assert.doesNotMatch(receipt, /CANONICAL_ADMITTED|RELEASED|TASK7_UNLOCK_ALLOWED/u);
process.stdout.write("TASK7_V2_L01C06_AUF_WIEDERSEHEN_SOURCE_HOLD_GATE PASS status=HOLD sourcePlan=de_lex_plan_l01_c06_auf_wiedersehen_v1 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n");
