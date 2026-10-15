import assert from "node:assert/strict";

import {
  GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_CANONICAL_ADMISSION_HOLD_DE_V1,
  inspectGermanTask7V2L01C06HausmeisterCanonicalAdmissionHoldDeV1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c06_hausmeister_canonical_admission_hold_de_v1";
import { GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_SOURCE_HOLD_DE_V1 } from "../modules/learning-v2/curriculum/de/task7_v2_l01_c06_hausmeister_source_hold_de_v1";

type RecordValue = Record<string, unknown>;

const receipt =
  GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_CANONICAL_ADMISSION_HOLD_DE_V1;

assert.equal(receipt.status, "HOLD");
assert.equal(
  receipt.sourceHold,
  GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_SOURCE_HOLD_DE_V1,
);
assert.deepEqual(receipt.pinnedArtifacts, [
  {
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/extraction_map.json",
    byteLength: 1651,
    sha256: "de6cf30b0ee672964555d2a0a89bedd35c03e8a81a5c90d3dedbdf9daae9da49",
  },
  {
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/manifest.json",
    byteLength: 1830,
    sha256: "5d74697456a20325d4306ffe2a427b013aabde114e3e9faef3ac27e7a2e5581f",
  },
  {
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/raw/de_lex_plan_l01_c06_hausmeister_v1.html",
    byteLength: 59173,
    sha256: "ce5d7d3b6648662579068c4702d6fb252f21e165eafa043b569a1b822346a538",
  },
  {
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/raw/de_lex_plan_l01_c06_hausmeister_v1.http_metadata.txt",
    byteLength: 520,
    sha256: "365da893f5c85cb11a2928bb365cbc3835fbfafac8ee5c1e6c9c07ef3a787168",
  },
  {
    path: "modules/learning-v2/curriculum/de/task7_v2_l01_c06_hausmeister_source_hold_de_v1.ts",
    byteLength: 10227,
    sha256: "205a4dcdd5f1466abe8bef5a5657c7e078f3ebd4e7f172453985a26cfccff00d",
  },
  {
    path: "tests/learning_v2_de_task7_v2_l01_c06_hausmeister_source_hold_gate.ts",
    byteLength: 2736,
    sha256: "fa0d0a33e98526d34209566b833753a6acd918b10d0898a0cf0d682165ac20bd",
  },
  {
    path: "scripts/guard_learning_v2_de_task7_v2_l01_c06_hausmeister_scope.mjs",
    byteLength: 4162,
    sha256: "2655fe9af20621d3a78b772280f507e2356f71f50046901ed95e31020bbe66d6",
  },
  {
    path: "tests/learning_v2_de_task7_v2_l01_c06_hausmeister_scope_evidence_gate.ts",
    byteLength: 2733,
    sha256: "b3d04ebcbbc0277ae2086833d68f6539d46afefb7e932c3b75418276fcf073cf",
  },
]);
assert.deepEqual(receipt.authority, {
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
});
assert.deepEqual(receipt.output, {
  canonical: false,
  inventory: false,
  task7: false,
  preauthoring: false,
  learner: false,
  release: false,
  cutover: "NONE",
});

function rejects(
  mutate: (candidate: RecordValue) => void,
  expected: RegExp,
): void {
  const candidate = structuredClone(receipt) as RecordValue;
  mutate(candidate);
  assert.throws(
    () =>
      inspectGermanTask7V2L01C06HausmeisterCanonicalAdmissionHoldDeV1(
        candidate,
      ),
    expected,
  );
}

rejects((candidate) => {
  (candidate.pinnedArtifacts as RecordValue[])[0].byteLength = 1;
}, /hausmeister_admission_pinned_artifact_drift:0.byteLength/u);
rejects((candidate) => {
  (candidate.authority as RecordValue).canonicalAdmission = true;
}, /hausmeister_admission_authority_forbidden:canonicalAdmission/u);
rejects((candidate) => {
  (candidate.output as RecordValue).release = true;
}, /hausmeister_admission_output_forbidden:release/u);

process.stdout.write(
  "TASK7_V2_L01C06_HAUSMEISTER_CANONICAL_ADMISSION_HOLD_GATE PASS status=HOLD pinnedArtifacts=8 canonical=false inventory=false task7=false preauthoring=false learner=false release=false cutover=NONE\\n",
);
