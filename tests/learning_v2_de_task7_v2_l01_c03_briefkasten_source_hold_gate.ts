import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { inspectGermanTask7V2L01C03BriefkastenSourceHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c03_briefkasten_source_hold_de_v1";

const result = inspectGermanTask7V2L01C03BriefkastenSourceHoldDeV1();

assert.deepEqual(result, {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
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
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C03_BRIEFKASTEN_SOURCE_HOLD_RECEIPT_2026-10-12.md",
);

function copyEvidence(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-briefkasten-hold-"));
  fs.cpSync(EVIDENCE, root, { recursive: true });
  return root;
}
function expectFailure(code: string, action: () => void): void {
  assert.throws(action, new RegExp(code, "u"));
}

const rawDrift = copyEvidence();
fs.appendFileSync(path.join(rawDrift, "raw/dwds_briefkasten.html"), " ");
expectFailure("task7_briefkasten_raw_body", () =>
  inspectGermanTask7V2L01C03BriefkastenSourceHoldDeV1({
    evidenceRootForTest: rawDrift,
  }),
);

const wrongLemma = copyEvidence();
const wrongLemmaPath = path.join(wrongLemma, "extraction_map.json");
fs.writeFileSync(
  wrongLemmaPath,
  fs
    .readFileSync(wrongLemmaPath, "utf8")
    .replace('"Briefkasten"', '"Briefkästen"'),
);
expectFailure("task7_briefkasten_extraction_map", () =>
  inspectGermanTask7V2L01C03BriefkastenSourceHoldDeV1({
    evidenceRootForTest: wrongLemma,
  }),
);

const outputAuthority = copyEvidence();
const outputAuthorityPath = path.join(outputAuthority, "manifest.json");
const outputAuthorityJson = JSON.parse(
  fs.readFileSync(outputAuthorityPath, "utf8"),
) as { allocations: Record<string, unknown>[] };
outputAuthorityJson.allocations[0].packetOutputPath =
  "content/learning-v2-course/sessions/de/l01/s03";
fs.writeFileSync(
  outputAuthorityPath,
  `${JSON.stringify(outputAuthorityJson, null, 2)}\n`,
);
expectFailure("task7_briefkasten_output_authority_forbidden", () =>
  inspectGermanTask7V2L01C03BriefkastenSourceHoldDeV1({
    evidenceRootForTest: outputAuthority,
  }),
);

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  [
    "TASK7_BRIEFKASTEN_MODULE_SHA256",
    path.join(
      ROOT,
      "modules/learning-v2/curriculum/de/task7_v2_l01_c03_briefkasten_source_hold_de_v1.ts",
    ),
  ],
  ["TASK7_BRIEFKASTEN_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  [
    "TASK7_BRIEFKASTEN_EXTRACTION_MAP_SHA256",
    path.join(EVIDENCE, "extraction_map.json"),
  ],
  [
    "TASK7_BRIEFKASTEN_CAPTURE_SCRIPT_SHA256",
    path.join(
      ROOT,
      "scripts/capture_learning_v2_de_task7_v2_l01_c03_briefkasten_sources.mjs",
    ),
  ],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receipt,
  );
  assert.ok(match, `task7_briefkasten_receipt_binding_missing:${label}`);
  const actual = crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
  assert.equal(match[1], actual);
}

process.stdout.write(
  "TASK7_V2_L01C03_BRIEFKASTEN_SOURCE_HOLD_GATE PASS status=HOLD sourcePlan=de_lex_plan_l01_c03_briefkasten_v1 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
