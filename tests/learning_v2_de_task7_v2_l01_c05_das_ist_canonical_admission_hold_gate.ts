import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  GERMAN_TASK7_V2_L01_C05_DAS_IST_CANONICAL_ADMISSION_HOLD_DE_V1,
  inspectGermanTask7V2L01C05DasIstCanonicalAdmissionHoldDeV1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c05_das_ist_canonical_admission_hold_de_v1";
import {
  GERMAN_TASK7_V2_L01_C05_DAS_IST_SOURCE_HOLD_DE_V1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c05_das_ist_source_hold_de_v1";

type RecordValue = Record<string, unknown>;

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c05_das_ist_source_hold_v1",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C05_DAS_IST_CANONICAL_ADMISSION_HOLD_RECEIPT_2026-10-13.md",
);
const ADMISSION_MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c05_das_ist_canonical_admission_hold_de_v1.ts",
);
const SOURCE_MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c05_das_ist_source_hold_de_v1.ts",
);

assert.deepEqual(GERMAN_TASK7_V2_L01_C05_DAS_IST_CANONICAL_ADMISSION_HOLD_DE_V1, {
  status: "HOLD",
  sourceHold: GERMAN_TASK7_V2_L01_C05_DAS_IST_SOURCE_HOLD_DE_V1,
  sourceEvidence: {
    headword: "sein",
    verifiedForm: "ist",
    checkpointPacketId: "de_l01_c05_s40",
    exactLearnerPhrase: "NOT_CLAIMED:_CAPTURE_DOES_NOT_PROVE_THE_EXACT_CASED_PHRASE_DAS_IST",
  },
  authority: {
    canonicalAdmission: false,
    inventoryResolutionApplied: false,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
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
  mutate: (candidate: RecordValue) => void,
  expected: RegExp,
): void {
  const candidate = structuredClone(
    GERMAN_TASK7_V2_L01_C05_DAS_IST_CANONICAL_ADMISSION_HOLD_DE_V1,
  ) as RecordValue;
  mutate(candidate);
  assert.throws(
    () => inspectGermanTask7V2L01C05DasIstCanonicalAdmissionHoldDeV1(candidate),
    expected,
  );
}

rejects((candidate) => {
  (candidate.sourceEvidence as RecordValue).checkpointPacketId = "de_l01_c05_s33";
}, /das_ist_admission_source_evidence_drift:checkpointPacketId/u);
rejects((candidate) => {
  (candidate.sourceEvidence as RecordValue).exactLearnerPhrase = "Das ist";
}, /das_ist_admission_exact_phrase_not_claimed/u);
rejects((candidate) => {
  (candidate.authority as RecordValue).canonicalAdmission = true;
}, /das_ist_admission_authority_forbidden:canonicalAdmission/u);
rejects((candidate) => {
  (candidate.output as RecordValue).release = true;
}, /das_ist_admission_output_forbidden:release/u);
rejects((candidate) => {
  (candidate.output as RecordValue).cutover = "ACTIVE";
}, /das_ist_admission_output_forbidden:cutover/u);

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  ["TASK7_DAS_IST_ADMISSION_MODULE_SHA256", ADMISSION_MODULE],
  ["TASK7_DAS_IST_SOURCE_MODULE_SHA256", SOURCE_MODULE],
  ["TASK7_DAS_IST_SOURCE_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(receipt);
  assert.ok(match, `das_ist_admission_receipt_binding_missing:${label}`);
  assert.equal(
    match[1],
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  );
}
assert.match(receipt, /NOT_CLAIMED:.*DAS_IST/u);
assert.match(receipt, /sein`\s*→\s*`ist/u);
assert.doesNotMatch(receipt, /de_l01_c05_s33/u);
assert.doesNotMatch(receipt, /CANONICAL_ADMITTED|RELEASED|TASK7_UNLOCK_ALLOWED/u);

process.stdout.write(
  "TASK7_V2_L01C05_DAS_IST_CANONICAL_ADMISSION_HOLD_GATE PASS status=HOLD canonical=false inventory=false task7=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
