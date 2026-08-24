"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentGateReceiptRepository = void 0;
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const collections = {
    validation: "content_studio_validation_receipts",
    localization: "content_studio_localization_receipts",
    review: "content_studio_review_receipts",
};
const readEvidence = async (reader, collection, id) => {
    const value = await reader.get(collection, id);
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("content_gate_receipt_missing");
    const record = value;
    if (typeof record.receiptHash !== "string" || !(0, validation_1.validateContentReceiptSubject)(record.subject).ok || typeof record.status !== "string")
        throw new Error("content_gate_receipt_invalid");
    return { receiptHash: record.receiptHash, subject: record.subject, status: record.status };
};
const sameSubject = (a, b) => a.entityType === b.entityType && a.entityId === b.entityId && a.entityRevision === b.entityRevision && a.entityFingerprint === b.entityFingerprint;
class ContentGateReceiptRepository {
    store;
    actor;
    constructor(store, actor) {
        this.store = store;
        this.actor = actor;
    }
    async issue(subject, ids, reason, idempotencyKey) {
        return this.store.runTransaction(async (tx) => {
            const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "content_gate_issue", actorId: this.actor.actorId, subject, ids, reason });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== requestFingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.body;
            }
            if (!(0, validation_1.validateContentReceiptSubject)(subject).ok)
                throw new Error("content_gate_subject_invalid");
            const validation = await readEvidence(tx.receiptReader, collections.validation, ids.validationReceiptId);
            const localization = await readEvidence(tx.receiptReader, collections.localization, ids.localizationReceiptId);
            const review = await readEvidence(tx.receiptReader, collections.review, ids.reviewReceiptId);
            if (!sameSubject(validation.subject, subject) || !sameSubject(localization.subject, subject) || !sameSubject(review.subject, subject))
                throw new Error("content_gate_subject_mismatch");
            if (validation.status !== "passed" && validation.status !== "passed_with_waivers")
                throw new Error("content_gate_validation_status_invalid");
            if (localization.status !== "approved" || review.status !== "approved")
                throw new Error("content_gate_receipt_status_invalid");
            const body = {
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
            if (!(0, validation_1.validateContentGateReceiptBody)(body).ok)
                throw new Error("content_gate_body_invalid");
            const gateId = `${subject.entityType}__${subject.entityId}__r${subject.entityRevision}__${subject.entityFingerprint}`;
            const objectPath = `content-studio/gates/${gateId}.json`;
            const object = tx.objectWriter
                ? await tx.objectWriter.write(objectPath, body)
                : { objectGeneration: "test-only", byteSize: new TextEncoder().encode((0, decision_registry_1.canonicalJsonV1)(body)).byteLength, contentHash: (0, decision_registry_1.hashCanonicalBody)(body) };
            if (object.contentHash !== (0, decision_registry_1.hashCanonicalBody)(body) || object.byteSize < 1 || !object.objectGeneration)
                throw new Error("content_gate_object_binding_invalid");
            const record = { schemaVersion: "content-gate-receipt-record.v1", gateReceiptId: gateId, receiptHash: (0, decision_registry_1.hashCanonicalBody)(body), object: { objectPath, contentHash: object.contentHash, objectGeneration: object.objectGeneration, byteSize: object.byteSize }, createdAt: new Date().toISOString() };
            await tx.writeGate(gateId, body, record);
            await tx.createOperation(idempotencyKey, { requestFingerprint, body });
            return body;
        });
    }
}
exports.ContentGateReceiptRepository = ContentGateReceiptRepository;
//# sourceMappingURL=content_gate_repository.js.map