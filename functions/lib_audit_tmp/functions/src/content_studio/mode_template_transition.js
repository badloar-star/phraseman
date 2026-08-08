"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateModeTemplateReplacementTarget = exports.validateModeTemplateApprovalGate = void 0;
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const HASH = /^[a-f0-9]{64}$/;
const sameSubject = (left, right) => left.entityType === right.entityType &&
    left.entityId === right.entityId &&
    left.entityRevision === right.entityRevision &&
    left.entityFingerprint === right.entityFingerprint;
const validEvidence = (value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return false;
    const candidate = value;
    return (Object.keys(candidate).every((key) => ["receiptHash", "subject", "status", "reviewerId"].includes(key)) &&
        typeof candidate.receiptHash === "string" &&
        HASH.test(candidate.receiptHash) &&
        (0, validation_1.validateContentReceiptSubject)(candidate.subject).ok &&
        ["passed", "passed_with_waivers", "approved", "changes_requested"].includes(String(candidate.status)) &&
        (!Object.prototype.hasOwnProperty.call(candidate, "reviewerId") || typeof candidate.reviewerId === "string"));
};
/** Cross-checks the fresh receipts required before publishing one ModeTemplate version. */
const validateModeTemplateApprovalGate = (input) => {
    if (typeof input !== "object" || input === null || Array.isArray(input))
        return { ok: false, reason: "mode_template_gate_input_invalid" };
    const value = input;
    const required = [
        "subject",
        "validationReceipt",
        "localizationReceipt",
        "reviewReceipt",
        "gateReceipt",
    ];
    if (Object.keys(value).length !== required.length ||
        required.some((key) => !Object.prototype.hasOwnProperty.call(value, key)))
        return { ok: false, reason: "mode_template_gate_keys_invalid" };
    const subjectResult = (0, validation_1.validateContentReceiptSubject)(value.subject);
    if (!subjectResult.ok || !["mode_template", "episode"].includes(subjectResult.value.entityType))
        return { ok: false, reason: "content_gate_subject_invalid" };
    const evidence = [value.validationReceipt, value.localizationReceipt, value.reviewReceipt];
    if (evidence.some((item) => !validEvidence(item)))
        return { ok: false, reason: "mode_template_gate_receipt_invalid" };
    const validation = value.validationReceipt;
    const localization = value.localizationReceipt;
    const review = value.reviewReceipt;
    if (!sameSubject(validation.subject, subjectResult.value) ||
        !sameSubject(localization.subject, subjectResult.value) ||
        !sameSubject(review.subject, subjectResult.value))
        return { ok: false, reason: "mode_template_gate_subject_mismatch" };
    if (validation.status === "approved" || review.status === "passed")
        return { ok: false, reason: "mode_template_gate_status_invalid" };
    if (localization.status !== "approved" || review.status !== "approved")
        return { ok: false, reason: "mode_template_gate_status_invalid" };
    const gateResult = (0, validation_1.validateContentGateReceiptBody)(value.gateReceipt);
    if (!gateResult.ok)
        return { ok: false, reason: "mode_template_gate_body_invalid" };
    const gate = gateResult.value;
    if (gate.gateKind !== "approval" ||
        !sameSubject(gate.subject, subjectResult.value) ||
        gate.validationReceiptHash !== validation.receiptHash ||
        gate.localizationReceiptSetHash !== localization.receiptHash ||
        gate.reviewReceiptHash !== review.receiptHash)
        return { ok: false, reason: "mode_template_gate_hash_or_subject_mismatch" };
    return { ok: true };
};
exports.validateModeTemplateApprovalGate = validateModeTemplateApprovalGate;
/** Validates a deprecation replacement against the already resolved target. */
const validateModeTemplateReplacementTarget = (current, replacement) => {
    if (!HASH.test(current.contentHash) ||
        !HASH.test(replacement.contentHash) ||
        current.templateId.length === 0 ||
        replacement.templateId.length === 0 ||
        !Number.isSafeInteger(current.version) ||
        !Number.isSafeInteger(replacement.version) ||
        current.version < 1 ||
        replacement.version < 1)
        return { ok: false, reason: "mode_template_replacement_ref_invalid" };
    if (current.templateId === replacement.templateId &&
        current.version === replacement.version &&
        current.contentHash === replacement.contentHash)
        return { ok: false, reason: "mode_template_replacement_self_reference" };
    if (replacement.status !== "published")
        return { ok: false, reason: "mode_template_replacement_not_published" };
    return { ok: true };
};
exports.validateModeTemplateReplacementTarget = validateModeTemplateReplacementTarget;
//# sourceMappingURL=mode_template_transition.js.map