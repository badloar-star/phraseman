import { hashCanonicalBody } from "../policies/decision_registry";
import type { SeasonLifecycleHead, SeasonRevisionEnvelope } from "./season_revision";

export interface SeasonApprovalReceipt {
  readonly schemaVersion: "season-approval-receipt.v1";
  readonly receiptId: string;
  readonly seasonRevisionId: string;
  readonly seasonRevisionFingerprint: string;
  readonly revision: number;
  readonly status: "approved" | "changes_requested";
  readonly reviewerId: string;
  readonly reason: string;
  readonly receiptHash: string;
}

export function issueSeasonApprovalReceipt(input: {
  readonly seasonRevisionId: string;
  readonly envelope: SeasonRevisionEnvelope;
  readonly reviewerId: string;
  readonly status: "approved" | "changes_requested";
  readonly reason: string;
}): SeasonApprovalReceipt {
  const lifecycle = input.envelope.lifecycle;
  if (input.reviewerId === lifecycle.changedBy) throw new Error("season_maker_checker_self_review");
  if (!input.reason.trim()) throw new Error("season_review_reason_required");
  const receiptId = `season-review__${input.seasonRevisionId}__r${input.envelope.record.revision}__${input.envelope.record.revisionFingerprint}__${input.reviewerId}`;
  const receiptHash = hashCanonicalBody({ schemaVersion: "season-approval-receipt.v1", receiptId, seasonRevisionId: input.seasonRevisionId, seasonRevisionFingerprint: input.envelope.record.revisionFingerprint, revision: input.envelope.record.revision, status: input.status, reviewerId: input.reviewerId, reason: input.reason.trim() });
  return { schemaVersion: "season-approval-receipt.v1", receiptId, seasonRevisionId: input.seasonRevisionId, seasonRevisionFingerprint: input.envelope.record.revisionFingerprint, revision: input.envelope.record.revision, status: input.status, reviewerId: input.reviewerId, reason: input.reason.trim(), receiptHash };
}

export function validateSeasonApprovalReceipt(value: unknown): value is SeasonApprovalReceipt {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const receipt = value as Record<string, unknown>;
  return Object.keys(receipt).length === 9 && receipt.schemaVersion === "season-approval-receipt.v1" && typeof receipt.receiptId === "string" && typeof receipt.seasonRevisionId === "string" && typeof receipt.seasonRevisionFingerprint === "string" && /^[a-f0-9]{64}$/.test(receipt.seasonRevisionFingerprint) && Number.isSafeInteger(receipt.revision) && Number(receipt.revision) >= 1 && ["approved", "changes_requested"].includes(String(receipt.status)) && typeof receipt.reviewerId === "string" && receipt.reviewerId.length > 0 && typeof receipt.reason === "string" && receipt.reason.length > 0 && typeof receipt.receiptHash === "string" && /^[a-f0-9]{64}$/.test(receipt.receiptHash);
}
