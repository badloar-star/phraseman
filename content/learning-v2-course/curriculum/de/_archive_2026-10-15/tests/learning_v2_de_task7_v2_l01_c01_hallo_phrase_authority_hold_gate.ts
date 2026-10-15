import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  inspectGermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1,
  type GermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_phrase_authority_hold_de_v1";

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1",
);
const ADJUDICATION = path.join(EVIDENCE, "adjudication.json");
const BOUND_EVIDENCE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1",
);
const TASK5 = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const TASK6_V2 = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json",
);
const SOURCE_MANIFEST = path.join(BOUND_EVIDENCE, "manifest.json");
const EXTRACTION = path.join(BOUND_EVIDENCE, "extraction_map.json");
const SOURCE_VALIDATOR = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1.ts",
);
const INVENTORY = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
);
const PACKET = path.join(
  ROOT,
  "content/learning-v2-course/curriculum/de/packets/l01/s01.json",
);
const MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_phrase_authority_hold_de_v1.ts",
);
const GATE = path.join(
  ROOT,
  "tests/learning_v2_de_task7_v2_l01_c01_hallo_phrase_authority_hold_gate.ts",
);
const RECEIPT = path.join(
  ROOT,
  "docs/v2/curriculum/de/TASK7_V2_L01C01_HALLO_PHRASE_AUTHORITY_ADJUDICATION_HOLD_2026-10-12.md",
);
const EXACT_PHRASE = "Hallo, Nachbarin!";

function sha(bytes: Buffer | string): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readJson(file: string): JsonRecord {
  return JSON.parse(fs.readFileSync(file, "utf8")) as JsonRecord;
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hostileAdjudication(
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-hallo-authority-"));
  const file = path.join(root, "adjudication.json");
  const value = readJson(ADJUDICATION);
  mutate(value);
  writeJson(file, value);
  try {
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1({
          adjudicationPathForTest: file,
        }),
      expected,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function hostileFile(
  source: string,
  option:
    | "task5PathForTest"
    | "task6V2PathForTest"
    | "sourceManifestPathForTest"
    | "extractionPathForTest"
    | "sourceValidatorPathForTest"
    | "inventoryPathForTest",
  expected: RegExp,
): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-hallo-input-"));
  const file = path.join(root, path.basename(source));
  fs.writeFileSync(
    file,
    Buffer.concat([fs.readFileSync(source), Buffer.from(" ")]),
  );
  try {
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1({
          [option]: file,
        }),
      expected,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const result: GermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1 =
  inspectGermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1();
assert.deepEqual(result, {
  status: "HOLD",
  decision: "EXACT_PHRASE_AUTHORITY_NOT_ESTABLISHED",
  sessionId: "de_l01_s01",
  phraseContextId: "de_pf_l01_c01_hallo_nachbarin_v1",
  exactPhrase: EXACT_PHRASE,
  greetingFunction: "SUPPORTED",
  dwdsRegisterLabel: "UMGANGSSPRACHLIC_SUPPORTED",
  neutralRegister: "UNVERIFIED",
  exactPhraseAttestation: "ABSENT_FROM_BOUND_EVIDENCE",
  phraseNaturalness: "UNVERIFIED",
  nativePhraseJudgement: "REQUIRED",
  resolutionRoute: "NEW_EXACT_AUTHORITY_OR_VERSIONED_TASK5_TASK6_REPAIR",
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
    packetIds: 1792,
    materializedPackets: 0,
  },
});

assert.equal(
  sha(fs.readFileSync(TASK5)),
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
);
assert.equal(
  sha(fs.readFileSync(TASK6_V2)),
  "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
);
assert.equal(
  sha(fs.readFileSync(SOURCE_MANIFEST)),
  "674f789c05922ddce29103393228ee26f4c428255baf4fc646b90c95b97bfd33",
);
assert.equal(
  sha(fs.readFileSync(EXTRACTION)),
  "3b0ab0c32c3dd8bb42b2c22f0f43bc514272f23c60c97003334418f5afaaabad",
);
assert.equal(
  sha(fs.readFileSync(SOURCE_VALIDATOR)),
  "71e96a433e2906ffd86e05aa0ea42a09300c1d83a46ecae680bfa842a637e5aa",
);
assert.equal(
  sha(fs.readFileSync(INVENTORY)),
  "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
);

const sourceManifest = readJson(SOURCE_MANIFEST);
const extraction = readJson(EXTRACTION);
assert.equal(
  sourceManifest.fieldSupport.supportedClaims.greetingDefinitionGerman,
  "Anrede zur Begrüßung",
);
assert.equal(
  sourceManifest.fieldSupport.unsupportedClaims.neutralRegister,
  "UNSUPPORTED_BY_CAPTURED_SOURCES",
);
assert.equal(
  extraction.extractions.goetheOccurrence.text,
  "Guten Tag! / Hallo!",
);
assert.equal(
  extraction.extractions.dwdsGreeting.exactDefinitionGerman,
  "Anrede zur Begrüßung",
);
const dwdsRaw = fs.readFileSync(
  path.join(BOUND_EVIDENCE, "raw/dwds_hallo_interjection.html"),
  "utf8",
);
assert.match(
  dwdsRaw,
  /id="d-1-1"[\s\S]*?dwdswb-stilebene">umgangssprachlich<[\s\S]*?id="d-1-1-2"[\s\S]*?Anrede zur Begrüßung/u,
);
for (const relative of [
  "raw/dwds_hallo_interjection.html",
  "raw/dwds_Hallo_noun.html",
  "raw/goethe_a1_redemittel.pdf",
  "extraction_map.json",
]) {
  assert.equal(
    fs
      .readFileSync(path.join(BOUND_EVIDENCE, relative))
      .includes(Buffer.from(EXACT_PHRASE, "utf8")),
    false,
    `exact phrase unexpectedly present in bound evidence: ${relative}`,
  );
}

const task6 = readJson(TASK6_V2);
const frame = task6.registry.phraseFrames.find(
  (candidate: JsonRecord) =>
    candidate.id === "de_pf_l01_c01_hallo_nachbarin_v1",
);
assert.deepEqual(frame, {
  id: "de_pf_l01_c01_hallo_nachbarin_v1",
  frame: EXACT_PHRASE,
  grammarConstructIds: ["de_gc_pre_a1_formulaic_chunks_v1"],
  lexicalSenseIds: ["de_lex_l01_c01_nachbarin_v1"],
  communicativeOutcomeIds: ["de_out_l01_ch01_v1"],
  forbiddenSurfaceFormIds: [],
  evidenceIds: ["DE-RSCH-CEFR-003"],
});

hostileAdjudication((value) => {
  value.findings.neutralRegister = "SUPPORTED";
}, /hallo_phrase_neutral_register_unverified/u);
hostileAdjudication((value) => {
  value.findings.neutralRegister = "SUPPORTED_BY_DWDS_UMGANGSSPRACHLIC";
}, /hallo_phrase_neutral_register_unverified/u);
hostileAdjudication((value) => {
  value.sourceBoundaries.dwds = "NEUTRAL_REGISTER_SUPPORTED";
}, /hallo_phrase_colloquial_not_neutral/u);
hostileAdjudication((value) => {
  value.sourceBoundaries.goethe = "EXACT_PHRASE_AUTHORITY";
}, /hallo_phrase_goethe_scope/u);
hostileAdjudication((value) => {
  value.sourceBoundaries.task6PhraseFrame = "EXACT_PHRASE_ATTESTED_BY_CEFR";
}, /hallo_phrase_cefr_scope/u);
hostileAdjudication((value) => {
  value.findings.exactPhraseAttestation = "PRESENT";
}, /hallo_phrase_exact_attestation_absent/u);
hostileAdjudication((value) => {
  value.findings.phraseNaturalness = "SUPPORTED";
}, /hallo_phrase_naturalness_unverified/u);
hostileAdjudication((value) => {
  value.findings.nativePhraseJudgement = "PASS";
}, /hallo_phrase_native_judgement_required/u);
hostileAdjudication((value) => {
  value.status = "PASS";
}, /hallo_phrase_hold_required/u);
hostileAdjudication((value) => {
  value.decision = "EXACT_PHRASE_AUTHORITY_ESTABLISHED";
}, /hallo_phrase_authority_not_established/u);
hostileAdjudication((value) => {
  value.scope.exactPhrase = "Hallo Nachbarin!";
}, /hallo_phrase_exact_identity/u);
hostileAdjudication((value) => {
  value.scope.phraseContextId = "de_pf_l01_c01_hallo_nachbar_v1";
}, /hallo_phrase_exact_identity/u);
hostileAdjudication((value) => {
  value.scope.contactPacketIds = ["de_l01_c01_s02"];
}, /hallo_phrase_exact_contacts/u);
hostileAdjudication((value) => {
  value.canonicalSenseId = "de_lex_l01_c01_hallo_v1";
}, /hallo_phrase_canonical_sense_id_forbidden/u);
hostileAdjudication((value) => {
  value.ownerApproval = "APPROVED";
}, /hallo_phrase_owner_approval_forbidden/u);
for (const [field, hostile] of [
  ["canonicalAdmission", true],
  ["inventoryResolutionApplied", true],
  ["task7Unlock", true],
  ["preauthoringAuthority", true],
  ["learnerFacing", true],
  ["releaseAuthorized", true],
  ["consumerCutover", "V2_DEFAULT"],
] as const) {
  hostileAdjudication((value) => {
    value.authority[field] = hostile;
  }, /hallo_phrase_hold_boundary/u);
}

for (const [source, option, expected] of [
  [TASK5, "task5PathForTest", /hallo_phrase_task5_input_drift/u],
  [TASK6_V2, "task6V2PathForTest", /hallo_phrase_task6_v2_input_drift/u],
  [
    SOURCE_MANIFEST,
    "sourceManifestPathForTest",
    /hallo_phrase_source_manifest_input_drift/u,
  ],
  [EXTRACTION, "extractionPathForTest", /hallo_phrase_extraction_input_drift/u],
  [
    SOURCE_VALIDATOR,
    "sourceValidatorPathForTest",
    /hallo_phrase_source_validator_input_drift/u,
  ],
  [INVENTORY, "inventoryPathForTest", /hallo_phrase_inventory_input_drift/u],
] as const) {
  hostileFile(source, option, expected);
}

const packetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "de-hallo-packet-"));
const fakePacket = path.join(packetRoot, "s01.json");
fs.writeFileSync(fakePacket, "{}\n", "utf8");
try {
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1({
        packetPathForTest: fakePacket,
      }),
    /hallo_phrase_packet_materialization_forbidden/u,
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
const PRE_CORRECTION_EXCLUSIONS = [
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/extraction_map.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/manifest.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/dwds_hallo_interjection.html",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/dwds_hallo_interjection.http_metadata.txt",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/dwds_Hallo_noun.html",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/dwds_Hallo_noun.http_metadata.txt",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/goethe_a1_redemittel.http_metadata.txt",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/raw/goethe_a1_redemittel.pdf",
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
const exactGermanV1ExclusionList = [
  ...PRE_CORRECTION_EXCLUSIONS,
  ...CORRECTION_CANDIDATE_FILES,
  ...V3_MIGRATION_CANDIDATE_FILES,
] as const;
const exactGermanV1Exclusions = new Set<string>(exactGermanV1ExclusionList);
const literalBackslashCandidatePath = CORRECTION_CANDIDATE_FILES[1].replace(
  "/candidate.json",
  "\\candidate.json",
);
assert.equal(
  repoRelativePosixFromPlatformRelative(literalBackslashCandidatePath, "/"),
  literalBackslashCandidatePath,
  "hallo_phrase_posix_literal_backslash_must_not_alias",
);
assert.equal(
  repoRelativePosixFromPlatformRelative(
    CORRECTION_CANDIDATE_FILES[1].replaceAll("/", "\\"),
    "\\",
  ),
  CORRECTION_CANDIDATE_FILES[1],
  "hallo_phrase_windows_separators_must_normalize",
);
assert.equal(exactGermanV1ExclusionList.length, 17);
assert.equal(exactGermanV1Exclusions.size, 17);
for (const relativePath of exactGermanV1Exclusions) {
  assert.equal(relativePath, relativePath.replaceAll("\\", "/"));
  assert.equal(relativePath, path.posix.normalize(relativePath));
  assert.equal(path.posix.isAbsolute(relativePath), false);
  assert.equal(
    relativePath.startsWith("./") || relativePath.startsWith("../"),
    false,
  );
  assert.equal(fs.existsSync(path.join(ROOT, relativePath)), true);
}
function isProtectedGermanV1RelativePath(relativePath: string): boolean {
  return (
    relativePath.toLowerCase().includes("_v1") &&
    !exactGermanV1Exclusions.has(relativePath)
  );
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
  assert.equal(exactGermanV1Exclusions.has(hostileRelativePath), false);
  assert.equal(
    isProtectedGermanV1RelativePath(hostileRelativePath),
    true,
    `hallo_phrase_v1_hostile_must_be_protected:${hostileRelativePath}`,
  );
}
function protectedGermanV1Paths(
  relativePaths: readonly string[],
  excluded: ReadonlySet<string> = exactGermanV1Exclusions,
): string[] {
  return relativePaths.filter(
    (relativePath) =>
      relativePath.toLowerCase().includes("_v1") && !excluded.has(relativePath),
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
const beforeCorrectionExclusion = protectedGermanV1Paths(
  germanCurriculumPaths,
  new Set(PRE_CORRECTION_EXCLUSIONS),
);
assert.equal(beforeCorrectionExclusion.length, 80);
const afterCorrectionExclusion = protectedGermanV1Paths(
  germanCurriculumPaths,
  new Set([...PRE_CORRECTION_EXCLUSIONS, ...CORRECTION_CANDIDATE_FILES]),
);
assert.equal(afterCorrectionExclusion.length, 78);
assert.deepEqual(
  beforeCorrectionExclusion
    .filter((relativePath) => !afterCorrectionExclusion.includes(relativePath))
    .sort(),
  [...CORRECTION_CANDIDATE_FILES].sort(),
  "hallo_phrase_exact_correction_candidate_exclusions",
);
const protectedGermanV1PathsNow = protectedGermanV1Paths(germanCurriculumPaths);
assert.deepEqual(
  afterCorrectionExclusion
    .filter((relativePath) => !protectedGermanV1PathsNow.includes(relativePath))
    .sort(),
  [...V3_MIGRATION_CANDIDATE_FILES].sort(),
  "hallo_phrase_exact_v3_migration_candidate_exclusions",
);
assert.deepEqual(surfaceDigestByRelativePath(protectedGermanV1PathsNow), {
  count: 74,
  sha256: "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
});

const oldSentinel =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";
assert.equal(protectedGermanV1PathsNow.includes(oldSentinel), true);
const oldSentinelBytes = fs.readFileSync(path.join(ROOT, oldSentinel));
assert.notEqual(
  surfaceDigestByRelativePath(
    protectedGermanV1PathsNow,
    new Map([
      [oldSentinel, Buffer.concat([oldSentinelBytes, Buffer.from(" ")])],
    ]),
  ).sha256,
  "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
  "hallo_phrase_v1_sentinel_mutation_must_drift",
);
assert.equal(
  surfaceDigestByRelativePath(
    protectedGermanV1PathsNow.filter(
      (relativePath) => relativePath !== oldSentinel,
    ),
  ).count,
  73,
  "hallo_phrase_v1_sentinel_delete_must_drift",
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
  "hallo_phrase_v1_sentinel_rename_must_drift",
);

for (const missingV3Path of V3_MIGRATION_CANDIDATE_FILES) {
  const missingOneV3 = protectedGermanV1Paths(
    germanCurriculumPaths,
    new Set(
      [...exactGermanV1Exclusions].filter(
        (relativePath) => relativePath !== missingV3Path,
      ),
    ),
  );
  assert.equal(
    missingOneV3.length,
    75,
    `hallo_phrase_missing_v3_must_drift:${missingV3Path}`,
  );
  assert.equal(missingOneV3.includes(missingV3Path), true);
}

assert.equal(fs.existsSync(PACKET), false);
const receipt = fs.readFileSync(RECEIPT, "utf8");
for (const [label, file] of [
  ["HALLO_PHRASE_ADJUDICATION_SHA256", ADJUDICATION],
  ["HALLO_PHRASE_MODULE_SHA256", MODULE],
  ["HALLO_PHRASE_GATE_SHA256", GATE],
] as const) {
  const match = new RegExp(`<!-- ${label}: ([a-f0-9]{64}) -->`, "u").exec(
    receipt,
  );
  assert.ok(match, `hallo_phrase_receipt_binding_missing:${label}`);
  assert.equal(match[1], sha(fs.readFileSync(file)));
}
assert.match(receipt, /EXACT_PHRASE_AUTHORITY_NOT_ESTABLISHED/u);
assert.match(receipt, /UMGANGSSPRACHLIC_SUPPORTED/u);
assert.match(
  receipt,
  /6 resolved \/ 282 unresolved \/ 1,792 packets \/ 0 materialized/u,
);
assert.doesNotMatch(receipt, /OWNER_APPROVED|CANONICAL_ADMITTED|RELEASED/u);

process.stdout.write(
  "TASK7_V2_L01C01_HALLO_PHRASE_AUTHORITY_HOLD_GATE PASS status=HOLD decision=EXACT_PHRASE_AUTHORITY_NOT_ESTABLISHED greeting=SUPPORTED register=UMGANGSSPRACHLIC_SUPPORTED neutral=UNVERIFIED exactPhrase=ABSENT_FROM_BOUND_EVIDENCE native=REQUIRED resolved=6 unresolved=282 packets=1792 materialized=0 task7Unlock=false preauthoring=false learner=false release=false cutover=NONE\n",
);
