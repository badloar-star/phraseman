import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const MODULE =
  "modules/learning-v2/curriculum/de/task6c_l01_ich_heisse_final_review_closure_de_v1.ts";
const CLOSURE =
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_final_review_closure_v1/closure.json";
const REVIEWED = Object.freeze({
  admissionModule: {
    path: "modules/learning-v2/curriculum/de/task6c_l01_ich_heisse_positive_admission_de_v1.ts",
    sha256: "6a0cd8ee5124251b78a92f6eee8267098573be5bb0b1ea013ac4597b06d3e31a",
  },
  admissionGate: {
    path: "tests/learning_v2_de_task6c_l01_ich_heisse_positive_admission_gate.ts",
    sha256: "3f17dae66824d5f2b44466fd592729abcf53ddbf1a1271f7810bc9a33124ef13",
  },
  primaryReceipt: {
    path: "docs/v2/curriculum/de/TASK6C_L01_ICH_HEISSE_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
    sha256: "926348a833d968d0245467761337a030535e44a90ed732bfa1a5fc0b9df5ad11",
  },
  lexicalEvidence: {
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_positive_admission_v1/lexical_evidence.json",
    sha256: "aaade49d6ba482326b5f0638e617c99744ce3f9242e789928afd7650ea7ccfe3",
  },
  admissionManifest: {
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_positive_admission_v1/manifest.json",
    sha256: "94900d9d0cd595d394e0964a79d354495e9f41a194eaf4a408d20b377c584b4e",
  },
  lexicalRegistryV5: {
    path: "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v5.json",
    sha256: "4ed741cc0e457eff0c3500f98e6c8d62a33a951110d428ff1333075eca99a2c7",
  },
  task6RegistryV5: {
    path: "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v5.json",
    sha256: "9bbf41335e13dff8f97be3bbd05f21284c99e62c31d5fcb63f7b5f0ab324af91",
  },
  allocationInventoryV5: {
    path: "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v5.json",
    sha256: "e1c01fa8ef727c23d128d07bbe5cf67f7c04c6539610817ba39b6e0b555fb3b4",
  },
});

const hash = (file: string): string =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, file)))
    .digest("hex");
const immutablePre = Object.fromEntries(
  Object.values(REVIEWED).map(({ path: file }) => [file, hash(file)]),
);
assert.deepEqual(
  immutablePre,
  Object.fromEntries(
    Object.values(REVIEWED).map(({ path: file, sha256 }) => [file, sha256]),
  ),
  "ich_heisse_final_closure_reviewed_bytes_drift",
);

if (!fs.existsSync(path.join(ROOT, MODULE)))
  assert.fail(`ich_heisse_final_closure_missing:${MODULE}`);
if (!fs.existsSync(path.join(ROOT, CLOSURE)))
  assert.fail(`ich_heisse_final_closure_missing:${CLOSURE}`);

const { loadGermanTask6cL01IchHeisseFinalReviewClosureDeV1 } = require(
  `../${MODULE}`,
) as {
  loadGermanTask6cL01IchHeisseFinalReviewClosureDeV1: (
    options?: Record<string, unknown>,
  ) => unknown;
};

assert.deepEqual(loadGermanTask6cL01IchHeisseFinalReviewClosureDeV1(), {
  status: "CLOSED_FOR_EXACT_HASH_SET",
  lexicalDependencyAdmissionClosed: true,
  resolvedPlanIds: 9,
  unresolvedPlanIds: 279,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
  defaultConsumerChanged: false,
});

const readJson = (): JsonRecord =>
  JSON.parse(fs.readFileSync(path.join(ROOT, CLOSURE), "utf8")) as JsonRecord;
const writeJson = (file: string, value: unknown): void =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const hostile = (
  name: string,
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "de-ich-heisse-closure-"),
  );
  try {
    const candidate = path.join(directory, name);
    const value = readJson();
    mutate(value);
    writeJson(candidate, value);
    assert.throws(
      () =>
        loadGermanTask6cL01IchHeisseFinalReviewClosureDeV1({
          closurePathForTest: candidate,
        }),
      expected,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

for (const artifactName of Object.keys(REVIEWED)) {
  hostile(
    `hash-${artifactName}.json`,
    (value) => {
      value.reviewedArtifacts[artifactName].sha256 = "0".repeat(64);
    },
    new RegExp(
      `ich_heisse_final_closure_artifact_binding:${artifactName}`,
      "u",
    ),
  );
}

for (const reviewName of ["spec", "adversarial"] as const) {
  hostile(
    `verdict-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].verdict = "HOLD";
    },
    new RegExp(`ich_heisse_final_closure_review:${reviewName}`, "u"),
  );
  hostile(
    `findings-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].findings.P2 = 1;
    },
    new RegExp(`ich_heisse_final_closure_review:${reviewName}`, "u"),
  );
  hostile(
    `sidecar-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].rawOutputSidecar = "invented.json";
    },
    new RegExp(`ich_heisse_final_closure_review:${reviewName}`, "u"),
  );
}

for (const [field, hostileValue] of [
  ["task7Unlock", true],
  ["preauthoringAuthority", true],
  ["learnerFacing", true],
  ["releaseAuthorized", true],
  ["currentlyMaterializable", true],
  ["phraseAuthority", true],
  ["consumerCutover", "DEFAULT"],
  ["defaultConsumerChanged", true],
  ["ownerApproval", "GRANTED"],
] as const) {
  hostile(
    `authority-${field}.json`,
    (value) => {
      value.authority[field] = hostileValue;
    },
    /ich_heisse_final_closure_authority/u,
  );
}

hostile(
  "extra-authority.json",
  (value) => {
    value.authority.hiddenUnlock = true;
  },
  /ich_heisse_final_closure_authority/u,
);
hostile(
  "scope.json",
  (value) => {
    value.scope.resolvedPlanIds = 288;
    value.scope.unresolvedPlanIds = 0;
  },
  /ich_heisse_final_closure_scope/u,
);
hostile(
  "supersession.json",
  (value) => {
    value.supersession.primaryReceiptBytesModified = true;
  },
  /ich_heisse_final_closure_supersession/u,
);
hostile(
  "typescript.json",
  (value) => {
    value.typeScriptEvidence.exitCode = 0;
  },
  /ich_heisse_final_closure_typescript/u,
);
hostile(
  "english.json",
  (value) => {
    value.englishSurface.sha256 = "0".repeat(64);
  },
  /ich_heisse_final_closure_english/u,
);
hostile(
  "default.json",
  (value) => {
    value.defaultConsumer.v5Selected = true;
  },
  /ich_heisse_final_closure_default_consumer/u,
);

const receiptCopyRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "de-ich-heisse-closure-receipt-"),
);
try {
  const receiptCopy = path.join(receiptCopyRoot, "receipt.md");
  fs.copyFileSync(path.join(ROOT, REVIEWED.primaryReceipt.path), receiptCopy);
  fs.appendFileSync(receiptCopy, " \n", "utf8");
  assert.throws(
    () =>
      loadGermanTask6cL01IchHeisseFinalReviewClosureDeV1({
        reviewedPathOverridesForTest: { primaryReceipt: receiptCopy },
      }),
    /ich_heisse_final_closure_artifact_binding:primaryReceipt/u,
  );
} finally {
  fs.rmSync(receiptCopyRoot, { recursive: true, force: true });
}

assert.deepEqual(
  Object.fromEntries(
    Object.values(REVIEWED).map(({ path: file }) => [file, hash(file)]),
  ),
  immutablePre,
  "ich_heisse_final_closure_reviewed_bytes_changed",
);

process.stdout.write(
  "TASK6C_L01_ICH_HEISSE_FINAL_REVIEW_CLOSURE_GATE PASS scope=LEXICAL_DEPENDENCY_ADMISSION_ONLY resolved=9 unresolved=279 task7=false preauthoring=false learner=false release=false materializable=false phraseAuthority=false cutover=NONE defaultConsumer=false tsc=2/17/0\n",
);
