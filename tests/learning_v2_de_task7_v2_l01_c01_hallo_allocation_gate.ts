import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  inspectGermanTask7V2L01C01HalloSourceAllocationDeV1,
  validateGermanTask7V2L01C01HalloTask5PlanForAuditDeV1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1";

type JsonRecord = Record<string, any>;

const ROOT = process.cwd();
const EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1",
);
const TASK5 = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const INVENTORY = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
);
const GOETHE_DIRECT_URL =
  "https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf";
const PACKET = path.join(
  ROOT,
  "content/learning-v2-course/curriculum/de/packets/l01/s01.json",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C01_HALLO_SOURCE_ALLOCATION_RECEIPT_2026-10-12.md",
);

const sha = (value: Buffer | string): string =>
  crypto.createHash("sha256").update(value).digest("hex");
const readJson = (file: string): JsonRecord =>
  JSON.parse(fs.readFileSync(file, "utf8")) as JsonRecord;
const writeJson = (file: string, value: unknown): void =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");

function copyEvidence(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-task7-hallo-"));
  fs.cpSync(EVIDENCE, root, { recursive: true });
  return root;
}

function hostileEvidence(
  mutate: (root: string) => void,
  expected: RegExp,
): void {
  const evidenceRoot = copyEvidence();
  try {
    mutate(evidenceRoot);
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloSourceAllocationDeV1({
          evidenceRootForTest: evidenceRoot,
        }),
      expected,
    );
  } finally {
    fs.rmSync(evidenceRoot, { recursive: true, force: true });
  }
}

const allocation = inspectGermanTask7V2L01C01HalloSourceAllocationDeV1();
assert.deepEqual(allocation, {
  status: "HOLD",
  decision: "PHRASE_AUTHORITY_REQUIRED",
  sessionId: "de_l01_s01",
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v1",
  checkpointPacketId: "de_l01_c01_s08",
  phraseContextId: "de_pf_l01_c01_hallo_nachbarin_v1",
  contactPacketIds: ["de_l01_c01_s01", "de_l01_c01_s08"],
  excludedSourcePlanIds: ["de_lex_plan_l01_c01_nachbarin_v1"],
  sourceSupport: {
    task5PlanBodyBound: true,
    dwdsInterjection: true,
    dwdsGreetingSense: true,
    goetheOccurrence: true,
    neutralRegister: false,
  },
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
  inventory: {
    resolvedPlanIds: 6,
    unresolvedPlanIds: 282,
    materializedPackets: 0,
  },
});

const directManifest = readJson(path.join(EVIDENCE, "manifest.json"));
assert.equal(directManifest.sources.goetheA1.canonicalUrl, GOETHE_DIRECT_URL);
assert.equal(directManifest.sources.goetheA1.transport, "DIRECT_PUBLIC_HTTPS");
const directExtraction = readJson(path.join(EVIDENCE, "extraction_map.json"));
assert.equal(
  directExtraction.rawSources.goetheA1.transport,
  "DIRECT_PUBLIC_HTTPS",
);
const directGoetheMetadata = fs.readFileSync(
  path.join(EVIDENCE, "raw/goethe_a1_redemittel.http_metadata.txt"),
  "utf8",
);
assert.equal(
  directGoetheMetadata,
  `canonical-url: ${GOETHE_DIRECT_URL}\n` +
    `final-url: ${GOETHE_DIRECT_URL}\n` +
    "http-status: 200\n" +
    "content-type: application/pdf\n" +
    'etag: "0x8DCD349F391FF1F"\n' +
    "last-modified: Thu, 12 Sep 2024 16:42:55 GMT\n" +
    "transport: DIRECT_PUBLIC_HTTPS\n",
);

const task5Bytes = fs.readFileSync(TASK5);
assert.equal(
  sha(task5Bytes),
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
);
const task5 = JSON.parse(task5Bytes.toString("utf8")) as JsonRecord;
assert.deepEqual(validateGermanTask7V2L01C01HalloTask5PlanForAuditDeV1(task5), {
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v1",
  checkpointPacketId: "de_l01_c01_s08",
  planCanonicalBodySha256:
    "4616ba8b2c84d2f7880cca5a79d76bb8453503b9b2244004c72d455d78fae301",
});
const hostileTask5 = structuredClone(task5);
hostileTask5.lessons[0].chapters[0].checkpoint.plannedNewLexicalSenses[0].communicativeUse =
  "invented broader greeting claim";
assert.throws(
  () => validateGermanTask7V2L01C01HalloTask5PlanForAuditDeV1(hostileTask5),
  /task7_hallo_task5_canonical_body/u,
);
const driftedTask5Path = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "de-task7-task5-")),
  "task5.json",
);
fs.writeFileSync(
  driftedTask5Path,
  Buffer.concat([task5Bytes, Buffer.from(" ")]),
);
try {
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloSourceAllocationDeV1({
        task5PathForTest: driftedTask5Path,
      }),
    /task7_hallo_task5_byte_binding/u,
  );
} finally {
  fs.rmSync(path.dirname(driftedTask5Path), { recursive: true, force: true });
}

hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.allocations.push(structuredClone(value.allocations[0]));
  writeJson(file, value);
}, /task7_hallo_singleton/u);
hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.sources.dwds.target.canonicalUrl = "https://www.dwds.de/wb/Hallo";
  writeJson(file, value);
}, /task7_hallo_dwds_noun_rejected/u);
hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.sources.dwds.rejected.rejectionReason = "INVENTED_REASON";
  writeJson(file, value);
}, /task7_hallo_dwds_noun_rejected/u);
hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.sources.goetheA1.canonicalUrl = "https://example.invalid/invented.pdf";
  value.sources.goetheA1.rawSha256 = "0".repeat(64);
  value.sources.goetheA1.transport = "INVENTED_TRANSPORT";
  writeJson(file, value);
}, /task7_hallo_goethe_source_binding/u);
hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.sources.extractionMap.bytes = 1;
  writeJson(file, value);
}, /task7_hallo_extraction_map/u);
hostileEvidence((root) => {
  fs.appendFileSync(path.join(root, "raw/dwds_hallo_interjection.html"), "x");
}, /task7_hallo_raw_body/u);
hostileEvidence((root) => {
  const file = path.join(root, "extraction_map.json");
  const value = readJson(file);
  value.extractions.dwdsGreeting.sourceAnchor = "d-1-1-1";
  writeJson(file, value);
}, /task7_hallo_dwds_greeting_span/u);
hostileEvidence((root) => {
  const file = path.join(root, "extraction_map.json");
  const value = readJson(file);
  value.extractions.dwdsTargetIdentity.title = "invented title";
  writeJson(file, value);
}, /task7_hallo_dwds_target_span/u);
hostileEvidence((root) => {
  const file = path.join(root, "extraction_map.json");
  const value = readJson(file);
  value.extractions.dwdsRejectedIdentity.rejectionReason = "INVENTED_REASON";
  writeJson(file, value);
}, /task7_hallo_dwds_noun_rejected/u);
hostileEvidence((root) => {
  const file = path.join(root, "extraction_map.json");
  const value = readJson(file);
  value.extractions.dwdsGreeting.inventedAuthority = true;
  writeJson(file, value);
}, /task7_hallo_dwds_greeting_span/u);
hostileEvidence((root) => {
  const file = path.join(root, "extraction_map.json");
  const value = readJson(file);
  value.extractions.goetheOccurrence.text = "Hallo!";
  writeJson(file, value);
}, /task7_hallo_goethe_occurrence/u);
hostileEvidence((root) => {
  const file = path.join(root, "extraction_map.json");
  const value = readJson(file);
  value.extractions.goetheOccurrence.pdfPage = 4;
  writeJson(file, value);
}, /task7_hallo_goethe_locator/u);
hostileEvidence((root) => {
  const file = path.join(root, "extraction_map.json");
  const value = readJson(file);
  value.extractions.goetheOccurrence.heading = "BEGRÜSSEN";
  writeJson(file, value);
}, /task7_hallo_goethe_locator/u);
hostileEvidence((root) => {
  const file = path.join(root, "extraction_map.json");
  const value = readJson(file);
  value.extractions.goetheOccurrence.evidenceFunction = "INVENTED_AUTHORITY";
  writeJson(file, value);
}, /task7_hallo_goethe_occurrence/u);
hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.fieldSupport.unsupportedClaims.neutralRegister = "SUPPORTED";
  writeJson(file, value);
}, /task7_hallo_neutral_unsupported/u);
hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.allocations[0].canonicalSenseId = "de_lex_l01_c01_hallo_v1";
  writeJson(file, value);
}, /task7_hallo_canonical_sense_id_forbidden/u);
hostileEvidence((root) => {
  const file = path.join(root, "extraction_map.json");
  const value = readJson(file);
  value.extractions.dwdsGreeting.canonicalSenseId = "de_lex_l01_c01_hallo_v1";
  writeJson(file, value);
}, /task7_hallo_canonical_sense_id_forbidden/u);
hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.authority.decision = "SOURCE_ALLOCATED";
  writeJson(file, value);
}, /task7_hallo_phrase_authority_required/u);
hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.allocations[0].contacts[0].packetId = "de_l01_c01_s02";
  writeJson(file, value);
}, /task7_hallo_contacts/u);
hostileEvidence((root) => {
  const file = path.join(root, "manifest.json");
  const value = readJson(file);
  value.allocations[0].supportedFields = ["inventedField"];
  writeJson(file, value);
}, /task7_hallo_supported_fields/u);
for (const [field, hostile] of [
  ["canonicalAdmission", true],
  ["inventoryResolutionApplied", true],
  ["task7Unlock", true],
  ["preauthoringAuthority", true],
  ["learnerFacing", true],
  ["releaseAuthorized", true],
  ["consumerCutover", "V2_DEFAULT"],
] as const) {
  hostileEvidence((root) => {
    const file = path.join(root, "manifest.json");
    const value = readJson(file);
    value.authority[field] = hostile;
    writeJson(file, value);
  }, /task7_hallo_hold_boundary/u);
}

const inventory = readJson(INVENTORY);
assert.deepEqual(inventory.counts, {
  task5PlanIds: 288,
  resolvedPlanIds: 6,
  unresolvedPlanIds: 282,
  packetIds: 1792,
  materializedPackets: 0,
});
assert.equal(fs.existsSync(PACKET), false);
const hostileInventoryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "de-task7-inventory-"),
);
const hostileInventoryPath = path.join(hostileInventoryRoot, "inventory.json");
const hostileInventory = structuredClone(inventory);
hostileInventory.resolutions = hostileInventory.resolutions.map(
  (row: JsonRecord, index: number) => ({
    ...row,
    sourcePlanId: `fake_source_plan_${index}`,
  }),
);
writeJson(hostileInventoryPath, hostileInventory);
try {
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloSourceAllocationDeV1({
        inventoryPathForTest: hostileInventoryPath,
      }),
    /task7_hallo_inventory_binding/u,
  );
} finally {
  fs.rmSync(hostileInventoryRoot, { recursive: true, force: true });
}
const packetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "de-task7-packet-"));
const fakePacket = path.join(packetRoot, "s01.json");
fs.writeFileSync(fakePacket, "{}\n", "utf8");
try {
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloSourceAllocationDeV1({
        packetPathForTest: fakePacket,
      }),
    /task7_hallo_packet_materialization_forbidden/u,
  );
} finally {
  fs.rmSync(packetRoot, { recursive: true, force: true });
}

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}
function repoRelativePosixFromPlatformRelative(
  relativePath: string,
  platformSeparator: string,
): string {
  return path.posix.normalize(
    platformSeparator === "\\"
      ? relativePath.replaceAll("\\", "/")
      : relativePath,
  );
}
function surfaceDigest(files: string[]): { count: number; sha256: string } {
  const digest = crypto.createHash("sha256");
  for (const file of files.sort()) {
    digest.update(path.relative(ROOT, file).replaceAll("\\", "/"));
    digest.update("\0");
    digest.update(sha(fs.readFileSync(file)));
    digest.update("\0");
  }
  return { count: files.length, sha256: digest.digest("hex") };
}
const englishFiles = [
  "modules/learning-v2/curriculum/en",
  "content/learning-v2-course/curriculum/en",
  "content/learning-v2-course/release/en",
  "modules/learning-v2/content/factory_native/generated_release/en",
].flatMap((root) => walk(path.join(ROOT, root)));
assert.deepEqual(surfaceDigest(englishFiles), {
  count: 1570,
  sha256: "8f73cffb0d735b436aad2b7679dd242df0fb609962e43b27229bea2e30934db9",
});
const PREDECESSOR_PACKET_FILES = [
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/extraction_map.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/manifest.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/dwds_hallo_interjection.html",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/dwds_hallo_interjection.http_metadata.txt",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/dwds_Hallo_noun.html",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/dwds_Hallo_noun.http_metadata.txt",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/goethe_a1_redemittel.http_metadata.txt",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/goethe_a1_redemittel.pdf",
] as const;
const SUCCESSOR_PACKET_FILES = [
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_phrase_authority_hold_de_v1.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1/adjudication.json",
] as const;
const CORRECTION_CANDIDATE_FILES = [
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_de_v1.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_v1/candidate.json",
] as const;
const V3_MIGRATION_CANDIDATE_FILES = [
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/manifest.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/task5_v3_candidate.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/task6_v3_candidate.json",
] as const;
const GERMAN_V1_PACKET_FILE_LIST = [
  ...PREDECESSOR_PACKET_FILES,
  ...SUCCESSOR_PACKET_FILES,
  ...CORRECTION_CANDIDATE_FILES,
  ...V3_MIGRATION_CANDIDATE_FILES,
] as const;
const GERMAN_V1_PACKET_FILES = new Set<string>(GERMAN_V1_PACKET_FILE_LIST);
const literalBackslashCandidatePath = CORRECTION_CANDIDATE_FILES[1].replace(
  "/candidate.json",
  "\\candidate.json",
);
assert.equal(
  repoRelativePosixFromPlatformRelative(literalBackslashCandidatePath, "/"),
  literalBackslashCandidatePath,
  "task7_hallo_posix_literal_backslash_must_not_alias",
);
assert.equal(
  repoRelativePosixFromPlatformRelative(
    CORRECTION_CANDIDATE_FILES[1].replaceAll("/", "\\"),
    "\\",
  ),
  CORRECTION_CANDIDATE_FILES[1],
  "task7_hallo_windows_separators_must_normalize",
);
assert.equal(
  GERMAN_V1_PACKET_FILE_LIST.length,
  17,
  "task7_hallo_v1_exact_allowlist_list_size",
);
assert.equal(
  GERMAN_V1_PACKET_FILES.size,
  17,
  "task7_hallo_v1_exact_allowlist_no_duplicates",
);
for (const relativePath of GERMAN_V1_PACKET_FILES) {
  assert.equal(
    relativePath,
    relativePath.replaceAll("\\", "/"),
    "task7_hallo_v1_allowlist_posix",
  );
  assert.equal(
    relativePath,
    path.posix.normalize(relativePath),
    "task7_hallo_v1_allowlist_normalized",
  );
  assert.equal(
    path.posix.isAbsolute(relativePath),
    false,
    "task7_hallo_v1_allowlist_repo_relative",
  );
  assert.equal(
    relativePath.startsWith("./") || relativePath.startsWith("../"),
    false,
    "task7_hallo_v1_allowlist_no_dot_segments",
  );
  assert.equal(
    fs.existsSync(path.join(ROOT, relativePath)),
    true,
    `task7_hallo_v1_allowlist_missing:${relativePath}`,
  );
}

function isGermanV1Path(relativePath: string): boolean {
  return relativePath.toLowerCase().includes("_v1");
}

function protectedGermanV1Paths(
  relativePaths: readonly string[],
  excluded: ReadonlySet<string> = GERMAN_V1_PACKET_FILES,
): string[] {
  return relativePaths.filter(
    (relativePath) =>
      isGermanV1Path(relativePath) && !excluded.has(relativePath),
  );
}

function surfaceDigestByRelativePath(
  relativePaths: readonly string[],
  overrides: ReadonlyMap<string, Buffer> = new Map(),
): { count: number; sha256: string } {
  const digest = crypto.createHash("sha256");
  for (const relativePath of [...relativePaths].sort()) {
    digest.update(relativePath);
    digest.update("\0");
    digest.update(
      sha(
        overrides.get(relativePath) ??
          fs.readFileSync(path.join(ROOT, relativePath)),
      ),
    );
    digest.update("\0");
  }
  return { count: relativePaths.length, sha256: digest.digest("hex") };
}

const germanCurriculumPaths = walk(
  path.join(ROOT, "modules/learning-v2/curriculum/de"),
).map((file) =>
  repoRelativePosixFromPlatformRelative(path.relative(ROOT, file), path.sep),
);
const predecessorOnlyExclusions = new Set(PREDECESSOR_PACKET_FILES);
const afterPredecessorExclusion = protectedGermanV1Paths(
  germanCurriculumPaths,
  predecessorOnlyExclusions,
);
const predecessorAndSuccessorExclusions = new Set([
  ...PREDECESSOR_PACKET_FILES,
  ...SUCCESSOR_PACKET_FILES,
]);
const afterSuccessorExclusion = protectedGermanV1Paths(
  germanCurriculumPaths,
  predecessorAndSuccessorExclusions,
);
const predecessorSuccessorAndCorrectionExclusions = new Set([
  ...PREDECESSOR_PACKET_FILES,
  ...SUCCESSOR_PACKET_FILES,
  ...CORRECTION_CANDIDATE_FILES,
]);
const afterCorrectionExclusion = protectedGermanV1Paths(
  germanCurriculumPaths,
  predecessorSuccessorAndCorrectionExclusions,
);
const existingV1Paths = protectedGermanV1Paths(germanCurriculumPaths);
assert.equal(
  afterPredecessorExclusion.length,
  82,
  "task7_hallo_v1_after_predecessor_exclusion_count",
);
assert.deepEqual(
  afterPredecessorExclusion
    .filter((relativePath) => !afterSuccessorExclusion.includes(relativePath))
    .sort(),
  [...SUCCESSOR_PACKET_FILES].sort(),
  "task7_hallo_v1_exact_successor_exclusions",
);
assert.equal(afterSuccessorExclusion.length, 80);
assert.deepEqual(
  afterSuccessorExclusion
    .filter((relativePath) => !afterCorrectionExclusion.includes(relativePath))
    .sort(),
  [...CORRECTION_CANDIDATE_FILES].sort(),
  "task7_hallo_v1_exact_correction_candidate_exclusions",
);
assert.equal(afterCorrectionExclusion.length, 78);
assert.deepEqual(
  afterCorrectionExclusion
    .filter((relativePath) => !existingV1Paths.includes(relativePath))
    .sort(),
  [...V3_MIGRATION_CANDIDATE_FILES].sort(),
  "task7_hallo_v1_exact_v3_migration_candidate_exclusions",
);
assert.deepEqual(surfaceDigestByRelativePath(existingV1Paths), {
  count: 74,
  sha256: "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
});

const oldSentinel =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";
assert.equal(
  existingV1Paths.includes(oldSentinel),
  true,
  "task7_hallo_v1_sentinel",
);
const oldSentinelBytes = fs.readFileSync(path.join(ROOT, oldSentinel));
assert.notEqual(
  surfaceDigestByRelativePath(
    existingV1Paths,
    new Map([
      [oldSentinel, Buffer.concat([oldSentinelBytes, Buffer.from(" ")])],
    ]),
  ).sha256,
  "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
  "task7_hallo_v1_sentinel_mutation_must_drift",
);
assert.equal(
  surfaceDigestByRelativePath(
    existingV1Paths.filter((relativePath) => relativePath !== oldSentinel),
  ).count,
  73,
  "task7_hallo_v1_sentinel_delete_must_drift",
);
const renamedSentinel = oldSentinel.replace("_v1.json", "_renamed.json");
assert.equal(
  protectedGermanV1Paths([
    ...germanCurriculumPaths.filter(
      (relativePath) => relativePath !== oldSentinel,
    ),
    renamedSentinel,
  ]).length,
  73,
  "task7_hallo_v1_sentinel_rename_must_drift",
);

for (const missingV3Path of V3_MIGRATION_CANDIDATE_FILES) {
  const exclusionsMissingOneV3 = new Set(
    [...GERMAN_V1_PACKET_FILES].filter(
      (relativePath) => relativePath !== missingV3Path,
    ),
  );
  const missingOneV3 = protectedGermanV1Paths(
    germanCurriculumPaths,
    exclusionsMissingOneV3,
  );
  assert.equal(
    missingOneV3.length,
    75,
    `task7_hallo_v1_missing_v3_must_drift:${missingV3Path}`,
  );
  assert.equal(missingOneV3.includes(missingV3Path), true);
}

for (const hostileRelativePath of [
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1/extra.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1_lookalike/extra.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_v1/extra.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_v1_lookalike/extra.json",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_de_v1_lookalike.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/extra.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1_lookalike/manifest.json",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1_lookalike.ts",
  "modules/learning-v2/curriculum/de/prefix_task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1.ts",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1_suffix.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1_sibling.json",
  "modules/learning-v2/curriculum/de/future_unallowlisted_de_v1.ts",
  V3_MIGRATION_CANDIDATE_FILES[0].replaceAll("/", "\\"),
  `./${V3_MIGRATION_CANDIDATE_FILES[0]}`,
  `../phraseman/${V3_MIGRATION_CANDIDATE_FILES[0]}`,
  path.posix.resolve("/", V3_MIGRATION_CANDIDATE_FILES[0]),
  V3_MIGRATION_CANDIDATE_FILES[0].toUpperCase(),
]) {
  assert.equal(
    GERMAN_V1_PACKET_FILES.has(hostileRelativePath),
    false,
    "task7_hallo_v1_hostile_must_not_be_allowlisted",
  );
  const hostilePaths = protectedGermanV1Paths([
    ...germanCurriculumPaths,
    hostileRelativePath,
  ]);
  const hostileDigest = surfaceDigestByRelativePath(
    hostilePaths,
    new Map([[hostileRelativePath, Buffer.from("hostile-v1-surface")]]),
  );
  assert.equal(
    hostileDigest.count,
    75,
    "task7_hallo_v1_hostile_count_must_drift",
  );
  assert.notEqual(
    hostileDigest.sha256,
    "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
    "task7_hallo_v1_hostile_hash_must_drift",
  );
}

const captureScriptSource = fs.readFileSync(
  path.join(
    ROOT,
    "scripts/capture_learning_v2_de_task7_v2_l01_c01_hallo_sources.mjs",
  ),
  "utf8",
);
assert.match(
  captureScriptSource,
  /const GOETHE_URL =\s*"https:\/\/lernen\.goethe\.de\/deutschonline\/A1\/PDF\/DE\/deutschonline_Redemittel_und_Grammatik_1-18\.pdf";/u,
  "task7_hallo_goethe_official_direct_url_required",
);
assert.doesNotMatch(
  captureScriptSource,
  /pinnedGoethePath|isGoetheOriginUnavailable|PINNED_DURABLE_PUBLIC_HTTPS_BYTES_AFTER_ORIGIN_UNAVAILABLE/u,
  "task7_hallo_goethe_fallback_forbidden_after_official_direct_capture",
);

const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  ["TASK7_HALLO_MANIFEST_SHA256", path.join(EVIDENCE, "manifest.json")],
  [
    "TASK7_HALLO_EXTRACTION_MAP_SHA256",
    path.join(EVIDENCE, "extraction_map.json"),
  ],
  [
    "TASK7_HALLO_MODULE_SHA256",
    path.join(
      ROOT,
      "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1.ts",
    ),
  ],
  [
    "TASK7_HALLO_CAPTURE_SCRIPT_SHA256",
    path.join(
      ROOT,
      "scripts/capture_learning_v2_de_task7_v2_l01_c01_hallo_sources.mjs",
    ),
  ],
  [
    "TASK7_HALLO_GATE_SHA256",
    path.join(
      ROOT,
      "tests/learning_v2_de_task7_v2_l01_c01_hallo_allocation_gate.ts",
    ),
  ],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receipt,
  );
  assert.ok(match, `task7_hallo_receipt_binding_missing:${label}`);
  assert.equal(match[1], sha(fs.readFileSync(file)));
}
assert.match(receipt, /PHRASE_AUTHORITY_REQUIRED/u);
assert.match(receipt, /6 resolved \/ 282 unresolved \/ 0 materialized/u);
assert.match(receipt, /Nachbarin.*excluded/iu);
assert.doesNotMatch(receipt, /OWNER_APPROVED|CANONICAL_ADMITTED|RELEASED/u);

process.stdout.write(
  "TASK7_V2_L01C01_HALLO_SOURCE_ALLOCATION_GATE PASS status=HOLD decision=PHRASE_AUTHORITY_REQUIRED contacts=2 resolved=6 unresolved=282 materialized=0 canonicalAdmission=false inventoryResolutionApplied=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\n",
);
