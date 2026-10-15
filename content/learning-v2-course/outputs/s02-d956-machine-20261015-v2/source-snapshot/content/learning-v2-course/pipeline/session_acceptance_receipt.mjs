import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  assertDirectoryContainedNoLinks,
  readRegularFileContained,
  rebuildAndVerifyV2Projection,
} from "./session_candidate_projection_parity.mjs";

const ACCEPTANCE_SCHEMA = "learning_v2_session_acceptance_receipt_v1";
const MACHINE_VALIDATION_SCHEMA = "learning_v2_session_machine_validation_receipt_v1";
const ACTIVE_SCHEMA = "learning_v2_active_sessions_v1";
const GATE_SCHEMA = "learning_v2_session_deterministic_gate_report_v1";
const CANDIDATE_SCHEMA_V1 = "learning_v2_session_candidate_content_receipt_v1";
const CANDIDATE_SCHEMA_V2 = "learning_v2_session_candidate_content_receipt_v2";
const V2_BLUEPRINT_FINGERPRINT = "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da";
const V2_S02_PACKET_SHA256 = "6686bac631ede28475f122b1992d6ac265aabf02ca26cc376ce9ba23fc4639c1";
const V2_REQUIRED_GATES = Object.freeze([
  "blueprint_authority",
  "s02_exact_packet",
  "feedback_locale_parity",
  "actor_clarity",
  "candidate_build_source_projection",
  "receipt_history",
]);
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
  let realRepo;
  let realAbsolute;
  try {
    realRepo = fs.realpathSync(path.resolve(repoRoot));
    realAbsolute = fs.realpathSync(absolute);
  } catch {
    throw new Error(`${label}_path_invalid`);
  }
  const realRelative = path.relative(realRepo, realAbsolute);
  if (!realRelative || realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
    throw new Error(`${label}_path_outside_repo`);
  }
  return realAbsolute;
}

function readBoundFile(repoRoot, relativePath, expectedSha256, label) {
  const absolute = repoFile(repoRoot, relativePath, label);
  const bytes = readRegularFileContained(repoRoot, absolute, label);
  if (expectedSha256 && sha256(bytes) !== expectedSha256) throw new Error(`${label}_stale`);
  return { absolute, bytes, sha256: sha256(bytes) };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function verifyCandidateReceipt({ repoRoot, candidateReceiptPath, expectedReceiptSha256 }) {
  const receiptFile = readBoundFile(repoRoot, candidateReceiptPath, expectedReceiptSha256, "candidate_receipt");
  const receipt = JSON.parse(receiptFile.bytes.toString("utf8"));
  if (![CANDIDATE_SCHEMA_V1, CANDIDATE_SCHEMA_V2].includes(receipt.schemaVersion)
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
  if (receipt.schemaVersion === CANDIDATE_SCHEMA_V2) {
    const authority = receipt.blueprintAuthority;
    if (receipt.courseSessionId !== "en:lesson-01:session-02"
      || authority?.schemaVersion !== "learning_v2_blueprint_authoring_contract_v2"
      || authority.blueprintFingerprint !== V2_BLUEPRINT_FINGERPRINT
      || authority.sessionPacketSha256 !== V2_S02_PACKET_SHA256
      || authority.introPlanItemCount !== 3
      || authority.activityPlanItemCount !== 17
      || receipt.projection?.fileCount !== 5
      || receipt.projection?.introPages !== authority.introPlanItemCount
      || receipt.projection?.practiceInteractions !== authority.activityPlanItemCount
      || receipt.sourceSnapshot?.indexPath !== `${receipt.candidateRoot}/source-snapshot/index.json`
      || receipt.sourceSnapshot?.indexSha256 !== receipt.files.find((entry) => entry.category === "snapshot_index")?.sha256) {
      throw new Error("candidate_receipt_v2_authority_invalid");
    }
    const expectedProjectionPaths = ["answers.json", "auxiliary.json", "intro.json", "learner.json", "learner.uk.json"]
      .map((name) => `${receipt.candidateRoot}/en/l01/s02/${name}`)
      .sort();
    const candidatePaths = receipt.files.filter((entry) => entry.category === "candidate").map((entry) => entry.path).sort();
    if (!sameJson(candidatePaths, expectedProjectionPaths)) throw new Error("candidate_receipt_v2_projection_invalid");

    const {
      validateSessionCandidateProjection,
      verifyAcceptedPreviousPredecessor,
      verifyFrozenAcceptedPredecessor,
      verifyFrozenRevisionPredecessor,
      verifyImmutablePrivateHead,
    } = await import("./build_session_candidate_receipt.mjs");
    const candidateRoot = assertDirectoryContainedNoLinks(
      repoRoot,
      repoFile(repoRoot, receipt.candidateRoot, "candidate_root"),
      "candidate_root",
    );
    validateSessionCandidateProjection({
      candidateRoot,
      session: "en/l01/s02",
      courseSessionId: receipt.courseSessionId,
      blueprintAuthority: authority,
    });
    if (!receipt.frozenPredecessor || !receipt.acceptedPredecessor || !receipt.frozenRevisionPredecessor) {
      throw new Error("candidate_receipt_v2_history_invalid");
    }
    let frozenPredecessor;
    let acceptedPredecessor;
    let frozenRevisionPredecessor;
    try {
      frozenPredecessor = verifyFrozenAcceptedPredecessor({
        repoRoot,
        receiptPath: receipt.frozenPredecessor.receiptPath,
        currentSession: "en/l01/s02",
      });
      acceptedPredecessor = await verifyAcceptedPreviousPredecessor({
        repoRoot,
        acceptanceReceiptPath: receipt.acceptedPredecessor.acceptanceReceiptPath,
        frozenPredecessor,
        currentSession: "en/l01/s02",
      });
      frozenRevisionPredecessor = verifyFrozenRevisionPredecessor({
        repoRoot,
        receiptPath: receipt.frozenRevisionPredecessor.receiptPath,
        expectedCourseSessionId: receipt.courseSessionId,
      });
    } catch {
      throw new Error("candidate_receipt_v2_history_invalid");
    }
    if (!sameJson(receipt.frozenPredecessor, frozenPredecessor)
      || !sameJson(receipt.acceptedPredecessor, acceptedPredecessor)
      || !sameJson(receipt.frozenRevisionPredecessor, frozenRevisionPredecessor)) {
      throw new Error("candidate_receipt_v2_history_invalid");
    }
    verifyImmutablePrivateHead({ repoRoot, receipt, candidateReceiptSha256: receiptFile.sha256 });
    rebuildAndVerifyV2Projection({
      repoRoot,
      candidateRoot: receipt.candidateRoot,
      sourceSnapshotIndexPath: receipt.sourceSnapshot.indexPath,
      sourceSnapshotIndexSha256: receipt.sourceSnapshot.indexSha256,
    });
  }
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

function verifyAdvisoryClaim({ repoRoot, entry, expected }) {
  if (!entry || !REQUIRED_DIMENSIONS.includes(entry.dimension)) throw new Error("review_dimension_set_invalid");
  const configuredModelClaim = entry.dispatchProvenance?.configuredModel;
  const runIdClaim = entry.dispatchProvenance?.agent;
  if (configuredModelClaim !== "gpt-6-luna") {
    throw new Error(`review_model_claim_invalid:${entry.dimension}`);
  }
  if (typeof runIdClaim !== "string" || !runIdClaim) {
    throw new Error(`review_run_id_claim_invalid:${entry.dimension}`);
  }
  const artifact = readBoundFile(repoRoot, entry.artifactPath, entry.artifactSha256, "review_artifact");
  const raw = JSON.parse(artifact.bytes.toString("utf8"));
  const identity = rawReviewIdentity(raw);
  if (raw.dimension !== entry.dimension) throw new Error(`review_dimension_mismatch:${entry.dimension}`);
  if (typeof raw.verdict !== "string" || !raw.verdict || !Array.isArray(reviewFindings(raw))) {
    throw new Error(`review_claim_invalid:${entry.dimension}`);
  }
  if (identity.sessionId !== expected.sessionId || identity.candidateBundleSha256 !== expected.candidateBundleSha256
    || (identity.contentReceiptSha256 && identity.contentReceiptSha256 !== expected.contentReceiptSha256)) {
    throw new Error(`review_candidate_mismatch:${entry.dimension}`);
  }
  return {
    dimension: entry.dimension,
    trustClass: "self_declared_untrusted",
    configuredModelClaim,
    runIdClaim,
    verdictClaim: raw.verdict,
    findingCountClaim: reviewFindings(raw).length,
    artifactPath: entry.artifactPath,
    artifactSha256: artifact.sha256,
    artifactBytes: artifact.bytes.length,
    advisoryOnly: true,
    semanticAuthority: false,
  };
}

function v2CanonicalGateSpecs(candidateReceiptPath) {
  return ["blueprint_authority", "s02_exact_packet", "feedback_locale_parity", "actor_clarity", "candidate_build_source_projection", "receipt_history"]
    .map((check) => ({
      id: check,
      command: `node content/learning-v2-course/pipeline/verify_session_candidate_receipt_v2.mjs --candidate-receipt ${candidateReceiptPath} --check ${check}`,
      executable: process.execPath,
      args: [
        "content/learning-v2-course/pipeline/verify_session_candidate_receipt_v2.mjs",
        "--candidate-receipt",
        candidateReceiptPath,
        "--check",
        check,
      ],
    }));
}

function rerunV2CanonicalGates({ repoRoot, candidateReceiptPath, reportGates }) {
  const specs = v2CanonicalGateSpecs(candidateReceiptPath);
  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    const declared = reportGates[index];
    if (declared?.id !== spec.id || declared?.command !== spec.command) {
      throw new Error(`deterministic_gate_command_invalid:${spec.id}`);
    }
    const result = spawnSync(spec.executable, spec.args, {
      cwd: repoRoot,
      encoding: "utf8",
      shell: false,
      timeout: 120_000,
    });
    if (result.error || result.status !== 0) {
      throw new Error(`deterministic_gate_execution_failed:${spec.id}`);
    }
  }
}

function verifyGateReport({ repoRoot, reportPath, reportSha256, expected, candidateReceiptPath }) {
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
  if (expected.candidateSchemaVersion === CANDIDATE_SCHEMA_V2) {
    const gateIds = report.gates.map((gate) => gate?.id);
    if (JSON.stringify(gateIds) !== JSON.stringify(V2_REQUIRED_GATES)
      || report.gates.some((gate) => typeof gate.command !== "string" || !gate.command.trim())) {
      throw new Error("deterministic_gate_set_invalid");
    }
    rerunV2CanonicalGates({ repoRoot, candidateReceiptPath, reportGates: report.gates });
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
  const candidate = await verifyCandidateReceipt({ repoRoot, candidateReceiptPath });
  if (candidate.receipt.courseSessionId !== identity.sessionId) throw new Error("candidate_session_mismatch");
  if (candidate.receipt.schemaVersion === CANDIDATE_SCHEMA_V2) {
    throw new Error("trusted_review_attestation_required");
  }
  const dimensions = Array.isArray(reviewEvidence) ? reviewEvidence.map((entry) => entry?.dimension).sort() : [];
  if (JSON.stringify(dimensions) !== JSON.stringify([...REQUIRED_DIMENSIONS].sort())) throw new Error("review_dimension_set_invalid");
  const expected = {
    sessionId: identity.sessionId,
    candidateBundleSha256: candidate.receipt.candidateBundleSha256,
    contentReceiptSha256: candidate.receiptSha256,
    candidateInventorySha256: candidate.receipt.inventorySha256,
    sourceFingerprint: candidate.receipt.sourceSnapshot?.indexSha256,
    candidateSchemaVersion: candidate.receipt.schemaVersion,
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
  const gate = verifyGateReport({ repoRoot, reportPath: deterministicGateReportPath, expected, candidateReceiptPath });
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

export async function buildSessionMachineValidationReceipt({
  repoRoot = process.cwd(),
  session,
  candidateReceiptPath,
  deterministicGateReportPath,
  reviewEvidence,
} = {}) {
  const identity = identityFor(session);
  const candidate = await verifyCandidateReceipt({ repoRoot, candidateReceiptPath });
  if (candidate.receipt.courseSessionId !== identity.sessionId) throw new Error("candidate_session_mismatch");
  if (candidate.receipt.schemaVersion !== CANDIDATE_SCHEMA_V2) throw new Error("machine_validation_candidate_v2_required");
  const dimensions = Array.isArray(reviewEvidence) ? reviewEvidence.map((entry) => entry?.dimension).sort() : [];
  if (JSON.stringify(dimensions) !== JSON.stringify([...REQUIRED_DIMENSIONS].sort())) throw new Error("review_dimension_set_invalid");
  const expected = {
    sessionId: identity.sessionId,
    candidateBundleSha256: candidate.receipt.candidateBundleSha256,
    contentReceiptSha256: candidate.receiptSha256,
    candidateInventorySha256: candidate.receipt.inventorySha256,
    sourceFingerprint: candidate.receipt.sourceSnapshot?.indexSha256,
    candidateSchemaVersion: candidate.receipt.schemaVersion,
  };
  if (!HEX_64.test(String(expected.sourceFingerprint ?? ""))) throw new Error("source_fingerprint_invalid");
  const advisoryClaims = reviewEvidence
    .map((entry) => verifyAdvisoryClaim({ repoRoot, entry, expected }))
    .sort((left, right) => REQUIRED_DIMENSIONS.indexOf(left.dimension) - REQUIRED_DIMENSIONS.indexOf(right.dimension));
  if (new Set(advisoryClaims.map((entry) => entry.artifactPath)).size !== advisoryClaims.length
    || new Set(advisoryClaims.map((entry) => entry.artifactSha256)).size !== advisoryClaims.length
    || new Set(advisoryClaims.map((entry) => entry.runIdClaim)).size !== advisoryClaims.length) {
    throw new Error("review_evidence_not_distinct");
  }
  const gate = verifyGateReport({ repoRoot, reportPath: deterministicGateReportPath, expected, candidateReceiptPath });
  return {
    schemaVersion: MACHINE_VALIDATION_SCHEMA,
    session: identity.session,
    courseSessionId: identity.sessionId,
    state: "MACHINE_VALIDATED",
    candidateRoot: candidate.receipt.candidateRoot,
    candidateReceiptPath,
    candidateReceiptSha256: candidate.receiptSha256,
    candidateBundleSha256: candidate.receipt.candidateBundleSha256,
    candidateInventorySha256: candidate.receipt.inventorySha256,
    sourceFingerprint: expected.sourceFingerprint,
    deterministicGateReport: gate,
    advisoryClaims,
    localeEvidence: localeEvidenceFromCandidate(candidate.receipt),
    semanticAuthority: false,
    releaseAuthority: false,
    immutableContentOnly: true,
  };
}

export async function validateSessionMachineValidationReceipt({
  repoRoot = process.cwd(),
  machineValidationReceiptPath,
} = {}) {
  const receiptFile = readBoundFile(repoRoot, machineValidationReceiptPath, null, "machine_validation_receipt");
  const stored = JSON.parse(receiptFile.bytes.toString("utf8"));
  if (stored.schemaVersion !== MACHINE_VALIDATION_SCHEMA || stored.state !== "MACHINE_VALIDATED"
    || stored.semanticAuthority !== false || stored.releaseAuthority !== false || stored.immutableContentOnly !== true) {
    throw new Error("machine_validation_receipt_invalid");
  }
  const rebuilt = await buildSessionMachineValidationReceipt({
    repoRoot,
    session: stored.session,
    candidateReceiptPath: stored.candidateReceiptPath,
    deterministicGateReportPath: stored.deterministicGateReport?.path,
    reviewEvidence: stored.advisoryClaims?.map((claim) => ({
      dimension: claim.dimension,
      artifactPath: claim.artifactPath,
      artifactSha256: claim.artifactSha256,
      dispatchProvenance: {
        configuredModel: claim.configuredModelClaim,
        agent: claim.runIdClaim,
      },
    })),
  });
  if (JSON.stringify(rebuilt) !== JSON.stringify(stored)) throw new Error("machine_validation_receipt_stale");
  return Object.freeze({
    ...stored,
    machineValidationReceiptSha256: receiptFile.sha256,
    machineValidationReceiptPath,
  });
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
export const SESSION_ACCEPTANCE_V2_REQUIRED_GATES = V2_REQUIRED_GATES;
export function sessionAcceptanceV2CanonicalGateCommands(candidateReceiptPath) {
  return v2CanonicalGateSpecs(candidateReceiptPath).map(({ id, command }) => Object.freeze({ id, command }));
}
