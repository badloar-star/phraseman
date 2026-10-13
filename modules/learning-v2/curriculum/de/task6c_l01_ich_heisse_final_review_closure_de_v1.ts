import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const CLOSURE_PATH =
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_final_review_closure_v1/closure.json";

const REVIEWED_ARTIFACTS = Object.freeze({
  admissionModule: Object.freeze({
    path: "modules/learning-v2/curriculum/de/task6c_l01_ich_heisse_positive_admission_de_v1.ts",
    sha256: "6a0cd8ee5124251b78a92f6eee8267098573be5bb0b1ea013ac4597b06d3e31a",
  }),
  admissionGate: Object.freeze({
    path: "tests/learning_v2_de_task6c_l01_ich_heisse_positive_admission_gate.ts",
    sha256: "3f17dae66824d5f2b44466fd592729abcf53ddbf1a1271f7810bc9a33124ef13",
  }),
  primaryReceipt: Object.freeze({
    path: "docs/v2/curriculum/de/TASK6C_L01_ICH_HEISSE_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
    sha256: "926348a833d968d0245467761337a030535e44a90ed732bfa1a5fc0b9df5ad11",
  }),
  lexicalEvidence: Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_positive_admission_v1/lexical_evidence.json",
    sha256: "aaade49d6ba482326b5f0638e617c99744ce3f9242e789928afd7650ea7ccfe3",
  }),
  admissionManifest: Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_positive_admission_v1/manifest.json",
    sha256: "94900d9d0cd595d394e0964a79d354495e9f41a194eaf4a408d20b377c584b4e",
  }),
  lexicalRegistryV5: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v5.json",
    sha256: "4ed741cc0e457eff0c3500f98e6c8d62a33a951110d428ff1333075eca99a2c7",
  }),
  task6RegistryV5: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v5.json",
    sha256: "9bbf41335e13dff8f97be3bbd05f21284c99e62c31d5fcb63f7b5f0ab324af91",
  }),
  allocationInventoryV5: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v5.json",
    sha256: "e1c01fa8ef727c23d128d07bbe5cf67f7c04c6539610817ba39b6e0b555fb3b4",
  }),
});

const DEFAULT_CONSUMER = Object.freeze({
  path: "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
  sha256: "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
  requiredRegistry: "lexical_senses_de_v1.json",
  forbiddenRegistry: "lexical_senses_de_v5.json",
  v5Selected: false,
});

const EXPECTED_REVIEWS = Object.freeze({
  spec: Object.freeze({
    taskIdentity: "/root/de_ich_heisse_postrepair_spec_review",
    verdict: "PASS",
    findings: Object.freeze({ P0: 0, P1: 0, P2: 0 }),
    scope: "EXACT_REVIEWED_HASH_SET_LEXICAL_DEPENDENCY_ADMISSION_ONLY",
    provenance: "COORDINATOR_ORCHESTRATION_ONLY",
    rawOutputSidecar: "unavailable",
    outputSha256: "unavailable",
  }),
  adversarial: Object.freeze({
    taskIdentity: "/root/de_ich_heisse_adversarial_review",
    verdict: "PASS",
    findings: Object.freeze({ P0: 0, P1: 0, P2: 0 }),
    scope: "EXACT_REVIEWED_HASH_SET_LEXICAL_DEPENDENCY_ADMISSION_ONLY",
    provenance: "COORDINATOR_ORCHESTRATION_ONLY",
    rawOutputSidecar: "unavailable",
    outputSha256: "unavailable",
  }),
});

export type GermanTask6cL01IchHeisseFinalReviewArtifactNameDeV1 =
  keyof typeof REVIEWED_ARTIFACTS;

export type GermanTask6cL01IchHeisseFinalReviewClosureOptionsDeV1 = Readonly<{
  closurePathForTest?: string;
  reviewedPathOverridesForTest?: Readonly<
    Partial<Record<GermanTask6cL01IchHeisseFinalReviewArtifactNameDeV1, string>>
  >;
  defaultConsumerPathForTest?: string;
}>;

export type GermanTask6cL01IchHeisseFinalReviewClosureResultDeV1 = Readonly<{
  status: "CLOSED_FOR_EXACT_HASH_SET";
  lexicalDependencyAdmissionClosed: true;
  resolvedPlanIds: 9;
  unresolvedPlanIds: 279;
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
  } catch (error) {
    if (error instanceof Error && error.message === code) throw error;
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
  roots: readonly string[];
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
    roots,
    fileCount: files.length,
    sha256: digest.digest("hex"),
  });
}

export function loadGermanTask6cL01IchHeisseFinalReviewClosureDeV1(
  options: GermanTask6cL01IchHeisseFinalReviewClosureOptionsDeV1 = {},
): GermanTask6cL01IchHeisseFinalReviewClosureResultDeV1 {
  if (
    Object.keys(options).some(
      (key) =>
        ![
          "closurePathForTest",
          "reviewedPathOverridesForTest",
          "defaultConsumerPathForTest",
        ].includes(key),
    )
  ) {
    fail("ich_heisse_final_closure_options");
  }
  const overrides = options.reviewedPathOverridesForTest ?? {};
  if (Object.keys(overrides).some((name) => !(name in REVIEWED_ARTIFACTS)))
    fail("ich_heisse_final_closure_options");

  const closure = readJson(
    options.closurePathForTest ?? path.join(ROOT, CLOSURE_PATH),
    "ich_heisse_final_closure_json",
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
      "defaultConsumer",
    ],
    "ich_heisse_final_closure_schema",
  );
  if (
    closure.schemaVersion !==
      "learning-v2-de-task6c-l01-ich-heisse-final-review-closure.v1" ||
    closure.language !== "de" ||
    closure.closureKind !== "APPEND_ONLY_EXACT_HASH_REVIEW_SUPERSESSION" ||
    closure.status !== "CLOSED_FOR_EXACT_HASH_SET"
  ) {
    fail("ich_heisse_final_closure_schema");
  }
  exact(
    closure.scope,
    {
      admission: "EXACT_ICH_HEISSE_LEXICAL_DEPENDENCY_ONLY",
      lexicalDependencyAdmissionClosed: true,
      resolvedPlanIds: 9,
      unresolvedPlanIds: 279,
      packetIds: 1792,
      materializedPackets: 0,
      globalTask6CompletionEstablished: false,
    },
    "ich_heisse_final_closure_scope",
  );

  record(closure.reviewedArtifacts, "ich_heisse_final_closure_artifacts");
  exactKeys(
    closure.reviewedArtifacts,
    Object.keys(REVIEWED_ARTIFACTS),
    "ich_heisse_final_closure_artifacts",
  );
  for (const [name, expected] of Object.entries(REVIEWED_ARTIFACTS) as [
    GermanTask6cL01IchHeisseFinalReviewArtifactNameDeV1,
    { readonly path: string; readonly sha256: string },
  ][]) {
    const code = `ich_heisse_final_closure_artifact_binding:${name}`;
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
      fail("ich_heisse_final_closure_supersession");
    }
  }

  record(closure.finalReviews, "ich_heisse_final_closure_reviews");
  exactKeys(
    closure.finalReviews,
    Object.keys(EXPECTED_REVIEWS),
    "ich_heisse_final_closure_reviews",
  );
  for (const [name, expected] of Object.entries(EXPECTED_REVIEWS)) {
    exact(
      closure.finalReviews[name],
      expected,
      `ich_heisse_final_closure_review:${name}`,
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
    "ich_heisse_final_closure_supersession",
  );
  exact(
    closure.authority,
    {
      task7Unlock: false,
      preauthoringAuthority: false,
      learnerFacing: false,
      releaseAuthorized: false,
      currentlyMaterializable: false,
      phraseAuthority: false,
      consumerCutover: "NONE",
      defaultConsumerChanged: false,
      ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
    },
    "ich_heisse_final_closure_authority",
  );
  exact(
    closure.typeScriptEvidence,
    {
      command:
        "node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false",
      exitCode: 2,
      diagnostics: 17,
      targetDiagnostics: 0,
      logPath: "C:\\Temp\\phraseman_ich_heisse_v5_tsc_p2_final_20261013.log",
    },
    "ich_heisse_final_closure_typescript",
  );
  exact(
    closure.englishSurface,
    {
      roots: [
        "modules/learning-v2/curriculum/en",
        "content/learning-v2-course/curriculum/en",
        "content/learning-v2-course/release/en",
        "modules/learning-v2/content/factory_native/generated_release/en",
      ],
      fileCount: 1570,
      sha256:
        "33c6dfd1201dfa9e2719eda7b4845a4591fdb2acd7b0cc059f89e1297e2b9f95",
    },
    "ich_heisse_final_closure_english",
  );
  exact(
    englishSurfaceDigest(),
    closure.englishSurface,
    "ich_heisse_final_closure_english",
  );
  exact(
    closure.defaultConsumer,
    DEFAULT_CONSUMER,
    "ich_heisse_final_closure_default_consumer",
  );
  const defaultConsumerBytes = fs.readFileSync(
    options.defaultConsumerPathForTest ??
      path.join(ROOT, DEFAULT_CONSUMER.path),
  );
  if (sha256(defaultConsumerBytes) !== DEFAULT_CONSUMER.sha256)
    fail("ich_heisse_final_closure_default_consumer");

  return Object.freeze({
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
}
