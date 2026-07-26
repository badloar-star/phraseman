import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import type { ContentReceiptSubject } from "../../../modules/learning-v2/contracts/content_studio";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { validateEpisodeRevisionArtifactSemantics } from "./episode_revision_resolver";

export interface EpisodeValidationReceipt {
  readonly receiptHash: string;
  readonly subject: ContentReceiptSubject;
  readonly status: "passed" | "approved";
}

export interface EpisodeValidationStore {
  runTransaction<T>(work: (tx: EpisodeValidationStore) => Promise<T>): Promise<T>;
  readArtifact(ref: ApprovedEpisodeRevision): Promise<{ readonly body: unknown } | undefined>;
  writeReceipt(receiptId: string, receipt: EpisodeValidationReceipt): Promise<void>;
  readOperation(operationId: string): Promise<{ readonly requestFingerprint: string; readonly receipt: EpisodeValidationReceipt } | undefined>;
  createOperation(operationId: string, value: { readonly requestFingerprint: string; readonly receipt: EpisodeValidationReceipt }): Promise<void>;
}

export class EpisodeValidationRepository {
  constructor(private readonly store: EpisodeValidationStore, private readonly actor: { readonly actorId: string }) {}

  async validate(ref: ApprovedEpisodeRevision, reason: string, idempotencyKey: string): Promise<EpisodeValidationReceipt> {
    return this.store.runTransaction(async (tx) => {
      const subject: ContentReceiptSubject = { entityType: "episode", entityId: ref.episodeId, entityRevision: ref.revision, entityFingerprint: ref.contentHash };
      const requestFingerprint = hashCanonicalBody({ action: "episode_validation", actorId: this.actor.actorId, ref, reason });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) {
        if (replay.requestFingerprint !== requestFingerprint) throw new Error("idempotency_key_reused");
        return replay.receipt;
      }
      const artifact = await tx.readArtifact(ref);
      if (!artifact) throw new Error("episode_validation_artifact_missing");
      const result = validateEpisodeRevisionArtifactSemantics(artifact.body);
      if (!result.ok) throw new Error(`episode_validation_failed:${result.issues[0]?.code ?? "unknown"}`);
      const receipt: EpisodeValidationReceipt = { receiptHash: hashCanonicalBody({ subject, reason, validatorId: this.actor.actorId }), subject, status: "passed" };
      const receiptId = `validation__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__${idempotencyKey}`;
      await tx.writeReceipt(receiptId, receipt);
      await tx.createOperation(idempotencyKey, { requestFingerprint, receipt });
      return receipt;
    });
  }
}
