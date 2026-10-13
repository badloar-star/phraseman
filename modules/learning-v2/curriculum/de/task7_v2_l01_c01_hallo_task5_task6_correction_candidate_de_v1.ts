import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../policies/decision_registry";

type JsonRecord = Record<string, any>;

export type GermanTask7V2L01C01HalloCorrectionCandidateResultDeV1 = Readonly<{
  status: "HOLD";
  decision: "TASK5_TASK6_CORRECTION_CANDIDATE_READY_FOR_FRESH_REVIEW";
  sessionId: "de_l01_s01";
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v2";
  phraseFrameId: "de_pf_l01_c01_hallo_v2";
  exactSurface: "Hallo!";
  sourceSupport: "GOETHE_EXACT_ALTERNATIVE_SURFACE_OCCURRENCE_ONLY";
  cefrEvidenceRole: "GENERAL_CEFR_SCOPE_NOT_EXACT_ATTESTATION";
  canonicalAdmission: false;
  inventoryResolutionApplied: false;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
  ownerApproval: "PENDING";
  nativeReview: "REQUIRED";
  inventory: Readonly<{
    resolvedPlanIds: 6;
    unresolvedPlanIds: 282;
    packetIds: 1792;
    materializedPackets: 0;
  }>;
  projectedCanonicalSha256: Readonly<{
    chapter: string;
    plan: string;
    phrase: string;
    mapping: string;
  }>;
}>;

export type GermanTask7V2L01C01HalloCorrectionCandidateOptionsDeV1 = Readonly<{
  candidatePathForTest?: string;
  task5PathForTest?: string;
  task6PathForTest?: string;
  adjudicationPathForTest?: string;
  extractionPathForTest?: string;
  packetPathForTest?: string;
  allowUnboundExtractionForHostileTest?: boolean;
  skipProtectedSurfaceBytesForHostileTest?: boolean;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const CANDIDATE_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_v1/candidate.json",
);
const TASK5_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const TASK6_V2_FILE = `${["task6", "canonical", "registry", "de", "v2"].join("_")}.json`;
const TASK6_V2_RELATIVE_PATH = `modules/learning-v2/curriculum/de/registries/${TASK6_V2_FILE}`;
const TASK6_PATH = path.join(ROOT, TASK6_V2_RELATIVE_PATH);
const ADJUDICATION_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1/adjudication.json",
);
const EXTRACTION_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/extraction_map.json",
);
const PACKET_PATH = path.join(
  ROOT,
  "content/learning-v2-course/curriculum/de/packets/l01/s01.json",
);

const INPUT_SHA = Object.freeze({
  task5: "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  task6: "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
  adjudication:
    "45778ef06b4eddceaa3ede01e83e95225731b9786cbd39868650add6980259a5",
  extraction:
    "3b0ab0c32c3dd8bb42b2c22f0f43bc514272f23c60c97003334418f5afaaabad",
});

const PROJECTED_SHA = Object.freeze({
  chapter: "b59fafa8d475a0922ab0a7c636d0898c1ff4a70506d145c7075c5c39543293fa",
  plan: "707379a2e2e7c6f51e90d14fcf82f8d5542553a0b5ddc7626fb35c4cce179ff0",
  phrase: "6b1bb17c8951f36793fc1fa36c6cd76723ee3b322632cf31850f422b520a0ff1",
  mapping: "713f2575bd59a0c7352dbd64b021fe1c42846e4d5b5de329026debd9f4da0735",
});

const EXPECTED_ENGLISH_SURFACE = Object.freeze({
  roots: Object.freeze([
    "modules/learning-v2/curriculum/en",
    "content/learning-v2-course/curriculum/en",
    "content/learning-v2-course/release/en",
    "modules/learning-v2/content/factory_native/generated_release/en",
  ]),
  fileCount: 1570,
  sha256: "8f73cffb0d735b436aad2b7679dd242df0fb609962e43b27229bea2e30934db9",
});

const EXPECTED_GERMAN_V1_SURFACE = Object.freeze({
  root: "modules/learning-v2/curriculum/de",
  excludedPaths: Object.freeze([
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
    "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_de_v1.ts",
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_v1/candidate.json",
    "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1.ts",
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/manifest.json",
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/task5_v3_candidate.json",
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/task6_v3_candidate.json",
  ]),
  fileCount: 74,
  sha256: "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
});

function fail(code: string): never {
  throw new Error(code);
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
}

function exactKeys(
  value: JsonRecord,
  keys: readonly string[],
  code: string,
): void {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    fail(code);
  }
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseJson(bytes: Buffer, code: string): JsonRecord {
  try {
    const value = JSON.parse(bytes.toString("utf8")) as unknown;
    record(value, code);
    return value;
  } catch {
    fail(code);
  }
}

function readBoundJson(
  file: string,
  expected: string,
  code: string,
): JsonRecord {
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== expected) fail(code);
  return parseJson(bytes, code);
}

function clone<T>(value: T): T {
  return JSON.parse(canonicalJsonV1(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as JsonRecord)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

export function normalizeGermanTask7V2RepoRelativePathForAuditDeV1(
  relativePath: string,
  platformSeparator: string = path.sep,
): string {
  const platformNormalized =
    platformSeparator === "\\"
      ? relativePath.split(platformSeparator).join("/")
      : relativePath;
  return path.posix.normalize(platformNormalized);
}

function validateClosedGermanV1Exclusions(): ReadonlySet<string> {
  const paths = EXPECTED_GERMAN_V1_SURFACE.excludedPaths;
  const exclusions = new Set(paths);
  if (paths.length !== 17 || exclusions.size !== 17) {
    fail("hallo_correction_german_v1_surface_binding");
  }
  for (const relativePath of paths) {
    if (
      relativePath.includes("\\") ||
      relativePath !==
        normalizeGermanTask7V2RepoRelativePathForAuditDeV1(relativePath, "/") ||
      path.posix.isAbsolute(relativePath) ||
      relativePath.startsWith("./") ||
      relativePath.startsWith("../") ||
      !fs.existsSync(path.join(ROOT, relativePath))
    ) {
      fail("hallo_correction_german_v1_surface_binding");
    }
  }
  return exclusions;
}

function surfaceDigest(files: readonly string[]): {
  count: number;
  sha256: string;
} {
  const digest = crypto.createHash("sha256");
  const entries = files
    .map((file) => ({
      file,
      relative: normalizeGermanTask7V2RepoRelativePathForAuditDeV1(
        path.relative(ROOT, file),
        path.sep,
      ),
    }))
    .sort((left, right) => left.relative.localeCompare(right.relative));
  for (const { file, relative } of entries) {
    digest.update(relative);
    digest.update("\0");
    digest.update(sha256(fs.readFileSync(file)));
    digest.update("\0");
  }
  return { count: entries.length, sha256: digest.digest("hex") };
}

function validateProtectedSurfaces(inputBindings: JsonRecord): void {
  record(
    inputBindings.englishSurface,
    "hallo_correction_english_surface_binding",
  );
  if (
    canonicalJsonV1(inputBindings.englishSurface) !==
    canonicalJsonV1(EXPECTED_ENGLISH_SURFACE)
  ) {
    fail("hallo_correction_english_surface_binding");
  }
  const english = surfaceDigest(
    EXPECTED_ENGLISH_SURFACE.roots.flatMap((root) =>
      walk(path.join(ROOT, root)),
    ),
  );
  if (
    english.count !== EXPECTED_ENGLISH_SURFACE.fileCount ||
    english.sha256 !== EXPECTED_ENGLISH_SURFACE.sha256
  ) {
    fail("hallo_correction_english_surface_drift");
  }

  record(
    inputBindings.protectedGermanV1Surface,
    "hallo_correction_german_v1_surface_binding",
  );
  if (
    canonicalJsonV1(inputBindings.protectedGermanV1Surface) !==
    canonicalJsonV1(EXPECTED_GERMAN_V1_SURFACE)
  ) {
    fail("hallo_correction_german_v1_surface_binding");
  }
  const exclusions = validateClosedGermanV1Exclusions();
  const germanV1 = walk(
    path.join(ROOT, EXPECTED_GERMAN_V1_SURFACE.root),
  ).filter((file) => {
    const relative = normalizeGermanTask7V2RepoRelativePathForAuditDeV1(
      path.relative(ROOT, file),
      path.sep,
    );
    return relative.toLowerCase().includes("_v1") && !exclusions.has(relative);
  });
  const digest = surfaceDigest(germanV1);
  if (
    digest.count !== EXPECTED_GERMAN_V1_SURFACE.fileCount ||
    digest.sha256 !== EXPECTED_GERMAN_V1_SURFACE.sha256
  ) {
    fail("hallo_correction_german_v1_surface_drift");
  }
}

function validateInputBindings(
  value: unknown,
  skipProtectedSurfaceBytesForHostileTest: boolean,
): void {
  record(value, "hallo_correction_input_bindings");
  exactKeys(
    value,
    [
      "task5V2",
      "task6V2",
      "priorHoldAdjudication",
      "sourceExtraction",
      "englishSurface",
      "protectedGermanV1Surface",
    ],
    "hallo_correction_input_bindings",
  );
  for (const [key, expectedPath, expectedSha, code] of [
    [
      "task5V2",
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
      INPUT_SHA.task5,
      "hallo_correction_task5_binding",
    ],
    [
      "task6V2",
      TASK6_V2_RELATIVE_PATH,
      INPUT_SHA.task6,
      "hallo_correction_task6_binding",
    ],
    [
      "priorHoldAdjudication",
      "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1/adjudication.json",
      INPUT_SHA.adjudication,
      "hallo_correction_adjudication_binding",
    ],
    [
      "sourceExtraction",
      "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/extraction_map.json",
      INPUT_SHA.extraction,
      "hallo_correction_extraction_binding",
    ],
  ] as const) {
    record(value[key], code);
    exactKeys(value[key], ["path", "sha256"], code);
    if (value[key].path !== expectedPath || value[key].sha256 !== expectedSha) {
      fail(code);
    }
  }
  if (!skipProtectedSurfaceBytesForHostileTest)
    validateProtectedSurfaces(value);
}

function rejectForbiddenCandidateClaims(candidate: unknown): void {
  const serialized = canonicalJsonV1(candidate);
  if (/neutral/iu.test(serialized))
    fail("hallo_correction_neutral_claim_forbidden");
}

function rejectNachbarin(candidate: unknown): void {
  if (/Nachbarin/u.test(canonicalJsonV1(candidate))) {
    fail("hallo_correction_nachbarin_forbidden");
  }
}

function validateTask5Patch(value: unknown): void {
  record(value, "hallo_correction_task5_patch");
  exactKeys(
    value,
    ["chapterId", "replacement", "chapterPatch"],
    "hallo_correction_task5_patch_schema",
  );
  if (value.chapterId !== "de_l01_c01") fail("hallo_correction_task5_patch");
  record(value.replacement, "hallo_correction_task5_patch");
  exactKeys(
    value.replacement,
    ["id", "semanticIdentity", "utilityProofFacetValue", "senseGloss"],
    "hallo_correction_task5_patch_schema",
  );
  if (
    value.replacement.id !== "de_lex_plan_l01_c01_hallo_v2" ||
    value.replacement.semanticIdentity !==
      "hallo|colloquial greeting on meeting" ||
    value.replacement.utilityProofFacetValue !==
      "recognise-a-colloquial-greeting" ||
    value.replacement.senseGloss !== "colloquial greeting on meeting"
  ) {
    fail("hallo_correction_task5_patch");
  }
  record(value.chapterPatch, "hallo_correction_task5_patch");
  exactKeys(
    value.chapterPatch,
    ["checkpointNewSituationGoal", "checkpointNewSituationContextSignature"],
    "hallo_correction_task5_patch_schema",
  );
  if (
    value.chapterPatch.checkpointNewSituationGoal !==
      "recognise-a-colloquial-greeting" ||
    value.chapterPatch.checkpointNewSituationContextSignature !==
      "colloquial-greeting-building-entrance"
  ) {
    fail("hallo_correction_task5_patch");
  }
}

function validateTask6Patch(value: unknown): void {
  record(value, "hallo_correction_task6_patch");
  exactKeys(
    value,
    ["sourceChapterId", "replacement"],
    "hallo_correction_task6_patch_schema",
  );
  if (value.sourceChapterId !== "de_l01_c01") {
    fail("hallo_correction_task6_patch");
  }
  record(value.replacement, "hallo_correction_task6_patch");
  exactKeys(
    value.replacement,
    [
      "id",
      "frame",
      "grammarConstructIds",
      "lexicalSenseIds",
      "communicativeOutcomeIds",
      "forbiddenSurfaceFormIds",
      "evidenceIds",
    ],
    "hallo_correction_task6_patch_schema",
  );
  if (value.replacement.frame !== "Hallo!")
    fail("hallo_correction_exact_surface");
  if (
    !Array.isArray(value.replacement.lexicalSenseIds) ||
    value.replacement.lexicalSenseIds.length !== 0
  ) {
    fail("hallo_correction_lexical_senses_forbidden");
  }
  const expected = {
    id: "de_pf_l01_c01_hallo_v2",
    frame: "Hallo!",
    grammarConstructIds: ["de_gc_pre_a1_formulaic_chunks_v1"],
    lexicalSenseIds: [],
    communicativeOutcomeIds: ["de_out_l01_ch01_v1"],
    forbiddenSurfaceFormIds: [],
    evidenceIds: ["DE-RSCH-CEFR-003"],
  };
  if (canonicalJsonV1(value.replacement) !== canonicalJsonV1(expected)) {
    fail("hallo_correction_task6_patch");
  }
}

function validateSourceBoundary(value: unknown, extraction: JsonRecord): void {
  record(value, "hallo_correction_source_boundary");
  exactKeys(
    value,
    [
      "sourceSupport",
      "goetheMatchMode",
      "goetheExactAlternative",
      "cefrEvidenceRole",
    ],
    "hallo_correction_source_boundary",
  );
  if (value.cefrEvidenceRole !== "GENERAL_CEFR_SCOPE_NOT_EXACT_ATTESTATION") {
    fail("hallo_correction_cefr_exact_attestation_forbidden");
  }
  if (
    value.sourceSupport !==
      "GOETHE_EXACT_ALTERNATIVE_SURFACE_OCCURRENCE_ONLY" ||
    value.goetheMatchMode !== "EXACT_TRIMMED_SLASH_ALTERNATIVE" ||
    value.goetheExactAlternative !== "Hallo!"
  ) {
    fail("hallo_correction_goethe_match");
  }
  record(extraction.extractions, "hallo_correction_goethe_match");
  record(
    extraction.extractions.goetheOccurrence,
    "hallo_correction_goethe_match",
  );
  const occurrence = extraction.extractions.goetheOccurrence.text;
  if (typeof occurrence !== "string") fail("hallo_correction_goethe_match");
  const exactAlternatives = occurrence
    .split("/")
    .map((part: string) => part.trim());
  if (
    exactAlternatives.filter((alternative: string) => alternative === "Hallo!")
      .length !== 1
  ) {
    fail("hallo_correction_goethe_match");
  }
}

function validateAuthority(value: unknown): void {
  record(value, "hallo_correction_authority");
  exactKeys(
    value,
    [
      "canonicalAdmission",
      "inventoryResolutionApplied",
      "task7Unlock",
      "preauthoringAuthority",
      "learnerFacing",
      "releaseAuthorized",
      "consumerCutover",
    ],
    "hallo_correction_authority",
  );
  if (
    value.canonicalAdmission !== false ||
    value.inventoryResolutionApplied !== false ||
    value.task7Unlock !== false ||
    value.preauthoringAuthority !== false ||
    value.learnerFacing !== false ||
    value.releaseAuthorized !== false ||
    value.consumerCutover !== "NONE"
  ) {
    fail("hallo_correction_hold_boundary");
  }
}

function validateReviews(value: unknown): void {
  record(value, "hallo_correction_reviews");
  exactKeys(
    value,
    ["ownerApproval", "nativeReview"],
    "hallo_correction_reviews",
  );
  if (value.ownerApproval !== "PENDING") fail("hallo_correction_owner_pending");
  if (value.nativeReview !== "REQUIRED")
    fail("hallo_correction_native_required");
}

function validateInventory(value: unknown): void {
  record(value, "hallo_correction_inventory");
  exactKeys(
    value,
    [
      "resolvedPlanIds",
      "unresolvedPlanIds",
      "packetIds",
      "materializedPackets",
    ],
    "hallo_correction_inventory",
  );
  if (
    value.resolvedPlanIds !== 6 ||
    value.unresolvedPlanIds !== 282 ||
    value.packetIds !== 1792 ||
    value.materializedPackets !== 0
  ) {
    fail("hallo_correction_inventory");
  }
}

function validateProjectedHashes(value: unknown): void {
  record(value, "hallo_correction_projected_hash");
  exactKeys(
    value,
    ["chapter", "plan", "phrase", "mapping"],
    "hallo_correction_projected_hash",
  );
  if (canonicalJsonV1(value) !== canonicalJsonV1(PROJECTED_SHA)) {
    fail("hallo_correction_projected_hash");
  }
}

function candidateCore(candidate: JsonRecord): JsonRecord {
  const core = clone(candidate);
  delete core.candidateFingerprint;
  return core;
}

function validateFingerprint(candidate: JsonRecord): void {
  record(candidate.candidateFingerprint, "hallo_correction_fingerprint");
  exactKeys(
    candidate.candidateFingerprint,
    ["scope", "algorithm", "sha256"],
    "hallo_correction_fingerprint",
  );
  if (
    candidate.candidateFingerprint.scope !==
      "CLOSED_CANDIDATE_CORE_NOT_OWNER_BLUEPRINT_FINGERPRINT" ||
    candidate.candidateFingerprint.algorithm !== "SHA256_CANONICAL_JSON_V1" ||
    candidate.candidateFingerprint.sha256 !==
      hashCanonicalBody(candidateCore(candidate))
  ) {
    fail("hallo_correction_fingerprint");
  }
}

function validateCandidate(
  candidate: JsonRecord,
  extraction: JsonRecord,
  skipProtectedSurfaceBytesForHostileTest: boolean,
): void {
  exactKeys(
    candidate,
    [
      "schemaVersion",
      "status",
      "decision",
      "inputBindings",
      "task5Patch",
      "task6Patch",
      "sourceBoundary",
      "projectedCanonicalSha256",
      "candidateFingerprint",
      "reviews",
      "authority",
      "inventory",
    ],
    "hallo_correction_candidate_schema",
  );
  if (
    candidate.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c01-hallo-task5-task6-correction-candidate.v1" ||
    candidate.status !== "HOLD" ||
    candidate.decision !==
      "TASK5_TASK6_CORRECTION_CANDIDATE_READY_FOR_FRESH_REVIEW"
  ) {
    fail("hallo_correction_candidate_schema");
  }
  rejectForbiddenCandidateClaims(candidate);
  validateInputBindings(
    candidate.inputBindings,
    skipProtectedSurfaceBytesForHostileTest,
  );
  validateTask5Patch(candidate.task5Patch);
  validateTask6Patch(candidate.task6Patch);
  rejectNachbarin(candidate);
  validateSourceBoundary(candidate.sourceBoundary, extraction);
  validateProjectedHashes(candidate.projectedCanonicalSha256);
  validateReviews(candidate.reviews);
  validateAuthority(candidate.authority);
  validateInventory(candidate.inventory);
  validateFingerprint(candidate);
}

function findUnique(
  rows: unknown,
  predicate: (value: JsonRecord) => boolean,
  code: string,
): JsonRecord {
  if (!Array.isArray(rows)) fail(code);
  const matches = rows.filter((value) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    return predicate(value as JsonRecord);
  }) as JsonRecord[];
  if (matches.length !== 1) fail(code);
  return matches[0];
}

function project(
  task5: JsonRecord,
  task6: JsonRecord,
): Readonly<{
  task5: Readonly<{
    chapter: JsonRecord;
    plan: JsonRecord;
    sha256: Readonly<{ chapter: string; plan: string }>;
  }>;
  task6: Readonly<{
    phrase: JsonRecord;
    mapping: JsonRecord;
    sha256: Readonly<{ phrase: string; mapping: string }>;
  }>;
}> {
  const task5Projection = clone(task5);
  const lesson = findUnique(
    task5Projection.lessons,
    (value) => value.lessonId === "de_l01",
    "hallo_correction_task5_topology",
  );
  const chapter = findUnique(
    lesson.chapters,
    (value) => value.id === "de_l01_c01",
    "hallo_correction_task5_topology",
  );
  record(chapter.checkpoint, "hallo_correction_task5_topology");
  const plan = findUnique(
    chapter.checkpoint.plannedNewLexicalSenses,
    (value) => value.id === "de_lex_plan_l01_c01_hallo_v1",
    "hallo_correction_task5_topology",
  );
  plan.id = "de_lex_plan_l01_c01_hallo_v2";
  plan.semanticIdentity = "hallo|colloquial greeting on meeting";
  record(plan.utilityProof, "hallo_correction_task5_topology");
  plan.utilityProof.facetValue = "recognise-a-colloquial-greeting";
  plan.senseGloss = "colloquial greeting on meeting";
  record(chapter.checkpoint.newSituation, "hallo_correction_task5_topology");
  chapter.checkpoint.newSituation.goal = "recognise-a-colloquial-greeting";
  chapter.checkpoint.newSituation.contextSignature =
    "colloquial-greeting-building-entrance";

  const task6Projection = clone(task6);
  record(task6Projection.registry, "hallo_correction_task6_topology");
  const phrase = findUnique(
    task6Projection.registry.phraseFrames,
    (value) => value.id === "de_pf_l01_c01_hallo_nachbarin_v1",
    "hallo_correction_task6_topology",
  );
  phrase.id = "de_pf_l01_c01_hallo_v2";
  phrase.frame = "Hallo!";
  phrase.lexicalSenseIds = [];
  record(task6Projection.authorityContext, "hallo_correction_task6_topology");
  const mapping = findUnique(
    task6Projection.authorityContext.phraseFrameMappings,
    (value) => value.sourceChapterId === "de_l01_c01",
    "hallo_correction_task6_topology",
  );
  mapping.canonicalId = "de_pf_l01_c01_hallo_v2";

  const actual = {
    chapter: hashCanonicalBody(chapter),
    plan: hashCanonicalBody(plan),
    phrase: hashCanonicalBody(phrase),
    mapping: hashCanonicalBody(mapping),
  };
  if (canonicalJsonV1(actual) !== canonicalJsonV1(PROJECTED_SHA)) {
    fail("hallo_correction_projected_hash");
  }
  return deepFreeze({
    task5: {
      chapter,
      plan,
      sha256: { chapter: actual.chapter, plan: actual.plan },
    },
    task6: {
      phrase,
      mapping,
      sha256: { phrase: actual.phrase, mapping: actual.mapping },
    },
  });
}

function inspect(
  options: GermanTask7V2L01C01HalloCorrectionCandidateOptionsDeV1,
): Readonly<{
  candidate: JsonRecord;
  projection: ReturnType<typeof project>;
}> {
  const task5 = readBoundJson(
    options.task5PathForTest ?? TASK5_PATH,
    INPUT_SHA.task5,
    "hallo_correction_task5_input_drift",
  );
  const task6 = readBoundJson(
    options.task6PathForTest ?? TASK6_PATH,
    INPUT_SHA.task6,
    "hallo_correction_task6_input_drift",
  );
  const adjudication = readBoundJson(
    options.adjudicationPathForTest ?? ADJUDICATION_PATH,
    INPUT_SHA.adjudication,
    "hallo_correction_adjudication_input_drift",
  );
  if (
    adjudication.status !== "HOLD" ||
    adjudication.decision !== "EXACT_PHRASE_AUTHORITY_NOT_ESTABLISHED"
  ) {
    fail("hallo_correction_adjudication_boundary");
  }
  const extractionBytes = fs.readFileSync(
    options.extractionPathForTest ?? EXTRACTION_PATH,
  );
  if (
    !options.allowUnboundExtractionForHostileTest &&
    sha256(extractionBytes) !== INPUT_SHA.extraction
  ) {
    fail("hallo_correction_extraction_input_drift");
  }
  const extraction = parseJson(
    extractionBytes,
    "hallo_correction_extraction_json",
  );
  const candidate = parseJson(
    fs.readFileSync(options.candidatePathForTest ?? CANDIDATE_PATH),
    "hallo_correction_candidate_json",
  );
  validateCandidate(
    candidate,
    extraction,
    options.skipProtectedSurfaceBytesForHostileTest === true,
  );
  if (fs.existsSync(options.packetPathForTest ?? PACKET_PATH)) {
    fail("hallo_correction_packet_materialization_forbidden");
  }
  return deepFreeze({ candidate, projection: project(task5, task6) });
}

export function projectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1(
  options: GermanTask7V2L01C01HalloCorrectionCandidateOptionsDeV1 = {},
): ReturnType<typeof project> {
  return inspect(options).projection;
}

export function inspectGermanTask7V2L01C01HalloTask5Task6CorrectionCandidateDeV1(
  options: GermanTask7V2L01C01HalloCorrectionCandidateOptionsDeV1 = {},
): GermanTask7V2L01C01HalloCorrectionCandidateResultDeV1 {
  const { candidate } = inspect(options);
  return deepFreeze({
    status: "HOLD" as const,
    decision:
      "TASK5_TASK6_CORRECTION_CANDIDATE_READY_FOR_FRESH_REVIEW" as const,
    sessionId: "de_l01_s01" as const,
    sourcePlanId: "de_lex_plan_l01_c01_hallo_v2" as const,
    phraseFrameId: "de_pf_l01_c01_hallo_v2" as const,
    exactSurface: "Hallo!" as const,
    sourceSupport: "GOETHE_EXACT_ALTERNATIVE_SURFACE_OCCURRENCE_ONLY" as const,
    cefrEvidenceRole: "GENERAL_CEFR_SCOPE_NOT_EXACT_ATTESTATION" as const,
    canonicalAdmission: false as const,
    inventoryResolutionApplied: false as const,
    task7Unlock: false as const,
    preauthoringAuthority: false as const,
    learnerFacing: false as const,
    releaseAuthorized: false as const,
    consumerCutover: "NONE" as const,
    ownerApproval: "PENDING" as const,
    nativeReview: "REQUIRED" as const,
    inventory: clone(candidate.inventory) as {
      resolvedPlanIds: 6;
      unresolvedPlanIds: 282;
      packetIds: 1792;
      materializedPackets: 0;
    },
    projectedCanonicalSha256: clone(candidate.projectedCanonicalSha256) as {
      chapter: string;
      plan: string;
      phrase: string;
      mapping: string;
    },
  });
}
