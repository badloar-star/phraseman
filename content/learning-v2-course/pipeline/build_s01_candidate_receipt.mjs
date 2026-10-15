#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(PIPELINE, "../../..");
const DEFAULT_CANDIDATE = path.join(DEFAULT_REPO, "content/learning-v2-course/outputs/s01-pedagogy-fixed-20261013");
const BASELINE_NAME = "no-drift-baseline.json";
export const S01_WRITABLE_CANDIDATE_NAME = "s01-concise-feedback-fixed-20261014";
// Portable Node path APIs cannot make directory-handle-relative, no-follow writes on Windows.
// Publication therefore fails closed on a cooperative lock and explicitly excludes hostile
// concurrent filesystem mutation; consumers must read a receipt only after this command succeeds.
export const S01_RECEIPT_FILESYSTEM_TRUST_MODEL = "trusted_exclusive_single_writer_no_hostile_concurrent_filesystem_mutation";
const PUBLICATION_LOCK_NAME = ".s01-receipt-publication.lock";
const HISTORICAL_CANDIDATE_NAMES = Object.freeze(["s01-pedagogy-fixed-20261013", "s01-pedagogy2-fixed-20261013", "s01-learner-fixed-20261013", "s01-learner2-fixed-20261013", "s01-learner3-fixed-20261013", "s01-source-projection-fixed-20261013", "s01-reader2-fixed-20261013", "s01-combined-review-fixed-20261013", "s01-i13-scene-fixed-20261013", "s01-locale-fixed-20261013", "s01-correct-feedback-fixed-20261013", "s01-feedback-locale-final-fixed-20261013", "s01-locale-batch-parity-fixed-20261014", "s01-feedback-naturalness-fixed-20261014"]);
const ALLOWED_CANDIDATE_NAMES = new Set([...HISTORICAL_CANDIDATE_NAMES, S01_WRITABLE_CANDIDATE_NAME]);
const CREATE_ONLY_RECEIPT_NAMES = new Set([BASELINE_NAME, "content-receipt.json", "review-content-bundle-receipt.v3.json"]);
const ACTIVE_PUBLICATION_LOCKS = new WeakSet();
const USAGE = `Usage: node build_s01_candidate_receipt.mjs [--candidate <registered-candidate-directory>]
       node build_s01_candidate_receipt.mjs --candidate <registered-candidate-directory> --capture-boundary-baseline
       node build_s01_candidate_receipt.mjs --help`;
const CANDIDATE_ARTIFACTS = Object.freeze([
  "en/l01/s01/intro.json",
  "en/l01/s01/auxiliary.json",
  "en/l01/s01/learner.json",
  "en/l01/s01/learner.uk.json",
  "en/l01/s01/answers.json",
  "index.html",
  "external.html",
  "app.js",
  "data.js",
  BASELINE_NAME,
]);
const CONTENT_CANDIDATE_ARTIFACTS = Object.freeze([
  "en/l01/s01/intro.json",
  "en/l01/s01/auxiliary.json",
  "en/l01/s01/learner.json",
  "en/l01/s01/learner.uk.json",
  "en/l01/s01/answers.json",
  "index.html",
  "external.html",
  "app.js",
  "data.js",
]);
const CONTENT_SOURCE_ARTIFACTS = Object.freeze([
  "content/learning-v2-course/sessions/en/l01/s01/final.ru.md",
  "content/learning-v2-course/sessions/en/l01/s01/final.uk.md",
  "content/learning-v2-course/sessions/en/l01/s01/locales_batch.md",
  "content/learning-v2-course/sessions/en/l01/s01/practice.atomic.json",
  "content/learning-v2-course/sessions/en/l01/s01/practice.explanations.v1.json",
]);
const PRE_REPAIR_RECEIPT = "content/learning-v2-course/outputs/s01-token-analysis-evidence-fixed-20261013/hash-receipt.json";

const NO_DRIFT_ROOTS = Object.freeze([
  "content/learning-v2-course/release/en/l01/s01",
  "content/learning-v2-course/release/en/l01/s02",
  "content/learning-v2-course/sessions/en/l01/s02",
  "content/learning-v2-course/mockup/reviewed-source/en/l01/s01",
  "content/learning-v2-course/mockup/reviewed-source/en/l01/s02",
  "modules/learning-v2/content/factory_native/generated_release/en/l01/s01",
  "modules/learning-v2/content/factory_native/generated_release/en/l01/s02",
]);
const NO_DRIFT_AUTHORITY_BASELINE = "content/learning-v2-course/outputs/s01-locale-batch-parity-fixed-20261014/no-drift-baseline.json";
const NO_DRIFT_AUTHORITY_BASELINE_SHA256 = "e10103ef406c27fc46c40ef31a3d823f66a0d704081bfd33398dc40a510cc28c";
const NO_DRIFT_AUTHORITY_RECEIPT = "content/learning-v2-course/outputs/s01-locale-batch-parity-fixed-20261014/review-content-bundle-receipt.v3.json";
const NO_DRIFT_AUTHORITY_RECEIPT_SHA256 = "fab4d25424ba630d1250dd6b1724bee397cc94d9c099aaccc54cbeccf8549a86";

const NO_DRIFT_FILES = Object.freeze([
  "content/learning-v2-course/mockup/app.js",
  "content/learning-v2-course/mockup/data.js",
  "content/learning-v2-course/mockup/external.html",
  "content/learning-v2-course/mockup/index.html",
  "assets/audio/learning-v2/factory-production-v1/manifest.json",
  "app/learning_v2_bootstrap_audio_assets_v1.generated.ts",
]);

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function filesUnder(absoluteRoot) {
  if (!fs.existsSync(absoluteRoot)) return [];
  const stat = fs.lstatSync(absoluteRoot);
  if (stat.isSymbolicLink()) throw new Error(`receipt_reparse_point_forbidden:${absoluteRoot}`);
  if (stat.isFile()) return [absoluteRoot];
  if (!stat.isDirectory()) throw new Error(`receipt_non_regular_path_forbidden:${absoluteRoot}`);
  return fs.readdirSync(absoluteRoot, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isSymbolicLink()) throw new Error(`receipt_reparse_point_forbidden:${path.join(absoluteRoot, entry.name)}`);
      return filesUnder(path.join(absoluteRoot, entry.name));
    });
}

function filesUnderRequiredNoDriftRoot(repoRoot, root, requiredFiles) {
  const absoluteRoot = path.join(repoRoot, ...root.split("/"));
  let rootStat;
  try {
    rootStat = fs.lstatSync(absoluteRoot);
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`no_drift_root_missing:${root}`, { cause: error });
    throw error;
  }
  if (rootStat.isSymbolicLink()) throw new Error(`receipt_reparse_point_forbidden:${absoluteRoot}`);
  if (!rootStat.isDirectory()) throw new Error(`no_drift_root_not_directory:${root}`);
  const files = filesUnder(absoluteRoot);
  if (files.length === 0) throw new Error(`no_drift_root_empty:${root}`);
  for (const requiredFile of requiredFiles) {
    const requiredPath = path.join(absoluteRoot, ...requiredFile.split("/"));
    let requiredStat;
    try {
      requiredStat = fs.lstatSync(requiredPath);
    } catch (error) {
      if (error.code === "ENOENT") throw new Error(`no_drift_required_file_missing:${root}/${requiredFile}`, { cause: error });
      throw error;
    }
    if (requiredStat.isSymbolicLink()) throw new Error(`receipt_reparse_point_forbidden:${requiredPath}`);
    if (!requiredStat.isFile()) throw new Error(`no_drift_required_file_missing:${root}/${requiredFile}`);
  }
  return files;
}

function loadS01NoDriftRequiredFilesByRoot(repoRoot) {
  const baselineBytes = readS01RegularFile({ repoRoot, relativePath: NO_DRIFT_AUTHORITY_BASELINE });
  const receiptBytes = readS01RegularFile({ repoRoot, relativePath: NO_DRIFT_AUTHORITY_RECEIPT });
  const baselineDigest = sha256(baselineBytes);
  const receiptDigest = sha256(receiptBytes);
  if (baselineDigest !== NO_DRIFT_AUTHORITY_BASELINE_SHA256) {
    throw new Error(`no_drift_authority_baseline_sha256_mismatch:${NO_DRIFT_AUTHORITY_BASELINE_SHA256}:${baselineDigest}`);
  }
  if (receiptDigest !== NO_DRIFT_AUTHORITY_RECEIPT_SHA256) {
    throw new Error(`no_drift_authority_receipt_sha256_mismatch:${NO_DRIFT_AUTHORITY_RECEIPT_SHA256}:${receiptDigest}`);
  }
  const baseline = JSON.parse(baselineBytes.toString("utf8"));
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  if (receipt.releaseAuthority !== false || receipt.protectedNoDriftBoundary?.fileCount !== baseline.fileCount || receipt.protectedNoDriftBoundary?.sha256 !== baseline.boundarySha256) {
    throw new Error("no_drift_authority_receipt_chain_mismatch");
  }
  const predecessorEntries = (baseline.files ?? []).map((entry) => {
    if (!entry || typeof entry.path !== "string" || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[0-9a-f]{64}$/u.test(entry.sha256 ?? "")) {
      throw new Error("no_drift_authority_inventory_invalid");
    }
    return Object.freeze({ path: entry.path, bytes: entry.bytes, sha256: entry.sha256 });
  });
  const baselinePaths = predecessorEntries.map((entry) => entry.path);
  if (baselinePaths.length !== baseline.fileCount || new Set(baselinePaths).size !== baselinePaths.length) {
    throw new Error("no_drift_authority_inventory_invalid");
  }
  const sortedPredecessorEntries = [...predecessorEntries].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  if (JSON.stringify(predecessorEntries) !== JSON.stringify(sortedPredecessorEntries)) {
    throw new Error("no_drift_authority_inventory_not_sorted");
  }
  const predecessorStable = JSON.stringify(sortedPredecessorEntries);
  if (sha256(predecessorStable) !== baseline.boundarySha256) {
    throw new Error("no_drift_authority_boundary_digest_mismatch");
  }
  const requiredFilesByRoot = new Map(NO_DRIFT_ROOTS.map((root) => {
    const prefix = `${root}/`;
    const requiredFiles = baselinePaths
      .filter((entry) => typeof entry === "string" && entry.startsWith(prefix))
      .map((entry) => entry.slice(prefix.length))
      .sort();
    if (requiredFiles.length === 0 || requiredFiles.some((entry) => !entry || entry === ".." || entry.startsWith("../") || path.isAbsolute(entry))) {
      throw new Error(`no_drift_authority_root_inventory_invalid:${root}`);
    }
    if (new Set(requiredFiles).size !== requiredFiles.length) throw new Error(`no_drift_authority_root_inventory_duplicate:${root}`);
    return [root, Object.freeze(requiredFiles)];
  }));
  return {
    requiredFilesByRoot,
    requiredPaths: Object.freeze([...baselinePaths]),
    predecessorEntries: Object.freeze(sortedPredecessorEntries),
    predecessorBoundarySha256: baseline.boundarySha256,
  };
}

function assertRequiredNoDriftFile(repoRoot, relativePath) {
  const absolute = path.resolve(repoRoot, ...relativePath.split("/"));
  if (normalizedRelative(repoRoot, absolute) !== relativePath) throw new Error(`no_drift_authority_path_not_normalized:${relativePath}`);
  let stat;
  try {
    stat = fs.lstatSync(absolute);
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`no_drift_required_file_missing:${relativePath}`, { cause: error });
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`receipt_reparse_point_forbidden:${absolute}`);
  if (!stat.isFile()) throw new Error(`no_drift_required_file_missing:${relativePath}`);
}

function collectAudioAssetPaths(repoRoot) {
  const transcripts = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    if (typeof value.transcript === "string" && value.transcript.trim()) transcripts.add(value.transcript.trim());
    Object.values(value).forEach(visit);
  };
  for (const session of ["s01", "s02"]) {
    const learner = JSON.parse(fs.readFileSync(path.join(repoRoot, "content/learning-v2-course/release/en/l01", session, "learner.json"), "utf8"));
    visit(learner.interactions);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "assets/audio/learning-v2/factory-production-v1/manifest.json"), "utf8"));
  const paths = new Set();
  for (const entry of manifest.entries ?? []) {
    if (!transcripts.has(String(entry.transcript ?? "").trim())) continue;
    if (typeof entry.assetPath === "string" && entry.assetPath.trim()) paths.add(entry.assetPath.replaceAll("\\", "/"));
    if (typeof entry.contentHash === "string" && entry.contentHash.trim()) {
      const bootstrap = `assets/audio/learning-v2-bootstrap-v1/${entry.contentHash}.mp3`;
      if (fs.existsSync(path.join(repoRoot, ...bootstrap.split("/")))) paths.add(bootstrap);
    }
  }
  return [...paths];
}

export function collectS01NoDriftBoundary({ repoRoot = DEFAULT_REPO } = {}) {
  const authority = loadS01NoDriftRequiredFilesByRoot(repoRoot);
  const protectedRootFiles = NO_DRIFT_ROOTS.flatMap((root) => filesUnderRequiredNoDriftRoot(repoRoot, root, authority.requiredFilesByRoot.get(root))
    .map((absolute) => normalizedRelative(repoRoot, absolute)));
  for (const requiredPath of authority.requiredPaths) assertRequiredNoDriftFile(repoRoot, requiredPath);
  const relativePaths = new Set([
    ...authority.requiredPaths,
    ...NO_DRIFT_FILES,
    ...protectedRootFiles,
    ...collectAudioAssetPaths(repoRoot),
  ]);
  const files = [...relativePaths].sort().map((relative) => hashFile(repoRoot, "noDriftBoundary", relative));
  const currentEntries = files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest }));
  const currentByPath = new Map(currentEntries.map((entry) => [entry.path, entry]));
  const predecessorByPath = new Map(authority.predecessorEntries.map((entry) => [entry.path, entry]));
  for (const expected of authority.predecessorEntries) {
    const actual = currentByPath.get(expected.path);
    if (!actual) throw new Error(`no_drift_required_file_missing:${expected.path}`);
    if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
      throw new Error(`no_drift_protected_file_changed:${expected.path}:${expected.bytes}:${actual.bytes}:${expected.sha256}:${actual.sha256}`);
    }
  }
  for (const actual of currentEntries) {
    if (!predecessorByPath.has(actual.path)) throw new Error(`no_drift_protected_file_extra:${actual.path}`);
  }
  const stable = JSON.stringify(currentEntries);
  const boundarySha256 = sha256(stable);
  if (boundarySha256 !== authority.predecessorBoundarySha256) {
    throw new Error(`no_drift_protected_boundary_digest_mismatch:${authority.predecessorBoundarySha256}:${boundarySha256}`);
  }
  return {
    schemaVersion: "learning_v2_s01_no_drift_boundary_v1",
    claimsGitClean: false,
    scope: Object.freeze({ canonicalS01: true, allS02: true, referencedAudio: true }),
    fileCount: files.length,
    boundarySha256,
    files,
  };
}

const pathKey = (value) => process.platform === "win32" ? path.normalize(value).toLowerCase() : path.normalize(value);

function assertInsideRoot(root, target) {
  const absoluteRoot = path.resolve(root);
  const absoluteTarget = path.resolve(target);
  const relative = path.relative(absoluteRoot, absoluteTarget);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`receipt_path_outside_root:${absoluteTarget}`);
  }
  return { absoluteRoot, absoluteTarget, relative };
}

function assertPathHasNoReparsePoints(root, target, { allowMissingLeaf = false } = {}) {
  const { absoluteRoot, absoluteTarget, relative } = assertInsideRoot(root, target);
  const rootStat = fs.lstatSync(absoluteRoot);
  if (rootStat.isSymbolicLink()) throw new Error(`receipt_reparse_point_forbidden:${absoluteRoot}`);
  let current = absoluteRoot;
  const parts = relative ? relative.split(path.sep) : [];
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (allowMissingLeaf && index === parts.length - 1 && error.code === "ENOENT") return absoluteTarget;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`receipt_reparse_point_forbidden:${current}`);
    if (index < parts.length - 1 && !stat.isDirectory()) throw new Error(`receipt_non_directory_component:${current}`);
  }
  return absoluteTarget;
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size;
}

function canonicalS01SuccessorTarget({ repoRoot, candidateRoot }) {
  if (!candidateRoot) throw new Error("candidate_write_forbidden:missing_candidate_root");
  const requested = path.resolve(candidateRoot);
  const expected = path.resolve(repoRoot, "content/learning-v2-course/outputs", S01_WRITABLE_CANDIDATE_NAME);
  if (pathKey(requested) !== pathKey(expected)) throw new Error(`candidate_write_forbidden:${requested}`);
  let canonicalRepo;
  let canonicalOutputs;
  try {
    canonicalRepo = fs.realpathSync.native(path.resolve(repoRoot));
    canonicalOutputs = fs.realpathSync.native(path.dirname(expected));
  } catch (error) {
    throw new Error(`candidate_write_forbidden:${requested}:${error.code ?? "unresolved"}`, { cause: error });
  }
  assertPathHasNoReparsePoints(canonicalRepo, canonicalOutputs);
  return path.join(canonicalOutputs, S01_WRITABLE_CANDIDATE_NAME);
}

export function readS01RegularFile({ repoRoot = DEFAULT_REPO, absolutePath, relativePath } = {}) {
  const absolute = absolutePath ?? path.resolve(repoRoot, ...String(relativePath).split("/"));
  assertPathHasNoReparsePoints(repoRoot, absolute);
  const beforePath = fs.lstatSync(absolute, { bigint: true });
  if (!beforePath.isFile() || beforePath.isSymbolicLink()) throw new Error(`receipt_regular_file_required:${absolute}`);
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  let descriptor;
  try {
    descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
    const openedBefore = fs.fstatSync(descriptor, { bigint: true });
    if (!openedBefore.isFile() || !sameFileIdentity(beforePath, openedBefore)) throw new Error(`receipt_path_changed_during_read:${absolute}`);
    const bytes = fs.readFileSync(descriptor);
    const openedAfter = fs.fstatSync(descriptor, { bigint: true });
    if (!sameFileIdentity(openedBefore, openedAfter) || BigInt(bytes.length) !== openedAfter.size) {
      throw new Error(`receipt_file_changed_during_read:${absolute}`);
    }
    assertPathHasNoReparsePoints(repoRoot, absolute);
    const afterPath = fs.lstatSync(absolute, { bigint: true });
    if (!sameFileIdentity(openedAfter, afterPath)) throw new Error(`receipt_path_changed_during_read:${absolute}`);
    return bytes;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

export function assertS01CanonicalWritableCandidate({ repoRoot = DEFAULT_REPO, candidateRoot } = {}) {
  const expectedCanonical = canonicalS01SuccessorTarget({ repoRoot, candidateRoot });
  const requested = path.resolve(candidateRoot);
  let canonicalRepo;
  let canonicalCandidate;
  try {
    canonicalRepo = fs.realpathSync.native(path.resolve(repoRoot));
    canonicalCandidate = fs.realpathSync.native(requested);
  } catch (error) {
    throw new Error(`candidate_write_forbidden:${requested}:${error.code ?? "unresolved"}`, { cause: error });
  }
  if (pathKey(canonicalCandidate) !== pathKey(expectedCanonical)) throw new Error(`candidate_write_forbidden:${requested}:noncanonical`);
  assertPathHasNoReparsePoints(canonicalRepo, canonicalCandidate);
  return canonicalCandidate;
}

function stagedCandidateFiles(stagingRoot) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`candidate_staging_reparse_point_forbidden:${absolute}`);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) throw new Error(`candidate_staging_non_regular_path_forbidden:${absolute}`);
      files.push(path.relative(stagingRoot, absolute).split(path.sep).join("/"));
    }
  };
  visit(stagingRoot);
  return files.sort();
}

function validateS01SuccessorStaging({ outputsRoot, requestedStaging, stagingName }) {
  let canonicalStaging;
  try {
    canonicalStaging = fs.realpathSync.native(requestedStaging);
  } catch (error) {
    throw new Error(`candidate_staging_root_forbidden:${requestedStaging}:${error.code ?? "unresolved"}`, { cause: error });
  }
  if (pathKey(path.dirname(canonicalStaging)) !== pathKey(outputsRoot) || path.basename(canonicalStaging) !== stagingName) {
    throw new Error(`candidate_staging_root_forbidden:${requestedStaging}:noncanonical`);
  }
  assertPathHasNoReparsePoints(outputsRoot, canonicalStaging);
  const actualFiles = stagedCandidateFiles(canonicalStaging);
  const expectedFiles = [...CONTENT_CANDIDATE_ARTIFACTS].sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(`candidate_staging_inventory_mismatch:${actualFiles.join(",")}`);
  }
  return canonicalStaging;
}

function pathEntryExists(absolutePath) {
  try {
    fs.lstatSync(absolutePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export function publishS01SuccessorCandidate({ repoRoot = DEFAULT_REPO, stagingRoot, candidateRoot, beforeLockedValidation } = {}) {
  const target = canonicalS01SuccessorTarget({ repoRoot, candidateRoot });
  if (!stagingRoot) throw new Error("candidate_staging_root_required");
  if (beforeLockedValidation !== undefined && typeof beforeLockedValidation !== "function") {
    throw new Error("candidate_before_locked_validation_callback_invalid");
  }
  const outputsRoot = path.dirname(target);
  const requestedStaging = path.resolve(stagingRoot);
  const stagingName = path.basename(requestedStaging);
  const requiredPrefix = `.${S01_WRITABLE_CANDIDATE_NAME}.staging-`;
  if (pathKey(path.dirname(requestedStaging)) !== pathKey(path.resolve(repoRoot, "content/learning-v2-course/outputs")) || !stagingName.startsWith(requiredPrefix) || stagingName.length === requiredPrefix.length) {
    throw new Error(`candidate_staging_root_forbidden:${requestedStaging}`);
  }
  const lock = path.join(outputsRoot, ".s01-successor-publication.lock");
  let lockDescriptor;
  let primaryError;
  try {
    try {
      lockDescriptor = fs.openSync(lock, "wx", 0o600);
    } catch (error) {
      if (error.code === "EEXIST") throw new Error("candidate_publication_lock_exists", { cause: error });
      throw error;
    }
    if (beforeLockedValidation) beforeLockedValidation();
    const lockedTarget = canonicalS01SuccessorTarget({ repoRoot, candidateRoot });
    if (pathKey(lockedTarget) !== pathKey(target)) throw new Error(`candidate_write_forbidden:${lockedTarget}:target_changed`);
    const canonicalStaging = validateS01SuccessorStaging({ outputsRoot: path.dirname(lockedTarget), requestedStaging, stagingName });
    if (pathEntryExists(lockedTarget)) throw new Error(`candidate_already_exists:${lockedTarget}`);
    fs.renameSync(canonicalStaging, lockedTarget);
    assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot: target });
    return lockedTarget;
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (lockDescriptor !== undefined) {
      try { fs.closeSync(lockDescriptor); }
      catch (error) { if (!primaryError) throw error; }
      try { fs.unlinkSync(lock); }
      catch (error) { if (!primaryError) throw error; }
    }
  }
}

function assertActivePublicationLock({ repoRoot, candidateRoot, publicationLock }) {
  if (!publicationLock || !ACTIVE_PUBLICATION_LOCKS.has(publicationLock)) throw new Error("receipt_publication_lock_required");
  if (pathKey(publicationLock.repoRoot) !== pathKey(path.resolve(repoRoot)) || pathKey(publicationLock.candidateRoot) !== pathKey(candidateRoot)) {
    throw new Error("receipt_publication_lock_scope_mismatch");
  }
}

export function withS01ReceiptPublicationLock({ repoRoot = DEFAULT_REPO, candidateRoot } = {}, operation) {
  const canonicalCandidate = assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot });
  const lock = path.join(canonicalCandidate, PUBLICATION_LOCK_NAME);
  if (typeof operation !== "function") throw new Error("receipt_publication_operation_required");
  let lockDescriptor;
  let publicationLock;
  let result;
  let primaryError;
  try {
    assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot: canonicalCandidate });
    try {
      lockDescriptor = fs.openSync(lock, "wx", 0o600);
    } catch (error) {
      if (error.code === "EEXIST") throw new Error(`receipt_publication_lock_exists:${normalizedRelative(repoRoot, lock)}`, { cause: error });
      throw error;
    }
    assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot: canonicalCandidate });
    publicationLock = Object.freeze({ repoRoot: path.resolve(repoRoot), candidateRoot: canonicalCandidate });
    ACTIVE_PUBLICATION_LOCKS.add(publicationLock);
    result = operation(publicationLock);
    if (result && typeof result.then === "function") throw new Error("receipt_publication_async_operation_forbidden");
  } catch (error) {
    primaryError = error;
  } finally {
    if (publicationLock) ACTIVE_PUBLICATION_LOCKS.delete(publicationLock);
    let lockCleanupError;
    if (lockDescriptor !== undefined) {
      try { fs.closeSync(lockDescriptor); }
      catch (error) { lockCleanupError = error; }
      try { fs.unlinkSync(lock); }
      catch (error) { lockCleanupError = lockCleanupError ? new AggregateError([lockCleanupError, error], "receipt publication lock cleanup failed") : error; }
    }
    if (primaryError && lockCleanupError) {
      throw new AggregateError([primaryError, lockCleanupError], "receipt publication and lock cleanup failed", { cause: primaryError });
    }
    if (primaryError) throw primaryError;
    if (lockCleanupError) throw new Error(`receipt_publication_lock_cleanup_failed:${normalizedRelative(repoRoot, lock)}`, { cause: lockCleanupError });
  }
  return result;
}

function createS01ReceiptFileUnderLock({ repoRoot, candidateRoot, receiptName, contents, beforePublish, io, publicationLock }) {
  const canonicalCandidate = assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot });
  assertActivePublicationLock({ repoRoot, candidateRoot: canonicalCandidate, publicationLock });
  const output = path.join(canonicalCandidate, receiptName);
  const temporary = `${output}.${crypto.randomUUID()}.tmp`;
  let descriptor;
  let ownsTemporary = false;
  let published = false;
  let primaryError;
  try {
    descriptor = io.openSync(temporary, "wx", 0o600);
    ownsTemporary = true;
    io.writeFileSync(descriptor, contents, "utf8");
    io.fsyncSync(descriptor);
    io.closeSync(descriptor);
    descriptor = undefined;
    assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot: canonicalCandidate });
    if (beforePublish !== undefined) {
      if (typeof beforePublish !== "function") throw new Error("receipt_before_publish_callback_invalid");
      beforePublish();
    }
    assertPathHasNoReparsePoints(canonicalCandidate, output, { allowMissingLeaf: true });
    if (fs.existsSync(output)) throw new Error(`receipt_already_exists:${normalizedRelative(repoRoot, output)}`);
    try {
      // COPYFILE_EXCL keeps create-only semantics and, unlike a hard link, leaves no mutable
      // alias to the committed receipt when temporary-file cleanup is persistently unavailable.
      (io.copyFileSync ?? fs.copyFileSync)(temporary, output, fs.constants.COPYFILE_EXCL);
      published = true;
    } catch (error) {
      if (error.code === "EEXIST") throw new Error(`receipt_already_exists:${normalizedRelative(repoRoot, output)}`, { cause: error });
      if (fs.existsSync(output)) {
        try { fs.unlinkSync(output); }
        catch (cleanupError) { throw new AggregateError([error, cleanupError], `receipt_incomplete_publication_cleanup_failed:${normalizedRelative(repoRoot, output)}`, { cause: error }); }
      }
      throw error;
    }
    assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot: canonicalCandidate });
    const expectedBytes = Buffer.from(contents, "utf8");
    const publishedBytes = readS01RegularFile({ repoRoot, absolutePath: output });
    if (!publishedBytes.equals(expectedBytes)) throw new Error(`receipt_publication_mismatch:${normalizedRelative(repoRoot, output)}`);
    return output;
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    let cleanupError;
    let deferredError;
    if (descriptor !== undefined) {
      try { io.closeSync(descriptor); } catch (error) { cleanupError = error; }
    }
    if (ownsTemporary) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          io.unlinkSync(temporary);
          cleanupError = undefined;
          break;
        } catch (error) {
          if (error.code === "ENOENT") {
            cleanupError = undefined;
            break;
          }
          cleanupError = error;
        }
      }
    }
    if (cleanupError && published) deferredError = new Error(
        `receipt_published_temp_cleanup_failed:${normalizedRelative(repoRoot, output)}:${normalizedRelative(repoRoot, temporary)}`,
        { cause: cleanupError },
      );
    else if (cleanupError && primaryError) deferredError = new AggregateError([primaryError, cleanupError], `${primaryError.message}; receipt temp cleanup failed`, { cause: primaryError });
    else if (cleanupError) deferredError = cleanupError;
    if (deferredError) throw deferredError;
  }
}

export function createS01ReceiptFile({ repoRoot = DEFAULT_REPO, candidateRoot, receiptName, contents, beforePublish, io = fs, publicationLock } = {}) {
  const canonicalCandidate = assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot });
  if (!CREATE_ONLY_RECEIPT_NAMES.has(receiptName)) throw new Error(`receipt_name_forbidden:${receiptName}`);
  if (publicationLock) {
    return createS01ReceiptFileUnderLock({ repoRoot, candidateRoot: canonicalCandidate, receiptName, contents, beforePublish, io, publicationLock });
  }
  return withS01ReceiptPublicationLock({ repoRoot, candidateRoot: canonicalCandidate }, (activeLock) => createS01ReceiptFileUnderLock({
    repoRoot,
    candidateRoot: canonicalCandidate,
    receiptName,
    contents,
    beforePublish,
    io,
    publicationLock: activeLock,
  }));
}

function captureS01NoDriftBaselineUnderLock({ repoRoot, candidateRoot, publicationLock, beforeInputRead }) {
  if (beforeInputRead !== undefined) {
    if (typeof beforeInputRead !== "function") throw new Error("receipt_before_input_read_callback_invalid");
    beforeInputRead();
  }
  const baseline = collectS01NoDriftBoundary({ repoRoot });
  const output = createS01ReceiptFile({
    repoRoot,
    candidateRoot,
    receiptName: BASELINE_NAME,
    contents: `${JSON.stringify(baseline, null, 2)}\n`,
    publicationLock,
  });
  return { baseline, output };
}

export function captureS01NoDriftBaseline({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE, publicationLock, beforeInputRead } = {}) {
  const canonicalCandidate = assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot });
  if (publicationLock) {
    return captureS01NoDriftBaselineUnderLock({ repoRoot, candidateRoot: canonicalCandidate, publicationLock, beforeInputRead }).baseline;
  }
  return withS01ReceiptPublicationLock({ repoRoot, candidateRoot: canonicalCandidate }, (activeLock) => captureS01NoDriftBaselineUnderLock({
    repoRoot,
    candidateRoot: canonicalCandidate,
    publicationLock: activeLock,
    beforeInputRead,
  }).baseline);
}

function checkedJavaScriptDependencyClosure(repoRoot) {
  const require = createRequire(import.meta.url);
  const entry = path.join(repoRoot, "functions-content/lib/modules/learning-v2/content/lesson1_release_parity_v1.js");
  require(entry);
  const seen = new Set();
  const visit = (module) => {
    if (!module || seen.has(module.filename)) return;
    seen.add(module.filename);
    module.children.forEach(visit);
  };
  visit(require.cache[entry]);
  const prefix = path.join(repoRoot, "functions-content/lib/modules/learning-v2") + path.sep;
  return [...seen]
    .filter((absolute) => absolute.startsWith(prefix) && absolute.endsWith(".js"))
    .map((absolute) => normalizedRelative(repoRoot, absolute))
    .sort();
}

let checkedJavaScriptInventory;

function checkedJavaScriptInventoryForReceipt() {
  if (!checkedJavaScriptInventory) {
    checkedJavaScriptInventory = Object.freeze(checkedJavaScriptDependencyClosure(DEFAULT_REPO));
  }
  return checkedJavaScriptInventory;
}

export const S01_RECEIPT_INVENTORY = Object.freeze({
  preRepairBaseline: Object.freeze([PRE_REPAIR_RECEIPT]),
  source: Object.freeze([
    "content/learning-v2-course/sessions/en/l01/s01/final.ru.md",
    "content/learning-v2-course/sessions/en/l01/s01/final.uk.md",
    "content/learning-v2-course/sessions/en/l01/s01/locales_batch.md",
    "content/learning-v2-course/sessions/en/l01/s01/practice.atomic.json",
    "content/learning-v2-course/sessions/en/l01/s01/practice.explanations.v1.json",
    "content/learning-v2-course/sessions/en/l01/s01/review-evidence-manifest.json",
    "content/learning-v2-course/sessions/en/l01/s01/status.json",
    "content/learning-v2-course/judgements/2026-10-13_l01_s01_learner_raw.md",
    "content/learning-v2-course/judgements/2026-10-13_l01_s01_learner_audit3_raw.md",
    "content/learning-v2-course/judgements/2026-10-13_l01_s01_source_evidence.md",
    "content/learning-v2-course/migration/single-phrase-2026-10-03/preservation-ledger.json",
  ]),
  contract: Object.freeze([
    "package.json",
    "modules/learning-v2/contracts/mode_native_payload_v1.ts",
    "modules/learning-v2/runtime/course_session_client_children_v1.ts",
    "modules/learning-v2/content/factory_native/factory_native_course_v1.ts",
    "modules/learning-v2/content/learner_visible_text_v1.js",
    "modules/learning-v2/modes/mode_feedback_v1.tsx",
    "modules/learning-v2/modes/mode_router_v1.tsx",
    "modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx",
    "app/learning_v2_session_intro.tsx",
    "app/learning_v2_direct_session_player_v1.tsx",
    "content/learning-v2-course/pipeline/build_release.mjs",
    "content/learning-v2-course/pipeline/build_mockup.mjs",
    "content/learning-v2-course/pipeline/single_phrase_release.mjs",
    "content/learning-v2-course/pipeline/practice_explanations_v1.mjs",
    "content/learning-v2-course/pipeline/repair_s01_source_repetition.mjs",
    "content/learning-v2-course/pipeline/repair_s01_token_p1s.mjs",
    "content/learning-v2-course/pipeline/repair_s01_text_analysis_contract.mjs",
    "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
  ]),
  get checkedJavaScript() {
    return checkedJavaScriptInventoryForReceipt();
  },
  verification: Object.freeze([
    "content/learning-v2-course/pipeline/l01s01_feedback_repair.test.mjs",
    "content/learning-v2-course/pipeline/practice_explanations_v1.test.mjs",
    "content/learning-v2-course/pipeline/build_mockup_pairs.test.mjs",
    "content/learning-v2-course/pipeline/build_release_source_release_parity.test.mjs",
    "content/learning-v2-course/pipeline/audit_locale_batch_parity.mjs",
    "content/learning-v2-course/pipeline/audit_locale_batch_parity.test.mjs",
    "content/learning-v2-course/pipeline/s01_checked_js_parity.test.cjs",
    "content/learning-v2-course/pipeline/build_s01_candidate_receipt.test.mjs",
    "content/learning-v2-course/pipeline/s01_review_evidence_manifest.test.mjs",
    "content/learning-v2-course/pipeline/s01_candidate_intro_browser.test.mjs",
    "tests/learning_v2_direct_session_intro_adapter_v1.test.ts",
    "tests/learning_v2_mode_feedback_v1.test.ts",
    "tests/learning_v2_mode_feedback_lane.test.tsx",
    "tests/lesson1_release_parity.test.ts",
    "tests/learning_v2_mode_text_analysis_contract_gate.ts",
    "tests/learning_v2_lesson1_session_01_mode_native_gate.ts",
  ]),
  candidate: Object.freeze(CANDIDATE_ARTIFACTS.map((relative) =>
    `content/learning-v2-course/outputs/s01-pedagogy-fixed-20261013/${relative}`)),
});

function normalizedRelative(repoRoot, absolute) {
  const relative = path.relative(repoRoot, absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`receipt_path_outside_repo:${absolute}`);
  }
  return relative.split(path.sep).join("/");
}

export function s01ReceiptInventoryForCandidate({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const absolute = path.resolve(candidateRoot);
  const expectedParent = path.resolve(repoRoot, "content/learning-v2-course/outputs");
  if (path.dirname(absolute) !== expectedParent || !ALLOWED_CANDIDATE_NAMES.has(path.basename(absolute))) {
    throw new Error(`unexpected_candidate_root:${candidateRoot}`);
  }
  const candidatePrefix = normalizedRelative(repoRoot, absolute);
  return Object.freeze({
    ...S01_RECEIPT_INVENTORY,
    candidate: Object.freeze(CANDIDATE_ARTIFACTS.map((relative) => `${candidatePrefix}/${relative}`)),
  });
}

export function s01ContentReceiptInventoryForCandidate({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const absolute = path.resolve(candidateRoot);
  const expectedParent = path.resolve(repoRoot, "content/learning-v2-course/outputs");
  if (path.dirname(absolute) !== expectedParent || !ALLOWED_CANDIDATE_NAMES.has(path.basename(absolute))) {
    throw new Error(`unexpected_candidate_root:${candidateRoot}`);
  }
  const candidatePrefix = normalizedRelative(repoRoot, absolute);
  return Object.freeze([
    ...CONTENT_SOURCE_ARTIFACTS,
    ...CONTENT_CANDIDATE_ARTIFACTS.map((relative) => `${candidatePrefix}/${relative}`),
  ].sort());
}

function hashFile(repoRoot, category, relative) {
  const absolute = path.resolve(repoRoot, ...relative.split("/"));
  const normalized = normalizedRelative(repoRoot, absolute);
  if (normalized !== relative) throw new Error(`receipt_path_not_normalized:${relative}`);
  const bytes = readS01RegularFile({ repoRoot, absolutePath: absolute });
  return {
    category,
    path: normalized,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

export function buildS01ContentReceipt({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const expectedCandidate = path.resolve(candidateRoot);
  const files = s01ContentReceiptInventoryForCandidate({ repoRoot, candidateRoot: expectedCandidate })
    .map((relative) => hashFile(repoRoot, "content", relative));
  const stable = JSON.stringify(files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })));
  return {
    schemaVersion: "learning_v2_s01_content_receipt_v3",
    courseSessionId: "en:lesson-01:session-01",
    releaseAuthority: false,
    candidateRoot: normalizedRelative(repoRoot, expectedCandidate),
    immutableContentOnly: true,
    fileCount: files.length,
    inventorySha256: sha256(stable),
    files,
  };
}

export function verifyS01ContentReceipt({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE, receiptPath, storedReceipt } = {}) {
  const expected = buildS01ContentReceipt({ repoRoot, candidateRoot });
  const storedPath = receiptPath ?? path.join(candidateRoot, "content-receipt.json");
  const stored = storedReceipt ?? JSON.parse(fs.readFileSync(storedPath, "utf8"));
  if (JSON.stringify(stored) !== JSON.stringify(expected)) throw new Error(`content_receipt_mismatch:${normalizedRelative(repoRoot, storedPath)}`);
  return expected;
}

export function buildS01CandidateReceipt({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const expectedCandidate = path.resolve(candidateRoot);
  const inventory = s01ReceiptInventoryForCandidate({ repoRoot, candidateRoot: expectedCandidate });
  const baselinePath = path.join(expectedCandidate, BASELINE_NAME);
  if (!fs.existsSync(baselinePath)) throw new Error(`no_drift_baseline_missing:${normalizedRelative(repoRoot, baselinePath)}`);
  const baseline = JSON.parse(readS01RegularFile({ repoRoot, absolutePath: baselinePath }).toString("utf8"));
  const currentBoundary = collectS01NoDriftBoundary({ repoRoot });
  if (baseline.boundarySha256 !== currentBoundary.boundarySha256 || JSON.stringify(baseline.files) !== JSON.stringify(currentBoundary.files)) {
    throw new Error(`no_drift_boundary_changed:${baseline.boundarySha256}:${currentBoundary.boundarySha256}`);
  }
  const files = Object.entries(inventory)
    .flatMap(([category, paths]) => paths.map((relative) => hashFile(repoRoot, category, relative)))
    .sort((left, right) => left.path.localeCompare(right.path));
  const categoryCounts = Object.fromEntries(Object.keys(inventory).map((category) => [
    category,
    files.filter((entry) => entry.category === category).length,
  ]));
  const preRepairBytes = fs.readFileSync(path.join(repoRoot, ...PRE_REPAIR_RECEIPT.split("/")));
  const preRepairReceipt = JSON.parse(preRepairBytes.toString("utf8"));
  const preRepairFiles = new Map((preRepairReceipt.files ?? []).map((entry) => [entry.path, entry.sha256]));
  const currentFiles = new Map(files.map((entry) => [entry.path, entry.sha256]));
  const addedPaths = [...currentFiles.keys()].filter((file) => !preRepairFiles.has(file)).sort();
  const changedPaths = [...currentFiles.keys()].filter((file) => preRepairFiles.has(file) && preRepairFiles.get(file) !== currentFiles.get(file)).sort();
  const removedPaths = [...preRepairFiles.keys()].filter((file) => !currentFiles.has(file)).sort();
  const stable = JSON.stringify(files.map(({ category, path: file, bytes, sha256 }) => ({ category, path: file, bytes, sha256 })));
  return {
    schemaVersion: "learning_v2_s01_candidate_hash_receipt_v2",
    courseSessionId: "en:lesson-01:session-01",
    releaseAuthority: false,
    candidateRoot: normalizedRelative(repoRoot, expectedCandidate),
    categoryCounts,
    fileCount: files.length,
    inventorySha256: crypto.createHash("sha256").update(stable).digest("hex"),
    noDrift: {
      status: "PASS",
      claimsGitClean: false,
      baselinePath: normalizedRelative(repoRoot, baselinePath),
      boundaryFileCount: currentBoundary.fileCount,
      boundarySha256: currentBoundary.boundarySha256,
    },
    preRepair: {
      claimsGitClean: false,
      baselineReceiptPath: PRE_REPAIR_RECEIPT,
      baselineReceiptSha256: sha256(preRepairBytes),
      baselineInventorySha256: preRepairReceipt.inventorySha256,
      addedPaths,
      changedPaths,
      removedPaths,
    },
    files,
  };
}

function parseCliArgs(args) {
  const options = {
    candidate: null,
    captureBoundaryBaseline: false,
    help: false,
  };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--help") {
      if (seen.has(argument)) throw new Error(`duplicate argument: ${argument}`);
      seen.add(argument);
      options.help = true;
      continue;
    }
    if (argument === "--capture-boundary-baseline") {
      if (seen.has(argument)) throw new Error(`duplicate argument: ${argument}`);
      seen.add(argument);
      options.captureBoundaryBaseline = true;
      continue;
    }
    if (argument === "--candidate") {
      if (seen.has(argument)) throw new Error(`duplicate argument: ${argument}`);
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing value for ${argument}`);
      seen.add(argument);
      options.candidate = value;
      index++;
      continue;
    }
    if (argument.startsWith("--")) throw new Error(`unknown argument: ${argument}`);
    throw new Error(`unexpected positional argument: ${argument}`);
  }
  return options;
}

export function publishS01CandidateReceipt({
  repoRoot = DEFAULT_REPO,
  candidateRoot,
  captureBoundaryBaseline = false,
  beforeInputRead,
} = {}) {
  const canonicalCandidate = assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot });
  return withS01ReceiptPublicationLock({ repoRoot, candidateRoot: canonicalCandidate }, (publicationLock) => {
    if (beforeInputRead !== undefined) {
      if (typeof beforeInputRead !== "function") throw new Error("receipt_before_input_read_callback_invalid");
      beforeInputRead();
    }
    s01ReceiptInventoryForCandidate({ repoRoot, candidateRoot: canonicalCandidate });
    if (captureBoundaryBaseline) {
      const { baseline, output } = captureS01NoDriftBaselineUnderLock({
        repoRoot,
        candidateRoot: canonicalCandidate,
        publicationLock,
      });
      return { kind: "baseline", baseline, output };
    }
    // The v2 hash receipt is historical evidence. It is never rewritten by v3.
    // Building it here still validates the legacy inventory and no-drift boundary.
    buildS01CandidateReceipt({ repoRoot, candidateRoot: canonicalCandidate });
    const receipt = buildS01ContentReceipt({ repoRoot, candidateRoot: canonicalCandidate });
    const output = createS01ReceiptFile({
      repoRoot,
      candidateRoot: canonicalCandidate,
      receiptName: "content-receipt.json",
      contents: `${JSON.stringify(receipt, null, 2)}\n`,
      publicationLock,
    });
    return { kind: "content", receipt, output };
  });
}

// Private owner-review previews need a hash-bound content identity even while the protected
// canonical no-drift boundary is intentionally not being re-certified. This path is create-only,
// uses the same exclusive publication lock, and carries no review or release authority.
export function publishS01PrivatePreviewContentReceipt({
  repoRoot = DEFAULT_REPO,
  candidateRoot,
  beforeInputRead,
} = {}) {
  const canonicalCandidate = assertS01CanonicalWritableCandidate({ repoRoot, candidateRoot });
  return withS01ReceiptPublicationLock({ repoRoot, candidateRoot: canonicalCandidate }, (publicationLock) => {
    if (beforeInputRead !== undefined) {
      if (typeof beforeInputRead !== "function") throw new Error("receipt_before_input_read_callback_invalid");
      beforeInputRead();
    }
    const receipt = buildS01ContentReceipt({ repoRoot, candidateRoot: canonicalCandidate });
    const output = createS01ReceiptFile({
      repoRoot,
      candidateRoot: canonicalCandidate,
      receiptName: "content-receipt.json",
      contents: `${JSON.stringify(receipt, null, 2)}\n`,
      publicationLock,
    });
    return { kind: "private-preview-content", receipt, output };
  });
}

async function main(args = process.argv.slice(2)) {
  let cli;
  try {
    cli = parseCliArgs(args);
  } catch (error) {
    console.error(`[S01_RECEIPT][ERROR] ${error.message}`);
    console.error(USAGE);
    return 2;
  }
  if (cli.help) {
    console.log(USAGE);
    return 0;
  }
  const candidateRoot = cli.candidate
    ? path.resolve(cli.candidate)
    : path.join(DEFAULT_REPO, "content/learning-v2-course/outputs", S01_WRITABLE_CANDIDATE_NAME);
  const result = publishS01CandidateReceipt({ candidateRoot, captureBoundaryBaseline: cli.captureBoundaryBaseline });
  if (result.kind === "baseline") {
    console.log(JSON.stringify({ output: normalizedRelative(DEFAULT_REPO, result.output), files: result.baseline.fileCount, sha256: result.baseline.boundarySha256 }));
    return 0;
  }
  console.log(JSON.stringify({ output: normalizedRelative(DEFAULT_REPO, result.output), files: result.receipt.fileCount, sha256: result.receipt.inventorySha256 }));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
