"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeTemplateLifecycleTransitionRepository = void 0;
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const mode_template_transition_1 = require("./mode_template_transition");
const mode_template_transition_reader_1 = require("./mode_template_transition_reader");
const subjectFor = (ref) => ({
    entityType: "mode_template",
    entityId: ref.templateId,
    entityRevision: ref.version,
    entityFingerprint: ref.contentHash,
});
class ModeTemplateLifecycleTransitionRepository {
    constructor(store, actor) {
        this.store = store;
        this.actor = actor;
    }
    async publish(ref, receiptIds, expectedLifecycleRevision, reason, idempotencyKey) {
        return this.store.runTransaction(async (tx) => {
            const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "publish", actorId: this.actor.actorId, ref, receiptIds, expectedLifecycleRevision, reason });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== requestFingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.lifecycle;
            }
            const current = await tx.readLifecycle(ref.templateId, ref.version);
            if (!current || current.contentHash !== ref.contentHash)
                throw new Error("mode_template_lifecycle_missing_or_hash_mismatch");
            if (current.status !== "approved")
                throw new Error("mode_template_publish_status_invalid");
            if (current.lifecycleRevision !== expectedLifecycleRevision)
                throw new Error("mode_template_lifecycle_stale");
            if (!tx.receiptReader)
                throw new Error("mode_template_receipt_reader_missing");
            const gate = await (0, mode_template_transition_reader_1.resolveModeTemplateApprovalGateFromFirestore)(tx.receiptReader, subjectFor(ref), receiptIds);
            if (gate.ok === false)
                throw new Error(gate.reason);
            const next = {
                schemaVersion: "v2-mode-template-lifecycle.v1",
                templateId: ref.templateId,
                version: ref.version,
                contentHash: ref.contentHash,
                status: "published",
                reason,
                changedBy: this.actor.actorId,
                changedAt: new Date().toISOString(),
                lifecycleRevision: current.lifecycleRevision + 1,
            };
            if (!(0, validation_1.validateModeTemplateLifecycleHead)(next).ok)
                throw new Error("mode_template_lifecycle_next_invalid");
            await tx.compareAndSetLifecycle(ref.templateId, ref.version, expectedLifecycleRevision, next);
            await tx.appendAudit({
                templateId: ref.templateId,
                version: ref.version,
                fromStatus: current.status,
                toStatus: next.status,
                actorId: this.actor.actorId,
                reason,
                lifecycleRevision: next.lifecycleRevision,
            });
            await tx.createOperation(idempotencyKey, { requestFingerprint, lifecycle: next });
            return next;
        });
    }
    async deprecate(ref, expectedLifecycleRevision, reason, replacement, idempotencyKey) {
        return this.store.runTransaction(async (tx) => {
            const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "deprecate", actorId: this.actor.actorId, ref, expectedLifecycleRevision, reason, replacement });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== requestFingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.lifecycle;
            }
            const current = await tx.readLifecycle(ref.templateId, ref.version);
            if (!current || current.contentHash !== ref.contentHash)
                throw new Error("mode_template_lifecycle_missing_or_hash_mismatch");
            if (current.status !== "published")
                throw new Error("mode_template_deprecate_status_invalid");
            if (current.lifecycleRevision !== expectedLifecycleRevision)
                throw new Error("mode_template_lifecycle_stale");
            const nextRef = replacement
                ? await tx.readTemplateVersion(replacement.templateId, replacement.version)
                : undefined;
            if (replacement) {
                const replacementLifecycle = await tx.readLifecycle(replacement.templateId, replacement.version);
                if (!nextRef ||
                    nextRef.contentHash !== replacement.contentHash ||
                    !replacementLifecycle ||
                    replacementLifecycle.status !== "published" ||
                    replacementLifecycle.contentHash !== replacement.contentHash)
                    throw new Error("mode_template_replacement_unresolved");
                const check = (0, mode_template_transition_1.validateModeTemplateReplacementTarget)({ ...ref, status: "deprecated" }, { ...replacement, status: "published" });
                if (check.ok === false)
                    throw new Error(check.reason);
            }
            const next = {
                schemaVersion: "v2-mode-template-lifecycle.v1",
                templateId: ref.templateId,
                version: ref.version,
                contentHash: ref.contentHash,
                status: "deprecated",
                reason,
                ...(replacement ? { replacementRef: replacement } : { noReplacement: true }),
                changedBy: this.actor.actorId,
                changedAt: new Date().toISOString(),
                lifecycleRevision: current.lifecycleRevision + 1,
            };
            if (!(0, validation_1.validateModeTemplateLifecycleHead)(next).ok)
                throw new Error("mode_template_lifecycle_next_invalid");
            await tx.compareAndSetLifecycle(ref.templateId, ref.version, expectedLifecycleRevision, next);
            await tx.appendAudit({
                templateId: ref.templateId,
                version: ref.version,
                fromStatus: current.status,
                toStatus: next.status,
                actorId: this.actor.actorId,
                reason,
                lifecycleRevision: next.lifecycleRevision,
            });
            await tx.createOperation(idempotencyKey, { requestFingerprint, lifecycle: next });
            return next;
        });
    }
    async archive(ref, expectedLifecycleRevision, reason, idempotencyKey) {
        return this.store.runTransaction(async (tx) => {
            const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "archive", actorId: this.actor.actorId, ref, expectedLifecycleRevision, reason });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== requestFingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.lifecycle;
            }
            const current = await tx.readLifecycle(ref.templateId, ref.version);
            if (!current || current.contentHash !== ref.contentHash)
                throw new Error("mode_template_lifecycle_missing_or_hash_mismatch");
            if (current.status !== "deprecated")
                throw new Error("mode_template_archive_status_invalid");
            if (current.lifecycleRevision !== expectedLifecycleRevision)
                throw new Error("mode_template_lifecycle_stale");
            if (await tx.hasUnsealedEpisodeDraftForTemplate(ref.templateId, ref.version, ref.contentHash))
                throw new Error("mode_template_archive_open_episode_draft");
            const next = {
                schemaVersion: "v2-mode-template-lifecycle.v1",
                templateId: ref.templateId,
                version: ref.version,
                contentHash: ref.contentHash,
                status: "archived",
                reason,
                changedBy: this.actor.actorId,
                changedAt: new Date().toISOString(),
                lifecycleRevision: current.lifecycleRevision + 1,
            };
            if (!(0, validation_1.validateModeTemplateLifecycleHead)(next).ok)
                throw new Error("mode_template_lifecycle_next_invalid");
            await tx.compareAndSetLifecycle(ref.templateId, ref.version, expectedLifecycleRevision, next);
            await tx.appendAudit({
                templateId: ref.templateId,
                version: ref.version,
                fromStatus: current.status,
                toStatus: next.status,
                actorId: this.actor.actorId,
                reason,
                lifecycleRevision: next.lifecycleRevision,
            });
            await tx.createOperation(idempotencyKey, { requestFingerprint, lifecycle: next });
            return next;
        });
    }
}
exports.ModeTemplateLifecycleTransitionRepository = ModeTemplateLifecycleTransitionRepository;
