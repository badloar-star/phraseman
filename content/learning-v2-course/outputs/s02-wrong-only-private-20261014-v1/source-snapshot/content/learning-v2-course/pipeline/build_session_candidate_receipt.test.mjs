import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildInitialReviewManifest,
  buildSessionCandidateReceipt,
  prepareSessionCandidateSnapshot,
  writeSessionCandidateEvidence,
} from "./build_session_candidate_receipt.mjs";
import { validateLearningV2SessionCandidate } from "../../../scripts/serve_learning_v2_static_owner_review.mjs";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const write = (root, relative, value) => {
  const absolute = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  return absolute;
};

function fixture(t, { sessionNumber = "02", withPreview = false } = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-session-receipt-"));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  const session = `en/l01/s${sessionNumber}`;
  const sessionId = `en:lesson-01:session-${sessionNumber}`;
  const interactionCount = sessionNumber === "01" ? 20 : 21;
  const candidateRoot = path.join(repoRoot, `content/learning-v2-course/outputs/s${sessionNumber}-final-fixture`);
  const sourceFiles = [
    `content/learning-v2-course/sessions/en/l01/s${sessionNumber}/final.ru.md`,
    `content/learning-v2-course/sessions/en/l01/s${sessionNumber}/final.uk.md`,
    `content/learning-v2-course/sessions/en/l01/s${sessionNumber}/locales_batch.md`,
    `content/learning-v2-course/sessions/en/l01/s${sessionNumber}/practice.atomic.json`,
    ...(sessionNumber === "03" ? [] : [`content/learning-v2-course/sessions/en/l01/s${sessionNumber}/practice.explanations.v1.json`]),
  ];
  for (const relative of [
    ...sourceFiles,
    ...(["01", "02"].includes(sessionNumber)
      ? [`content/learning-v2-course/judgements/2026-10-13_l01_s${sessionNumber}_source_evidence.md`]
      : []),
    "content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md",
    "content/learning-v2-course/migration/single-phrase-2026-10-03/preservation-ledger.json",
    "content/learning-v2-course/pipeline/build_release.mjs",
    "content/learning-v2-course/pipeline/practice_explanations_v1.mjs",
    `content/learning-v2-course/pipeline/l01s${sessionNumber}_feedback_repair.test.mjs`,
    "content/learning-v2-course/pipeline/build_session_candidate_receipt.mjs",
    "content/learning-v2-course/pipeline/build_session_candidate_receipt.test.mjs",
  ]) write(repoRoot, relative, `${relative}\n`);
  const base = `content/learning-v2-course/outputs/s${sessionNumber}-final-fixture/en/l01/s${sessionNumber}`;
  write(repoRoot, `${base}/intro.json`, { courseSessionId: sessionId, pages: [{}, {}, {}], pageCount: 3, releaseAuthority: false });
  write(repoRoot, `${base}/auxiliary.json`, { courseSessionId: sessionId, entries: [{}, {}, {}] });
  for (const name of ["learner.json", "learner.uk.json"]) write(repoRoot, `${base}/${name}`, { courseSessionId: sessionId, interactions: Array.from({ length: interactionCount }, (_, index) => ({ interactionId: `${sessionId}:i${String(index + 1).padStart(2, "0")}` })), practiceInteractionCount: interactionCount, releaseAuthority: false });
  write(repoRoot, `${base}/answers.json`, Array.from({ length: interactionCount }, (_, index) => ({ interactionId: `${sessionId}:i${String(index + 1).padStart(2, "0")}` })));
  if (withPreview) {
    for (const name of ["index.html", "external.html", "app.js", "data.js"]) write(repoRoot, `content/learning-v2-course/outputs/s${sessionNumber}-final-fixture/${name}`, `${name}\n`);
  }

  const predecessorNumber = String(Math.max(1, Number(sessionNumber) - 1)).padStart(2, "0");
  const predecessorFile = `content/learning-v2-course/outputs/s${predecessorNumber}-frozen/en/l01/s${predecessorNumber}/learner.json`;
  write(repoRoot, predecessorFile, `frozen-s${predecessorNumber}\n`);
  const bytes = fs.readFileSync(path.join(repoRoot, ...predecessorFile.split("/")));
  const s01ReceiptPath = write(repoRoot, `content/learning-v2-course/outputs/s${predecessorNumber}-frozen/content-receipt.json`, {
    schemaVersion: "learning_v2_s01_content_receipt_v3",
    courseSessionId: `en:lesson-01:session-${predecessorNumber}`,
    releaseAuthority: false,
    immutableContentOnly: true,
    candidateRoot: `content/learning-v2-course/outputs/s${predecessorNumber}-frozen`,
    fileCount: 1,
    inventorySha256: sha256(JSON.stringify([{ path: predecessorFile, bytes: bytes.length, sha256: sha256(bytes) }])),
    files: [{ category: "content", path: predecessorFile, bytes: bytes.length, sha256: sha256(bytes) }],
  });
  return { repoRoot, candidateRoot, session, sessionId, sessionNumber, s01ReceiptPath };
}

test("generic session receipt binds S02 source snapshots, curriculum, five projections, and a verified frozen S01 boundary", async (t) => {
  const fx = fixture(t);
  await prepareSessionCandidateSnapshot(fx);
  const receipt = buildSessionCandidateReceipt(fx);
  assert.equal(receipt.courseSessionId, fx.sessionId);
  assert.equal(receipt.releaseAuthority, false);
  assert.equal(receipt.projection.introPages, 3);
  assert.equal(receipt.projection.practiceInteractions, 21);
  assert.equal(receipt.projection.fileCount, 5);
  assert.equal(receipt.preview.generated, false);
  assert.equal(receipt.frozenPredecessor.status, "PASS");
  assert.equal(receipt.files.some((entry) => entry.path.includes("source-snapshot/") && entry.path.endsWith("l01_s02_source_evidence.md")), true);
  assert.equal(receipt.files.some((entry) => entry.path.includes("source-snapshot/") && entry.path.endsWith("curriculum/en/ПЛАН_КУРСА.md")), true);
  const manifest = buildInitialReviewManifest({ receipt });
  assert.deepEqual(manifest.eligibleRoles, []);
  assert.deepEqual(manifest.missingRoles, ["learner", "reader", "pedagogy", "nonsense", "taste", "progression", "locale"]);
  assert.equal(manifest.releaseAuthority, false);
});

test("generic session receipt fails closed on candidate escape, session mismatch, and stale frozen S01 bytes", async (t) => {
  const fx = fixture(t);
  await prepareSessionCandidateSnapshot(fx);
  const escaped = path.join(fx.repoRoot, "outside");
  fs.mkdirSync(escaped);
  assert.throws(() => buildSessionCandidateReceipt({ ...fx, candidateRoot: escaped }), /candidate_root_not_direct_output_child/u);
  const intro = path.join(fx.candidateRoot, "en/l01/s02/intro.json");
  const parsed = JSON.parse(fs.readFileSync(intro, "utf8"));
  parsed.courseSessionId = "en:lesson-01:session-03";
  fs.writeFileSync(intro, JSON.stringify(parsed));
  assert.throws(() => buildSessionCandidateReceipt(fx), /candidate_course_session_mismatch/u);
  parsed.courseSessionId = fx.sessionId;
  fs.writeFileSync(intro, JSON.stringify(parsed));
  fs.appendFileSync(path.join(fx.repoRoot, "content/learning-v2-course/outputs/s01-frozen/en/l01/s01/learner.json"), "tamper");
  assert.throws(() => buildSessionCandidateReceipt(fx), /frozen_predecessor_file_mismatch/u);
});

test("evidence writer creates only new receipt and empty review manifest, then refuses overwrite", async (t) => {
  const fx = fixture(t);
  const receipt = await writeSessionCandidateEvidence(fx);
  assert.equal(receipt.releaseAuthority, false);
  const receiptPath = path.join(fx.candidateRoot, "content-receipt.json");
  const manifestPath = path.join(fx.candidateRoot, "review-evidence-manifest.json");
  assert.equal(fs.existsSync(receiptPath), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")).eligibleRoles, []);
  fs.writeFileSync(path.join(fx.repoRoot, "content/learning-v2-course/sessions/en/l01/s02/final.ru.md"), "later successor source\n");
  assert.deepEqual(buildSessionCandidateReceipt(fx), JSON.parse(fs.readFileSync(receiptPath, "utf8")), "historical candidate must verify from its own snapshots after editable source changes");
  await assert.rejects(writeSessionCandidateEvidence(fx), /candidate_evidence_already_exists/u);
});

test("generic receipt rejects an empty snapshot index and divergent projection interaction identities", async (t) => {
  const fx = fixture(t);
  await prepareSessionCandidateSnapshot(fx);
  const indexPath = path.join(fx.candidateRoot, "source-snapshot/index.json");
  const originalIndex = fs.readFileSync(indexPath);
  const empty = JSON.parse(originalIndex.toString("utf8"));
  empty.entries = [];
  fs.writeFileSync(indexPath, JSON.stringify(empty));
  assert.throws(() => buildSessionCandidateReceipt(fx), /candidate_snapshot_inventory_mismatch/u);
  fs.writeFileSync(indexPath, originalIndex);

  const ukPath = path.join(fx.candidateRoot, "en/l01/s02/learner.uk.json");
  const uk = JSON.parse(fs.readFileSync(ukPath, "utf8"));
  uk.interactions[1].interactionId = uk.interactions[0].interactionId;
  fs.writeFileSync(ukPath, JSON.stringify(uk));
  assert.throws(() => buildSessionCandidateReceipt(fx), /candidate_interaction_identity_mismatch/u);
});

test("generic private receipt supports S03 without fabricating a missing explanation sidecar", async (t) => {
  const fx = fixture(t, { sessionNumber: "03", withPreview: true });
  const receipt = await writeSessionCandidateEvidence(fx);
  assert.equal(receipt.courseSessionId, fx.sessionId);
  assert.equal(receipt.preview.generated, true);
  assert.equal(receipt.files.some((entry) => entry.path.endsWith("practice.explanations.v1.json")), false);
  assert.equal(receipt.files.some((entry) => entry.path.endsWith("l01s03_feedback_repair.test.mjs")), true);

  const receiptBytes = fs.readFileSync(path.join(fx.candidateRoot, "content-receipt.json"));
  const candidateFiles = receipt.files
    .filter((entry) => entry.category === "candidate" && entry.path.includes("/en/l01/s03/"))
    .map((entry) => ({
      path: entry.path.slice(`${receipt.candidateRoot}/`.length),
      bytes: entry.bytes,
      sha256: entry.sha256,
    }));
  const manifestPath = write(fx.repoRoot, "content/learning-v2-course/sessions/en/l01/s03/owner-review-preview-manifest.json", {
    schemaVersion: "learning_v2_session_private_preview_manifest_v1",
    courseSessionId: fx.sessionId,
    releaseAuthority: false,
    reviewStatus: "HOLD",
    textVerified: false,
    textReviewEvidencePersisted: false,
    candidateRoot: receipt.candidateRoot,
    candidateReceiptPath: `${receipt.candidateRoot}/content-receipt.json`,
    candidateReceiptInventorySha256: receipt.inventorySha256,
    contentReceiptSha256: sha256(receiptBytes),
    candidateBundleSha256: receipt.candidateBundleSha256,
    candidateFiles,
    holdReason: "No current candidate-bound persisted review evidence.",
  });
  const validated = await validateLearningV2SessionCandidate({
    courseRoot: path.join(fx.repoRoot, "content/learning-v2-course"),
    manifestPath,
  });
  assert.equal(validated.candidateKey, fx.session);
  assert.equal(validated.privatePreview, true);
});

test("generic private receipt supports S01 without claiming a predecessor", async (t) => {
  const fx = fixture(t, { sessionNumber: "01", withPreview: true });
  const receipt = await writeSessionCandidateEvidence(fx);
  assert.equal(receipt.courseSessionId, fx.sessionId);
  assert.equal(receipt.frozenPredecessor, null);
  assert.equal(receipt.files.some((entry) => entry.path.endsWith("practice.explanations.v1.json")), true);

  const receiptBytes = fs.readFileSync(path.join(fx.candidateRoot, "content-receipt.json"));
  const candidateFiles = receipt.files
    .filter((entry) => entry.category === "candidate" && entry.path.includes("/en/l01/s01/"))
    .map((entry) => ({
      path: entry.path.slice(`${receipt.candidateRoot}/`.length),
      bytes: entry.bytes,
      sha256: entry.sha256,
    }));
  const manifestPath = write(fx.repoRoot, "content/learning-v2-course/sessions/en/l01/s01/owner-review-preview-manifest.json", {
    schemaVersion: "learning_v2_session_private_preview_manifest_v1",
    courseSessionId: fx.sessionId,
    releaseAuthority: false,
    reviewStatus: "HOLD",
    textVerified: false,
    textReviewEvidencePersisted: false,
    candidateRoot: receipt.candidateRoot,
    candidateReceiptPath: `${receipt.candidateRoot}/content-receipt.json`,
    candidateReceiptInventorySha256: receipt.inventorySha256,
    contentReceiptSha256: sha256(receiptBytes),
    candidateBundleSha256: receipt.candidateBundleSha256,
    candidateFiles,
    holdReason: "No current candidate-bound persisted review evidence.",
  });
  const validated = await validateLearningV2SessionCandidate({
    courseRoot: path.join(fx.repoRoot, "content/learning-v2-course"),
    manifestPath,
  });
  assert.equal(validated.candidateKey, fx.session);
  assert.equal(validated.privatePreview, true);
});
