import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildS01ReviewBundleReceipt,
  buildS01V2ToV3MigrationReceipt,
  publishS01ReviewBundleReceipt,
  S01_REVIEW_SUCCESSOR_PREDECESSOR,
  verifyS01ReviewContentBundleReceipt,
} from "./build_s01_review_bundle_receipt.mjs";
import { buildS01ContentReceipt, collectS01NoDriftBoundary } from "./build_s01_candidate_receipt.mjs";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(PIPELINE, "../../..");
const CANDIDATE = path.join(REPO, "content/learning-v2-course/outputs/s01-source-projection-fixed-20261013");
const SUCCESSOR = path.join(REPO, "content/learning-v2-course/outputs/s01-reader2-fixed-20261013");
const SUCCESSOR_V2 = path.join(SUCCESSOR, "review-bundle-receipt.json");
const SUCCESSOR_V3 = path.join(SUCCESSOR, "review-content-bundle-receipt.v3.json");
const SUCCESSOR_V2_SHA256 = "e543c251b90c26b0230a29fa18282258181ad46b0f41869f4cff62862b981551";
const COMBINED_SUCCESSOR = path.join(REPO, "content/learning-v2-course/outputs/s01-combined-review-fixed-20261013");
const COMBINED_V3 = path.join(COMBINED_SUCCESSOR, "review-content-bundle-receipt.v3.json");
const READER2_V3_SHA256 = "b99627fb95e498086c14722dd9feaea4cf6ea5a35d59a6e86e64c34cd0743742";
const COMBINED_V3_SHA256 = "febafa8abecd8466cff3f4f8d517e8690ce75a740d8c9567e51fa6a37ccc30a2";
const I13_SUCCESSOR = path.join(REPO, "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013");
const I13_V3 = path.join(I13_SUCCESSOR, "review-content-bundle-receipt.v3.json");
const I13_V3_SHA256 = "f1b516c321d9438f8b6892ca54f1d77e75bcf111c0603edcf1c6a386cac1dceb";
const LOCALE_SUCCESSOR_NAME = "s01-locale-fixed-20261013";
const CORRECT_FEEDBACK_SUCCESSOR_NAME = "s01-correct-feedback-fixed-20261013";
const FINAL_SUCCESSOR_NAME = "s01-feedback-locale-final-fixed-20261013";
const LOCALE_BATCH_SUCCESSOR_NAME = "s01-locale-batch-parity-fixed-20261014";
const NATURALNESS_SUCCESSOR_NAME = "s01-feedback-naturalness-fixed-20261014";
const NEW_SUCCESSOR_NAME = "s01-concise-feedback-fixed-20261014";
const LOCALE_SUCCESSOR = path.join(REPO, "content/learning-v2-course/outputs", LOCALE_SUCCESSOR_NAME);
const LOCALE_V3 = path.join(LOCALE_SUCCESSOR, "review-content-bundle-receipt.v3.json");
const LOCALE_V3_SHA256 = "a72a8611c2cd38ee17c529cdd37c6998fef7ef1241129b72258d521836cccc14";
const CORRECT_FEEDBACK_SUCCESSOR = path.join(REPO, "content/learning-v2-course/outputs", CORRECT_FEEDBACK_SUCCESSOR_NAME);
const CORRECT_FEEDBACK_V3 = path.join(CORRECT_FEEDBACK_SUCCESSOR, "review-content-bundle-receipt.v3.json");
const CORRECT_FEEDBACK_V3_SHA256 = "5a4c2bb59f531c34e205b00ac5840e7650534b3e828ed9ac568ce2263bab6909";
const FINAL_SUCCESSOR = path.join(REPO, "content/learning-v2-course/outputs", FINAL_SUCCESSOR_NAME);
const FINAL_V3 = path.join(FINAL_SUCCESSOR, "review-content-bundle-receipt.v3.json");
const FINAL_V3_SHA256 = "0e093e65d0d1c90b0a7dd8202b1fe5875b246e10ac48f9e128ed389739a249c4";
const LOCALE_BATCH_SUCCESSOR = path.join(REPO, "content/learning-v2-course/outputs", LOCALE_BATCH_SUCCESSOR_NAME);
const LOCALE_BATCH_V3 = path.join(LOCALE_BATCH_SUCCESSOR, "review-content-bundle-receipt.v3.json");
const LOCALE_BATCH_V3_SHA256 = "fab4d25424ba630d1250dd6b1724bee397cc94d9c099aaccc54cbeccf8549a86";
const NATURALNESS_SUCCESSOR = path.join(REPO, "content/learning-v2-course/outputs", NATURALNESS_SUCCESSOR_NAME);
const NATURALNESS_V3 = path.join(NATURALNESS_SUCCESSOR, "review-content-bundle-receipt.v3.json");
const NATURALNESS_V3_SHA256 = "6201b585f1ed65d7431bf18eb8da40289e29155c79b009eb3a0f0fbfbce9e01c";
const SOURCE_EVIDENCE = "content/learning-v2-course/judgements/2026-10-13_l01_s01_source_evidence.md";
const STABLE_TOOLCHAIN = [
  "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
  "content/learning-v2-course/pipeline/build_s01_review_bundle_receipt.mjs",
];

test("S01 concise-feedback review successor is pinned to the immutable naturalness head", () => {
  assert.deepEqual(S01_REVIEW_SUCCESSOR_PREDECESSOR, {
    candidateName: NEW_SUCCESSOR_NAME,
    path: "content/learning-v2-course/outputs/s01-feedback-naturalness-fixed-20261014/review-content-bundle-receipt.v3.json",
    sha256: NATURALNESS_V3_SHA256,
  });
  assert.equal(sha256(fs.readFileSync(NATURALNESS_V3)), NATURALNESS_V3_SHA256);
});
const REVIEW_SCRIPT = path.join(PIPELINE, "build_s01_review_bundle_receipt.mjs");

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

test("S01 review bundle is append-only and excludes mutable review indexes from the content chain", () => {
  const historical = JSON.parse(fs.readFileSync(path.join(CANDIDATE, "review-bundle-receipt.json"), "utf8"));
  assert.equal(historical.schemaVersion, "learning_v2_s01_review_bundle_receipt_v1");
  assert.equal(historical.releaseAuthority, false);
  assert.equal(historical.contentReceipt.fileCount, 14);
  assert.equal(historical.files.some((entry) => /review-evidence-manifest|status|review-bundle-receipt/u.test(entry.path)), false);
  assert.equal(historical.priorRawReceipts.some((entry) => entry.path.endsWith("learner_audit6_raw.md")), true);
  assert.equal(fs.existsSync(path.join(CANDIDATE, "hash-receipt.json")), true);
  assert.equal(fs.existsSync(path.join(CANDIDATE, "legacy-v2-to-content-v3-migration.json")), true);
});

test("S01 reader2 preserves the historical v2 head and derives a separate stable v3 content bundle", () => {
  const historicalBytes = fs.readFileSync(SUCCESSOR_V2);
  const historicalSha256 = crypto.createHash("sha256").update(historicalBytes).digest("hex");
  const storedBytes = fs.readFileSync(SUCCESSOR_V3);
  const bundle = JSON.parse(storedBytes.toString("utf8"));
  assert.equal(historicalSha256, SUCCESSOR_V2_SHA256);
  assert.equal(bundle.schemaVersion, "learning_v2_s01_review_content_bundle_receipt_v3");
  assert.equal(bundle.releaseAuthority, false);
  assert.equal(bundle.receiptChain.kind, "stable_content_bundle_successor");
  assert.equal(bundle.receiptChain.supersedes.path, "content/learning-v2-course/outputs/s01-reader2-fixed-20261013/review-bundle-receipt.json");
  assert.equal(bundle.receiptChain.supersedes.sha256, SUCCESSOR_V2_SHA256);
  assert.match(bundle.receiptChain.supersedes.reason, /mutable ledger assertion/u);
  assert.equal(bundle.contentReceipt.fileCount, 14);
  const mutableOrReceiptArtifact = /review-evidence-manifest|\/status\.json|review-(?:content-)?bundle-receipt|s01_review_evidence_manifest\.test/u;
  assert.equal(bundle.toolchain.some((entry) => mutableOrReceiptArtifact.test(entry.path)), false);
  assert.equal(bundle.files.some((entry) => mutableOrReceiptArtifact.test(entry.path)), false);
  assert.equal(crypto.createHash("sha256").update(storedBytes).digest("hex"), READER2_V3_SHA256);
});

test("S01 combined repair derives a direct stable v3 successor without inventing a legacy receipt", () => {
  const storedBytes = fs.readFileSync(COMBINED_V3);
  const bundle = JSON.parse(storedBytes.toString("utf8"));
  assert.equal(bundle.schemaVersion, "learning_v2_s01_review_content_bundle_receipt_v3");
  assert.equal(bundle.releaseAuthority, false);
  assert.equal(bundle.receiptChain.kind, "stable_content_bundle_successor");
  assert.equal(bundle.receiptChain.supersedes.path, "content/learning-v2-course/outputs/s01-reader2-fixed-20261013/review-content-bundle-receipt.v3.json");
  assert.equal(bundle.receiptChain.supersedes.sha256, READER2_V3_SHA256);
  assert.equal(bundle.contentReceipt.inventorySha256, "46fe08f75cb35ece300d3823474800e3718192d8ff3136e25c31dcbdd2c315c6");
  assert.equal(crypto.createHash("sha256").update(storedBytes).digest("hex"), COMBINED_V3_SHA256);
  assert.equal(fs.existsSync(path.join(COMBINED_SUCCESSOR, "hash-receipt.json")), false);
  assert.equal(fs.existsSync(path.join(COMBINED_SUCCESSOR, "legacy-v2-to-content-v3-migration.json")), false);
});

test("S01 i13 scene repair remains pinned to its immutable stored head", () => {
  const storedBytes = fs.readFileSync(I13_V3);
  const bundle = JSON.parse(storedBytes.toString("utf8"));
  assert.equal(sha256(storedBytes), I13_V3_SHA256);
  assert.equal(bundle.schemaVersion, "learning_v2_s01_review_content_bundle_receipt_v3");
  assert.equal(bundle.releaseAuthority, false);
  assert.equal(bundle.receiptChain.kind, "stable_content_bundle_successor");
  assert.equal(bundle.receiptChain.supersedes.path, "content/learning-v2-course/outputs/s01-combined-review-fixed-20261013/review-content-bundle-receipt.v3.json");
  assert.equal(bundle.receiptChain.supersedes.sha256, COMBINED_V3_SHA256);
  assert.equal(bundle.contentReceipt.inventorySha256, "278bcdb7da8d8fdb91abf175bd76c97940be6c085c24d9dbe74644ce80fb6755");
  assert.equal(fs.existsSync(path.join(I13_SUCCESSOR, "hash-receipt.json")), false);
  assert.equal(fs.existsSync(path.join(I13_SUCCESSOR, "legacy-v2-to-content-v3-migration.json")), false);
});

test("S01 locale repair remains pinned to its immutable stored head", () => {
  const storedBytes = fs.readFileSync(LOCALE_V3);
  const bundle = JSON.parse(storedBytes.toString("utf8"));
  assert.equal(sha256(storedBytes), LOCALE_V3_SHA256);
  assert.equal(bundle.schemaVersion, "learning_v2_s01_review_content_bundle_receipt_v3");
  assert.equal(bundle.releaseAuthority, false);
  assert.equal(bundle.receiptChain.kind, "stable_content_bundle_successor");
  assert.equal(bundle.receiptChain.supersedes.path, "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013/review-content-bundle-receipt.v3.json");
  assert.equal(bundle.receiptChain.supersedes.sha256, I13_V3_SHA256);
});

test("S01 correct-feedback repair remains pinned to the immutable locale head", () => {
  const storedBytes = fs.readFileSync(CORRECT_FEEDBACK_V3);
  const bundle = JSON.parse(storedBytes.toString("utf8"));
  assert.equal(sha256(storedBytes), CORRECT_FEEDBACK_V3_SHA256);
  assert.equal(bundle.schemaVersion, "learning_v2_s01_review_content_bundle_receipt_v3");
  assert.equal(bundle.releaseAuthority, false);
  assert.equal(bundle.receiptChain.kind, "stable_content_bundle_successor");
  assert.equal(bundle.receiptChain.supersedes.path, "content/learning-v2-course/outputs/s01-locale-fixed-20261013/review-content-bundle-receipt.v3.json");
  assert.equal(bundle.receiptChain.supersedes.sha256, LOCALE_V3_SHA256);
});

test("S01 current final repair remains pinned to the immutable correct-feedback head", () => {
  const storedBytes = fs.readFileSync(FINAL_V3);
  const bundle = JSON.parse(storedBytes.toString("utf8"));
  assert.equal(sha256(storedBytes), FINAL_V3_SHA256);
  assert.equal(bundle.schemaVersion, "learning_v2_s01_review_content_bundle_receipt_v3");
  assert.equal(bundle.releaseAuthority, false);
  assert.equal(bundle.receiptChain.kind, "stable_content_bundle_successor");
  assert.equal(bundle.receiptChain.supersedes.path, "content/learning-v2-course/outputs/s01-correct-feedback-fixed-20261013/review-content-bundle-receipt.v3.json");
  assert.equal(bundle.receiptChain.supersedes.sha256, CORRECT_FEEDBACK_V3_SHA256);
});

test("S01 locale-batch repair remains pinned to the immutable current-final head", () => {
  const storedBytes = fs.readFileSync(LOCALE_BATCH_V3);
  const bundle = JSON.parse(storedBytes.toString("utf8"));
  assert.equal(sha256(storedBytes), LOCALE_BATCH_V3_SHA256);
  assert.equal(bundle.schemaVersion, "learning_v2_s01_review_content_bundle_receipt_v3");
  assert.equal(bundle.releaseAuthority, false);
  assert.equal(bundle.receiptChain.kind, "stable_content_bundle_successor");
  assert.equal(bundle.receiptChain.supersedes.path, "content/learning-v2-course/outputs/s01-feedback-locale-final-fixed-20261013/review-content-bundle-receipt.v3.json");
  assert.equal(bundle.receiptChain.supersedes.sha256, FINAL_V3_SHA256);
});

const MUTABLE_REVIEW_PATHS = [
  "content/learning-v2-course/sessions/en/l01/s01/review-evidence-manifest.json",
  "content/learning-v2-course/sessions/en/l01/s01/status.json",
  "content/learning-v2-course/pipeline/s01_review_evidence_manifest.test.mjs",
];

function copyFixtureFile(tempRepo, relativePath) {
  const source = path.join(REPO, ...relativePath.split("/"));
  const destination = path.join(tempRepo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function createFinalSuccessorFixture(t) {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s01-feedback-locale-final-successor-"));
  t.after(() => fs.rmSync(tempRepo, { recursive: true, force: true }));
  const candidateRoot = path.join(tempRepo, "content/learning-v2-course/outputs", NEW_SUCCESSOR_NAME);
  const predecessorPrefix = path.relative(REPO, NATURALNESS_SUCCESSOR).split(path.sep).join("/");
  const successorPrefix = `content/learning-v2-course/outputs/${NEW_SUCCESSOR_NAME}`;
  const currentContent = buildS01ContentReceipt({ repoRoot: REPO, candidateRoot: NATURALNESS_SUCCESSOR });
  for (const entry of currentContent.files) {
    if (entry.path.startsWith(`${predecessorPrefix}/`)) {
      const suffix = entry.path.slice(predecessorPrefix.length + 1);
      const destination = path.join(tempRepo, ...`${successorPrefix}/${suffix}`.split("/"));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(REPO, ...entry.path.split("/")), destination);
    } else {
      copyFixtureFile(tempRepo, entry.path);
    }
  }
  const boundary = collectS01NoDriftBoundary({ repoRoot: REPO });
  for (const entry of boundary.files) copyFixtureFile(tempRepo, entry.path);
  for (const relativePath of [
    ...STABLE_TOOLCHAIN,
    "content/learning-v2-course/pipeline/write_mockup_file.mjs",
    SOURCE_EVIDENCE,
    "content/learning-v2-course/outputs/s01-feedback-naturalness-fixed-20261014/no-drift-baseline.json",
    "content/learning-v2-course/outputs/s01-feedback-naturalness-fixed-20261014/review-content-bundle-receipt.v3.json",
    ...MUTABLE_REVIEW_PATHS,
  ]) copyFixtureFile(tempRepo, relativePath);
  fs.writeFileSync(path.join(candidateRoot, "no-drift-baseline.json"), `${JSON.stringify(boundary, null, 2)}\n`);
  const contentReceipt = buildS01ContentReceipt({ repoRoot: tempRepo, candidateRoot });
  fs.writeFileSync(path.join(candidateRoot, "content-receipt.json"), `${JSON.stringify(contentReceipt, null, 2)}\n`);
  return {
    tempRepo,
    candidateRoot,
    boundary,
    contentReceipt,
    reviewScript: path.join(tempRepo, ...path.relative(REPO, REVIEW_SCRIPT).split(path.sep)),
  };
}

test("S01 current final successor mutation and tamper checks run only against a temporary repository", (t) => {
  const protectedRealPaths = [FINAL_V3, ...MUTABLE_REVIEW_PATHS.map((entry) => path.join(REPO, ...entry.split("/")))];
  const realSnapshots = protectedRealPaths.map((entry) => ({ path: entry, bytes: fs.readFileSync(entry), mtimeMs: fs.statSync(entry).mtimeMs }));
  const { tempRepo, candidateRoot } = createFinalSuccessorFixture(t);
  const storedPath = path.join(candidateRoot, "review-content-bundle-receipt.v3.json");
  const stable = buildS01ReviewBundleReceipt({ repoRoot: tempRepo, candidateRoot });
  const stableBytes = Buffer.from(`${JSON.stringify(stable, null, 2)}\n`);

  for (const mutable of MUTABLE_REVIEW_PATHS) {
    assert.equal(stable.files.some((entry) => entry.path === mutable), false);
    assert.equal(stable.toolchain.some((entry) => entry.path === mutable), false);
    const fixturePath = path.join(tempRepo, ...mutable.split("/"));
    fs.writeFileSync(fixturePath, Buffer.concat([fs.readFileSync(fixturePath), Buffer.from("\nfixture-only-mutation\n")]));
  }
  const afterLedgerMutation = Buffer.from(`${JSON.stringify(buildS01ReviewBundleReceipt({ repoRoot: tempRepo, candidateRoot }), null, 2)}\n`);
  assert.deepEqual(afterLedgerMutation, stableBytes);

  fs.writeFileSync(storedPath, stableBytes);
  assert.doesNotThrow(() => verifyS01ReviewContentBundleReceipt({ repoRoot: tempRepo, candidateRoot, receiptPath: storedPath }));
  const forgedReceipt = structuredClone(stable);
  forgedReceipt.files[0].sha256 = "0".repeat(64);
  fs.writeFileSync(storedPath, `${JSON.stringify(forgedReceipt, null, 2)}\n`);
  assert.throws(
    () => verifyS01ReviewContentBundleReceipt({ repoRoot: tempRepo, candidateRoot, receiptPath: storedPath }),
    /review_content_bundle_receipt_mismatch/u,
  );

  fs.writeFileSync(storedPath, stableBytes);
  const immutableCandidate = path.join(candidateRoot, "en/l01/s01/intro.json");
  fs.writeFileSync(immutableCandidate, Buffer.concat([fs.readFileSync(immutableCandidate), Buffer.from(" ")]));
  assert.throws(
    () => verifyS01ReviewContentBundleReceipt({ repoRoot: tempRepo, candidateRoot, receiptPath: storedPath }),
    /content_receipt_mismatch/u,
  );

  for (const snapshot of realSnapshots) {
    assert.deepEqual(fs.readFileSync(snapshot.path), snapshot.bytes, `real_file_changed:${snapshot.path}`);
    assert.equal(fs.statSync(snapshot.path).mtimeMs, snapshot.mtimeMs, `real_file_mtime_changed:${snapshot.path}`);
  }
});

test("S01 concise-feedback successor chains directly from the immutable naturalness head", (t) => {
  const predecessorBefore = candidateTreeSnapshot(NATURALNESS_SUCCESSOR);
  t.after(() => assert.deepEqual(candidateTreeSnapshot(NATURALNESS_SUCCESSOR), predecessorBefore, "naturalness predecessor tree changed"));
  const { tempRepo, candidateRoot, boundary, contentReceipt, reviewScript } = createFinalSuccessorFixture(t);
  const bundle = buildS01ReviewBundleReceipt({ repoRoot: tempRepo, candidateRoot });

  assert.equal(bundle.schemaVersion, "learning_v2_s01_review_content_bundle_receipt_v3");
  assert.equal(bundle.releaseAuthority, false);
  assert.equal(bundle.appendOnly, true);
  assert.equal(bundle.receiptChain.kind, "stable_content_bundle_successor");
  assert.equal(bundle.receiptChain.supersedes.path, "content/learning-v2-course/outputs/s01-feedback-naturalness-fixed-20261014/review-content-bundle-receipt.v3.json");
  assert.equal(bundle.receiptChain.supersedes.sha256, NATURALNESS_V3_SHA256);
  assert.equal(bundle.contentReceipt.path, `content/learning-v2-course/outputs/${NEW_SUCCESSOR_NAME}/content-receipt.json`);
  assert.equal(bundle.contentReceipt.inventorySha256, contentReceipt.inventorySha256);
  assert.deepEqual(bundle.protectedNoDriftBoundary, { fileCount: boundary.fileCount, sha256: boundary.boundarySha256 });
  assert.deepEqual(bundle.toolchain.map((entry) => entry.path), STABLE_TOOLCHAIN);
  for (const entry of bundle.toolchain) {
    const bytes = fs.readFileSync(path.join(tempRepo, ...entry.path.split("/")));
    assert.equal(entry.bytes, bytes.length, entry.path);
    assert.equal(entry.sha256, sha256(bytes), entry.path);
  }
  assert.deepEqual(bundle.sourceEvidence.map((entry) => entry.path), [SOURCE_EVIDENCE]);
  assert.equal(bundle.sourceEvidence[0].sha256, sha256(fs.readFileSync(path.join(tempRepo, ...SOURCE_EVIDENCE.split("/")))));
  assert.doesNotThrow(() => verifyS01ReviewContentBundleReceipt({ repoRoot: tempRepo, candidateRoot, storedReceipt: bundle }));

  const cli = spawnSync(process.execPath, [reviewScript, "--candidate", candidateRoot], { cwd: tempRepo, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(candidateRoot, "review-content-bundle-receipt.v3.json"), "utf8")),
    bundle,
  );
  assert.equal(fs.existsSync(path.join(candidateRoot, "review-bundle-receipt.json")), false);
  assert.equal(fs.existsSync(path.join(candidateRoot, "legacy-v2-to-content-v3-migration.json")), false);
  const receiptBeforeReplay = candidateTreeSnapshot(candidateRoot).find((entry) => entry.path === "review-content-bundle-receipt.v3.json");
  const replay = spawnSync(process.execPath, [reviewScript, "--candidate", candidateRoot], { cwd: tempRepo, encoding: "utf8" });
  assert.notEqual(replay.status, 0, "identical stable receipt replay unexpectedly succeeded");
  assert.match(replay.stderr, /receipt_already_exists/iu);
  assert.deepEqual(candidateTreeSnapshot(candidateRoot).find((entry) => entry.path === "review-content-bundle-receipt.v3.json"), receiptBeforeReplay);
  assert.equal(candidateTreeSnapshot(candidateRoot).some((entry) => entry.path.endsWith(".tmp")), false);

  const baselinePath = path.join(candidateRoot, "no-drift-baseline.json");
  const tamperedBaseline = structuredClone(boundary);
  tamperedBaseline.boundarySha256 = "0".repeat(64);
  fs.writeFileSync(baselinePath, `${JSON.stringify(tamperedBaseline, null, 2)}\n`);
  assert.throws(
    () => verifyS01ReviewContentBundleReceipt({ repoRoot: tempRepo, candidateRoot, storedReceipt: bundle }),
    /no_drift_boundary_changed/u,
  );
});

test("S01 review CLI rejects every historical and unknown root before touching bytes or timestamps", (t) => {
  const predecessorBefore = candidateTreeSnapshot(LOCALE_BATCH_SUCCESSOR);
  t.after(() => assert.deepEqual(candidateTreeSnapshot(LOCALE_BATCH_SUCCESSOR), predecessorBefore, "locale-batch predecessor tree changed"));
  const { tempRepo, reviewScript } = createFinalSuccessorFixture(t);
  for (const name of [
    "s01-pedagogy-fixed-20261013",
    "s01-pedagogy2-fixed-20261013",
    "s01-learner-fixed-20261013",
    "s01-learner2-fixed-20261013",
    "s01-learner3-fixed-20261013",
    "s01-source-projection-fixed-20261013",
    "s01-reader2-fixed-20261013",
    "s01-combined-review-fixed-20261013",
    "s01-i13-scene-fixed-20261013",
    "s01-locale-fixed-20261013",
    "s01-correct-feedback-fixed-20261013",
    "s01-feedback-locale-final-fixed-20261013",
    "s01-locale-batch-parity-fixed-20261014",
    "s01-feedback-naturalness-fixed-20261014",
    "s01-unknown-fixed-20261013",
  ]) {
    const forbiddenRoot = path.join(tempRepo, "content/learning-v2-course/outputs", name);
    fs.mkdirSync(forbiddenRoot, { recursive: true });
    fs.writeFileSync(path.join(forbiddenRoot, "sentinel.txt"), `immutable:${name}\n`);
    const before = candidateTreeSnapshot(forbiddenRoot);
    const rejected = spawnSync(process.execPath, [reviewScript, "--candidate", forbiddenRoot], { cwd: tempRepo, encoding: "utf8" });
    assert.notEqual(rejected.status, 0, `forbidden review root unexpectedly writable: ${name}`);
    assert.match(rejected.stderr, /candidate_write_forbidden/iu);
    assert.deepEqual(candidateTreeSnapshot(forbiddenRoot), before);
  }
});

test("S01 new successor rejects a tampered locale-batch predecessor before publication", (t) => {
  const { tempRepo, candidateRoot, reviewScript } = createFinalSuccessorFixture(t);
  const predecessor = path.join(
    tempRepo,
    "content/learning-v2-course/outputs",
    LOCALE_BATCH_SUCCESSOR_NAME,
    "review-content-bundle-receipt.v3.json",
  );
  fs.appendFileSync(predecessor, " ");
  assert.throws(
    () => buildS01ReviewBundleReceipt({ repoRoot: tempRepo, candidateRoot }),
    /predecessor_receipt_sha256_mismatch|no_drift_authority_receipt_sha256_mismatch/u,
  );
  const cli = spawnSync(process.execPath, [reviewScript, "--candidate", candidateRoot], { cwd: tempRepo, encoding: "utf8" });
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr, /predecessor_receipt_sha256_mismatch|no_drift_authority_receipt_sha256_mismatch/iu);
  assert.equal(fs.existsSync(path.join(candidateRoot, "review-content-bundle-receipt.v3.json")), false);
});

test("S01 final successor rejects a reparse point installed at the no-drift baseline leaf", (t) => {
  const { tempRepo, candidateRoot } = createFinalSuccessorFixture(t);
  const baselinePath = path.join(candidateRoot, "no-drift-baseline.json");
  const outsideBaseline = path.join(tempRepo, "outside-no-drift-baseline");
  fs.mkdirSync(outsideBaseline);
  fs.unlinkSync(baselinePath);
  fs.symlinkSync(outsideBaseline, baselinePath, "junction");

  assert.throws(
    () => buildS01ReviewBundleReceipt({ repoRoot: tempRepo, candidateRoot }),
    /receipt_reparse_point_forbidden/u,
  );
});

test("S01 review publication acquires the shared lock before bundle inputs and excludes a cooperating writer", (t) => {
  const { tempRepo, candidateRoot } = createFinalSuccessorFixture(t);
  const evidencePath = path.join(tempRepo, ...SOURCE_EVIDENCE.split("/"));
  const before = fs.readFileSync(evidencePath);
  let hookCalls = 0;

  const result = publishS01ReviewBundleReceipt({
    repoRoot: tempRepo,
    candidateRoot,
    beforeInputRead() {
      hookCalls++;
      assert.equal(fs.existsSync(path.join(candidateRoot, ".s01-receipt-publication.lock")), true);
      const child = spawnSync(process.execPath, [
        "--input-type=module",
        "--eval",
        `import fs from "node:fs";
         import { withS01ReceiptPublicationLock } from ${JSON.stringify(new URL("./build_s01_candidate_receipt.mjs", import.meta.url).href)};
         try {
           withS01ReceiptPublicationLock({ repoRoot: ${JSON.stringify(tempRepo)}, candidateRoot: ${JSON.stringify(candidateRoot)} }, () => {
             fs.writeFileSync(${JSON.stringify(evidencePath)}, "competing mutation\\n");
           });
           process.exitCode = 3;
         } catch (error) {
           if (!String(error.message).includes("receipt_publication_lock_exists")) {
             console.error(error);
             process.exitCode = 4;
           }
         }`,
      ], { cwd: tempRepo, encoding: "utf8" });
      assert.equal(child.status, 0, child.stderr || child.stdout);
    },
  });

  assert.equal(hookCalls, 1);
  assert.deepEqual(fs.readFileSync(evidencePath), before);
  assert.equal(fs.existsSync(result.output), true);
  assert.equal(fs.existsSync(path.join(candidateRoot, ".s01-receipt-publication.lock")), false);
});

test("S01 review CLI parses every argument before reading or writing candidate files", (t) => {
  for (const argsFor of [
    (root) => ["--help"],
    (root) => ["--candidate"],
    (root) => ["--candidate", root, "--candidate", root],
    (root) => ["--candidate", root, "--unknown"],
    (root) => ["--candidate", root, "trailing"],
    (root) => [root, "trailing"],
  ]) {
    const { tempRepo, candidateRoot, reviewScript } = createFinalSuccessorFixture(t);
    const before = candidateTreeSnapshot(candidateRoot);
    const args = argsFor(candidateRoot);
    const result = spawnSync(process.execPath, [reviewScript, ...args], { cwd: tempRepo, encoding: "utf8" });
    if (args[0] === "--help") {
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(result.stdout, /Usage:.*build_s01_review_bundle_receipt\.mjs/u);
    } else {
      assert.notEqual(result.status, 0, `arguments unexpectedly succeeded: ${args.join(" ")}`);
      assert.match(result.stderr, /(duplicate argument|missing value|unknown argument|unexpected positional argument)/iu);
    }
    assert.deepEqual(candidateTreeSnapshot(candidateRoot), before);
    assert.equal(fs.existsSync(path.join(candidateRoot, "review-content-bundle-receipt.v3.json")), false);
  }
});
