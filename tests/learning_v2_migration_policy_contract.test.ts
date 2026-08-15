import {
  LEARNING_V2_LEGACY_MIGRATION_POLICY_V1,
  createInitialLegacyMigrationState,
  projectLegacyCourseRecognition,
} from "../modules/learning-v2/contracts/migration_policy";

describe("Learning V2 conservative legacy migration policy", () => {
  it.each([
    [0, "start_e1", 0],
    [7, "start_e1", 0],
    [8, "offer_placement", 1],
    [17, "offer_placement", 1],
    [18, "offer_placement", 2],
    [27, "offer_placement", 2],
    [28, "offer_placement", 3],
    [31, "offer_placement", 3],
    [32, "offer_full_placement", 4],
  ] as const)(
    "maps legacy boundary %i without granting V2 mastery",
    (highestCompletedLesson, nextAction, placementChapterCount) => {
      expect(projectLegacyCourseRecognition({ highestCompletedLesson })).toEqual({
        status: highestCompletedLesson >= 8 ? "placement_offered" : "recognized",
        highestCompletedLegacyLesson: highestCompletedLesson,
        nextAction,
        placementChapterCount,
        grantedV2PerformanceStars: 0,
        grantedV2LearningEvidence: 0,
        legacyValuesMustRemainUnchanged: true,
      });
    },
  );

  it("fails closed outside the real 32-lesson legacy course", () => {
    expect(() =>
      projectLegacyCourseRecognition({ highestCompletedLesson: -1 }),
    ).toThrow("legacy_migration_progress_invalid");
    expect(() =>
      projectLegacyCourseRecognition({ highestCompletedLesson: 33 }),
    ).toThrow("legacy_migration_progress_invalid");
    expect(() =>
      projectLegacyCourseRecognition({ highestCompletedLesson: 1.5 }),
    ).toThrow("legacy_migration_progress_invalid");
  });

  it("starts unexamined and publishes immutable fail-closed invariants", () => {
    expect(createInitialLegacyMigrationState()).toEqual({
      schemaVersion: "learning-v2-legacy-migration-state.v1",
      status: "not_checked",
    });
    expect(LEARNING_V2_LEGACY_MIGRATION_POLICY_V1).toEqual({
      schemaVersion: "learning-v2-legacy-migration-policy.v1",
      legacyNamespaceMode: "read_only",
      dualRewardWriteAllowed: false,
      legacyCompletionCreatesV2PerformanceStars: false,
      legacyCompletionCreatesV2LearningEvidence: false,
      legacyCompletionCreatesV2CheckpointPass: false,
      legacyCompletionCreatesV2VoiceEvidence: false,
      sourceEconomyValuesMode: "preserve_raw_unchanged",
      energyRemovalPhase: "p7_after_migration_and_regression_gate",
    });
    expect(Object.isFrozen(LEARNING_V2_LEGACY_MIGRATION_POLICY_V1)).toBe(true);
  });
});
