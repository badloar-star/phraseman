"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeasonLifecycleTransitionRepository = void 0;
exports.validateSeasonLifecycleOperationEnvelope = validateSeasonLifecycleOperationEnvelope;
exports.applySeasonPinIndexTransaction = applySeasonPinIndexTransaction;
const season_pin_index_repository_1 = require("./season_pin_index_repository");
const season_approval_receipt_1 = require("../../../modules/learning-v2/authoring/season_approval_receipt");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
function validateSeasonLifecycleOperationEnvelope(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const record = value;
    return Object.keys(record).length === 2 && typeof record.requestFingerprint === "string" && /^[a-f0-9]{64}$/.test(record.requestFingerprint) && !!record.lifecycle && typeof record.lifecycle === "object";
}
class SeasonLifecycleTransitionRepository {
    store;
    actorId;
    constructor(store, actorId) {
        this.store = store;
        this.actorId = actorId;
    }
    async approve(seasonRevisionId, expectedLifecycleRevision, reason, idempotencyKey) {
        return this.transition(seasonRevisionId, expectedLifecycleRevision, "approved", reason, idempotencyKey);
    }
    async archive(seasonRevisionId, expectedLifecycleRevision, reason, idempotencyKey) {
        return this.transition(seasonRevisionId, expectedLifecycleRevision, "archived", reason, idempotencyKey);
    }
    async transition(seasonRevisionId, expected, target, reason, idempotencyKey) {
        if (reason.trim().length < 3 || !/^[A-Za-z0-9._:-]{8,160}$/.test(idempotencyKey))
            throw new Error("season_lifecycle_invalid_operation");
        return this.store.runTransaction(async (tx) => {
            const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "season_lifecycle", seasonRevisionId, expectedLifecycleRevision: expected, target, reason, actorId: this.actorId });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== requestFingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.lifecycle;
            }
            const current = await tx.readLifecycle(seasonRevisionId);
            if (!current || current.lifecycleRevision !== expected)
                throw new Error("season_lifecycle_stale");
            if (target === "approved" && current.changedBy === this.actorId)
                throw new Error("season_maker_checker_self_review");
            const allowed = (current.status === "needs_review" && target === "approved") || (current.status === "approved" && target === "archived");
            if (!allowed)
                throw new Error("season_lifecycle_transition_invalid");
            const revision = current.lifecycleRevision + 1;
            const next = { ...current, status: target, changedBy: this.actorId, changedAt: new Date().toISOString(), lifecycleRevision: revision };
            const envelope = await tx.readRevision(seasonRevisionId);
            if (envelope.lifecycle.draftId !== current.draftId || envelope.lifecycle.seasonId !== current.seasonId || envelope.lifecycle.revision !== current.revision || envelope.lifecycle.revisionFingerprint !== current.revisionFingerprint || envelope.lifecycle.status !== current.status || envelope.lifecycle.lifecycleRevision !== current.lifecycleRevision)
                throw new Error("season_lifecycle_identity_mismatch");
            if (target === "approved")
                await tx.clearPinIndexForSeason(current.seasonId, seasonRevisionId);
            if (target === "archived")
                await tx.clearPinIndexForSeason(current.seasonId);
            await tx.writePinCleanupAudit({ auditId: idempotencyKey, seasonId: current.seasonId, seasonRevisionId, target, actorId: this.actorId, reason });
            if (target === "approved") {
                const receipt = (0, season_approval_receipt_1.issueSeasonApprovalReceipt)({ seasonRevisionId, envelope, reviewerId: this.actorId, status: "approved", reason });
                await tx.writeApprovalReceipt(receipt);
            }
            await tx.compareAndSetLifecycle(seasonRevisionId, expected, next);
            const refs = envelope.body.episodeRevisionRefs;
            const entries = target === "approved" && Array.isArray(refs)
                ? (0, season_pin_index_repository_1.buildApprovedSeasonPinIndexEntries)({ seasonRevisionId, seasonRevisionFingerprint: envelope.record.revisionFingerprint, status: target, episodeRevisionRefs: refs, lifecycleRevision: revision })
                : [];
            if (target === "approved") {
                await tx.writePinIndex(seasonRevisionId, entries);
            }
            await tx.createOperation(idempotencyKey, { requestFingerprint, lifecycle: next });
            return next;
        });
    }
}
exports.SeasonLifecycleTransitionRepository = SeasonLifecycleTransitionRepository;
function applySeasonPinIndexTransaction(tx, nextEntries, previousPaths = []) {
    (0, season_pin_index_repository_1.applySeasonPinIndexProjection)({ transaction: tx, nextEntries, previousDocumentPaths: previousPaths });
}
//# sourceMappingURL=season_lifecycle_transition_repository.js.map