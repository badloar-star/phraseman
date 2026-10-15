import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSessionAcceptanceReceipt,
  validateActivationManifest,
  validateSessionAcceptanceReceipt,
} from "./session_acceptance_receipt.mjs";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function write(root, relative, value) {
  const absolute = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, Buffer.isBuffer(value) ? value : jsonBytes(value));
  return absolute;
}

function fixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-acceptance-"));
  const session = "en/l01/s01";
  const sessionId = "en:lesson-01:session-01";
  const candidateRoot = "content/learning-v2-course/outputs/s01-fixture";
  const candidateFile = `${candidateRoot}/${session}/learner.json`;
  const sourceFile = `${candidateRoot}/source-snapshot/content/learning-v2-course/sessions/${session}/locales_batch.md`;
  const candidateBytes = jsonBytes({ courseSessionId: sessionId, interactions: [] });
  const localeBytes = Buffer.from("locale evidence\n");
  write(repoRoot, candidateFile, candidateBytes);
  write(repoRoot, sourceFile, localeBytes);
  const files = [
    { category: "candidate", path: candidateFile, bytes: candidateBytes.length, sha256: sha256(candidateBytes) },
    { category: "source", path: sourceFile, bytes: localeBytes.length, sha256: sha256(localeBytes) },
  ].sort((a, b) => a.path.localeCompare(b.path));
  const candidateEntries = files.filter((entry) => entry.category === "candidate")
    .map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest }));
  const stable = files.map(({ category, path: file, bytes, sha256: digest }) => ({ category, path: file, bytes, sha256: digest }));
  const receipt = {
    schemaVersion: "learning_v2_session_candidate_content_receipt_v1",
    courseSessionId: sessionId,
    releaseAuthority: false,
    immutableContentOnly: true,
    candidateRoot,
    candidateBundleSha256: sha256(JSON.stringify(candidateEntries)),
    inventorySha256: sha256(JSON.stringify(stable)),
    sourceSnapshot: { indexPath: `${candidateRoot}/source-snapshot/index.json`, indexSha256: "a".repeat(64), originCount: 1 },
    fileCount: files.length,
    files,
  };
  const candidateReceiptPath = `${candidateRoot}/content-receipt.json`;
  const candidateReceiptAbsolute = write(repoRoot, candidateReceiptPath, receipt);
  const candidateReceiptSha256 = sha256(fs.readFileSync(candidateReceiptAbsolute));
  const identity = {
    sessionId,
    candidateBundleSha256: receipt.candidateBundleSha256,
    contentReceiptSha256: candidateReceiptSha256,
  };
  const reviewPaths = ["blind_learner", "language_pedagogy_locale"].map((dimension, index) => {
    const relative = `content/learning-v2-course/judgements/s01-${dimension}.json`;
    write(repoRoot, relative, { ...identity, dimension, verdict: "PASS", findings: [], taskCount: 1, taskIds: ["i01"] });
    return {
      dimension,
      artifactPath: relative,
      dispatchProvenance: { agent: `/root/reviewer-${index}`, configuredModel: "gpt-6-luna" },
    };
  });
  const gatePath = "content/learning-v2-course/judgements/s01-deterministic-gates.json";
  write(repoRoot, gatePath, {
    schemaVersion: "learning_v2_session_deterministic_gate_report_v1",
    ...identity,
    candidateInventorySha256: receipt.inventorySha256,
    sourceFingerprint: receipt.sourceSnapshot.indexSha256,
    verdict: "PASS",
    gates: [{ id: "fixture", verdict: "PASS", command: "node fixture", exitCode: 0 }],
  });
  return { repoRoot, session, sessionId, receipt, candidateReceiptPath, candidateReceiptSha256, reviewPaths, gatePath, sourceFile };
}

test("builds and validates a non-active TEXT_CANONICAL receipt with exactly two evidence dimensions", async (t) => {
  const fx = fixture();
  t.after(() => fs.rmSync(fx.repoRoot, { recursive: true, force: true }));
  const receipt = await buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewPaths,
  });
  assert.equal(receipt.state, "TEXT_CANONICAL");
  assert.equal(receipt.releaseAuthority, false);
  assert.equal(receipt.immutableContentOnly, true);
  assert.equal(receipt.semanticAudioVerified, false);
  assert.equal(receipt.audioTechnicalEvidence, null);
  assert.deepEqual(receipt.reviewEvidence.map((entry) => entry.dimension), ["blind_learner", "language_pedagogy_locale"]);
  assert.equal(receipt.localeEvidence.sha256, fx.receipt.files.find((entry) => entry.category === "source").sha256);

  const acceptancePath = `content/learning-v2-course/accepted/en/l01/s01/${fx.receipt.candidateBundleSha256}/acceptance-receipt.json`;
  write(fx.repoRoot, acceptancePath, receipt);
  const validated = await validateSessionAcceptanceReceipt({ repoRoot: fx.repoRoot, acceptanceReceiptPath: acceptancePath });
  assert.equal(validated.state, "TEXT_CANONICAL");
  assert.equal(validated.candidateBundleSha256, fx.receipt.candidateBundleSha256);
});

test("rejects missing, duplicate, stale, failed, non-Luna, and tampered evidence", async (t) => {
  const fx = fixture();
  t.after(() => fs.rmSync(fx.repoRoot, { recursive: true, force: true }));
  await assert.rejects(() => buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewPaths.slice(0, 1),
  }), /review_dimension_set_invalid/u);
  await assert.rejects(() => buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: [fx.reviewPaths[0], { ...fx.reviewPaths[0] }],
  }), /review_dimension_set_invalid/u);
  await assert.rejects(() => buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewPaths.map((entry, index) => index ? { ...entry, dispatchProvenance: { ...entry.dispatchProvenance, configuredModel: "gpt-6-sol" } } : entry),
  }), /review_model_invalid/u);

  const badReview = JSON.parse(fs.readFileSync(path.join(fx.repoRoot, ...fx.reviewPaths[0].artifactPath.split("/")), "utf8"));
  badReview.verdict = "FAIL";
  write(fx.repoRoot, fx.reviewPaths[0].artifactPath, badReview);
  await assert.rejects(() => buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewPaths,
  }), /review_verdict_not_pass/u);

  badReview.verdict = "PASS";
  badReview.candidateBundleSha256 = "0".repeat(64);
  write(fx.repoRoot, fx.reviewPaths[0].artifactPath, badReview);
  await assert.rejects(() => buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewPaths,
  }), /review_candidate_mismatch/u);
});

test("accepted receipt validation fails closed after candidate, gate, locale, or review tampering", async (t) => {
  const fx = fixture();
  t.after(() => fs.rmSync(fx.repoRoot, { recursive: true, force: true }));
  const receipt = await buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewPaths,
  });
  const acceptancePath = `content/learning-v2-course/accepted/en/l01/s01/${fx.receipt.candidateBundleSha256}/acceptance-receipt.json`;
  write(fx.repoRoot, acceptancePath, receipt);

  fs.appendFileSync(path.join(fx.repoRoot, ...fx.reviewPaths[0].artifactPath.split("/")), " ");
  await assert.rejects(() => validateSessionAcceptanceReceipt({ repoRoot: fx.repoRoot, acceptanceReceiptPath: acceptancePath }), /review_artifact_stale/u);
});

test("activation manifest remains HOLD and only accepts a contiguous prefix of acceptance receipts", async () => {
  assert.deepEqual(validateActivationManifest({
    schemaVersion: "learning_v2_active_sessions_v1",
    courseReleaseState: "HOLD",
    activeSessions: [],
  }), { courseReleaseState: "HOLD", activeCount: 0 });
  assert.deepEqual(validateActivationManifest({
    schemaVersion: "learning_v2_active_sessions_v1",
    courseReleaseState: "HOLD",
    activeSessions: [
      { session: "en/l01/s01", acceptanceReceiptPath: "accepted/en/l01/s01/a/acceptance-receipt.json", acceptanceReceiptSha256: "a".repeat(64) },
      { session: "en/l01/s02", acceptanceReceiptPath: "accepted/en/l01/s02/b/acceptance-receipt.json", acceptanceReceiptSha256: "b".repeat(64) },
    ],
  }), { courseReleaseState: "HOLD", activeCount: 2 });
  assert.throws(() => validateActivationManifest({
    schemaVersion: "learning_v2_active_sessions_v1",
    courseReleaseState: "HOLD",
    activeSessions: [{ session: "en/l01/s02", acceptanceReceiptPath: "x", acceptanceReceiptSha256: "b".repeat(64) }],
  }), /activation_prefix_noncontiguous/u);
  assert.throws(() => validateActivationManifest({
    schemaVersion: "learning_v2_active_sessions_v1",
    courseReleaseState: "ACTIVE",
    activeSessions: [],
  }), /course_release_state_invalid/u);
});
