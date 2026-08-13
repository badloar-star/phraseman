import {
  createLearningV2ActivityReleasedSessionCompletionSpoolV1,
  LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_MAX_ENTRIES_V1,
} from "../modules/learning-v2/progress/activity_released_session_completion_spool_v1";
import type { ProgressAccountScope } from "../modules/learning-v2/progress/progress_store";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const scope = Object.freeze({
  stableId: "stable-1",
  accountScopeHash: h("account"),
  seasonId: "season-1",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  generation: 1,
}) satisfies ProgressAccountScope;

function completion(run: number) {
  const body = Object.freeze({
    schemaVersion: "learning-v2-activity-released-session-completion.v1",
    kind: "activity_released_session_completion",
    accountScopeHash: scope.accountScopeHash,
    accountGeneration: scope.generation,
    seasonId: scope.seasonId,
    studyTarget: scope.studyTarget,
    learnerSourceLocale: scope.learnerSourceLocale,
    releaseId: "release-1",
    activeManifestHash: h("active"),
    episodeId: "episode-1",
    stageId: "stage-1",
    activityPackageFingerprint: h("package"),
    packageFingerprint: h("session-package"),
    localSessionId: "lesson-1-understand-1",
    sessionRunId: `run-${run}`,
    sessionId: "session-1",
    sessionOrdinal: 1,
    taskCompletions: Object.freeze(
      Array.from({ length: 12 }, (_, index) =>
        Object.freeze({
          slot: index + 1,
          taskId: `task-${index + 1}`,
          activityId: `activity-${index + 1}`,
          family: "phrase_builder",
          purpose: index === 10 ? "interleaved_review" : "guided_practice",
          disposition: "completed",
          learnerAttempts: 1,
          hintUsed: false,
          localResultClaim: "locally_provisional_correct_before_completion",
        }),
      ),
    ),
    answerPayload: "absent",
    localFeedbackAuthority: "local_provisional_only",
    transportAuthority: "none_local_spool_candidate",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none_server_revalidation_required",
    releaseAuthority: false,
  });
  return Object.freeze({ ...body, completionFingerprint: h(body) });
}

function storage() {
  const rows = new Map<string, string>();
  return {
    rows,
    port: {
      getItem: async (key: string) => rows.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        rows.set(key, value);
      },
      removeItem: async (key: string) => {
        rows.delete(key);
      },
      getAllKeys: async () => [...rows.keys()],
    },
  };
}

describe("Learning V2 released completion spool", () => {
  test("persists exact replay, lists and removes account-scoped candidates", async () => {
    const memory = storage();
    const spool = createLearningV2ActivityReleasedSessionCompletionSpoolV1(
      memory.port,
      (candidate) => candidate.accountScopeHash === scope.accountScopeHash,
    );
    await spool.append(scope, completion(1));
    await spool.append(scope, completion(1));
    expect(await spool.list(scope)).toEqual([completion(1)]);
    expect(await spool.discoverAccountScopes(scope)).toEqual([scope]);
    const secondScope = Object.freeze({
      ...scope,
      seasonId: "season-2",
      studyTarget: "fr",
      learnerSourceLocale: "uk",
    });
    const secondCompletion = {
      ...completion(2),
      seasonId: secondScope.seasonId,
      studyTarget: secondScope.studyTarget,
      learnerSourceLocale: secondScope.learnerSourceLocale,
    };
    const { completionFingerprint: _ignored, ...secondBody } = secondCompletion;
    await spool.append(secondScope, {
      ...secondBody,
      completionFingerprint: h(secondBody),
    });
    expect(await spool.discoverAccountScopes(scope)).toEqual([
      scope,
      secondScope,
    ]);
    await spool.remove(scope, completion(1).completionFingerprint);
    expect(await spool.list(scope)).toEqual([]);
  });

  test("fails closed on scope drift, stored tamper and capacity", async () => {
    const memory = storage();
    const spool = createLearningV2ActivityReleasedSessionCompletionSpoolV1(
      memory.port,
      () => true,
    );
    await expect(
      spool.append({ ...scope, accountScopeHash: h("other") }, completion(1)),
    ).rejects.toThrow("activity_released_completion_spool_scope_mismatch");

    await spool.append(scope, completion(1));
    const entry = [...memory.rows.keys()].find(
      (key) => !key.endsWith(":index"),
    );
    expect(entry).toBeDefined();
    memory.rows.set(entry!, "{broken");
    await expect(spool.list(scope)).rejects.toThrow(
      "activity_released_completion_spool_corrupt",
    );

    const fresh = storage();
    const bounded = createLearningV2ActivityReleasedSessionCompletionSpoolV1(
      fresh.port,
      () => true,
    );
    for (
      let index = 1;
      index <= LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_MAX_ENTRIES_V1;
      index += 1
    )
      await bounded.append(scope, completion(index));
    await expect(
      bounded.append(
        scope,
        completion(
          LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_MAX_ENTRIES_V1 + 1,
        ),
      ),
    ).rejects.toThrow("activity_released_completion_spool_capacity");
  });
});
