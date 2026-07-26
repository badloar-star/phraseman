import {
  validateV2EpisodeContract,
  type V2ContractValidationResult,
  type V2ContractIssue,
} from "../../../modules/learning-v2/contracts/validation";
import type { V2EpisodeContract } from "../../../modules/learning-v2/contracts/episode";

type AuthoringEpisode = Record<string, unknown>;

const requiredProjectionKeys = [
  "episodeKind",
  "estimatedMinutes",
  "objectiveIds",
  "skillIds",
  "grammarDistinctionIds",
  "soundFocusIds",
  "assetIds",
  "accessibilityRoutes",
] as const;

/**
 * Converts the authoring-body envelope into the canonical Episode contract.
 * The conversion is deliberately loss-intolerant: fields that the canonical
 * validator needs must be explicitly present in the authoring body, rather
 * than being silently guessed or dropped.
 */
export const normalizeAuthoringEpisodeForSemantics = (
  input: unknown,
): V2ContractValidationResult<V2EpisodeContract> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return validateV2EpisodeContract(input);
  }
  const authoring = input as AuthoringEpisode;
  const missing = requiredProjectionKeys.filter(
    (key) => !Object.prototype.hasOwnProperty.call(authoring, key),
  );
  if (missing.length > 0) {
    const issues: V2ContractIssue[] = missing.map((key) => ({
      code: "authoring_semantic_projection_missing",
      path: `$.episode.${key}`,
      severity: "blocking",
      waivable: false,
    }));
    return {
      ok: false,
      issues,
    };
  }
  const canonical: Record<string, unknown> = {
    schemaVersion: "v2-episode-contract.v1",
    episodeId: authoring.episodeId,
    seasonId: authoring.seasonId,
    episodeKind: authoring.episodeKind,
    ordinal: authoring.ordinal,
    chapterId: authoring.chapterId,
    estimatedMinutes: authoring.estimatedMinutes,
    title: authoring.title,
    canDoOutcome: authoring.canDoOutcome,
    scenario: authoring.scenario,
    objectiveIds: authoring.objectiveIds,
    skillIds: authoring.skillIds,
    phraseFrames: authoring.phraseFrames,
    semanticSlots: authoring.semanticSlots,
    criticalConstraints: authoring.criticalConstraints,
    grammarDistinctionIds: authoring.grammarDistinctionIds,
    soundFocusIds: authoring.soundFocusIds,
    assetIds: authoring.assetIds,
    activities: authoring.activityInstances,
    graph: authoring.graph,
    starSlots: authoring.starSlots,
    requiredLoops: authoring.requiredLoops,
    assessmentNodes: authoring.assessmentNodes,
    capstoneContract: authoring.capstoneContract,
    learningDesign: authoring.learningDesign,
    masteryContract: authoring.masteryContract,
    delayedProbeDefinitions: authoring.delayedProbeDefinitions,
    reviewLinks: authoring.reviewLinks,
    accessibilityRoutes: authoring.accessibilityRoutes,
  };
  if (Object.prototype.hasOwnProperty.call(authoring, "checkpointContract"))
    canonical.checkpointContract = authoring.checkpointContract;
  return validateV2EpisodeContract(canonical);
};
