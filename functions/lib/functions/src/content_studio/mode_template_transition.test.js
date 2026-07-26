"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mode_template_transition_1 = require("./mode_template_transition");
const hash = "a".repeat(64);
const subject = {
    entityType: "mode_template",
    entityId: "template-1",
    entityRevision: 1,
    entityFingerprint: hash,
};
const makeGate = (overrides = {}) => ({
    schemaVersion: "content-gate-receipt-body.v1",
    gateKind: "approval",
    subject,
    validationReceiptHash: "b".repeat(64),
    localizationReceiptSetHash: "c".repeat(64),
    reviewReceiptHash: "d".repeat(64),
    waiverSetHash: "e".repeat(64),
    evaluatedBy: "publisher-1",
    evaluatedAt: "2026-07-16T00:00:00.000Z",
    ...overrides,
});
const validInput = () => ({
    subject,
    validationReceipt: {
        receiptHash: "b".repeat(64),
        subject,
        status: "passed",
    },
    localizationReceipt: {
        receiptHash: "c".repeat(64),
        subject,
        status: "approved",
    },
    reviewReceipt: {
        receiptHash: "d".repeat(64),
        subject,
        status: "approved",
    },
    gateReceipt: makeGate(),
});
describe("ModeTemplate approval transition gate", () => {
    it("accepts fresh same-subject validation/localization/review/gate receipts", () => {
        expect((0, mode_template_transition_1.validateModeTemplateApprovalGate)(validInput())).toEqual({ ok: true });
    });
    it("accepts the same fresh receipt contract for an Episode subject", () => {
        const episodeSubject = { ...subject, entityType: "episode", entityId: "episode-1" };
        const input = validInput();
        input.subject = episodeSubject;
        input.validationReceipt.subject = episodeSubject;
        input.localizationReceipt.subject = episodeSubject;
        input.reviewReceipt.subject = episodeSubject;
        input.gateReceipt = makeGate({ subject: episodeSubject });
        expect((0, mode_template_transition_1.validateModeTemplateApprovalGate)(input)).toEqual({ ok: true });
    });
    it.each([
        "validationReceipt",
        "localizationReceipt",
        "reviewReceipt",
    ])("rejects a %s subject from another revision", (key) => {
        const input = validInput();
        input[key].subject = {
            ...subject,
            entityFingerprint: "f".repeat(64),
        };
        expect((0, mode_template_transition_1.validateModeTemplateApprovalGate)(input).ok).toBe(false);
    });
    it("rejects a gate whose pinned hash differs from its evidence", () => {
        const input = validInput();
        input.gateReceipt = makeGate({ validationReceiptHash: "f".repeat(64) });
        expect((0, mode_template_transition_1.validateModeTemplateApprovalGate)(input)).toEqual({
            ok: false,
            reason: "mode_template_gate_hash_or_subject_mismatch",
        });
    });
    it("rejects incomplete or wrong-status evidence", () => {
        const input = validInput();
        input.validationReceipt.status = "approved";
        expect((0, mode_template_transition_1.validateModeTemplateApprovalGate)(input).ok).toBe(false);
        expect((0, mode_template_transition_1.validateModeTemplateApprovalGate)({ ...input, extra: true }).ok).toBe(false);
    });
    it("requires a resolved published replacement and rejects self-reference", () => {
        const current = {
            templateId: "template-1",
            version: 1,
            contentHash: hash,
            status: "deprecated",
        };
        expect((0, mode_template_transition_1.validateModeTemplateReplacementTarget)(current, {
            templateId: "template-2",
            version: 1,
            contentHash: "b".repeat(64),
            status: "published",
        })).toEqual({ ok: true });
        expect((0, mode_template_transition_1.validateModeTemplateReplacementTarget)(current, { ...current, status: "published" })).toEqual({ ok: false, reason: "mode_template_replacement_self_reference" });
        expect((0, mode_template_transition_1.validateModeTemplateReplacementTarget)(current, {
            templateId: "template-2",
            version: 1,
            contentHash: "b".repeat(64),
            status: "archived",
        })).toEqual({ ok: false, reason: "mode_template_replacement_not_published" });
    });
});
//# sourceMappingURL=mode_template_transition.test.js.map