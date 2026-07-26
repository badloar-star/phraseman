import type { SeasonLifecycleHead, SeasonRevisionEnvelope } from "../../../modules/learning-v2/authoring/season_revision";
import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { applySeasonPinIndexProjection, buildApprovedSeasonPinIndexEntries, type SeasonPinIndexEntry, type SeasonPinIndexTransaction } from "./season_pin_index_repository";
import { issueSeasonApprovalReceipt, type SeasonApprovalReceipt } from "../../../modules/learning-v2/authoring/season_approval_receipt";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

export interface SeasonLifecycleTransitionStore {
  runTransaction<T>(work: (tx: SeasonLifecycleTransitionStore) => Promise<T>): Promise<T>;
  readLifecycle(seasonRevisionId: string): Promise<SeasonLifecycleHead | undefined>;
  compareAndSetLifecycle(seasonRevisionId: string, expectedRevision: number, next: SeasonLifecycleHead): Promise<void>;
  writePinIndex(seasonRevisionId: string, entries: readonly SeasonPinIndexEntry[]): Promise<void>;
  clearPinIndex(seasonRevisionId: string): Promise<void>;
  clearPinIndexForSeason(seasonId: string, keepSeasonRevisionId?: string): Promise<void>;
  writePinCleanupAudit(entry: { readonly auditId: string; readonly seasonId: string; readonly seasonRevisionId: string; readonly target: "approved" | "archived"; readonly actorId: string; readonly reason: string }): Promise<void>;
  writeApprovalReceipt(receipt: SeasonApprovalReceipt): Promise<void>;
  readOperation(operationId: string): Promise<{ readonly requestFingerprint: string; readonly lifecycle: SeasonLifecycleHead } | undefined>;
  createOperation(operationId: string, value: { readonly requestFingerprint: string; readonly lifecycle: SeasonLifecycleHead }): Promise<void>;
  readRevision(seasonRevisionId: string): Promise<SeasonRevisionEnvelope>;
}

export interface SeasonLifecycleOperationEnvelope {
  readonly requestFingerprint: string;
  readonly lifecycle: SeasonLifecycleHead;
}

export function validateSeasonLifecycleOperationEnvelope(value: unknown): value is SeasonLifecycleOperationEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 2 && typeof record.requestFingerprint === "string" && /^[a-f0-9]{64}$/.test(record.requestFingerprint) && !!record.lifecycle && typeof record.lifecycle === "object";
}

export class SeasonLifecycleTransitionRepository {
  constructor(private readonly store: SeasonLifecycleTransitionStore, private readonly actorId: string) {}

  async approve(seasonRevisionId: string, expectedLifecycleRevision: number, reason: string, idempotencyKey: string): Promise<SeasonLifecycleHead> {
    return this.transition(seasonRevisionId, expectedLifecycleRevision, "approved", reason, idempotencyKey);
  }

  async archive(seasonRevisionId: string, expectedLifecycleRevision: number, reason: string, idempotencyKey: string): Promise<SeasonLifecycleHead> {
    return this.transition(seasonRevisionId, expectedLifecycleRevision, "archived", reason, idempotencyKey);
  }

  private async transition(seasonRevisionId: string, expected: number, target: "approved" | "archived", reason: string, idempotencyKey: string): Promise<SeasonLifecycleHead> {
    if (reason.trim().length < 3 || !/^[A-Za-z0-9._:-]{8,160}$/.test(idempotencyKey)) throw new Error("season_lifecycle_invalid_operation");
    return this.store.runTransaction(async (tx) => {
      const requestFingerprint = hashCanonicalBody({ action: "season_lifecycle", seasonRevisionId, expectedLifecycleRevision: expected, target, reason, actorId: this.actorId });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) { if (replay.requestFingerprint !== requestFingerprint) throw new Error("idempotency_key_reused"); return replay.lifecycle; }
      const current = await tx.readLifecycle(seasonRevisionId);
      if (!current || current.lifecycleRevision !== expected) throw new Error("season_lifecycle_stale");
      if (target === "approved" && current.changedBy === this.actorId) throw new Error("season_maker_checker_self_review");
      const allowed = (current.status === "needs_review" && target === "approved") || (current.status === "approved" && target === "archived");
      if (!allowed) throw new Error("season_lifecycle_transition_invalid");
      const revision = current.lifecycleRevision + 1;
      const next: SeasonLifecycleHead = { ...current, status: target, changedBy: this.actorId, changedAt: new Date().toISOString(), lifecycleRevision: revision };
      const envelope = await tx.readRevision(seasonRevisionId);
      if (envelope.lifecycle.draftId !== current.draftId || envelope.lifecycle.seasonId !== current.seasonId || envelope.lifecycle.revision !== current.revision || envelope.lifecycle.revisionFingerprint !== current.revisionFingerprint || envelope.lifecycle.status !== current.status || envelope.lifecycle.lifecycleRevision !== current.lifecycleRevision) throw new Error("season_lifecycle_identity_mismatch");
      if (target === "approved") await tx.clearPinIndexForSeason(current.seasonId, seasonRevisionId);
      if (target === "archived") await tx.clearPinIndexForSeason(current.seasonId);
      await tx.writePinCleanupAudit({ auditId: idempotencyKey, seasonId: current.seasonId, seasonRevisionId, target, actorId: this.actorId, reason });
      if (target === "approved") {
        const receipt = issueSeasonApprovalReceipt({ seasonRevisionId, envelope, reviewerId: this.actorId, status: "approved", reason });
        await tx.writeApprovalReceipt(receipt);
      }
      await tx.compareAndSetLifecycle(seasonRevisionId, expected, next);
      const refs = (envelope.body as Record<string, unknown>).episodeRevisionRefs;
      const entries = target === "approved" && Array.isArray(refs)
        ? buildApprovedSeasonPinIndexEntries({ seasonRevisionId, seasonRevisionFingerprint: envelope.record.revisionFingerprint, status: target, episodeRevisionRefs: refs as ApprovedEpisodeRevision[], lifecycleRevision: revision })
        : [];
      if (target === "approved") {
        await tx.writePinIndex(seasonRevisionId, entries);
      }
      await tx.createOperation(idempotencyKey, { requestFingerprint, lifecycle: next });
      return next;
    });
  }
}

export function applySeasonPinIndexTransaction(tx: SeasonPinIndexTransaction, nextEntries: readonly SeasonPinIndexEntry[], previousPaths: readonly string[] = []): void {
  applySeasonPinIndexProjection({ transaction: tx, nextEntries, previousDocumentPaths: previousPaths });
}
