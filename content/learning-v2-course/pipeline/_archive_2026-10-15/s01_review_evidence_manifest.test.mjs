import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const COURSE = path.resolve(PIPELINE, "..");
const SESSION = path.join(COURSE, "sessions/en/l01/s01");
const REQUIRED_ROLES = ["learner", "reader", "pedagogy", "nonsense", "taste", "progression", "locale"];
const BUNDLE_FILES = ["intro.json", "auxiliary.json", "learner.json", "learner.uk.json", "answers.json"];
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function resolveInside(root, relativePath, label) {
  assert.equal(typeof relativePath, "string", `${label}_path_missing`);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const rel = path.relative(root, absolute);
  assert.equal(rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel), false, `${label}_path_outside_root`);
  return absolute;
}

function candidateBundle(candidateRoot) {
  const files = BUNDLE_FILES.map((name) => {
    const bytes = fs.readFileSync(path.join(candidateRoot, "en/l01/s01", name));
    return { path: `en/l01/s01/${name}`, bytes: bytes.length, sha256: sha256(bytes) };
  });
  return { files, sha256: sha256(JSON.stringify(files)) };
}

function rawDeclaration(rawText, label, role) {
  const prefix = `${label}:`;
  const line = rawText
    .split(/\r?\n/u)
    .map((value) => value.replace(/^-\s*/u, ""))
    .find((value) => value.startsWith(prefix));
  assert.ok(line, `raw_artifact_declaration_missing:${role}:${label}`);
  return line.slice(prefix.length).trim();
}

function verifyRawArtifact(courseRoot, entry, expected) {
  assert.equal(typeof entry.rawArtifactPath, "string", `raw_artifact_path_missing:${entry.role}`);
  const bytes = fs.readFileSync(resolveInside(courseRoot, entry.rawArtifactPath, "raw_artifact"));
  assert.equal(entry.rawArtifactBytes, bytes.length, `raw_artifact_bytes_mismatch:${entry.role}`);
  assert.equal(entry.rawArtifactSha256, sha256(bytes), `raw_artifact_sha256_mismatch:${entry.role}`);
  const rawText = bytes.toString("utf8");
  assert.equal(rawDeclaration(rawText, "Role", entry.role), entry.role, `raw_artifact_role_mismatch:${entry.role}`);
  assert.equal(rawDeclaration(rawText, "Reviewer run", entry.role), entry.reviewerRunId, `raw_artifact_reviewer_run_mismatch:${entry.role}`);
  assert.equal(rawDeclaration(rawText, "Content inventory SHA-256", entry.role), expected.inventorySha256, `raw_artifact_inventory_mismatch:${entry.role}`);
  assert.equal(rawDeclaration(rawText, "Content receipt SHA-256", entry.role), expected.contentReceiptSha256, `raw_artifact_content_receipt_mismatch:${entry.role}`);
  assert.equal(rawDeclaration(rawText, "Candidate bundle SHA-256", entry.role), expected.candidateBundleSha256, `raw_artifact_candidate_mismatch:${entry.role}`);
  assert.equal(rawDeclaration(rawText, "Verdict", entry.role), entry.verdict, `raw_artifact_verdict_mismatch:${entry.role}`);
}

function validateReviewLedger({ courseRoot, manifest, status }) {
  const candidateRoot = resolveInside(courseRoot, manifest.candidateRoot, "candidate");
  assert.equal(path.dirname(candidateRoot), path.join(courseRoot, "outputs"), "candidate_root_not_registered_output");
  const bundle = candidateBundle(candidateRoot);
  assert.equal(manifest.candidateBundleSha256, bundle.sha256, "candidate_bundle_sha256_mismatch");
  assert.deepEqual(manifest.candidateFiles, bundle.files, "candidate_files_mismatch");

  const contentReceiptBytes = fs.readFileSync(resolveInside(courseRoot, manifest.candidateReceiptPath, "candidate_receipt"));
  const contentReceipt = JSON.parse(contentReceiptBytes.toString("utf8"));
  const contentReceiptSha256 = sha256(contentReceiptBytes);
  assert.equal(manifest.candidateReceiptInventorySha256, contentReceipt.inventorySha256, "candidate_receipt_inventory_mismatch");
  assert.equal(contentReceipt.candidateRoot, `content/learning-v2-course/${manifest.candidateRoot}`, "candidate_receipt_root_mismatch");
  assert.equal(manifest.releaseAuthority, false, "manifest_release_authority_self_grant");
  assert.equal(status.releaseAuthority, false, "status_release_authority_self_grant");
  assert.equal(contentReceipt.releaseAuthority, false, "content_receipt_release_authority_self_grant");

  const headBytes = fs.readFileSync(resolveInside(courseRoot, manifest.receiptChain.head.path, "receipt_head"));
  const head = JSON.parse(headBytes.toString("utf8"));
  assert.equal(manifest.receiptChain.head.sha256, sha256(headBytes), "receipt_head_sha256_mismatch");
  assert.equal(manifest.receiptChain.head.candidateBundleSha256, bundle.sha256, "receipt_head_candidate_mismatch");
  assert.equal(head.candidateBundle.sha256, bundle.sha256, "receipt_body_candidate_mismatch");
  assert.equal(head.contentReceipt.inventorySha256, contentReceipt.inventorySha256, "receipt_body_inventory_mismatch");
  assert.equal(manifest.receiptChain.head.contentReceiptSha256, contentReceiptSha256, "receipt_head_content_receipt_mismatch");
  assert.equal(head.releaseAuthority, false, "receipt_head_release_authority_self_grant");

  assert.equal(Array.isArray(manifest.roles), true, "roles_missing");
  const roleNames = manifest.roles.map((entry) => entry.role);
  assert.equal(new Set(roleNames).size, roleNames.length, "duplicate_current_role");
  assert.deepEqual([...roleNames].sort(), [...REQUIRED_ROLES].sort(), "required_role_set_mismatch");

  const runIds = new Set();
  for (const entry of manifest.reviewHistory ?? []) {
    if (!entry.reviewerRunId) continue;
    assert.equal(runIds.has(entry.reviewerRunId), false, `duplicate_review_run:${entry.reviewerRunId}`);
    runIds.add(entry.reviewerRunId);
  }

  const eligibleRoles = [];
  const eligibleRawPaths = new Set();
  const eligibleRawHashes = new Set();
  for (const entry of manifest.roles) {
    if (!entry.eligible) continue;
    assert.equal(entry.verdict, "PASS", `eligible_role_not_pass:${entry.role}`);
    assert.equal(typeof entry.reviewerRunId, "string", `eligible_role_run_missing:${entry.role}`);
    assert.equal(entry.reviewedCandidateSha256, bundle.sha256, `eligible_role_candidate_stale:${entry.role}`);
    assert.equal(entry.reviewedCandidateReceiptInventorySha256, contentReceipt.inventorySha256, `eligible_role_inventory_stale:${entry.role}`);
    assert.equal(entry.reviewedContentReceiptSha256, contentReceiptSha256, `eligible_role_receipt_stale:${entry.role}`);
    assert.equal(eligibleRawPaths.has(entry.rawArtifactPath), false, `eligible_raw_path_reused:${entry.role}`);
    assert.equal(eligibleRawHashes.has(entry.rawArtifactSha256), false, `eligible_raw_sha256_reused:${entry.role}`);
    eligibleRawPaths.add(entry.rawArtifactPath);
    eligibleRawHashes.add(entry.rawArtifactSha256);
    verifyRawArtifact(courseRoot, entry, {
      candidateBundleSha256: bundle.sha256,
      contentReceiptSha256,
      inventorySha256: contentReceipt.inventorySha256,
    });
    const history = (manifest.reviewHistory ?? []).find((item) => item.reviewerRunId === entry.reviewerRunId);
    assert.ok(history, `eligible_role_history_missing:${entry.role}`);
    assert.equal(history.role, entry.role, `eligible_role_history_role_mismatch:${entry.role}`);
    assert.equal(history.verdict, "PASS", `eligible_role_history_not_pass:${entry.role}`);
    assert.equal(history.currentEligibility, true, `eligible_role_history_not_current:${entry.role}`);
    assert.equal(history.rawArtifactSha256, entry.rawArtifactSha256, `eligible_role_history_raw_mismatch:${entry.role}`);
    assert.equal(history.reviewedCandidateSha256, bundle.sha256, `eligible_role_history_candidate_stale:${entry.role}`);
    assert.equal(history.reviewedCandidateReceiptInventorySha256, contentReceipt.inventorySha256, `eligible_role_history_inventory_stale:${entry.role}`);
    eligibleRoles.push(entry.role);
  }

  const missingRoles = REQUIRED_ROLES.filter((role) => !eligibleRoles.includes(role));
  assert.equal(status.candidateBundleSha256, bundle.sha256, "status_candidate_mismatch");
  assert.equal(status.candidateReceiptInventorySha256, contentReceipt.inventorySha256, "status_inventory_mismatch");
  assert.equal(status.receiptChain.head.path, manifest.receiptChain.head.path, "status_receipt_head_path_mismatch");
  assert.equal(status.receiptChain.head.sha256, manifest.receiptChain.head.sha256, "status_receipt_head_sha256_mismatch");
  assert.deepEqual(status.missingIndependentRoles, missingRoles, "status_missing_roles_not_derived");
  assert.equal(status.converged, missingRoles.length === 0 && (status.blockedBy ?? []).length === 0, "status_convergence_not_derived");

  if (status.lastCompletedReview) {
    const current = manifest.roles.find((entry) => entry.role === status.lastCompletedReview.role && entry.reviewerRunId === status.lastCompletedReview.reviewerRunId);
    assert.ok(current?.eligible, "last_completed_review_not_current");
    assert.equal(status.lastCompletedReview.verdict, "PASS", "last_completed_review_not_pass");
    assert.equal(status.lastCompletedReview.rawArtifactSha256, current.rawArtifactSha256, "last_completed_review_raw_mismatch");
    assert.equal(status.lastCompletedReview.reviewedCandidateSha256, bundle.sha256, "last_completed_review_candidate_stale");
    assert.equal(status.lastCompletedReview.reviewedCandidateReceiptInventorySha256, contentReceipt.inventorySha256, "last_completed_review_inventory_stale");
  }

  return { bundle, contentReceipt, eligibleRoles, missingRoles };
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function createLedgerFixture(t) {
  const fixtureCourse = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s01-ledger-"));
  t.after(() => fs.rmSync(fixtureCourse, { recursive: true, force: true }));
  const manifest = structuredClone(JSON.parse(fs.readFileSync(path.join(SESSION, "review-evidence-manifest.json"), "utf8")));
  const status = structuredClone(JSON.parse(fs.readFileSync(path.join(SESSION, "status.json"), "utf8")));
  const paths = [
    ...BUNDLE_FILES.map((name) => `${manifest.candidateRoot}/en/l01/s01/${name}`),
    manifest.candidateReceiptPath,
    manifest.receiptChain.head.path,
    ...manifest.roles.filter((entry) => entry.rawArtifactPath).map((entry) => entry.rawArtifactPath),
  ];
  for (const relativePath of new Set(paths)) copyFile(path.join(COURSE, ...relativePath.split("/")), path.join(fixtureCourse, ...relativePath.split("/")));
  for (const entry of manifest.roles) {
    Object.assign(entry, {
      eligible: false,
      reviewerId: null,
      reviewerRunId: null,
      rawArtifactPath: null,
      rawArtifactBytes: null,
      rawArtifactSha256: null,
      reviewedCandidateSha256: null,
      reviewedCandidateReceiptInventorySha256: null,
      reviewedContentReceiptSha256: null,
      verdict: null,
      findings: [],
    });
  }
  manifest.reviewHistory = [];
  status.missingIndependentRoles = [...REQUIRED_ROLES];
  status.lastCompletedReview = null;
  status.converged = false;
  return { fixtureCourse, manifest, status };
}

function addEligibleRole({ fixtureCourse, manifest, status, role }) {
  const rawArtifactPath = `judgements/fixture_${role}_raw.md`;
  const contentReceiptBytes = fs.readFileSync(path.join(fixtureCourse, ...manifest.candidateReceiptPath.split("/")));
  const contentReceiptSha256 = sha256(contentReceiptBytes);
  const reviewerRunId = `/fixture/${role}`;
  const rawBytes = Buffer.from([
    `# ${role} review`,
    "",
    "Verdict: PASS",
    `Role: ${role}`,
    `- Reviewer run: ${reviewerRunId}`,
    `- Content inventory SHA-256: ${manifest.candidateReceiptInventorySha256}`,
    `- Content receipt SHA-256: ${contentReceiptSha256}`,
    `- Candidate bundle SHA-256: ${manifest.candidateBundleSha256}`,
    "",
  ].join("\n"), "utf8");
  const absolute = path.join(fixtureCourse, ...rawArtifactPath.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, rawBytes);
  const current = manifest.roles.find((entry) => entry.role === role);
  Object.assign(current, {
    eligible: true,
    reviewerId: reviewerRunId,
    reviewerRunId,
    reviewerRunIdKind: "fixture",
    rawArtifactPath,
    rawArtifactBytes: rawBytes.length,
    rawArtifactSha256: sha256(rawBytes),
    reviewedCandidateSha256: manifest.candidateBundleSha256,
    reviewedCandidateReceiptInventorySha256: manifest.candidateReceiptInventorySha256,
    reviewedContentReceiptSha256: contentReceiptSha256,
    verdict: "PASS",
    findings: [],
  });
  manifest.reviewHistory.push({
    role,
    reviewerId: current.reviewerId,
    reviewerRunId: current.reviewerRunId,
    rawArtifactPath,
    rawArtifactBytes: rawBytes.length,
    rawArtifactSha256: sha256(rawBytes),
    reviewedCandidateSha256: manifest.candidateBundleSha256,
    reviewedCandidateReceiptInventorySha256: manifest.candidateReceiptInventorySha256,
    reviewedContentReceiptSha256: contentReceiptSha256,
    verdict: "PASS",
    findings: [],
    currentEligibility: true,
  });
  status.missingIndependentRoles = REQUIRED_ROLES.filter((name) => !manifest.roles.some((entry) => entry.role === name && entry.eligible && entry.verdict === "PASS"));
  status.lastCompletedReview = {
    role,
    reviewerRunId: current.reviewerRunId,
    rawArtifactPath,
    rawArtifactSha256: current.rawArtifactSha256,
    reviewedCandidateSha256: current.reviewedCandidateSha256,
    reviewedCandidateReceiptInventorySha256: current.reviewedCandidateReceiptInventorySha256,
    verdict: "PASS",
  };
  return current;
}

// This fixture validates the internal consistency of the historical i13 review ledger.
// It does not establish that the mutable S01 source/status is current; the content-receipt
// verifier and session-readiness gates perform the live-byte checks separately.
test("S01 review ledger validates historical candidate identity and derives missing roles from eligible PASS evidence", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(SESSION, "review-evidence-manifest.json"), "utf8"));
  const status = JSON.parse(fs.readFileSync(path.join(SESSION, "status.json"), "utf8"));
  const result = validateReviewLedger({ courseRoot: COURSE, manifest, status });
  assert.deepEqual(
    [...result.eligibleRoles, ...result.missingRoles].sort(),
    [...REQUIRED_ROLES].sort(),
    "eligible and missing roles must partition the required role set",
  );
  assert.equal(result.eligibleRoles.some((role) => result.missingRoles.includes(role)), false, "a role cannot be both eligible and missing");
  assert.deepEqual(result.missingRoles, REQUIRED_ROLES.filter((role) => !result.eligibleRoles.includes(role)));
  assert.equal(manifest.releaseAuthority, false);
  assert.equal(status.releaseAuthority, false);
});

test("S01 review ledger fixture derives the explicit empty role state", (t) => {
  const fixture = createLedgerFixture(t);
  const result = validateReviewLedger({ courseRoot: fixture.fixtureCourse, manifest: fixture.manifest, status: fixture.status });
  assert.deepEqual(result.eligibleRoles, []);
  assert.deepEqual(result.missingRoles, REQUIRED_ROLES);
});

test("S01 review ledger accepts a valid second independent PASS without changing the validator", (t) => {
  const { fixtureCourse, manifest, status } = createLedgerFixture(t);
  addEligibleRole({ fixtureCourse, manifest, status, role: "learner" });
  addEligibleRole({ fixtureCourse, manifest, status, role: "reader" });
  const result = validateReviewLedger({ courseRoot: fixtureCourse, manifest, status });
  assert.deepEqual(result.eligibleRoles.sort(), ["learner", "reader"]);
  assert.deepEqual(result.missingRoles, REQUIRED_ROLES.filter((role) => !["learner", "reader"].includes(role)));
  assert.equal(status.releaseAuthority, false);
});

test("S01 review ledger fixture derives the explicit full role state without granting release authority", (t) => {
  const fixture = createLedgerFixture(t);
  for (const role of REQUIRED_ROLES) addEligibleRole({ ...fixture, role });
  fixture.status.blockedBy = [];
  fixture.status.converged = true;
  const result = validateReviewLedger({ courseRoot: fixture.fixtureCourse, manifest: fixture.manifest, status: fixture.status });
  assert.deepEqual([...result.eligibleRoles].sort(), [...REQUIRED_ROLES].sort());
  assert.deepEqual(result.missingRoles, []);
  assert.equal(fixture.manifest.releaseAuthority, false);
  assert.equal(fixture.status.releaseAuthority, false);
});

test("S01 review ledger rejects forged raw evidence, stale candidate binding, and duplicate current roles", (t) => {
  const fixture = createLedgerFixture(t);
  const reader = addEligibleRole({ ...fixture, role: "reader" });

  const forged = structuredClone(fixture.manifest);
  forged.roles.find((entry) => entry.role === "reader").rawArtifactSha256 = "0".repeat(64);
  assert.throws(() => validateReviewLedger({ courseRoot: fixture.fixtureCourse, manifest: forged, status: fixture.status }), /raw_artifact_sha256_mismatch/u);

  const stale = structuredClone(fixture.manifest);
  stale.roles.find((entry) => entry.role === "reader").reviewedCandidateSha256 = "1".repeat(64);
  assert.throws(() => validateReviewLedger({ courseRoot: fixture.fixtureCourse, manifest: stale, status: fixture.status }), /eligible_role_candidate_stale/u);

  const duplicate = structuredClone(fixture.manifest);
  duplicate.roles.push(structuredClone(reader));
  assert.throws(() => validateReviewLedger({ courseRoot: fixture.fixtureCourse, manifest: duplicate, status: fixture.status }), /duplicate_current_role/u);
});

test("S01 review ledger rejects relabelled, rebound, and reused raw evidence", (t) => {
  const fixture = createLedgerFixture(t);
  addEligibleRole({ ...fixture, role: "learner" });
  addEligibleRole({ ...fixture, role: "reader" });
  const learner = fixture.manifest.roles.find((entry) => entry.role === "learner");

  const relabelled = structuredClone(fixture.manifest);
  const relabelledReader = relabelled.roles.find((entry) => entry.role === "reader");
  const relabelledRawPath = "judgements/relabelled_learner_as_reader_raw.md";
  const relabelledBytes = Buffer.concat([
    fs.readFileSync(resolveInside(fixture.fixtureCourse, learner.rawArtifactPath, "learner_raw")),
    Buffer.from("\n", "utf8"),
  ]);
  const relabelledAbsolute = resolveInside(fixture.fixtureCourse, relabelledRawPath, "relabelled_raw");
  fs.mkdirSync(path.dirname(relabelledAbsolute), { recursive: true });
  fs.writeFileSync(relabelledAbsolute, relabelledBytes);
  Object.assign(relabelledReader, {
    rawArtifactPath: relabelledRawPath,
    rawArtifactBytes: relabelledBytes.length,
    rawArtifactSha256: sha256(relabelledBytes),
  });
  const relabelledHistory = relabelled.reviewHistory.find((entry) => entry.reviewerRunId === relabelledReader.reviewerRunId);
  relabelledHistory.rawArtifactPath = relabelledReader.rawArtifactPath;
  relabelledHistory.rawArtifactBytes = relabelledReader.rawArtifactBytes;
  relabelledHistory.rawArtifactSha256 = relabelledReader.rawArtifactSha256;
  assert.throws(() => validateReviewLedger({ courseRoot: fixture.fixtureCourse, manifest: relabelled, status: fixture.status }), /raw_artifact_role_mismatch/u);

  const reused = structuredClone(fixture.manifest);
  const reusedReader = reused.roles.find((entry) => entry.role === "reader");
  Object.assign(reusedReader, {
    rawArtifactPath: learner.rawArtifactPath,
    rawArtifactBytes: learner.rawArtifactBytes,
    rawArtifactSha256: learner.rawArtifactSha256,
  });
  assert.throws(() => validateReviewLedger({ courseRoot: fixture.fixtureCourse, manifest: reused, status: fixture.status }), /eligible_raw_(path|sha256)_reused/u);

  const rebound = structuredClone(fixture.manifest);
  const reboundReader = rebound.roles.find((entry) => entry.role === "reader");
  const reboundRawPath = resolveInside(fixture.fixtureCourse, reboundReader.rawArtifactPath, "rebound_raw");
  const reboundBytes = Buffer.from(fs.readFileSync(reboundRawPath, "utf8").replace(
    `Candidate bundle SHA-256: ${fixture.manifest.candidateBundleSha256}`,
    `Candidate bundle SHA-256: ${"9".repeat(64)}`,
  ), "utf8");
  fs.writeFileSync(reboundRawPath, reboundBytes);
  reboundReader.rawArtifactBytes = reboundBytes.length;
  reboundReader.rawArtifactSha256 = sha256(reboundBytes);
  const reboundHistory = rebound.reviewHistory.find((entry) => entry.reviewerRunId === reboundReader.reviewerRunId);
  reboundHistory.rawArtifactBytes = reboundReader.rawArtifactBytes;
  reboundHistory.rawArtifactSha256 = reboundReader.rawArtifactSha256;
  assert.throws(() => validateReviewLedger({ courseRoot: fixture.fixtureCourse, manifest: rebound, status: fixture.status }), /raw_artifact_candidate_mismatch/u);
});

test("S01 review ledger rejects release authority self-grants even after convergence", (t) => {
  const fixture = createLedgerFixture(t);
  const selfGrantedManifest = structuredClone(fixture.manifest);
  const selfGrantedStatus = structuredClone(fixture.status);
  selfGrantedManifest.releaseAuthority = true;
  selfGrantedStatus.releaseAuthority = true;
  selfGrantedStatus.converged = true;
  selfGrantedStatus.blockedBy = [];
  assert.throws(() => validateReviewLedger({
    courseRoot: fixture.fixtureCourse,
    manifest: selfGrantedManifest,
    status: selfGrantedStatus,
  }), /manifest_release_authority_self_grant/u);
});
