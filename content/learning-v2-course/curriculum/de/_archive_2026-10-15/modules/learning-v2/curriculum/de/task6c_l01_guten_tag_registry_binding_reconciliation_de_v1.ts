import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, any>;

export type GermanTask6cL01GutenTagRegistryBindingReconciliationOptionsDeV1 =
  Readonly<
    Partial<
      Record<
        | "task6V8PathForTest"
        | "inventoryV8PathForTest"
        | "manifestPathForTest"
        | "receiptPathForTest",
        string
      >
    >
  >;

export type GermanTask6cL01GutenTagRegistryBindingReconciliationResultDeV1 =
  Readonly<{
    status: "PASS";
    decision: "GUTEN_TAG_REGISTRY_BINDING_RECONCILIATION";
    sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1";
    canonicalSenseId: "de_lex_l01_c04_guten_tag_v1";
    rowsPromoted: 5;
    resolvedPlanIds: 11;
    unresolvedPlanIds: 277;
    packetIds: 1792;
    materializedPackets: 0;
    task7Unlock: false;
    preauthoringAuthority: false;
    learnerFacing: false;
    releaseAuthorized: false;
    consumerCutover: "NONE";
  }>;

const ROOT = path.resolve(__dirname, "../../../..");
const PATHS = Object.freeze({
  task6V6:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json",
  inventoryV6:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json",
  v6Closure:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_final_review_closure_v1/closure.json",
  gutenTagLexicalEvidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/lexical_evidence.json",
  lexicalRegistryV7:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v7.json",
  task6V7:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v7.json",
  inventoryV7:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v7.json",
  task6V8:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v8.json",
  inventoryV8:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v8.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_registry_binding_reconciliation_v1/manifest.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_REGISTRY_BINDING_RECONCILIATION_RECEIPT_2026-10-13.md",
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_registry_binding_reconciliation_de_v1.ts",
  gate: "tests/learning_v2_de_task6c_l01_guten_tag_registry_binding_reconciliation_gate.ts",
  defaultConsumer:
    "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
} as const);

const HASHES = Object.freeze({
  [PATHS.task6V6]:
    "63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc",
  [PATHS.inventoryV6]:
    "e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677",
  [PATHS.v6Closure]:
    "7d12e8f92cc4f190a53cbd2a04463fbd04dde42d39063b704059400e8af0577c",
  [PATHS.gutenTagLexicalEvidence]:
    "132f65574f9e858a8c7ec22fc6269732a269c4e122fa6a2304caab8bcfd21ddc",
  [PATHS.lexicalRegistryV7]:
    "a52b925ee5e6d3adbd1de87749e7722424f6fc9c1fb5a50e3f306d2ad2fce5b1",
  [PATHS.task6V7]:
    "29e2c6b7e379acd2fa69431e28d25eb6c1e97466555bc7751eafe05693b33195",
  [PATHS.inventoryV7]:
    "d409e6cc0a909fdcf486c69308f8d2de84b2a6db688d7a90d31f933e14c0f69b",
  [PATHS.defaultConsumer]:
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
});

const EXPECTED_ENGLISH_SURFACE = Object.freeze({
  roots: [
    "modules/learning-v2/curriculum/en",
    "content/learning-v2-course/curriculum/en",
    "content/learning-v2-course/release/en",
    "modules/learning-v2/content/factory_native/generated_release/en",
  ],
  fileCount: 1570,
  sha256: "33c6dfd1201dfa9e2719eda7b4845a4591fdb2acd7b0cc059f89e1297e2b9f95",
});

const CLOSED_AUTHORITY = Object.freeze({
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  currentlyMaterializable: false,
  materializedPackets: 0,
  phraseAuthority: false,
  consumerCutover: "NONE",
  defaultConsumerChanged: false,
  ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
});

function fail(code: string): never {
  throw new Error(code);
}

function sha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function exact(value: unknown, expected: unknown, code: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(code);
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
}

function read(relative: string, override?: string): Buffer {
  try {
    return fs.readFileSync(override ?? path.join(ROOT, relative));
  } catch {
    return fail(`guten_tag_v8_read:${relative}`);
  }
}

function readJson(relative: string, override?: string): JsonRecord {
  try {
    const value: unknown = JSON.parse(
      read(relative, override).toString("utf8"),
    );
    record(value, `guten_tag_v8_json:${relative}`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("guten_tag_v8_"))
      throw error;
    return fail(`guten_tag_v8_json:${relative}`);
  }
}

function pinned(relative: keyof typeof HASHES): Buffer {
  const bytes = read(relative);
  if (sha256(bytes) !== HASHES[relative])
    fail("guten_tag_v8_frozen_input_drift");
  return bytes;
}

function pinnedJson(relative: keyof typeof HASHES): JsonRecord {
  try {
    const value: unknown = JSON.parse(pinned(relative).toString("utf8"));
    record(value, "guten_tag_v8_frozen_json");
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("guten_tag_v8_"))
      throw error;
    return fail("guten_tag_v8_frozen_json");
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function englishSurfaceDigest(): JsonRecord {
  const files = EXPECTED_ENGLISH_SURFACE.roots
    .flatMap((root) => walk(path.join(ROOT, root)))
    .map((file) => ({
      file,
      relative: path.relative(ROOT, file).replaceAll("\\", "/"),
    }))
    .sort((left, right) => left.relative.localeCompare(right.relative));
  const digest = crypto.createHash("sha256");
  for (const entry of files) {
    digest.update(entry.relative);
    digest.update("\0");
    digest.update(sha256(fs.readFileSync(entry.file)));
    digest.update("\0");
  }
  return {
    roots: [...EXPECTED_ENGLISH_SURFACE.roots],
    fileCount: files.length,
    sha256: digest.digest("hex"),
  };
}

const LIVE_ENGLISH_SURFACE = englishSurfaceDigest();

const binding = (
  relative: keyof typeof HASHES,
  schemaVersion?: string,
): JsonRecord => ({
  path: relative,
  ...(schemaVersion === undefined ? {} : { schemaVersion }),
  byteSha256: HASHES[relative],
});

function validateTask6V8(value: JsonRecord): void {
  const task6V7 = pinnedJson(PATHS.task6V7);
  const expected = clone(task6V7);
  expected.schemaVersion = "learning-v2-german-task6-canonical-registry.v8";
  expected.authority.status = "TASK6_V8_CANONICAL_PARTIAL";
  expected.authority.phaseBMaterialization =
    "ADMITTED_FOR_TASK6_V8_REGISTRY_ONLY";
  expected.sourceBindings.task6V6 = binding(
    PATHS.task6V6,
    "learning-v2-german-task6-canonical-registry.v6",
  );
  expected.sourceBindings.inventoryV6 = binding(
    PATHS.inventoryV6,
    "learning-v2-german-task7-allocation-inventory.v6",
  );
  expected.sourceBindings.v6Closure = binding(PATHS.v6Closure);
  expected.sourceBindings.gutenTagLexicalEvidence = binding(
    PATHS.gutenTagLexicalEvidence,
  );
  expected.sourceBindings.lexicalRegistryV7 = binding(PATHS.lexicalRegistryV7);
  expected.materialization.l01GutenTagLexicalMapping = {
    sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
    canonicalLexicalSenseId: "de_lex_l01_c04_guten_tag_v1",
    evidenceId: "DE-LEX-ITEM-L01-C04-GUTEN-TAG-D11-GREETING-001",
    materializationRole:
      "TASK6_V8_REGISTRY_BINDING_RECONCILIATION_EXACT_GUTEN_TAG_LEXICAL_ONLY",
    phraseAuthority: false,
  };
  expected.authorityContext.schemaVersion =
    "learning-v2-german-task6-registry-authority.v8";

  if (value.authority?.rowsPromoted !== 5) fail("guten_tag_v8_task6_authority");
  exact(value.authority, expected.authority, "guten_tag_v8_task6_authority");
  exact(
    value.sourceBindings,
    expected.sourceBindings,
    "guten_tag_v8_task6_bindings",
  );
  exact(
    value.materialization,
    expected.materialization,
    "guten_tag_v8_task6_materialization",
  );
  exact(
    value.authorityContext,
    expected.authorityContext,
    "guten_tag_v8_task6_authority_mapping",
  );
  exact(value.registry, expected.registry, "guten_tag_v8_task6_registry");
  exact(value, expected, "guten_tag_v8_task6_body");
}

function validateInventoryV8(value: JsonRecord, task6V8Sha256: string): void {
  const inventoryV7 = pinnedJson(PATHS.inventoryV7);
  const expected = clone(inventoryV7);
  expected.schemaVersion = "learning-v2-german-task7-allocation-inventory.v8";
  expected.status = "GUTEN_TAG_LEXICAL_SENSE_CANONICAL_ADMITTED_PARTIAL";
  expected.sourceBindings.inventoryV6 = binding(
    PATHS.inventoryV6,
    "learning-v2-german-task7-allocation-inventory.v6",
  );
  expected.sourceBindings.v6Closure = binding(PATHS.v6Closure);
  expected.sourceBindings.gutenTagLexicalEvidence = binding(
    PATHS.gutenTagLexicalEvidence,
  );
  expected.sourceBindings.lexicalRegistryV7 = binding(PATHS.lexicalRegistryV7);
  expected.sourceBindings.task6V8 = {
    path: PATHS.task6V8,
    schemaVersion: "learning-v2-german-task6-canonical-registry.v8",
    byteSha256: task6V8Sha256,
  };

  if (value.status !== expected.status) fail("guten_tag_v8_inventory_status");
  exact(
    value.sourceBindings,
    expected.sourceBindings,
    "guten_tag_v8_inventory_bindings",
  );
  exact(
    value.authority,
    expected.authority,
    "guten_tag_v8_inventory_authority",
  );
  const withoutBindings = clone(value);
  const expectedWithoutBindings = clone(expected);
  delete withoutBindings.sourceBindings;
  delete expectedWithoutBindings.sourceBindings;
  exact(
    withoutBindings,
    expectedWithoutBindings,
    "guten_tag_v8_inventory_body",
  );
  exact(value, expected, "guten_tag_v8_inventory_body");
}

function validateManifest(
  value: JsonRecord,
  task6V8Sha256: string,
  inventoryV8Sha256: string,
): void {
  if (
    value.schemaVersion !==
      "learning-v2-de-task6c-l01-guten-tag-registry-binding-reconciliation.v1" ||
    value.language !== "de" ||
    value.taskId !== "TASK6C_L01_GUTEN_TAG_REGISTRY_BINDING_RECONCILIATION" ||
    value.status !== "PENDING_INDEPENDENT_REVIEW" ||
    value.decision !== "SEMANTIC_CANONICAL_REPAIR_NEW_V8"
  )
    fail("guten_tag_v8_manifest");
  exact(
    Object.keys(value).sort(),
    [
      "schemaVersion",
      "language",
      "taskId",
      "status",
      "decision",
      "holdAdjudication",
      "frozenV7",
      "sourceBindings",
      "generatedArtifacts",
      "redGreen",
      "authority",
      "englishSurface",
    ].sort(),
    "guten_tag_v8_manifest",
  );
  exact(
    value.holdAdjudication,
    {
      rejectedArtifact: "TASK6_V7_GUTEN_TAG_POSITIVE_ADMISSION",
      verdict: "HOLD_P1_CONNECTED_CONTRACT_GAPS",
      findings: [
        "TASK6_V7_MISSING_GUTEN_TAG_LEXICAL_BINDINGS",
        "TASK6_V7_MISSING_GUTEN_TAG_MATERIALIZATION_MAPPING",
        "INVENTORY_V7_STALE_BRIEFKASTEN_STATUS",
        "INVENTORY_V7_MISSING_GUTEN_TAG_CONNECTED_BINDINGS",
      ],
      disposition: "V7_FROZEN_REJECTED_NOT_AUTHORITY",
      semanticRepairRequired: true,
      proofOnlyClosurePermitted: false,
    },
    "guten_tag_v8_manifest",
  );
  exact(
    value.frozenV7,
    {
      admissionModule: {
        path: "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_positive_admission_de_v1.ts",
        sha256:
          "5a8498096f3e501d0e5c98ae775aa5ee333db3ffbeebe55b7401ed197650c9d8",
      },
      admissionGate: {
        path: "tests/learning_v2_de_task6c_l01_guten_tag_positive_admission_gate.ts",
        sha256:
          "5f1facd6506ed3e198cf72ed35f4f9cf2fbe860e1b04c01afec46c653d6cb038",
      },
      admissionReceipt: {
        path: "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
        sha256:
          "7a018a3bad0755a0b918def7a240e5f9955743b27d709eff662ecc0d5677d855",
      },
      task6V7: { path: PATHS.task6V7, sha256: HASHES[PATHS.task6V7] },
      inventoryV7: {
        path: PATHS.inventoryV7,
        sha256: HASHES[PATHS.inventoryV7],
      },
      lexicalRegistryV7: {
        path: PATHS.lexicalRegistryV7,
        sha256: HASHES[PATHS.lexicalRegistryV7],
      },
      gutenTagLexicalEvidence: {
        path: PATHS.gutenTagLexicalEvidence,
        sha256: HASHES[PATHS.gutenTagLexicalEvidence],
      },
      admissionManifest: {
        path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/manifest.json",
        sha256:
          "23c83a69e545957a8a5314894d27707a2a63991c68dbaeebd50d8592dcb8a0be",
      },
    },
    "guten_tag_v8_manifest",
  );
  exact(
    value.sourceBindings,
    {
      task6V6: { path: PATHS.task6V6, sha256: HASHES[PATHS.task6V6] },
      inventoryV6: {
        path: PATHS.inventoryV6,
        sha256: HASHES[PATHS.inventoryV6],
      },
      v6Closure: { path: PATHS.v6Closure, sha256: HASHES[PATHS.v6Closure] },
      gutenTagLexicalEvidence: {
        path: PATHS.gutenTagLexicalEvidence,
        sha256: HASHES[PATHS.gutenTagLexicalEvidence],
      },
      lexicalRegistryV7: {
        path: PATHS.lexicalRegistryV7,
        sha256: HASHES[PATHS.lexicalRegistryV7],
      },
    },
    "guten_tag_v8_manifest",
  );
  exact(
    value.generatedArtifacts,
    {
      task6V8: { path: PATHS.task6V8, sha256: task6V8Sha256 },
      inventoryV8: { path: PATHS.inventoryV8, sha256: inventoryV8Sha256 },
    },
    "guten_tag_v8_manifest",
  );
  if (
    !["PENDING_WRITER_RUN", "PASS_EXIT_0_WRITER_VERIFICATION_ONLY"].includes(
      value.redGreen?.green?.result,
    ) ||
    value.redGreen?.red?.exitCode !== 1 ||
    value.redGreen?.red?.reason !== `guten_tag_v8_missing:${PATHS.module}`
  )
    fail("guten_tag_v8_manifest");
  exact(value.authority, CLOSED_AUTHORITY, "guten_tag_v8_manifest");
  exact(
    value.englishSurface,
    EXPECTED_ENGLISH_SURFACE,
    "guten_tag_v8_manifest",
  );
  exact(LIVE_ENGLISH_SURFACE, EXPECTED_ENGLISH_SURFACE, "guten_tag_v8_english");
}

function extractReceiptEvidence(bytes: Buffer): JsonRecord {
  const text = bytes.toString("utf8");
  if (
    !text.includes("Status: `PENDING_INDEPENDENT_REVIEW`") ||
    text.includes("Status: `PASS`") ||
    !text.includes("V7 disposition: `FROZEN_REJECTED_NOT_AUTHORITY`")
  )
    fail("guten_tag_v8_receipt");
  const match = text.match(
    /<!-- guten-tag-v8-reconciliation-evidence-v1\n([\s\S]*?)\nguten-tag-v8-reconciliation-evidence-v1 -->/u,
  );
  if (match === null) fail("guten_tag_v8_receipt");
  try {
    const value: unknown = JSON.parse(match[1]);
    record(value, "guten_tag_v8_receipt");
    return value;
  } catch (error) {
    if (error instanceof Error && error.message === "guten_tag_v8_receipt")
      throw error;
    return fail("guten_tag_v8_receipt");
  }
}

function validateReceipt(
  value: JsonRecord,
  task6V8Sha256: string,
  inventoryV8Sha256: string,
  manifestSha256: string,
): void {
  if (
    value.schemaVersion !== "guten_tag_v8_reconciliation_evidence_v1" ||
    value.status !== "PENDING_INDEPENDENT_REVIEW" ||
    value.independentReview !== "PENDING" ||
    value.closure !== "NOT_CREATED" ||
    value.green?.command !==
      "node --import tsx tests/learning_v2_de_task6c_l01_guten_tag_registry_binding_reconciliation_gate.ts" ||
    value.green?.exitCode !== 0 ||
    !["PENDING_WRITER_RUN", "PASS_EXIT_0_WRITER_VERIFICATION_ONLY"].includes(
      value.green?.result,
    )
  )
    fail("guten_tag_v8_receipt");
  exact(value.authority, CLOSED_AUTHORITY, "guten_tag_v8_receipt");
  exact(
    value.artifacts,
    {
      task6V8: { path: PATHS.task6V8, sha256: task6V8Sha256 },
      inventoryV8: { path: PATHS.inventoryV8, sha256: inventoryV8Sha256 },
      manifest: { path: PATHS.manifest, sha256: manifestSha256 },
      module: { path: PATHS.module, sha256: sha256(read(PATHS.module)) },
      gate: { path: PATHS.gate, sha256: sha256(read(PATHS.gate)) },
    },
    "guten_tag_v8_receipt",
  );
  exact(value.englishSurface, EXPECTED_ENGLISH_SURFACE, "guten_tag_v8_receipt");
  exact(
    value.focusedTypeScript,
    {
      command:
        "node node_modules/typescript/bin/tsc --noEmit --pretty false --skipLibCheck --esModuleInterop --module commonjs --target es2022 --moduleResolution node modules/learning-v2/curriculum/de/task6c_l01_guten_tag_registry_binding_reconciliation_de_v1.ts tests/learning_v2_de_task6c_l01_guten_tag_registry_binding_reconciliation_gate.ts",
      exitCode: 0,
      diagnostics: 0,
    },
    "guten_tag_v8_receipt",
  );
  const repositoryTypeScript = value.repositoryTypeScript;
  record(repositoryTypeScript, "guten_tag_v8_receipt");
  if (
    !["OBSERVED_NONZERO_UNRELATED_DIAGNOSTICS", "PASS_EXIT_0"].includes(
      repositoryTypeScript.status,
    ) ||
    repositoryTypeScript.repositoryGreen !==
      (repositoryTypeScript.status === "PASS_EXIT_0")
  )
    fail("guten_tag_v8_receipt");
  if (
    repositoryTypeScript.command !== "npx tsc --noEmit --pretty false" ||
    repositoryTypeScript.nodeOptions !== "--max-old-space-size=8192" ||
    repositoryTypeScript.semaphore !==
      ".claude/semaphore/slot.sh acquire/release" ||
    repositoryTypeScript.semaphoreAcquired !== true ||
    !Number.isInteger(repositoryTypeScript.exitCode) ||
    !Number.isInteger(repositoryTypeScript.diagnostics) ||
    repositoryTypeScript.transactionDiagnostics !== 0 ||
    typeof repositoryTypeScript.logPath !== "string" ||
    !/^[0-9a-f]{64}$/u.test(repositoryTypeScript.logSha256) ||
    !Number.isInteger(repositoryTypeScript.logBytes)
  )
    fail("guten_tag_v8_receipt");
  if (
    repositoryTypeScript.status === "PASS_EXIT_0" &&
    (repositoryTypeScript.exitCode !== 0 ||
      repositoryTypeScript.diagnostics !== 0)
  )
    fail("guten_tag_v8_receipt");
  if (
    repositoryTypeScript.status === "OBSERVED_NONZERO_UNRELATED_DIAGNOSTICS" &&
    (repositoryTypeScript.exitCode === 0 ||
      repositoryTypeScript.diagnostics < 1 ||
      repositoryTypeScript.repositoryGreen !== false)
  )
    fail("guten_tag_v8_receipt");
}

export function inspectGermanTask6cL01GutenTagRegistryBindingReconciliationDeV1(
  options: GermanTask6cL01GutenTagRegistryBindingReconciliationOptionsDeV1 = {},
): GermanTask6cL01GutenTagRegistryBindingReconciliationResultDeV1 {
  const allowed = new Set([
    "task6V8PathForTest",
    "inventoryV8PathForTest",
    "manifestPathForTest",
    "receiptPathForTest",
  ]);
  if (Object.keys(options).some((key) => !allowed.has(key)))
    fail("guten_tag_v8_options");

  for (const relative of Object.keys(HASHES) as (keyof typeof HASHES)[])
    pinned(relative);

  const task6V8Bytes = read(PATHS.task6V8, options.task6V8PathForTest);
  const task6V8 = readJson(PATHS.task6V8, options.task6V8PathForTest);
  validateTask6V8(task6V8);
  const canonicalTask6V8Sha256 = sha256(read(PATHS.task6V8));
  if (
    options.task6V8PathForTest === undefined &&
    sha256(task6V8Bytes) !== canonicalTask6V8Sha256
  )
    fail("guten_tag_v8_task6_body");

  const inventoryV8 = readJson(
    PATHS.inventoryV8,
    options.inventoryV8PathForTest,
  );
  validateInventoryV8(inventoryV8, canonicalTask6V8Sha256);
  const canonicalInventoryV8Sha256 = sha256(read(PATHS.inventoryV8));

  const manifestBytes = read(PATHS.manifest, options.manifestPathForTest);
  validateManifest(
    readJson(PATHS.manifest, options.manifestPathForTest),
    canonicalTask6V8Sha256,
    canonicalInventoryV8Sha256,
  );
  validateReceipt(
    extractReceiptEvidence(read(PATHS.receipt, options.receiptPathForTest)),
    canonicalTask6V8Sha256,
    canonicalInventoryV8Sha256,
    sha256(manifestBytes),
  );

  return Object.freeze({
    status: "PASS",
    decision: "GUTEN_TAG_REGISTRY_BINDING_RECONCILIATION",
    sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
    canonicalSenseId: "de_lex_l01_c04_guten_tag_v1",
    rowsPromoted: 5,
    resolvedPlanIds: 11,
    unresolvedPlanIds: 277,
    packetIds: 1792,
    materializedPackets: 0,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
  });
}
