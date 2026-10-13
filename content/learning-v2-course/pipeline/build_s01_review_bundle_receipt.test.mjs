import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildS01ReviewBundleReceipt, buildS01V2ToV3MigrationReceipt, verifyS01ReviewContentBundleReceipt } from "./build_s01_review_bundle_receipt.mjs";
import { buildS01ContentReceipt } from "./build_s01_candidate_receipt.mjs";

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

test("S01 i13 scene repair derives a direct stable successor from the frozen combined receipt", () => {
  const bundle = buildS01ReviewBundleReceipt({ repoRoot: REPO, candidateRoot: I13_SUCCESSOR });
  assert.equal(bundle.schemaVersion, "learning_v2_s01_review_content_bundle_receipt_v3");
  assert.equal(bundle.releaseAuthority, false);
  assert.equal(bundle.receiptChain.kind, "stable_content_bundle_successor");
  assert.equal(bundle.receiptChain.supersedes.path, "content/learning-v2-course/outputs/s01-combined-review-fixed-20261013/review-content-bundle-receipt.v3.json");
  assert.equal(bundle.receiptChain.supersedes.sha256, COMBINED_V3_SHA256);
  assert.equal(bundle.contentReceipt.inventorySha256, "278bcdb7da8d8fdb91abf175bd76c97940be6c085c24d9dbe74644ce80fb6755");
  assert.equal(fs.existsSync(path.join(I13_SUCCESSOR, "hash-receipt.json")), false);
  assert.equal(fs.existsSync(path.join(I13_SUCCESSOR, "legacy-v2-to-content-v3-migration.json")), false);
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

function createStableBundleFixture(t) {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s01-bundle-"));
  t.after(() => fs.rmSync(tempRepo, { recursive: true, force: true }));
  const contentReceipt = JSON.parse(fs.readFileSync(path.join(I13_SUCCESSOR, "content-receipt.json"), "utf8"));
  const boundary = JSON.parse(fs.readFileSync(path.join(I13_SUCCESSOR, "no-drift-baseline.json"), "utf8"));
  const requiredPaths = new Set([
    ...contentReceipt.files.map((entry) => entry.path),
    ...boundary.files.map((entry) => entry.path),
    "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013/content-receipt.json",
    "content/learning-v2-course/outputs/s01-combined-review-fixed-20261013/review-content-bundle-receipt.v3.json",
    "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
    "content/learning-v2-course/pipeline/build_s01_review_bundle_receipt.mjs",
    "content/learning-v2-course/judgements/2026-10-13_l01_s01_source_evidence.md",
    ...MUTABLE_REVIEW_PATHS,
  ]);
  for (const relativePath of requiredPaths) copyFixtureFile(tempRepo, relativePath);
  return {
    tempRepo,
    candidateRoot: path.join(tempRepo, "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013"),
    storedPath: path.join(tempRepo, "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013/review-content-bundle-receipt.v3.json"),
  };
}

test("S01 stable v3 mutation and tamper checks run only against a temporary repository", (t) => {
  const protectedRealPaths = [I13_V3, ...MUTABLE_REVIEW_PATHS.map((entry) => path.join(REPO, ...entry.split("/")))];
  const realSnapshots = protectedRealPaths.map((entry) => ({ path: entry, bytes: fs.readFileSync(entry), mtimeMs: fs.statSync(entry).mtimeMs }));
  const { tempRepo, candidateRoot, storedPath } = createStableBundleFixture(t);
  const stable = buildS01ReviewBundleReceipt({ repoRoot: tempRepo, candidateRoot });
  const stableBytes = Buffer.from(`${JSON.stringify(stable, null, 2)}\n`);
  assert.deepEqual(stableBytes, fs.readFileSync(I13_V3));

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
