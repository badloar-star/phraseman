import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectGermanTask7V2L01C03IchHeisseSourceHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c03_ich_heisse_source_hold_de_v1";

const result = inspectGermanTask7V2L01C03IchHeisseSourceHoldDeV1();

assert.deepEqual(result, {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1",
  checkpointPacketId: "de_l01_c03_s24",
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

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C03_ICH_HEISSE_SOURCE_HOLD_RECEIPT_2026-10-12.md",
);

function copyEvidence(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-ich-heisse-hold-"));
  fs.cpSync(EVIDENCE, root, { recursive: true });
  return root;
}

function expectFailure(code: string, action: () => void): void {
  assert.throws(action, new RegExp(code, "u"));
}

const rawDrift = copyEvidence();
fs.appendFileSync(path.join(rawDrift, "raw/dwds_heissen.html"), " ");
expectFailure("task7_ich_heisse_raw_body", () =>
  inspectGermanTask7V2L01C03IchHeisseSourceHoldDeV1({
    evidenceRootForTest: rawDrift,
  }),
);

const oldId = copyEvidence();
const oldIdManifestPath = path.join(oldId, "manifest.json");
const oldIdManifest = JSON.parse(
  fs.readFileSync(oldIdManifestPath, "utf8"),
) as {
  allocations: { sourcePlanId: string }[];
};
oldIdManifest.allocations[0].sourcePlanId = "de_lex_plan_l01_c02_tschuess_v1";
fs.writeFileSync(
  oldIdManifestPath,
  `${JSON.stringify(oldIdManifest, null, 2)}\n`,
);
expectFailure("task7_ich_heisse_allocation", () =>
  inspectGermanTask7V2L01C03IchHeisseSourceHoldDeV1({
    evidenceRootForTest: oldId,
  }),
);

const overclaim = copyEvidence();
const overclaimManifestPath = path.join(overclaim, "manifest.json");
const overclaimManifest = JSON.parse(
  fs.readFileSync(overclaimManifestPath, "utf8"),
) as {
  authority: { canonicalAdmission: boolean };
  fieldSupport: {
    unsupportedClaims: { officialPedagogicalOccurrence: string };
  };
};
overclaimManifest.authority.canonicalAdmission = true;
overclaimManifest.fieldSupport.unsupportedClaims.officialPedagogicalOccurrence =
  "EXACT_OCCURRENCE";
fs.writeFileSync(
  overclaimManifestPath,
  `${JSON.stringify(overclaimManifest, null, 2)}\n`,
);
expectFailure("task7_ich_heisse_hold_boundary", () =>
  inspectGermanTask7V2L01C03IchHeisseSourceHoldDeV1({
    evidenceRootForTest: overclaim,
  }),
);

for (const [label, file] of [
  [
    "TASK7_ICH_HEISSE_MODULE_SHA256",
    path.join(
      ROOT,
      "modules/learning-v2/curriculum/de/task7_v2_l01_c03_ich_heisse_source_hold_de_v1.ts",
    ),
  ],
  ["TASK7_ICH_HEISSE_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  [
    "TASK7_ICH_HEISSE_EXTRACTION_MAP_SHA256",
    path.join(EVIDENCE, "extraction_map.json"),
  ],
  [
    "TASK7_ICH_HEISSE_CAPTURE_SCRIPT_SHA256",
    path.join(
      ROOT,
      "scripts/capture_learning_v2_de_task7_v2_l01_c03_ich_heisse_sources.mjs",
    ),
  ],
] as const) {
  const receipt = fs.readFileSync(RECEIPT, "utf8");
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receipt,
  );
  assert.ok(match, `task7_ich_heisse_receipt_binding_missing:${label}`);
  const actual = crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
  assert.equal(match[1], actual);
}

process.stdout.write(
  "TASK7_V2_L01C03_ICH_HEISSE_SOURCE_HOLD_GATE PASS status=HOLD sourcePlan=de_lex_plan_l01_c03_ich_heisse_v1 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
