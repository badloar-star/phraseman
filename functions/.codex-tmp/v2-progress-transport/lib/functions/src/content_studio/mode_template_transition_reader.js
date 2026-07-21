"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveModeTemplateApprovalGateFromFirestore = exports.resolveContentApprovalGateFromFirestore = void 0;
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const mode_template_transition_1 = require("./mode_template_transition");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const collections = {
    validation: "content_studio_validation_receipts",
    localization: "content_studio_localization_receipts",
    review: "content_studio_review_receipts",
    gate: "content_studio_gate_receipts",
};
const readEvidence = async (reader, collection, id) => {
    if (id.length === 0)
        return undefined;
    const value = await reader.get(collection, id);
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return undefined;
    const record = value;
    if (Object.keys(record).some((key) => !["receiptHash", "subject", "status", "reviewerId"].includes(key)) ||
        !["receiptHash", "subject", "status"].every((key) => Object.prototype.hasOwnProperty.call(record, key)) ||
        typeof record.receiptHash !== "string" ||
        !(0, validation_1.validateContentReceiptSubject)(record.subject).ok ||
        !["passed", "passed_with_waivers", "approved", "changes_requested"].includes(String(record.status)) ||
        (Object.prototype.hasOwnProperty.call(record, "reviewerId") && typeof record.reviewerId !== "string"))
        return undefined;
    return record;
};
/** Server-owned Firestore read seam; clients never supply receipt bodies directly. */
const resolveContentApprovalGateFromFirestore = async (reader, subject, ids) => {
    if (!(0, validation_1.validateContentReceiptSubject)(subject).ok || !["mode_template", "episode"].includes(subject.entityType))
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
        const envelope = gateDocument;
        const record = envelope.record;
        if (!record || record.schemaVersion !== "content-gate-receipt-record.v1" || record.receiptHash !== (0, decision_registry_1.hashCanonicalBody)(envelope.body) || !record.object || record.object.contentHash !== record.receiptHash)
            return { ok: false, reason: "mode_template_gate_record_invalid" };
        gateValue = envelope.body;
    }
    const gateResult = (0, validation_1.validateContentGateReceiptBody)(gateValue);
    if (!gateResult.ok)
        return { ok: false, reason: "mode_template_gate_body_invalid" };
    return (0, mode_template_transition_1.validateModeTemplateApprovalGate)({
        subject,
        validationReceipt,
        localizationReceipt,
        reviewReceipt,
        gateReceipt: gateResult.value,
    });
};
exports.resolveContentApprovalGateFromFirestore = resolveContentApprovalGateFromFirestore;
exports.resolveModeTemplateApprovalGateFromFirestore = exports.resolveContentApprovalGateFromFirestore;
