import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectGermanTask7V2L01C05DasIstSourceHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c05_das_ist_source_hold_de_v1";

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(ROOT, "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c05_das_ist_source_hold_v1");
const RECEIPT = path.join(ROOT, "docs/v2/curriculum/de/TASK7_V2_L01C05_DAS_IST_SOURCE_HOLD_RECEIPT_2026-10-13.md");
function sha256(bytes: Buffer | string): string { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function copyEvidence(): string { const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-das-ist-hold-")); fs.cpSync(EVIDENCE, root, { recursive: true }); return root; }
function expectFailure(code: string, action: () => void): void { assert.throws(action, new RegExp(code, "u")); }

const result = inspectGermanTask7V2L01C05DasIstSourceHoldDeV1();

assert.deepEqual(result, {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c05_das_ist_v1",
  checkpointPacketId: "de_l01_c05_s40",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

const rawDriftRoot = copyEvidence();
fs.appendFileSync(path.join(rawDriftRoot, "raw/dwds_sein.html"), " ");
expectFailure("task7_das_ist_raw_drift", () => inspectGermanTask7V2L01C05DasIstSourceHoldDeV1({ evidenceRootForTest: rawDriftRoot }));

const sourceRoot = copyEvidence();
const sourceMapPath = path.join(sourceRoot, "extraction_map.json");
const sourceMap = JSON.parse(fs.readFileSync(sourceMapPath, "utf8")) as { rawSources: { dwdsSein: { canonicalUrl: string } } };
sourceMap.rawSources.dwdsSein.canonicalUrl = "https://example.invalid";
fs.writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`);
expectFailure("task7_das_ist_extraction_map", () => inspectGermanTask7V2L01C05DasIstSourceHoldDeV1({ evidenceRootForTest: sourceRoot }));

const planRoot = copyEvidence();
const planManifestPath = path.join(planRoot, "manifest.json");
const planManifest = JSON.parse(fs.readFileSync(planManifestPath, "utf8")) as { allocation: { sourcePlanId: string } };
planManifest.allocation.sourcePlanId = "de_lex_plan_l01_c05_garten_v1";
fs.writeFileSync(planManifestPath, `${JSON.stringify(planManifest, null, 2)}\n`);
expectFailure("task7_das_ist_allocation", () => inspectGermanTask7V2L01C05DasIstSourceHoldDeV1({ evidenceRootForTest: planRoot }));

const lemmaRoot = copyEvidence();
const lemmaManifestPath = path.join(lemmaRoot, "manifest.json");
const lemmaManifest = JSON.parse(fs.readFileSync(lemmaManifestPath, "utf8")) as { task5V2: { lemmaOrExpression: string } };
lemmaManifest.task5V2.lemmaOrExpression = "Das sind";
fs.writeFileSync(lemmaManifestPath, `${JSON.stringify(lemmaManifest, null, 2)}\n`);
expectFailure("task7_das_ist_plan_binding", () => inspectGermanTask7V2L01C05DasIstSourceHoldDeV1({ evidenceRootForTest: lemmaRoot }));

const checkpointRoot = copyEvidence();
const checkpointManifestPath = path.join(checkpointRoot, "manifest.json");
const checkpointManifest = JSON.parse(fs.readFileSync(checkpointManifestPath, "utf8")) as { allocation: { checkpointPacketId: string } };
checkpointManifest.allocation.checkpointPacketId = "de_l01_c05_s33";
fs.writeFileSync(checkpointManifestPath, `${JSON.stringify(checkpointManifest, null, 2)}\n`);
expectFailure("task7_das_ist_allocation", () => inspectGermanTask7V2L01C05DasIstSourceHoldDeV1({ evidenceRootForTest: checkpointRoot }));

const outputRoot = copyEvidence();
const outputManifestPath = path.join(outputRoot, "manifest.json");
const outputManifest = JSON.parse(fs.readFileSync(outputManifestPath, "utf8")) as { allocation: Record<string, unknown> };
outputManifest.allocation.packetOutputPath = "release/de/l01/s05";
fs.writeFileSync(outputManifestPath, `${JSON.stringify(outputManifest, null, 2)}\n`);
expectFailure("task7_das_ist_output_forbidden", () => inspectGermanTask7V2L01C05DasIstSourceHoldDeV1({ evidenceRootForTest: outputRoot }));

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  ["TASK7_DAS_IST_MODULE_SHA256", path.join(ROOT, "modules/learning-v2/curriculum/de/task7_v2_l01_c05_das_ist_source_hold_de_v1.ts")],
  ["TASK7_DAS_IST_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  ["TASK7_DAS_IST_EXTRACTION_MAP_SHA256", path.join(EVIDENCE, "extraction_map.json")],
  ["TASK7_DAS_IST_CAPTURE_SCRIPT_SHA256", path.join(ROOT, "scripts/capture_learning_v2_de_task7_v2_l01_c05_das_ist_sources.mjs")],
  ["TASK7_DAS_IST_GATE_SHA256", path.join(ROOT, "tests/learning_v2_de_task7_v2_l01_c05_das_ist_source_hold_gate.ts")],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(receipt);
  assert.ok(match, `task7_das_ist_receipt_binding_missing:${label}`);
  assert.equal(match[1], sha256(fs.readFileSync(file)));
}
assert.match(receipt, /NOT_CLAIMED:.*DAS_IST/u);
assert.doesNotMatch(receipt, /CANONICAL_ADMITTED|RELEASED|TASK7_UNLOCK_ALLOWED/u);
process.stdout.write("TASK7_V2_L01C05_DAS_IST_SOURCE_HOLD_GATE PASS status=HOLD sourcePlan=de_lex_plan_l01_c05_das_ist_v1 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n");
