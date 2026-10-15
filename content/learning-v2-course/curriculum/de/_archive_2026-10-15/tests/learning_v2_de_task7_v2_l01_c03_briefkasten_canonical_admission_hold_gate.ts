import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { inspectGermanTask7V2L01C03BriefkastenCanonicalAdmissionHoldDeV1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c03_briefkasten_canonical_admission_hold_de_v1";

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_canonical_admission_hold_v1",
);
const SOURCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C03_BRIEFKASTEN_CANONICAL_ADMISSION_HOLD_RECEIPT_2026-10-12.md",
);

function fixture(): { root: string; evidence: string; source: string } {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "de-briefkasten-admission-"),
  );
  const evidence = path.join(root, "evidence");
  const source = path.join(root, "source");
  fs.cpSync(EVIDENCE, evidence, { recursive: true });
  fs.cpSync(SOURCE, source, { recursive: true });
  return { root, evidence, source };
}
function inspect(value = fixture()) {
  return inspectGermanTask7V2L01C03BriefkastenCanonicalAdmissionHoldDeV1({
    evidenceRootForTest: value.evidence,
    sourceEvidenceRootForTest: value.source,
  });
}
function hostile(
  code: string,
  mutate: (value: ReturnType<typeof fixture>) => void,
): void {
  const value = fixture();
  try {
    mutate(value);
    assert.throws(() => inspect(value), new RegExp(code, "u"));
  } finally {
    fs.rmSync(value.root, { recursive: true, force: true });
  }
}

const result = inspect();
assert.deepEqual(result, {
  status: "HOLD",
  sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
  nextUnresolvedSourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
});

hostile("briefkasten_admission_source_drift", (value) => {
  fs.appendFileSync(path.join(value.source, "raw/dwds_briefkasten.html"), " ");
});
hostile("briefkasten_admission_unsupported_register", (value) => {
  const file = path.join(value.evidence, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  manifest.fieldAuthority.register = "SUPPORTED";
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
});
hostile("briefkasten_admission_unsupported_morphology", (value) => {
  const file = path.join(value.evidence, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  manifest.fieldAuthority.broaderMorphology = "SUPPORTED";
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
});
hostile("briefkasten_admission_wrong_lemma", (value) => {
  const file = path.join(value.evidence, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  manifest.fieldAuthority.lemma.value = "Briefkästen";
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
});
hostile("briefkasten_admission_old_id", (value) => {
  const file = path.join(value.evidence, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  manifest.sourcePlanId = "de_lex_plan_l01_c03_briefkasten";
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
});
hostile("briefkasten_admission_caller_output_forbidden", (value) => {
  const file = path.join(value.evidence, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  manifest.callerOutputPath = "content/learning-v2-course/sessions/de/l01/s03";
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
});

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  [
    "TASK7_BRIEFKASTEN_ADMISSION_MODULE_SHA256",
    path.join(
      ROOT,
      "modules/learning-v2/curriculum/de/task7_v2_l01_c03_briefkasten_canonical_admission_hold_de_v1.ts",
    ),
  ],
  [
    "TASK7_BRIEFKASTEN_ADMISSION_MANIFEST_SHA256",
    path.join(EVIDENCE, "manifest.json"),
  ],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receipt,
  );
  assert.ok(match, `briefkasten_admission_receipt_missing:${label}`);
  assert.equal(
    match[1],
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  );
}

process.stdout.write(
  "TASK7_V2_L01C03_BRIEFKASTEN_CANONICAL_ADMISSION_HOLD_GATE PASS status=HOLD canonical=false inventory=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
