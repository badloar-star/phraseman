import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { promoteSessionCandidate } from "./promote_session_candidate.mjs";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const bytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
function write(root, relative, value) {
  const absolute = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, Buffer.isBuffer(value) ? value : bytes(value));
  return absolute;
}

function fixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-promote-"));
  const session = "en/l01/s01";
  const sessionId = "en:lesson-01:session-01";
  const candidateRoot = "content/learning-v2-course/outputs/s01-test";
  const candidatePath = `${candidateRoot}/${session}/learner.json`;
  const localePath = `${candidateRoot}/source-snapshot/content/learning-v2-course/sessions/${session}/locales_batch.md`;
  const learner = bytes({ courseSessionId: sessionId });
  const locale = Buffer.from("locale\n");
  write(repoRoot, candidatePath, learner);
  write(repoRoot, localePath, locale);
  const files = [
    { category: "candidate", path: candidatePath, bytes: learner.length, sha256: sha256(learner) },
    { category: "source", path: localePath, bytes: locale.length, sha256: sha256(locale) },
  ].sort((a, b) => a.path.localeCompare(b.path));
  const candidateBundleSha256 = sha256(JSON.stringify(files.filter((x) => x.category === "candidate").map(({ path: file, bytes: size, sha256: digest }) => ({ path: file, bytes: size, sha256: digest }))));
  const inventorySha256 = sha256(JSON.stringify(files.map(({ category, path: file, bytes: size, sha256: digest }) => ({ category, path: file, bytes: size, sha256: digest }))));
  const candidateReceipt = {
    schemaVersion: "learning_v2_session_candidate_content_receipt_v1", courseSessionId: sessionId,
    releaseAuthority: false, immutableContentOnly: true, candidateRoot, candidateBundleSha256, inventorySha256,
    sourceSnapshot: { indexPath: `${candidateRoot}/source-snapshot/index.json`, indexSha256: "a".repeat(64), originCount: 1 },
    fileCount: files.length, files,
  };
  const candidateReceiptPath = `${candidateRoot}/content-receipt.json`;
  const receiptAbsolute = write(repoRoot, candidateReceiptPath, candidateReceipt);
  const contentReceiptSha256 = sha256(fs.readFileSync(receiptAbsolute));
  const identity = { sessionId, candidateBundleSha256, contentReceiptSha256 };
  const evidence = ["blind_learner", "language_pedagogy_locale"].map((dimension, index) => {
    const artifactPath = `content/learning-v2-course/judgements/${dimension}.json`;
    write(repoRoot, artifactPath, { ...identity, dimension, verdict: "PASS", findings: [] });
    return { dimension, artifactPath, dispatchProvenance: { agent: `/root/r${index}`, configuredModel: "gpt-6-luna" } };
  });
  const gatePath = "content/learning-v2-course/judgements/gates.json";
  write(repoRoot, gatePath, { schemaVersion: "learning_v2_session_deterministic_gate_report_v1", ...identity,
    candidateInventorySha256: inventorySha256, sourceFingerprint: "a".repeat(64), verdict: "PASS",
    gates: [{ id: "all", verdict: "PASS", command: "node all", exitCode: 0 }] });
  const manifestPath = `content/learning-v2-course/sessions/${session}/owner-review-preview-manifest.json`;
  write(repoRoot, manifestPath, {
    schemaVersion: "learning_v2_session_private_preview_manifest_v1", courseSessionId: sessionId,
    releaseAuthority: false, reviewStatus: "HOLD", textVerified: false, textReviewEvidencePersisted: false,
    candidateRoot, candidateReceiptPath, candidateReceiptInventorySha256: inventorySha256,
    contentReceiptSha256, candidateBundleSha256, candidateFiles: [],
    requiredRoles: ["old"], missingRoles: ["old"], holdReason: "old",
  });
  return { repoRoot, session, candidateReceiptPath, evidence, gatePath, manifestPath, candidateBundleSha256 };
}

test("create-only promotion persists acceptance and CAS-updates only the matching preview head", async (t) => {
  const fx = fixture();
  t.after(() => fs.rmSync(fx.repoRoot, { recursive: true, force: true }));
  const result = await promoteSessionCandidate({ repoRoot: fx.repoRoot, session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath, deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.evidence, ownerReviewManifestPath: fx.manifestPath });
  assert.equal(result.created, true);
  assert.equal(result.acceptanceReceipt.state, "TEXT_CANONICAL");
  const stored = JSON.parse(fs.readFileSync(path.join(fx.repoRoot, ...result.acceptanceReceiptPath.split("/")), "utf8"));
  assert.equal(stored.candidateBundleSha256, fx.candidateBundleSha256);
  const manifest = JSON.parse(fs.readFileSync(path.join(fx.repoRoot, ...fx.manifestPath.split("/")), "utf8"));
  assert.equal(manifest.reviewStatus, "TEXT_CANONICAL");
  assert.equal(manifest.textVerified, true);
  assert.equal(manifest.textReviewEvidencePersisted, true);
  assert.equal(manifest.releaseAuthority, false);
  assert.equal(manifest.acceptanceReceiptPath, result.acceptanceReceiptPath);
  assert.equal(manifest.acceptanceReceiptSha256, result.acceptanceReceiptSha256);
  assert.equal("missingRoles" in manifest, false);
  assert.equal("requiredRoles" in manifest, false);
  assert.equal("holdReason" in manifest, false);

  const repeat = await promoteSessionCandidate({ repoRoot: fx.repoRoot, session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath, deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.evidence, ownerReviewManifestPath: fx.manifestPath });
  assert.equal(repeat.created, false, "an identical immutable receipt is reused without overwrite");
});

test("promotion refuses a preview manifest pointing at a different candidate", async (t) => {
  const fx = fixture();
  t.after(() => fs.rmSync(fx.repoRoot, { recursive: true, force: true }));
  const manifestAbsolute = path.join(fx.repoRoot, ...fx.manifestPath.split("/"));
  const manifest = JSON.parse(fs.readFileSync(manifestAbsolute, "utf8"));
  manifest.candidateBundleSha256 = "0".repeat(64);
  fs.writeFileSync(manifestAbsolute, bytes(manifest));
  await assert.rejects(() => promoteSessionCandidate({ repoRoot: fx.repoRoot, session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath, deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.evidence, ownerReviewManifestPath: fx.manifestPath }), /owner_manifest_candidate_mismatch/u);
  assert.equal(fs.existsSync(path.join(fx.repoRoot, "content/learning-v2-course/accepted")), false);
});
