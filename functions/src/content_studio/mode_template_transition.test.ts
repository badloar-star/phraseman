import {
  validateModeTemplateApprovalGate,
  validateModeTemplateReplacementTarget,
} from "./mode_template_transition";
import type { ContentGateReceiptBody } from "../../../modules/learning-v2/contracts/content_studio";

const hash = "a".repeat(64);
const subject = {
  entityType: "mode_template" as const,
  entityId: "template-1",
  entityRevision: 1,
  entityFingerprint: hash,
};
const makeGate = (overrides: Partial<ContentGateReceiptBody> = {}): ContentGateReceiptBody => ({
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
    status: "passed" as const,
  },
  localizationReceipt: {
    receiptHash: "c".repeat(64),
    subject,
    status: "approved" as const,
  },
  reviewReceipt: {
    receiptHash: "d".repeat(64),
    subject,
    status: "approved" as const,
  },
  gateReceipt: makeGate(),
});

describe("ModeTemplate approval transition gate", () => {
  it("accepts fresh same-subject validation/localization/review/gate receipts", () => {
    expect(validateModeTemplateApprovalGate(validInput())).toEqual({ ok: true });
  });

  it("accepts the same fresh receipt contract for an Episode subject", () => {
    const episodeSubject = { ...subject, entityType: "episode" as const, entityId: "episode-1" };
    const input = validInput() as any;
    input.subject = episodeSubject;
    input.validationReceipt.subject = episodeSubject;
    input.localizationReceipt.subject = episodeSubject;
    input.reviewReceipt.subject = episodeSubject;
    input.gateReceipt = makeGate({ subject: episodeSubject });
    expect(validateModeTemplateApprovalGate(input)).toEqual({ ok: true });
  });

  it.each([
    "validationReceipt",
    "localizationReceipt",
    "reviewReceipt",
  ])("rejects a %s subject from another revision", (key) => {
    const input = validInput();
    (input[key as keyof typeof input] as { subject: typeof subject }).subject = {
      ...subject,
      entityFingerprint: "f".repeat(64),
    };
    expect(validateModeTemplateApprovalGate(input).ok).toBe(false);
  });

  it("rejects a gate whose pinned hash differs from its evidence", () => {
    const input = validInput();
    input.gateReceipt = makeGate({ validationReceiptHash: "f".repeat(64) });
    expect(validateModeTemplateApprovalGate(input)).toEqual({
      ok: false,
      reason: "mode_template_gate_hash_or_subject_mismatch",
    });
  });

  it("rejects incomplete or wrong-status evidence", () => {
    const input = validInput();
    (input.validationReceipt as { status: string }).status = "approved";
    expect(validateModeTemplateApprovalGate(input).ok).toBe(false);
    expect(
      validateModeTemplateApprovalGate({ ...input, extra: true }).ok,
    ).toBe(false);
  });

  it("requires a resolved published replacement and rejects self-reference", () => {
    const current = {
      templateId: "template-1",
      version: 1,
      contentHash: hash,
      status: "deprecated" as const,
    };
    expect(
      validateModeTemplateReplacementTarget(current, {
        templateId: "template-2",
        version: 1,
        contentHash: "b".repeat(64),
        status: "published",
      }),
    ).toEqual({ ok: true });
    expect(
      validateModeTemplateReplacementTarget(current, { ...current, status: "published" }),
    ).toEqual({ ok: false, reason: "mode_template_replacement_self_reference" });
    expect(
      validateModeTemplateReplacementTarget(current, {
        templateId: "template-2",
        version: 1,
        contentHash: "b".repeat(64),
        status: "archived",
      }),
    ).toEqual({ ok: false, reason: "mode_template_replacement_not_published" });
  });
});
