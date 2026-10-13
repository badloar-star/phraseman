import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildS01ContentReceipt,
  buildS01CandidateReceipt,
  collectS01NoDriftBoundary,
  s01ReceiptInventoryForCandidate,
  S01_RECEIPT_INVENTORY,
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
const SCRIPT = path.join(PIPELINE, "build_s01_candidate_receipt.mjs");

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
  return new Map([
    [CANDIDATE, candidateTreeSnapshot(CANDIDATE)],
    [CANDIDATE2, candidateTreeSnapshot(CANDIDATE2)],
    [CANDIDATE3, candidateTreeSnapshot(CANDIDATE3)],
    [CANDIDATE4, candidateTreeSnapshot(CANDIDATE4)],
  ]);
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

function createRegisteredCandidateCliFixture(t, sourceCandidate = CANDIDATE8) {
  const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s01-receipt-cli-"));
  t.after(() => fs.rmSync(fixtureRepo, { recursive: true, force: true }));
  const candidateRelative = path.relative(REPO, sourceCandidate).split(path.sep).join("/");
  const fixtureCandidate = path.join(fixtureRepo, ...candidateRelative.split("/"));
  fs.cpSync(sourceCandidate, fixtureCandidate, { recursive: true });

  const historicalReceipt = JSON.parse(fs.readFileSync(path.join(CANDIDATE6, "hash-receipt.json"), "utf8"));
  for (const entry of historicalReceipt.files) {
    if (!entry.path.startsWith(`${candidateRelative}/`)) copyFixtureFile(REPO, fixtureRepo, entry.path);
  }
  const noDriftBaseline = JSON.parse(fs.readFileSync(path.join(CANDIDATE6, "no-drift-baseline.json"), "utf8"));
  for (const entry of noDriftBaseline.files) copyFixtureFile(REPO, fixtureRepo, entry.path);
  for (const relativePath of [
    "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
    "content/learning-v2-course/pipeline/write_mockup_file.mjs",
    "functions-content/lib/app/transcription.js",
  ]) copyFixtureFile(REPO, fixtureRepo, relativePath);

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
  const historicalV2Before = fs.readFileSync(path.join(CANDIDATE6, "hash-receipt.json"));
  const historicalV3Before = fs.readFileSync(path.join(CANDIDATE6, "content-receipt.json"));
  const historicalReader2Before = candidateTreeSnapshot(CANDIDATE7);
  const { fixtureRepo, fixtureCandidate, fixtureScript } = createRegisteredCandidateCliFixture(t);
  const allowed = runCli(["--candidate", fixtureCandidate], { script: fixtureScript, cwd: fixtureRepo });
  assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
  assert.match(allowed.stdout, /s01-combined-review-fixed-20261013\/content-receipt\.json/u);
  assert.deepEqual(fs.readFileSync(path.join(CANDIDATE6, "hash-receipt.json")), historicalV2Before, "historical v2 receipt must remain byte-for-byte evidence");
  assert.deepEqual(fs.readFileSync(path.join(CANDIDATE6, "content-receipt.json")), historicalV3Before, "historical v3 receipt must remain byte-for-byte evidence");
  assert.deepEqual(candidateTreeSnapshot(CANDIDATE7), historicalReader2Before, "reader2 historical evidence must remain byte-for-byte and timestamp stable");

  const before = allowedCandidateSnapshots();
  const arbitrary = path.join(fixtureRepo, "content/learning-v2-course/outputs/s01-unregistered-candidate");
  const rejected = runCli(["--candidate", arbitrary], { script: fixtureScript, cwd: fixtureRepo });
  assert.notEqual(rejected.status, 0, "unregistered candidate unexpectedly succeeded");
  assert.match(rejected.stderr, /unexpected_candidate_root/iu);
  assert.equal(fs.existsSync(arbitrary), false);
  assertAllowedCandidatesUnchanged(before);
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

test("S01 candidate receipt hashes the exact authoritative inventory and excludes itself", () => {
  const receipt = buildS01CandidateReceipt({ repoRoot: REPO, candidateRoot: CANDIDATE });
  assert.equal(receipt.schemaVersion, "learning_v2_s01_candidate_hash_receipt_v2");
  assert.equal(receipt.courseSessionId, "en:lesson-01:session-01");
  assert.equal(receipt.releaseAuthority, false);
  assert.deepEqual(
    Object.fromEntries(Object.entries(receipt.categoryCounts).sort()),
    Object.fromEntries(Object.entries(S01_RECEIPT_INVENTORY).map(([category, files]) => [category, files.length]).sort()),
  );
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
  assert.equal(receipt.files.some((entry) => entry.path === "content/learning-v2-course/sessions/en/l01/s01/review-evidence-manifest.json"), true);
  assert.equal(receipt.files.some((entry) => entry.path === "content/learning-v2-course/sessions/en/l01/s01/status.json"), true);
  assert.equal(receipt.files.some((entry) => entry.path === "content/learning-v2-course/pipeline/s01_review_evidence_manifest.test.mjs"), true);
  for (const entry of receipt.files) {
    const absolute = path.join(REPO, ...entry.path.split("/"));
    const bytes = fs.readFileSync(absolute);
    assert.equal(entry.bytes, bytes.length, entry.path);
    assert.equal(entry.sha256, crypto.createHash("sha256").update(bytes).digest("hex"), entry.path);
  }
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
