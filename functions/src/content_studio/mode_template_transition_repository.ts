import type { ModeTemplateLifecycleHead, PublishedModeTemplateRef } from "../../../modules/learning-v2/contracts/activity";
import type { ContentReceiptSubject } from "../../../modules/learning-v2/contracts/content_studio";
import { validateModeTemplateLifecycleHead } from "../../../modules/learning-v2/contracts/validation";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { validateModeTemplateReplacementTarget } from "./mode_template_transition";
import { resolveModeTemplateApprovalGateFromFirestore, type ModeTemplateReceiptDocumentReader, type ModeTemplateApprovalReceiptIds } from "./mode_template_transition_reader";

export interface ModeTemplateLifecycleStore {
  runTransaction<T>(work: (tx: ModeTemplateLifecycleStore) => Promise<T>): Promise<T>;
  readLifecycle(templateId: string, version: number): Promise<ModeTemplateLifecycleHead | undefined>;
  readTemplateVersion(templateId: string, version: number): Promise<PublishedModeTemplateRef | undefined>;
  hasUnsealedEpisodeDraftForTemplate(templateId: string, version: number, contentHash: string): Promise<boolean>;
  compareAndSetLifecycle(
    templateId: string,
    version: number,
    expectedLifecycleRevision: number,
    next: ModeTemplateLifecycleHead,
  ): Promise<void>;
  appendAudit(event: {
    readonly templateId: string;
    readonly version: number;
    readonly fromStatus: ModeTemplateLifecycleHead["status"];
    readonly toStatus: ModeTemplateLifecycleHead["status"];
    readonly actorId: string;
    readonly reason: string;
    readonly lifecycleRevision: number;
  }): Promise<void>;
  readOperation(operationId: string): Promise<{ readonly requestFingerprint: string; readonly lifecycle: ModeTemplateLifecycleHead } | undefined>;
  createOperation(operationId: string, value: { readonly requestFingerprint: string; readonly lifecycle: ModeTemplateLifecycleHead }): Promise<void>;
  readonly receiptReader?: ModeTemplateReceiptDocumentReader;
}

const subjectFor = (ref: PublishedModeTemplateRef): ContentReceiptSubject => ({
  entityType: "mode_template",
  entityId: ref.templateId,
  entityRevision: ref.version,
  entityFingerprint: ref.contentHash,
});

export class ModeTemplateLifecycleTransitionRepository {
  constructor(
    private readonly store: ModeTemplateLifecycleStore,
    private readonly actor: { readonly actorId: string },
  ) {}

  async publish(
    ref: PublishedModeTemplateRef,
    receiptIds: ModeTemplateApprovalReceiptIds,
    expectedLifecycleRevision: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<ModeTemplateLifecycleHead> {
    return this.store.runTransaction(async (tx) => {
      const requestFingerprint = hashCanonicalBody({ action: "publish", actorId: this.actor.actorId, ref, receiptIds, expectedLifecycleRevision, reason });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) {
        if (replay.requestFingerprint !== requestFingerprint) throw new Error("idempotency_key_reused");
        return replay.lifecycle;
      }
      const current = await tx.readLifecycle(ref.templateId, ref.version);
      if (!current || current.contentHash !== ref.contentHash)
        throw new Error("mode_template_lifecycle_missing_or_hash_mismatch");
      if (current.status !== "approved") throw new Error("mode_template_publish_status_invalid");
      if (current.lifecycleRevision !== expectedLifecycleRevision)
        throw new Error("mode_template_lifecycle_stale");
      if (!tx.receiptReader)
        throw new Error("mode_template_receipt_reader_missing");
      const gate = await resolveModeTemplateApprovalGateFromFirestore(
        tx.receiptReader,
        subjectFor(ref),
        receiptIds,
      );
      if (gate.ok === false) throw new Error(gate.reason);
      const next: ModeTemplateLifecycleHead = {
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
      if (!validateModeTemplateLifecycleHead(next).ok)
        throw new Error("mode_template_lifecycle_next_invalid");
      await tx.compareAndSetLifecycle(
        ref.templateId,
        ref.version,
        expectedLifecycleRevision,
        next,
      );
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

  async deprecate(
    ref: PublishedModeTemplateRef,
    expectedLifecycleRevision: number,
    reason: string,
    replacement: PublishedModeTemplateRef | undefined,
    idempotencyKey: string,
  ): Promise<ModeTemplateLifecycleHead> {
    return this.store.runTransaction(async (tx) => {
      const requestFingerprint = hashCanonicalBody({ action: "deprecate", actorId: this.actor.actorId, ref, expectedLifecycleRevision, reason, replacement });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) {
        if (replay.requestFingerprint !== requestFingerprint) throw new Error("idempotency_key_reused");
        return replay.lifecycle;
      }
      const current = await tx.readLifecycle(ref.templateId, ref.version);
      if (!current || current.contentHash !== ref.contentHash)
        throw new Error("mode_template_lifecycle_missing_or_hash_mismatch");
      if (current.status !== "published") throw new Error("mode_template_deprecate_status_invalid");
      if (current.lifecycleRevision !== expectedLifecycleRevision)
        throw new Error("mode_template_lifecycle_stale");
      const nextRef = replacement
        ? await tx.readTemplateVersion(replacement.templateId, replacement.version)
        : undefined;
      if (replacement) {
        const replacementLifecycle = await tx.readLifecycle(replacement.templateId, replacement.version);
        if (
          !nextRef ||
          nextRef.contentHash !== replacement.contentHash ||
          !replacementLifecycle ||
          replacementLifecycle.status !== "published" ||
          replacementLifecycle.contentHash !== replacement.contentHash
        )
          throw new Error("mode_template_replacement_unresolved");
        const check = validateModeTemplateReplacementTarget(
          { ...ref, status: "deprecated" },
          { ...replacement, status: "published" },
        );
        if (check.ok === false) throw new Error(check.reason);
      }
      const next: ModeTemplateLifecycleHead = {
        schemaVersion: "v2-mode-template-lifecycle.v1",
        templateId: ref.templateId,
        version: ref.version,
        contentHash: ref.contentHash,
        status: "deprecated",
        reason,
        ...(replacement ? { replacementRef: replacement } : { noReplacement: true as const }),
        changedBy: this.actor.actorId,
        changedAt: new Date().toISOString(),
        lifecycleRevision: current.lifecycleRevision + 1,
      };
      if (!validateModeTemplateLifecycleHead(next).ok)
        throw new Error("mode_template_lifecycle_next_invalid");
      await tx.compareAndSetLifecycle(
        ref.templateId,
        ref.version,
        expectedLifecycleRevision,
        next,
      );
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

  async archive(
    ref: PublishedModeTemplateRef,
    expectedLifecycleRevision: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<ModeTemplateLifecycleHead> {
    return this.store.runTransaction(async (tx) => {
      const requestFingerprint = hashCanonicalBody({ action: "archive", actorId: this.actor.actorId, ref, expectedLifecycleRevision, reason });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) {
        if (replay.requestFingerprint !== requestFingerprint) throw new Error("idempotency_key_reused");
        return replay.lifecycle;
      }
      const current = await tx.readLifecycle(ref.templateId, ref.version);
      if (!current || current.contentHash !== ref.contentHash)
        throw new Error("mode_template_lifecycle_missing_or_hash_mismatch");
      if (current.status !== "deprecated") throw new Error("mode_template_archive_status_invalid");
      if (current.lifecycleRevision !== expectedLifecycleRevision)
        throw new Error("mode_template_lifecycle_stale");
      if (await tx.hasUnsealedEpisodeDraftForTemplate(ref.templateId, ref.version, ref.contentHash))
        throw new Error("mode_template_archive_open_episode_draft");
      const next: ModeTemplateLifecycleHead = {
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
      if (!validateModeTemplateLifecycleHead(next).ok)
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
