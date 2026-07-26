import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { validateEpisodeRevisionArtifactSemantics } from "./episode_revision_resolver";
import type { EpisodeValidationReceipt, EpisodeValidationStore } from "./episode_validation_repository";

export class EpisodeLocalizationRepository {
  constructor(private readonly store: EpisodeValidationStore, private readonly actor: { readonly actorId: string }) {}

  async approve(ref: ApprovedEpisodeRevision, reason: string, idempotencyKey: string): Promise<EpisodeValidationReceipt> {
    return this.store.runTransaction(async (tx) => {
      const subject = { entityType: "episode" as const, entityId: ref.episodeId, entityRevision: ref.revision, entityFingerprint: ref.contentHash };
      const requestFingerprint = hashCanonicalBody({ action: "episode_localization", actorId: this.actor.actorId, ref, reason });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) {
        if (replay.requestFingerprint !== requestFingerprint) throw new Error("idempotency_key_reused");
        return replay.receipt;
      }
      const artifact = await tx.readArtifact(ref);
      if (!artifact) throw new Error("episode_localization_artifact_missing");
      const result = validateEpisodeRevisionArtifactSemantics(artifact.body);
      if (!result.ok) throw new Error(`episode_localization_failed:${result.issues[0]?.code ?? "unknown"}`);
      const receipt: EpisodeValidationReceipt = { receiptHash: hashCanonicalBody({ subject, reason, localizerId: this.actor.actorId }), subject, status: "approved" };
      const receiptId = `localization__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__${idempotencyKey}`;
      await tx.writeReceipt(receiptId, receipt);
      await tx.createOperation(idempotencyKey, { requestFingerprint, receipt });
      return receipt;
    });
  }
}
