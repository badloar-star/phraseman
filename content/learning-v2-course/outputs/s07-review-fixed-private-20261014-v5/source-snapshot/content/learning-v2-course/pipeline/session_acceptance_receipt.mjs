import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ACCEPTANCE_SCHEMA = "learning_v2_session_acceptance_receipt_v1";
const ACTIVE_SCHEMA = "learning_v2_active_sessions_v1";
const GATE_SCHEMA = "learning_v2_session_deterministic_gate_report_v1";
const REQUIRED_DIMENSIONS = Object.freeze(["blind_learner", "language_pedagogy_locale"]);
const HEX_64 = /^[0-9a-f]{64}$/u;

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function identityFor(session) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(String(session ?? ""));
  if (!match) throw new Error(`session_invalid:${session}`);
  const [, language, lesson, sessionNumber] = match;
  return { session, language, lesson, sessionNumber, sessionId: `${language}:lesson-${lesson}:session-${sessionNumber}` };
}

function repoFile(repoRoot, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\\")) throw new Error(`${label}_path_invalid`);
  const absolute = path.resolve(repoRoot, ...relativePath.split("/"));
  const relative = path.relative(path.resolve(repoRoot), absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`${label}_path_outside_repo`);
  return absolute;
}

function readBoundFile(repoRoot, relativePath, expectedSha256, label) {
  const absolute = repoFile(repoRoot, relativePath, label);
  const bytes = fs.readFileSync(absolute);
  if (expectedSha256 && sha256(bytes) !== expectedSha256) throw new Error(`${label}_stale`);
  return { absolute, bytes, sha256: sha256(bytes) };
}

function verifyCandidateReceipt({ repoRoot, candidateReceiptPath, expectedReceiptSha256 }) {
  const receiptFile = readBoundFile(repoRoot, candidateReceiptPath, expectedReceiptSha256, "candidate_receipt");
  const receipt = JSON.parse(receiptFile.bytes.toString("utf8"));
  if (receipt.schemaVersion !== "learning_v2_session_candidate_content_receipt_v1"
    || receipt.releaseAuthority !== false
    || receipt.immutableContentOnly !== true
    || typeof receipt.candidateRoot !== "string"
    || !Array.isArray(receipt.files)
    || receipt.fileCount !== receipt.files.length) {
    throw new Error("candidate_receipt_invalid");
  }
  const expectedPath = `${receipt.candidateRoot}/content-receipt.json`;
  if (candidateReceiptPath !== expectedPath) throw new Error("candidate_receipt_path_mismatch");
  const seen = new Set();
  const stable = [];
  const candidateStable = [];
  for (const entry of receipt.files) {
    if (!entry || typeof entry.category !== "string" || typeof entry.path !== "string"
      || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !HEX_64.test(String(entry.sha256 ?? ""))
      || seen.has(entry.path)) throw new Error("candidate_receipt_inventory_invalid");
    seen.add(entry.path);
    const file = readBoundFile(repoRoot, entry.path, entry.sha256, "candidate_file");
    if (file.bytes.length !== entry.bytes) throw new Error("candidate_file_stale");
    stable.push({ category: entry.category, path: entry.path, bytes: entry.bytes, sha256: entry.sha256 });
    if (entry.category === "candidate") candidateStable.push({ path: entry.path, bytes: entry.bytes, sha256: entry.sha256 });
  }
  if (sha256(JSON.stringify(stable)) !== receipt.inventorySha256) throw new Error("candidate_inventory_stale");
  if (sha256(JSON.stringify(candidateStable)) !== receipt.candidateBundleSha256) throw new Error("candidate_bundle_stale");
  return { receipt, receiptSha256: receiptFile.sha256 };
}

function rawReviewIdentity(raw) {
  return {
    sessionId: raw.sessionId ?? raw.identity?.course_session_id,
    candidateBundleSha256: raw.candidateBundleSha256 ?? raw.identity?.candidate_bundle_sha256,
    contentReceiptSha256: raw.contentReceiptSha256 ?? raw.identity?.candidate_receipt_sha256,
  };
}

function reviewFindings(raw) {
  if (Array.isArray(raw.findings)) return raw.findings;
  if (Array.isArray(raw.blockerFindings)) return raw.blockerFindings;
  if (Array.isArray(raw.blockers)) return raw.blockers;
  return null;
}

function verifyReviewEvidence({ repoRoot, entry, expected }) {
  if (!entry || !REQUIRED_DIMENSIONS.includes(entry.dimension)) throw new Error("review_dimension_set_invalid");
  if (entry.dispatchProvenance?.configuredModel !== "gpt-6-luna") throw new Error(`review_model_invalid:${entry.dimension}`);
  if (typeof entry.dispatchProvenance?.agent !== "string" || !entry.dispatchProvenance.agent) throw new Error(`review_provenance_invalid:${entry.dimension}`);
  const artifact = readBoundFile(repoRoot, entry.artifactPath, entry.artifactSha256, "review_artifact");
  const raw = JSON.parse(artifact.bytes.toString("utf8"));
  const identity = rawReviewIdentity(raw);
  if (raw.dimension !== entry.dimension) throw new Error(`review_dimension_mismatch:${entry.dimension}`);
  if (raw.verdict !== "PASS" || !Array.isArray(reviewFindings(raw)) || reviewFindings(raw).length !== 0) {
    throw new Error(`review_verdict_not_pass:${entry.dimension}`);
  }
  if (identity.sessionId !== expected.sessionId || identity.candidateBundleSha256 !== expected.candidateBundleSha256
    || (identity.contentReceiptSha256 && identity.contentReceiptSha256 !== expected.contentReceiptSha256)) {
    throw new Error(`review_candidate_mismatch:${entry.dimension}`);
  }
  return {
    dimension: entry.dimension,
    verdict: "PASS",
    artifactPath: entry.artifactPath,
    artifactSha256: artifact.sha256,
    artifactBytes: artifact.bytes.length,
    dispatchProvenance: {
      agent: entry.dispatchProvenance.agent,
      configuredModel: "gpt-6-luna",
    },
  };
}

function verifyGateReport({ repoRoot, reportPath, reportSha256, expected }) {
  const reportFile = readBoundFile(repoRoot, reportPath, reportSha256, "deterministic_gate_report");
  const report = JSON.parse(reportFile.bytes.toString("utf8"));
  if (report.schemaVersion !== GATE_SCHEMA || report.verdict !== "PASS" || !Array.isArray(report.gates) || report.gates.length < 1
    || report.gates.some((gate) => gate?.verdict !== "PASS" || gate?.exitCode !== 0)
    || report.sessionId !== expected.sessionId
    || report.candidateBundleSha256 !== expected.candidateBundleSha256
    || report.contentReceiptSha256 !== expected.contentReceiptSha256
    || report.candidateInventorySha256 !== expected.candidateInventorySha256
    || report.sourceFingerprint !== expected.sourceFingerprint) {
    throw new Error("deterministic_gate_report_invalid");
  }
  return { path: reportPath, sha256: reportFile.sha256, bytes: reportFile.bytes.length };
}

function localeEvidenceFromCandidate(receipt) {
  const matches = receipt.files.filter((entry) => entry.category === "source" && entry.path.endsWith("/locales_batch.md"));
  if (matches.length !== 1) throw new Error("locale_evidence_invalid");
  return { path: matches[0].path, sha256: matches[0].sha256, bytes: matches[0].bytes };
}

export async function buildSessionAcceptanceReceipt({
  repoRoot = process.cwd(),
  session,
  candidateReceiptPath,
  deterministicGateReportPath,
  reviewEvidence,
} = {}) {
  const identity = identityFor(session);
  const candidate = verifyCandidateReceipt({ repoRoot, candidateReceiptPath });
  if (candidate.receipt.courseSessionId !== identity.sessionId) throw new Error("candidate_session_mismatch");
  const dimensions = Array.isArray(reviewEvidence) ? reviewEvidence.map((entry) => entry?.dimension).sort() : [];
  if (JSON.stringify(dimensions) !== JSON.stringify([...REQUIRED_DIMENSIONS].sort())) throw new Error("review_dimension_set_invalid");
  const expected = {
    sessionId: identity.sessionId,
    candidateBundleSha256: candidate.receipt.candidateBundleSha256,
    contentReceiptSha256: candidate.receiptSha256,
    candidateInventorySha256: candidate.receipt.inventorySha256,
    sourceFingerprint: candidate.receipt.sourceSnapshot?.indexSha256,
  };
  if (!HEX_64.test(String(expected.sourceFingerprint ?? ""))) throw new Error("source_fingerprint_invalid");
  const reviews = reviewEvidence
    .map((entry) => verifyReviewEvidence({ repoRoot, entry, expected }))
    .sort((left, right) => REQUIRED_DIMENSIONS.indexOf(left.dimension) - REQUIRED_DIMENSIONS.indexOf(right.dimension));
  if (new Set(reviews.map((entry) => entry.artifactPath)).size !== reviews.length
    || new Set(reviews.map((entry) => entry.artifactSha256)).size !== reviews.length
    || new Set(reviews.map((entry) => entry.dispatchProvenance.agent)).size !== reviews.length) {
    throw new Error("review_evidence_not_distinct");
  }
  const gate = verifyGateReport({ repoRoot, reportPath: deterministicGateReportPath, expected });
  return {
    schemaVersion: ACCEPTANCE_SCHEMA,
    session: identity.session,
    courseSessionId: identity.sessionId,
    state: "TEXT_CANONICAL",
    candidateRoot: candidate.receipt.candidateRoot,
    candidateReceiptPath,
    candidateReceiptSha256: candidate.receiptSha256,
    candidateBundleSha256: candidate.receipt.candidateBundleSha256,
    candidateInventorySha256: candidate.receipt.inventorySha256,
    sourceFingerprint: expected.sourceFingerprint,
    deterministicGateReport: gate,
    reviewEvidence: reviews,
    localeEvidence: localeEvidenceFromCandidate(candidate.receipt),
    audioTechnicalEvidence: null,
    semanticAudioVerified: false,
    releaseAuthority: false,
    immutableContentOnly: true,
  };
}

export async function validateSessionAcceptanceReceipt({ repoRoot = process.cwd(), acceptanceReceiptPath } = {}) {
  const acceptanceFile = readBoundFile(repoRoot, acceptanceReceiptPath, null, "acceptance_receipt");
  const stored = JSON.parse(acceptanceFile.bytes.toString("utf8"));
  if (stored.schemaVersion !== ACCEPTANCE_SCHEMA || stored.state !== "TEXT_CANONICAL"
    || stored.releaseAuthority !== false || stored.immutableContentOnly !== true
    || stored.semanticAudioVerified !== false || stored.audioTechnicalEvidence !== null) {
    throw new Error("acceptance_receipt_invalid");
  }
  const identity = identityFor(stored.session);
  if (stored.courseSessionId !== identity.sessionId || !HEX_64.test(String(stored.candidateBundleSha256 ?? ""))) throw new Error("acceptance_identity_invalid");
  const expectedPath = `content/learning-v2-course/accepted/${stored.session}/${stored.candidateBundleSha256}/acceptance-receipt.json`;
  if (acceptanceReceiptPath !== expectedPath) throw new Error("acceptance_receipt_path_mismatch");
  const rebuilt = await buildSessionAcceptanceReceipt({
    repoRoot,
    session: stored.session,
    candidateReceiptPath: stored.candidateReceiptPath,
    deterministicGateReportPath: stored.deterministicGateReport?.path,
    reviewEvidence: stored.reviewEvidence?.map(({ dimension, artifactPath, artifactSha256, dispatchProvenance }) => ({ dimension, artifactPath, artifactSha256, dispatchProvenance })),
  });
  if (JSON.stringify(rebuilt) !== JSON.stringify(stored)) throw new Error("acceptance_receipt_stale");
  return Object.freeze({ ...stored, acceptanceReceiptSha256: acceptanceFile.sha256, acceptanceReceiptPath });
}

export function validateActivationManifest(manifest) {
  if (manifest?.schemaVersion !== ACTIVE_SCHEMA || manifest.courseReleaseState !== "HOLD" || !Array.isArray(manifest.activeSessions)) {
    throw new Error("course_release_state_invalid");
  }
  for (let index = 0; index < manifest.activeSessions.length; index += 1) {
    const expectedSession = `en/l01/s${String(index + 1).padStart(2, "0")}`;
    const entry = manifest.activeSessions[index];
    if (entry?.session !== expectedSession) throw new Error("activation_prefix_noncontiguous");
    if (typeof entry.acceptanceReceiptPath !== "string" || !HEX_64.test(String(entry.acceptanceReceiptSha256 ?? ""))) {
      throw new Error("activation_entry_invalid");
    }
  }
  return { courseReleaseState: "HOLD", activeCount: manifest.activeSessions.length };
}

export const SESSION_ACCEPTANCE_SCHEMA = ACCEPTANCE_SCHEMA;
