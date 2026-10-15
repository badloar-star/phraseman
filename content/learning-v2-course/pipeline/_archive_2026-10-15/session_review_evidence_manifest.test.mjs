import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  materializeSessionReviewEvidenceManifest,
  validateSessionReviewEvidenceManifest,
} from "./session_review_evidence_manifest.mjs";

const ROLES = ["learner", "reader", "pedagogy", "nonsense", "taste", "progression", "locale"];
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const candidate = Object.freeze({
  candidateKey: "en/l01/s02",
  candidateBundleSha256: "1".repeat(64),
  contentReceiptInventorySha256: "2".repeat(64),
  contentReceiptSha256: "3".repeat(64),
});

async function fixture(t) {
  const courseRoot = await mkdtemp(path.join(tmpdir(), "learning-v2-session-reviews-"));
  t.after(() => rm(courseRoot, { recursive: true, force: true }));
  const initialManifest = {
    schemaVersion: "learning_v2_session_review_evidence_manifest_v1",
    courseSessionId: "en:lesson-01:session-02",
    candidateRoot: "content/learning-v2-course/outputs/s02-fixture",
    candidateBundleSha256: candidate.candidateBundleSha256,
    candidateReceiptPath: "content/learning-v2-course/outputs/s02-fixture/content-receipt.json",
    candidateReceiptInventorySha256: candidate.contentReceiptInventorySha256,
    requiredRoles: [...ROLES], eligibleRoles: [], missingRoles: [...ROLES], roles: [],
    textReviewComplete: false, releaseAuthority: false,
  };
  const rawArtifactPaths = {};
  for (const role of ROLES) {
    const relative = `judgements/${role}.md`;
    const absolute = path.join(courseRoot, ...relative.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, [
      `Role: ${role}`,
      `Reviewer run: /fixture/${role}`,
      `Candidate bundle SHA-256: ${candidate.candidateBundleSha256}`,
      `Content inventory SHA-256: ${candidate.contentReceiptInventorySha256}`,
      `Content receipt SHA-256: ${candidate.contentReceiptSha256}`,
      "Verdict: PASS",
      "",
    ].join("\n"));
    rawArtifactPaths[role] = relative;
  }
  return { courseRoot, initialManifest, rawArtifactPaths };
}

test("generic session review materializer binds seven distinct raw PASS reports without granting release", async (t) => {
  const data = await fixture(t);
  const manifest = await materializeSessionReviewEvidenceManifest({ ...data, candidate });
  assert.deepEqual(manifest.eligibleRoles, ROLES);
  assert.deepEqual(manifest.missingRoles, []);
  assert.equal(manifest.roles.length, 7);
  assert.equal(manifest.reviewHistory.length, 7);
  assert.equal(manifest.textReviewComplete, true);
  assert.equal(manifest.releaseAuthority, false);
  const validated = await validateSessionReviewEvidenceManifest({ courseRoot: data.courseRoot, manifest, candidate });
  assert.equal(validated.textVerified, true);
  assert.equal(validated.roleCount, 7);
});

test("generic session review validator rejects stale, relabelled, rebound, and incomplete evidence", async (t) => {
  const data = await fixture(t);
  const manifest = await materializeSessionReviewEvidenceManifest({ ...data, candidate });

  const stalePath = path.join(data.courseRoot, ...manifest.roles[0].rawArtifactPath.split("/"));
  await writeFile(stalePath, Buffer.concat([await readFile(stalePath), Buffer.from("tamper")]));
  await assert.rejects(validateSessionReviewEvidenceManifest({ courseRoot: data.courseRoot, manifest, candidate }), /text_review_raw_stale:learner/u);

  const fresh = await fixture(t);
  const valid = await materializeSessionReviewEvidenceManifest({ ...fresh, candidate });
  const relabelled = structuredClone(valid);
  Object.assign(relabelled.roles[1], {
    rawArtifactPath: relabelled.roles[0].rawArtifactPath,
    rawArtifactBytes: relabelled.roles[0].rawArtifactBytes,
    rawArtifactSha256: relabelled.roles[0].rawArtifactSha256,
  });
  await assert.rejects(validateSessionReviewEvidenceManifest({ courseRoot: fresh.courseRoot, manifest: relabelled, candidate }), /text_review_raw_(path_reused|hash_reused|role_mismatch)/u);

  const rebound = structuredClone(valid);
  rebound.roles[0].reviewedCandidateSha256 = "9".repeat(64);
  await assert.rejects(validateSessionReviewEvidenceManifest({ courseRoot: fresh.courseRoot, manifest: rebound, candidate }), /text_review_role_candidate_mismatch:learner/u);

  const partial = structuredClone(valid);
  partial.roles.pop();
  await assert.rejects(validateSessionReviewEvidenceManifest({ courseRoot: fresh.courseRoot, manifest: partial, candidate }), /text_review_role_set_invalid/u);

  const selfGranted = structuredClone(valid);
  selfGranted.releaseAuthority = true;
  await assert.rejects(validateSessionReviewEvidenceManifest({ courseRoot: fresh.courseRoot, manifest: selfGranted, candidate }), /text_review_manifest_release_authority_not_false/u);
});

test("materializer rejects duplicate raw bytes and a raw report whose declaration is rebound", async (t) => {
  const data = await fixture(t);
  const learnerBytes = await readFile(path.join(data.courseRoot, data.rawArtifactPaths.learner));
  await writeFile(path.join(data.courseRoot, data.rawArtifactPaths.reader), learnerBytes);
  await assert.rejects(materializeSessionReviewEvidenceManifest({ ...data, candidate }), /text_review_raw_(role_mismatch|hash_reused)/u);

  const restored = await fixture(t);
  const readerPath = path.join(restored.courseRoot, restored.rawArtifactPaths.reader);
  const reader = (await readFile(readerPath, "utf8")).replace(candidate.candidateBundleSha256, "8".repeat(64));
  await writeFile(readerPath, reader);
  await assert.rejects(materializeSessionReviewEvidenceManifest({ ...restored, candidate }), /text_review_raw_candidate_mismatch:reader/u);
});
