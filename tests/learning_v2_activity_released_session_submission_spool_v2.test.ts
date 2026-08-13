import {
  createLearningV2ActivityReleasedSessionSubmissionSpoolV2,
  LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_MAX_ENTRIES_V2,
} from "../modules/learning-v2/progress/activity_released_session_submission_spool_v2";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import type { ProgressAccountScope } from "../modules/learning-v2/progress/progress_store";

const h = (value: unknown) => hashCanonicalBody(value);
const scope = Object.freeze({
  stableId: "stable-1",
  accountScopeHash: h("account"),
  seasonId: "season-1",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  generation: 1,
}) satisfies ProgressAccountScope;

function submission(run: number) {
  const completionBody = Object.freeze({
    schemaVersion: "learning-v2-activity-released-session-completion.v1",
    kind: "activity_released_session_completion",
    accountScopeHash: scope.accountScopeHash,
    accountGeneration: scope.generation,
    seasonId: scope.seasonId,
    studyTarget: scope.studyTarget,
    learnerSourceLocale: scope.learnerSourceLocale,
    releaseId: "release-1",
    activeManifestHash: h("manifest"),
    episodeId: "episode-1",
    stageId: "stage-1",
    activityPackageFingerprint: h("activity-package"),
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
  const completion = Object.freeze({
    ...completionBody,
    completionFingerprint: h(completionBody),
  });
  const body = Object.freeze({
    schemaVersion: "learning-v2-activity-released-session-submission.v2",
    kind: "activity_released_session_submission",
    completion,
    completionFingerprint: completion.completionFingerprint,
    accountScopeHash: completion.accountScopeHash,
    accountGeneration: completion.accountGeneration,
    releaseId: completion.releaseId,
    activeManifestHash: completion.activeManifestHash,
    episodeId: completion.episodeId,
    stageId: completion.stageId,
    activityPackageFingerprint: completion.activityPackageFingerprint,
    packageFingerprint: completion.packageFingerprint,
    sessionId: completion.sessionId,
    sessionOrdinal: completion.sessionOrdinal,
    sessionRunId: completion.sessionRunId,
    taskAnswers: Object.freeze(
      completion.taskCompletions.map((task) =>
        Object.freeze({
          slot: task.slot,
          taskId: task.taskId,
          activityId: task.activityId,
          family: task.family,
          inputKind: "text",
          disposition: task.disposition,
          attempts: Object.freeze([
            Object.freeze({ attemptOrdinal: 1, kind: "text", value: "right" }),
          ]),
        }),
      ),
    ),
    answerTransport: "bounded_post_session_batch_only",
    rawAudioPayload: "forbidden",
    transcriptClaimAuthority: "untrusted_client_text_claim_only",
    answerSequenceAuthority: "untrusted_client_sequence_only",
    localFeedbackAuthority: "local_provisional_only",
    performanceAuthority: "none_server_evaluation_required",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none_server_evaluation_required",
    releaseAuthority: false,
  });
  return Object.freeze({ ...body, submissionFingerprint: h(body) });
}

function memoryStorage() {
  const rows = new Map<string, string>();
  return {
    rows,
    port: {
      getItem: async (key: string) => rows.get(key) ?? null,
      setItem: async (key: string, value: string) => void rows.set(key, value),
      removeItem: async (key: string) => void rows.delete(key),
      getAllKeys: async () => [...rows.keys()],
    },
  };
}

describe("Learning V2 released submission spool", () => {
  it("stores completion and all answers atomically with replay and removal", async () => {
    const memory = memoryStorage();
    const spool = createLearningV2ActivityReleasedSessionSubmissionSpoolV2(
      memory.port,
      () => true,
    );
    await spool.append(scope, submission(1));
    await spool.append(scope, submission(1));
    expect(await spool.list(scope)).toEqual([submission(1)]);
    expect(await spool.discoverAccountScopes(scope)).toEqual([scope]);
    await spool.remove(scope, submission(1).submissionFingerprint);
    expect(await spool.list(scope)).toEqual([]);
  });

  it("fails closed on scope drift, stored tamper and bounded capacity", async () => {
    const memory = memoryStorage();
    const spool = createLearningV2ActivityReleasedSessionSubmissionSpoolV2(
      memory.port,
      () => true,
    );
    await expect(
      spool.append({ ...scope, seasonId: "other" }, submission(1)),
    ).rejects.toThrow("activity_released_submission_spool_scope_mismatch");
    await spool.append(scope, submission(1));
    const entry = [...memory.rows.keys()].find(
      (key) => !key.endsWith(":index"),
    );
    memory.rows.set(entry!, "{broken");
    await expect(spool.list(scope)).rejects.toThrow(
      "activity_released_submission_spool_corrupt",
    );

    const fresh = memoryStorage();
    const bounded = createLearningV2ActivityReleasedSessionSubmissionSpoolV2(
      fresh.port,
      () => true,
    );
    for (
      let index = 1;
      index <= LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_MAX_ENTRIES_V2;
      index += 1
    )
      await bounded.append(scope, submission(index));
    await expect(
      bounded.append(
        scope,
        submission(
          LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_MAX_ENTRIES_V2 + 1,
        ),
      ),
    ).rejects.toThrow("activity_released_submission_spool_capacity");
  });
});
