import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_CANONICAL_ADMISSION_HOLD_DE_V1,
  inspectGermanTask7V2L01C06AufWiedersehenCanonicalAdmissionHoldDeV1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c06_auf_wiedersehen_canonical_admission_hold_de_v1";
import {
  GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_SOURCE_HOLD_DE_V1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c06_auf_wiedersehen_source_hold_de_v1";

type RecordValue = Record<string, unknown>;

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_auf_wiedersehen_source_hold_v1",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C06_AUF_WIEDERSEHEN_CANONICAL_ADMISSION_HOLD_RECEIPT_2026-10-13.md",
);
const ADMISSION_MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c06_auf_wiedersehen_canonical_admission_hold_de_v1.ts",
);
const SOURCE_MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c06_auf_wiedersehen_source_hold_de_v1.ts",
);

assert.deepEqual(
  GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_CANONICAL_ADMISSION_HOLD_DE_V1,
  {
    status: "HOLD",
    sourceHold: GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_SOURCE_HOLD_DE_V1,
    sourceEvidence: {
      exactOccurrence: "Auf Wiedersehen! / Tschüs!",
      exactOccurrenceUtf8Bytes: 27,
      exactOccurrenceSha256:
        "fefa8907e7a90ccaa18b44c0aa3f5ce7829ccaed980c69e8f427902c3e692442",
      rawSha256:
        "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",
      metadataSha256:
        "afa2a1f9de300071b9e885fb3ade745766b53d7f7bd5bee5732f188806db8f47",
      extractionMapSha256:
        "b55246c8274075182f3f534ae12470a0550cfbc79d128ac349d3fae5b0bb558e",
      manifestSha256:
        "360533cdb4ff0571850cbe807b6455e3393406a25327d91099d51e1218f3512a",
      neutralRegister: "UNSUPPORTED_BY_CAPTURED_SOURCE",
    },
    targetResolutions: 0,
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
  },
);

function rejects(
  mutate: (candidate: RecordValue) => void,
  expected: RegExp,
): void {
  const candidate = structuredClone(
    GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_CANONICAL_ADMISSION_HOLD_DE_V1,
  ) as RecordValue;
  mutate(candidate);
  assert.throws(
    () => inspectGermanTask7V2L01C06AufWiedersehenCanonicalAdmissionHoldDeV1(candidate),
    expected,
  );
}

rejects((candidate) => {
  (candidate.sourceEvidence as RecordValue).exactOccurrence = "Auf Wiedersehen";
}, /auf_wiedersehen_admission_source_evidence_drift:exactOccurrence/u);
rejects((candidate) => {
  (candidate.sourceEvidence as RecordValue).neutralRegister = "SUPPORTED";
}, /auf_wiedersehen_admission_unsupported_neutral_register/u);
rejects((candidate) => {
  (candidate.sourceEvidence as RecordValue).manifestSha256 = "0".repeat(64);
}, /auf_wiedersehen_admission_source_evidence_drift:manifestSha256/u);
rejects((candidate) => {
  candidate.targetResolutions = 1;
}, /auf_wiedersehen_admission_target_resolutions_forbidden/u);
rejects((candidate) => {
  (candidate.authority as RecordValue).canonicalAdmission = true;
}, /auf_wiedersehen_admission_authority_forbidden:canonicalAdmission/u);
rejects((candidate) => {
  (candidate.output as RecordValue).release = true;
}, /auf_wiedersehen_admission_output_forbidden:release/u);
rejects((candidate) => {
  (candidate.output as RecordValue).cutover = "ACTIVE";
}, /auf_wiedersehen_admission_output_forbidden:cutover/u);

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  ["TASK7_AUF_WIEDERSEHEN_ADMISSION_MODULE_SHA256", ADMISSION_MODULE],
  ["TASK7_AUF_WIEDERSEHEN_SOURCE_MODULE_SHA256", SOURCE_MODULE],
  ["TASK7_AUF_WIEDERSEHEN_SOURCE_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  ["TASK7_AUF_WIEDERSEHEN_SOURCE_EXTRACTION_MAP_SHA256", path.join(EVIDENCE, "extraction_map.json")],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(receipt);
  assert.ok(match, `auf_wiedersehen_admission_receipt_binding_missing:${label}`);
  assert.equal(match[1], crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"));
}
assert.match(receipt, /UNSUPPORTED_BY_CAPTURED_SOURCE/u);
assert.doesNotMatch(receipt, /CANONICAL_ADMITTED|RELEASED|TASK7_UNLOCK_ALLOWED/u);

process.stdout.write(
  "TASK7_V2_L01C06_AUF_WIEDERSEHEN_CANONICAL_ADMISSION_HOLD_GATE PASS status=HOLD targetResolutions=0 canonical=false inventory=false task7=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
