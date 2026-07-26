import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { validateEpisodeRevisionArtifactSemantics } from "./episode_revision_resolver";

export interface EpisodeReviewReceipt {
  readonly receiptHash: string;
  readonly subject: {
    readonly entityType: "episode";
    readonly entityId: string;
    readonly entityRevision: number;
    readonly entityFingerprint: string;
  };
  readonly status: "approved" | "changes_requested";
  readonly reviewerId: string;
}

export interface EpisodeReviewStore {
  runTransaction<T>(work: (tx: EpisodeReviewStore) => Promise<T>): Promise<T>;
  readArtifact(ref: ApprovedEpisodeRevision): Promise<{ readonly body: unknown } | undefined>;
  readReceipt(receiptId: string): Promise<EpisodeReviewReceipt | undefined>;
  writeReceipt(receiptId: string, receipt: EpisodeReviewReceipt): Promise<void>;
  readOperation(operationId: string): Promise<{ readonly requestFingerprint: string; readonly receipt: EpisodeReviewReceipt } | undefined>;
  createOperation(operationId: string, value: { readonly requestFingerprint: string; readonly receipt: EpisodeReviewReceipt }): Promise<void>;
}

const subjectFor = (ref: ApprovedEpisodeRevision): EpisodeReviewReceipt["subject"] => ({
  entityType: "episode",
  entityId: ref.episodeId,
  entityRevision: ref.revision,
  entityFingerprint: ref.contentHash,
});

export class EpisodeReviewRepository {
  constructor(
    private readonly store: EpisodeReviewStore,
    private readonly actor: { readonly actorId: string },
  ) {}

  async review(
    ref: ApprovedEpisodeRevision,
    status: EpisodeReviewReceipt["status"],
    reason: string,
    idempotencyKey: string,
  ): Promise<EpisodeReviewReceipt> {
    return this.store.runTransaction(async (tx) => {
      const requestFingerprint = hashCanonicalBody({ action: "episode_review", actorId: this.actor.actorId, ref, status, reason });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) {
        if (replay.requestFingerprint !== requestFingerprint) throw new Error("idempotency_key_reused");
        return replay.receipt;
      }
      const artifact = await tx.readArtifact(ref);
      if (!artifact) throw new Error("episode_review_artifact_missing");
      const semantic = validateEpisodeRevisionArtifactSemantics(artifact.body);
      if (!semantic.ok) throw new Error(`episode_review_semantics_invalid:${semantic.issues[0]?.code ?? "unknown"}`);
      const subject = subjectFor(ref);
      const receipt: EpisodeReviewReceipt = {
        receiptHash: hashCanonicalBody({ subject, status, reason, reviewerId: this.actor.actorId }),
        subject,
        status,
        reviewerId: this.actor.actorId,
      };
      const receiptId = `review__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__${idempotencyKey}`;
      await tx.writeReceipt(receiptId, receipt);
      await tx.createOperation(idempotencyKey, { requestFingerprint, receipt });
      return receipt;
    });
  }
}
