import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  inspectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1,
  normalizeGermanTask7V2RepoRelativePathForAuditDeV1,
  projectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_de_v1";

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(__dirname, "..");
const CANDIDATE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_v1/candidate.json",
);
const TASK5 = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const TASK6 = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json",
);
const ADJUDICATION = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1/adjudication.json",
);
const EXTRACTION = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/extraction_map.json",
);
const PACKET = path.join(
  ROOT,
  "content/learning-v2-course/curriculum/de/packets/l01/s01.json",
);
const MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_de_v1.ts",
);
const V3_MIGRATION_CANDIDATE_FILES = [
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/manifest.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/task5_v3_candidate.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/task6_v3_candidate.json",
] as const;

const readJson = (file: string): JsonRecord =>
  JSON.parse(fs.readFileSync(file, "utf8")) as JsonRecord;
const writeJson = (file: string, value: unknown): void =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const sha = (value: Buffer | string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function protectedGermanV1Paths(
  relativePaths: readonly string[],
  exclusions: ReadonlySet<string>,
): string[] {
  return relativePaths.filter(
    (relativePath) =>
      relativePath.toLowerCase().includes("_v1") &&
      !exclusions.has(relativePath),
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

function hostileCandidate(
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-hallo-correction-"));
  const file = path.join(root, "candidate.json");
  const value = readJson(CANDIDATE);
  mutate(value);
  writeJson(file, value);
  try {
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1({
          candidatePathForTest: file,
          skipProtectedSurfaceBytesForHostileTest: true,
        }),
      expected,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const closedCandidate = readJson(CANDIDATE);
const exactGermanV1ExclusionList =
  closedCandidate.inputBindings.protectedGermanV1Surface.excludedPaths;
const exactGermanV1Exclusions = new Set<string>(exactGermanV1ExclusionList);
assert.equal(
  exactGermanV1ExclusionList.length,
  17,
  "hallo_correction_v1_allowlist_exact_size",
);
assert.equal(
  exactGermanV1Exclusions.size,
  17,
  "hallo_correction_v1_allowlist_no_duplicates",
);
for (const relativePath of exactGermanV1Exclusions) {
  assert.equal(relativePath.includes("\\"), false);
  assert.equal(relativePath, path.posix.normalize(relativePath));
  assert.equal(path.posix.isAbsolute(relativePath), false);
  assert.equal(
    relativePath.startsWith("./") || relativePath.startsWith("../"),
    false,
  );
  assert.equal(fs.existsSync(path.join(ROOT, relativePath)), true);
}
assert.deepEqual(
  V3_MIGRATION_CANDIDATE_FILES.filter(
    (relativePath) => !exactGermanV1Exclusions.has(relativePath),
  ),
  [],
  "hallo_correction_v3_exact_allowlist",
);
const literalBackslashV3 = V3_MIGRATION_CANDIDATE_FILES[1].replace(
  "/manifest.json",
  "\\manifest.json",
);
assert.equal(
  normalizeGermanTask7V2RepoRelativePathForAuditDeV1(literalBackslashV3, "/"),
  literalBackslashV3,
  "hallo_correction_posix_literal_backslash_must_not_alias",
);
assert.equal(
  normalizeGermanTask7V2RepoRelativePathForAuditDeV1(
    V3_MIGRATION_CANDIDATE_FILES[1].split("/").join("\\"),
    "\\",
  ),
  V3_MIGRATION_CANDIDATE_FILES[1],
  "hallo_correction_windows_separators_must_normalize",
);
const germanCurriculumPaths = walk(
  path.join(ROOT, "modules/learning-v2/curriculum/de"),
).map((file) =>
  normalizeGermanTask7V2RepoRelativePathForAuditDeV1(
    path.relative(ROOT, file),
    path.sep,
  ),
);
const protectedGermanV1PathsNow = protectedGermanV1Paths(
  germanCurriculumPaths,
  exactGermanV1Exclusions,
);
assert.deepEqual(surfaceDigestByRelativePath(protectedGermanV1PathsNow), {
  count: 74,
  sha256: "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
});
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
    `hallo_correction_missing_v3_must_drift:${missingV3Path}`,
  );
  assert.equal(missingOneV3.includes(missingV3Path), true);
}
const oldSentinel =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";
const oldSentinelBytes = fs.readFileSync(path.join(ROOT, oldSentinel));
assert.notEqual(
  surfaceDigestByRelativePath(
    protectedGermanV1PathsNow,
    new Map([
      [oldSentinel, Buffer.concat([oldSentinelBytes, Buffer.from(" ")])],
    ]),
  ).sha256,
  "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
  "hallo_correction_v1_sentinel_mutation_must_drift",
);
assert.equal(
  surfaceDigestByRelativePath(
    protectedGermanV1PathsNow.filter(
      (relativePath) => relativePath !== oldSentinel,
    ),
  ).count,
  73,
  "hallo_correction_v1_sentinel_delete_must_drift",
);
assert.equal(
  protectedGermanV1Paths(
    [
      ...germanCurriculumPaths.filter(
        (relativePath) => relativePath !== oldSentinel,
      ),
      oldSentinel.replace("_v1.json", "_renamed.json"),
    ],
    exactGermanV1Exclusions,
  ).length,
  73,
  "hallo_correction_v1_sentinel_rename_must_drift",
);
for (const hostileRelativePath of [
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/extra.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1_lookalike/manifest.json",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1_lookalike.ts",
  "modules/learning-v2/curriculum/de/prefix_task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1.ts",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1_suffix.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1_sibling.json",
  "modules/learning-v2/curriculum/de/future_unallowlisted_de_v1.ts",
  V3_MIGRATION_CANDIDATE_FILES[0].split("/").join("\\"),
  `./${V3_MIGRATION_CANDIDATE_FILES[0]}`,
  `../phraseman/${V3_MIGRATION_CANDIDATE_FILES[0]}`,
  path.posix.resolve("/", V3_MIGRATION_CANDIDATE_FILES[0]),
  V3_MIGRATION_CANDIDATE_FILES[0].toUpperCase(),
]) {
  assert.equal(exactGermanV1Exclusions.has(hostileRelativePath), false);
  assert.equal(
    protectedGermanV1Paths(
      [...germanCurriculumPaths, hostileRelativePath],
      exactGermanV1Exclusions,
    ).length,
    75,
    `hallo_correction_v1_hostile_must_be_protected:${hostileRelativePath}`,
  );
}
assert.doesNotMatch(
  fs.readFileSync(MODULE, "utf8"),
  /\.replaceAll\(/u,
  "hallo_correction_platform_normalization_must_not_use_unconditional_replaceAll",
);

const result =
  inspectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1();
assert.deepEqual(result, {
  status: "HOLD",
  decision: "TASK5_TASK6_CORRECTION_CANDIDATE_READY_FOR_FRESH_REVIEW",
  sessionId: "de_l01_s01",
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v2",
  phraseFrameId: "de_pf_l01_c01_hallo_v2",
  exactSurface: "Hallo!",
  sourceSupport: "GOETHE_EXACT_ALTERNATIVE_SURFACE_OCCURRENCE_ONLY",
  cefrEvidenceRole: "GENERAL_CEFR_SCOPE_NOT_EXACT_ATTESTATION",
  canonicalAdmission: false,
  inventoryResolutionApplied: false,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
  ownerApproval: "PENDING",
  nativeReview: "REQUIRED",
  inventory: {
    resolvedPlanIds: 6,
    unresolvedPlanIds: 282,
    packetIds: 1792,
    materializedPackets: 0,
  },
  projectedCanonicalSha256: {
    chapter: "b59fafa8d475a0922ab0a7c636d0898c1ff4a70506d145c7075c5c39543293fa",
    plan: "707379a2e2e7c6f51e90d14fcf82f8d5542553a0b5ddc7626fb35c4cce179ff0",
    phrase: "6b1bb17c8951f36793fc1fa36c6cd76723ee3b322632cf31850f422b520a0ff1",
    mapping: "713f2575bd59a0c7352dbd64b021fe1c42846e4d5b5de329026debd9f4da0735",
  },
});

const projection =
  projectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1();
assert.equal(
  projection.task5.sha256.chapter,
  result.projectedCanonicalSha256.chapter,
);
assert.equal(
  projection.task5.sha256.plan,
  result.projectedCanonicalSha256.plan,
);
assert.equal(
  projection.task6.sha256.phrase,
  result.projectedCanonicalSha256.phrase,
);
assert.equal(
  projection.task6.sha256.mapping,
  result.projectedCanonicalSha256.mapping,
);
assert.equal(projection.task5.plan.id, "de_lex_plan_l01_c01_hallo_v2");
assert.equal(
  projection.task5.plan.semanticIdentity,
  "hallo|colloquial greeting on meeting",
);
assert.equal(
  projection.task5.plan.utilityProof.facetValue,
  "recognise-a-colloquial-greeting",
);
assert.equal(
  projection.task5.chapter.checkpoint.newSituation.goal,
  "recognise-a-colloquial-greeting",
);
assert.equal(
  projection.task5.chapter.checkpoint.newSituation.contextSignature,
  "colloquial-greeting-building-entrance",
);
assert.deepEqual(projection.task6.phrase, {
  id: "de_pf_l01_c01_hallo_v2",
  frame: "Hallo!",
  grammarConstructIds: ["de_gc_pre_a1_formulaic_chunks_v1"],
  lexicalSenseIds: [],
  communicativeOutcomeIds: ["de_out_l01_ch01_v1"],
  forbiddenSurfaceFormIds: [],
  evidenceIds: ["DE-RSCH-CEFR-003"],
});
assert.deepEqual(projection.task6.mapping, {
  sourceChapterId: "de_l01_c01",
  canonicalId: "de_pf_l01_c01_hallo_v2",
  plannedFirstUsePacketId: "de_l01_c01_s08",
});
assert.doesNotMatch(JSON.stringify(projection.task6.phrase), /Nachbarin/u);
assert.equal(fs.existsSync(PACKET), false);

hostileCandidate((value) => {
  value.inputBindings.task5V2.sha256 = "0".repeat(64);
}, /hallo_correction_task5_binding/u);
hostileCandidate((value) => {
  value.task5Patch.sourcePlanId = "de_lex_plan_l01_c01_hallo_v1";
}, /hallo_correction_task5_patch/u);
hostileCandidate((value) => {
  value.task5Patch.replacement.semanticIdentity =
    "hallo|neutral informal greeting on meeting";
}, /hallo_correction_neutral_claim_forbidden/u);
hostileCandidate((value) => {
  value.task5Patch.replacement.unreviewedField = true;
}, /hallo_correction_task5_patch_schema/u);
hostileCandidate((value) => {
  value.task5Patch.chapterPatch.unreviewedField = true;
}, /hallo_correction_task5_patch_schema/u);
hostileCandidate((value) => {
  value.task6Patch.replacement.id = "de_pf_l01_c01_hallo_nachbarin_v1";
}, /hallo_correction_task6_patch/u);
hostileCandidate((value) => {
  value.task6Patch.replacement.frame = "Hallo, Nachbarin!";
}, /hallo_correction_exact_surface/u);
hostileCandidate((value) => {
  value.task6Patch.replacement.frame = "Hallo";
}, /hallo_correction_exact_surface/u);
hostileCandidate((value) => {
  value.task6Patch.replacement.frame = "Hallo, Anna!";
}, /hallo_correction_exact_surface/u);
hostileCandidate((value) => {
  value.task6Patch.replacement.lexicalSenseIds = [
    "de_lex_l01_c01_nachbarin_v1",
  ];
}, /hallo_correction_lexical_senses_forbidden/u);
hostileCandidate((value) => {
  value.task6Patch.replacement.grammarConstructIds = [];
}, /hallo_correction_task6_patch/u);
hostileCandidate((value) => {
  value.task6Patch.replacement.forbiddenSurfaceFormIds = ["invented"];
}, /hallo_correction_task6_patch/u);
hostileCandidate((value) => {
  value.task6Patch.replacement.evidenceIds = ["invented"];
}, /hallo_correction_task6_patch/u);
hostileCandidate((value) => {
  value.sourceBoundary.cefrEvidenceRole = "EXACT_PHRASE_ATTESTATION";
}, /hallo_correction_cefr_exact_attestation_forbidden/u);
hostileCandidate((value) => {
  value.sourceBoundary.goetheMatchMode = "SUBSTRING";
}, /hallo_correction_goethe_match/u);
hostileCandidate((value) => {
  value.sourceBoundary.goetheExactAlternative = "Hallo";
}, /hallo_correction_goethe_match/u);
for (const [field, hostile] of [
  ["canonicalAdmission", true],
  ["inventoryResolutionApplied", true],
  ["task7Unlock", true],
  ["preauthoringAuthority", true],
  ["learnerFacing", true],
  ["releaseAuthorized", true],
  ["consumerCutover", "V2_DEFAULT"],
] as const) {
  hostileCandidate((value) => {
    value.authority[field] = hostile;
  }, /hallo_correction_hold_boundary/u);
}
hostileCandidate((value) => {
  value.reviews.ownerApproval = "PASS";
}, /hallo_correction_owner_pending/u);
hostileCandidate((value) => {
  value.reviews.nativeReview = "PASS";
}, /hallo_correction_native_required/u);
hostileCandidate((value) => {
  value.inventory.resolvedPlanIds = 7;
}, /hallo_correction_inventory/u);
hostileCandidate((value) => {
  value.projectedCanonicalSha256.plan = "0".repeat(64);
}, /hallo_correction_projected_hash/u);
hostileCandidate((value) => {
  value.ownerBlueprintFingerprint = "invented-owner-fingerprint";
}, /hallo_correction_candidate_schema/u);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "de-hallo-base-"));
try {
  const driftedTask5 = path.join(tempRoot, "task5.json");
  fs.writeFileSync(
    driftedTask5,
    Buffer.concat([fs.readFileSync(TASK5), Buffer.from(" ")]),
  );
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1({
        task5PathForTest: driftedTask5,
      }),
    /hallo_correction_task5_input_drift/u,
  );

  const driftedTask6 = path.join(tempRoot, "task6.json");
  fs.writeFileSync(
    driftedTask6,
    Buffer.concat([fs.readFileSync(TASK6), Buffer.from(" ")]),
  );
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1({
        task6PathForTest: driftedTask6,
      }),
    /hallo_correction_task6_input_drift/u,
  );

  const driftedAdjudication = path.join(tempRoot, "adjudication.json");
  fs.writeFileSync(
    driftedAdjudication,
    Buffer.concat([fs.readFileSync(ADJUDICATION), Buffer.from(" ")]),
  );
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1({
        adjudicationPathForTest: driftedAdjudication,
      }),
    /hallo_correction_adjudication_input_drift/u,
  );

  const hostileExtraction = readJson(EXTRACTION);
  hostileExtraction.extractions.goetheOccurrence.text = "Hallo there!";
  const hostileExtractionPath = path.join(tempRoot, "extraction.json");
  writeJson(hostileExtractionPath, hostileExtraction);
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1({
        extractionPathForTest: hostileExtractionPath,
        allowUnboundExtractionForHostileTest: true,
      }),
    /hallo_correction_goethe_match/u,
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

process.stdout.write(
  "TASK7_V2_L01C01_HALLO_TASK5_TASK6_CORRECTION_CANDIDATE_GATE PASS status=HOLD exactSurface=Hallo! resolved=6 unresolved=282 packets=1792 materialized=0 canonicalAdmission=false task7Unlock=false preauthoring=false learner=false release=false cutover=NONE owner=PENDING native=REQUIRED\n",
);
