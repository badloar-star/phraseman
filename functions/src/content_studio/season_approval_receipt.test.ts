import { issueSeasonApprovalReceipt, validateSeasonApprovalReceipt } from "../../../modules/learning-v2/authoring/season_approval_receipt";
import type { SeasonRevisionEnvelope } from "../../../modules/learning-v2/authoring/season_revision";

const envelope = { body: { schemaVersion: "season-authoring-body.v1" }, record: { schemaVersion: "season-authoring-record.v1", draftId: "d", seasonId: "s", revision: 1, contentHash: "a".repeat(64), revisionFingerprint: "b".repeat(64), object: { objectPath: "p", contentHash: "a".repeat(64), objectGeneration: "1", byteSize: 1 }, provenance: {}, createdAt: "2026-07-17T00:00:00.000Z" }, lifecycle: { schemaVersion: "season-lifecycle.v1", draftId: "d", seasonId: "s", revision: 1, revisionFingerprint: "b".repeat(64), status: "needs_review", changedBy: "author", changedAt: "2026-07-17T00:00:00.000Z", lifecycleRevision: 1 } } as SeasonRevisionEnvelope;

describe("Season approval receipt", () => {
  it("issues and validates a reviewer-bound receipt", () => {
    const receipt = issueSeasonApprovalReceipt({ seasonRevisionId: "season-1__r1", envelope, reviewerId: "reviewer", status: "approved", reason: "checked" });
    expect(validateSeasonApprovalReceipt(receipt)).toBe(true);
  });
  it("enforces maker-checker", () => expect(() => issueSeasonApprovalReceipt({ seasonRevisionId: "season-1__r1", envelope, reviewerId: "author", status: "approved", reason: "checked" })).toThrow("season_maker_checker_self_review"));
  it("rejects tampered receipt keys/hash shape", () => {
    const receipt = issueSeasonApprovalReceipt({ seasonRevisionId: "season-1__r1", envelope, reviewerId: "reviewer", status: "approved", reason: "checked" });
    expect(validateSeasonApprovalReceipt({ ...receipt, extra: true })).toBe(false);
  });
});
