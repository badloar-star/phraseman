import type {
  ContentGateReceiptBody,
  ContentReceiptSubject,
} from "../../../modules/learning-v2/contracts/content_studio";
import {
  validateContentGateReceiptBody,
  validateContentReceiptSubject,
} from "../../../modules/learning-v2/contracts/validation";

type ReceiptStatus = "passed" | "passed_with_waivers" | "approved";

export interface ContentReceiptEvidence {
  readonly receiptHash: string;
  readonly subject: ContentReceiptSubject;
  readonly status: ReceiptStatus;
}

export interface ModeTemplateApprovalGateInput {
  readonly subject: ContentReceiptSubject;
  readonly validationReceipt: ContentReceiptEvidence;
  readonly localizationReceipt: ContentReceiptEvidence;
  readonly reviewReceipt: ContentReceiptEvidence;
  readonly gateReceipt: ContentGateReceiptBody;
}

export interface PublishedModeTemplateTransitionRef {
  readonly templateId: string;
  readonly version: number;
  readonly contentHash: string;
  readonly status: "published" | "deprecated" | "archived";
}

const HASH = /^[a-f0-9]{64}$/;

const sameSubject = (left: ContentReceiptSubject, right: ContentReceiptSubject) =>
  left.entityType === right.entityType &&
  left.entityId === right.entityId &&
  left.entityRevision === right.entityRevision &&
  left.entityFingerprint === right.entityFingerprint;

const validEvidence = (value: unknown): value is ContentReceiptEvidence => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Object.keys(candidate).every((key) => ["receiptHash", "subject", "status", "reviewerId"].includes(key)) &&
    typeof candidate.receiptHash === "string" &&
    HASH.test(candidate.receiptHash) &&
    validateContentReceiptSubject(candidate.subject).ok &&
    ["passed", "passed_with_waivers", "approved", "changes_requested"].includes(String(candidate.status)) &&
    (!Object.prototype.hasOwnProperty.call(candidate, "reviewerId") || typeof candidate.reviewerId === "string")
  );
};

/** Cross-checks the fresh receipts required before publishing one ModeTemplate version. */
export const validateModeTemplateApprovalGate = (
  input: unknown,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } => {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return { ok: false, reason: "mode_template_gate_input_invalid" };
  const value = input as Record<string, unknown>;
  const required = [
    "subject",
    "validationReceipt",
    "localizationReceipt",
    "reviewReceipt",
    "gateReceipt",
  ];
  if (
    Object.keys(value).length !== required.length ||
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
    return { ok: false, reason: "mode_template_gate_keys_invalid" };
  const subjectResult = validateContentReceiptSubject(value.subject);
  if (!subjectResult.ok || !["mode_template", "episode"].includes(subjectResult.value.entityType))
    return { ok: false, reason: "content_gate_subject_invalid" };
  const evidence = [value.validationReceipt, value.localizationReceipt, value.reviewReceipt];
  if (evidence.some((item) => !validEvidence(item)))
    return { ok: false, reason: "mode_template_gate_receipt_invalid" };
  const validation = value.validationReceipt as ContentReceiptEvidence;
  const localization = value.localizationReceipt as ContentReceiptEvidence;
  const review = value.reviewReceipt as ContentReceiptEvidence;
  if (
    !sameSubject(validation.subject, subjectResult.value) ||
    !sameSubject(localization.subject, subjectResult.value) ||
    !sameSubject(review.subject, subjectResult.value)
  )
    return { ok: false, reason: "mode_template_gate_subject_mismatch" };
  if (validation.status === "approved" || review.status === "passed")
    return { ok: false, reason: "mode_template_gate_status_invalid" };
  if (localization.status !== "approved" || review.status !== "approved")
    return { ok: false, reason: "mode_template_gate_status_invalid" };
  const gateResult = validateContentGateReceiptBody(value.gateReceipt);
  if (!gateResult.ok) return { ok: false, reason: "mode_template_gate_body_invalid" };
  const gate = gateResult.value;
  if (
    gate.gateKind !== "approval" ||
    !sameSubject(gate.subject, subjectResult.value) ||
    gate.validationReceiptHash !== validation.receiptHash ||
    gate.localizationReceiptSetHash !== localization.receiptHash ||
    gate.reviewReceiptHash !== review.receiptHash
  )
    return { ok: false, reason: "mode_template_gate_hash_or_subject_mismatch" };
  return { ok: true };
};

/** Validates a deprecation replacement against the already resolved target. */
export const validateModeTemplateReplacementTarget = (
  current: PublishedModeTemplateTransitionRef,
  replacement: PublishedModeTemplateTransitionRef,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } => {
  if (
    !HASH.test(current.contentHash) ||
    !HASH.test(replacement.contentHash) ||
    current.templateId.length === 0 ||
    replacement.templateId.length === 0 ||
    !Number.isSafeInteger(current.version) ||
    !Number.isSafeInteger(replacement.version) ||
    current.version < 1 ||
    replacement.version < 1
  )
    return { ok: false, reason: "mode_template_replacement_ref_invalid" };
  if (
    current.templateId === replacement.templateId &&
    current.version === replacement.version &&
    current.contentHash === replacement.contentHash
  )
    return { ok: false, reason: "mode_template_replacement_self_reference" };
  if (replacement.status !== "published")
    return { ok: false, reason: "mode_template_replacement_not_published" };
  return { ok: true };
};
