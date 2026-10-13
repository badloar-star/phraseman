import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const CLOSURE_PATH =
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_final_review_closure_v1/closure.json";

const REVIEWED_ARTIFACTS = Object.freeze({
  admissionModule: Object.freeze({
    path: "modules/learning-v2/curriculum/de/task6c_l01_briefkasten_positive_admission_de_v1.ts",
    sha256: "95fba62921f1fd4da7fccd218fc6c4b6b1f257521118d32e80e4306220d7e7df",
  }),
  admissionGate: Object.freeze({
    path: "tests/learning_v2_de_task6c_l01_briefkasten_positive_admission_gate.ts",
    sha256: "7cbcc62198f8db375a1ee95f26aa82e610b783da0bd3bfe20e1830bdf43f71b5",
  }),
  primaryReceipt: Object.freeze({
    path: "docs/v2/curriculum/de/TASK6C_L01_BRIEFKASTEN_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
    sha256: "817ed02b204baa7979179b06900e3dcfc46321b8c8c7348778de30b10ecf2ebc",
  }),
  lexicalEvidence: Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_positive_admission_v1/lexical_evidence.json",
    sha256: "bf298f3e6441b615772ff43efb6ec05252aa07fa772a2d15bb2f330ee523ef12",
  }),
  admissionManifest: Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_positive_admission_v1/manifest.json",
    sha256: "766022b62d091c6c023d310477969d9e09d7eacd62e6b89af2448fbfe878d8f1",
  }),
  lexicalRegistryV6: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v6.json",
    sha256: "3d45077cba6f20e826ce3fa04732a91fec15d571ac9a0cb54923c8ec84c66e55",
  }),
  task6RegistryV6: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json",
    sha256: "63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc",
  }),
  allocationInventoryV6: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json",
    sha256: "e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677",
  }),
});

const DEFAULT_CONSUMER = Object.freeze({
  path: "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
  sha256: "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
  requiredRegistry: "lexical_senses_de_v1.json",
  forbiddenRegistry: "lexical_senses_de_v6.json",
  v6Selected: false,
});

const EXPECTED_REVIEWS = Object.freeze({
  spec: Object.freeze({
    taskIdentity: "/root/de_briefkasten_spec_review",
    verdict: "PASS",
    findings: Object.freeze({ P0: 0, P1: 0, P2: 0 }),
    scope: "EXACT_REVIEWED_HASH_SET_LEXICAL_DEPENDENCY_ADMISSION_ONLY",
    provenance: "COORDINATOR_ORCHESTRATION_ONLY",
    rawOutputSidecar: "unavailable",
    outputSha256: "unavailable",
  }),
  adversarial: Object.freeze({
    taskIdentity: "/root/de_briefkasten_adversarial_review",
    verdict: "PASS",
    findings: Object.freeze({ P0: 0, P1: 0, P2: 0 }),
    scope: "EXACT_REVIEWED_HASH_SET_LEXICAL_DEPENDENCY_ADMISSION_ONLY",
    provenance: "COORDINATOR_ORCHESTRATION_ONLY",
    rawOutputSidecar: "unavailable",
    outputSha256: "unavailable",
  }),
});

export type GermanTask6cL01BriefkastenFinalReviewArtifactNameDeV1 =
  keyof typeof REVIEWED_ARTIFACTS;

export type GermanTask6cL01BriefkastenFinalReviewClosureOptionsDeV1 = Readonly<{
  closurePathForTest?: string;
  reviewedPathOverridesForTest?: Readonly<
    Partial<
      Record<GermanTask6cL01BriefkastenFinalReviewArtifactNameDeV1, string>
    >
  >;
  defaultConsumerPathForTest?: string;
}>;

export type GermanTask6cL01BriefkastenFinalReviewClosureResultDeV1 = Readonly<{
  status: "CLOSED_FOR_EXACT_HASH_SET";
  lexicalDependencyAdmissionClosed: true;
  resolvedPlanIds: 10;
  unresolvedPlanIds: 278;
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

export function loadGermanTask6cL01BriefkastenFinalReviewClosureDeV1(
  options: GermanTask6cL01BriefkastenFinalReviewClosureOptionsDeV1 = {},
): GermanTask6cL01BriefkastenFinalReviewClosureResultDeV1 {
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
    fail("briefkasten_final_closure_options");
  }
  const overrides = options.reviewedPathOverridesForTest ?? {};
  if (Object.keys(overrides).some((name) => !(name in REVIEWED_ARTIFACTS)))
    fail("briefkasten_final_closure_options");

  const closure = readJson(
    options.closurePathForTest ?? path.join(ROOT, CLOSURE_PATH),
    "briefkasten_final_closure_json",
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
    "briefkasten_final_closure_schema",
  );
  if (
    closure.schemaVersion !==
      "learning-v2-de-task6c-l01-briefkasten-final-review-closure.v1" ||
    closure.language !== "de" ||
    closure.closureKind !== "APPEND_ONLY_EXACT_HASH_REVIEW_SUPERSESSION" ||
    closure.status !== "CLOSED_FOR_EXACT_HASH_SET"
  ) {
    fail("briefkasten_final_closure_schema");
  }
  exact(
    closure.scope,
    {
      admission: "EXACT_BRIEFKASTEN_LEXICAL_DEPENDENCY_ONLY",
      lexicalDependencyAdmissionClosed: true,
      resolvedPlanIds: 10,
      unresolvedPlanIds: 278,
      packetIds: 1792,
      materializedPackets: 0,
      globalTask6CompletionEstablished: false,
    },
    "briefkasten_final_closure_scope",
  );

  record(closure.reviewedArtifacts, "briefkasten_final_closure_artifacts");
  exactKeys(
    closure.reviewedArtifacts,
    Object.keys(REVIEWED_ARTIFACTS),
    "briefkasten_final_closure_artifacts",
  );
  for (const [name, expected] of Object.entries(REVIEWED_ARTIFACTS) as [
    GermanTask6cL01BriefkastenFinalReviewArtifactNameDeV1,
    { readonly path: string; readonly sha256: string },
  ][]) {
    const code = `briefkasten_final_closure_artifact_binding:${name}`;
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
      fail("briefkasten_final_closure_supersession");
    }
  }

  record(closure.finalReviews, "briefkasten_final_closure_reviews");
  exactKeys(
    closure.finalReviews,
    Object.keys(EXPECTED_REVIEWS),
    "briefkasten_final_closure_reviews",
  );
  for (const [name, expected] of Object.entries(EXPECTED_REVIEWS)) {
    exact(
      closure.finalReviews[name],
      expected,
      `briefkasten_final_closure_review:${name}`,
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
    "briefkasten_final_closure_supersession",
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
    "briefkasten_final_closure_authority",
  );
  exact(
    closure.typeScriptEvidence,
    {
      command:
        "node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false",
      exitCode: 2,
      diagnostics: 16,
      targetDiagnostics: 0,
      logPath: "C:\\Temp\\phraseman_briefkasten_v6_tsc_20261013.log",
    },
    "briefkasten_final_closure_typescript",
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
    "briefkasten_final_closure_english",
  );
  exact(
    englishSurfaceDigest(),
    closure.englishSurface,
    "briefkasten_final_closure_english",
  );
  exact(
    closure.defaultConsumer,
    DEFAULT_CONSUMER,
    "briefkasten_final_closure_default_consumer",
  );
  const defaultConsumerBytes = fs.readFileSync(
    options.defaultConsumerPathForTest ??
      path.join(ROOT, DEFAULT_CONSUMER.path),
  );
  if (sha256(defaultConsumerBytes) !== DEFAULT_CONSUMER.sha256)
    fail("briefkasten_final_closure_default_consumer");

  return Object.freeze({
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
}
