import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import type { ContentReceiptSubject } from "../../../modules/learning-v2/contracts/content_studio";
import { validateVoiceReleaseRequirementsShape } from "../../../modules/learning-v2/contracts/validation";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { resolveVoiceDependencies, type VoiceDependencyReader } from "./voice_dependency_resolver";

export interface EpisodeVoiceReceipt {
  readonly receiptHash: string;
  readonly subject: ContentReceiptSubject;
  readonly status: "approved";
}

export interface EpisodeVoiceStore {
  runTransaction<T>(work: (tx: EpisodeVoiceStore) => Promise<T>): Promise<T>;
  readArtifact(ref: ApprovedEpisodeRevision): Promise<{ readonly body: unknown } | undefined>;
  writeReceipt(receiptId: string, receipt: EpisodeVoiceReceipt): Promise<void>;
  readOperation(operationId: string): Promise<{ readonly requestFingerprint: string; readonly receipt: EpisodeVoiceReceipt } | undefined>;
  createOperation(operationId: string, value: { readonly requestFingerprint: string; readonly receipt: EpisodeVoiceReceipt }): Promise<void>;
}

export class EpisodeVoiceGovernanceRepository {
  constructor(private readonly store: EpisodeVoiceStore, private readonly actor: { readonly actorId: string }, private readonly dependencies?: { readonly reader: VoiceDependencyReader; readonly environment: string }) {}

  async approve(ref: ApprovedEpisodeRevision, reason: string, idempotencyKey: string): Promise<EpisodeVoiceReceipt> {
    return this.store.runTransaction(async (tx) => {
      const subject: ContentReceiptSubject = { entityType: "episode", entityId: ref.episodeId, entityRevision: ref.revision, entityFingerprint: ref.contentHash };
      const requestFingerprint = hashCanonicalBody({ action: "episode_voice_governance", actorId: this.actor.actorId, ref, reason });
      const replay = await tx.readOperation(idempotencyKey);
      if (replay) {
        if (replay.requestFingerprint !== requestFingerprint) throw new Error("idempotency_key_reused");
        return replay.receipt;
      }
      const artifact = await tx.readArtifact(ref);
      if (!artifact || typeof artifact.body !== "object" || artifact.body === null) throw new Error("episode_voice_artifact_missing");
      const governance = (artifact.body as Record<string, unknown>).voiceGovernance;
      if (!governance || typeof governance !== "object" || !Array.isArray((governance as Record<string, unknown>).requirementsByTemplate))
        throw new Error("episode_voice_governance_invalid");
      for (const entry of (governance as Record<string, unknown>).requirementsByTemplate as unknown[]) {
        if (!entry || typeof entry !== "object") throw new Error("episode_voice_governance_invalid");
        const requirement = (entry as Record<string, unknown>).requirements;
        const issue = validateVoiceReleaseRequirementsShape(requirement, "$.episode.voiceGovernance.requirementsByTemplate");
        if (issue) throw new Error(`episode_voice_governance_invalid:${issue.code}`);
        if (this.dependencies && typeof requirement === "object" && requirement !== null) {
          const value = requirement as Record<string, unknown>;
          if (value.processingMode !== "on_device_only") {
            await resolveVoiceDependencies(this.dependencies.reader, {
              calibration: value.calibrationReceiptRef as never,
              policy: value.voiceDataPolicyRef as never,
              egress: value.networkEgressRef as never,
              activePolicyRegistryKey: value.activePolicyRegistryKey as string,
              requiredNetworkPurposes: value.requiredNetworkPurposes as string[],
              environment: this.dependencies.environment,
            });
          }
        }
      }
      const receipt: EpisodeVoiceReceipt = { receiptHash: hashCanonicalBody({ subject, reason, voiceReviewerId: this.actor.actorId }), subject, status: "approved" };
      const receiptId = `voice__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__${idempotencyKey}`;
      await tx.writeReceipt(receiptId, receipt);
      await tx.createOperation(idempotencyKey, { requestFingerprint, receipt });
      return receipt;
    });
  }
}
