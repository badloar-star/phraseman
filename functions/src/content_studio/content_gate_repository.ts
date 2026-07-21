import type { ContentGateReceiptBody, ContentReceiptSubject } from "../../../modules/learning-v2/contracts/content_studio";
import { validateContentGateReceiptBody, validateContentReceiptSubject } from "../../../modules/learning-v2/contracts/validation";
import { canonicalJsonV1, hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import type { ModeTemplateReceiptDocumentReader } from "./mode_template_transition_reader";

export interface ContentGateReceiptRecord {
  readonly schemaVersion: "content-gate-receipt-record.v1";
  readonly gateReceiptId: string;
  readonly receiptHash: string;
  readonly object: { readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string; readonly byteSize: number };
  readonly createdAt: string;
}

export interface ContentGateObjectWriter {
  write(path: string, body: ContentGateReceiptBody): Promise<{ readonly objectGeneration: string; readonly byteSize: number; readonly contentHash: string }>;
}

export interface ContentGateIssueStore {
  runTransaction<T>(work: (tx: ContentGateIssueStore) => Promise<T>): Promise<T>;
  readonly receiptReader: ModeTemplateReceiptDocumentReader;
  readonly objectWriter?: ContentGateObjectWriter;
  writeGate(gateId: string, body: ContentGateReceiptBody, record?: ContentGateReceiptRecord): Promise<void>;
  readOperation(operationId: string): Promise<{ readonly requestFingerprint: string; readonly body: ContentGateReceiptBody } | undefined>;
  createOperation(operationId: string, value: { readonly requestFingerprint: string; readonly body: ContentGateReceiptBody }): Promise<void>;
}

export interface ContentGateReceiptIds {
  readonly validationReceiptId: string;
  readonly localizationReceiptId: string;
  readonly reviewReceiptId: string;
}

const collections = {
  validation: "content_studio_validation_receipts",
  localization: "content_studio_localization_receipts",
  review: "content_studio_review_receipts",
} as const;

const readEvidence = async (reader: ModeTemplateReceiptDocumentReader, collection: string, id: string) => {
  const value = await reader.get(collection, id);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("content_gate_receipt_missing");
  const record = value as Record<string, unknown>;
  if (typeof record.receiptHash !== "string" || !validateContentReceiptSubject(record.subject).ok || typeof record.status !== "string")
    throw new Error("content_gate_receipt_invalid");
  return { receiptHash: record.receiptHash, subject: record.subject as ContentReceiptSubject, status: record.status };
};

const sameSubject = (a: ContentReceiptSubject, b: ContentReceiptSubject) =>
  a.entityType === b.entityType && a.entityId === b.entityId && a.entityRevision === b.entityRevision && a.entityFingerprint === b.entityFingerprint;

export class ContentGateReceiptRepository {
  constructor(private readonly store: ContentGateIssueStore, private readonly actor: { readonly actorId: string }) {}

  async issue(
    subject: ContentReceiptSubject,
    ids: ContentGateReceiptIds,
    reason: string,
    idempotencyKey: string,
  ): Promise<ContentGateReceiptBody> {
    return this.store.runTransaction(async (tx) => {
      const requestFingerprint = hashCanonicalBody({ action: "content_gate_issue", actorId: this.actor.actorId, subject, ids, reason });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) {
        if (replay.requestFingerprint !== requestFingerprint) throw new Error("idempotency_key_reused");
        return replay.body;
      }
      if (!validateContentReceiptSubject(subject).ok) throw new Error("content_gate_subject_invalid");
      const validation = await readEvidence(tx.receiptReader, collections.validation, ids.validationReceiptId);
      const localization = await readEvidence(tx.receiptReader, collections.localization, ids.localizationReceiptId);
      const review = await readEvidence(tx.receiptReader, collections.review, ids.reviewReceiptId);
      if (!sameSubject(validation.subject, subject) || !sameSubject(localization.subject, subject) || !sameSubject(review.subject, subject))
        throw new Error("content_gate_subject_mismatch");
      if (validation.status !== "passed" && validation.status !== "passed_with_waivers") throw new Error("content_gate_validation_status_invalid");
      if (localization.status !== "approved" || review.status !== "approved") throw new Error("content_gate_receipt_status_invalid");
      const body: ContentGateReceiptBody = {
        schemaVersion: "content-gate-receipt-body.v1",
        gateKind: "approval",
        subject,
        validationReceiptHash: validation.receiptHash,
        localizationReceiptSetHash: localization.receiptHash,
        reviewReceiptHash: review.receiptHash,
        waiverSetHash: "0".repeat(64),
        evaluatedBy: this.actor.actorId,
        evaluatedAt: new Date().toISOString(),
      };
      if (!validateContentGateReceiptBody(body).ok) throw new Error("content_gate_body_invalid");
      const gateId = `${subject.entityType}__${subject.entityId}__r${subject.entityRevision}__${subject.entityFingerprint}`;
      const objectPath = `content-studio/gates/${gateId}.json`;
      const object = tx.objectWriter
        ? await tx.objectWriter.write(objectPath, body)
        : { objectGeneration: "test-only", byteSize: new TextEncoder().encode(canonicalJsonV1(body)).byteLength, contentHash: hashCanonicalBody(body) };
      if (object.contentHash !== hashCanonicalBody(body) || object.byteSize < 1 || !object.objectGeneration) throw new Error("content_gate_object_binding_invalid");
      const record: ContentGateReceiptRecord = { schemaVersion: "content-gate-receipt-record.v1", gateReceiptId: gateId, receiptHash: hashCanonicalBody(body), object: { objectPath, contentHash: object.contentHash, objectGeneration: object.objectGeneration, byteSize: object.byteSize }, createdAt: new Date().toISOString() };
      await tx.writeGate(gateId, body, record);
      await tx.createOperation(idempotencyKey, { requestFingerprint, body });
      return body;
    });
  }
}
