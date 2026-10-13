import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const MODULE =
  "modules/learning-v2/curriculum/de/task6c_l01_briefkasten_final_review_closure_de_v1.ts";
const CLOSURE =
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_final_review_closure_v1/closure.json";
const REVIEWED = Object.freeze({
  admissionModule: {
    path: "modules/learning-v2/curriculum/de/task6c_l01_briefkasten_positive_admission_de_v1.ts",
    sha256: "95fba62921f1fd4da7fccd218fc6c4b6b1f257521118d32e80e4306220d7e7df",
  },
  admissionGate: {
    path: "tests/learning_v2_de_task6c_l01_briefkasten_positive_admission_gate.ts",
    sha256: "7cbcc62198f8db375a1ee95f26aa82e610b783da0bd3bfe20e1830bdf43f71b5",
  },
  primaryReceipt: {
    path: "docs/v2/curriculum/de/TASK6C_L01_BRIEFKASTEN_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
    sha256: "817ed02b204baa7979179b06900e3dcfc46321b8c8c7348778de30b10ecf2ebc",
  },
  lexicalEvidence: {
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_positive_admission_v1/lexical_evidence.json",
    sha256: "bf298f3e6441b615772ff43efb6ec05252aa07fa772a2d15bb2f330ee523ef12",
  },
  admissionManifest: {
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_positive_admission_v1/manifest.json",
    sha256: "766022b62d091c6c023d310477969d9e09d7eacd62e6b89af2448fbfe878d8f1",
  },
  lexicalRegistryV6: {
    path: "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v6.json",
    sha256: "3d45077cba6f20e826ce3fa04732a91fec15d571ac9a0cb54923c8ec84c66e55",
  },
  task6RegistryV6: {
    path: "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json",
    sha256: "63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc",
  },
  allocationInventoryV6: {
    path: "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json",
    sha256: "e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677",
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
  "briefkasten_final_closure_reviewed_bytes_drift",
);

if (!fs.existsSync(path.join(ROOT, MODULE)))
  assert.fail(`briefkasten_final_closure_missing:${MODULE}`);
if (!fs.existsSync(path.join(ROOT, CLOSURE)))
  assert.fail(`briefkasten_final_closure_missing:${CLOSURE}`);

const { loadGermanTask6cL01BriefkastenFinalReviewClosureDeV1 } = require(
  `../${MODULE}`,
) as {
  loadGermanTask6cL01BriefkastenFinalReviewClosureDeV1: (
    options?: Record<string, unknown>,
  ) => unknown;
};

assert.deepEqual(loadGermanTask6cL01BriefkastenFinalReviewClosureDeV1(), {
  status: "CLOSED_FOR_EXACT_HASH_SET",
  lexicalDependencyAdmissionClosed: true,
  resolvedPlanIds: 10,
  unresolvedPlanIds: 278,
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
        loadGermanTask6cL01BriefkastenFinalReviewClosureDeV1({
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
      `briefkasten_final_closure_artifact_binding:${artifactName}`,
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
    new RegExp(`briefkasten_final_closure_review:${reviewName}`, "u"),
  );
  hostile(
    `findings-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].findings.P2 = 1;
    },
    new RegExp(`briefkasten_final_closure_review:${reviewName}`, "u"),
  );
  hostile(
    `sidecar-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].rawOutputSidecar = "invented.json";
    },
    new RegExp(`briefkasten_final_closure_review:${reviewName}`, "u"),
  );
  hostile(
    `provenance-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].provenance = "SELF_ATTESTED";
    },
    new RegExp(`briefkasten_final_closure_review:${reviewName}`, "u"),
  );
  hostile(
    `output-hash-${reviewName}.json`,
    (value) => {
      value.finalReviews[reviewName].outputSha256 = "0".repeat(64);
    },
    new RegExp(`briefkasten_final_closure_review:${reviewName}`, "u"),
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
    /briefkasten_final_closure_authority/u,
  );
}

hostile(
  "extra-authority.json",
  (value) => {
    value.authority.hiddenUnlock = true;
  },
  /briefkasten_final_closure_authority/u,
);
hostile(
  "scope.json",
  (value) => {
    value.scope.resolvedPlanIds = 288;
    value.scope.unresolvedPlanIds = 0;
  },
  /briefkasten_final_closure_scope/u,
);
hostile(
  "supersession.json",
  (value) => {
    value.supersession.primaryReceiptBytesModified = true;
  },
  /briefkasten_final_closure_supersession/u,
);
hostile(
  "typescript.json",
  (value) => {
    value.typeScriptEvidence.exitCode = 0;
  },
  /briefkasten_final_closure_typescript/u,
);
hostile(
  "english.json",
  (value) => {
    value.englishSurface.sha256 = "0".repeat(64);
  },
  /briefkasten_final_closure_english/u,
);
hostile(
  "default.json",
  (value) => {
    value.defaultConsumer.v6Selected = true;
  },
  /briefkasten_final_closure_default_consumer/u,
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
      loadGermanTask6cL01BriefkastenFinalReviewClosureDeV1({
        reviewedPathOverridesForTest: { primaryReceipt: receiptCopy },
      }),
    /briefkasten_final_closure_artifact_binding:primaryReceipt/u,
  );
} finally {
  fs.rmSync(receiptCopyRoot, { recursive: true, force: true });
}

assert.deepEqual(
  Object.fromEntries(
    Object.values(REVIEWED).map(({ path: file }) => [file, hash(file)]),
  ),
  immutablePre,
  "briefkasten_final_closure_reviewed_bytes_changed",
);

process.stdout.write(
  "TASK6C_L01_BRIEFKASTEN_FINAL_REVIEW_CLOSURE_GATE PASS scope=LEXICAL_DEPENDENCY_ADMISSION_ONLY resolved=10 unresolved=278 task7=false preauthoring=false learner=false release=false materializable=false phraseAuthority=false cutover=NONE defaultConsumer=false tsc=2/16/0\n",
);
