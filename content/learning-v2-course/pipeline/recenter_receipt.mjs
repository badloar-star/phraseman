import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const RECEIPT_FIELDS = new Set([
  "schemaVersion",
  "phase",
  "status",
  "targetLanguage",
  "sessionId",
  "processEpoch",
  "packDigest",
  "instructionSetDigest",
  "blueprintFingerprint",
  "packetFingerprint",
  "previousReleasedRangeDigest",
  "preReceiptDigest",
  "authoredRuDigest",
  "authoredUkDigest",
  "releaseAttemptId",
  "releaseFingerprint",
  "releaseManifestFingerprint",
  "mockupFingerprint",
  "mockupManifestFingerprint",
  "postReceiptDigest",
  "contentJudgeBundleDigest",
  "releaseAttemptHistoryDigest",
  "requirementResults",
  "mustFix",
]);
const RESULT_FIELDS = new Set([
  "requirementId",
  "verdict",
  "evidence",
  "authorDirective",
  "notApplicableReason",
]);
const EVIDENCE_FIELDS = new Set(["path", "sha256", "section", "fact"]);
const VERDICTS = new Set(["PASS", "HOLD", "NOT_APPLICABLE"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const isRecord = (value) => value !== null
  && typeof value === "object"
  && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string"
  && value.trim().length > 0;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function unknownFields(value, allowed, prefix) {
  if (!isRecord(value)) return [];
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}:${key}`);
}

export function recenterReceiptDigest(receipt) {
  const bytes = JSON.stringify(canonicalize(receipt));
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function compareIdentity(issues, receipt, pack, field, issue) {
  if (receipt[field] !== pack[field]) issues.push(issue);
}

function comparablePath(value) {
  if (typeof value !== "string") return "";
  const normalized = value.replaceAll("\\", "/");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function evidenceByPath(pack) {
  const values = [
    ...(Array.isArray(pack?.sources) ? pack.sources : []),
    pack?.blueprint,
    pack?.exactPacket,
    ...(Array.isArray(pack?.previousReleased) ? pack.previousReleased : []),
    pack?.authoredRu,
    pack?.authoredUk,
    pack?.releasePackage,
    pack?.releaseManifest,
    pack?.mockup,
    pack?.mockupManifest,
    ...(Array.isArray(pack?.contentJudgeReceipts) ? pack.contentJudgeReceipts : []),
    ...(Array.isArray(pack?.previousReleaseAttempts) ? pack.previousReleaseAttempts : []),
  ].filter(isRecord);
  return new Map(values.map((item) => [comparablePath(item.path), item]));
}

export function validateRecenterReceipt({
  receipt,
  pack,
  expectedPhase,
  processEpoch,
  preReceipt = null,
  prePack = null,
  postReceipt = null,
  postPack = null,
}) {
  if (!isRecord(receipt)) return ["receipt_absent"];
  const issues = unknownFields(receipt, RECEIPT_FIELDS, "unknown_receipt_field");

  if (receipt.schemaVersion !== "learning-v2-recenter-receipt.v1") {
    issues.push("receipt_schema_invalid");
  }
  if (receipt.targetLanguage !== "de" || receipt.targetLanguage !== pack?.targetLanguage) {
    issues.push("target_language_mismatch");
  }
  if (receipt.sessionId !== pack?.sessionId) issues.push("session_id_mismatch");
  if (receipt.phase !== expectedPhase || receipt.phase !== pack?.phase) {
    issues.push("phase_mismatch");
  }
  if (!UUID.test(String(processEpoch || "")) || !UUID.test(String(receipt.processEpoch || ""))) {
    issues.push("process_epoch_required");
  }
  if (receipt.processEpoch !== processEpoch) issues.push("process_epoch_mismatch");
  const expectedStatus = expectedPhase === "PRE_AUTHOR" ? "ON_TRACK" : "PASS";
  if (receipt.status !== expectedStatus) {
    issues.push(`receipt_status_invalid:expected_${expectedStatus}`);
  }

  compareIdentity(issues, receipt, pack, "packDigest", "pack_digest_stale");
  compareIdentity(
    issues,
    receipt,
    pack,
    "instructionSetDigest",
    "instruction_set_digest_stale",
  );
  compareIdentity(
    issues,
    receipt,
    pack,
    "blueprintFingerprint",
    "blueprint_fingerprint_stale",
  );
  compareIdentity(
    issues,
    receipt,
    pack,
    "packetFingerprint",
    "packet_fingerprint_stale",
  );
  compareIdentity(
    issues,
    receipt,
    pack,
    "previousReleasedRangeDigest",
    "previous_released_range_digest_stale",
  );

  if (expectedPhase === "PRE_AUTHOR") {
    if (receipt.preReceiptDigest !== null) issues.push("pre_receipt_digest_must_be_null");
    if (receipt.authoredRuDigest !== null) issues.push("authored_ru_digest_must_be_null");
    if (receipt.authoredUkDigest !== null) issues.push("authored_uk_digest_must_be_null");
    for (const field of [
      "releaseAttemptId",
      "releaseFingerprint",
      "releaseManifestFingerprint",
      "mockupFingerprint",
      "mockupManifestFingerprint",
      "postReceiptDigest",
      "contentJudgeBundleDigest",
      "releaseAttemptHistoryDigest",
    ]) {
      if (receipt[field] !== null) issues.push(`${field}_must_be_null`);
    }
  } else if (expectedPhase === "POST_AUTHOR") {
    compareIdentity(
      issues,
      receipt,
      pack,
      "authoredRuDigest",
      "authored_ru_digest_stale",
    );
    compareIdentity(
      issues,
      receipt,
      pack,
      "authoredUkDigest",
      "authored_uk_digest_stale",
    );
    for (const field of [
      "releaseAttemptId",
      "releaseFingerprint",
      "releaseManifestFingerprint",
      "mockupFingerprint",
      "mockupManifestFingerprint",
      "postReceiptDigest",
      "contentJudgeBundleDigest",
      "releaseAttemptHistoryDigest",
    ]) {
      if (receipt[field] !== null) issues.push(`${field}_must_be_null`);
    }
    if (!isRecord(preReceipt) || !isRecord(prePack)) {
      issues.push("pre_receipt_required");
    } else {
      const preIssues = validateRecenterReceipt({
        receipt: preReceipt,
        pack: prePack,
        expectedPhase: "PRE_AUTHOR",
        processEpoch,
      });
      if (preIssues.length > 0) {
        issues.push(`pre_receipt_invalid:${preIssues.join(",")}`);
      }
      const prePostIdentityFields = [
        ["targetLanguage", "pre_post_target_mismatch"],
        ["sessionId", "pre_post_session_mismatch"],
        ["instructionSetDigest", "pre_post_instruction_set_mismatch"],
        ["blueprintFingerprint", "pre_post_blueprint_mismatch"],
        ["packetFingerprint", "pre_post_packet_mismatch"],
        ["previousReleasedRangeDigest", "pre_post_previous_range_mismatch"],
      ];
      for (const [field, issue] of prePostIdentityFields) {
        if (prePack[field] !== pack[field]) issues.push(issue);
      }
      if (receipt.preReceiptDigest !== recenterReceiptDigest(preReceipt)) {
        issues.push("pre_receipt_digest_stale");
      }
    }
  } else if (expectedPhase === "RELEASE_PROJECTION") {
    for (const [field, issue] of [
      ["authoredRuDigest", "authored_ru_digest_stale"],
      ["authoredUkDigest", "authored_uk_digest_stale"],
      ["releaseAttemptId", "release_attempt_id_stale"],
      ["releaseFingerprint", "release_fingerprint_stale"],
      ["releaseManifestFingerprint", "release_manifest_fingerprint_stale"],
      ["mockupFingerprint", "mockup_fingerprint_stale"],
      ["mockupManifestFingerprint", "mockup_manifest_fingerprint_stale"],
      ["contentJudgeBundleDigest", "content_judge_bundle_digest_stale"],
      ["releaseAttemptHistoryDigest", "release_attempt_history_digest_stale"],
    ]) compareIdentity(issues, receipt, pack, field, issue);

    if (!isRecord(preReceipt) || !isRecord(prePack)) {
      issues.push("pre_receipt_required");
    } else {
      const preIssues = validateRecenterReceipt({
        receipt: preReceipt,
        pack: prePack,
        expectedPhase: "PRE_AUTHOR",
        processEpoch,
      });
      if (preIssues.length > 0) issues.push(`pre_receipt_invalid:${preIssues.join(",")}`);
      if (receipt.preReceiptDigest !== recenterReceiptDigest(preReceipt)) {
        issues.push("pre_receipt_digest_stale");
      }
    }
    if (!isRecord(postReceipt) || !isRecord(postPack)) {
      issues.push("post_receipt_required");
    } else {
      const postIssues = validateRecenterReceipt({
        receipt: postReceipt,
        pack: postPack,
        expectedPhase: "POST_AUTHOR",
        processEpoch,
        preReceipt,
        prePack,
      });
      if (postIssues.length > 0) issues.push(`post_receipt_invalid:${postIssues.join(",")}`);
      if (receipt.postReceiptDigest !== recenterReceiptDigest(postReceipt)) {
        issues.push("post_receipt_digest_stale");
      }
      for (const [field, issue] of [
        ["targetLanguage", "post_release_target_mismatch"],
        ["sessionId", "post_release_session_mismatch"],
        ["instructionSetDigest", "post_release_instruction_set_mismatch"],
        ["blueprintFingerprint", "post_release_blueprint_mismatch"],
        ["packetFingerprint", "post_release_packet_mismatch"],
        ["previousReleasedRangeDigest", "post_release_previous_range_mismatch"],
        ["authoredRuDigest", "post_release_authored_ru_mismatch"],
        ["authoredUkDigest", "post_release_authored_uk_mismatch"],
      ]) {
        if (postPack[field] !== pack[field]) issues.push(issue);
      }
    }
  } else {
    issues.push(`expected_phase_invalid:${expectedPhase}`);
  }

  const requirements = Array.isArray(pack?.requirements) ? pack.requirements : [];
  const expectedById = new Map(requirements.map((item) => [item.id, item]));
  const results = Array.isArray(receipt.requirementResults)
    ? receipt.requirementResults
    : [];
  if (!Array.isArray(receipt.requirementResults)) {
    issues.push("requirement_results_required");
  }
  const seen = new Set();
  const allowedEvidence = evidenceByPath(pack);
  for (const [index, result] of results.entries()) {
    if (!isRecord(result)) {
      issues.push(`requirement_result_not_object:${index}`);
      continue;
    }
    issues.push(...unknownFields(result, RESULT_FIELDS, "unknown_result_field"));
    const id = result.requirementId;
    if (!isNonEmptyString(id)) {
      issues.push(`requirement_result_id_required:${index}`);
      continue;
    }
    if (seen.has(id)) issues.push(`duplicate_requirement_result:${id}`);
    seen.add(id);
    const requirement = expectedById.get(id);
    if (!requirement) issues.push(`unknown_requirement_result:${id}`);

    if (!VERDICTS.has(result.verdict)) {
      issues.push(`requirement_verdict_invalid:${id}`);
    }
    if (result.verdict === "HOLD") issues.push(`requirement_hold:${id}`);
    if (result.verdict === "NOT_APPLICABLE") {
      if (requirement?.applicability === "always") {
        issues.push(`always_requirement_not_applicable:${id}`);
      }
      if (!isNonEmptyString(result.notApplicableReason)) {
        issues.push(`not_applicable_reason_required:${id}`);
      }
    } else if (result.notApplicableReason !== null) {
      issues.push(`not_applicable_reason_must_be_null:${id}`);
    }
    if (!isNonEmptyString(result.authorDirective)) {
      issues.push(`author_directive_required:${id}`);
    }
    if (!Array.isArray(result.evidence) || result.evidence.length === 0) {
      issues.push(`requirement_evidence_required:${id}`);
    } else {
      for (const [evidenceIndex, evidence] of result.evidence.entries()) {
        if (!isRecord(evidence)) {
          issues.push(`evidence_not_object:${id}:${evidenceIndex}`);
          continue;
        }
        issues.push(...unknownFields(evidence, EVIDENCE_FIELDS, "unknown_evidence_field"));
        for (const field of EVIDENCE_FIELDS) {
          if (!isNonEmptyString(evidence[field])) {
            issues.push(`evidence_${field}_required:${id}:${evidenceIndex}`);
          }
        }
        const packedEvidence = allowedEvidence.get(comparablePath(evidence.path));
        if (!packedEvidence) {
          issues.push(`evidence_path_outside_pack:${id}:${evidenceIndex}`);
        } else if (evidence.sha256 !== packedEvidence.sha256) {
          issues.push(`evidence_digest_stale:${id}:${evidenceIndex}`);
        }
      }
    }
  }
  for (const id of expectedById.keys()) {
    if (!seen.has(id)) issues.push(`missing_requirement_result:${id}`);
  }

  if (!Array.isArray(receipt.mustFix)) {
    issues.push("must_fix_invalid");
  } else if (receipt.mustFix.length > 0) {
    issues.push("must_fix_not_empty");
  }
  return issues;
}

export function assertValidRecenterReceipt(input) {
  const issues = validateRecenterReceipt(input);
  if (issues.length > 0) {
    throw new Error(`recenter_receipt_hold:${issues.join("|")}`);
  }
}

export function persistReleaseAttemptReceipt({ repoRoot, receipt, validation }) {
  assertValidRecenterReceipt({
    ...validation,
    receipt,
    expectedPhase: "RELEASE_PROJECTION",
  });
  if (receipt.targetLanguage !== "de" || !/^de_l\d{2}_s\d{2}$/u.test(receipt.sessionId)) {
    throw new Error("recenter_receipt_hold:release_attempt_identity_invalid");
  }
  const match = /^de_l(\d{2})_s(\d{2})$/u.exec(receipt.sessionId);
  const historyRoot = path.join(
    path.resolve(repoRoot),
    `content/learning-v2-course/sessions/de/l${match[1]}/s${match[2]}/release-attempts`,
  );
  fs.mkdirSync(historyRoot, { recursive: true });
  const receiptPath = path.join(historyRoot, `${receipt.releaseAttemptId}.receipt.json`);
  const durableReceipt = {
    ...receipt,
    receiptDigest: recenterReceiptDigest(receipt),
  };
  try {
    fs.writeFileSync(receiptPath, `${JSON.stringify(durableReceipt, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error("recenter_receipt_hold:release_attempt_id_reused");
    }
    throw error;
  }
  return receiptPath;
}
