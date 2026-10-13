import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const CLOSURE_PATH =
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_tschuess_final_review_closure_v1/closure.json";

const REVIEWED_ARTIFACTS = Object.freeze({
  admissionModule: Object.freeze({
    path: "modules/learning-v2/curriculum/de/task6c_l01_tschuess_positive_admission_de_v1.ts",
    sha256: "9d1247704a5318cf93c63772f3f9bbe251d806b801285993d309aeac796d1d16",
  }),
  admissionGate: Object.freeze({
    path: "tests/learning_v2_de_task6c_l01_tschuess_positive_admission_gate.ts",
    sha256: "1ee1533fb26896dcf4ca4256480db98cd569501f07610f2085953933cdfff4f2",
  }),
  primaryReceipt: Object.freeze({
    path: "docs/v2/curriculum/de/TASK6C_L01_TSCHUESS_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
    sha256: "169687aa4287b3be1d055f0e4d2aefbe9fa09bbe9c1eba6d428a9dd6c511b806",
  }),
  lexicalEvidence: Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_tschuess_positive_admission_v1/lexical_evidence.json",
    sha256: "b8d90064c6c7994369c8d14d935878f976af0ca45b506e77122f454c16dfe72d",
  }),
  admissionManifest: Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_tschuess_positive_admission_v1/manifest.json",
    sha256: "98ea894cb092c5502deeb79fa4e91516d6f612e90722b8313250b546c579974d",
  }),
  lexicalRegistryV4: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v4.json",
    sha256: "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
  }),
  task6RegistryV4: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v4.json",
    sha256: "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
  }),
  allocationInventoryV4: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v4.json",
    sha256: "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
  }),
});

export type GermanTask6cL01TschuessFinalReviewArtifactNameDeV1 =
  keyof typeof REVIEWED_ARTIFACTS;

export type GermanTask6cL01TschuessFinalReviewClosureOptionsDeV1 = Readonly<{
  closurePathForTest?: string;
  reviewedPathOverridesForTest?: Readonly<
    Partial<Record<GermanTask6cL01TschuessFinalReviewArtifactNameDeV1, string>>
  >;
}>;

export type GermanTask6cL01TschuessFinalReviewClosureResultDeV1 = Readonly<{
  status: "CLOSED_FOR_EXACT_HASH_SET";
  lexicalDependencyAdmissionClosed: true;
  resolvedPlanIds: 8;
  unresolvedPlanIds: 280;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
  defaultConsumerChanged: false;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function exact(value: unknown, expected: unknown, code: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(code);
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
}

function exactKeys(
  value: JsonRecord,
  expected: readonly string[],
  code: string,
): void {
  exact(Object.keys(value).sort(), [...expected].sort(), code);
}

function readJson(file: string, code: string): JsonRecord {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    record(value, code);
    return value;
  } catch {
    return fail(code);
  }
}

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function englishSurfaceDigest(): Readonly<{
  fileCount: number;
  sha256: string;
}> {
  const roots = [
    "modules/learning-v2/curriculum/en",
    "content/learning-v2-course/curriculum/en",
    "content/learning-v2-course/release/en",
    "modules/learning-v2/content/factory_native/generated_release/en",
  ] as const;
  const files = roots
    .flatMap((root) => walk(path.join(ROOT, root)))
    .map((file) => ({
      file,
      relative: path.relative(ROOT, file).replaceAll("\\", "/"),
    }))
    .sort((left, right) => left.relative.localeCompare(right.relative));
  const digest = createHash("sha256");
  for (const entry of files) {
    digest.update(entry.relative);
    digest.update("\0");
    digest.update(sha256(fs.readFileSync(entry.file)));
    digest.update("\0");
  }
  return Object.freeze({
    fileCount: files.length,
    sha256: digest.digest("hex"),
  });
}

const EXPECTED_REVIEWS = Object.freeze({
  spec: Object.freeze({
    taskIdentity: "/root/de_tschuess_final_spec_review",
    verdict: "PASS",
    findings: Object.freeze({ P0: 0, P1: 0, P2: 0 }),
    scope: "EXACT_REVIEWED_HASH_SET_LEXICAL_DEPENDENCY_ADMISSION_ONLY",
    provenance: "COORDINATOR_ORCHESTRATION_ONLY",
    rawOutputSidecar: "unavailable",
    outputSha256: "unavailable",
  }),
  adversarial: Object.freeze({
    taskIdentity: "/root/de_tschuess_final_adversarial_review",
    verdict: "PASS",
    findings: Object.freeze({ P0: 0, P1: 0, P2: 0 }),
    scope: "EXACT_REVIEWED_HASH_SET_LEXICAL_DEPENDENCY_ADMISSION_ONLY",
    provenance: "COORDINATOR_ORCHESTRATION_ONLY",
    rawOutputSidecar: "unavailable",
    outputSha256: "unavailable",
  }),
});

export function loadGermanTask6cL01TschuessFinalReviewClosureDeV1(
  options: GermanTask6cL01TschuessFinalReviewClosureOptionsDeV1 = {},
): GermanTask6cL01TschuessFinalReviewClosureResultDeV1 {
  exactKeys(
    options as JsonRecord,
    Object.keys(options).filter((key) =>
      ["closurePathForTest", "reviewedPathOverridesForTest"].includes(key),
    ),
    "tschuss_final_closure_options",
  );
  const overrides = options.reviewedPathOverridesForTest ?? {};
  if (Object.keys(overrides).some((name) => !(name in REVIEWED_ARTIFACTS))) {
    fail("tschuss_final_closure_options");
  }
  const closure = readJson(
    options.closurePathForTest ?? path.join(ROOT, CLOSURE_PATH),
    "tschuss_final_closure_json",
  );
  exactKeys(
    closure,
    [
      "schemaVersion",
      "language",
      "closureKind",
      "status",
      "scope",
      "reviewedArtifacts",
      "finalReviews",
      "supersession",
      "authority",
      "typeScriptEvidence",
      "englishSurface",
    ],
    "tschuss_final_closure_schema",
  );
  if (
    closure.schemaVersion !==
      "learning-v2-de-task6c-l01-tschuess-final-review-closure.v1" ||
    closure.language !== "de" ||
    closure.closureKind !== "APPEND_ONLY_EXACT_HASH_REVIEW_SUPERSESSION" ||
    closure.status !== "CLOSED_FOR_EXACT_HASH_SET"
  ) {
    fail("tschuss_final_closure_schema");
  }
  exact(
    closure.scope,
    {
      admission: "EXACT_TSCHUESS_LEXICAL_DEPENDENCY_ONLY",
      lexicalDependencyAdmissionClosed: true,
      resolvedPlanIds: 8,
      unresolvedPlanIds: 280,
      packetIds: 1792,
      materializedPackets: 0,
      globalTask6CompletionEstablished: false,
    },
    "tschuss_final_closure_scope",
  );
  record(closure.reviewedArtifacts, "tschuss_final_closure_artifacts");
  exactKeys(
    closure.reviewedArtifacts,
    Object.keys(REVIEWED_ARTIFACTS),
    "tschuss_final_closure_artifacts",
  );
  for (const [name, expected] of Object.entries(REVIEWED_ARTIFACTS) as [
    GermanTask6cL01TschuessFinalReviewArtifactNameDeV1,
    { readonly path: string; readonly sha256: string },
  ][]) {
    const code = `tschuss_final_closure_artifact_binding:${name}`;
    exact(closure.reviewedArtifacts[name], expected, code);
    const reviewedPath = overrides[name] ?? path.join(ROOT, expected.path);
    let bytes: Buffer;
    try {
      bytes = fs.readFileSync(reviewedPath);
    } catch {
      return fail(code);
    }
    if (sha256(bytes) !== expected.sha256) fail(code);
    if (
      name === "primaryReceipt" &&
      !bytes.toString("utf8").includes("Independent review status: `PENDING`")
    ) {
      fail("tschuss_final_closure_supersession");
    }
  }
  record(closure.finalReviews, "tschuss_final_closure_reviews");
  exactKeys(
    closure.finalReviews,
    Object.keys(EXPECTED_REVIEWS),
    "tschuss_final_closure_reviews",
  );
  for (const [name, expected] of Object.entries(EXPECTED_REVIEWS)) {
    exact(
      closure.finalReviews[name],
      expected,
      `tschuss_final_closure_review:${name}`,
    );
  }
  exact(
    closure.supersession,
    {
      primaryReceiptStatusAtReviewedHash: "PENDING",
      primaryReceiptBytesModified: false,
      reviewStatusSupersededForExactHashSetOnly: true,
      semanticArtifactsModified: false,
    },
    "tschuss_final_closure_supersession",
  );
  exact(
    closure.authority,
    {
      task7Unlock: false,
      preauthoringAuthority: false,
      learnerFacing: false,
      releaseAuthorized: false,
      consumerCutover: "NONE",
      defaultConsumerChanged: false,
    },
    "tschuss_final_closure_authority",
  );
  exact(
    closure.typeScriptEvidence,
    {
      command:
        "node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false",
      exitCode: 2,
      diagnostics: 14,
      targetDiagnostics: 0,
    },
    "tschuss_final_closure_typescript",
  );
  exact(
    closure.englishSurface,
    {
      fileCount: 1570,
      sha256:
        "33c6dfd1201dfa9e2719eda7b4845a4591fdb2acd7b0cc059f89e1297e2b9f95",
    },
    "tschuss_final_closure_english",
  );
  exact(
    englishSurfaceDigest(),
    closure.englishSurface,
    "tschuss_final_closure_english",
  );
  return Object.freeze({
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
}
