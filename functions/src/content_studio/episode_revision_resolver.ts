import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

export interface ImmutableEpisodeRevisionArtifact extends ApprovedEpisodeRevision {
  readonly body: unknown;
  readonly bodyHash: string;
  readonly objectGeneration: string;
}

export interface ImmutableEpisodeRevisionResolver {
  resolve(
    ref: ApprovedEpisodeRevision,
  ): Promise<ImmutableEpisodeRevisionArtifact | undefined>;
}

export async function assertExactImmutableEpisodeRevision(
  resolver: ImmutableEpisodeRevisionResolver,
  ref: ApprovedEpisodeRevision,
): Promise<ImmutableEpisodeRevisionArtifact> {
  const artifact = await resolver.resolve(ref);
  if (
    !artifact ||
    artifact.approvalStatus !== "approved" ||
    artifact.draftId !== ref.draftId ||
    artifact.episodeId !== ref.episodeId ||
    artifact.revision !== ref.revision ||
    artifact.revisionFingerprint !== ref.revisionFingerprint ||
    artifact.contentHash !== ref.contentHash ||
    artifact.ordinal !== ref.ordinal ||
    artifact.chapterId !== ref.chapterId ||
    artifact.bodyHash !== ref.contentHash ||
    hashCanonicalBody(artifact.body) !== ref.contentHash ||
    !artifact.objectGeneration
  )
    throw new Error("season_episode_revision_not_approved_or_stale");
  return artifact;
}
