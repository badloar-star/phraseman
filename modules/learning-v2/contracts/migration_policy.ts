export type LearningV2LegacyMigrationStatus =
  | "not_checked"
  | "recognized"
  | "placement_offered"
  | "blocked";

export interface LearningV2InitialLegacyMigrationState {
  readonly schemaVersion: "learning-v2-legacy-migration-state.v1";
  readonly status: "not_checked";
}

export interface LegacyCourseRecognitionInput {
  /** Highest contiguous completed lesson in the 32-lesson legacy course. */
  readonly highestCompletedLesson: number;
}

export interface LegacyCourseRecognitionProjection {
  readonly status: "recognized" | "placement_offered";
  readonly highestCompletedLegacyLesson: number;
  readonly nextAction: "start_e1" | "offer_placement" | "offer_full_placement";
  readonly placementChapterCount: 0 | 1 | 2 | 3 | 4;
  readonly grantedV2PerformanceStars: 0;
  readonly grantedV2LearningEvidence: 0;
  readonly legacyValuesMustRemainUnchanged: true;
}

export const LEARNING_V2_LEGACY_MIGRATION_POLICY_V1 = Object.freeze({
  schemaVersion: "learning-v2-legacy-migration-policy.v1" as const,
  legacyNamespaceMode: "read_only" as const,
  dualRewardWriteAllowed: false as const,
  legacyCompletionCreatesV2PerformanceStars: false as const,
  legacyCompletionCreatesV2LearningEvidence: false as const,
  legacyCompletionCreatesV2CheckpointPass: false as const,
  legacyCompletionCreatesV2VoiceEvidence: false as const,
  sourceEconomyValuesMode: "preserve_raw_unchanged" as const,
  energyRemovalPhase: "p7_after_migration_and_regression_gate" as const,
});

export const createInitialLegacyMigrationState =
  (): LearningV2InitialLegacyMigrationState =>
    Object.freeze({
      schemaVersion: "learning-v2-legacy-migration-state.v1",
      status: "not_checked",
    });

export const projectLegacyCourseRecognition = (
  input: LegacyCourseRecognitionInput,
): LegacyCourseRecognitionProjection => {
  if (
    !Number.isSafeInteger(input.highestCompletedLesson) ||
    input.highestCompletedLesson < 0 ||
    input.highestCompletedLesson > 32
  ) {
    throw new Error("legacy_migration_progress_invalid");
  }

  const highestCompletedLegacyLesson = input.highestCompletedLesson;
  if (highestCompletedLegacyLesson === 32) {
    return Object.freeze({
      status: "placement_offered",
      highestCompletedLegacyLesson,
      nextAction: "offer_full_placement",
      placementChapterCount: 4,
      grantedV2PerformanceStars: 0,
      grantedV2LearningEvidence: 0,
      legacyValuesMustRemainUnchanged: true,
    });
  }
  if (highestCompletedLegacyLesson >= 28) {
    return Object.freeze({
      status: "placement_offered",
      highestCompletedLegacyLesson,
      nextAction: "offer_placement",
      placementChapterCount: 3,
      grantedV2PerformanceStars: 0,
      grantedV2LearningEvidence: 0,
      legacyValuesMustRemainUnchanged: true,
    });
  }
  if (highestCompletedLegacyLesson >= 18) {
    return Object.freeze({
      status: "placement_offered",
      highestCompletedLegacyLesson,
      nextAction: "offer_placement",
      placementChapterCount: 2,
      grantedV2PerformanceStars: 0,
      grantedV2LearningEvidence: 0,
      legacyValuesMustRemainUnchanged: true,
    });
  }
  if (highestCompletedLegacyLesson >= 8) {
    return Object.freeze({
      status: "placement_offered",
      highestCompletedLegacyLesson,
      nextAction: "offer_placement",
      placementChapterCount: 1,
      grantedV2PerformanceStars: 0,
      grantedV2LearningEvidence: 0,
      legacyValuesMustRemainUnchanged: true,
    });
  }
  return Object.freeze({
    status: "recognized",
    highestCompletedLegacyLesson,
    nextAction: "start_e1",
    placementChapterCount: 0,
    grantedV2PerformanceStars: 0,
    grantedV2LearningEvidence: 0,
    legacyValuesMustRemainUnchanged: true,
  });
};
