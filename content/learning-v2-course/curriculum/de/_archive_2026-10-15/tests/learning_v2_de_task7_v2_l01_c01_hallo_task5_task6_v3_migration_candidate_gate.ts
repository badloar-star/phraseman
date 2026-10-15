import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1,
  isGermanTask7V2ProtectedV1PathDeV1,
  normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1,
} from "../modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1";

type JsonRecord = Record<string, any>;

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1",
);
const MANIFEST = path.join(EVIDENCE_ROOT, "manifest.json");
const TASK5_CANDIDATE = path.join(EVIDENCE_ROOT, "task5_v3_candidate.json");
const TASK6_CANDIDATE = path.join(EVIDENCE_ROOT, "task6_v3_candidate.json");
const TASK5 = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const TASK6 = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json",
);
const SOURCE_EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1",
);
const MODULE = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1.ts",
);
const GERMAN_ROOT = path.join(ROOT, "modules/learning-v2/curriculum/de");
const PHRASE_AUTHORITY_MODULE = path.join(
  GERMAN_ROOT,
  "task7_v2_l01_c01_hallo_phrase_authority_hold_de_v1.ts",
);
const GERMAN_PROTECTED_V1_SENTINEL = path.join(
  GERMAN_ROOT,
  "registries/task6_canonical_registry_de_v1.json",
);
const ENGLISH_PROTECTED_SENTINEL = path.join(
  ROOT,
  "modules/learning-v2/curriculum/en/prerequisite_dag_en_v1.ts",
);

const readJson = (file: string): JsonRecord =>
  JSON.parse(fs.readFileSync(file, "utf8")) as JsonRecord;
const writeJson = (file: string, value: unknown): void =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const sha256 = (value: Buffer | string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
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
      sha256(
        overrides.get(relativePath) ??
          fs.readFileSync(path.join(ROOT, relativePath)),
      ),
    );
    digest.update("\0");
  }
  return { count: relativePaths.length, sha256: digest.digest("hex") };
}

function withTempJson(
  source: string,
  mutate: (value: JsonRecord) => void,
  run: (file: string) => void,
): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "de-hallo-v3-"));
  const file = path.join(root, "input.json");
  const value = readJson(source);
  mutate(value);
  writeJson(file, value);
  try {
    run(file);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function withTrackedFileReads<T>(
  transform: (
    resolvedPath: string | undefined,
    result: ReturnType<typeof fs.readFileSync>,
  ) => ReturnType<typeof fs.readFileSync>,
  run: () => T,
): T {
  const originalOpenSync = fs.openSync;
  const originalReadFileSync = fs.readFileSync;
  const originalCloseSync = fs.closeSync;
  const descriptorPaths = new Map<number, string>();
  fs.openSync = ((
    candidate: fs.PathLike,
    flags: string | number,
    mode?: number,
  ) => {
    const descriptor = originalOpenSync(candidate, flags, mode);
    descriptorPaths.set(descriptor, path.resolve(candidate.toString()));
    return descriptor;
  }) as typeof fs.openSync;
  fs.readFileSync = ((
    candidate: fs.PathOrFileDescriptor,
    options?: Parameters<typeof fs.readFileSync>[1],
  ): ReturnType<typeof fs.readFileSync> => {
    const result = originalReadFileSync(
      candidate,
      options as never,
    ) as ReturnType<typeof fs.readFileSync>;
    const resolvedPath =
      typeof candidate === "number"
        ? descriptorPaths.get(candidate)
        : path.resolve(candidate.toString());
    return transform(resolvedPath, result);
  }) as typeof fs.readFileSync;
  fs.closeSync = ((descriptor: number) => {
    try {
      originalCloseSync(descriptor);
    } finally {
      descriptorPaths.delete(descriptor);
    }
  }) as typeof fs.closeSync;
  try {
    return run();
  } finally {
    fs.openSync = originalOpenSync;
    fs.readFileSync = originalReadFileSync;
    fs.closeSync = originalCloseSync;
  }
}

function hostileManifest(
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void {
  withTempJson(MANIFEST, mutate, (file) => {
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
          manifestPathForTest: file,
        }),
      expected,
    );
  });
}

function hostileCandidate(
  source: string,
  key: "task5CandidatePathForTest" | "task6CandidatePathForTest",
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void {
  withTempJson(source, mutate, (file) => {
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
          [key]: file,
          allowUnboundCandidateBytesForHostileTest: true,
        }),
      expected,
    );
  });
}

const result =
  inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1();
assert.deepEqual(result, {
  status: "HOLD",
  decision: "PROPOSED_EXACT_SUCCESSOR_NOT_ACTIVATED",
  sessionId: "de_l01_s01",
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v2",
  phraseFrameId: "de_pf_l01_c01_hallo_v2",
  exactSurface: "Hallo!",
  task5PlanIds: 288,
  task6LexicalSenses: 6,
  task6PhraseFrames: 2,
  task6PronunciationTargets: 1,
  rowsPromoted: 0,
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
  defaultConsumerChanged: false,
  ownerApproval: "PENDING",
});

const task5 = readJson(TASK5_CANDIDATE);
const task5Lesson = task5.lessons.find(
  (value: JsonRecord) => value.lessonId === "de_l01",
);
const task5Chapter = task5Lesson.chapters.find(
  (value: JsonRecord) => value.id === "de_l01_c01",
);
const task5Plans = task5.lessons.flatMap((lesson: JsonRecord) =>
  lesson.chapters.flatMap(
    (chapter: JsonRecord) => chapter.checkpoint.plannedNewLexicalSenses,
  ),
);
assert.equal(task5.schemaVersion, "learning-v2-german-chapter-blueprints.v3");
assert.equal(task5Plans.length, 288);
assert.equal(
  task5Plans.filter(
    (value: JsonRecord) => value.id === "de_lex_plan_l01_c01_hallo_v2",
  ).length,
  1,
);
assert.equal(
  task5Plans.some(
    (value: JsonRecord) => value.id === "de_lex_plan_l01_c01_hallo_v1",
  ),
  false,
);
const task5Plan = task5Chapter.checkpoint.plannedNewLexicalSenses.find(
  (value: JsonRecord) => value.id === "de_lex_plan_l01_c01_hallo_v2",
);
assert.equal(
  task5Plan.semanticIdentity,
  "hallo|colloquial greeting on meeting",
);
assert.equal(task5Plan.senseGloss, "colloquial greeting on meeting");
assert.equal(
  task5Plan.utilityProof.facetValue,
  "recognise-a-colloquial-greeting",
);
assert.equal(
  task5Chapter.checkpoint.newSituation.goal,
  "recognise-a-colloquial-greeting",
);
assert.equal(
  task5Chapter.checkpoint.newSituation.contextSignature,
  "colloquial-greeting-building-entrance",
);

const task6 = readJson(TASK6_CANDIDATE);
assert.equal(
  task6.schemaVersion,
  "learning-v2-german-task6-canonical-registry.v3",
);
assert.equal(task6.registry.lexicalSenses.length, 6);
assert.equal(task6.registry.phraseFrames.length, 2);
assert.equal(task6.registry.pronunciationTargets.length, 1);
const task6Phrase = task6.registry.phraseFrames.find(
  (value: JsonRecord) => value.id === "de_pf_l01_c01_hallo_v2",
);
assert.deepEqual(task6Phrase, {
  id: "de_pf_l01_c01_hallo_v2",
  frame: "Hallo!",
  grammarConstructIds: ["de_gc_pre_a1_formulaic_chunks_v1"],
  lexicalSenseIds: [],
  communicativeOutcomeIds: ["de_out_l01_ch01_v1"],
  forbiddenSurfaceFormIds: [],
  evidenceIds: ["DE-RSCH-CEFR-003"],
});
assert.deepEqual(
  task6.authorityContext.phraseFrameMappings.find(
    (value: JsonRecord) => value.sourceChapterId === "de_l01_c01",
  ),
  {
    sourceChapterId: "de_l01_c01",
    canonicalId: "de_pf_l01_c01_hallo_v2",
    plannedFirstUsePacketId: "de_l01_c01_s08",
  },
);

assert.doesNotMatch(
  fs.readFileSync(MODULE, "utf8"),
  /\.replaceAll\(/u,
  "hallo_v3_platform_normalization_must_not_rewrite_posix_literal_backslash",
);

const manifestForProtectedSurfaceTests = readJson(MANIFEST);
const exclusionList = manifestForProtectedSurfaceTests.inputBindings
  .protectedSurfaces.germanV1.excludedPaths as string[];
const exclusions = new Set(exclusionList);
assert.equal(exclusionList.length, 17, "hallo_v3_exclusion_exact_size");
assert.equal(exclusions.size, 17, "hallo_v3_exclusion_unique");
for (const relativePath of exclusionList) {
  assert.equal(relativePath.includes("\\"), false);
  assert.equal(
    relativePath,
    normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(relativePath, "/"),
  );
  assert.equal(path.posix.isAbsolute(relativePath), false);
  assert.equal(
    relativePath.startsWith("./") || relativePath.startsWith("../"),
    false,
  );
  assert.equal(fs.existsSync(path.join(ROOT, relativePath)), true);
}

const exactExcludedManifest = exclusionList.find((relativePath) =>
  relativePath.endsWith(
    "/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/manifest.json",
  ),
);
assert.ok(exactExcludedManifest);
const windowsExactExcludedManifest = exactExcludedManifest
  .split("/")
  .join("\\");
assert.equal(
  normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
    windowsExactExcludedManifest,
    "\\",
  ),
  exactExcludedManifest,
  "hallo_v3_windows_separator_exact_path_must_normalize",
);
assert.equal(
  isGermanTask7V2ProtectedV1PathDeV1(
    normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
      windowsExactExcludedManifest,
      "\\",
    ),
    exclusions,
  ),
  false,
  "hallo_v3_windows_separator_exact_path_must_remain_excluded",
);
const posixLiteralBackslashManifest = exactExcludedManifest.replace(
  "/manifest.json",
  "\\manifest.json",
);
assert.equal(
  normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
    posixLiteralBackslashManifest,
    "/",
  ),
  posixLiteralBackslashManifest,
  "hallo_v3_posix_literal_backslash_must_not_alias",
);
assert.equal(
  isGermanTask7V2ProtectedV1PathDeV1(posixLiteralBackslashManifest, exclusions),
  true,
  "hallo_v3_posix_literal_backslash_must_be_protected",
);

const germanRelativePaths = walk(GERMAN_ROOT).map((file) =>
  normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
    path.relative(ROOT, file),
    path.sep,
  ),
);
const protectedGermanV1Paths = germanRelativePaths.filter((relativePath) =>
  isGermanTask7V2ProtectedV1PathDeV1(relativePath, exclusions),
);
assert.deepEqual(surfaceDigestByRelativePath(protectedGermanV1Paths), {
  count: 74,
  sha256: "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
});

const oldSentinel =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";
const oldSentinelBytes = fs.readFileSync(path.join(ROOT, oldSentinel));
assert.notEqual(
  surfaceDigestByRelativePath(
    protectedGermanV1Paths,
    new Map([
      [oldSentinel, Buffer.concat([oldSentinelBytes, Buffer.from(" ")])],
    ]),
  ).sha256,
  "34d91df20aa6e52bbdf3106198effe3f42d381e55c477266b4877cdef312e2e6",
  "hallo_v3_v1_sentinel_mutation_must_drift",
);
assert.equal(
  surfaceDigestByRelativePath(
    protectedGermanV1Paths.filter(
      (relativePath) => relativePath !== oldSentinel,
    ),
  ).count,
  73,
  "hallo_v3_v1_sentinel_delete_must_drift",
);
assert.equal(
  [
    ...germanRelativePaths.filter(
      (relativePath) => relativePath !== oldSentinel,
    ),
    oldSentinel.replace("_v1.json", "_renamed.json"),
  ].filter((relativePath) =>
    isGermanTask7V2ProtectedV1PathDeV1(relativePath, exclusions),
  ).length,
  73,
  "hallo_v3_v1_sentinel_rename_must_drift",
);

for (const hostileRelativePath of [
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/extra.json",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1_lookalike/manifest.json",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1_lookalike.ts",
  "modules/learning-v2/curriculum/de/prefix_task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1.ts",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1_suffix.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1_sibling.json",
  "modules/learning-v2/curriculum/de/future_unallowlisted_de_v1.ts",
  "modules/learning-v2/curriculum/de/future_unallowlisted_de_V1.ts",
  posixLiteralBackslashManifest,
  `./${exactExcludedManifest}`,
  `../phraseman/${exactExcludedManifest}`,
  path.posix.resolve("/", exactExcludedManifest),
  exactExcludedManifest.toUpperCase(),
]) {
  assert.equal(exclusions.has(hostileRelativePath), false);
  assert.equal(
    isGermanTask7V2ProtectedV1PathDeV1(hostileRelativePath, exclusions),
    true,
    `hallo_v3_hostile_path_must_be_protected:${hostileRelativePath}`,
  );
}

assert.throws(
  () =>
    inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
      additionalGermanV1RelativePathsForHostileTest: [
        "modules/learning-v2/curriculum/de/future_unallowlisted_de_V1.ts",
      ],
    }),
  /hallo_v3_german_v1_surface_drift/u,
  "hallo_v3_uppercase_v1_must_be_protected_without_workspace_mutation",
);

const originalExistsSyncForMissingExclusion = fs.existsSync;
for (const missingExcludedPath of exclusionList) {
  fs.existsSync = ((candidate: fs.PathLike): boolean =>
    path.resolve(candidate.toString()) ===
    path.resolve(path.join(ROOT, missingExcludedPath))
      ? false
      : originalExistsSyncForMissingExclusion(
          candidate,
        )) as typeof fs.existsSync;
  try {
    assert.throws(
      () => inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
      /hallo_v3_german_v1_surface_binding/u,
      `hallo_v3_missing_exact_exclusion_must_fail_closed:${missingExcludedPath}`,
    );
  } finally {
    fs.existsSync = originalExistsSyncForMissingExclusion;
  }
}

withTrackedFileReads(
  (resolvedPath, result) =>
    resolvedPath === path.resolve(PHRASE_AUTHORITY_MODULE)
      ? (Buffer.concat([
          Buffer.isBuffer(result) ? result : Buffer.from(result),
          Buffer.from(" "),
        ]) as ReturnType<typeof fs.readFileSync>)
      : result,
  () =>
    assert.throws(
      () => inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
      /hallo_v3_source_input_drift|hallo_v3_german_v1_surface_binding/u,
      "hallo_v3_phrase_authority_module_mutation_must_fail_closed",
    ),
);

{
  const fixedLegacySourcePaths = [
    path.join(SOURCE_EVIDENCE_ROOT, "manifest.json"),
    path.join(SOURCE_EVIDENCE_ROOT, "extraction_map.json"),
    path.join(
      SOURCE_EVIDENCE_ROOT,
      "raw/dwds_hallo_interjection.http_metadata.txt",
    ),
    path.join(SOURCE_EVIDENCE_ROOT, "raw/dwds_hallo_interjection.html"),
    TASK5,
    path.join(
      ROOT,
      "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
    ),
  ] as const;
  const alternateRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "de-hallo-v3-legacy-handles-"),
  );
  const alternateByFixedPath = new Map<string, string>();
  for (const [index, fixedPath] of fixedLegacySourcePaths.entries()) {
    const alternatePath = path.join(alternateRoot, `alternate-${index}.bin`);
    fs.copyFileSync(fixedPath, alternatePath);
    const fixedStats = fs.statSync(fixedPath);
    const alternateStats = fs.statSync(alternatePath);
    assert.notEqual(
      `${fixedStats.dev}:${fixedStats.ino}`,
      `${alternateStats.dev}:${alternateStats.ino}`,
      `hallo_v3_hostile_alternate_must_have_distinct_identity:${fixedPath}`,
    );
    alternateByFixedPath.set(path.resolve(fixedPath), alternatePath);
  }
  const originalReadFileSyncForLegacyHandles = fs.readFileSync;
  let redirectedLegacyPathReads = 0;
  fs.readFileSync = ((
    candidate: fs.PathOrFileDescriptor,
    options?: Parameters<typeof fs.readFileSync>[1],
  ): ReturnType<typeof fs.readFileSync> => {
    if (typeof candidate !== "number") {
      const alternatePath = alternateByFixedPath.get(
        path.resolve(candidate.toString()),
      );
      if (alternatePath) {
        redirectedLegacyPathReads += 1;
        return originalReadFileSyncForLegacyHandles(
          alternatePath,
          options as never,
        ) as ReturnType<typeof fs.readFileSync>;
      }
    }
    return originalReadFileSyncForLegacyHandles(
      candidate,
      options as never,
    ) as ReturnType<typeof fs.readFileSync>;
  }) as typeof fs.readFileSync;
  try {
    assert.equal(
      inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1()
        .status,
      "HOLD",
    );
    assert.equal(
      redirectedLegacyPathReads,
      0,
      "hallo_v3_fixed_legacy_sources_must_not_be_read_by_path",
    );
  } finally {
    fs.readFileSync = originalReadFileSyncForLegacyHandles;
    fs.rmSync(alternateRoot, { recursive: true, force: true });
  }
}

const exclusionClassRepresentatives = [
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1.ts",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_phrase_authority_hold_de_v1.ts",
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_de_v1.ts",
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/manifest.json",
] as const;
for (const representative of exclusionClassRepresentatives) {
  const representativePath = path.join(ROOT, representative);
  const originalLstatSyncForExcludedSymlink = fs.lstatSync;
  const hostileLstatSync = ((candidate: fs.PathLike) => {
    const result = originalLstatSyncForExcludedSymlink(candidate);
    if (
      path.resolve(candidate.toString()) === path.resolve(representativePath)
    ) {
      return new Proxy(result, {
        get(target, property, receiver) {
          if (property === "isSymbolicLink") return () => true;
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    }
    return result;
  }) as typeof fs.lstatSync;
  Object.defineProperty(fs, "lstatSync", {
    configurable: true,
    value: hostileLstatSync,
  });
  try {
    assert.throws(
      () => inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
      /hallo_v3_german_v1_surface_binding/u,
      `hallo_v3_excluded_symlink_must_fail_closed:${representative}`,
    );
  } finally {
    Object.defineProperty(fs, "lstatSync", {
      configurable: true,
      value: originalLstatSyncForExcludedSymlink,
    });
  }

  const originalRealpathSyncForExcludedEscape = fs.realpathSync;
  fs.realpathSync = ((candidate: fs.PathLike) =>
    path.resolve(candidate.toString()) === path.resolve(representativePath)
      ? path.join(path.parse(ROOT).root, "outside", "excluded-artifact")
      : originalRealpathSyncForExcludedEscape(
          candidate,
        )) as typeof fs.realpathSync;
  try {
    assert.throws(
      () => inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
      /hallo_v3_german_v1_surface_binding/u,
      `hallo_v3_excluded_realpath_escape_must_fail_closed:${representative}`,
    );
  } finally {
    fs.realpathSync = originalRealpathSyncForExcludedEscape;
  }
}

for (const [surface, sentinel] of [
  ["german", GERMAN_PROTECTED_V1_SENTINEL],
  ["english", ENGLISH_PROTECTED_SENTINEL],
] as const) {
  const originalLstatSyncForProtectedSymlink = fs.lstatSync;
  let protectedLstatChecks = 0;
  const hostileProtectedLstat = ((candidate: fs.PathLike) => {
    const result = originalLstatSyncForProtectedSymlink(candidate);
    if (path.resolve(candidate.toString()) === path.resolve(sentinel)) {
      protectedLstatChecks += 1;
      return new Proxy(result, {
        get(target, property, receiver) {
          if (property === "isSymbolicLink") return () => true;
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    }
    return result;
  }) as typeof fs.lstatSync;
  Object.defineProperty(fs, "lstatSync", {
    configurable: true,
    value: hostileProtectedLstat,
  });
  try {
    assert.throws(
      () => inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
      /hallo_v3_protected_surface_entry/u,
      `hallo_v3_${surface}_protected_symlink_must_fail_closed`,
    );
    assert.ok(protectedLstatChecks >= 1);
  } finally {
    Object.defineProperty(fs, "lstatSync", {
      configurable: true,
      value: originalLstatSyncForProtectedSymlink,
    });
  }

  const originalRealpathSyncForProtectedEscape = fs.realpathSync;
  let protectedRealpathChecks = 0;
  fs.realpathSync = ((candidate: fs.PathLike) => {
    if (path.resolve(candidate.toString()) === path.resolve(sentinel)) {
      protectedRealpathChecks += 1;
      return path.join(path.parse(ROOT).root, "outside", `${surface}-surface`);
    }
    return originalRealpathSyncForProtectedEscape(candidate);
  }) as typeof fs.realpathSync;
  try {
    assert.throws(
      () => inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
      /hallo_v3_protected_surface_entry/u,
      `hallo_v3_${surface}_protected_realpath_escape_must_fail_closed`,
    );
    assert.ok(protectedRealpathChecks >= 1);
  } finally {
    fs.realpathSync = originalRealpathSyncForProtectedEscape;
  }
}

const originalLstatSyncForProtectedIdentitySwap = fs.lstatSync;
let protectedIdentityLstatChecks = 0;
const hostileProtectedIdentityLstat = ((candidate: fs.PathLike) => {
  const result = originalLstatSyncForProtectedIdentitySwap(candidate);
  if (
    path.resolve(candidate.toString()) ===
    path.resolve(GERMAN_PROTECTED_V1_SENTINEL)
  ) {
    protectedIdentityLstatChecks += 1;
    if (
      protectedIdentityLstatChecks === 2 ||
      protectedIdentityLstatChecks === 3
    ) {
      return new Proxy(result, {
        get(target, property, receiver) {
          if (property === "dev") return Number(target.dev) + 1;
          if (property === "ino") return Number(target.ino) + 1;
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    }
  }
  return result;
}) as typeof fs.lstatSync;
Object.defineProperty(fs, "lstatSync", {
  configurable: true,
  value: hostileProtectedIdentityLstat,
});
try {
  assert.throws(
    () => inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
    /hallo_v3_fixed_state_drift|hallo_v3_protected_surface_entry/u,
    "hallo_v3_transient_protected_identity_swap_must_fail_closed",
  );
  assert.ok(protectedIdentityLstatChecks >= 2);
} finally {
  Object.defineProperty(fs, "lstatSync", {
    configurable: true,
    value: originalLstatSyncForProtectedIdentitySwap,
  });
}

const originalOpenSyncForProtectedHandleSwap = fs.openSync;
const originalFstatSyncForProtectedHandleSwap = fs.fstatSync;
let protectedSentinelOpenCount = 0;
const swappedProtectedHandles = new Set<number>();
fs.openSync = ((
  candidate: fs.PathLike,
  flags: string | number,
  mode?: number,
) => {
  const descriptor = originalOpenSyncForProtectedHandleSwap(
    candidate,
    flags,
    mode,
  );
  if (
    path.resolve(candidate.toString()) ===
    path.resolve(GERMAN_PROTECTED_V1_SENTINEL)
  ) {
    protectedSentinelOpenCount += 1;
    if (protectedSentinelOpenCount === 2) {
      swappedProtectedHandles.add(descriptor);
    }
  }
  return descriptor;
}) as typeof fs.openSync;
fs.fstatSync = ((descriptor: number) => {
  const result = originalFstatSyncForProtectedHandleSwap(descriptor);
  if (swappedProtectedHandles.has(descriptor)) {
    return new Proxy(result, {
      get(target, property, receiver) {
        if (property === "dev") return Number(target.dev) + 1;
        if (property === "ino") return Number(target.ino) + 1;
        const value = Reflect.get(target, property, receiver) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  return result;
}) as typeof fs.fstatSync;
try {
  assert.throws(
    () => inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
    /hallo_v3_fixed_state_drift|hallo_v3_protected_surface_entry/u,
    "hallo_v3_protected_handle_identity_swap_must_fail_closed",
  );
  assert.ok(protectedSentinelOpenCount >= 2);
} finally {
  fs.openSync = originalOpenSyncForProtectedHandleSwap;
  fs.fstatSync = originalFstatSyncForProtectedHandleSwap;
}

hostileManifest((value) => {
  value.inputBindings.task5V2.byteSha256 = "0".repeat(64);
}, /hallo_v3_task5_binding/u);
hostileManifest((value) => {
  value.inputBindings.ownerContract.blueprintApproval = "PASS";
}, /hallo_v3_owner_pending/u);
hostileManifest((value) => {
  value.inputBindings.protectedSurfaces.germanV1.fileCount = 75;
}, /hallo_v3_protected_surface_binding/u);
hostileManifest((value) => {
  value.inputBindings.sourceEvidence.inspector.sha256 = "0".repeat(64);
}, /hallo_v3_source_binding/u);
hostileManifest((value) => {
  value.inputBindings.sourceEvidence.priorHoldInspector.sha256 = "0".repeat(64);
}, /hallo_v3_source_binding/u);
hostileManifest((value) => {
  value.ownerBlueprintFingerprint = "fake";
}, /hallo_v3_manifest_schema/u);
hostileManifest((value) => {
  value.candidateFingerprint.scope = "OWNER_BLUEPRINT_FINGERPRINT";
}, /hallo_v3_candidate_fingerprint/u);
hostileManifest((value) => {
  value.proposedBinding.sourcePlanId = "de_lex_plan_l01_c01_hallo_v1";
}, /hallo_v3_plan_frame_binding/u);
hostileManifest((value) => {
  delete value.proposedBinding.phraseFrameId;
}, /hallo_v3_plan_frame_binding/u);
hostileManifest((value) => {
  value.proposedBinding.phraseFrameId = "de_pf_l01_c01_hallo_nachbarin_v1";
}, /hallo_v3_plan_frame_binding/u);
hostileManifest((value) => {
  value.proposedBinding.exactSurface = "Hallo, Nachbarin!";
}, /hallo_v3_plan_frame_binding/u);
hostileManifest((value) => {
  value.sourceBoundary.cefrEvidenceRole = "EXACT_PHRASE_ATTESTATION";
}, /hallo_v3_cefr_exact_attestation_forbidden/u);
hostileManifest((value) => {
  value.inventory.resolvedPlanIds = 7;
}, /hallo_v3_inventory/u);
hostileManifest((value) => {
  value.authority.rowsPromoted = 1;
}, /hallo_v3_hold_boundary/u);
hostileManifest((value) => {
  value.authority.task7Unlock = true;
}, /hallo_v3_hold_boundary/u);
hostileManifest((value) => {
  value.authority.learnerFacing = true;
}, /hallo_v3_hold_boundary/u);
hostileManifest((value) => {
  value.authority.releaseAuthorized = true;
}, /hallo_v3_hold_boundary/u);
hostileManifest((value) => {
  value.authority.consumerCutover = "V3_DEFAULT";
}, /hallo_v3_hold_boundary/u);
hostileManifest((value) => {
  value.authority.defaultConsumerChanged = true;
}, /hallo_v3_hold_boundary/u);

hostileCandidate(
  TASK5_CANDIDATE,
  "task5CandidatePathForTest",
  (value) => {
    value.lessons[0].chapters[0].checkpoint.plannedNewLexicalSenses.push(
      structuredClone(
        value.lessons[0].chapters[0].checkpoint.plannedNewLexicalSenses[0],
      ),
    );
  },
  /hallo_v3_task5_exact_copy/u,
);
hostileCandidate(
  TASK5_CANDIDATE,
  "task5CandidatePathForTest",
  (value) => {
    const plan =
      value.lessons[0].chapters[0].checkpoint.plannedNewLexicalSenses[0];
    plan.semanticIdentity = "hallo|neutral informal greeting on meeting";
  },
  /hallo_v3_neutral_forbidden|hallo_v3_task5_exact_copy/u,
);
hostileCandidate(
  TASK5_CANDIDATE,
  "task5CandidatePathForTest",
  (value) => {
    value.lessons[0].grammarBoundary.noExpansion = "changed";
  },
  /hallo_v3_task5_exact_copy/u,
);
hostileCandidate(
  TASK6_CANDIDATE,
  "task6CandidatePathForTest",
  (value) => {
    value.registry.phraseFrames[0].frame = "Hallo";
  },
  /hallo_v3_exact_surface|hallo_v3_task6_exact_copy/u,
);
hostileCandidate(
  TASK6_CANDIDATE,
  "task6CandidatePathForTest",
  (value) => {
    value.registry.phraseFrames[0].frame = "Hallo, Anna!";
  },
  /hallo_v3_composite_or_vocative_forbidden|hallo_v3_task6_exact_copy/u,
);
hostileCandidate(
  TASK6_CANDIDATE,
  "task6CandidatePathForTest",
  (value) => {
    value.registry.phraseFrames[0].lexicalSenseIds = [
      "de_lex_l01_c01_nachbarin_v1",
    ];
  },
  /hallo_v3_lexical_senses_forbidden|hallo_v3_task6_exact_copy/u,
);
hostileCandidate(
  TASK6_CANDIDATE,
  "task6CandidatePathForTest",
  (value) => {
    value.authorityContext.phraseFrameMappings.find(
      (row: JsonRecord) => row.sourceChapterId === "de_l01_c01",
    ).canonicalId = "de_pf_l01_c01_hallo_nachbarin_v1";
  },
  /hallo_v3_task6_exact_copy/u,
);
hostileCandidate(
  TASK6_CANDIDATE,
  "task6CandidatePathForTest",
  (value) => {
    value.authority.rowsPromoted = 1;
  },
  /hallo_v3_task6_exact_copy/u,
);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "de-hallo-v3-files-"));
try {
  const driftedTask5 = path.join(tempRoot, "task5.json");
  fs.writeFileSync(
    driftedTask5,
    Buffer.concat([fs.readFileSync(TASK5), Buffer.from(" ")]),
  );
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
        task5PathForTest: driftedTask5,
      }),
    /hallo_v3_task5_input_drift/u,
  );

  const driftedTask6 = path.join(tempRoot, "task6.json");
  fs.writeFileSync(
    driftedTask6,
    Buffer.concat([fs.readFileSync(TASK6), Buffer.from(" ")]),
  );
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
        task6PathForTest: driftedTask6,
      }),
    /hallo_v3_task6_input_drift/u,
  );

  const cleanTask6Override = path.join(tempRoot, "task6-clean.json");
  fs.copyFileSync(TASK6, cleanTask6Override);
  withTrackedFileReads(
    (resolvedPath, result) =>
      resolvedPath === path.resolve(TASK6)
        ? (Buffer.concat([
            Buffer.isBuffer(result) ? result : Buffer.from(result),
            Buffer.from(" "),
          ]) as ReturnType<typeof fs.readFileSync>)
        : result,
    () =>
      assert.throws(
        () =>
          inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
            task6PathForTest: cleanTask6Override,
          }),
        /hallo_v3_task6_input_drift|hallo_v3_fixed_state_drift/u,
        "hallo_v3_task6_override_must_not_mask_fixed_drift",
      ),
  );

  const cleanTask6CandidateOverride = path.join(
    tempRoot,
    "task6-candidate-clean.json",
  );
  fs.copyFileSync(TASK6_CANDIDATE, cleanTask6CandidateOverride);
  withTrackedFileReads(
    (resolvedPath, result) =>
      resolvedPath === path.resolve(TASK6_CANDIDATE)
        ? (Buffer.concat([
            Buffer.isBuffer(result) ? result : Buffer.from(result),
            Buffer.from(" "),
          ]) as ReturnType<typeof fs.readFileSync>)
        : result,
    () =>
      assert.throws(
        () =>
          inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
            task6CandidatePathForTest: cleanTask6CandidateOverride,
            allowUnboundCandidateBytesForHostileTest: true,
          }),
        /hallo_v3_task6_candidate_drift|hallo_v3_fixed_state_drift/u,
        "hallo_v3_task6_candidate_override_must_not_mask_fixed_drift",
      ),
  );

  let immediateFixedManifestReads = 0;
  withTrackedFileReads(
    (resolvedPath, result) => {
      if (resolvedPath !== path.resolve(MANIFEST)) return result;
      immediateFixedManifestReads += 1;
      return immediateFixedManifestReads > 1
        ? (Buffer.concat([
            Buffer.isBuffer(result) ? result : Buffer.from(result),
            Buffer.from(" "),
          ]) as ReturnType<typeof fs.readFileSync>)
        : result;
    },
    () => {
      assert.throws(
        () =>
          inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
        /hallo_v3_fixed_state_drift/u,
        "hallo_v3_fixed_manifest_immediate_post_snapshot_drift_must_fail_closed",
      );
      assert.ok(immediateFixedManifestReads >= 2);
    },
  );

  const cleanManifestLateOverride = path.join(
    tempRoot,
    "manifest-late-clean.json",
  );
  fs.copyFileSync(MANIFEST, cleanManifestLateOverride);
  let manifestLateOverrideSeen = false;
  let postOverrideFixedManifestReads = 0;
  withTrackedFileReads(
    (resolvedPath, result) => {
      if (resolvedPath === path.resolve(cleanManifestLateOverride)) {
        manifestLateOverrideSeen = true;
        return result;
      }
      if (resolvedPath === path.resolve(MANIFEST) && manifestLateOverrideSeen) {
        postOverrideFixedManifestReads += 1;
        return Buffer.concat([
          Buffer.isBuffer(result) ? result : Buffer.from(result),
          Buffer.from(" "),
        ]) as ReturnType<typeof fs.readFileSync>;
      }
      return result;
    },
    () => {
      assert.throws(
        () =>
          inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
            manifestPathForTest: cleanManifestLateOverride,
          }),
        /hallo_v3_fixed_state_drift/u,
        "hallo_v3_fixed_manifest_post_override_drift_must_fail_closed",
      );
      assert.ok(postOverrideFixedManifestReads >= 1);
    },
  );

  const cleanCandidateLateOverride = path.join(
    tempRoot,
    "task6-candidate-late-clean.json",
  );
  fs.copyFileSync(TASK6_CANDIDATE, cleanCandidateLateOverride);
  let candidateLateOverrideSeen = false;
  let postOverrideProtectedSentinelReads = 0;
  withTrackedFileReads(
    (resolvedPath, result) => {
      if (resolvedPath === path.resolve(cleanCandidateLateOverride)) {
        candidateLateOverrideSeen = true;
        return result;
      }
      if (
        resolvedPath === path.resolve(GERMAN_PROTECTED_V1_SENTINEL) &&
        candidateLateOverrideSeen
      ) {
        postOverrideProtectedSentinelReads += 1;
        return Buffer.concat([
          Buffer.isBuffer(result) ? result : Buffer.from(result),
          Buffer.from(" "),
        ]) as ReturnType<typeof fs.readFileSync>;
      }
      return result;
    },
    () => {
      assert.throws(
        () =>
          inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
            task6CandidatePathForTest: cleanCandidateLateOverride,
          }),
        /hallo_v3_german_v1_surface_drift|hallo_v3_fixed_state_drift|hallo_v3_protected_surface_entry/u,
        "hallo_v3_protected_surface_post_override_drift_must_fail_closed",
      );
      assert.ok(postOverrideProtectedSentinelReads >= 1);
    },
  );

  const forbidden = path.join(tempRoot, "forbidden.json");
  fs.writeFileSync(forbidden, "{}\n", "utf8");
  for (const key of [
    "task5CanonicalV3PathForTest",
    "task6CanonicalV3PathForTest",
    "packetPathForTest",
    "ruUkPathForTest",
    "audioPathForTest",
    "mockupPathForTest",
  ] as const) {
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
          [key]: forbidden,
        }),
      /hallo_v3_forbidden_output/u,
    );
  }

  const transientForbidden = path.join(tempRoot, "transient-forbidden.json");
  const originalLstatSyncForTransientForbidden = fs.lstatSync;
  const transientForbiddenStats = fs.lstatSync(forbidden);
  let transientManifestReads = 0;
  let transientForbiddenWasPresent = false;
  const hostileLstatSyncForTransientForbidden = ((candidate: fs.PathLike) => {
    if (
      path.resolve(candidate.toString()) === path.resolve(transientForbidden) &&
      transientManifestReads >= 2 &&
      transientManifestReads < 3
    ) {
      transientForbiddenWasPresent = true;
      return transientForbiddenStats;
    }
    return originalLstatSyncForTransientForbidden(candidate);
  }) as typeof fs.lstatSync;
  Object.defineProperty(fs, "lstatSync", {
    configurable: true,
    value: hostileLstatSyncForTransientForbidden,
  });
  try {
    withTrackedFileReads(
      (resolvedPath, result) => {
        if (resolvedPath === path.resolve(MANIFEST)) {
          transientManifestReads += 1;
        }
        return result;
      },
      () =>
        assert.throws(
          () =>
            inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
              packetPathForTest: transientForbidden,
            }),
          /hallo_v3_forbidden_output/u,
          "hallo_v3_transient_forbidden_output_must_fail_closed",
        ),
    );
    assert.equal(transientForbiddenWasPresent, true);
  } finally {
    Object.defineProperty(fs, "lstatSync", {
      configurable: true,
      value: originalLstatSyncForTransientForbidden,
    });
  }

  const hostileSourceEvidence = path.join(tempRoot, "source-evidence");
  fs.cpSync(SOURCE_EVIDENCE_ROOT, hostileSourceEvidence, { recursive: true });
  fs.appendFileSync(
    path.join(hostileSourceEvidence, "raw/goethe_a1_redemittel.pdf"),
    Buffer.from([0]),
  );
  assert.throws(
    () =>
      inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
        sourceEvidenceRootForTest: hostileSourceEvidence,
      }),
    /task7_hallo_raw_body/u,
  );

  const fixedCanonicalPath = path.join(
    ROOT,
    "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  );
  const originalLstatSyncForFixedForbidden = fs.lstatSync;
  const existingStatsForFixedForbidden = fs.lstatSync(forbidden);
  const hostileLstatForFixedForbidden = ((candidate: fs.PathLike) =>
    path.resolve(candidate.toString()) === path.resolve(fixedCanonicalPath)
      ? existingStatsForFixedForbidden
      : originalLstatSyncForFixedForbidden(candidate)) as typeof fs.lstatSync;
  Object.defineProperty(fs, "lstatSync", {
    configurable: true,
    value: hostileLstatForFixedForbidden,
  });
  try {
    assert.throws(
      () => inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(),
      /hallo_v3_forbidden_output/u,
    );
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
          task5CanonicalV3PathForTest: path.join(tempRoot, "absent.json"),
        }),
      /hallo_v3_forbidden_output/u,
    );
  } finally {
    Object.defineProperty(fs, "lstatSync", {
      configurable: true,
      value: originalLstatSyncForFixedForbidden,
    });
  }

  const lateForbidden = path.join(tempRoot, "late-forbidden.json");
  const originalLstatSyncForLateForbidden = fs.lstatSync;
  const existingStatsForLateForbidden = fs.lstatSync(forbidden);
  let lateForbiddenChecks = 0;
  const hostileLstatForLateForbidden = ((candidate: fs.PathLike) => {
    if (path.resolve(candidate.toString()) === path.resolve(lateForbidden)) {
      lateForbiddenChecks += 1;
      if (lateForbiddenChecks > 1) return existingStatsForLateForbidden;
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    }
    return originalLstatSyncForLateForbidden(candidate);
  }) as typeof fs.lstatSync;
  Object.defineProperty(fs, "lstatSync", {
    configurable: true,
    value: hostileLstatForLateForbidden,
  });
  try {
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
          packetPathForTest: lateForbidden,
        }),
      /hallo_v3_forbidden_output/u,
      "hallo_v3_late_forbidden_output_must_fail_closed",
    );
    assert.ok(lateForbiddenChecks >= 2);
  } finally {
    Object.defineProperty(fs, "lstatSync", {
      configurable: true,
      value: originalLstatSyncForLateForbidden,
    });
  }

  const brokenSymlinkLikeForbidden = path.join(
    tempRoot,
    "broken-symlink-like-forbidden.json",
  );
  const originalLstatSyncForBrokenForbidden = fs.lstatSync;
  const existingStatsForBrokenForbidden = fs.lstatSync(forbidden);
  const hostileLstatForBrokenForbidden = ((candidate: fs.PathLike) =>
    path.resolve(candidate.toString()) ===
    path.resolve(brokenSymlinkLikeForbidden)
      ? existingStatsForBrokenForbidden
      : originalLstatSyncForBrokenForbidden(candidate)) as typeof fs.lstatSync;
  Object.defineProperty(fs, "lstatSync", {
    configurable: true,
    value: hostileLstatForBrokenForbidden,
  });
  try {
    assert.throws(
      () =>
        inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
          packetPathForTest: brokenSymlinkLikeForbidden,
        }),
      /hallo_v3_forbidden_output/u,
      "hallo_v3_broken_symlink_directory_entry_must_fail_closed",
    );
  } finally {
    Object.defineProperty(fs, "lstatSync", {
      configurable: true,
      value: originalLstatSyncForBrokenForbidden,
    });
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

assert.throws(
  () =>
    inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
      callerSuppliedAuthority: true,
    } as never),
  /hallo_v3_options_schema/u,
);
assert.throws(
  () =>
    inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1({
      additionalGermanV1RelativePathsForHostileTest: [42],
    } as never),
  /hallo_v3_options_schema/u,
);

process.stdout.write(
  "HALLO_TASK5_TASK6_V3_MIGRATION_CANDIDATE_GATE PASS status=HOLD decision=PROPOSED_EXACT_SUCCESSOR_NOT_ACTIVATED plans=288 lexical=6 phrase=2 pronunciation=1 rowsPromoted=0 task7=false learner=false release=false cutover=NONE owner=PENDING\n",
);
