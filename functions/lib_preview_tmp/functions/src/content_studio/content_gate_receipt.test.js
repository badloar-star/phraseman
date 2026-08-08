"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const hash = "a".repeat(64);
const validSubject = {
    entityType: "mode_template",
    entityId: "template-1",
    entityRevision: 1,
    entityFingerprint: hash,
};
const validGate = {
    schemaVersion: "content-gate-receipt-body.v1",
    gateKind: "approval",
    subject: validSubject,
    validationReceiptHash: hash,
    localizationReceiptSetHash: hash,
    reviewReceiptHash: hash,
    waiverSetHash: hash,
    evaluatedBy: "publisher-1",
    evaluatedAt: "2026-07-16T00:00:00.000Z",
};
describe("shared Content Studio receipt contracts", () => {
    it("accepts an exact subject and gate body", () => {
        expect((0, validation_1.validateContentReceiptSubject)(validSubject).ok).toBe(true);
        expect((0, validation_1.validateContentGateReceiptBody)({
            ...validGate,
            devicePreviewReceiptHashes: { ios: hash, android: "b".repeat(64) },
        }).ok).toBe(true);
    });
    it.each([
        { entityType: "unknown" },
        { entityId: "" },
        { entityRevision: 0 },
        { entityFingerprint: "not-a-hash" },
        { extra: true },
    ])("rejects malformed receipt subject: %o", (patch) => {
        expect((0, validation_1.validateContentReceiptSubject)({ ...validSubject, ...patch }).ok).toBe(false);
    });
    it("rejects missing/extra gate fields and malformed preview hashes", () => {
        expect((0, validation_1.validateContentGateReceiptBody)({ ...validGate, reviewReceiptHash: undefined }).ok).toBe(false);
        expect((0, validation_1.validateContentGateReceiptBody)({ ...validGate, extra: true }).ok).toBe(false);
        expect((0, validation_1.validateContentGateReceiptBody)({
            ...validGate,
            devicePreviewReceiptHashes: { ios: hash, android: "bad" },
        }).ok).toBe(false);
    });
});
//# sourceMappingURL=content_gate_receipt.test.js.map