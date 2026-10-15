import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildS01CandidateReceipt,
  buildS01ContentReceipt,
  captureS01NoDriftBaseline,
  collectS01NoDriftBoundary,
  createS01ReceiptFile,
  publishS01SuccessorCandidate,
  publishS01CandidateReceipt,
  publishS01PrivatePreviewContentReceipt,
  S01_WRITABLE_CANDIDATE_NAME,
  S01_RECEIPT_FILESYSTEM_TRUST_MODEL,
  s01ReceiptInventoryForCandidate,
  verifyS01ContentReceipt,
} from "./build_s01_candidate_receipt.mjs";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(PIPELINE, "../../..");
const CANDIDATE = path.join(REPO, "content/learning-v2-course/outputs/s01-pedagogy-fixed-20261013");
const CANDIDATE2 = path.join(REPO, "content/learning-v2-course/outputs/s01-pedagogy2-fixed-20261013");
const CANDIDATE3 = path.join(REPO, "content/learning-v2-course/outputs/s01-learner-fixed-20261013");
const CANDIDATE4 = path.join(REPO, "content/learning-v2-course/outputs/s01-learner2-fixed-20261013");
const CANDIDATE5 = path.join(REPO, "content/learning-v2-course/outputs/s01-learner3-fixed-20261013");
const CANDIDATE6 = path.join(REPO, "content/learning-v2-course/outputs/s01-source-projection-fixed-20261013");
const CANDIDATE7 = path.join(REPO, "content/learning-v2-course/outputs/s01-reader2-fixed-20261013");
const CANDIDATE8 = path.join(REPO, "content/learning-v2-course/outputs/s01-combined-review-fixed-20261013");
const CANDIDATE9 = path.join(REPO, "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013");
const CANDIDATE10 = path.join(REPO, "content/learning-v2-course/outputs/s01-locale-fixed-20261013");
const CANDIDATE11 = path.join(REPO, "content/learning-v2-course/outputs/s01-correct-feedback-fixed-20261013");
const CANDIDATE12 = path.join(REPO, "content/learning-v2-course/outputs/s01-feedback-locale-final-fixed-20261013");
const CANDIDATE13 = path.join(REPO, "content/learning-v2-course/outputs/s01-locale-batch-parity-fixed-20261014");
const CANDIDATE14 = path.join(REPO, "content/learning-v2-course/outputs/s01-feedback-naturalness-fixed-20261014");
const CANDIDATE15 = path.join(REPO, "content/learning-v2-course/outputs/s01-concise-feedback-fixed-20261014");
const SCRIPT = path.join(PIPELINE, "build_s01_candidate_receipt.mjs");
const HISTORICAL_CANDIDATES = [CANDIDATE, CANDIDATE2, CANDIDATE3, CANDIDATE4, CANDIDATE5, CANDIDATE6, CANDIDATE7, CANDIDATE8, CANDIDATE9, CANDIDATE10, CANDIDATE11, CANDIDATE12, CANDIDATE13, CANDIDATE14];
const CANDIDATE_ARTIFACTS = [
  "en/l01/s01/intro.json",
  "en/l01/s01/auxiliary.json",
  "en/l01/s01/learner.json",
  "en/l01/s01/learner.uk.json",
  "en/l01/s01/answers.json",
  "index.html",
  "external.html",
  "app.js",
  "data.js",
];
const CONTENT_SOURCE_ARTIFACTS = [
  "content/learning-v2-course/sessions/en/l01/s01/final.ru.md",
  "content/learning-v2-course/sessions/en/l01/s01/final.uk.md",
  "content/learning-v2-course/sessions/en/l01/s01/locales_batch.md",
  "content/learning-v2-course/sessions/en/l01/s01/practice.atomic.json",
  "content/learning-v2-course/sessions/en/l01/s01/practice.explanations.v1.json",
];
const FIVE_FILE_PROJECTION = ["answers.json", "auxiliary.json", "intro.json", "learner.json", "learner.uk.json"];
const NO_DRIFT_ROOT_SPECS = [
  { root: "content/learning-v2-course/release/en/l01/s01", files: FIVE_FILE_PROJECTION },
  { root: "content/learning-v2-course/release/en/l01/s02", files: FIVE_FILE_PROJECTION },
  { root: "content/learning-v2-course/sessions/en/l01/s02", files: ["final.judge_taste.json", "final.judge_taste.run1.json", "final.ru.md", "final.uk.md", "locales.judge.json", "locales_batch.md", "practice.atomic.json", "practice.explanations.v1.json"] },
  { root: "content/learning-v2-course/mockup/reviewed-source/en/l01/s01", files: FIVE_FILE_PROJECTION },
  { root: "content/learning-v2-course/mockup/reviewed-source/en/l01/s02", files: FIVE_FILE_PROJECTION },
  { root: "modules/learning-v2/content/factory_native/generated_release/en/l01/s01", files: FIVE_FILE_PROJECTION },
  { root: "modules/learning-v2/content/factory_native/generated_release/en/l01/s02", files: FIVE_FILE_PROJECTION },
];
const NO_DRIFT_AUTHORITY_BASELINE = "content/learning-v2-course/outputs/s01-locale-batch-parity-fixed-20261014/no-drift-baseline.json";
const NO_DRIFT_AUTHORITY_BASELINE_SHA256 = "e10103ef406c27fc46c40ef31a3d823f66a0d704081bfd33398dc40a510cc28c";
const NO_DRIFT_AUTHORITY_RECEIPT = "content/learning-v2-course/outputs/s01-locale-batch-parity-fixed-20261014/review-content-bundle-receipt.v3.json";
const NO_DRIFT_AUTHORITY_RECEIPT_SHA256 = "fab4d25424ba630d1250dd6b1724bee397cc94d9c099aaccc54cbeccf8549a86";

function candidateTreeSnapshot(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      const stat = fs.statSync(absolute, { bigint: true });
      const bytes = fs.readFileSync(absolute);
      files.push({
        path: path.relative(root, absolute).split(path.sep).join("/"),
        mtimeNs: stat.mtimeNs.toString(),
        bytes: bytes.length,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      });
    }
  };
  visit(root);
  return files;
}

function allowedCandidateSnapshots() {
  return new Map(HISTORICAL_CANDIDATES.map((candidate) => [candidate, candidateTreeSnapshot(candidate)]));
}

function runCli(args, { script = SCRIPT, cwd = REPO } = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function copyFixtureFile(sourceRoot, fixtureRoot, relativePath) {
  const source = path.join(sourceRoot, ...relativePath.split("/"));
  const destination = path.join(fixtureRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function createSuccessorStagingFixture(t, suffix) {
  const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), `learning-v2-s01-successor-${suffix}-`));
  t.after(() => fs.rmSync(fixtureRepo, { recursive: true, force: true }));
  const outputsRoot = path.join(fixtureRepo, "content/learning-v2-course/outputs");
  const target = path.join(outputsRoot, "s01-concise-feedback-fixed-20261014");
  const staging = path.join(outputsRoot, `.s01-concise-feedback-fixed-20261014.staging-${suffix}`);
  for (const artifact of CANDIDATE_ARTIFACTS) {
    const destination = path.join(staging, ...artifact.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(CANDIDATE14, ...artifact.split("/")), destination);
  }
  return { fixtureRepo, outputsRoot, staging, target };
}

function mutateSameLength(absolutePath) {
  const original = fs.readFileSync(absolutePath);
  assert.ok(original.length > 0, `cannot mutate empty fixture file: ${absolutePath}`);
  const mutated = Buffer.from(original);
  mutated[0] ^= 1;
  fs.writeFileSync(absolutePath, mutated);
  assert.equal(fs.statSync(absolutePath).size, original.length);
}

function createCanonicalCandidateCliFixture(t, { includeBaseline = true } = {}) {
  const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s01-receipt-cli-"));
  t.after(() => fs.rmSync(fixtureRepo, { recursive: true, force: true }));
  const candidateRelative = "content/learning-v2-course/outputs/s01-concise-feedback-fixed-20261014";
  const fixtureCandidate = path.join(fixtureRepo, ...candidateRelative.split("/"));
  for (const artifact of CANDIDATE_ARTIFACTS) {
    const destination = path.join(fixtureCandidate, ...artifact.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(CANDIDATE14, ...artifact.split("/")), destination);
  }

  const historicalReceipt = JSON.parse(fs.readFileSync(path.join(CANDIDATE6, "hash-receipt.json"), "utf8"));
  for (const entry of historicalReceipt.files) {
    if (!entry.path.startsWith("content/learning-v2-course/outputs/s01-source-projection-fixed-20261013/")) copyFixtureFile(REPO, fixtureRepo, entry.path);
  }
  const noDriftBaseline = collectS01NoDriftBoundary({ repoRoot: REPO });
  for (const entry of noDriftBaseline.files) copyFixtureFile(REPO, fixtureRepo, entry.path);
  for (const relativePath of [
    "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
    "content/learning-v2-course/pipeline/write_mockup_file.mjs",
    NO_DRIFT_AUTHORITY_BASELINE,
    NO_DRIFT_AUTHORITY_RECEIPT,
    "functions-content/lib/app/transcription.js",
  ]) copyFixtureFile(REPO, fixtureRepo, relativePath);
  if (includeBaseline) fs.writeFileSync(path.join(fixtureCandidate, "no-drift-baseline.json"), `${JSON.stringify(noDriftBaseline, null, 2)}\n`);

  return {
    fixtureRepo,
    fixtureCandidate,
    fixtureScript: path.join(fixtureRepo, "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs"),
  };
}

function assertAllowedCandidatesUnchanged(before) {
  for (const [candidate, snapshot] of before) {
    assert.deepEqual(candidateTreeSnapshot(candidate), snapshot, `candidate tree changed: ${candidate}`);
  }
}

test("S01 writable successor advances without mutating the prior candidate", () => {
  assert.equal(S01_WRITABLE_CANDIDATE_NAME, "s01-concise-feedback-fixed-20261014");
  assert.equal(HISTORICAL_CANDIDATES.includes(CANDIDATE14), true);
});

test("S01 private HOLD preview can publish only its create-only content receipt without claiming no-drift", (t) => {
  const historicalBefore = allowedCandidateSnapshots();
  const { fixtureRepo, staging, target } = createSuccessorStagingFixture(t, "private-hold");
  for (const relativePath of CONTENT_SOURCE_ARTIFACTS) copyFixtureFile(REPO, fixtureRepo, relativePath);
  publishS01SuccessorCandidate({ repoRoot: fixtureRepo, stagingRoot: staging, candidateRoot: target });
  const result = publishS01PrivatePreviewContentReceipt({ repoRoot: fixtureRepo, candidateRoot: target });
  assert.equal(result.kind, "private-preview-content");
  assert.equal(result.receipt.releaseAuthority, false);
  assert.equal(result.receipt.immutableContentOnly, true);
  assert.equal(Object.hasOwn(result.receipt, "noDrift"), false);
  assert.equal(fs.existsSync(path.join(target, "no-drift-baseline.json")), false);
  assert.equal(fs.existsSync(path.join(target, "content-receipt.json")), true);
  assert.throws(
    () => publishS01PrivatePreviewContentReceipt({ repoRoot: fixtureRepo, candidateRoot: target }),
    /receipt_already_exists/u,
  );
  assertAllowedCandidatesUnchanged(historicalBefore);
});

test("S01 receipt CLI --help is side-effect-free for both allowed candidates", () => {
  for (const args of [
    ["--help"],
    ["--candidate", CANDIDATE2, "--help"],
  ]) {
    const before = allowedCandidateSnapshots();
    const result = runCli(args);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Usage:.*build_s01_candidate_receipt\.mjs/u);
    assertAllowedCandidatesUnchanged(before);
  }
});

test("S01 receipt CLI rejects unknown and malformed arguments before any candidate write", () => {
  for (const args of [
    ["--candidate", CANDIDATE, "--unknown"],
    ["--candidate", CANDIDATE2, "--unknown"],
    ["--candidate"],
    ["--capture-boundary-baseline", "unexpected-value"],
  ]) {
    const before = allowedCandidateSnapshots();
    const result = runCli(args);
    assert.notEqual(result.status, 0, `arguments unexpectedly succeeded: ${args.join(" ")}`);
    assert.match(result.stderr, /(unknown argument|missing value|unexpected positional argument)/iu);
    assertAllowedCandidatesUnchanged(before);
  }
});

test("S01 receipt CLI writes only a temporary registered candidate and leaves historical evidence untouched", (t) => {
  const historicalBefore = allowedCandidateSnapshots();
  const { fixtureRepo, fixtureCandidate, fixtureScript } = createCanonicalCandidateCliFixture(t);
  const allowed = runCli(["--candidate", fixtureCandidate], { script: fixtureScript, cwd: fixtureRepo });
  assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
  assert.match(allowed.stdout, /s01-concise-feedback-fixed-20261014\/content-receipt\.json/u);
  const receiptPath = path.join(fixtureCandidate, "content-receipt.json");
  const receiptBeforeReplay = candidateTreeSnapshot(fixtureCandidate).find((entry) => entry.path === "content-receipt.json");
  const replay = runCli(["--candidate", fixtureCandidate], { script: fixtureScript, cwd: fixtureRepo });
  assert.notEqual(replay.status, 0, "identical content receipt replay unexpectedly succeeded");
  assert.match(replay.stderr, /receipt_already_exists/iu);
  assert.deepEqual(candidateTreeSnapshot(fixtureCandidate).find((entry) => entry.path === "content-receipt.json"), receiptBeforeReplay);
  assert.equal(candidateTreeSnapshot(fixtureCandidate).some((entry) => entry.path.endsWith(".tmp")), false);
  assert.equal(fs.existsSync(receiptPath), true);

  const baselineBeforeReplay = candidateTreeSnapshot(fixtureCandidate).find((entry) => entry.path === "no-drift-baseline.json");
  const baselineReplay = runCli(["--candidate", fixtureCandidate, "--capture-boundary-baseline"], { script: fixtureScript, cwd: fixtureRepo });
  assert.notEqual(baselineReplay.status, 0, "identical baseline replay unexpectedly succeeded");
  assert.match(baselineReplay.stderr, /receipt_already_exists/iu);
  assert.deepEqual(candidateTreeSnapshot(fixtureCandidate).find((entry) => entry.path === "no-drift-baseline.json"), baselineBeforeReplay);
  assert.equal(candidateTreeSnapshot(fixtureCandidate).some((entry) => entry.path.endsWith(".tmp")), false);
  assertAllowedCandidatesUnchanged(historicalBefore);
});

test("S01 receipt CLI rejects every historical and unknown root before touching bytes or timestamps", (t) => {
  const historicalBefore = allowedCandidateSnapshots();
  const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s01-historical-refusal-"));
  t.after(() => fs.rmSync(fixtureRepo, { recursive: true, force: true }));
  for (const relativePath of [
    "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
    "content/learning-v2-course/pipeline/write_mockup_file.mjs",
  ]) copyFixtureFile(REPO, fixtureRepo, relativePath);
  const fixtureScript = path.join(fixtureRepo, "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs");
  const forbiddenNames = [...HISTORICAL_CANDIDATES.map((candidate) => path.basename(candidate)), "s01-unknown-fixed-20261013"];
  for (const name of forbiddenNames) {
    const forbiddenRoot = path.join(fixtureRepo, "content/learning-v2-course/outputs", name);
    fs.mkdirSync(forbiddenRoot, { recursive: true });
    fs.writeFileSync(path.join(forbiddenRoot, "sentinel.txt"), `immutable:${name}\n`);
    const before = candidateTreeSnapshot(forbiddenRoot);
    const rejected = runCli(["--candidate", forbiddenRoot], { script: fixtureScript, cwd: fixtureRepo });
    assert.notEqual(rejected.status, 0, `forbidden candidate unexpectedly writable: ${name}`);
    assert.match(rejected.stderr, /candidate_write_forbidden/iu);
    assert.deepEqual(candidateTreeSnapshot(forbiddenRoot), before);
  }
  assertAllowedCandidatesUnchanged(historicalBefore);
});

test("S01 successor staging publication is create-only and preserves an existing candidate tree", (t) => {
  const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s01-successor-publication-"));
  t.after(() => fs.rmSync(fixtureRepo, { recursive: true, force: true }));
  const outputsRoot = path.join(fixtureRepo, "content/learning-v2-course/outputs");
  const target = path.join(outputsRoot, "s01-concise-feedback-fixed-20261014");
  const staging = path.join(outputsRoot, ".s01-concise-feedback-fixed-20261014.staging-test");
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "sentinel.txt"), "immutable target\n");
  for (const artifact of CANDIDATE_ARTIFACTS) {
    const destination = path.join(staging, ...artifact.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(CANDIDATE13, ...artifact.split("/")), destination);
  }
  const targetBefore = candidateTreeSnapshot(target);
  const stagingBefore = candidateTreeSnapshot(staging);

  assert.throws(
    () => publishS01SuccessorCandidate({ repoRoot: fixtureRepo, stagingRoot: staging, candidateRoot: target }),
    /candidate_already_exists/u,
  );
  assert.deepEqual(candidateTreeSnapshot(target), targetBefore);
  assert.deepEqual(candidateTreeSnapshot(staging), stagingBefore);
});

test("S01 successor staging publication treats a broken target reparse point as occupied", (t) => {
  const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s01-successor-broken-target-"));
  t.after(() => fs.rmSync(fixtureRepo, { recursive: true, force: true }));
  const outputsRoot = path.join(fixtureRepo, "content/learning-v2-course/outputs");
  const target = path.join(outputsRoot, "s01-concise-feedback-fixed-20261014");
  const staging = path.join(outputsRoot, ".s01-concise-feedback-fixed-20261014.staging-test");
  const outside = path.join(fixtureRepo, "outside-target");
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(staging, { recursive: true });
  for (const artifact of CANDIDATE_ARTIFACTS) {
    const destination = path.join(staging, ...artifact.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(CANDIDATE13, ...artifact.split("/")), destination);
  }
  fs.symlinkSync(outside, target, "junction");
  fs.rmSync(outside, { recursive: true });
  const stagingBefore = candidateTreeSnapshot(staging);

  assert.throws(
    () => publishS01SuccessorCandidate({ repoRoot: fixtureRepo, stagingRoot: staging, candidateRoot: target }),
    /candidate_already_exists/u,
  );
  assert.equal(fs.lstatSync(target).isSymbolicLink(), true);
  assert.deepEqual(candidateTreeSnapshot(staging), stagingBefore);
});

test("S01 successor staging publication admits only the exact new path and moves one complete artifact set", (t) => {
  const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s01-successor-publication-"));
  t.after(() => fs.rmSync(fixtureRepo, { recursive: true, force: true }));
  const outputsRoot = path.join(fixtureRepo, "content/learning-v2-course/outputs");
  const target = path.join(outputsRoot, "s01-concise-feedback-fixed-20261014");
  const staging = path.join(outputsRoot, ".s01-concise-feedback-fixed-20261014.staging-test");
  for (const artifact of CANDIDATE_ARTIFACTS) {
    const destination = path.join(staging, ...artifact.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(CANDIDATE13, ...artifact.split("/")), destination);
  }
  const stagingBefore = candidateTreeSnapshot(staging);

  assert.throws(
    () => publishS01SuccessorCandidate({ repoRoot: fixtureRepo, stagingRoot: staging, candidateRoot: `${target}-unknown` }),
    /candidate_write_forbidden/u,
  );
  assert.deepEqual(candidateTreeSnapshot(staging), stagingBefore);
  assert.equal(fs.existsSync(`${target}-unknown`), false);

  const published = publishS01SuccessorCandidate({ repoRoot: fixtureRepo, stagingRoot: staging, candidateRoot: target });
  assert.equal(published, target);
  assert.equal(fs.existsSync(staging), false);
  assert.deepEqual(candidateTreeSnapshot(target), stagingBefore);
});

test("S01 successor validates staging inventory only after acquiring the publication lock", (t) => {
  const { fixtureRepo, outputsRoot, staging, target } = createSuccessorStagingFixture(t, "locked-inventory");
  let hookCalls = 0;

  assert.throws(
    () => publishS01SuccessorCandidate({
      repoRoot: fixtureRepo,
      stagingRoot: staging,
      candidateRoot: target,
      beforeLockedValidation() {
        hookCalls++;
        assert.equal(fs.existsSync(path.join(outputsRoot, ".s01-successor-publication.lock")), true);
        fs.unlinkSync(path.join(staging, "app.js"));
      },
    }),
    /candidate_staging_inventory_mismatch/u,
  );
  assert.equal(hookCalls, 1);
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.existsSync(staging), true);
  assert.equal(fs.existsSync(path.join(outputsRoot, ".s01-successor-publication.lock")), false);
});

test("S01 successor rechecks staging canonicality after acquiring the publication lock", (t) => {
  const { fixtureRepo, outputsRoot, staging, target } = createSuccessorStagingFixture(t, "locked-canonicality");
  const movedStaging = path.join(outputsRoot, ".staging-moved-outside-name");

  assert.throws(
    () => publishS01SuccessorCandidate({
      repoRoot: fixtureRepo,
      stagingRoot: staging,
      candidateRoot: target,
      beforeLockedValidation() {
        assert.equal(fs.existsSync(path.join(outputsRoot, ".s01-successor-publication.lock")), true);
        fs.renameSync(staging, movedStaging);
        fs.symlinkSync(movedStaging, staging, "junction");
      },
    }),
    /candidate_staging_root_forbidden|receipt_reparse_point_forbidden/u,
  );
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.lstatSync(staging).isSymbolicLink(), true);
  assert.equal(fs.existsSync(path.join(outputsRoot, ".s01-successor-publication.lock")), false);
});

test("S01 successor rechecks target absence after acquiring the publication lock", (t) => {
  const { fixtureRepo, outputsRoot, staging, target } = createSuccessorStagingFixture(t, "locked-target");

  assert.throws(
    () => publishS01SuccessorCandidate({
      repoRoot: fixtureRepo,
      stagingRoot: staging,
      candidateRoot: target,
      beforeLockedValidation() {
        assert.equal(fs.existsSync(path.join(outputsRoot, ".s01-successor-publication.lock")), true);
        fs.mkdirSync(target, { recursive: true });
        fs.writeFileSync(path.join(target, "sentinel.txt"), "competing target\n");
      },
    }),
    /candidate_already_exists/u,
  );
  assert.equal(fs.readFileSync(path.join(target, "sentinel.txt"), "utf8"), "competing target\n");
  assert.equal(fs.existsSync(staging), true);
  assert.equal(fs.existsSync(path.join(outputsRoot, ".s01-successor-publication.lock")), false);
});

test("S01 receipt CLI creates a baseline once and rejects a canonical-path junction escape", (t) => {
  const fresh = createCanonicalCandidateCliFixture(t, { includeBaseline: false });
  const capture = runCli(["--candidate", fresh.fixtureCandidate, "--capture-boundary-baseline"], { script: fresh.fixtureScript, cwd: fresh.fixtureRepo });
  assert.equal(capture.status, 0, capture.stderr || capture.stdout);
  const baselineBeforeReplay = candidateTreeSnapshot(fresh.fixtureCandidate).find((entry) => entry.path === "no-drift-baseline.json");
  const replay = runCli(["--candidate", fresh.fixtureCandidate, "--capture-boundary-baseline"], { script: fresh.fixtureScript, cwd: fresh.fixtureRepo });
  assert.notEqual(replay.status, 0, "baseline replay unexpectedly succeeded");
  assert.match(replay.stderr, /receipt_already_exists/iu);
  assert.deepEqual(candidateTreeSnapshot(fresh.fixtureCandidate).find((entry) => entry.path === "no-drift-baseline.json"), baselineBeforeReplay);

  const escaped = createCanonicalCandidateCliFixture(t);
  const outside = path.join(escaped.fixtureRepo, "outside-locale-candidate");
  fs.renameSync(escaped.fixtureCandidate, outside);
  fs.symlinkSync(outside, escaped.fixtureCandidate, "junction");
  const outsideBefore = candidateTreeSnapshot(outside);
  const rejected = runCli(["--candidate", escaped.fixtureCandidate, "--capture-boundary-baseline"], { script: escaped.fixtureScript, cwd: escaped.fixtureRepo });
  assert.notEqual(rejected.status, 0, "canonical-path junction escape unexpectedly succeeded");
  assert.match(rejected.stderr, /candidate_write_forbidden:.*noncanonical/iu);
  assert.deepEqual(candidateTreeSnapshot(outside), outsideBefore);
});

test("S01 copy failure removes an incomplete final; readers must wait for command success", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const receiptPath = path.join(fixture.fixtureCandidate, "content-receipt.json");
  const injectedIo = {
    openSync: fs.openSync,
    writeFileSync: fs.writeFileSync,
    fsyncSync: fs.fsyncSync,
    closeSync: fs.closeSync,
    copyFileSync(source, destination) {
      const complete = fs.readFileSync(source);
      fs.writeFileSync(destination, complete.subarray(0, 7), { flag: "wx" });
      throw new Error("injected_copy_failure");
    },
    unlinkSync: fs.unlinkSync,
  };
  assert.throws(
    () => createS01ReceiptFile({
      repoRoot: fixture.fixtureRepo,
      candidateRoot: fixture.fixtureCandidate,
      receiptName: "content-receipt.json",
      contents: "complete receipt\n",
      io: injectedIo,
    }),
    /injected_copy_failure/u,
  );
  assert.equal(fs.existsSync(receiptPath), false);
  assert.equal(candidateTreeSnapshot(fixture.fixtureCandidate).some((entry) => entry.path.endsWith(".tmp")), false);
});

test("S01 published receipt remains successful when transient temp cleanup fails", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const receiptPath = path.join(fixture.fixtureCandidate, "content-receipt.json");
  let unlinkAttempts = 0;
  const injectedIo = {
    openSync: fs.openSync,
    writeFileSync: fs.writeFileSync,
    fsyncSync: fs.fsyncSync,
    closeSync: fs.closeSync,
    linkSync: fs.linkSync,
    unlinkSync(target) {
      unlinkAttempts++;
      if (unlinkAttempts === 1) {
        const error = new Error("injected_cleanup_failure");
        error.code = "EBUSY";
        throw error;
      }
      fs.unlinkSync(target);
    },
  };
  assert.doesNotThrow(() => createS01ReceiptFile({
    repoRoot: fixture.fixtureRepo,
    candidateRoot: fixture.fixtureCandidate,
    receiptName: "content-receipt.json",
    contents: "complete receipt\n",
    io: injectedIo,
  }));
  assert.equal(fs.readFileSync(receiptPath, "utf8"), "complete receipt\n");
  assert.equal(unlinkAttempts, 2);
  assert.equal(candidateTreeSnapshot(fixture.fixtureCandidate).some((entry) => entry.path.endsWith(".tmp")), false);
});

test("S01 persistent temp cleanup failure preserves the committed final without a mutable hardlink alias", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const receiptPath = path.join(fixture.fixtureCandidate, "content-receipt.json");
  let tempUnlinkAttempts = 0;
  const injectedIo = {
    openSync: fs.openSync,
    writeFileSync: fs.writeFileSync,
    fsyncSync: fs.fsyncSync,
    closeSync: fs.closeSync,
    copyFileSync: fs.copyFileSync,
    unlinkSync(target) {
      if (target.endsWith(".tmp")) {
        tempUnlinkAttempts++;
        const error = new Error("persistent_temp_cleanup_failure");
        error.code = "EBUSY";
        throw error;
      }
      fs.unlinkSync(target);
    },
  };
  assert.throws(
    () => createS01ReceiptFile({
      repoRoot: fixture.fixtureRepo,
      candidateRoot: fixture.fixtureCandidate,
      receiptName: "content-receipt.json",
      contents: "complete receipt\n",
      io: injectedIo,
    }),
    /receipt_published_temp_cleanup_failed/u,
  );
  assert.equal(tempUnlinkAttempts, 3);
  assert.equal(fs.readFileSync(receiptPath, "utf8"), "complete receipt\n");
  const orphanTemps = candidateTreeSnapshot(fixture.fixtureCandidate).filter((entry) => entry.path.endsWith(".tmp"));
  assert.equal(orphanTemps.length, 1);
  const orphanPath = path.join(fixture.fixtureCandidate, ...orphanTemps[0].path.split("/"));
  fs.writeFileSync(orphanPath, "mutated orphan\n");
  assert.equal(fs.readFileSync(receiptPath, "utf8"), "complete receipt\n");
});

test("S01 never unlinks a committed final when temporary cleanup fails", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const receiptPath = path.join(fixture.fixtureCandidate, "content-receipt.json");
  const unlinked = [];
  const injectedIo = {
    openSync: fs.openSync,
    writeFileSync: fs.writeFileSync,
    fsyncSync: fs.fsyncSync,
    closeSync: fs.closeSync,
    copyFileSync: fs.copyFileSync,
    unlinkSync(target) {
      unlinked.push(target);
      if (!target.endsWith(".tmp")) throw new Error(`unexpected_final_unlink:${target}`);
      const error = new Error("persistent_temp_cleanup_failure");
      error.code = "EBUSY";
      throw error;
    },
  };
  assert.throws(
    () => createS01ReceiptFile({
      repoRoot: fixture.fixtureRepo,
      candidateRoot: fixture.fixtureCandidate,
      receiptName: "content-receipt.json",
      contents: "complete receipt\n",
      io: injectedIo,
    }),
    /receipt_published_temp_cleanup_failed/u,
  );
  assert.equal(fs.readFileSync(receiptPath, "utf8"), "complete receipt\n");
  assert.equal(unlinked.every((entry) => entry.endsWith(".tmp")), true);
});

test("S01 publication encodes trusted exclusive single-writer scope and fails closed on an active lock", (t) => {
  assert.equal(S01_RECEIPT_FILESYSTEM_TRUST_MODEL, "trusted_exclusive_single_writer_no_hostile_concurrent_filesystem_mutation");
  const fixture = createCanonicalCandidateCliFixture(t);
  const lock = path.join(fixture.fixtureCandidate, ".s01-receipt-publication.lock");
  fs.writeFileSync(lock, "active writer\n");
  assert.throws(
    () => createS01ReceiptFile({
      repoRoot: fixture.fixtureRepo,
      candidateRoot: fixture.fixtureCandidate,
      receiptName: "content-receipt.json",
      contents: "complete receipt\n",
    }),
    /receipt_publication_lock_exists/u,
  );
  assert.equal(fs.existsSync(path.join(fixture.fixtureCandidate, "content-receipt.json")), false);
  assert.equal(fs.readFileSync(lock, "utf8"), "active writer\n");
});

test("S01 candidate publication acquires the shared lock before its first input read and excludes a cooperating writer", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const input = path.join(fixture.fixtureCandidate, "en/l01/s01/intro.json");
  const before = fs.readFileSync(input);
  let hookCalls = 0;

  const result = publishS01CandidateReceipt({
    repoRoot: fixture.fixtureRepo,
    candidateRoot: fixture.fixtureCandidate,
    beforeInputRead() {
      hookCalls++;
      assert.equal(fs.existsSync(path.join(fixture.fixtureCandidate, ".s01-receipt-publication.lock")), true);
      const child = spawnSync(process.execPath, [
        "--input-type=module",
        "--eval",
        `import fs from "node:fs";
         import { withS01ReceiptPublicationLock } from ${JSON.stringify(new URL("./build_s01_candidate_receipt.mjs", import.meta.url).href)};
         try {
           withS01ReceiptPublicationLock({ repoRoot: ${JSON.stringify(fixture.fixtureRepo)}, candidateRoot: ${JSON.stringify(fixture.fixtureCandidate)} }, () => {
             fs.writeFileSync(${JSON.stringify(input)}, "competing mutation\\n");
           });
           process.exitCode = 3;
         } catch (error) {
           if (!String(error.message).includes("receipt_publication_lock_exists")) {
             console.error(error);
             process.exitCode = 4;
           }
         }`,
      ], { cwd: fixture.fixtureRepo, encoding: "utf8" });
      assert.equal(child.status, 0, child.stderr || child.stdout);
    },
  });

  assert.equal(hookCalls, 1);
  assert.deepEqual(fs.readFileSync(input), before);
  assert.equal(fs.existsSync(result.output), true);
  assert.equal(fs.existsSync(path.join(fixture.fixtureCandidate, ".s01-receipt-publication.lock")), false);
});

test("S01 publication runs the final safety recheck after staging and before creating the final name", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  let rechecks = 0;
  assert.throws(
    () => createS01ReceiptFile({
      repoRoot: fixture.fixtureRepo,
      candidateRoot: fixture.fixtureCandidate,
      receiptName: "content-receipt.json",
      contents: "complete receipt\n",
      beforePublish() {
        rechecks++;
        throw new Error("injected_final_recheck_failure");
      },
    }),
    /injected_final_recheck_failure/u,
  );
  assert.equal(rechecks, 1);
  assert.equal(fs.existsSync(path.join(fixture.fixtureCandidate, "content-receipt.json")), false);
  assert.equal(candidateTreeSnapshot(fixture.fixtureCandidate).some((entry) => entry.path.endsWith(".tmp")), false);
  assert.equal(fs.existsSync(path.join(fixture.fixtureCandidate, ".s01-receipt-publication.lock")), false);
});

test("S01 content hashing rejects a link installed at a candidate artifact path", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const intro = path.join(fixture.fixtureCandidate, "en/l01/s01/intro.json");
  const outside = path.join(fixture.fixtureRepo, "outside-intro-directory");
  fs.mkdirSync(outside);
  fs.unlinkSync(intro);
  fs.symlinkSync(outside, intro, "junction");
  assert.throws(
    () => buildS01ContentReceipt({ repoRoot: fixture.fixtureRepo, candidateRoot: fixture.fixtureCandidate }),
    /receipt_reparse_point_forbidden/u,
  );
});

test("S01 content hashing rejects a descendant candidate junction", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const session = path.join(fixture.fixtureCandidate, "en/l01/s01");
  const outside = path.join(fixture.fixtureRepo, "outside-session");
  fs.renameSync(session, outside);
  fs.symlinkSync(outside, session, "junction");
  assert.throws(
    () => buildS01ContentReceipt({ repoRoot: fixture.fixtureRepo, candidateRoot: fixture.fixtureCandidate }),
    /receipt_reparse_point_forbidden/u,
  );
});

test("S01 no-drift traversal rejects a descendant junction before hashing", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const protectedRoot = path.join(fixture.fixtureRepo, "content/learning-v2-course/release/en/l01/s02");
  const outside = path.join(fixture.fixtureRepo, "outside-no-drift-s02");
  fs.renameSync(protectedRoot, outside);
  fs.symlinkSync(outside, protectedRoot, "junction");
  assert.throws(
    () => collectS01NoDriftBoundary({ repoRoot: fixture.fixtureRepo }),
    /receipt_reparse_point_forbidden/u,
  );
});

test("S01 no-drift authority is the exact pinned predecessor inventory", () => {
  const baselineBytes = fs.readFileSync(path.join(REPO, ...NO_DRIFT_AUTHORITY_BASELINE.split("/")));
  const receiptBytes = fs.readFileSync(path.join(REPO, ...NO_DRIFT_AUTHORITY_RECEIPT.split("/")));
  const baseline = JSON.parse(baselineBytes.toString("utf8"));
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  assert.equal(crypto.createHash("sha256").update(baselineBytes).digest("hex"), NO_DRIFT_AUTHORITY_BASELINE_SHA256);
  assert.equal(crypto.createHash("sha256").update(receiptBytes).digest("hex"), NO_DRIFT_AUTHORITY_RECEIPT_SHA256);
  assert.deepEqual(receipt.protectedNoDriftBoundary, { fileCount: baseline.fileCount, sha256: baseline.boundarySha256 });
  for (const { root, files } of NO_DRIFT_ROOT_SPECS) {
    const pinned = baseline.files
      .map((entry) => entry.path)
      .filter((entry) => entry.startsWith(`${root}/`))
      .map((entry) => entry.slice(root.length + 1))
      .sort();
    assert.deepEqual(pinned, [...files].sort(), root);
  }
});

test("S01 no-drift boundary fails closed for every absent, non-directory, empty, or incomplete protected root", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  for (const { root: relativeRoot, files } of NO_DRIFT_ROOT_SPECS) {
    const protectedRoot = path.join(fixture.fixtureRepo, ...relativeRoot.split("/"));
    const backup = `${protectedRoot}.test-backup`;

    fs.renameSync(protectedRoot, backup);
    try {
      assert.throws(
        () => collectS01NoDriftBoundary({ repoRoot: fixture.fixtureRepo }),
        /no_drift_root_missing/u,
        `missing root accepted: ${relativeRoot}`,
      );

      fs.writeFileSync(protectedRoot, "not a directory\n");
      assert.throws(
        () => collectS01NoDriftBoundary({ repoRoot: fixture.fixtureRepo }),
        /no_drift_root_not_directory/u,
        `non-directory root accepted: ${relativeRoot}`,
      );
      fs.unlinkSync(protectedRoot);

      fs.mkdirSync(protectedRoot, { recursive: true });
      assert.throws(
        () => collectS01NoDriftBoundary({ repoRoot: fixture.fixtureRepo }),
        /no_drift_root_empty/u,
        `empty root accepted: ${relativeRoot}`,
      );
      fs.rmSync(protectedRoot, { recursive: true, force: true });
    } finally {
      if (fs.existsSync(protectedRoot)) fs.rmSync(protectedRoot, { recursive: true, force: true });
      fs.renameSync(backup, protectedRoot);
    }

    const requiredPath = path.join(protectedRoot, files[0]);
    const requiredBackup = `${requiredPath}.test-backup`;
    fs.renameSync(requiredPath, requiredBackup);
    try {
      assert.throws(
        () => collectS01NoDriftBoundary({ repoRoot: fixture.fixtureRepo }),
        /no_drift_required_file_missing/u,
        `missing required file accepted: ${relativeRoot}/${files[0]}`,
      );
    } finally {
      fs.renameSync(requiredBackup, requiredPath);
    }
  }
});

test("S01 baseline capture rejects deletion of every protected path in the pinned predecessor inventory", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t, { includeBaseline: false });
  const baselinePath = path.join(fixture.fixtureCandidate, "no-drift-baseline.json");
  const authority = JSON.parse(fs.readFileSync(path.join(fixture.fixtureRepo, ...NO_DRIFT_AUTHORITY_BASELINE.split("/")), "utf8"));
  for (const { path: requiredRelative } of authority.files) {
    const requiredPath = path.join(fixture.fixtureRepo, ...requiredRelative.split("/"));
    const backup = `${requiredPath}.test-backup`;
    fs.renameSync(requiredPath, backup);
    try {
      assert.throws(
        () => captureS01NoDriftBaseline({ repoRoot: fixture.fixtureRepo, candidateRoot: fixture.fixtureCandidate }),
        /no_drift_required_file_missing/u,
        `baseline accepted missing pinned path: ${requiredRelative}`,
      );
      assert.equal(fs.existsSync(baselinePath), false, `baseline written with missing pinned path: ${requiredRelative}`);
    } finally {
      fs.renameSync(backup, requiredPath);
    }
  }
});

test("S01 baseline capture rejects same-length byte changes in a root file, standalone file, and referenced audio", (t) => {
  const authority = JSON.parse(fs.readFileSync(path.join(REPO, ...NO_DRIFT_AUTHORITY_BASELINE.split("/")), "utf8"));
  const audioEntry = authority.files.find((entry) => /assets\/audio\/.+\.mp3$/u.test(entry.path));
  assert.ok(audioEntry, "pinned predecessor contains no referenced audio file");
  const representatives = [
    "content/learning-v2-course/release/en/l01/s01/answers.json",
    "content/learning-v2-course/mockup/app.js",
    audioEntry.path,
  ];
  for (const relativePath of representatives) {
    const fixture = createCanonicalCandidateCliFixture(t, { includeBaseline: false });
    const baselinePath = path.join(fixture.fixtureCandidate, "no-drift-baseline.json");
    mutateSameLength(path.join(fixture.fixtureRepo, ...relativePath.split("/")));
    assert.throws(
      () => captureS01NoDriftBaseline({ repoRoot: fixture.fixtureRepo, candidateRoot: fixture.fixtureCandidate }),
      /no_drift_protected_file_changed/u,
      `same-length mutation accepted: ${relativePath}`,
    );
    assert.equal(fs.existsSync(baselinePath), false, `baseline written after same-length mutation: ${relativePath}`);
  }
});

test("S01 baseline capture rejects an extra file under every protected root", (t) => {
  for (const { root } of NO_DRIFT_ROOT_SPECS) {
    const fixture = createCanonicalCandidateCliFixture(t, { includeBaseline: false });
    const baselinePath = path.join(fixture.fixtureCandidate, "no-drift-baseline.json");
    const extra = path.join(fixture.fixtureRepo, ...root.split("/"), "t4-extra-probe.txt");
    fs.writeFileSync(extra, "extra protected byte\n");
    assert.throws(
      () => captureS01NoDriftBaseline({ repoRoot: fixture.fixtureRepo, candidateRoot: fixture.fixtureCandidate }),
      /no_drift_protected_file_extra/u,
      `extra protected file accepted: ${root}`,
    );
    assert.equal(fs.existsSync(baselinePath), false, `baseline written with extra protected file: ${root}`);
  }
});

test("S01 baseline capture exactly reproduces the pinned predecessor boundary", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t, { includeBaseline: false });
  const expected = JSON.parse(fs.readFileSync(path.join(fixture.fixtureRepo, ...NO_DRIFT_AUTHORITY_BASELINE.split("/")), "utf8"));
  const actual = captureS01NoDriftBaseline({ repoRoot: fixture.fixtureRepo, candidateRoot: fixture.fixtureCandidate });
  assert.deepEqual(actual, expected);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(fixture.fixtureCandidate, "no-drift-baseline.json"), "utf8")), expected);
});

test("S01 no-drift verification rejects a protected root deleted after baseline capture", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const protectedRoot = path.join(fixture.fixtureRepo, "content/learning-v2-course/release/en/l01/s02");
  fs.rmSync(protectedRoot, { recursive: true, force: true });
  assert.throws(
    () => buildS01CandidateReceipt({ repoRoot: fixture.fixtureRepo, candidateRoot: fixture.fixtureCandidate }),
    /no_drift_root_missing/u,
  );
});

test("S01 candidate publication rejects a baseline reparse-point leaf before parsing it", (t) => {
  const fixture = createCanonicalCandidateCliFixture(t);
  const baseline = path.join(fixture.fixtureCandidate, "no-drift-baseline.json");
  const outside = path.join(fixture.fixtureRepo, "outside-baseline-directory");
  fs.mkdirSync(outside);
  fs.unlinkSync(baseline);
  fs.symlinkSync(outside, baseline, "junction");

  assert.throws(
    () => publishS01CandidateReceipt({
      repoRoot: fixture.fixtureRepo,
      candidateRoot: fixture.fixtureCandidate,
    }),
    /receipt_reparse_point_forbidden/u,
  );
  assert.equal(fs.existsSync(path.join(fixture.fixtureCandidate, "content-receipt.json")), false);
});

test("S01 receipt inventory can bind the reviewed pedagogy2 candidate without admitting arbitrary output roots", () => {
  const inventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE2 });
  assert.equal(inventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-pedagogy2-fixed-20261013/")), true);
  assert.throws(
    () => s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: path.join(REPO, "content/learning-v2-course/outputs/arbitrary") }),
    /unexpected_candidate_root/u,
  );
});

test("S01 receipt inventory binds the learner-repaired candidate and retained raw learner verdict", () => {
  const inventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE3 });
  assert.equal(inventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-learner-fixed-20261013/")), true);
  assert.equal(inventory.source.includes("content/learning-v2-course/judgements/2026-10-13_l01_s01_learner_raw.md"), true);
});

test("S01 receipt inventory binds the second learner repair and its browser journey gate", () => {
  const inventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE4 });
  assert.equal(inventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-learner2-fixed-20261013/")), true);
  assert.equal(inventory.verification.includes("content/learning-v2-course/pipeline/s01_candidate_intro_browser.test.mjs"), true);
});

test("S01 receipt inventory admits the third learner repair and preserves audit three", () => {
  const inventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE5 });
  assert.equal(inventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-learner3-fixed-20261013/")), true);
  assert.equal(inventory.source.includes("content/learning-v2-course/judgements/2026-10-13_l01_s01_learner_audit3_raw.md"), true);
});

test("S01 receipt inventory admits the reader2 successor without reopening historical candidates", () => {
  const inventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE7 });
  assert.equal(inventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-reader2-fixed-20261013/")), true);
});

test("S01 receipt inventory admits exactly one combined-review successor", () => {
  const inventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE8 });
  assert.equal(inventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-combined-review-fixed-20261013/")), true);
});

test("S01 receipt inventory registers the narrow i13 scene successor", () => {
  const inventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE9 });
  assert.equal(inventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013/")), true);
});

test("S01 receipt inventory preserves frozen heads and registers only the exact new successor", () => {
  const localeInventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE10 });
  assert.equal(localeInventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-locale-fixed-20261013/")), true);
  const correctFeedbackInventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE11 });
  assert.equal(correctFeedbackInventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-correct-feedback-fixed-20261013/")), true);
  const finalInventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE12 });
  assert.equal(finalInventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-feedback-locale-final-fixed-20261013/")), true);
  const localeBatchInventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE13 });
  assert.equal(localeBatchInventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-locale-batch-parity-fixed-20261014/")), true);
  const newSuccessorInventory = s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: CANDIDATE15 });
  assert.equal(newSuccessorInventory.candidate.every((entry) => entry.startsWith("content/learning-v2-course/outputs/s01-concise-feedback-fixed-20261014/")), true);
  assert.throws(
    () => s01ReceiptInventoryForCandidate({ repoRoot: REPO, candidateRoot: `${CANDIDATE15}-unregistered` }),
    /unexpected_candidate_root/u,
  );
});

test("S01 historical candidate receipt head remains pinned without live recomputation", () => {
  const bytes = fs.readFileSync(path.join(CANDIDATE, "hash-receipt.json"));
  const receipt = JSON.parse(bytes.toString("utf8"));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), "bdf747550ce42a070478359b9aa4395f4f40d7f8f4c35664e504827b33c1e7b9");
  assert.equal(receipt.schemaVersion, "learning_v2_s01_candidate_hash_receipt_v2");
  assert.equal(receipt.courseSessionId, "en:lesson-01:session-01");
  assert.equal(receipt.releaseAuthority, false);
  assert.equal(receipt.files.some((entry) => entry.path === `${receipt.candidateRoot}/hash-receipt.json`), false);
  assert.equal(new Set(receipt.files.map((entry) => entry.path)).size, receipt.files.length);
  assert.equal(receipt.files.some((entry) => entry.path === "functions-content/lib/modules/learning-v2/content/learner_visible_text_v1.js"), true);
  assert.equal(receipt.files.some((entry) => entry.path === "functions-content/lib/modules/learning-v2/content/lesson1_release_parity_v1.js"), true);
  assert.equal(receipt.files.some((entry) => entry.path === "functions-content/lib/modules/learning-v2/content/source/session_package_from_shard_v1.js"), true);
  assert.equal(receipt.files.some((entry) => entry.path === "functions-content/lib/modules/learning-v2/content/source/session_shard_from_source_v1.js"), true);
  assert.equal(receipt.files.some((entry) => entry.path === "package.json"), true);
  assert.equal(receipt.files.some((entry) => entry.path === "modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx"), true);
  assert.equal(receipt.files.some((entry) => entry.path.endsWith("/no-drift-baseline.json")), true);
  assert.equal(receipt.noDrift.status, "PASS");
  assert.equal(receipt.noDrift.claimsGitClean, false);
  assert.equal(receipt.preRepair.claimsGitClean, false);
  assert.equal(receipt.preRepair.baselineInventorySha256, "fc4564892d01536e7f53f2a1cb69e9a8959eed35fe0dc577873a8e6fa812cec3");
  assert.equal(receipt.preRepair.addedPaths.includes("content/learning-v2-course/judgements/2026-10-13_l01_s01_source_evidence.md"), true);
  assert.equal(receipt.preRepair.addedPaths.includes("content/learning-v2-course/outputs/s01-pedagogy-fixed-20261013/index.html"), true);
  assert.equal(receipt.preRepair.changedPaths.includes("content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs"), true);
  assert.equal(receipt.preRepair.changedPaths.includes("content/learning-v2-course/sessions/en/l01/s01/practice.explanations.v1.json"), true);
  assert.equal(receipt.files.some((entry) => entry.path === "content/learning-v2-course/outputs/s01-token-analysis-evidence-fixed-20261013/hash-receipt.json"), true);
  assert.equal(receipt.files.some((entry) => entry.path === "content/learning-v2-course/judgements/2026-10-13_l01_s01_source_evidence.md"), true);
  const stable = JSON.stringify(receipt.files.map(({ category, path: file, bytes, sha256 }) => ({ category, path: file, bytes, sha256 })));
  assert.equal(receipt.inventorySha256, crypto.createHash("sha256").update(stable).digest("hex"));
});

test("S01 no-drift boundary binds canonical S01, all S02 material, and referenced audio bytes", () => {
  const boundary = collectS01NoDriftBoundary({ repoRoot: REPO });
  assert.equal(boundary.claimsGitClean, false);
  assert.equal(boundary.files.some((entry) => entry.path.startsWith("content/learning-v2-course/release/en/l01/s01/")), true);
  assert.equal(boundary.files.some((entry) => entry.path.startsWith("content/learning-v2-course/release/en/l01/s02/")), true);
  assert.equal(boundary.files.some((entry) => entry.path.startsWith("content/learning-v2-course/sessions/en/l01/s02/")), true);
  assert.equal(boundary.files.some((entry) => entry.path.startsWith("modules/learning-v2/content/factory_native/generated_release/en/l01/s01/")), true);
  assert.equal(boundary.files.some((entry) => entry.path.startsWith("modules/learning-v2/content/factory_native/generated_release/en/l01/s02/")), true);
  assert.equal(boundary.files.some((entry) => entry.path === "assets/audio/learning-v2/factory-production-v1/manifest.json"), true);
  assert.equal(boundary.files.some((entry) => entry.path === "app/learning_v2_bootstrap_audio_assets_v1.generated.ts"), true);
  assert.equal(boundary.files.some((entry) => /assets\/audio\/.+\.mp3$/u.test(entry.path)), true);
  assert.equal(new Set(boundary.files.map((entry) => entry.path)).size, boundary.files.length);
});

test("default Jest discovery includes every TypeScript JSX test, including the S01 feedback lane", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"));
  assert.equal(packageJson.jest.testMatch.includes("<rootDir>/tests/**/*.test.tsx"), true);
  assert.equal(packageJson.jest.testPathIgnorePatterns.includes("<rootDir>/tests/learning_v2_mode_feedback_lane.test.tsx"), false);
});

test("S01 content receipt v3 binds only the 14 immutable content files", () => {
  const receipt = buildS01ContentReceipt({ repoRoot: REPO, candidateRoot: CANDIDATE6 });
  assert.equal(receipt.schemaVersion, "learning_v2_s01_content_receipt_v3");
  assert.equal(receipt.releaseAuthority, false);
  assert.equal(receipt.fileCount, 14);
  assert.equal(receipt.files.some((entry) => /review-evidence-manifest|status|judgements|no-drift-baseline|hash-receipt/u.test(entry.path)), false);
  assert.deepEqual(receipt.files.map((entry) => entry.path).filter((file) => file.includes("sessions/en/l01/s01/")), [
    "content/learning-v2-course/sessions/en/l01/s01/final.ru.md",
    "content/learning-v2-course/sessions/en/l01/s01/final.uk.md",
    "content/learning-v2-course/sessions/en/l01/s01/locales_batch.md",
    "content/learning-v2-course/sessions/en/l01/s01/practice.atomic.json",
    "content/learning-v2-course/sessions/en/l01/s01/practice.explanations.v1.json",
  ]);
});

test("S01 content receipt verification rejects a tampered immutable entry", () => {
  const receipt = buildS01ContentReceipt({ repoRoot: REPO, candidateRoot: CANDIDATE6 });
  const tampered = structuredClone(receipt);
  tampered.files[0].sha256 = "0".repeat(64);
  assert.throws(
    () => verifyS01ContentReceipt({ repoRoot: REPO, candidateRoot: CANDIDATE6, storedReceipt: tampered }),
    /content_receipt_mismatch/u,
  );
});
