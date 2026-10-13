import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { inspectGermanTask7V2L01C06HausmeisterSourceHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c06_hausmeister_source_hold_de_v1";

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(ROOT, "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1");

function copyEvidence(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-hausmeister-hold-"));
  fs.cpSync(EVIDENCE, root, { recursive: true });
  return root;
}

function expectFailure(code: string, action: () => void): void {
  assert.throws(action, new RegExp(code, "u"));
}

assert.deepEqual(inspectGermanTask7V2L01C06HausmeisterSourceHoldDeV1(), {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c06_hausmeister_v1",
  checkpointPacketId: "de_l01_c06_s48",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

const rawDrift = copyEvidence();
fs.appendFileSync(path.join(rawDrift, "raw/de_lex_plan_l01_c06_hausmeister_v1.html"), " ");
expectFailure("task7_hausmeister_raw_drift", () => inspectGermanTask7V2L01C06HausmeisterSourceHoldDeV1({ evidenceRootForTest: rawDrift }));

const metadataDrift = copyEvidence();
fs.appendFileSync(path.join(metadataDrift, "raw/de_lex_plan_l01_c06_hausmeister_v1.http_metadata.txt"), " ");
expectFailure("task7_hausmeister_metadata_drift", () => inspectGermanTask7V2L01C06HausmeisterSourceHoldDeV1({ evidenceRootForTest: metadataDrift }));

const mapDrift = copyEvidence();
fs.appendFileSync(path.join(mapDrift, "extraction_map.json"), " ");
expectFailure("task7_hausmeister_extraction_map", () => inspectGermanTask7V2L01C06HausmeisterSourceHoldDeV1({ evidenceRootForTest: mapDrift }));

const unauthorizedOutput = copyEvidence();
const manifestPath = path.join(unauthorizedOutput, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { allocation: Record<string, unknown> };
manifest.allocation.packetOutputPath = "release/de/l01/s06";
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
expectFailure("task7_hausmeister_output_forbidden", () => inspectGermanTask7V2L01C06HausmeisterSourceHoldDeV1({ evidenceRootForTest: unauthorizedOutput }));

process.stdout.write("TASK7_V2_L01C06_HAUSMEISTER_SOURCE_HOLD_GATE PASS status=HOLD sourcePlan=de_lex_plan_l01_c06_hausmeister_v1 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n");
