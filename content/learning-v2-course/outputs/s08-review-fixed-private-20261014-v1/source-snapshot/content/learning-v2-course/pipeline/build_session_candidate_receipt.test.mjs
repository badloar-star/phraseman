import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildInitialReviewManifest,
  buildSessionCandidateReceipt,
  materializePreparedSessionCandidateEvidence,
  prepareSessionCandidateSnapshot,
  writeSessionCandidateEvidence,
} from "./build_session_candidate_receipt.mjs";
import { buildSessionAcceptanceReceipt, validateSessionAcceptanceReceipt } from "./session_acceptance_receipt.mjs";
import {
  buildLearningV2OwnerReviewFullCourseHtml,
  validateLearningV2SessionCandidate,
} from "../../../scripts/serve_learning_v2_static_owner_review.mjs";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const write = (root, relative, value) => {
  const absolute = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  return absolute;
};

function fixture(t, { sessionNumber = "02", withPreview = false, candidateTag = "final-fixture", repoRoot: existingRepoRoot } = {}) {
  const repoRoot = existingRepoRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-session-receipt-"));
  if (!existingRepoRoot) t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  const session = `en/l01/s${sessionNumber}`;
  const sessionId = `en:lesson-01:session-${sessionNumber}`;
  const interactionCount = new Map([["01", 20], ["05", 20], ["06", 19], ["07", 18]]).get(sessionNumber) ?? 21;
  const candidateRoot = path.join(repoRoot, `content/learning-v2-course/outputs/s${sessionNumber}-${candidateTag}`);
  const sourceFiles = [
    `content/learning-v2-course/sessions/en/l01/s${sessionNumber}/final.ru.md`,
    `content/learning-v2-course/sessions/en/l01/s${sessionNumber}/final.uk.md`,
    `content/learning-v2-course/sessions/en/l01/s${sessionNumber}/locales_batch.md`,
    `content/learning-v2-course/sessions/en/l01/s${sessionNumber}/practice.atomic.json`,
    ...(["01", "02"].includes(sessionNumber) ? [`content/learning-v2-course/sessions/en/l01/s${sessionNumber}/practice.explanations.v1.json`] : []),
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
    ...(sessionNumber === "05" ? ["content/learning-v2-course/pipeline/session_acceptance_receipt.mjs"] : []),
  ]) write(repoRoot, relative, `${relative}\n`);
  const base = `content/learning-v2-course/outputs/s${sessionNumber}-${candidateTag}/en/l01/s${sessionNumber}`;
  write(repoRoot, `${base}/intro.json`, { courseSessionId: sessionId, pages: [{}, {}, {}], pageCount: 3, releaseAuthority: false });
  write(repoRoot, `${base}/auxiliary.json`, { courseSessionId: sessionId, entries: [{}, {}, {}] });
  for (const name of ["learner.json", "learner.uk.json"]) write(repoRoot, `${base}/${name}`, { courseSessionId: sessionId, interactions: Array.from({ length: interactionCount }, (_, index) => ({ interactionId: `${sessionId}:i${String(index + 1).padStart(2, "0")}` })), practiceInteractionCount: interactionCount, releaseAuthority: false });
  write(repoRoot, `${base}/answers.json`, Array.from({ length: interactionCount }, (_, index) => ({ interactionId: `${sessionId}:i${String(index + 1).padStart(2, "0")}` })));
  if (withPreview) {
    for (const name of ["index.html", "external.html", "app.js", "data.js"]) write(repoRoot, `content/learning-v2-course/outputs/s${sessionNumber}-${candidateTag}/${name}`, `${name}\n`);
  }

  const predecessorNumber = String(Math.max(1, Number(sessionNumber) - 1)).padStart(2, "0");
  const predecessorFile = `content/learning-v2-course/outputs/s${predecessorNumber}-frozen/en/l01/s${predecessorNumber}/learner.json`;
  write(repoRoot, predecessorFile, `frozen-s${predecessorNumber}\n`);
  const bytes = fs.readFileSync(path.join(repoRoot, ...predecessorFile.split("/")));
  const predecessorEntry = { category: "content", path: predecessorFile, bytes: bytes.length, sha256: sha256(bytes) };
  const genericPredecessor = Number(sessionNumber) >= 3;
  const s01ReceiptPath = write(repoRoot, `content/learning-v2-course/outputs/s${predecessorNumber}-frozen/content-receipt.json`, {
    schemaVersion: genericPredecessor ? "learning_v2_session_candidate_content_receipt_v1" : "learning_v2_s01_content_receipt_v3",
    courseSessionId: `en:lesson-01:session-${predecessorNumber}`,
    releaseAuthority: false,
    immutableContentOnly: true,
    candidateRoot: `content/learning-v2-course/outputs/s${predecessorNumber}-frozen`,
    fileCount: 1,
    inventorySha256: sha256(JSON.stringify([genericPredecessor
      ? predecessorEntry
      : { path: predecessorFile, bytes: bytes.length, sha256: sha256(bytes) }])),
    files: [predecessorEntry],
  });
  return { repoRoot, candidateRoot, session, sessionId, sessionNumber, s01ReceiptPath };
}

function revisionChild(fx, tag, marker) {
  const candidateRoot = path.join(
    fx.repoRoot,
    `content/learning-v2-course/outputs/s${fx.sessionNumber}-${tag}`,
  );
  const sourceProjection = path.join(fx.candidateRoot, fx.session);
  const targetProjection = path.join(candidateRoot, fx.session);
  fs.cpSync(sourceProjection, targetProjection, { recursive: true });
  for (const name of ["index.html", "external.html", "app.js", "data.js"]) {
    const source = path.join(fx.candidateRoot, name);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(candidateRoot, name));
  }
  fs.appendFileSync(path.join(candidateRoot, "app.js"), `revision:${marker}\n`);
  return { ...fx, candidateRoot };
}

function privateHeadManifest(fx, receipt) {
  const receiptPath = path.join(fx.repoRoot, ...`${receipt.candidateRoot}/content-receipt.json`.split("/"));
  const receiptBytes = fs.readFileSync(receiptPath);
  const candidateFiles = receipt.files
    .filter((entry) => entry.category === "candidate" && entry.path.includes(`/${fx.session}/`))
    .map((entry) => ({
      path: entry.path.slice(`${receipt.candidateRoot}/`.length),
      bytes: entry.bytes,
      sha256: entry.sha256,
    }));
  return {
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
  };
}

async function writeAcceptanceForCandidate(fx, candidateReceipt) {
  const candidateReceiptPath = `${candidateReceipt.candidateRoot}/content-receipt.json`;
  const candidateReceiptAbsolute = path.join(fx.repoRoot, ...candidateReceiptPath.split("/"));
  const contentReceiptSha256 = sha256(fs.readFileSync(candidateReceiptAbsolute));
  const identity = {
    sessionId: fx.sessionId,
    candidateBundleSha256: candidateReceipt.candidateBundleSha256,
    contentReceiptSha256,
  };
  const reviewEvidence = ["blind_learner", "language_pedagogy_locale"].map((dimension, index) => {
    const artifactPath = `content/learning-v2-course/judgements/s${fx.sessionNumber}-${candidateReceipt.candidateBundleSha256.slice(0, 12)}-${dimension}.json`;
    write(fx.repoRoot, artifactPath, { ...identity, dimension, verdict: "PASS", findings: [], taskCount: 1, taskIds: ["i01"] });
    return {
      dimension,
      artifactPath,
      dispatchProvenance: { agent: `/root/s${fx.sessionNumber}-reviewer-${index}`, configuredModel: "gpt-6-luna" },
    };
  });
  const gatePath = `content/learning-v2-course/judgements/s${fx.sessionNumber}-${candidateReceipt.candidateBundleSha256.slice(0, 12)}-deterministic-gates.json`;
  write(fx.repoRoot, gatePath, {
    schemaVersion: "learning_v2_session_deterministic_gate_report_v1",
    ...identity,
    candidateInventorySha256: candidateReceipt.inventorySha256,
    sourceFingerprint: candidateReceipt.sourceSnapshot.indexSha256,
    verdict: "PASS",
    gates: [{ id: "fixture", verdict: "PASS", command: "node fixture", exitCode: 0 }],
  });
  const acceptance = await buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath,
    deterministicGateReportPath: gatePath,
    reviewEvidence,
  });
  const acceptanceReceiptPath = `content/learning-v2-course/accepted/${fx.session}/${candidateReceipt.candidateBundleSha256}/acceptance-receipt.json`;
  write(fx.repoRoot, acceptanceReceiptPath, acceptance);
  const validatedAcceptance = await validateSessionAcceptanceReceipt({ repoRoot: fx.repoRoot, acceptanceReceiptPath });
  return { acceptanceReceiptPath, validatedAcceptance, candidateReceiptPath, candidateReceiptAbsolute };
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

test("S04 snapshot binds only existing source and contract inputs, with an explicit frozen S03 predecessor", async (t) => {
  const fx = fixture(t, { sessionNumber: "04" });
  await prepareSessionCandidateSnapshot(fx);
  const index = JSON.parse(fs.readFileSync(path.join(fx.candidateRoot, "source-snapshot/index.json"), "utf8"));
  const origins = index.entries.map((entry) => entry.originalPath);
  assert.ok(origins.includes("content/learning-v2-course/sessions/en/l01/s04/final.ru.md"));
  assert.ok(origins.includes("content/learning-v2-course/sessions/en/l01/s04/practice.atomic.json"));
  assert.ok(!origins.some((entry) => entry.includes("practice.explanations.v1.json")));
  assert.ok(!origins.some((entry) => entry.includes("s04_source_evidence")));
  assert.throws(() => buildSessionCandidateReceipt(fx), /s04_predecessor_receipt_required/u);

  const receipt = buildSessionCandidateReceipt({ ...fx, predecessorReceiptPath: fx.s01ReceiptPath });
  assert.equal(receipt.courseSessionId, "en:lesson-01:session-04");
  assert.equal(receipt.frozenPredecessor.status, "PASS");
  assert.equal(receipt.frozenPredecessor.receiptPath, "content/learning-v2-course/outputs/s03-frozen/content-receipt.json");
  assert.equal(receipt.releaseAuthority, false);
  assert.equal(receipt.immutableContentOnly, true);
});

test("S04 rejects an explicit frozen predecessor receipt for S02", async (t) => {
  const fx = fixture(t, { sessionNumber: "04" });
  await prepareSessionCandidateSnapshot(fx);
  const wrong = write(fx.repoRoot, "content/learning-v2-course/outputs/s02-wrong/content-receipt.json", {
    schemaVersion: "learning_v2_session_candidate_content_receipt_v1",
    courseSessionId: "en:lesson-01:session-02",
    releaseAuthority: false,
    immutableContentOnly: true,
    files: [],
    fileCount: 0,
  });
  assert.throws(() => buildSessionCandidateReceipt({ ...fx, predecessorReceiptPath: wrong }), /frozen_predecessor_receipt_invalid/u);
});

test("S04 private preview validates through the static reviewer only while release authority is false", async (t) => {
  const fx = fixture(t, { sessionNumber: "04", withPreview: true });
  const receipt = await writeSessionCandidateEvidence({ ...fx, predecessorReceiptPath: fx.s01ReceiptPath });
  const manifestPath = write(fx.repoRoot, "content/learning-v2-course/sessions/en/l01/s04/owner-review-preview-manifest.json", privateHeadManifest(fx, receipt));
  const accepted = await validateLearningV2SessionCandidate({
    courseRoot: path.join(fx.repoRoot, "content/learning-v2-course"),
    manifestPath,
  });
  assert.equal(accepted.candidateKey, "en/l01/s04");
  assert.equal(accepted.privatePreview, true);
  assert.equal(accepted.textCanonical, false);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.releaseAuthority = true;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await assert.rejects(validateLearningV2SessionCandidate({
    courseRoot: path.join(fx.repoRoot, "content/learning-v2-course"),
    manifestPath,
  }), /candidate_manifest_release_authority_not_false/u);
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

test("S03 revision receipt freezes both the S02 course edge and the current S03 revision edge, then advances the private head", async (t) => {
  const head = fixture(t, { sessionNumber: "03", withPreview: true });
  const headReceipt = await writeSessionCandidateEvidence(head);
  const headReceiptPath = path.join(head.candidateRoot, "content-receipt.json");
  const ownerManifestPath = write(
    head.repoRoot,
    "content/learning-v2-course/sessions/en/l01/s03/owner-review-preview-manifest.json",
    privateHeadManifest(head, headReceipt),
  );
  const child = revisionChild(head, "revision-child", "one");
  const receipt = await writeSessionCandidateEvidence({
    ...child,
    predecessorReceiptPath: head.s01ReceiptPath,
    revisionPredecessorReceiptPath: headReceiptPath,
    ownerReviewManifestPath: ownerManifestPath,
  });

  assert.match(receipt.frozenPredecessor.receiptPath, /s02-frozen\/content-receipt\.json$/u);
  assert.equal(receipt.frozenRevisionPredecessor.status, "PASS");
  assert.equal(receipt.frozenRevisionPredecessor.receiptSha256, sha256(fs.readFileSync(headReceiptPath)));
  assert.equal(receipt.frozenRevisionPredecessor.inventorySha256, headReceipt.inventorySha256);
  assert.equal(receipt.frozenRevisionPredecessor.candidateBundleSha256, headReceipt.candidateBundleSha256);
  assert.notEqual(receipt.candidateBundleSha256, headReceipt.candidateBundleSha256);

  const advanced = JSON.parse(fs.readFileSync(ownerManifestPath, "utf8"));
  assert.equal(advanced.candidateReceiptPath, `${receipt.candidateRoot}/content-receipt.json`);
  assert.equal(advanced.contentReceiptSha256, sha256(fs.readFileSync(path.join(child.candidateRoot, "content-receipt.json"))));
  assert.equal(advanced.candidateBundleSha256, receipt.candidateBundleSha256);
  const validated = await validateLearningV2SessionCandidate({
    courseRoot: path.join(head.repoRoot, "content/learning-v2-course"),
    manifestPath: ownerManifestPath,
  });
  assert.equal(validated.candidateBundleSha256, receipt.candidateBundleSha256);
});

test("course and revision predecessor roles cannot be interchanged", async (t) => {
  const head = fixture(t, { sessionNumber: "03", withPreview: true });
  const headReceipt = await writeSessionCandidateEvidence(head);
  const headReceiptPath = path.join(head.candidateRoot, "content-receipt.json");
  const child = revisionChild(head, "wrong-edge-child", "wrong-edge");
  await prepareSessionCandidateSnapshot(child);

  assert.throws(
    () => buildSessionCandidateReceipt({
      ...child,
      predecessorReceiptPath: headReceiptPath,
      revisionPredecessorReceiptPath: headReceiptPath,
    }),
    /frozen_predecessor_receipt_invalid/u,
  );
  assert.throws(
    () => buildSessionCandidateReceipt({
      ...child,
      predecessorReceiptPath: head.s01ReceiptPath,
      revisionPredecessorReceiptPath: head.s01ReceiptPath,
    }),
    /frozen_revision_predecessor_receipt_invalid/u,
  );
});

test("revision predecessor verification rejects tampered immutable files", async (t) => {
  const head = fixture(t, { sessionNumber: "03", withPreview: true });
  const headReceipt = await writeSessionCandidateEvidence(head);
  const headReceiptPath = path.join(head.candidateRoot, "content-receipt.json");
  const changedChild = revisionChild(head, "tamper-child", "changed");
  await prepareSessionCandidateSnapshot(changedChild);
  fs.appendFileSync(path.join(head.candidateRoot, head.session, "learner.json"), "tamper");
  assert.throws(
    () => buildSessionCandidateReceipt({
      ...changedChild,
      predecessorReceiptPath: head.s01ReceiptPath,
      revisionPredecessorReceiptPath: headReceiptPath,
    }),
    /frozen_revision_predecessor_file_mismatch/u,
  );
  assert.equal(headReceipt.courseSessionId, head.sessionId);
});

test("revision head compare-and-set rejects a stale head and permits only the first competing child", async (t) => {
  const head = fixture(t, { sessionNumber: "03", withPreview: true });
  const headReceipt = await writeSessionCandidateEvidence(head);
  const headReceiptPath = path.join(head.candidateRoot, "content-receipt.json");
  const ownerManifestPath = write(
    head.repoRoot,
    "content/learning-v2-course/sessions/en/l01/s03/owner-review-preview-manifest.json",
    privateHeadManifest(head, headReceipt),
  );
  const first = revisionChild(head, "competing-first", "first");
  const second = revisionChild(head, "competing-second", "second");
  await writeSessionCandidateEvidence({
    ...first,
    predecessorReceiptPath: head.s01ReceiptPath,
    revisionPredecessorReceiptPath: headReceiptPath,
    ownerReviewManifestPath: ownerManifestPath,
  });
  await assert.rejects(
    writeSessionCandidateEvidence({
      ...second,
      predecessorReceiptPath: head.s01ReceiptPath,
      revisionPredecessorReceiptPath: headReceiptPath,
      ownerReviewManifestPath: ownerManifestPath,
    }),
    /revision_head_changed/u,
  );

  const stale = revisionChild(head, "stale-child", "stale");
  await assert.rejects(
    writeSessionCandidateEvidence({
      ...stale,
      predecessorReceiptPath: head.s01ReceiptPath,
      revisionPredecessorReceiptPath: headReceiptPath,
      ownerReviewManifestPath: ownerManifestPath,
    }),
    /revision_head_changed/u,
  );
});

test("legacy v1 receipts without a revision edge rebuild byte-for-byte", async (t) => {
  const fx = fixture(t, { sessionNumber: "03", withPreview: true });
  const legacy = await writeSessionCandidateEvidence(fx);
  assert.equal(Object.hasOwn(legacy, "frozenRevisionPredecessor"), false);
  assert.deepEqual(
    buildSessionCandidateReceipt({
      ...fx,
      predecessorReceiptPath: fx.s01ReceiptPath,
    }),
    legacy,
  );
});

test("a separately prepared immutable snapshot can be materialized without recopying editable source", async (t) => {
  const fx = fixture(t, { sessionNumber: "03", withPreview: true });
  await prepareSessionCandidateSnapshot(fx);
  fs.writeFileSync(path.join(fx.repoRoot, "content/learning-v2-course/sessions/en/l01/s03/final.ru.md"), "later editable source\n");
  const receipt = await materializePreparedSessionCandidateEvidence(fx);
  assert.equal(receipt.courseSessionId, fx.sessionId);
  assert.equal(fs.existsSync(path.join(fx.candidateRoot, "content-receipt.json")), true);
  assert.equal(fs.existsSync(path.join(fx.candidateRoot, "review-evidence-manifest.json")), true);
});

test("S06 requires the exact frozen and accepted S05 predecessor and snapshots 19 interactions", async (t) => {
  const s04 = fixture(t, { sessionNumber: "04", withPreview: true });
  const s04Receipt = await writeSessionCandidateEvidence({ ...s04, predecessorReceiptPath: s04.s01ReceiptPath });
  const acceptedS04 = await writeAcceptanceForCandidate(s04, s04Receipt);
  const s05 = fixture(t, { sessionNumber: "05", withPreview: true, repoRoot: s04.repoRoot });
  const s05Receipt = await writeSessionCandidateEvidence({
    ...s05,
    predecessorReceiptPath: acceptedS04.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS04.acceptanceReceiptPath,
  });
  const acceptedS05 = await writeAcceptanceForCandidate(s05, s05Receipt);
  const s06 = fixture(t, { sessionNumber: "06", withPreview: true, repoRoot: s04.repoRoot });
  const canonicalHtml = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../mockup/index.html"), "utf8");
  const dataMarker = '<script id="data" type="application/json">';
  const dataStart = canonicalHtml.indexOf(dataMarker);
  const dataEnd = canonicalHtml.indexOf("</script>", dataStart + dataMarker.length);
  const canonicalEntries = JSON.parse(canonicalHtml.slice(dataStart + dataMarker.length, dataEnd));
  const candidateEntry = structuredClone(canonicalEntries.find((entry) => entry.key === "en/l01/s06"));
  candidateEntry.scene = `${candidateEntry.scene} [S06 acceptance fixture]`;
  candidateEntry.sceneByLocale.ru = candidateEntry.scene;
  const candidateHtml = `${canonicalHtml.slice(0, dataStart + dataMarker.length)}${JSON.stringify([candidateEntry])}${canonicalHtml.slice(dataEnd)}`;
  fs.writeFileSync(path.join(s06.candidateRoot, "index.html"), candidateHtml);

  await assert.rejects(writeSessionCandidateEvidence(s06), /s06_predecessor_receipt_required/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s06,
    predecessorReceiptPath: acceptedS05.candidateReceiptAbsolute,
  }), /s06_accepted_predecessor_receipt_required/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s06,
    predecessorReceiptPath: acceptedS04.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS04.acceptanceReceiptPath,
  }), /s06_frozen_predecessor_receipt_invalid/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s06,
    predecessorReceiptPath: acceptedS05.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS04.acceptanceReceiptPath,
  }), /s06_accepted_predecessor_wrong_session/u);
  assert.equal(fs.existsSync(path.join(s06.candidateRoot, "content-receipt.json")), false);

  const receipt = await writeSessionCandidateEvidence({
    ...s06,
    predecessorReceiptPath: acceptedS05.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS05.acceptanceReceiptPath,
  });
  assert.equal(receipt.courseSessionId, s06.sessionId);
  assert.deepEqual(receipt.projection, { fileCount: 5, introPages: 3, practiceInteractions: 19 });
  assert.equal(receipt.frozenPredecessor.receiptPath, acceptedS05.candidateReceiptPath);
  assert.equal(receipt.acceptedPredecessor.status, "PASS");
  assert.equal(receipt.acceptedPredecessor.acceptanceReceiptPath, acceptedS05.acceptanceReceiptPath);
  assert.equal(receipt.acceptedPredecessor.candidateReceiptSha256, acceptedS05.validatedAcceptance.candidateReceiptSha256);
  assert.ok(receipt.sourceSnapshot.originCount > 0);
  assert.ok(receipt.files.some((entry) => entry.path.endsWith("/pipeline/l01s06_feedback_repair.test.mjs")), "S06 test source is frozen in the source snapshot");
  assert.equal(receipt.files.some((entry) => entry.path.endsWith("/sessions/en/l01/s06/practice.explanations.v1.json")), false,
    "an absent explanation sidecar is not inventoried");
  for (const learnerName of ["learner.json", "learner.uk.json"]) {
    const learner = JSON.parse(fs.readFileSync(path.join(s06.candidateRoot, s06.session, learnerName), "utf8"));
    assert.equal(learner.interactions.length, 19);
    assert.equal(learner.practiceInteractionCount, 19);
  }

  const acceptedS06 = await writeAcceptanceForCandidate(s06, receipt);
  const manifest = {
    ...privateHeadManifest(s06, receipt),
    reviewStatus: "TEXT_CANONICAL",
    textVerified: true,
    textReviewEvidencePersisted: true,
    acceptanceReceiptPath: acceptedS06.acceptanceReceiptPath,
    acceptanceReceiptSha256: acceptedS06.validatedAcceptance.acceptanceReceiptSha256,
  };
  const manifestPath = write(s06.repoRoot, `content/learning-v2-course/sessions/${s06.session}/owner-review-preview-manifest.json`, manifest);
  const candidate = await validateLearningV2SessionCandidate({
    courseRoot: path.join(s06.repoRoot, "content/learning-v2-course"),
    manifestPath,
  });
  assert.equal(candidate.candidateKey, "en/l01/s06");
  assert.equal(candidate.textCanonical, true);
  const served = await buildLearningV2OwnerReviewFullCourseHtml(canonicalHtml, [{ ok: true, textVerified: candidate.textCanonical, candidate }], {
    canonicalHtml,
    includeRuntime: false,
  });
  assert.match(served, /const states=\[\{"key":"en\/l01\/s06","textVerified":true,"appActivated":false,"releaseAuthority":false\}\]/u,
    "S06 paints canonical only after its exact acceptance validates");

  const mismatchedManifestPath = write(s06.repoRoot, `content/learning-v2-course/sessions/${s06.session}/owner-review-preview-manifest-mismatch.json`, {
    ...manifest,
    acceptanceReceiptSha256: "0".repeat(64),
  });
  await assert.rejects(validateLearningV2SessionCandidate({
    courseRoot: path.join(s06.repoRoot, "content/learning-v2-course"),
    manifestPath: mismatchedManifestPath,
  }), /candidate_acceptance_manifest_mismatch/u);
  const held = await buildLearningV2OwnerReviewFullCourseHtml(canonicalHtml, [{
    ok: false,
    error: new Error("candidate_acceptance_manifest_mismatch"),
  }], { canonicalHtml, includeRuntime: false });
  assert.match(held, /candidate-validation-error/u);
  assert.doesNotMatch(held, /const states=\[\{"key":"en\/l01\/s06","textVerified":true/u);

  const s06WithSidecar = fixture(t, { sessionNumber: "06", candidateTag: "sidecar-fixture", repoRoot: s04.repoRoot });
  write(s06WithSidecar.repoRoot, `content/learning-v2-course/sessions/${s06WithSidecar.session}/practice.explanations.v1.json`, { optional: true });
  const sidecarReceipt = await writeSessionCandidateEvidence({
    ...s06WithSidecar,
    predecessorReceiptPath: acceptedS05.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS05.acceptanceReceiptPath,
  });
  assert.ok(sidecarReceipt.files.some((entry) => entry.path.endsWith("/sessions/en/l01/s06/practice.explanations.v1.json")),
    "a present optional explanation sidecar is included");
});

test("S07 requires the exact frozen and accepted S06 predecessor and snapshots 18 interactions", async (t) => {
  const s04 = fixture(t, { sessionNumber: "04", withPreview: true });
  const s04Receipt = await writeSessionCandidateEvidence({ ...s04, predecessorReceiptPath: s04.s01ReceiptPath });
  const acceptedS04 = await writeAcceptanceForCandidate(s04, s04Receipt);
  const s05 = fixture(t, { sessionNumber: "05", withPreview: true, repoRoot: s04.repoRoot });
  const s05Receipt = await writeSessionCandidateEvidence({
    ...s05,
    predecessorReceiptPath: acceptedS04.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS04.acceptanceReceiptPath,
  });
  const acceptedS05 = await writeAcceptanceForCandidate(s05, s05Receipt);
  const s06 = fixture(t, { sessionNumber: "06", withPreview: true, repoRoot: s04.repoRoot });
  const s06Receipt = await writeSessionCandidateEvidence({
    ...s06,
    predecessorReceiptPath: acceptedS05.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS05.acceptanceReceiptPath,
  });
  const acceptedS06 = await writeAcceptanceForCandidate(s06, s06Receipt);
  const s07 = fixture(t, { sessionNumber: "07", withPreview: true, repoRoot: s04.repoRoot });

  await assert.rejects(writeSessionCandidateEvidence(s07), /s07_predecessor_receipt_required/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s07,
    predecessorReceiptPath: acceptedS06.candidateReceiptAbsolute,
  }), /s07_accepted_predecessor_receipt_required/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s07,
    predecessorReceiptPath: acceptedS05.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS05.acceptanceReceiptPath,
  }), /s07_frozen_predecessor_receipt_invalid/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s07,
    predecessorReceiptPath: acceptedS06.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS05.acceptanceReceiptPath,
  }), /s07_accepted_predecessor_wrong_session/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s07,
    predecessorReceiptPath: `content//learning-v2-course/outputs/${path.basename(s06.candidateRoot)}/content-receipt.json`,
    acceptedPredecessorReceiptPath: acceptedS06.acceptanceReceiptPath,
  }), /s07_predecessor_receipt_path_not_canonical/u);

  const receipt = await writeSessionCandidateEvidence({
    ...s07,
    predecessorReceiptPath: acceptedS06.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS06.acceptanceReceiptPath,
  });
  assert.equal(receipt.courseSessionId, s07.sessionId);
  assert.deepEqual(receipt.projection, { fileCount: 5, introPages: 3, practiceInteractions: 18 });
  assert.equal(receipt.frozenPredecessor.receiptPath, acceptedS06.candidateReceiptPath);
  assert.equal(receipt.acceptedPredecessor.acceptanceReceiptPath, acceptedS06.acceptanceReceiptPath);
  assert.equal(receipt.acceptedPredecessor.candidateBundleSha256, s06Receipt.candidateBundleSha256);

  const tamperTarget = path.join(s06.candidateRoot, s06.session, "learner.json");
  fs.appendFileSync(tamperTarget, "tamper");
  const tamperedS07 = fixture(t, { sessionNumber: "07", withPreview: true, candidateTag: "tampered-predecessor", repoRoot: s04.repoRoot });
  await assert.rejects(writeSessionCandidateEvidence({
    ...tamperedS07,
    predecessorReceiptPath: acceptedS06.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS06.acceptanceReceiptPath,
  }), /s07_frozen_predecessor_file_mismatch/u);
});

test("S08 requires the exact frozen and accepted S07 predecessor and snapshots 21 interactions", async (t) => {
  const s04 = fixture(t, { sessionNumber: "04", withPreview: true });
  const s04Receipt = await writeSessionCandidateEvidence({ ...s04, predecessorReceiptPath: s04.s01ReceiptPath });
  const acceptedS04 = await writeAcceptanceForCandidate(s04, s04Receipt);
  const s05 = fixture(t, { sessionNumber: "05", withPreview: true, repoRoot: s04.repoRoot });
  const s05Receipt = await writeSessionCandidateEvidence({
    ...s05,
    predecessorReceiptPath: acceptedS04.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS04.acceptanceReceiptPath,
  });
  const acceptedS05 = await writeAcceptanceForCandidate(s05, s05Receipt);
  const s06 = fixture(t, { sessionNumber: "06", withPreview: true, repoRoot: s04.repoRoot });
  const s06Receipt = await writeSessionCandidateEvidence({
    ...s06,
    predecessorReceiptPath: acceptedS05.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS05.acceptanceReceiptPath,
  });
  const acceptedS06 = await writeAcceptanceForCandidate(s06, s06Receipt);
  const s07 = fixture(t, { sessionNumber: "07", withPreview: true, repoRoot: s04.repoRoot });
  const s07Receipt = await writeSessionCandidateEvidence({
    ...s07,
    predecessorReceiptPath: acceptedS06.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS06.acceptanceReceiptPath,
  });
  const acceptedS07 = await writeAcceptanceForCandidate(s07, s07Receipt);
  const s08 = fixture(t, { sessionNumber: "08", withPreview: true, repoRoot: s04.repoRoot });

  await assert.rejects(writeSessionCandidateEvidence(s08), /s08_predecessor_receipt_required/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s08,
    predecessorReceiptPath: acceptedS07.candidateReceiptAbsolute,
  }), /s08_accepted_predecessor_receipt_required/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s08,
    predecessorReceiptPath: acceptedS07.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS06.acceptanceReceiptPath,
  }), /s08_accepted_predecessor_wrong_session/u);

  const receipt = await writeSessionCandidateEvidence({
    ...s08,
    predecessorReceiptPath: acceptedS07.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: acceptedS07.acceptanceReceiptPath,
  });
  assert.equal(receipt.courseSessionId, s08.sessionId);
  assert.deepEqual(receipt.projection, { fileCount: 5, introPages: 3, practiceInteractions: 21 });
  assert.equal(receipt.frozenPredecessor.receiptPath, acceptedS07.candidateReceiptPath);
  assert.equal(receipt.acceptedPredecessor.acceptanceReceiptPath, acceptedS07.acceptanceReceiptPath);
  assert.equal(receipt.acceptedPredecessor.candidateBundleSha256, s07Receipt.candidateBundleSha256);
  assert.equal(receipt.files.filter((entry) => entry.category === "candidate" && entry.path.includes("/en/l01/s08/")).length, 5);
});

test("S05 requires both the exact S04 candidate receipt and a separately accepted S04 receipt", async (t) => {
  const fx = fixture(t, { sessionNumber: "05" });
  await assert.rejects(writeSessionCandidateEvidence(fx), /s05_predecessor_receipt_required/u);
  assert.equal(fs.existsSync(path.join(fx.candidateRoot, "content-receipt.json")), false);
  assert.equal(fs.existsSync(path.join(fx.candidateRoot, "review-evidence-manifest.json")), false);

  const acceptedS04 = fixture(t, { sessionNumber: "04", withPreview: true });
  const s04Receipt = await writeSessionCandidateEvidence({ ...acceptedS04, predecessorReceiptPath: acceptedS04.s01ReceiptPath });
  const accepted = await writeAcceptanceForCandidate(acceptedS04, s04Receipt);
  const s05 = fixture(t, { sessionNumber: "05", repoRoot: acceptedS04.repoRoot });
  await assert.rejects(writeSessionCandidateEvidence({
    ...s05,
    predecessorReceiptPath: accepted.candidateReceiptAbsolute,
  }), /s05_accepted_predecessor_receipt_required/u);
  assert.equal(fs.existsSync(path.join(s05.candidateRoot, "content-receipt.json")), false);
  assert.equal(fs.existsSync(path.join(s05.candidateRoot, "review-evidence-manifest.json")), false);
});

test("S05 accepts a validated immutable S04 acceptance and emits only five projections with its authored 20 interactions", async (t) => {
  const s04 = fixture(t, { sessionNumber: "04", withPreview: true });
  const s04Receipt = await writeSessionCandidateEvidence({ ...s04, predecessorReceiptPath: s04.s01ReceiptPath });
  const accepted = await writeAcceptanceForCandidate(s04, s04Receipt);
  const s05 = fixture(t, { sessionNumber: "05", withPreview: true, repoRoot: s04.repoRoot });
  const options = {
    ...s05,
    predecessorReceiptPath: accepted.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: accepted.acceptanceReceiptPath,
  };
  assert.throws(() => buildSessionCandidateReceipt(options), /s05_acceptance_validation_required/u);

  const projectionRoot = path.join(s05.candidateRoot, ...s05.session.split("/"));
  for (const learnerName of ["learner.json", "learner.uk.json"]) {
    const learnerPath = path.join(projectionRoot, learnerName);
    const learner = JSON.parse(fs.readFileSync(learnerPath, "utf8"));
    learner.interactions.push({ interactionId: `${s05.sessionId}:i21` });
    learner.practiceInteractionCount = 21;
    fs.writeFileSync(learnerPath, `${JSON.stringify(learner, null, 2)}\n`);
  }
  const answersPath = path.join(projectionRoot, "answers.json");
  const answers = JSON.parse(fs.readFileSync(answersPath, "utf8"));
  answers.push({ interactionId: `${s05.sessionId}:i21` });
  fs.writeFileSync(answersPath, `${JSON.stringify(answers, null, 2)}\n`);
  await assert.rejects(writeSessionCandidateEvidence(options), /candidate_practice_inventory_mismatch:learner\.json/u);
  fs.rmSync(path.join(s05.candidateRoot, "source-snapshot"), { recursive: true, force: true });
  for (const learnerName of ["learner.json", "learner.uk.json"]) {
    const learnerPath = path.join(projectionRoot, learnerName);
    const learner = JSON.parse(fs.readFileSync(learnerPath, "utf8"));
    learner.interactions = learner.interactions.slice(0, 20);
    learner.practiceInteractionCount = 20;
    fs.writeFileSync(learnerPath, `${JSON.stringify(learner, null, 2)}\n`);
  }
  fs.writeFileSync(answersPath, `${JSON.stringify(answers.slice(0, 20), null, 2)}\n`);

  const receipt = await writeSessionCandidateEvidence(options);
  assert.equal(receipt.courseSessionId, "en:lesson-01:session-05");
  assert.equal(receipt.releaseAuthority, false);
  assert.equal(receipt.immutableContentOnly, true);
  assert.deepEqual(receipt.projection, { fileCount: 5, introPages: 3, practiceInteractions: 20 });
  assert.equal(receipt.frozenPredecessor.receiptPath, accepted.candidateReceiptPath);
  assert.equal(receipt.acceptedPredecessor.status, "PASS");
  assert.equal(receipt.acceptedPredecessor.acceptanceReceiptPath, accepted.acceptanceReceiptPath);
  assert.equal(receipt.acceptedPredecessor.acceptanceReceiptSha256, accepted.validatedAcceptance.acceptanceReceiptSha256);
  assert.equal(receipt.acceptedPredecessor.candidateReceiptPath, accepted.candidateReceiptPath);
  assert.equal(receipt.acceptedPredecessor.candidateReceiptSha256, accepted.validatedAcceptance.candidateReceiptSha256);
  assert.equal(receipt.files.some((entry) => entry.path.endsWith("practice.explanations.v1.json")), false);
  assert.deepEqual(
    receipt.files.filter((entry) => entry.category === "candidate" && entry.path.includes(`/${s05.session}/`)).map((entry) => path.basename(entry.path)).sort(),
    ["answers.json", "auxiliary.json", "intro.json", "learner.json", "learner.uk.json"],
  );
  for (const projection of ["intro.json", "auxiliary.json", "learner.json", "learner.uk.json", "answers.json"]) {
    assert.equal(fs.existsSync(path.join(s05.candidateRoot, s05.session, projection)), true);
  }
  for (const learnerName of ["learner.json", "learner.uk.json"]) {
    const learner = JSON.parse(fs.readFileSync(path.join(s05.candidateRoot, s05.session, learnerName), "utf8"));
    assert.equal(learner.interactions.length, 20);
    assert.equal(learner.practiceInteractionCount, 20);
  }
  assert.equal(fs.existsSync(path.join(s05.candidateRoot, "source-snapshot/content/learning-v2-course/sessions/en/l01/s05/practice.explanations.v1.json")), false);

  const receiptPath = path.join(s05.candidateRoot, "content-receipt.json");
  const receiptBytes = fs.readFileSync(receiptPath);
  assert.equal(JSON.parse(fs.readFileSync(path.join(s05.candidateRoot, "review-evidence-manifest.json"), "utf8")).releaseAuthority, false);
  await assert.rejects(writeSessionCandidateEvidence(options), /candidate_evidence_already_exists/u);
  assert.deepEqual(fs.readFileSync(receiptPath), receiptBytes, "an existing S05 receipt must remain byte-identical");
});

test("S05 rejects an S03 or a different S04 candidate as its exact predecessor", async (t) => {
  const s04 = fixture(t, { sessionNumber: "04", withPreview: true });
  const firstReceipt = await writeSessionCandidateEvidence({ ...s04, predecessorReceiptPath: s04.s01ReceiptPath });
  const accepted = await writeAcceptanceForCandidate(s04, firstReceipt);
  const alternateS04 = revisionChild(s04, "alternate", "second");
  const alternateReceipt = await writeSessionCandidateEvidence({ ...alternateS04, predecessorReceiptPath: s04.s01ReceiptPath });
  const s05 = fixture(t, { sessionNumber: "05", repoRoot: s04.repoRoot });

  await assert.rejects(writeSessionCandidateEvidence({
    ...s05,
    predecessorReceiptPath: path.join(s04.repoRoot, "content/learning-v2-course/outputs/s03-wrong/content-receipt.json"),
    acceptedPredecessorReceiptPath: accepted.acceptanceReceiptPath,
  }), /s05_frozen_predecessor_receipt_invalid/u);
  assert.equal(fs.existsSync(path.join(s05.candidateRoot, "content-receipt.json")), false);

  await assert.rejects(writeSessionCandidateEvidence({
    ...s05,
    predecessorReceiptPath: path.join(s04.repoRoot, ...`${alternateReceipt.candidateRoot}/content-receipt.json`.split("/")),
    acceptedPredecessorReceiptPath: accepted.acceptanceReceiptPath,
  }), /s05_accepted_predecessor_candidate_mismatch/u);
  assert.equal(fs.existsSync(path.join(s05.candidateRoot, "review-evidence-manifest.json")), false);
});

test("S05 rejects noncanonical predecessor paths and noncanonical candidate references", async (t) => {
  const s04 = fixture(t, { sessionNumber: "04", withPreview: true });
  const s04Receipt = await writeSessionCandidateEvidence({ ...s04, predecessorReceiptPath: s04.s01ReceiptPath });
  const accepted = await writeAcceptanceForCandidate(s04, s04Receipt);
  const s05 = fixture(t, { sessionNumber: "05", repoRoot: s04.repoRoot });
  const candidateReceiptPath = accepted.candidateReceiptPath;

  await assert.rejects(writeSessionCandidateEvidence({
    ...s05,
    predecessorReceiptPath: `./${candidateReceiptPath}`,
    acceptedPredecessorReceiptPath: accepted.acceptanceReceiptPath,
  }), /s05_predecessor_receipt_path_not_canonical/u);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s05,
    predecessorReceiptPath: accepted.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: `./${accepted.acceptanceReceiptPath}`,
  }), /s05_accepted_predecessor_receipt_path_not_canonical/u);

  const alteredAcceptance = JSON.parse(fs.readFileSync(path.join(s04.repoRoot, ...accepted.acceptanceReceiptPath.split("/")), "utf8"));
  alteredAcceptance.candidateReceiptPath = `./${candidateReceiptPath}`;
  write(s04.repoRoot, accepted.acceptanceReceiptPath, alteredAcceptance);
  await assert.rejects(writeSessionCandidateEvidence({
    ...s05,
    predecessorReceiptPath: accepted.candidateReceiptAbsolute,
    acceptedPredecessorReceiptPath: accepted.acceptanceReceiptPath,
  }), /candidate_receipt_path_mismatch/u);
  assert.equal(fs.existsSync(path.join(s05.candidateRoot, "content-receipt.json")), false);
  assert.equal(fs.existsSync(path.join(s05.candidateRoot, "review-evidence-manifest.json")), false);
});

test("S05 rejects tampered acceptance receipts and stale accepted S04 evidence without output receipts", async (t) => {
  for (const failure of ["tampered_acceptance", "stale_evidence"]) {
    const s04 = fixture(t, { sessionNumber: "04", withPreview: true });
    const s04Receipt = await writeSessionCandidateEvidence({ ...s04, predecessorReceiptPath: s04.s01ReceiptPath });
    const accepted = await writeAcceptanceForCandidate(s04, s04Receipt);
    const acceptanceAbsolute = path.join(s04.repoRoot, ...accepted.acceptanceReceiptPath.split("/"));
    if (failure === "tampered_acceptance") {
      const altered = JSON.parse(fs.readFileSync(acceptanceAbsolute, "utf8"));
      altered.releaseAuthority = true;
      write(s04.repoRoot, accepted.acceptanceReceiptPath, altered);
    } else {
      fs.appendFileSync(path.join(s04.repoRoot, ...accepted.validatedAcceptance.reviewEvidence[0].artifactPath.split("/")), "tamper");
    }
    const s05 = fixture(t, { sessionNumber: "05", repoRoot: s04.repoRoot });
    await assert.rejects(writeSessionCandidateEvidence({
      ...s05,
      predecessorReceiptPath: accepted.candidateReceiptAbsolute,
      acceptedPredecessorReceiptPath: accepted.acceptanceReceiptPath,
    }), failure === "tampered_acceptance" ? /acceptance_receipt_invalid/u : /review_artifact_stale/u);
    assert.equal(fs.existsSync(path.join(s05.candidateRoot, "content-receipt.json")), false);
    assert.equal(fs.existsSync(path.join(s05.candidateRoot, "review-evidence-manifest.json")), false);
    assert.equal(fs.existsSync(path.join(s05.candidateRoot, "source-snapshot/content/learning-v2-course/sessions/en/l01/s05/practice.explanations.v1.json")), false);
  }
});

test("CLI recognizes the explicit accepted-predecessor receipt flag", () => {
  const scriptPath = fileURLToPath(new URL("./build_session_candidate_receipt.mjs", import.meta.url));
  const repoRoot = path.resolve(path.dirname(scriptPath), "../../..");
  const result = spawnSync(process.execPath, [
    scriptPath,
    "--session", "en/l01/s05",
    "--candidate", "content/learning-v2-course/outputs/s05-cli-contract-not-created",
    "--predecessor-receipt", "content/learning-v2-course/outputs/s04-frozen/content-receipt.json",
    "--accepted-predecessor-receipt", "content/learning-v2-course/accepted/en/l01/s04/fixture/acceptance-receipt.json",
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stderr, /unknown_argument:--accepted-predecessor-receipt/u);
});
