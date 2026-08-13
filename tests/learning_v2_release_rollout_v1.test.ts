import {
  learningV2ReleaseCohortIdV1,
  resolveLearningV2ReleaseRolloutV1,
} from "../modules/learning-v2/content/release_rollout_v1";

const pointer = (overrides: Record<string, unknown> = {}) =>
  ({
    rollout: {
      revision: 1,
      state: "rolling_out",
      percent: 10,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
      ...overrides,
    },
  }) as never;

describe("Learning V2 release rollout", () => {
  test("is sticky by canonical stable account and salt version", () => {
    const first = resolveLearningV2ReleaseRolloutV1({
      pointer: pointer(),
      stableAccountId: "stable-1",
    });
    const second = resolveLearningV2ReleaseRolloutV1({
      pointer: pointer(),
      stableAccountId: "stable-1",
    });
    expect(first).toEqual(second);
    expect(first.bucket).toBeGreaterThanOrEqual(0);
    expect(first.bucket).toBeLessThan(100);
    expect(learningV2ReleaseCohortIdV1("stable-1", 2)).not.toBe(first.cohortId);
  });

  test("gives exclude priority and keeps internal/paused fail closed", () => {
    const cohortId = learningV2ReleaseCohortIdV1("stable-1", 1);
    expect(
      resolveLearningV2ReleaseRolloutV1({
        pointer: pointer({
          percent: 100,
          allowlistCohortIds: [cohortId],
          excludeCohortIds: [cohortId],
        }),
        stableAccountId: "stable-1",
      }),
    ).toMatchObject({ eligible: false, reason: "excluded" });
    expect(
      resolveLearningV2ReleaseRolloutV1({
        pointer: pointer({ state: "paused", percent: 100 }),
        stableAccountId: "stable-1",
      }),
    ).toMatchObject({ eligible: false, effectivePercent: 0 });
    expect(
      resolveLearningV2ReleaseRolloutV1({
        pointer: pointer({ state: "internal", allowlistCohortIds: [cohortId] }),
        stableAccountId: "stable-1",
      }),
    ).toMatchObject({ eligible: true, reason: "internal_allowlist" });
  });

  test("uses exact percentage buckets and rejects malformed cohort ids", () => {
    expect(
      resolveLearningV2ReleaseRolloutV1({
        pointer: pointer({ percent: 100 }),
        stableAccountId: "stable-1",
      }),
    ).toMatchObject({ eligible: true, reason: "percentage" });
    expect(() =>
      resolveLearningV2ReleaseRolloutV1({
        pointer: pointer({ allowlistCohortIds: ["stable-1"] }),
        stableAccountId: "stable-1",
      }),
    ).toThrow("learning_v2_release_rollout_invalid");
  });
});
