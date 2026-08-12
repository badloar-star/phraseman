import { createPublishedRequiredSessionSet } from "../../../modules/learning-v2/contracts/required_session_progress";
import { deriveLearningV2EconomicAccountScopeHash } from "../../../modules/learning-v2/progress/economic_account_scope";
import { materializeRequiredSessionCompletionEnvelope } from "../../../modules/learning-v2/progress/required_session_completion_envelope";
import { deriveProgressAccountScopeHash } from "../../../modules/learning-v2/progress/progress_account_scope";
import { getLesson1SessionRuntime } from "../../../modules/learning-v2/runtime/lesson1_session_runtime";
import { materializeReconciledRequiredSessionCompletionCandidate } from "./required_session_completion_projection";
import {
  parseRequiredSessionCourseAwardState,
  parseRequiredSessionPerformanceAwardState,
  projectRequiredSessionPerformanceAward,
} from "./required_session_performance_award";

const stableUid = "stable-user-award";

const candidate = (input: {
  generation?: number;
  runId: string;
  result?: "perfect" | "good" | "errors" | "skipped";
  episodeOrdinal?: number;
  publicationVersion?: 1 | 2;
}) => {
  const generation = input.generation ?? 3;
  const result = input.result ?? "errors";
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  if (!session) throw new Error("session_fixture_missing");
  const publicationBody = {
    courseId: "english-core",
    studyTarget: "en",
    courseReleaseId: "english-core-release-1",
    seasonRevisionId: "season-revision-1",
    episodeRevisionFingerprint: "b".repeat(64),
    episodeContentHash: "c".repeat(64),
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    sessionSet: runtime.sessionSet,
  };
  const publication = input.publicationVersion === 1
    ? createPublishedRequiredSessionSet({
        schemaVersion: "learning-v2-published-required-session-set.v1",
        ...publicationBody,
      })
    : createPublishedRequiredSessionSet({
        schemaVersion: "learning-v2-published-required-session-set.v2",
        ...publicationBody,
        episodeOrdinal: input.episodeOrdinal ?? 1,
      });
  const payload = materializeRequiredSessionCompletionEnvelope({
    scope: {
      stableId: stableUid,
      accountScopeHash: deriveProgressAccountScopeHash(stableUid, generation),
      seasonId: "learning-v2",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      generation,
    },
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: "lesson-1-understand-1",
    sessionRunId: input.runId,
    session,
    taskResults: session.cards.map((card, index) => ({
      taskId: card.cardId,
      disposition: result === "skipped" ? "skipped" as const : "completed" as const,
      learnerAttempts: result === "skipped" ? 0 : result === "errors" && index === 1 ? 2 : 1,
      hintUsed: result === "good" && index === 2,
    })),
  });
  return materializeReconciledRequiredSessionCompletionCandidate({
    payload,
    publication,
    economicAccountScopeHash: deriveLearningV2EconomicAccountScopeHash(stableUid),
  });
};

const project = (
  nextCandidate: ReturnType<typeof candidate>,
  previous: ReturnType<typeof projectRequiredSessionPerformanceAward> | null = null,
) => projectRequiredSessionPerformanceAward({
  candidate: nextCandidate,
  previousState: previous?.nextState ?? null,
  previousCourseState: previous?.nextCourseState ?? null,
});

describe("server policy for required-session initial and repeat awards", () => {
  it("credits the first 12-task result once, then uses the next-session repeat price", () => {
    const first = project(candidate({ runId: "award-run-1", result: "errors" }));
    expect(first).toMatchObject({
      awardAuthority: "server_policy_over_catalog_bound_app_summary",
      completionKind: "initial",
      awardedSubunits: 350_000,
      nextState: {
        initialCreditedSubunits: 350_000,
        repeatCompletions: 0,
        revision: 1,
      },
      nextCourseState: { initialSettledSessionCount: 1, revision: 1 },
      reward: { receipt: { amountSubunits: 350_000, operationReason: "initial_required_session" } },
    });
    expect(parseRequiredSessionPerformanceAwardState(first.nextState)).toEqual(first.nextState);
    expect(parseRequiredSessionCourseAwardState(first.nextCourseState)).toEqual(first.nextCourseState);

    const perfectRepeat = project(candidate({ runId: "award-run-2", result: "perfect" }), first);
    expect(perfectRepeat).toMatchObject({
      completionKind: "repeat",
      repeatQualityBand: "perfect",
      referenceNextPriceStars: 45,
      awardedSubunits: 90_000,
      nextState: { repeatCompletions: 1, repeatCreditedSubunits: 90_000, revision: 2 },
      nextCourseState: { initialSettledSessionCount: 1, revision: 1 },
      reward: { receipt: { amountSubunits: 90_000, operationReason: "repeat_session" } },
    });

    const secondPerfectRepeat = project(
      candidate({ runId: "award-run-3", result: "perfect" }),
      perfectRepeat,
    );
    expect(secondPerfectRepeat.awardedSubunits).toBe(90_000);
    expect(secondPerfectRepeat.nextState).toMatchObject({ repeatCompletions: 2, revision: 3 });
  });

  it("keeps exact fractional stars for good/errors and pays zero for a skipped repeat", () => {
    const first = project(candidate({ runId: "award-quality-initial", result: "perfect" }));
    const good = project(candidate({ runId: "award-quality-good", result: "good" }), first);
    expect(good).toMatchObject({
      repeatQualityBand: "good",
      awardedSubunits: 54_000,
      reward: { receipt: { amountSubunits: 54_000 } },
    });
    const errors = project(candidate({ runId: "award-quality-errors", result: "errors" }), good);
    expect(errors).toMatchObject({
      repeatQualityBand: "with_errors",
      awardedSubunits: 22_500,
      reward: { receipt: { amountSubunits: 22_500 } },
    });
    const skipped = project(candidate({ runId: "award-quality-skipped", result: "skipped" }), errors);
    expect(skipped).toMatchObject({
      repeatQualityBand: "skipped",
      awardedSubunits: 0,
      reward: null,
      nextState: { repeatCompletions: 3, repeatCreditedSubunits: 76_500, revision: 4 },
    });
  });

  it("settles a zero-star initial run and prevents skipping the course sequence", () => {
    const skipped = project(candidate({ runId: "award-run-skipped", result: "skipped" }));
    expect(skipped).toMatchObject({
      completionKind: "initial",
      awardedSubunits: 0,
      reward: null,
      nextState: { initialCreditedSubunits: 0, revision: 1 },
      nextCourseState: { initialSettledSessionCount: 1 },
    });
    expect(() => project(candidate({
      runId: "award-future-session",
      result: "perfect",
      episodeOrdinal: 2,
    }))).toThrow("required_session_initial_sequence_conflict");
  });

  it("keeps the same durable session across account-generation rollover", () => {
    const first = project(candidate({ generation: 3, runId: "award-run-g3", result: "perfect" }));
    const next = project(
      candidate({ generation: 4, runId: "award-run-g4", result: "perfect" }),
      first,
    );
    expect(next.awardedSubunits).toBe(90_000);
    expect(next.nextState?.initialCreditSubjectFingerprint)
      .toBe(first.nextState?.initialCreditSubjectFingerprint);
    expect(next.reward?.receipt.accountGeneration).toBe(4);
  });

  it("defers ambiguous V1 publications and rejects hostile accessors", () => {
    const runtimeCandidate = candidate({ runId: "award-run-hostile" });
    const legacy = projectRequiredSessionPerformanceAward({
      candidate: candidate({ runId: "award-run-legacy", publicationVersion: 1 }),
      previousState: null,
      previousCourseState: null,
    });
    expect(legacy).toMatchObject({
      completionKind: "legacy_deferred",
      awardedSubunits: 0,
      nextState: null,
      nextCourseState: null,
      reward: null,
    });

    let getterRuns = 0;
    const hostile = Object.defineProperty({}, "candidate", {
      enumerable: true,
      get: () => { getterRuns += 1; return runtimeCandidate; },
    });
    Object.defineProperty(hostile, "previousState", { enumerable: true, value: null });
    Object.defineProperty(hostile, "previousCourseState", { enumerable: true, value: null });
    expect(() => projectRequiredSessionPerformanceAward(hostile))
      .toThrow("required_session_performance_award_input_invalid");
    expect(getterRuns).toBe(0);
  });
});
