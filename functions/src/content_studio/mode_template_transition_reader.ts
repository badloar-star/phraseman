import type { ContentGateReceiptBody, ContentReceiptSubject } from "../../../modules/learning-v2/contracts/content_studio";
import { validateContentGateReceiptBody, validateContentReceiptSubject } from "../../../modules/learning-v2/contracts/validation";
import {
  validateModeTemplateApprovalGate,
  type ContentReceiptEvidence,
} from "./mode_template_transition";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

export interface ModeTemplateReceiptDocumentReader {
  get(collection: string, id: string): Promise<unknown | undefined>;
}

export interface ModeTemplateApprovalReceiptIds {
  readonly validationReceiptId: string;
  readonly localizationReceiptId: string;
  readonly reviewReceiptId: string;
  readonly gateReceiptId: string;
}

const collections = {
  validation: "content_studio_validation_receipts",
  localization: "content_studio_localization_receipts",
  review: "content_studio_review_receipts",
  gate: "content_studio_gate_receipts",
} as const;

const readEvidence = async (
  reader: ModeTemplateReceiptDocumentReader,
  collection: string,
  id: string,
): Promise<ContentReceiptEvidence | undefined> => {
  if (id.length === 0) return undefined;
  const value = await reader.get(collection, id);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some((key) => !["receiptHash", "subject", "status", "reviewerId"].includes(key)) ||
    !["receiptHash", "subject", "status"].every((key) => Object.prototype.hasOwnProperty.call(record, key)) ||
    typeof record.receiptHash !== "string" ||
    !validateContentReceiptSubject(record.subject).ok ||
    !["passed", "passed_with_waivers", "approved", "changes_requested"].includes(String(record.status)) ||
    (Object.prototype.hasOwnProperty.call(record, "reviewerId") && typeof record.reviewerId !== "string")
  )
    return undefined;
  return record as unknown as ContentReceiptEvidence;
};

/** Server-owned Firestore read seam; clients never supply receipt bodies directly. */
export const resolveContentApprovalGateFromFirestore = async (
  reader: ModeTemplateReceiptDocumentReader,
  subject: ContentReceiptSubject,
  ids: ModeTemplateApprovalReceiptIds,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> => {
  if (!validateContentReceiptSubject(subject).ok || !["mode_template", "episode"].includes(subject.entityType))
    return { ok: false, reason: "content_gate_subject_invalid" };
  const [validationReceipt, localizationReceipt, reviewReceipt, gateDocument] = await Promise.all([
    readEvidence(reader, collections.validation, ids.validationReceiptId),
    readEvidence(reader, collections.localization, ids.localizationReceiptId),
    readEvidence(reader, collections.review, ids.reviewReceiptId),
    reader.get(collections.gate, ids.gateReceiptId),
  ]);
  if (!validationReceipt || !localizationReceipt || !reviewReceipt)
    return { ok: false, reason: "mode_template_gate_receipt_missing" };
  let gateValue = gateDocument;
  if (gateDocument && typeof gateDocument === "object" && !Array.isArray(gateDocument) && "body" in gateDocument && "record" in gateDocument) {
    const envelope = gateDocument as { body?: unknown; record?: unknown };
    const record = envelope.record as Record<string, unknown> | undefined;
    if (!record || record.schemaVersion !== "content-gate-receipt-record.v1" || record.receiptHash !== hashCanonicalBody(envelope.body) || !record.object || (record.object as Record<string, unknown>).contentHash !== record.receiptHash) return { ok: false, reason: "mode_template_gate_record_invalid" };
    gateValue = envelope.body;
  }
  const gateResult = validateContentGateReceiptBody(gateValue);
  if (!gateResult.ok)
    return { ok: false, reason: "mode_template_gate_body_invalid" };
  return validateModeTemplateApprovalGate({
    subject,
    validationReceipt,
    localizationReceipt,
    reviewReceipt,
    gateReceipt: gateResult.value,
  });
};

export const resolveModeTemplateApprovalGateFromFirestore = resolveContentApprovalGateFromFirestore;
