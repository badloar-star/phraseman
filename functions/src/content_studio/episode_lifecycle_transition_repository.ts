import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import type { ContentReceiptSubject } from "../../../modules/learning-v2/contracts/content_studio";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { validateEpisodeLifecycleHead, type EpisodeLifecycleHead } from "./episode_revision_resolver";
import { resolveContentApprovalGateFromFirestore, type ModeTemplateApprovalReceiptIds, type ModeTemplateReceiptDocumentReader } from "./mode_template_transition_reader";

export interface EpisodeLifecycleStore {
  runTransaction<T>(work: (tx: EpisodeLifecycleStore) => Promise<T>): Promise<T>;
  readLifecycle(ref: ApprovedEpisodeRevision): Promise<EpisodeLifecycleHead | undefined>;
  createLifecycle(ref: ApprovedEpisodeRevision, lifecycle: EpisodeLifecycleHead): Promise<void>;
  compareAndSetLifecycle(ref: ApprovedEpisodeRevision, expectedLifecycleRevision: number, next: EpisodeLifecycleHead): Promise<void>;
  appendAudit(event: { readonly ref: ApprovedEpisodeRevision; readonly fromStatus: EpisodeLifecycleHead["status"]; readonly toStatus: EpisodeLifecycleHead["status"]; readonly actorId: string; readonly reason: string; readonly lifecycleRevision: number }): Promise<void>;
  readOperation(operationId: string): Promise<{ readonly requestFingerprint: string; readonly lifecycle: EpisodeLifecycleHead } | undefined>;
  createOperation(operationId: string, value: { readonly requestFingerprint: string; readonly lifecycle: EpisodeLifecycleHead }): Promise<void>;
  hasActiveSeasonPin(ref: ApprovedEpisodeRevision): Promise<boolean>;
  readReviewActor?(receiptId: string): Promise<string | undefined>;
  readonly receiptReader?: ModeTemplateReceiptDocumentReader;
}

const subjectFor = (ref: ApprovedEpisodeRevision): ContentReceiptSubject => ({ entityType: "episode", entityId: ref.episodeId, entityRevision: ref.revision, entityFingerprint: ref.contentHash });

export class EpisodeLifecycleTransitionRepository {
  constructor(private readonly store: EpisodeLifecycleStore, private readonly actor: { readonly actorId: string }) {}

  async submit(ref: ApprovedEpisodeRevision, reason: string, idempotencyKey: string): Promise<EpisodeLifecycleHead> {
    return this.store.runTransaction(async (tx) => {
      const fingerprint = hashCanonicalBody({ action: "episode_submit", actorId: this.actor.actorId, ref, reason });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) { if (replay.requestFingerprint !== fingerprint) throw new Error("idempotency_key_reused"); return replay.lifecycle; }
      if (await tx.readLifecycle(ref)) throw new Error("episode_submit_already_initialized");
      const lifecycle: EpisodeLifecycleHead = { schemaVersion: "episode-lifecycle.v1", draftId: ref.draftId, episodeId: ref.episodeId, revision: ref.revision, revisionFingerprint: ref.revisionFingerprint, status: "needs_review", changedBy: this.actor.actorId, changedAt: new Date().toISOString(), lifecycleRevision: 1 };
      if (!validateEpisodeLifecycleHead(lifecycle)) throw new Error("episode_lifecycle_next_invalid");
      await tx.createLifecycle(ref, lifecycle);
      await tx.appendAudit({ ref, fromStatus: "needs_review", toStatus: "needs_review", actorId: this.actor.actorId, reason, lifecycleRevision: 1 });
      await tx.createOperation(idempotencyKey, { requestFingerprint: fingerprint, lifecycle });
      return lifecycle;
    });
  }

  async approve(ref: ApprovedEpisodeRevision, receiptIds: ModeTemplateApprovalReceiptIds, expectedLifecycleRevision: number, reason: string, idempotencyKey: string): Promise<EpisodeLifecycleHead> {
    return this.transition(ref, "approved", receiptIds, expectedLifecycleRevision, reason, idempotencyKey);
  }

  async requestChanges(ref: ApprovedEpisodeRevision, expectedLifecycleRevision: number, reason: string, idempotencyKey: string): Promise<EpisodeLifecycleHead> {
    if (!reason.trim()) throw new Error("episode_changes_reason_required");
    return this.transition(ref, "changes_requested", undefined, expectedLifecycleRevision, reason, idempotencyKey);
  }

  async archive(ref: ApprovedEpisodeRevision, expectedLifecycleRevision: number, reason: string, idempotencyKey: string): Promise<EpisodeLifecycleHead> {
    return this.transition(ref, "archived", undefined, expectedLifecycleRevision, reason, idempotencyKey);
  }

  private async transition(ref: ApprovedEpisodeRevision, target: EpisodeLifecycleHead["status"], receiptIds: ModeTemplateApprovalReceiptIds | undefined, expected: number, reason: string, idempotencyKey: string): Promise<EpisodeLifecycleHead> {
    return this.store.runTransaction(async (tx) => {
      const fingerprint = hashCanonicalBody({ action: "episode_lifecycle", target, actorId: this.actor.actorId, ref, receiptIds: receiptIds ?? null, expectedLifecycleRevision: expected, reason });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) { if (replay.requestFingerprint !== fingerprint) throw new Error("idempotency_key_reused"); return replay.lifecycle; }
      const current = await tx.readLifecycle(ref);
      if (!current || current.draftId !== ref.draftId || current.episodeId !== ref.episodeId || current.revision !== ref.revision || current.revisionFingerprint !== ref.revisionFingerprint) throw new Error("episode_lifecycle_missing_or_identity_mismatch");
      if (current.lifecycleRevision !== expected) throw new Error("episode_lifecycle_stale");
      const allowed = (current.status === "needs_review" && (target === "approved" || target === "changes_requested")) || (current.status === "changes_requested" && target === "needs_review") || (current.status === "approved" && target === "archived");
      if (!allowed) throw new Error("episode_lifecycle_transition_invalid");
      if (target === "approved") {
        if (!tx.receiptReader || !receiptIds) throw new Error("episode_approval_receipt_reader_missing");
        const gate = await resolveContentApprovalGateFromFirestore(tx.receiptReader, subjectFor(ref), receiptIds);
        if (!gate.ok) throw new Error(gate.reason);
        if (!tx.readReviewActor) throw new Error("episode_maker_checker_reader_missing");
        const reviewerId = await tx.readReviewActor(receiptIds.reviewReceiptId);
        if (!reviewerId || reviewerId === this.actor.actorId) throw new Error("episode_maker_checker_self_review");
      }
      if (target === "archived" && await tx.hasActiveSeasonPin(ref)) throw new Error("episode_archive_pinned");
      const next: EpisodeLifecycleHead = { schemaVersion: "episode-lifecycle.v1", draftId: ref.draftId, episodeId: ref.episodeId, revision: ref.revision, revisionFingerprint: ref.revisionFingerprint, status: target, changedBy: this.actor.actorId, changedAt: new Date().toISOString(), lifecycleRevision: current.lifecycleRevision + 1 };
      if (!validateEpisodeLifecycleHead(next)) throw new Error("episode_lifecycle_next_invalid");
      await tx.compareAndSetLifecycle(ref, expected, next);
      await tx.appendAudit({ ref, fromStatus: current.status, toStatus: target, actorId: this.actor.actorId, reason, lifecycleRevision: next.lifecycleRevision });
      await tx.createOperation(idempotencyKey, { requestFingerprint: fingerprint, lifecycle: next });
      return next;
    });
  }
}
