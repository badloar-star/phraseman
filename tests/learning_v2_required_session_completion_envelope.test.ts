import { getLesson1SessionRuntime } from "../modules/learning-v2/runtime/lesson1_session_runtime";
import {
  materializeRequiredSessionCompletionEnvelope,
  parseRequiredSessionCompletionEnvelope,
  rebindRequiredSessionCompletionEnvelope,
  requiredSessionCompletionMutationId,
} from "../modules/learning-v2/progress/required_session_completion_envelope";
import { createProgressOutbox } from "../modules/learning-v2/progress/progress_outbox";
import {
  deriveLocalOfflineProgressAccountScopeHash,
  deriveProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from "../modules/learning-v2/progress/progress_account_scope";

const scope = {
  stableId: "account-a",
  accountScopeHash: "a".repeat(64),
  seasonId: "learning-v2",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  generation: 4,
};

const fixture = () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const taskResults = session.cards.map((card, index) => ({
    taskId: card.cardId,
    disposition: "completed" as const,
    learnerAttempts: index === 2 ? 2 : 1,
    hintUsed: index === 4,
  }));
  return { runtime, session, taskResults };
};

describe("required-session completion envelope", () => {
  it("materializes one frozen twelve-task packet without raw answers or audio", () => {
    const { runtime, session, taskResults } = fixture();
    const envelope = materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-1",
      session,
      taskResults,
    });

    expect(parseRequiredSessionCompletionEnvelope(envelope)).toEqual(envelope);
    expect(envelope.taskCompletions).toHaveLength(12);
    expect(envelope.taskCompletions[2]).toMatchObject({ learnerAttempts: 2 });
    expect(envelope.taskCompletions[4]).toMatchObject({ hintUsed: true });
    expect(JSON.stringify(envelope)).not.toMatch(/answerProof|submittedAnswer|audio|transcript|recording|I am|I'm/);
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.taskCompletions)).toBe(true);
  });

  it("preserves an allowed terminal skip without inventing correctness evidence", () => {
    const { runtime, session, taskResults } = fixture();
    const envelope = materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-with-skip",
      session,
      taskResults: taskResults.map((result, index) => index === 11
        ? { ...result, disposition: "skipped" as const, learnerAttempts: 0 }
        : result),
    });
    expect(parseRequiredSessionCompletionEnvelope(envelope).taskCompletions[11])
      .toMatchObject({ disposition: "skipped", learnerAttempts: 0 });
  });

  it("uses a stable per-account/session mutation id and detects conflicting retries", () => {
    const { runtime, session, taskResults } = fixture();
    const first = materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-1",
      session,
      taskResults,
    });
    const changed = materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-1",
      session,
      taskResults: taskResults.map((result, index) => index === 0
        ? { ...result, learnerAttempts: 2 }
        : result),
    });
    expect(requiredSessionCompletionMutationId(first)).toBe(
      requiredSessionCompletionMutationId(changed),
    );
    expect(first.completionFingerprint).not.toBe(changed.completionFingerprint);
    const nextRun = materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-2",
      session,
      taskResults,
    });
    expect(requiredSessionCompletionMutationId(nextRun)).not.toBe(
      requiredSessionCompletionMutationId(first),
    );
  });

  it("survives an app restart as one idempotent local outbox item", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => { values.set(key, value); },
      removeItem: async (key: string) => { values.delete(key); },
    };
    const { runtime, session, taskResults } = fixture();
    const envelope = materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-1",
      session,
      taskResults,
    });
    const mutationId = requiredSessionCompletionMutationId(envelope);
    const first = createProgressOutbox(storage, () => true);
    await first.enqueue(scope, mutationId, envelope);
    await first.enqueue(scope, mutationId, envelope);

    const restarted = createProgressOutbox(storage, () => true);
    const pending = await restarted.list(scope);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      mutationId,
      status: "pending",
      payload: envelope,
    });
  });

  it("keeps restart-stable local identity and rebinds only in background transport", () => {
    const { runtime, session, taskResults } = fixture();
    const localScope = {
      ...scope,
      accountScopeHash: deriveLocalOfflineProgressAccountScopeHash("account-a"),
      generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
    };
    const local = materializeRequiredSessionCompletionEnvelope({
      scope: localScope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "restart-stable-run",
      session,
      taskResults,
    });
    const rebound = rebindRequiredSessionCompletionEnvelope(local, {
      accountScopeHash: deriveProgressAccountScopeHash("account-a", 7),
      accountGeneration: 7,
    });
    expect(local).toMatchObject({
      accountGeneration: 0,
      accountScopeHash: deriveLocalOfflineProgressAccountScopeHash("account-a"),
    });
    expect(rebound).toMatchObject({
      accountGeneration: 7,
      accountScopeHash: deriveProgressAccountScopeHash("account-a", 7),
      sessionRunId: local.sessionRunId,
      taskCompletions: local.taskCompletions,
    });
    expect(rebound.completionFingerprint).not.toBe(local.completionFingerprint);
    expect(rebindRequiredSessionCompletionEnvelope(local, {
      accountScopeHash: deriveProgressAccountScopeHash("account-a", 7),
      accountGeneration: 7,
    })).toEqual(rebound);
    expect(() => rebindRequiredSessionCompletionEnvelope(local, {
      accountScopeHash: deriveProgressAccountScopeHash("account-a", 7),
      accountGeneration: 0,
    })).toThrow("required_session_completion_invalid");
  });

  it("rejects incomplete, duplicate, cross-account, tampered and hostile inputs", () => {
    const { runtime, session, taskResults } = fixture();
    const valid = materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-1",
      session,
      taskResults,
    });
    expect(() => materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-1",
      session,
      taskResults: taskResults.slice(1),
    })).toThrow("required_session_completion_invalid");
    expect(() => materializeRequiredSessionCompletionEnvelope({
      scope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-1",
      session,
      taskResults: taskResults.map((entry, index) => index === 1 ? taskResults[0] : entry),
    })).toThrow("required_session_completion_invalid");
    expect(() => materializeRequiredSessionCompletionEnvelope({
      scope: { ...scope, unexpected: true } as never,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-1",
      session,
      taskResults,
    })).toThrow("required_session_completion_invalid");
    expect(() => parseRequiredSessionCompletionEnvelope({
      ...valid,
      accountScopeHash: "b".repeat(64),
    })).toThrow("required_session_completion_invalid");

    let getterRuns = 0;
    const hostile = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(hostile, "scope", {
      enumerable: true,
      get: () => { getterRuns += 1; return scope; },
    });
    for (const [key, value] of Object.entries({
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "session-run-1",
      session,
      taskResults,
    })) Object.defineProperty(hostile, key, { enumerable: true, value });
    expect(() => materializeRequiredSessionCompletionEnvelope(hostile as never))
      .toThrow("required_session_completion_invalid");
    expect(getterRuns).toBe(0);
  });
});
