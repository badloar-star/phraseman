import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../policies/decision_registry";
import { inspectGermanTask7V2L01C01HalloSourceAllocationDeV1 } from "./task7_v2_l01_c01_hallo_allocation_de_v1";

type JsonRecord = Record<string, any>;
type RepoFileState = Readonly<{
  relativePath: string;
  realRelative: string;
  dev: string;
  ino: string;
  mode: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  sha256: string;
}>;
type FixedStateSnapshot = Readonly<{
  serialized: string;
  entriesByRelativePath: ReadonlyMap<string, RepoFileState>;
}>;

export type GermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateOptionsDeV1 =
  Readonly<{
    manifestPathForTest?: string;
    task5CandidatePathForTest?: string;
    task6CandidatePathForTest?: string;
    task5PathForTest?: string;
    task6PathForTest?: string;
    inventoryPathForTest?: string;
    ownerContractPathForTest?: string;
    extractionPathForTest?: string;
    sourceEvidenceRootForTest?: string;
    allowUnboundCandidateBytesForHostileTest?: boolean;
    task5CanonicalV3PathForTest?: string;
    task6CanonicalV3PathForTest?: string;
    packetPathForTest?: string;
    ruUkPathForTest?: string;
    audioPathForTest?: string;
    mockupPathForTest?: string;
    additionalGermanV1RelativePathsForHostileTest?: readonly string[];
  }>;

export type GermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateResultDeV1 =
  Readonly<{
    status: "HOLD";
    decision: "PROPOSED_EXACT_SUCCESSOR_NOT_ACTIVATED";
    sessionId: "de_l01_s01";
    sourcePlanId: "de_lex_plan_l01_c01_hallo_v2";
    phraseFrameId: "de_pf_l01_c01_hallo_v2";
    exactSurface: "Hallo!";
    task5PlanIds: 288;
    task6LexicalSenses: 6;
    task6PhraseFrames: 2;
    task6PronunciationTargets: 1;
    rowsPromoted: 0;
    task7Unlock: false;
    preauthoringAuthority: false;
    learnerFacing: false;
    releaseAuthorized: false;
    consumerCutover: "NONE";
    defaultConsumerChanged: false;
    ownerApproval: "PENDING";
  }>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_RELATIVE =
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1";
const MANIFEST_PATH = path.join(ROOT, EVIDENCE_RELATIVE, "manifest.json");
const TASK5_CANDIDATE_PATH = path.join(
  ROOT,
  EVIDENCE_RELATIVE,
  "task5_v3_candidate.json",
);
const TASK6_CANDIDATE_PATH = path.join(
  ROOT,
  EVIDENCE_RELATIVE,
  "task6_v3_candidate.json",
);
const TASK5_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const TASK6_V2_FILE = `${["task6", "canonical", "registry", "de", "v2"].join(
  "_",
)}.json`;
const TASK6_V2_RELATIVE_PATH = `modules/learning-v2/curriculum/de/registries/${TASK6_V2_FILE}`;
const TASK6_PATH = path.join(ROOT, TASK6_V2_RELATIVE_PATH);
const INVENTORY_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
);
const OWNER_CONTRACT_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/owner_decisions_contract_de_v1.ts",
);
const EXTRACTION_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/extraction_map.json",
);
const INPUT = Object.freeze({
  task5Byte: "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  task5Canonical:
    "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3",
  task6Byte: "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
  task6Canonical:
    "08d18d36fe225e06ca992e7c862036604cb4d78e07eaa6ed7ce7b80db670c880",
  inventory: "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  owner: "4fbbfe8c0412574ed94a5202b7513cdc5b092b74ccda55fd38b880eb2e301e6f",
  sourceManifest:
    "674f789c05922ddce29103393228ee26f4c428255baf4fc646b90c95b97bfd33",
  extraction:
    "3b0ab0c32c3dd8bb42b2c22f0f43bc514272f23c60c97003334418f5afaaabad",
  priorHold: "45778ef06b4eddceaa3ede01e83e95225731b9786cbd39868650add6980259a5",
  priorHoldInspector:
    "627e19ebc533a0372e98f282e4c15687953afed2d040e3e84dc65c936827b019",
  sourceInspector:
    "71e96a433e2906ffd86e05aa0ea42a09300c1d83a46ecae680bfa842a637e5aa",
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

const CANDIDATE = Object.freeze({
  task5Byte: "9cddb7abd7c3564d9ffb46ddfd2600d1dd1b5c2812ac9e6ea79f9625cf58f491",
  task5Canonical:
    "7493df040da25bb9c9cbc741da6e927904a1fdc323e5e2a456e1405b929d6d7e",
  task6Byte: "f7d8d8761179f9546d31d00ed95a53518f4b9aa9050bdf39620145799ff260a2",
  task6Canonical:
    "03e4192611e3f180339a385869ebf1b82b46e4f6698ea81b18c8e4088885109f",
  fingerprint:
    "cef7eda9c302bee8d89f8a25bb5ca49eaf2d0a97df1fb270c0b489f7bbb77326",
});

const CORRECTION_QUARTET = Object.freeze([
  Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_v1/candidate.json",
    sha256: "31eb560eb2efce736c7d96d643fdad46f8796b55aa222e8b6a3c5702f21ca79a",
  }),
  Object.freeze({
    path: "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_correction_candidate_de_v1.ts",
    sha256: "ebdcc450e9ac07ab21ca51efacbdf1b74b053eaa8739a2bee7e91f4266cbe75c",
  }),
  Object.freeze({
    path: "tests/learning_v2_de_task7_v2_l01_c01_hallo_task5_task6_correction_candidate_gate.ts",
    sha256: "ba6d82ec429d345c2d2d1f18e9d36162d1f94743496e611749b3b748000585ac",
  }),
  Object.freeze({
    path: "docs/v2/curriculum/de/TASK7_V2_L01C01_HALLO_TASK5_TASK6_CORRECTION_CANDIDATE_2026-10-12.md",
    sha256: "3c95eafef3ccb61acea2afd53d7a80da267100f5eafb8ec84cbec0a9caef5e04",
  }),
]);

const PROPOSED_BINDING = Object.freeze({
  chapterId: "de_l01_c01",
  oldSourcePlanId: "de_lex_plan_l01_c01_hallo_v1",
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v2",
  oldPhraseFrameId: "de_pf_l01_c01_hallo_nachbarin_v1",
  phraseFrameId: "de_pf_l01_c01_hallo_v2",
  exactSurface: "Hallo!",
  plannedFirstUsePacketId: "de_l01_c01_s08",
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

function clone<T>(value: T): T {
  return JSON.parse(canonicalJsonV1(value)) as T;
}

function sha256(bytes: Buffer | string): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

export function normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
  relativePath: string,
  platformSeparator: string = path.sep,
): string {
  const platformNormalized =
    platformSeparator === "\\"
      ? relativePath.split(platformSeparator).join("/")
      : relativePath;
  return path.posix.normalize(platformNormalized);
}

export function isGermanTask7V2ProtectedV1PathDeV1(
  relativePath: string,
  exclusions: ReadonlySet<string>,
): boolean {
  return (
    relativePath.toLowerCase().includes("_v1") && !exclusions.has(relativePath)
  );
}

function validateClosedGermanV1Exclusions(): ReadonlySet<string> {
  const paths = EXPECTED_GERMAN_V1_SURFACE.excludedPaths;
  const exclusions = new Set(paths);
  const rootRealPath = fs.realpathSync(ROOT);
  if (paths.length !== 17 || exclusions.size !== 17) {
    fail("hallo_v3_german_v1_surface_binding");
  }
  for (const relativePath of paths) {
    const target = path.join(ROOT, relativePath);
    const targetStats = fs.existsSync(target) ? fs.lstatSync(target) : null;
    const targetRealPath = targetStats ? fs.realpathSync(target) : "";
    const targetFromRoot = targetRealPath
      ? path.relative(rootRealPath, targetRealPath)
      : "";
    if (
      relativePath.includes("\\") ||
      relativePath !==
        normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
          relativePath,
          "/",
        ) ||
      path.posix.isAbsolute(relativePath) ||
      relativePath.startsWith("./") ||
      relativePath.startsWith("../") ||
      !relativePath.startsWith(`${EXPECTED_GERMAN_V1_SURFACE.root}/`) ||
      targetStats === null ||
      targetStats.isSymbolicLink() ||
      !targetStats.isFile() ||
      targetFromRoot === "" ||
      targetFromRoot === ".." ||
      targetFromRoot.startsWith(`..${path.sep}`) ||
      path.isAbsolute(targetFromRoot)
    ) {
      fail("hallo_v3_german_v1_surface_binding");
    }
  }
  return exclusions;
}

function readStableRepoFile(
  file: string,
  relativePath: string,
  rootRealPath: string,
  code: string,
): Readonly<{ state: RepoFileState; bytes: Buffer }> {
  let descriptor: number | undefined;
  try {
    const statsBefore = fs.lstatSync(file);
    const realPathBefore = fs.realpathSync(file);
    const realRelative = path.relative(rootRealPath, realPathBefore);
    if (
      statsBefore.isSymbolicLink() ||
      !statsBefore.isFile() ||
      realRelative === "" ||
      realRelative === ".." ||
      realRelative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(realRelative)
    ) {
      fail(code);
    }
    const noFollow =
      (
        fs.constants as typeof fs.constants & {
          readonly O_NOFOLLOW?: number;
        }
      ).O_NOFOLLOW ?? 0;
    descriptor = fs.openSync(file, fs.constants.O_RDONLY | noFollow);
    const handleBefore = fs.fstatSync(descriptor);
    const bytes = fs.readFileSync(descriptor);
    const handleAfter = fs.fstatSync(descriptor);
    const statsAfter = fs.lstatSync(file);
    const realPathAfter = fs.realpathSync(file);
    const identity = (stats: fs.Stats) =>
      Object.freeze({
        dev: String(stats.dev),
        ino: String(stats.ino),
        mode: stats.mode,
        size: stats.size,
        mtimeMs: stats.mtimeMs,
        ctimeMs: stats.ctimeMs,
      });
    const expectedIdentity = identity(statsBefore);
    if (
      !handleBefore.isFile() ||
      statsAfter.isSymbolicLink() ||
      !statsAfter.isFile() ||
      canonicalJsonV1(identity(handleBefore)) !==
        canonicalJsonV1(expectedIdentity) ||
      canonicalJsonV1(identity(handleAfter)) !==
        canonicalJsonV1(expectedIdentity) ||
      canonicalJsonV1(identity(statsAfter)) !==
        canonicalJsonV1(expectedIdentity) ||
      realPathAfter !== realPathBefore
    ) {
      fail(code);
    }
    return Object.freeze({
      state: Object.freeze({
        relativePath,
        realRelative: normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
          realRelative,
          path.sep,
        ),
        ...expectedIdentity,
        sha256: sha256(bytes),
      }),
      bytes,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === code) throw error;
    fail(code);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  return fail(code);
}

function snapshotRegularRepoFile(
  file: string,
  relativePath: string,
  rootRealPath: string,
  code: string,
): RepoFileState {
  return readStableRepoFile(file, relativePath, rootRealPath, code).state;
}

function withStableFixedRepoPathReads<T>(
  fixedEntries: ReadonlyMap<string, RepoFileState>,
  readFixedBytes: (file: string) => Buffer,
  run: () => T,
): T {
  const priorReadFileSync = fs.readFileSync;
  const stableReadFileSync = ((
    candidate: fs.PathOrFileDescriptor,
    options?: Parameters<typeof fs.readFileSync>[1],
  ): ReturnType<typeof fs.readFileSync> => {
    if (typeof candidate !== "number") {
      const resolvedPath = path.resolve(candidate.toString());
      const relativePath = normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
        path.relative(ROOT, resolvedPath),
        path.sep,
      );
      if (fixedEntries.has(relativePath)) {
        const bytes = readFixedBytes(resolvedPath);
        const encoding =
          typeof options === "string"
            ? options
            : options && typeof options === "object" && "encoding" in options
              ? options.encoding
              : null;
        return (
          typeof encoding === "string"
            ? bytes.toString(encoding as BufferEncoding)
            : bytes
        ) as ReturnType<typeof fs.readFileSync>;
      }
    }
    return priorReadFileSync(candidate, options as never) as ReturnType<
      typeof fs.readFileSync
    >;
  }) as typeof fs.readFileSync;
  fs.readFileSync = stableReadFileSync;
  try {
    return run();
  } finally {
    fs.readFileSync = priorReadFileSync;
  }
}

function surfaceDigest(
  files: readonly string[],
  expectedEntries?: ReadonlyMap<string, RepoFileState>,
): {
  count: number;
  sha256: string;
} {
  const digest = crypto.createHash("sha256");
  const rootRealPath = fs.realpathSync(ROOT);
  const entries = files
    .map((file) => ({
      file,
      relative: normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
        path.relative(ROOT, file),
        path.sep,
      ),
    }))
    .sort((left, right) => left.relative.localeCompare(right.relative));
  for (const { file, relative } of entries) {
    const entry = snapshotRegularRepoFile(
      file,
      relative,
      rootRealPath,
      "hallo_v3_protected_surface_entry",
    );
    const expectedEntry = expectedEntries?.get(relative);
    if (
      expectedEntries &&
      (!expectedEntry ||
        canonicalJsonV1(entry) !== canonicalJsonV1(expectedEntry))
    ) {
      fail("hallo_v3_fixed_state_drift");
    }
    digest.update(relative);
    digest.update("\0");
    digest.update(entry.sha256);
    digest.update("\0");
  }
  return { count: entries.length, sha256: digest.digest("hex") };
}

function validateProtectedSurfaces(
  value: unknown,
  additionalGermanV1RelativePathsForHostileTest: readonly string[],
  expectedEntries?: ReadonlyMap<string, RepoFileState>,
): void {
  record(value, "hallo_v3_protected_surface_binding");
  exactObject(
    value,
    { english: EXPECTED_ENGLISH_SURFACE, germanV1: EXPECTED_GERMAN_V1_SURFACE },
    "hallo_v3_protected_surface_binding",
  );
  const english = surfaceDigest(
    EXPECTED_ENGLISH_SURFACE.roots.flatMap((root) =>
      walk(path.join(ROOT, root)),
    ),
    expectedEntries,
  );
  if (
    english.count !== EXPECTED_ENGLISH_SURFACE.fileCount ||
    english.sha256 !== EXPECTED_ENGLISH_SURFACE.sha256
  ) {
    fail("hallo_v3_english_surface_drift");
  }
  const exclusions = validateClosedGermanV1Exclusions();
  const germanV1 = walk(
    path.join(ROOT, EXPECTED_GERMAN_V1_SURFACE.root),
  ).filter((file) => {
    const relative = normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
      path.relative(ROOT, file),
      path.sep,
    );
    return isGermanTask7V2ProtectedV1PathDeV1(relative, exclusions);
  });
  const german = surfaceDigest(germanV1, expectedEntries);
  if (
    german.count !== EXPECTED_GERMAN_V1_SURFACE.fileCount ||
    german.sha256 !== EXPECTED_GERMAN_V1_SURFACE.sha256
  ) {
    fail("hallo_v3_german_v1_surface_drift");
  }
  if (
    additionalGermanV1RelativePathsForHostileTest.some((relativePath) =>
      isGermanTask7V2ProtectedV1PathDeV1(relativePath, exclusions),
    )
  ) {
    fail("hallo_v3_german_v1_surface_drift");
  }
}

function fixedStateSnapshot(): FixedStateSnapshot {
  const rootRealPath = fs.realpathSync(ROOT);
  const excludedPaths = new Set(EXPECTED_GERMAN_V1_SURFACE.excludedPaths);
  const englishProtectedFiles = EXPECTED_ENGLISH_SURFACE.roots.flatMap((root) =>
    walk(path.join(ROOT, root)),
  );
  const germanProtectedFiles = walk(
    path.join(ROOT, EXPECTED_GERMAN_V1_SURFACE.root),
  ).filter((file) => {
    const relativePath = normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
      path.relative(ROOT, file),
      path.sep,
    );
    return isGermanTask7V2ProtectedV1PathDeV1(relativePath, excludedPaths);
  });
  const protectedPaths = new Set(
    [...englishProtectedFiles, ...germanProtectedFiles].map((file) =>
      normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
        path.relative(ROOT, file),
        path.sep,
      ),
    ),
  );
  const relativePaths = [
    normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
      path.relative(ROOT, TASK5_PATH),
      path.sep,
    ),
    TASK6_V2_RELATIVE_PATH,
    normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
      path.relative(ROOT, INVENTORY_PATH),
      path.sep,
    ),
    normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
      path.relative(ROOT, OWNER_CONTRACT_PATH),
      path.sep,
    ),
    normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
      path.relative(ROOT, EXTRACTION_PATH),
      path.sep,
    ),
    ...EXPECTED_GERMAN_V1_SURFACE.excludedPaths,
    ...CORRECTION_QUARTET.map((artifact) => artifact.path),
    ...protectedPaths,
  ];
  const uniquePaths = [...new Set(relativePaths)].sort();
  const entries = uniquePaths.map((relativePath) =>
    snapshotRegularRepoFile(
      path.join(ROOT, relativePath),
      relativePath,
      rootRealPath,
      protectedPaths.has(relativePath)
        ? "hallo_v3_protected_surface_entry"
        : excludedPaths.has(relativePath)
          ? "hallo_v3_german_v1_surface_binding"
          : "hallo_v3_fixed_state_drift",
    ),
  );
  return Object.freeze({
    serialized: canonicalJsonV1(entries),
    entriesByRelativePath: new Map(
      entries.map((entry) => [entry.relativePath, entry] as const),
    ),
  });
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
  expectedSha: string,
  code: string,
): JsonRecord {
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== expectedSha) fail(code);
  return parseJson(bytes, `${code}_json`);
}

function validateOptions(value: unknown): void {
  record(value, "hallo_v3_options_schema");
  const allowed = new Set([
    "manifestPathForTest",
    "task5CandidatePathForTest",
    "task6CandidatePathForTest",
    "task5PathForTest",
    "task6PathForTest",
    "inventoryPathForTest",
    "ownerContractPathForTest",
    "extractionPathForTest",
    "sourceEvidenceRootForTest",
    "allowUnboundCandidateBytesForHostileTest",
    "task5CanonicalV3PathForTest",
    "task6CanonicalV3PathForTest",
    "packetPathForTest",
    "ruUkPathForTest",
    "audioPathForTest",
    "mockupPathForTest",
    "additionalGermanV1RelativePathsForHostileTest",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    fail("hallo_v3_options_schema");
  }
  if (
    value.additionalGermanV1RelativePathsForHostileTest !== undefined &&
    (!Array.isArray(value.additionalGermanV1RelativePathsForHostileTest) ||
      value.additionalGermanV1RelativePathsForHostileTest.some(
        (relativePath: unknown) => typeof relativePath !== "string",
      ))
  ) {
    fail("hallo_v3_options_schema");
  }
}

function expectedTask5(upstream: JsonRecord): JsonRecord {
  const value = clone(upstream);
  value.schemaVersion = "learning-v2-german-chapter-blueprints.v3";
  const lesson = value.lessons.find(
    (row: JsonRecord) => row.lessonId === "de_l01",
  );
  if (!lesson) fail("hallo_v3_task5_topology");
  const chapter = lesson.chapters.find(
    (row: JsonRecord) => row.id === "de_l01_c01",
  );
  if (!chapter) fail("hallo_v3_task5_topology");
  const matches = chapter.checkpoint.plannedNewLexicalSenses.filter(
    (row: JsonRecord) => row.id === "de_lex_plan_l01_c01_hallo_v1",
  );
  if (matches.length !== 1) fail("hallo_v3_task5_topology");
  const plan = matches[0];
  plan.id = "de_lex_plan_l01_c01_hallo_v2";
  plan.semanticIdentity = "hallo|colloquial greeting on meeting";
  plan.senseGloss = "colloquial greeting on meeting";
  plan.utilityProof.facetValue = "recognise-a-colloquial-greeting";
  chapter.checkpoint.newSituation.goal = "recognise-a-colloquial-greeting";
  chapter.checkpoint.newSituation.contextSignature =
    "colloquial-greeting-building-entrance";
  return value;
}

function expectedTask6(upstream: JsonRecord): JsonRecord {
  const value = clone(upstream);
  value.schemaVersion = "learning-v2-german-task6-canonical-registry.v3";
  const phraseMatches = value.registry.phraseFrames.filter(
    (row: JsonRecord) => row.id === "de_pf_l01_c01_hallo_nachbarin_v1",
  );
  if (phraseMatches.length !== 1) fail("hallo_v3_task6_topology");
  const phrase = phraseMatches[0];
  phrase.id = "de_pf_l01_c01_hallo_v2";
  phrase.frame = "Hallo!";
  phrase.lexicalSenseIds = [];
  const mappingMatches = value.authorityContext.phraseFrameMappings.filter(
    (row: JsonRecord) => row.sourceChapterId === "de_l01_c01",
  );
  if (mappingMatches.length !== 1) fail("hallo_v3_task6_topology");
  mappingMatches[0].canonicalId = "de_pf_l01_c01_hallo_v2";
  return value;
}

function allTask5Plans(value: JsonRecord): JsonRecord[] {
  return value.lessons.flatMap((lesson: JsonRecord) =>
    lesson.chapters.flatMap(
      (chapter: JsonRecord) => chapter.checkpoint.plannedNewLexicalSenses,
    ),
  ) as JsonRecord[];
}

function validateTask5Candidate(
  candidate: JsonRecord,
  upstream: JsonRecord,
): void {
  const plans = allTask5Plans(candidate);
  if (plans.length !== 288) fail("hallo_v3_task5_exact_copy");
  const matches = plans.filter(
    (row) => row.id === "de_lex_plan_l01_c01_hallo_v2",
  );
  if (matches.length !== 1) fail("hallo_v3_task5_exact_copy");
  const plan = matches[0];
  if (
    plan.semanticIdentity === "hallo|neutral informal greeting on meeting" ||
    plan.senseGloss === "neutral informal greeting on meeting" ||
    plan.utilityProof?.facetValue === "recognise-a-neutral-greeting"
  ) {
    fail("hallo_v3_neutral_forbidden");
  }
  if (canonicalJsonV1(candidate) !== canonicalJsonV1(expectedTask5(upstream))) {
    fail("hallo_v3_task5_exact_copy");
  }
}

function validateTask6Candidate(
  candidate: JsonRecord,
  upstream: JsonRecord,
): void {
  const phraseMatches = candidate.registry.phraseFrames.filter(
    (row: JsonRecord) => row.id === "de_pf_l01_c01_hallo_v2",
  );
  if (phraseMatches.length !== 1) fail("hallo_v3_task6_exact_copy");
  const phrase = phraseMatches[0];
  if (/[,]|Nachbarin|Anna/u.test(phrase.frame)) {
    fail("hallo_v3_composite_or_vocative_forbidden");
  }
  if (phrase.frame !== "Hallo!") fail("hallo_v3_exact_surface");
  if (
    !Array.isArray(phrase.lexicalSenseIds) ||
    phrase.lexicalSenseIds.length !== 0
  ) {
    fail("hallo_v3_lexical_senses_forbidden");
  }
  if (canonicalJsonV1(candidate) !== canonicalJsonV1(expectedTask6(upstream))) {
    fail("hallo_v3_task6_exact_copy");
  }
}

function exactObject(value: unknown, expected: unknown, code: string): void {
  if (canonicalJsonV1(value) !== canonicalJsonV1(expected)) fail(code);
}

function validateManifestSchema(manifest: JsonRecord): void {
  exactKeys(
    manifest,
    [
      "schemaVersion",
      "status",
      "decision",
      "inputBindings",
      "candidateFiles",
      "proposedBinding",
      "sourceBoundary",
      "candidateFingerprint",
      "authority",
      "inventory",
      "reviews",
    ],
    "hallo_v3_manifest_schema",
  );
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c01-hallo-task5-task6-v3-migration-candidate.v1" ||
    manifest.status !== "HOLD" ||
    manifest.decision !== "PROPOSED_EXACT_SUCCESSOR_NOT_ACTIVATED"
  ) {
    fail("hallo_v3_manifest_schema");
  }
}

function validateManifestBindings(
  manifest: JsonRecord,
  additionalGermanV1RelativePathsForHostileTest: readonly string[],
  expectedEntries?: ReadonlyMap<string, RepoFileState>,
): void {
  const bindings = manifest.inputBindings;
  record(bindings, "hallo_v3_input_bindings");
  exactKeys(
    bindings,
    [
      "task5V2",
      "task6V2",
      "task7Inventory",
      "ownerContract",
      "protectedSurfaces",
      "correctionQuartet",
      "sourceEvidence",
    ],
    "hallo_v3_input_bindings",
  );
  exactObject(
    bindings.task5V2,
    {
      path: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
      schemaVersion: "learning-v2-german-chapter-blueprints.v2",
      byteSha256: INPUT.task5Byte,
      canonicalBodySha256: INPUT.task5Canonical,
    },
    "hallo_v3_task5_binding",
  );
  exactObject(
    bindings.task6V2,
    {
      path: TASK6_V2_RELATIVE_PATH,
      schemaVersion: "learning-v2-german-task6-canonical-registry.v2",
      byteSha256: INPUT.task6Byte,
      canonicalBodySha256: INPUT.task6Canonical,
    },
    "hallo_v3_task6_binding",
  );
  exactObject(
    bindings.task7Inventory,
    {
      path: "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
      byteSha256: INPUT.inventory,
    },
    "hallo_v3_inventory_binding",
  );
  record(bindings.ownerContract, "hallo_v3_owner_pending");
  if (bindings.ownerContract.blueprintApproval !== "PENDING") {
    fail("hallo_v3_owner_pending");
  }
  exactObject(
    bindings.ownerContract,
    {
      path: "modules/learning-v2/curriculum/de/owner_decisions_contract_de_v1.ts",
      byteSha256: INPUT.owner,
      blueprintApproval: "PENDING",
    },
    "hallo_v3_owner_pending",
  );
  validateProtectedSurfaces(
    bindings.protectedSurfaces,
    additionalGermanV1RelativePathsForHostileTest,
    expectedEntries,
  );
  exactObject(
    bindings.correctionQuartet,
    CORRECTION_QUARTET,
    "hallo_v3_correction_binding",
  );
  exactObject(
    bindings.sourceEvidence,
    {
      manifest: {
        path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/manifest.json",
        sha256: INPUT.sourceManifest,
      },
      extraction: {
        path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/extraction_map.json",
        sha256: INPUT.extraction,
      },
      priorHold: {
        path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1/adjudication.json",
        sha256: INPUT.priorHold,
      },
      priorHoldInspector: {
        path: "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_phrase_authority_hold_de_v1.ts",
        sha256: INPUT.priorHoldInspector,
      },
      inspector: {
        path: "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1.ts",
        sha256: INPUT.sourceInspector,
      },
    },
    "hallo_v3_source_binding",
  );
}

function validateSourceBoundary(
  manifest: JsonRecord,
  extraction: JsonRecord,
): void {
  if (
    manifest.sourceBoundary?.cefrEvidenceRole !==
    "GENERAL_CEFR_SCOPE_NOT_EXACT_ATTESTATION"
  ) {
    fail("hallo_v3_cefr_exact_attestation_forbidden");
  }
  exactObject(
    manifest.sourceBoundary,
    {
      sourceSupport: "GOETHE_EXACT_ALTERNATIVE_SURFACE_OCCURRENCE_ONLY",
      goetheMatchMode: "EXACT_TRIMMED_SLASH_ALTERNATIVE",
      goetheExactAlternative: "Hallo!",
      cefrEvidenceRole: "GENERAL_CEFR_SCOPE_NOT_EXACT_ATTESTATION",
    },
    "hallo_v3_source_boundary",
  );
  const occurrence = extraction.extractions?.goetheOccurrence?.text;
  if (
    typeof occurrence !== "string" ||
    occurrence
      .split("/")
      .map((part: string) => part.trim())
      .filter((part: string) => part === "Hallo!").length !== 1
  ) {
    fail("hallo_v3_source_boundary");
  }
}

function validateAuthority(manifest: JsonRecord): void {
  exactObject(
    manifest.proposedBinding,
    PROPOSED_BINDING,
    "hallo_v3_plan_frame_binding",
  );
  exactObject(
    manifest.authority,
    {
      canonicalAdmission: false,
      inventoryResolutionApplied: false,
      rowsPromoted: 0,
      task7Unlock: false,
      preauthoringAuthority: false,
      learnerFacing: false,
      releaseAuthorized: false,
      consumerCutover: "NONE",
      defaultConsumerChanged: false,
    },
    "hallo_v3_hold_boundary",
  );
  exactObject(
    manifest.inventory,
    {
      task5PlanIds: 288,
      resolvedPlanIds: 6,
      unresolvedPlanIds: 282,
      packetIds: 1792,
      materializedPackets: 0,
    },
    "hallo_v3_inventory",
  );
  if (manifest.reviews?.ownerApproval !== "PENDING")
    fail("hallo_v3_owner_pending");
  exactObject(
    manifest.reviews,
    {
      ownerApproval: "PENDING",
      nativeReview: "REQUIRED",
      specReview: "REQUIRED",
      adversarialReview: "BLOCKED_UNTIL_NATIVE_AND_SPEC_PASS",
    },
    "hallo_v3_reviews",
  );
}

function verifyBoundArtifacts(
  options: GermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateOptionsDeV1,
  checkpoint: () => void = () => undefined,
  readFixedBytes: (file: string) => Buffer = (file) => fs.readFileSync(file),
): void {
  const sourceInspectorPath = path.join(
    ROOT,
    "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1.ts",
  );
  if (sha256(readFixedBytes(sourceInspectorPath)) !== INPUT.sourceInspector) {
    fail("hallo_v3_source_inspector_drift");
  }
  inspectGermanTask7V2L01C01HalloSourceAllocationDeV1();
  checkpoint();
  if (options.sourceEvidenceRootForTest) {
    checkpoint();
    inspectGermanTask7V2L01C01HalloSourceAllocationDeV1({
      evidenceRootForTest: options.sourceEvidenceRootForTest,
    });
    checkpoint();
  }
  const inventoryBytes = readFixedBytes(INVENTORY_PATH);
  if (sha256(inventoryBytes) !== INPUT.inventory)
    fail("hallo_v3_inventory_input_drift");
  const inventory = parseJson(inventoryBytes, "hallo_v3_inventory_input_drift");
  let inventoryOverride = inventory;
  if (options.inventoryPathForTest) {
    checkpoint();
    inventoryOverride = readBoundJson(
      options.inventoryPathForTest,
      INPUT.inventory,
      "hallo_v3_inventory_input_drift",
    );
    checkpoint();
  }
  exactObject(
    inventoryOverride.counts,
    {
      task5PlanIds: 288,
      resolvedPlanIds: 6,
      unresolvedPlanIds: 282,
      packetIds: 1792,
      materializedPackets: 0,
    },
    "hallo_v3_inventory_input_drift",
  );
  if (
    inventoryOverride.status !== "V2_AUTHORITY_MIGRATED_PARTIAL" ||
    inventoryOverride.authority?.fullAllocationAuthority !== false ||
    inventoryOverride.authority?.preauthoringAuthority !== false ||
    inventoryOverride.authority?.task7Unlock !== false ||
    inventoryOverride.authority?.learnerFacing !== false ||
    inventoryOverride.authority?.releaseAuthorized !== false ||
    inventoryOverride.authority?.consumerCutover !== "NONE"
  ) {
    fail("hallo_v3_inventory_input_drift");
  }
  checkpoint();
  const ownerBytes = readFixedBytes(OWNER_CONTRACT_PATH);
  if (sha256(ownerBytes) !== INPUT.owner) fail("hallo_v3_owner_input_drift");
  if (options.ownerContractPathForTest) {
    checkpoint();
    const ownerOverrideBytes = fs.readFileSync(
      options.ownerContractPathForTest,
    );
    if (sha256(ownerOverrideBytes) !== INPUT.owner)
      fail("hallo_v3_owner_input_drift");
    checkpoint();
  }
  checkpoint();
  for (const artifact of CORRECTION_QUARTET) {
    const bytes = readFixedBytes(path.join(ROOT, artifact.path));
    if (sha256(bytes) !== artifact.sha256)
      fail("hallo_v3_correction_input_drift");
  }
  checkpoint();
  for (const [relative, expected] of [
    [
      "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/manifest.json",
      INPUT.sourceManifest,
    ],
    [
      "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1/adjudication.json",
      INPUT.priorHold,
    ],
    [
      "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_phrase_authority_hold_de_v1.ts",
      INPUT.priorHoldInspector,
    ],
  ] as const) {
    if (sha256(readFixedBytes(path.join(ROOT, relative))) !== expected) {
      fail("hallo_v3_source_input_drift");
    }
  }
  checkpoint();
}

function forbiddenOutputPaths(
  options: GermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateOptionsDeV1,
): readonly string[] {
  return [
    path.join(
      ROOT,
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
    ),
    path.join(
      ROOT,
      "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json",
    ),
    path.join(
      ROOT,
      "content/learning-v2-course/curriculum/de/packets/l01/s01.json",
    ),
    path.join(
      ROOT,
      "content/learning-v2-course/release/de/l01/s01/learner.json",
    ),
    path.join(ROOT, "content/learning-v2-course/audio/de/l01/s01"),
    path.join(
      ROOT,
      "content/learning-v2-course/mockup/reviewed-source/de/l01/s01",
    ),
    options.task5CanonicalV3PathForTest,
    options.task6CanonicalV3PathForTest,
    options.packetPathForTest,
    options.ruUkPathForTest,
    options.audioPathForTest,
    options.mockupPathForTest,
  ].filter((candidate): candidate is string => typeof candidate === "string");
}

function forbiddenOutputSnapshot(
  options: GermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateOptionsDeV1,
): readonly Readonly<{ path: string; exists: boolean }>[] {
  const pathEntryExists = (candidate: string): boolean => {
    try {
      fs.lstatSync(candidate);
      return true;
    } catch (error: unknown) {
      const code =
        error !== null && typeof error === "object" && "code" in error
          ? (error as { code?: unknown }).code
          : undefined;
      if (code === "ENOENT" || code === "ENOTDIR") return false;
      throw error;
    }
  };
  return forbiddenOutputPaths(options).map((candidate) =>
    Object.freeze({ path: candidate, exists: pathEntryExists(candidate) }),
  );
}

function rejectForbiddenOutputs(
  snapshot: readonly Readonly<{ path: string; exists: boolean }>[],
): void {
  if (snapshot.some((candidate) => candidate.exists)) {
    fail("hallo_v3_forbidden_output");
  }
}

function inspect(
  options: GermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateOptionsDeV1,
): Readonly<{ manifest: JsonRecord; task5: JsonRecord; task6: JsonRecord }> {
  validateOptions(options);
  const forbiddenOutputsAtStart = forbiddenOutputSnapshot(options);
  rejectForbiddenOutputs(forbiddenOutputsAtStart);
  const fixedStateAtStart = fixedStateSnapshot();
  const rootRealPath = fs.realpathSync(ROOT);
  const readFixedBytes = (file: string): Buffer => {
    const relativePath = normalizeGermanTask7V2V3RepoRelativePathForAuditDeV1(
      path.relative(ROOT, file),
      path.sep,
    );
    const expected = fixedStateAtStart.entriesByRelativePath.get(relativePath);
    const current = readStableRepoFile(
      file,
      relativePath,
      rootRealPath,
      "hallo_v3_fixed_state_drift",
    );
    if (
      !expected ||
      canonicalJsonV1(current.state) !== canonicalJsonV1(expected)
    ) {
      fail("hallo_v3_fixed_state_drift");
    }
    return current.bytes;
  };
  const assertForbiddenOutputsStable = (): void => {
    const checkpoint = forbiddenOutputSnapshot(options);
    rejectForbiddenOutputs(checkpoint);
    if (
      canonicalJsonV1(forbiddenOutputsAtStart) !== canonicalJsonV1(checkpoint)
    ) {
      fail("hallo_v3_forbidden_output");
    }
  };
  const validateInjected = <T>(validation: () => T): T => {
    assertForbiddenOutputsStable();
    const value = validation();
    assertForbiddenOutputsStable();
    return value;
  };
  const validateManifest = (manifestPath: string): JsonRecord => {
    const value = parseJson(
      path.resolve(manifestPath) === path.resolve(MANIFEST_PATH)
        ? readFixedBytes(MANIFEST_PATH)
        : fs.readFileSync(manifestPath),
      "hallo_v3_manifest_json",
    );
    validateManifestSchema(value);
    validateManifestBindings(
      value,
      options.additionalGermanV1RelativePathsForHostileTest ?? [],
      fixedStateAtStart.entriesByRelativePath,
    );
    validateAuthority(value);
    return value;
  };
  const fixedManifest = validateManifest(MANIFEST_PATH);
  assertForbiddenOutputsStable();
  const manifestOverridePath = options.manifestPathForTest;
  const manifest = manifestOverridePath
    ? validateInjected(() => validateManifest(manifestOverridePath))
    : fixedManifest;

  const readTask5 = (task5Path: string, fixed = false): JsonRecord => {
    const bytes = fixed
      ? readFixedBytes(task5Path)
      : fs.readFileSync(task5Path);
    const value = parseJson(bytes, "hallo_v3_task5_input_drift");
    if (sha256(bytes) !== INPUT.task5Byte) fail("hallo_v3_task5_input_drift");
    if (hashCanonicalBody(value) !== INPUT.task5Canonical)
      fail("hallo_v3_task5_input_drift");
    return value;
  };
  const readTask6 = (task6Path: string, fixed = false): JsonRecord => {
    const bytes = fixed
      ? readFixedBytes(task6Path)
      : fs.readFileSync(task6Path);
    const value = parseJson(bytes, "hallo_v3_task6_input_drift");
    if (sha256(bytes) !== INPUT.task6Byte) fail("hallo_v3_task6_input_drift");
    if (hashCanonicalBody(value) !== INPUT.task6Canonical)
      fail("hallo_v3_task6_input_drift");
    return value;
  };
  const fixedTask5Upstream = readTask5(TASK5_PATH, true);
  const fixedTask6Upstream = readTask6(TASK6_PATH, true);
  assertForbiddenOutputsStable();
  const task5OverridePath = options.task5PathForTest;
  const task6OverridePath = options.task6PathForTest;
  const task5Upstream = task5OverridePath
    ? validateInjected(() => readTask5(task5OverridePath))
    : fixedTask5Upstream;
  const task6Upstream = task6OverridePath
    ? validateInjected(() => readTask6(task6OverridePath))
    : fixedTask6Upstream;
  assertForbiddenOutputsStable();
  withStableFixedRepoPathReads(
    fixedStateAtStart.entriesByRelativePath,
    readFixedBytes,
    () =>
      verifyBoundArtifacts(
        options,
        assertForbiddenOutputsStable,
        readFixedBytes,
      ),
  );

  const readCandidate = (
    candidatePath: string,
    kind: "task5" | "task6",
    allowUnbound: boolean,
    fixed = false,
  ): JsonRecord => {
    const bytes = fixed
      ? readFixedBytes(candidatePath)
      : fs.readFileSync(candidatePath);
    const value = parseJson(bytes, `hallo_v3_${kind}_candidate_json`);
    if (allowUnbound) return value;
    const expectedByte =
      kind === "task5" ? CANDIDATE.task5Byte : CANDIDATE.task6Byte;
    const expectedCanonical =
      kind === "task5" ? CANDIDATE.task5Canonical : CANDIDATE.task6Canonical;
    if (
      sha256(bytes) !== expectedByte ||
      hashCanonicalBody(value) !== expectedCanonical
    )
      fail(`hallo_v3_${kind}_candidate_drift`);
    return value;
  };
  const fixedTask5 = readCandidate(TASK5_CANDIDATE_PATH, "task5", false, true);
  const fixedTask6 = readCandidate(TASK6_CANDIDATE_PATH, "task6", false, true);
  assertForbiddenOutputsStable();
  const task5CandidateOverridePath = options.task5CandidatePathForTest;
  const task6CandidateOverridePath = options.task6CandidatePathForTest;
  const task5 = task5CandidateOverridePath
    ? validateInjected(() =>
        readCandidate(
          task5CandidateOverridePath,
          "task5",
          options.allowUnboundCandidateBytesForHostileTest === true,
        ),
      )
    : fixedTask5;
  const task6 = task6CandidateOverridePath
    ? validateInjected(() =>
        readCandidate(
          task6CandidateOverridePath,
          "task6",
          options.allowUnboundCandidateBytesForHostileTest === true,
        ),
      )
    : fixedTask6;
  assertForbiddenOutputsStable();
  const validateCandidateBindings = (value: JsonRecord): void =>
    exactObject(
      value.candidateFiles,
      {
        task5V3: {
          path: `${EVIDENCE_RELATIVE}/task5_v3_candidate.json`,
          schemaVersion: "learning-v2-german-chapter-blueprints.v3",
          byteSha256: CANDIDATE.task5Byte,
          canonicalBodySha256: CANDIDATE.task5Canonical,
        },
        task6V3: {
          path: `${EVIDENCE_RELATIVE}/task6_v3_candidate.json`,
          schemaVersion: "learning-v2-german-task6-canonical-registry.v3",
          byteSha256: CANDIDATE.task6Byte,
          canonicalBodySha256: CANDIDATE.task6Canonical,
        },
      },
      "hallo_v3_candidate_binding",
    );
  validateCandidateBindings(manifest);
  validateTask5Candidate(task5, task5Upstream);
  validateTask6Candidate(task6, task6Upstream);
  assertForbiddenOutputsStable();

  const fixedExtractionBytes = readFixedBytes(EXTRACTION_PATH);
  if (sha256(fixedExtractionBytes) !== INPUT.extraction)
    fail("hallo_v3_extraction_input_drift");
  const fixedExtraction = parseJson(
    fixedExtractionBytes,
    "hallo_v3_extraction_input_drift",
  );
  assertForbiddenOutputsStable();
  const extractionOverridePath = options.extractionPathForTest;
  const extraction = extractionOverridePath
    ? validateInjected(() =>
        readBoundJson(
          extractionOverridePath,
          INPUT.extraction,
          "hallo_v3_extraction_input_drift",
        ),
      )
    : fixedExtraction;
  validateSourceBoundary(manifest, extraction);
  assertForbiddenOutputsStable();
  const validateCandidateFingerprint = (
    value: JsonRecord,
    task5Value: JsonRecord,
    task6Value: JsonRecord,
  ): void => {
    exactObject(
      value.candidateFingerprint,
      {
        scope: "CANDIDATE_BUNDLE_ONLY_NOT_OWNER_BLUEPRINT_FINGERPRINT",
        algorithm: "SHA256_CANONICAL_JSON_V1",
        sha256: CANDIDATE.fingerprint,
      },
      "hallo_v3_candidate_fingerprint",
    );
    const fingerprintPayload = {
      task5CandidateCanonicalBodySha256: hashCanonicalBody(task5Value),
      task6CandidateCanonicalBodySha256: hashCanonicalBody(task6Value),
      proposedBinding: value.proposedBinding,
    };
    if (hashCanonicalBody(fingerprintPayload) !== CANDIDATE.fingerprint) {
      fail("hallo_v3_candidate_fingerprint");
    }
  };
  validateCandidateFingerprint(manifest, task5, task6);
  assertForbiddenOutputsStable();

  const finalFixedManifest = validateManifest(MANIFEST_PATH);
  const finalFixedTask5Upstream = readTask5(TASK5_PATH, true);
  const finalFixedTask6Upstream = readTask6(TASK6_PATH, true);
  withStableFixedRepoPathReads(
    fixedStateAtStart.entriesByRelativePath,
    readFixedBytes,
    () =>
      verifyBoundArtifacts({}, assertForbiddenOutputsStable, readFixedBytes),
  );
  const finalFixedTask5 = readCandidate(
    TASK5_CANDIDATE_PATH,
    "task5",
    false,
    true,
  );
  const finalFixedTask6 = readCandidate(
    TASK6_CANDIDATE_PATH,
    "task6",
    false,
    true,
  );
  validateCandidateBindings(finalFixedManifest);
  validateTask5Candidate(finalFixedTask5, finalFixedTask5Upstream);
  validateTask6Candidate(finalFixedTask6, finalFixedTask6Upstream);
  const finalFixedExtractionBytes = readFixedBytes(EXTRACTION_PATH);
  if (sha256(finalFixedExtractionBytes) !== INPUT.extraction)
    fail("hallo_v3_extraction_input_drift");
  const finalFixedExtraction = parseJson(
    finalFixedExtractionBytes,
    "hallo_v3_extraction_input_drift",
  );
  validateSourceBoundary(finalFixedManifest, finalFixedExtraction);
  validateCandidateFingerprint(
    finalFixedManifest,
    finalFixedTask5,
    finalFixedTask6,
  );
  const fixedStateAtEnd = fixedStateSnapshot();
  if (fixedStateAtStart.serialized !== fixedStateAtEnd.serialized) {
    fail("hallo_v3_fixed_state_drift");
  }
  assertForbiddenOutputsStable();
  return Object.freeze({ manifest, task5, task6 });
}

export function inspectGermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateDeV1(
  options: GermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateOptionsDeV1 = {},
): GermanTask7V2L01C01HalloTask5Task6V3MigrationCandidateResultDeV1 {
  inspect(options);
  return Object.freeze({
    status: "HOLD" as const,
    decision: "PROPOSED_EXACT_SUCCESSOR_NOT_ACTIVATED" as const,
    sessionId: "de_l01_s01" as const,
    sourcePlanId: "de_lex_plan_l01_c01_hallo_v2" as const,
    phraseFrameId: "de_pf_l01_c01_hallo_v2" as const,
    exactSurface: "Hallo!" as const,
    task5PlanIds: 288 as const,
    task6LexicalSenses: 6 as const,
    task6PhraseFrames: 2 as const,
    task6PronunciationTargets: 1 as const,
    rowsPromoted: 0 as const,
    task7Unlock: false as const,
    preauthoringAuthority: false as const,
    learnerFacing: false as const,
    releaseAuthorized: false as const,
    consumerCutover: "NONE" as const,
    defaultConsumerChanged: false as const,
    ownerApproval: "PENDING" as const,
  });
}
