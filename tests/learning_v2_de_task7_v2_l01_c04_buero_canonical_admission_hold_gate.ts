import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  GERMAN_TASK7_V2_L01_C04_BUERO_CANONICAL_ADMISSION_HOLD_DE_V1,
  inspectGermanTask7V2L01C04BueroCanonicalAdmissionHoldDeV1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c04_buero_canonical_admission_hold_de_v1";

type RecordValue = Record<string, unknown>;

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_buero_source_hold_v1",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C04_BUERO_CANONICAL_ADMISSION_HOLD_RECEIPT_2026-10-12.md",
);
const ADMISSION_MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c04_buero_canonical_admission_hold_de_v1.ts",
);
const SOURCE_MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c04_buero_source_hold_de_v1.ts",
);

assert.deepEqual(GERMAN_TASK7_V2_L01_C04_BUERO_CANONICAL_ADMISSION_HOLD_DE_V1, {
  status: "HOLD",
  planId: "de_lex_plan_l01_c04_buero_v1",
  checkpointPacketId: "de_l01_c04_s32",
  lemmaOrExpression: "Büro",
  sourceEvidence: {
    authority: "Task6 retained direct-HTTPS registry",
    verifiedFact: "GENERAL_OFFICE_SENSE_ONLY",
    freshDwdsCapture: false,
  },
  authority: {
    generalOfficeSenseOnly: true,
    caretakerScene: false,
    register: false,
    naturalness: false,
    learnerPhrase: false,
  },
  output: {
    canonical: false,
    inventory: false,
    task7: false,
    preauthoring: false,
    learner: false,
    release: false,
    cutover: "NONE",
  },
});

function rejects(
  mutate: (value: RecordValue) => void,
  expected: RegExp,
): void {
  const candidate = structuredClone(
    GERMAN_TASK7_V2_L01_C04_BUERO_CANONICAL_ADMISSION_HOLD_DE_V1,
  ) as RecordValue;
  mutate(candidate);
  assert.throws(
    () => inspectGermanTask7V2L01C04BueroCanonicalAdmissionHoldDeV1(candidate),
    expected,
  );
}

rejects((value) => {
  (value.sourceEvidence as RecordValue).freshDwdsCapture = true;
}, /buero_admission_source_evidence_drift:freshDwdsCapture/u);
rejects((value) => {
  (value.authority as RecordValue).caretakerScene = true;
}, /buero_admission_unsupported_caretaker_scene/u);
rejects((value) => {
  (value.authority as RecordValue).register = true;
}, /buero_admission_unsupported_register/u);
rejects((value) => {
  (value.authority as RecordValue).naturalness = true;
}, /buero_admission_unsupported_naturalness/u);
rejects((value) => {
  (value.authority as RecordValue).learnerPhrase = true;
}, /buero_admission_unsupported_learner_phrase/u);

const driftRoot = fs.mkdtempSync(path.join(os.tmpdir(), "de-buero-admission-"));
try {
  fs.cpSync(SOURCE, driftRoot, { recursive: true });
  fs.appendFileSync(path.join(driftRoot, "extraction_map.json"), " ");
  assert.throws(
    () =>
      inspectGermanTask7V2L01C04BueroCanonicalAdmissionHoldDeV1(
        GERMAN_TASK7_V2_L01_C04_BUERO_CANONICAL_ADMISSION_HOLD_DE_V1,
        { sourceEvidenceRootForTest: driftRoot },
      ),
    /task7_buero_extraction_map/u,
  );
} finally {
  fs.rmSync(driftRoot, { recursive: true, force: true });
}

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  ["TASK7_BUERO_ADMISSION_MODULE_SHA256", ADMISSION_MODULE],
  ["TASK7_BUERO_SOURCE_MODULE_SHA256", SOURCE_MODULE],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receipt,
  );
  assert.ok(match, `buero_admission_receipt_binding_missing:${label}`);
  assert.equal(
    match[1],
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  );
}

process.stdout.write(
  "TASK7_V2_L01C04_BUERO_CANONICAL_ADMISSION_HOLD_GATE PASS status=HOLD canonical=false inventory=false task7=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
