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

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const write = (root, relative, value) => {
  const absolute = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  return absolute;
};

function fixture(t) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-session-receipt-"));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  const session = "en/l01/s02";
  const sessionId = "en:lesson-01:session-02";
  const candidateRoot = path.join(repoRoot, "content/learning-v2-course/outputs/s02-final-fixture");
  for (const relative of [
    "content/learning-v2-course/sessions/en/l01/s02/final.ru.md",
    "content/learning-v2-course/sessions/en/l01/s02/final.uk.md",
    "content/learning-v2-course/sessions/en/l01/s02/locales_batch.md",
    "content/learning-v2-course/sessions/en/l01/s02/practice.atomic.json",
    "content/learning-v2-course/sessions/en/l01/s02/practice.explanations.v1.json",
    "content/learning-v2-course/judgements/2026-10-13_l01_s02_source_evidence.md",
    "content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md",
    "content/learning-v2-course/migration/single-phrase-2026-10-03/preservation-ledger.json",
    "content/learning-v2-course/pipeline/build_release.mjs",
    "content/learning-v2-course/pipeline/practice_explanations_v1.mjs",
    "content/learning-v2-course/pipeline/l01s02_feedback_repair.test.mjs",
    "content/learning-v2-course/pipeline/build_session_candidate_receipt.mjs",
    "content/learning-v2-course/pipeline/build_session_candidate_receipt.test.mjs",
  ]) write(repoRoot, relative, `${relative}\n`);
  const base = `content/learning-v2-course/outputs/s02-final-fixture/en/l01/s02`;
  write(repoRoot, `${base}/intro.json`, { courseSessionId: sessionId, pages: [{}, {}, {}], pageCount: 3, releaseAuthority: false });
  write(repoRoot, `${base}/auxiliary.json`, { courseSessionId: sessionId, entries: [{}, {}, {}] });
  for (const name of ["learner.json", "learner.uk.json"]) write(repoRoot, `${base}/${name}`, { courseSessionId: sessionId, interactions: Array.from({ length: 21 }, (_, index) => ({ interactionId: `${sessionId}:i${String(index + 1).padStart(2, "0")}` })), practiceInteractionCount: 21, releaseAuthority: false });
  write(repoRoot, `${base}/answers.json`, Array.from({ length: 21 }, (_, index) => ({ interactionId: `${sessionId}:i${String(index + 1).padStart(2, "0")}` })));

  const s01File = "content/learning-v2-course/outputs/s01-frozen/en/l01/s01/learner.json";
  write(repoRoot, s01File, "frozen-s01\n");
  const bytes = fs.readFileSync(path.join(repoRoot, ...s01File.split("/")));
  const s01ReceiptPath = write(repoRoot, "content/learning-v2-course/outputs/s01-frozen/content-receipt.json", {
    schemaVersion: "learning_v2_s01_content_receipt_v3",
    courseSessionId: "en:lesson-01:session-01",
    releaseAuthority: false,
    immutableContentOnly: true,
    candidateRoot: "content/learning-v2-course/outputs/s01-frozen",
    fileCount: 1,
    inventorySha256: sha256(JSON.stringify([{ path: s01File, bytes: bytes.length, sha256: sha256(bytes) }])),
    files: [{ category: "content", path: s01File, bytes: bytes.length, sha256: sha256(bytes) }],
  });
  return { repoRoot, candidateRoot, session, sessionId, s01ReceiptPath };
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
