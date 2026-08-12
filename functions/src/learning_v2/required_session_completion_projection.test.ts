import { createPublishedRequiredSessionSet } from "../../../modules/learning-v2/contracts/required_session_progress";
import { deriveLearningV2EconomicAccountScopeHash } from "../../../modules/learning-v2/progress/economic_account_scope";
import { materializeRequiredSessionCompletionEnvelope } from "../../../modules/learning-v2/progress/required_session_completion_envelope";
import { deriveProgressAccountScopeHash } from "../../../modules/learning-v2/progress/progress_account_scope";
import { getLesson1SessionRuntime } from "../../../modules/learning-v2/runtime/lesson1_session_runtime";
import {
  materializeReconciledRequiredSessionCompletionCandidate,
  parseReconciledRequiredSessionCompletionCandidate,
} from "./required_session_completion_projection";

const stableUid = "stable-user-1";
const economicAccountScopeHash = deriveLearningV2EconomicAccountScopeHash(stableUid);

const fixture = (generation = 3) => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions.find((candidate) =>
    candidate.cards.some((card) => card.family === "scripted_repeat_compare"));
  if (!session) throw new Error("voice_session_fixture_missing");
  const publication = createPublishedRequiredSessionSet({
    schemaVersion: "learning-v2-published-required-session-set.v1",
    courseId: "english-core",
    studyTarget: "en",
    courseReleaseId: "english-core-release-1",
    seasonRevisionId: "season-revision-1",
    episodeRevisionFingerprint: "b".repeat(64),
    episodeContentHash: "c".repeat(64),
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    sessionSet: runtime.sessionSet,
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
    sessionRunId: `session-run-${generation}`,
    session,
    taskResults: session.cards.map((card, index) => ({
      taskId: card.cardId,
      disposition: "completed" as const,
      learnerAttempts: index === 1 ? 2 : 1,
      hintUsed: index === 2,
    })),
  });
  return {
    request: { payload, publication, economicAccountScopeHash },
    session,
  };
};

describe("catalog-reconciled required-session completion candidate", () => {
  it("keeps client metrics explicitly provisional and economically unauthorized", () => {
    const candidate = materializeReconciledRequiredSessionCompletionCandidate(fixture().request);

    expect(parseReconciledRequiredSessionCompletionCandidate(candidate)).toEqual(candidate);
    expect(candidate).toMatchObject({
      candidateAuthority: "untrusted_client_completion",
      catalogReconciliation: "server_publication_match",
      economicAuthority: "none",
      provisionalBasePerformanceStars: 33,
      clientReportedLearnerErrorCount: 1,
      clientReportedHintCount: 1,
    });
    expect(candidate.taskClaims).toHaveLength(12);
    expect(candidate.taskClaims.every((task) =>
      task.claimAuthority === "untrusted_client_summary")).toBe(true);
    expect(candidate.taskClaims.find((task) => task.family === "scripted_repeat_compare"))
      .toMatchObject({ claimAuthority: "untrusted_client_summary" });
    expect(JSON.stringify(candidate)).not.toMatch(/answerProof|submittedAnswer|audio|transcript|recording/);
    expect(Object.isFrozen(candidate)).toBe(true);
  });

  it("binds V2 publication to the exact course-wide 1..384 coordinate", () => {
    const input = fixture();
    const publication = createPublishedRequiredSessionSet({
      ...Object.fromEntries(Object.entries(input.request.publication)
        .filter(([key]) => key !== "schemaVersion" && key !== "publicationFingerprint")),
      schemaVersion: "learning-v2-published-required-session-set.v2",
      episodeOrdinal: 2,
    });
    const candidate = materializeReconciledRequiredSessionCompletionCandidate({
      ...input.request,
      publication,
    });
    expect(candidate).toMatchObject({
      schemaVersion: "learning-v2-reconciled-required-session-completion-candidate.v2",
      episodeOrdinal: 2,
      courseRequiredSessionOrdinal: 12 + input.request.payload.requiredSessionOrdinal,
    });
    if (candidate.schemaVersion !==
      "learning-v2-reconciled-required-session-completion-candidate.v2") {
      throw new Error("candidate_v2_fixture_missing");
    }
    expect(parseReconciledRequiredSessionCompletionCandidate(candidate)).toEqual(candidate);
    expect(() => parseReconciledRequiredSessionCompletionCandidate({
      ...candidate,
      courseRequiredSessionOrdinal: candidate.courseRequiredSessionOrdinal + 1,
    })).toThrow("required_session_completion_projection_invalid");
  });

  it("preserves a terminal skip at zero provisional stars", () => {
    const input = fixture();
    const payload = materializeRequiredSessionCompletionEnvelope({
      scope: {
        stableId: stableUid,
        accountScopeHash: input.request.payload.accountScopeHash,
        seasonId: "learning-v2",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        generation: input.request.payload.accountGeneration,
      },
      episodeId: input.request.payload.episodeId,
      sessionSetId: input.request.payload.sessionSetId,
      sessionSetHash: input.request.payload.sessionSetHash,
      localSessionId: input.request.payload.localSessionId,
      sessionRunId: "session-run-with-skip",
      session: input.session,
      taskResults: input.request.payload.taskCompletions.map((task, index) => ({
        taskId: task.taskId,
        disposition: index === 11 ? "skipped" as const : task.disposition,
        learnerAttempts: index === 11 ? 0 : task.learnerAttempts,
        hintUsed: task.hintUsed,
      })),
    });
    const candidate = materializeReconciledRequiredSessionCompletionCandidate({
      ...input.request,
      payload,
    });
    expect(candidate.skipCount).toBe(1);
    expect(candidate.taskClaims[11]).toMatchObject({
      disposition: "skipped",
      provisionalStars: 0,
    });
  });

  it("keeps the initial economic subject stable across account generations", () => {
    const gen3 = materializeReconciledRequiredSessionCompletionCandidate(fixture(3).request);
    const gen4 = materializeReconciledRequiredSessionCompletionCandidate(fixture(4).request);
    expect(gen3.progressAccountScopeHash).not.toBe(gen4.progressAccountScopeHash);
    expect(gen3.initialCreditSubjectFingerprint).toBe(gen4.initialCreditSubjectFingerprint);
  });

  it("rejects publication, season, scope and stored candidate substitutions", () => {
    const input = fixture();
    const candidate = materializeReconciledRequiredSessionCompletionCandidate(input.request);
    expect(() => materializeReconciledRequiredSessionCompletionCandidate({
      ...input.request,
      publication: { ...input.request.publication, sessionSetHash: "d".repeat(64) },
    })).toThrow("required_session_completion_projection_invalid");
    expect(() => materializeReconciledRequiredSessionCompletionCandidate({
      ...input.request,
      economicAccountScopeHash: "d".repeat(64),
    })).not.toThrow();
    expect(() => parseReconciledRequiredSessionCompletionCandidate({
      ...candidate,
      economicAuthority: "wallet" as never,
    })).toThrow("required_session_completion_projection_invalid");
    expect(() => parseReconciledRequiredSessionCompletionCandidate({
      ...candidate,
      provisionalBasePerformanceStars: candidate.provisionalBasePerformanceStars - 1,
    })).toThrow("required_session_completion_projection_invalid");
  });

  it("does not execute hostile input accessors", () => {
    const input = fixture();
    let getterRuns = 0;
    const hostile = { ...input.request } as Record<string, unknown>;
    Object.defineProperty(hostile, "payload", {
      enumerable: true,
      get: () => { getterRuns += 1; return input.request.payload; },
    });
    expect(() => materializeReconciledRequiredSessionCompletionCandidate(hostile))
      .toThrow("required_session_completion_projection_invalid");
    expect(getterRuns).toBe(0);
  });
});
