import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectGermanTask7V2L01C04GutenTagSourceHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c04_guten_tag_source_hold_de_v1";

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C04_GUTEN_TAG_SOURCE_HOLD_RECEIPT_2026-10-12.md",
);

function sha256(bytes: Buffer | string): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function copyEvidence(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-guten-tag-hold-"));
  fs.cpSync(EVIDENCE, root, { recursive: true });
  return root;
}

function expectFailure(code: string, action: () => void): void {
  assert.throws(action, new RegExp(code, "u"));
}

const result = inspectGermanTask7V2L01C04GutenTagSourceHoldDeV1();
assert.deepEqual(result, {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
  checkpointPacketId: "de_l01_c04_s32",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
});

const driftRoot = copyEvidence();
fs.appendFileSync(path.join(driftRoot, "raw/goethe_a1_redemittel.pdf"), " ");
expectFailure("task7_guten_tag_raw_drift", () =>
  inspectGermanTask7V2L01C04GutenTagSourceHoldDeV1({
    evidenceRootForTest: driftRoot,
  }),
);

const wrongPlanRoot = copyEvidence();
const manifestPath = path.join(wrongPlanRoot, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  allocation: { sourcePlanId: string };
};
manifest.allocation.sourcePlanId = "de_lex_plan_l01_c04_hallo_v1";
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
expectFailure("task7_guten_tag_allocation", () =>
  inspectGermanTask7V2L01C04GutenTagSourceHoldDeV1({
    evidenceRootForTest: wrongPlanRoot,
  }),
);

const wrongAuthorityRoot = copyEvidence();
const authorityPath = path.join(wrongAuthorityRoot, "manifest.json");
const authorityManifest = JSON.parse(
  fs.readFileSync(authorityPath, "utf8"),
) as {
  authority: { task7Unlock: boolean };
};
authorityManifest.authority.task7Unlock = true;
fs.writeFileSync(
  authorityPath,
  `${JSON.stringify(authorityManifest, null, 2)}\n`,
);
expectFailure("task7_guten_tag_hold_boundary", () =>
  inspectGermanTask7V2L01C04GutenTagSourceHoldDeV1({
    evidenceRootForTest: wrongAuthorityRoot,
  }),
);

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  [
    "TASK7_GUTEN_TAG_MODULE_SHA256",
    path.join(
      ROOT,
      "modules/learning-v2/curriculum/de/task7_v2_l01_c04_guten_tag_source_hold_de_v1.ts",
    ),
  ],
  ["TASK7_GUTEN_TAG_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  [
    "TASK7_GUTEN_TAG_EXTRACTION_MAP_SHA256",
    path.join(EVIDENCE, "extraction_map.json"),
  ],
  [
    "TASK7_GUTEN_TAG_CAPTURE_SCRIPT_SHA256",
    path.join(
      ROOT,
      "scripts/capture_learning_v2_de_task7_v2_l01_c04_guten_tag_sources.mjs",
    ),
  ],
  [
    "TASK7_GUTEN_TAG_GATE_SHA256",
    path.join(
      ROOT,
      "tests/learning_v2_de_task7_v2_l01_c04_guten_tag_source_hold_gate.ts",
    ),
  ],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receipt,
  );
  assert.ok(match, `task7_guten_tag_receipt_binding_missing:${label}`);
  assert.equal(match[1], sha256(fs.readFileSync(file)));
}
assert.match(receipt, /SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING/u);
assert.doesNotMatch(
  receipt,
  /CANONICAL_ADMITTED|RELEASED|TASK7_UNLOCK_ALLOWED/u,
);
process.stdout.write(
  "TASK7_V2_L01C04_GUTEN_TAG_SOURCE_HOLD_GATE PASS status=HOLD sourcePlan=de_lex_plan_l01_c04_guten_tag_v1 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
