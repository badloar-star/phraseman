"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodeLifecycleTransitionRepository = void 0;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const episode_revision_resolver_1 = require("./episode_revision_resolver");
const mode_template_transition_reader_1 = require("./mode_template_transition_reader");
const subjectFor = (ref) => ({ entityType: "episode", entityId: ref.episodeId, entityRevision: ref.revision, entityFingerprint: ref.contentHash });
class EpisodeLifecycleTransitionRepository {
    constructor(store, actor) {
        this.store = store;
        this.actor = actor;
    }
    async submit(ref, reason, idempotencyKey) {
        return this.store.runTransaction(async (tx) => {
            const fingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "episode_submit", actorId: this.actor.actorId, ref, reason });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== fingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.lifecycle;
            }
            if (await tx.readLifecycle(ref))
                throw new Error("episode_submit_already_initialized");
            const lifecycle = { schemaVersion: "episode-lifecycle.v1", draftId: ref.draftId, episodeId: ref.episodeId, revision: ref.revision, revisionFingerprint: ref.revisionFingerprint, status: "needs_review", changedBy: this.actor.actorId, changedAt: new Date().toISOString(), lifecycleRevision: 1 };
            if (!(0, episode_revision_resolver_1.validateEpisodeLifecycleHead)(lifecycle))
                throw new Error("episode_lifecycle_next_invalid");
            await tx.createLifecycle(ref, lifecycle);
            await tx.appendAudit({ ref, fromStatus: "needs_review", toStatus: "needs_review", actorId: this.actor.actorId, reason, lifecycleRevision: 1 });
            await tx.createOperation(idempotencyKey, { requestFingerprint: fingerprint, lifecycle });
            return lifecycle;
        });
    }
    async approve(ref, receiptIds, expectedLifecycleRevision, reason, idempotencyKey) {
        return this.transition(ref, "approved", receiptIds, expectedLifecycleRevision, reason, idempotencyKey);
    }
    async requestChanges(ref, expectedLifecycleRevision, reason, idempotencyKey) {
        if (!reason.trim())
            throw new Error("episode_changes_reason_required");
        return this.transition(ref, "changes_requested", undefined, expectedLifecycleRevision, reason, idempotencyKey);
    }
    async archive(ref, expectedLifecycleRevision, reason, idempotencyKey) {
        return this.transition(ref, "archived", undefined, expectedLifecycleRevision, reason, idempotencyKey);
    }
    async transition(ref, target, receiptIds, expected, reason, idempotencyKey) {
        return this.store.runTransaction(async (tx) => {
            const fingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "episode_lifecycle", target, actorId: this.actor.actorId, ref, receiptIds: receiptIds ?? null, expectedLifecycleRevision: expected, reason });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== fingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.lifecycle;
            }
            const current = await tx.readLifecycle(ref);
            if (!current || current.draftId !== ref.draftId || current.episodeId !== ref.episodeId || current.revision !== ref.revision || current.revisionFingerprint !== ref.revisionFingerprint)
                throw new Error("episode_lifecycle_missing_or_identity_mismatch");
            if (current.lifecycleRevision !== expected)
                throw new Error("episode_lifecycle_stale");
            const allowed = (current.status === "needs_review" && (target === "approved" || target === "changes_requested")) || (current.status === "changes_requested" && target === "needs_review") || (current.status === "approved" && target === "archived");
            if (!allowed)
                throw new Error("episode_lifecycle_transition_invalid");
            if (target === "approved") {
                if (!tx.receiptReader || !receiptIds)
                    throw new Error("episode_approval_receipt_reader_missing");
                const gate = await (0, mode_template_transition_reader_1.resolveContentApprovalGateFromFirestore)(tx.receiptReader, subjectFor(ref), receiptIds);
                if (!gate.ok)
                    throw new Error(gate.reason);
                if (!tx.readReviewActor)
                    throw new Error("episode_maker_checker_reader_missing");
                const reviewerId = await tx.readReviewActor(receiptIds.reviewReceiptId);
                if (!reviewerId || reviewerId === this.actor.actorId)
                    throw new Error("episode_maker_checker_self_review");
            }
            if (target === "archived" && await tx.hasActiveSeasonPin(ref))
                throw new Error("episode_archive_pinned");
            const next = { schemaVersion: "episode-lifecycle.v1", draftId: ref.draftId, episodeId: ref.episodeId, revision: ref.revision, revisionFingerprint: ref.revisionFingerprint, status: target, changedBy: this.actor.actorId, changedAt: new Date().toISOString(), lifecycleRevision: current.lifecycleRevision + 1 };
            if (!(0, episode_revision_resolver_1.validateEpisodeLifecycleHead)(next))
                throw new Error("episode_lifecycle_next_invalid");
            await tx.compareAndSetLifecycle(ref, expected, next);
            await tx.appendAudit({ ref, fromStatus: current.status, toStatus: target, actorId: this.actor.actorId, reason, lifecycleRevision: next.lifecycleRevision });
            await tx.createOperation(idempotencyKey, { requestFingerprint: fingerprint, lifecycle: next });
            return next;
        });
    }
}
exports.EpisodeLifecycleTransitionRepository = EpisodeLifecycleTransitionRepository;
