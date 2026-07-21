"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueSeasonApprovalReceipt = issueSeasonApprovalReceipt;
exports.validateSeasonApprovalReceipt = validateSeasonApprovalReceipt;
const decision_registry_1 = require("../policies/decision_registry");
function issueSeasonApprovalReceipt(input) {
    const lifecycle = input.envelope.lifecycle;
    if (input.reviewerId === lifecycle.changedBy)
        throw new Error("season_maker_checker_self_review");
    if (!input.reason.trim())
        throw new Error("season_review_reason_required");
    const receiptId = `season-review__${input.seasonRevisionId}__r${input.envelope.record.revision}__${input.envelope.record.revisionFingerprint}__${input.reviewerId}`;
    const receiptHash = (0, decision_registry_1.hashCanonicalBody)({ schemaVersion: "season-approval-receipt.v1", receiptId, seasonRevisionId: input.seasonRevisionId, seasonRevisionFingerprint: input.envelope.record.revisionFingerprint, revision: input.envelope.record.revision, status: input.status, reviewerId: input.reviewerId, reason: input.reason.trim() });
    return { schemaVersion: "season-approval-receipt.v1", receiptId, seasonRevisionId: input.seasonRevisionId, seasonRevisionFingerprint: input.envelope.record.revisionFingerprint, revision: input.envelope.record.revision, status: input.status, reviewerId: input.reviewerId, reason: input.reason.trim(), receiptHash };
}
function validateSeasonApprovalReceipt(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return false;
    const receipt = value;
    return Object.keys(receipt).length === 9 && receipt.schemaVersion === "season-approval-receipt.v1" && typeof receipt.receiptId === "string" && typeof receipt.seasonRevisionId === "string" && typeof receipt.seasonRevisionFingerprint === "string" && /^[a-f0-9]{64}$/.test(receipt.seasonRevisionFingerprint) && Number.isSafeInteger(receipt.revision) && Number(receipt.revision) >= 1 && ["approved", "changes_requested"].includes(String(receipt.status)) && typeof receipt.reviewerId === "string" && receipt.reviewerId.length > 0 && typeof receipt.reason === "string" && receipt.reason.length > 0 && typeof receipt.receiptHash === "string" && /^[a-f0-9]{64}$/.test(receipt.receiptHash);
}
