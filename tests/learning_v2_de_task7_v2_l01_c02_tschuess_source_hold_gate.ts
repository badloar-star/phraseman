import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectGermanTask7V2L01C02TschuessSourceHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c02_tschuess_source_hold_de_v1";

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_source_hold_v1",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C02_TSCHUESS_SOURCE_HOLD_RECEIPT_2026-10-12.md",
);

function sha256(bytes: Buffer | string): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function copyEvidence(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-tschuess-hold-"));
  fs.cpSync(EVIDENCE, root, { recursive: true });
  return root;
}

function expectFailure(code: string, action: () => void): void {
  assert.throws(action, new RegExp(code, "u"));
}

const result = inspectGermanTask7V2L01C02TschuessSourceHoldDeV1();
assert.deepEqual(result, {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1",
  checkpointPacketId: "de_l01_c02_s16",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
  inventory: {
    resolvedPlanIds: 6,
    unresolvedPlanIds: 282,
    materializedPackets: 0,
  },
});

const wrongCaseRoot = copyEvidence();
const wrongCaseMap = path.join(wrongCaseRoot, "extraction_map.json");
fs.writeFileSync(
  wrongCaseMap,
  fs.readFileSync(wrongCaseMap, "utf8").replace('"Tschüss"', '"tschüss"'),
);
expectFailure("task7_tschuess_extraction_map", () =>
  inspectGermanTask7V2L01C02TschuessSourceHoldDeV1({
    evidenceRootForTest: wrongCaseRoot,
  }),
);

const driftRoot = copyEvidence();
fs.appendFileSync(path.join(driftRoot, "raw/dwds_tschuess.html"), " ");
expectFailure("task7_tschuess_raw_body", () =>
  inspectGermanTask7V2L01C02TschuessSourceHoldDeV1({
    evidenceRootForTest: driftRoot,
  }),
);

const oldIdRoot = copyEvidence();
const oldIdManifest = path.join(oldIdRoot, "manifest.json");
const oldIdManifestJson = JSON.parse(
  fs.readFileSync(oldIdManifest, "utf8"),
) as {
  allocations: { sourcePlanId: string }[];
};
oldIdManifestJson.allocations[0].sourcePlanId = "de_lex_plan_l01_c02_aufzug_v1";
fs.writeFileSync(
  oldIdManifest,
  `${JSON.stringify(oldIdManifestJson, null, 2)}\n`,
);
expectFailure("task7_tschuess_allocation", () =>
  inspectGermanTask7V2L01C02TschuessSourceHoldDeV1({
    evidenceRootForTest: oldIdRoot,
  }),
);

const manifest = fs.readFileSync(path.join(EVIDENCE, "manifest.json"));
assert.equal(sha256(manifest).length, 64);
const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  [
    "TASK7_TSCHUESS_MODULE_SHA256",
    path.join(
      ROOT,
      "modules/learning-v2/curriculum/de/task7_v2_l01_c02_tschuess_source_hold_de_v1.ts",
    ),
  ],
  ["TASK7_TSCHUESS_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  [
    "TASK7_TSCHUESS_EXTRACTION_MAP_SHA256",
    path.join(EVIDENCE, "extraction_map.json"),
  ],
  [
    "TASK7_TSCHUESS_CAPTURE_SCRIPT_SHA256",
    path.join(
      ROOT,
      "scripts/capture_learning_v2_de_task7_v2_l01_c02_tschuess_sources.mjs",
    ),
  ],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receipt,
  );
  assert.ok(match, `task7_tschuess_receipt_binding_missing:${label}`);
  assert.equal(match[1], sha256(fs.readFileSync(file)));
}
assert.match(receipt, /SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING/u);
assert.match(receipt, /6 resolved \/ 282 unresolved \/ 0 materialized/u);
assert.doesNotMatch(receipt, /OWNER_APPROVED|CANONICAL_ADMITTED|RELEASED/u);
process.stdout.write(
  "TASK7_V2_L01C02_TSCHUESS_SOURCE_HOLD_GATE PASS status=HOLD sourcePlan=de_lex_plan_l01_c02_tschuess_v1 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
