"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mode_template_transition_reader_1 = require("./mode_template_transition_reader");
const hash = "a".repeat(64);
const subject = { entityType: "mode_template", entityId: "template-1", entityRevision: 1, entityFingerprint: hash };
const docs = {
    "content_studio_validation_receipts/validation-1": { receiptHash: "b".repeat(64), subject, status: "passed" },
    "content_studio_localization_receipts/localization-1": { receiptHash: "c".repeat(64), subject, status: "approved" },
    "content_studio_review_receipts/review-1": { receiptHash: "d".repeat(64), subject, status: "approved" },
    "content_studio_gate_receipts/gate-1": {
        schemaVersion: "content-gate-receipt-body.v1",
        gateKind: "approval",
        subject,
        validationReceiptHash: "b".repeat(64),
        localizationReceiptSetHash: "c".repeat(64),
        reviewReceiptHash: "d".repeat(64),
        waiverSetHash: "e".repeat(64),
        evaluatedBy: "publisher-1",
        evaluatedAt: "2026-07-16T00:00:00.000Z",
    },
};
const reader = {
    get: async (collection, id) => docs[`${collection}/${id}`],
};
const ids = {
    validationReceiptId: "validation-1",
    localizationReceiptId: "localization-1",
    reviewReceiptId: "review-1",
    gateReceiptId: "gate-1",
};
describe("server-owned ModeTemplate receipt reader", () => {
    it("loads all receipt documents and accepts an exact gate", async () => {
        await expect((0, mode_template_transition_reader_1.resolveModeTemplateApprovalGateFromFirestore)(reader, subject, ids)).resolves.toEqual({ ok: true });
    });
    it("fails closed when any receipt is missing", async () => {
        await expect((0, mode_template_transition_reader_1.resolveModeTemplateApprovalGateFromFirestore)(reader, subject, { ...ids, reviewReceiptId: "missing" })).resolves.toEqual({ ok: false, reason: "mode_template_gate_receipt_missing" });
    });
    it("rejects a stale receipt subject before publish", async () => {
        docs["content_studio_review_receipts/review-stale"] = {
            receiptHash: "d".repeat(64),
            subject: { ...subject, entityFingerprint: "f".repeat(64) },
            status: "approved",
        };
        await expect((0, mode_template_transition_reader_1.resolveModeTemplateApprovalGateFromFirestore)(reader, subject, { ...ids, reviewReceiptId: "review-stale" })).resolves.toEqual({ ok: false, reason: "mode_template_gate_subject_mismatch" });
    });
    it("rejects a forged gate hash", async () => {
        docs["content_studio_gate_receipts/gate-forged"] = {
            ...docs["content_studio_gate_receipts/gate-1"],
            validationReceiptHash: "f".repeat(64),
        };
        await expect((0, mode_template_transition_reader_1.resolveModeTemplateApprovalGateFromFirestore)(reader, subject, { ...ids, gateReceiptId: "gate-forged" })).resolves.toEqual({ ok: false, reason: "mode_template_gate_hash_or_subject_mismatch" });
    });
});
//# sourceMappingURL=mode_template_transition_reader.test.js.map