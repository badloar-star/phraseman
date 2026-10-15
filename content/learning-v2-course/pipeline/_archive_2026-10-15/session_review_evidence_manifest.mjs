import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export const SESSION_REVIEW_ROLES = Object.freeze([
  "learner", "reader", "pedagogy", "nonsense", "taste", "progression", "locale",
]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function resolveInside(root, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\\")) throw new Error(`${label}_path_invalid`);
  const absolute = resolve(root, ...relativePath.split("/"));
  const fromRoot = relative(root, absolute);
  if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(fromRoot)) {
    throw new Error(`${label}_path_outside_root`);
  }
  return absolute;
}

function rawDeclaration(rawText, label) {
  const prefix = `${label}:`;
  const line = rawText
    .split(/\r?\n/u)
    .map((value) => value.replace(/^\s*-\s*/u, "").trim())
    .find((value) => value.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}

function assertCandidateBinding(manifest, candidate) {
  if (manifest.releaseAuthority !== false) throw new Error("text_review_manifest_release_authority_not_false");
  if (manifest.courseSessionId !== "en:lesson-01:session-02" || candidate.candidateKey !== "en/l01/s02") {
    throw new Error("text_review_session_mismatch");
  }
  if (manifest.candidateBundleSha256 !== candidate.candidateBundleSha256
    || manifest.candidateReceiptInventorySha256 !== candidate.contentReceiptInventorySha256) {
    throw new Error("text_review_manifest_candidate_mismatch");
  }
  if (JSON.stringify(manifest.requiredRoles) !== JSON.stringify(SESSION_REVIEW_ROLES)) {
    throw new Error("text_review_required_role_set_invalid");
  }
}

async function verifiedRoleEntry({ courseRoot, roleName, rawArtifactPath, candidate }) {
  const rawBytes = await readFile(resolveInside(courseRoot, rawArtifactPath, `text_review_raw_${roleName}`));
  const rawText = rawBytes.toString("utf8");
  const reviewerRunId = rawDeclaration(rawText, "Reviewer run");
  if (rawDeclaration(rawText, "Role") !== roleName) throw new Error(`text_review_raw_role_mismatch:${roleName}`);
  if (typeof reviewerRunId !== "string" || !reviewerRunId) throw new Error(`text_review_raw_run_mismatch:${roleName}`);
  if (rawDeclaration(rawText, "Verdict") !== "PASS") throw new Error(`text_review_raw_verdict_mismatch:${roleName}`);
  if (rawDeclaration(rawText, "Candidate bundle SHA-256") !== candidate.candidateBundleSha256
    || rawDeclaration(rawText, "Content inventory SHA-256") !== candidate.contentReceiptInventorySha256
    || rawDeclaration(rawText, "Content receipt SHA-256") !== candidate.contentReceiptSha256) {
    throw new Error(`text_review_raw_candidate_mismatch:${roleName}`);
  }
  return {
    role: roleName,
    eligible: true,
    reviewerId: reviewerRunId,
    reviewerRunId,
    reviewerRunIdKind: "agent_task_path",
    reviewerProvenance: null,
    rawArtifactPath,
    rawArtifactBytes: rawBytes.length,
    rawArtifactSha256: sha256(rawBytes),
    reviewedCandidateSha256: candidate.candidateBundleSha256,
    reviewedCandidateReceiptInventorySha256: candidate.contentReceiptInventorySha256,
    reviewedContentReceiptSha256: candidate.contentReceiptSha256,
    verdict: "PASS",
    findings: [],
    reviewedAt: null,
  };
}

export async function validateSessionReviewEvidenceManifest({ courseRoot, manifest, candidate } = {}) {
  const effectiveCourseRoot = resolve(courseRoot);
  assertCandidateBinding(manifest, candidate);
  if (!Array.isArray(manifest.roles) || manifest.roles.length !== SESSION_REVIEW_ROLES.length) throw new Error("text_review_role_set_invalid");
  const byRole = new Map(manifest.roles.map((entry) => [entry?.role, entry]));
  if (byRole.size !== SESSION_REVIEW_ROLES.length || SESSION_REVIEW_ROLES.some((role) => !byRole.has(role))) throw new Error("text_review_role_set_invalid");
  if (JSON.stringify(manifest.eligibleRoles) !== JSON.stringify(SESSION_REVIEW_ROLES)
    || !Array.isArray(manifest.missingRoles) || manifest.missingRoles.length !== 0
    || manifest.textReviewComplete !== true) {
    throw new Error("text_review_completion_not_derived");
  }

  const runIds = new Set();
  const rawPaths = new Set();
  const rawHashes = new Set();
  for (const roleName of SESSION_REVIEW_ROLES) {
    const role = byRole.get(roleName);
    if (role.eligible !== true || role.verdict !== "PASS") throw new Error(`text_review_role_not_eligible:${roleName}`);
    if (!Array.isArray(role.findings) || role.findings.length !== 0) throw new Error(`text_review_role_findings_present:${roleName}`);
    if (role.reviewedCandidateSha256 !== candidate.candidateBundleSha256
      || role.reviewedCandidateReceiptInventorySha256 !== candidate.contentReceiptInventorySha256
      || role.reviewedContentReceiptSha256 !== candidate.contentReceiptSha256) {
      throw new Error(`text_review_role_candidate_mismatch:${roleName}`);
    }
    if (typeof role.reviewerRunId !== "string" || !role.reviewerRunId || runIds.has(role.reviewerRunId)) throw new Error(`text_review_reviewer_run_reused:${roleName}`);
    runIds.add(role.reviewerRunId);
    if (typeof role.rawArtifactPath !== "string" || rawPaths.has(role.rawArtifactPath)) throw new Error(`text_review_raw_path_reused:${roleName}`);
    rawPaths.add(role.rawArtifactPath);
    if (typeof role.rawArtifactSha256 !== "string" || rawHashes.has(role.rawArtifactSha256)) throw new Error(`text_review_raw_hash_reused:${roleName}`);
    rawHashes.add(role.rawArtifactSha256);

    const rawBytes = await readFile(resolveInside(effectiveCourseRoot, role.rawArtifactPath, `text_review_raw_${roleName}`));
    if (rawBytes.length !== role.rawArtifactBytes || sha256(rawBytes) !== role.rawArtifactSha256) throw new Error(`text_review_raw_stale:${roleName}`);
    const rawText = rawBytes.toString("utf8");
    if (rawDeclaration(rawText, "Role") !== roleName) throw new Error(`text_review_raw_role_mismatch:${roleName}`);
    if (rawDeclaration(rawText, "Reviewer run") !== role.reviewerRunId) throw new Error(`text_review_raw_run_mismatch:${roleName}`);
    if (rawDeclaration(rawText, "Verdict") !== "PASS") throw new Error(`text_review_raw_verdict_mismatch:${roleName}`);
    if (rawDeclaration(rawText, "Candidate bundle SHA-256") !== candidate.candidateBundleSha256
      || rawDeclaration(rawText, "Content inventory SHA-256") !== candidate.contentReceiptInventorySha256
      || rawDeclaration(rawText, "Content receipt SHA-256") !== candidate.contentReceiptSha256) {
      throw new Error(`text_review_raw_candidate_mismatch:${roleName}`);
    }

    const history = (manifest.reviewHistory ?? []).filter((entry) => entry?.role === roleName && entry?.reviewerRunId === role.reviewerRunId);
    if (history.length !== 1) throw new Error(`text_review_history_binding_invalid:${roleName}`);
    const [record] = history;
    if (record.currentEligibility !== true || record.verdict !== "PASS"
      || record.rawArtifactPath !== role.rawArtifactPath || record.rawArtifactBytes !== role.rawArtifactBytes
      || record.rawArtifactSha256 !== role.rawArtifactSha256
      || record.reviewedCandidateSha256 !== candidate.candidateBundleSha256
      || record.reviewedCandidateReceiptInventorySha256 !== candidate.contentReceiptInventorySha256
      || record.reviewedContentReceiptSha256 !== candidate.contentReceiptSha256) {
      throw new Error(`text_review_history_binding_invalid:${roleName}`);
    }
  }
  return Object.freeze({ textVerified: true, candidateKey: candidate.candidateKey, roleCount: SESSION_REVIEW_ROLES.length });
}

export async function materializeSessionReviewEvidenceManifest({ courseRoot, initialManifest, rawArtifactPaths, candidate } = {}) {
  const effectiveCourseRoot = resolve(courseRoot);
  assertCandidateBinding(initialManifest, candidate);
  if (!rawArtifactPaths || Object.keys(rawArtifactPaths).length !== SESSION_REVIEW_ROLES.length) throw new Error("text_review_raw_role_set_invalid");
  const roles = [];
  for (const roleName of SESSION_REVIEW_ROLES) {
    if (typeof rawArtifactPaths[roleName] !== "string") throw new Error(`text_review_raw_path_missing:${roleName}`);
    roles.push(await verifiedRoleEntry({ courseRoot: effectiveCourseRoot, roleName, rawArtifactPath: rawArtifactPaths[roleName], candidate }));
  }
  const manifest = {
    ...structuredClone(initialManifest),
    eligibleRoles: [...SESSION_REVIEW_ROLES],
    missingRoles: [],
    roles,
    reviewHistory: [...(Array.isArray(initialManifest.reviewHistory) ? initialManifest.reviewHistory : []), ...roles.map((entry) => ({
      role: entry.role,
      reviewerId: entry.reviewerId,
      reviewerRunId: entry.reviewerRunId,
      reviewerRunIdKind: entry.reviewerRunIdKind,
      rawArtifactPath: entry.rawArtifactPath,
      rawArtifactBytes: entry.rawArtifactBytes,
      rawArtifactSha256: entry.rawArtifactSha256,
      reviewedCandidateSha256: entry.reviewedCandidateSha256,
      reviewedCandidateReceiptInventorySha256: entry.reviewedCandidateReceiptInventorySha256,
      reviewedContentReceiptSha256: entry.reviewedContentReceiptSha256,
      verdict: "PASS",
      findings: [],
      currentEligibility: true,
    }))],
    textReviewComplete: true,
    releaseAuthority: false,
  };
  await validateSessionReviewEvidenceManifest({ courseRoot: effectiveCourseRoot, manifest, candidate });
  return manifest;
}
