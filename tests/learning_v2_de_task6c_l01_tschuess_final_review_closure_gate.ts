import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  loadGermanTask6cL01TschuessFinalReviewClosureDeV1,
  type GermanTask6cL01TschuessFinalReviewClosureOptionsDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_l01_tschuess_final_review_closure_de_v1";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const CLOSURE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_tschuess_final_review_closure_v1/closure.json",
);

function readJson(file: string): JsonRecord {
  return JSON.parse(fs.readFileSync(file, "utf8")) as JsonRecord;
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hostile(
  name: string,
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "de-tschuess-closure-"),
  );
  try {
    const candidate = path.join(directory, name);
    const value = readJson(CLOSURE);
    mutate(value);
    writeJson(candidate, value);
    assert.throws(
      () =>
        loadGermanTask6cL01TschuessFinalReviewClosureDeV1({
          closurePathForTest: candidate,
        }),
      expected,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

const result = loadGermanTask6cL01TschuessFinalReviewClosureDeV1();
assert.deepEqual(result, {
  status: "CLOSED_FOR_EXACT_HASH_SET",
  lexicalDependencyAdmissionClosed: true,
  resolvedPlanIds: 8,
  unresolvedPlanIds: 280,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
  defaultConsumerChanged: false,
});

for (const artifactName of [
  "admissionModule",
  "admissionGate",
  "primaryReceipt",
  "lexicalEvidence",
  "admissionManifest",
  "lexicalRegistryV4",
  "task6RegistryV4",
  "allocationInventoryV4",
] as const) {
  hostile(
    `hash-${artifactName}.json`,
    (value) => {
      value.reviewedArtifacts[artifactName].sha256 = "0".repeat(64);
    },
    new RegExp(`tschuss_final_closure_artifact_binding:${artifactName}`, "u"),
  );
}

for (const reviewName of ["spec", "adversarial"] as const) {
  hostile(
    `verdict-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].verdict = "HOLD";
    },
    new RegExp(`tschuss_final_closure_review:${reviewName}`, "u"),
  );
  hostile(
    `findings-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].findings.P1 = 1;
    },
    new RegExp(`tschuss_final_closure_review:${reviewName}`, "u"),
  );
  hostile(
    `sidecar-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].rawOutputSidecar = "invented.json";
    },
    new RegExp(`tschuss_final_closure_review:${reviewName}`, "u"),
  );
}

for (const [field, hostileValue] of [
  ["task7Unlock", true],
  ["preauthoringAuthority", true],
  ["learnerFacing", true],
  ["releaseAuthorized", true],
  ["consumerCutover", "DEFAULT"],
  ["defaultConsumerChanged", true],
] as const) {
  hostile(
    `authority-${field}.json`,
    (value) => {
      value.authority[field] = hostileValue;
    },
    /tschuss_final_closure_authority/u,
  );
}

hostile(
  "scope-counts.json",
  (value) => {
    value.scope.resolvedPlanIds = 288;
    value.scope.unresolvedPlanIds = 0;
  },
  /tschuss_final_closure_scope/u,
);
hostile(
  "supersession.json",
  (value) => {
    value.supersession.reviewStatusSupersededForExactHashSetOnly = false;
  },
  /tschuss_final_closure_supersession/u,
);
hostile(
  "typescript.json",
  (value) => {
    value.typeScriptEvidence.targetDiagnostics = 1;
  },
  /tschuss_final_closure_typescript/u,
);
hostile(
  "english.json",
  (value) => {
    value.englishSurface.sha256 = "0".repeat(64);
  },
  /tschuss_final_closure_english/u,
);
hostile(
  "extra-authority.json",
  (value) => {
    value.authority.task7Preauthorization = true;
  },
  /tschuss_final_closure_authority/u,
);

const receiptCopyRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "de-tschuess-closure-receipt-"),
);
try {
  const receiptCopy = path.join(receiptCopyRoot, "receipt.md");
  fs.copyFileSync(
    path.join(
      ROOT,
      "docs/v2/curriculum/de/TASK6C_L01_TSCHUESS_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
    ),
    receiptCopy,
  );
  fs.appendFileSync(receiptCopy, " \n", "utf8");
  const reviewedPathOverridesForTest: NonNullable<
    GermanTask6cL01TschuessFinalReviewClosureOptionsDeV1["reviewedPathOverridesForTest"]
  > = { primaryReceipt: receiptCopy };
  assert.throws(
    () =>
      loadGermanTask6cL01TschuessFinalReviewClosureDeV1({
        reviewedPathOverridesForTest,
      }),
    /tschuss_final_closure_artifact_binding:primaryReceipt/u,
  );
} finally {
  fs.rmSync(receiptCopyRoot, { recursive: true, force: true });
}

process.stdout.write(
  "TASK6C_L01_TSCHUESS_FINAL_REVIEW_CLOSURE_GATE PASS scope=LEXICAL_DEPENDENCY_ADMISSION_ONLY resolved=8 unresolved=280 task7=false preauthoring=false learner=false release=false cutover=NONE defaultConsumer=false tsc=2/14/0\n",
);
