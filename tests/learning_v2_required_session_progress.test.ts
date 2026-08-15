import {
  createPublishedRequiredSessionSet,
  createRequiredSessionCatalog,
  createRequiredSessionCatalogFromSessionSetV2,
  createRequiredTaskSettlementCandidate,
  parsePublishedRequiredSessionSet,
  parseRequiredSessionTaskSlotRef,
} from "../modules/learning-v2/contracts/required_session_progress";
import { compileV2RequiredSessions } from "../modules/learning-v2/content/session_compiler";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  buildActivityBindingsForContentItems,
  buildE1ContentItems,
  buildEnglishProfile,
} from "./support/learning_v2_content_builders";
import {
  createRequiredSessionProgressState,
  parseRequiredSessionProgressState,
  reduceRequiredTaskSettlement,
  selectRequiredSessionTaskSlotsSettledCandidate,
} from "../modules/learning-v2/progress/required_session_reducer";

const hash = (character: string): string => character.repeat(64);
const tasks = Array.from({ length: 12 }, (_, index) => ({
  taskOrdinal: index + 1,
  taskId: `task-${index + 1}`,
  activityId: `activity-${index + 1}`,
  skipPolicy: "allowed" as const,
}));
const catalogInput = {
  schemaVersion: "learning-v2-required-session-catalog.v1" as const,
  courseId: "english-core",
  studyTarget: "en",
  courseReleaseId: "release-1",
  sessionSetId: "lesson-1-sessions",
  sessionSetHash: hash("a"),
  requiredSessionOrdinal: 1,
  sessionId: "lesson-1-session-1",
  tasks,
};
const run = {
  accountScopeHash: "aaaaaaaaaaaaaaaa",
  accountGeneration: 3,
  sessionRunId: "session-run-0001",
  runKindClaim: "initial" as const,
};

const candidate = (
  taskOrdinal: number,
  overrides: Partial<{
    operationId: string;
    taskId: string;
    activityId: string;
    disposition: "completed" | "skipped" | "technical_invalid";
    learnerAttempts: number;
    hintUsed: boolean;
    accountGeneration: number;
    sessionSetHash: string;
    runKindClaim: "initial" | "repeat";
    sessionRunId: string;
    sourceAttemptOpId: string;
    sourceAttemptBodyHash: string;
  }> = {},
) => createRequiredTaskSettlementCandidate({
  schemaVersion: "learning-v2-required-task-settlement-candidate-body.v1",
  candidateAuthority: "untrusted_local",
  operationId: overrides.operationId ?? `task-operation-${taskOrdinal}`,
  accountScopeHash: run.accountScopeHash,
  accountGeneration: overrides.accountGeneration ?? run.accountGeneration,
  courseId: catalogInput.courseId,
  studyTarget: catalogInput.studyTarget,
  courseReleaseId: catalogInput.courseReleaseId,
  sessionSetId: catalogInput.sessionSetId,
  sessionSetHash: overrides.sessionSetHash ?? catalogInput.sessionSetHash,
  requiredSessionOrdinal: catalogInput.requiredSessionOrdinal,
  sessionId: catalogInput.sessionId,
  sessionRunId: overrides.sessionRunId ?? run.sessionRunId,
  runKindClaim: overrides.runKindClaim ?? run.runKindClaim,
  taskOrdinal,
  taskId: overrides.taskId ?? `task-${taskOrdinal}`,
  activityId: overrides.activityId ?? `activity-${taskOrdinal}`,
  disposition: overrides.disposition ?? "completed",
  learnerAttempts: overrides.learnerAttempts ?? 1,
  hintUsed: overrides.hintUsed ?? false,
  sourceAttemptRef:
    (overrides.disposition === "skipped" || overrides.disposition === "technical_invalid") &&
    (overrides.learnerAttempts ?? 0) === 0 &&
    !(overrides.hintUsed ?? false)
      ? null
      : {
          schemaVersion: "v2-attempt-ref.v1",
          opId: overrides.sourceAttemptOpId ?? `attempt-operation-${taskOrdinal}`,
          attemptBodyHash: overrides.sourceAttemptBodyHash ?? hash(taskOrdinal.toString(16)),
        },
});

describe("Learning V2 owner-current required session progress", () => {
  it("derives all task and activity coordinates from canonical session-set.v2", () => {
    const items = buildE1ContentItems();
    const compiled = compileV2RequiredSessions({
      episodeId: "ep-01",
      canDoOutcomeId: "obj-introduce-self",
      profile: buildEnglishProfile(),
      items,
      activityBindings: buildActivityBindingsForContentItems(items),
    });
    const sessionSet = {
      schemaVersion: "v2-session-set.v2" as const,
      episodeId: "ep-01" as never,
      version: 2,
      sessions: compiled.sessions.map(({ support: _support, ...session }) => session),
      optionalPracticeSlots: [],
    };
    const source = {
      courseId: "english-core",
      studyTarget: "en",
      courseReleaseId: "release-1",
      sessionSetId: "ep-01-set-v2",
      sessionSetHash: hashCanonicalBody(sessionSet),
      requiredSessionOrdinal: 1,
      sessionSet,
    };
    const catalog = createRequiredSessionCatalogFromSessionSetV2(source);
    expect(catalog.tasks).toEqual(sessionSet.sessions[0].cards.map((card, index) => ({
      taskOrdinal: index + 1,
      taskId: card.cardId,
      activityId: card.activityId,
      skipPolicy: "allowed",
    })));
    expect(() => createRequiredSessionCatalogFromSessionSetV2({
      ...source,
      sessionSetHash: hash("f"),
    })).toThrow("required_session_catalog_source_invalid");
    expect(() => createRequiredSessionCatalogFromSessionSetV2({
      ...source,
      sessionSet: { ...sessionSet, schemaVersion: "v2-session-set.v1" },
    })).toThrow("required_session_catalog_source_invalid");

    const publication = createPublishedRequiredSessionSet({
      schemaVersion: "learning-v2-published-required-session-set.v1",
      courseId: source.courseId,
      studyTarget: source.studyTarget,
      courseReleaseId: source.courseReleaseId,
      seasonRevisionId: "season-revision-1",
      episodeRevisionFingerprint: hash("b"),
      episodeContentHash: hash("c"),
      sessionSetId: source.sessionSetId,
      sessionSetHash: source.sessionSetHash,
      sessionSet,
    });
    expect(parsePublishedRequiredSessionSet(JSON.parse(JSON.stringify(publication))))
      .toEqual(publication);
    expect(Object.isFrozen(publication.sessionSet.sessions[0].cards[0])).toBe(true);
    expect(() => parsePublishedRequiredSessionSet({
      ...publication,
      sessionSetHash: hash("e"),
    })).toThrow("published_required_session_set_invalid");
    expect(() => parsePublishedRequiredSessionSet({
      ...publication,
      courseReleaseId: "release-2",
    })).toThrow("published_required_session_set_invalid");

    const publicationV2 = createPublishedRequiredSessionSet({
      ...Object.fromEntries(Object.entries(publication)
        .filter(([key]) => key !== "publicationFingerprint" && key !== "schemaVersion")),
      schemaVersion: "learning-v2-published-required-session-set.v2",
      episodeOrdinal: 2,
    });
    expect(publicationV2).toMatchObject({
      schemaVersion: "learning-v2-published-required-session-set.v2",
      episodeOrdinal: 2,
    });
    expect(parsePublishedRequiredSessionSet(JSON.parse(JSON.stringify(publicationV2))))
      .toEqual(publicationV2);
    expect(() => parsePublishedRequiredSessionSet({
      ...publicationV2,
      episodeOrdinal: 33,
    })).toThrow("published_required_session_set_invalid");
  });
  it("requires exactly twelve canonical unique task slots", () => {
    expect(createRequiredSessionCatalog(catalogInput).tasks).toHaveLength(12);
    for (const invalidTasks of [
      tasks.slice(0, 8),
      tasks.slice(0, 11),
      [...tasks, { taskOrdinal: 13, taskId: "task-13", activityId: "activity-13" }],
    ]) {
      expect(() => createRequiredSessionCatalog({ ...catalogInput, tasks: invalidTasks })).toThrow("required_session_catalog_invalid");
    }
    expect(() => createRequiredSessionCatalog({ ...catalogInput, tasks: [...tasks.slice(0, 11), tasks[0]] })).toThrow("required_session_catalog_invalid");
  });

  it("derives 3/2/1/0 and never trusts a caller-provided award", () => {
    expect(candidate(1).projectedStars).toBe(3);
    expect(candidate(1, { learnerAttempts: 2 }).projectedStars).toBe(2);
    expect(candidate(1, { learnerAttempts: 3 }).projectedStars).toBe(1);
    expect(candidate(1, { hintUsed: true }).projectedStars).toBe(1);
    expect(candidate(1, { disposition: "skipped", learnerAttempts: 0 }).projectedStars).toBe(0);
    expect(() => createRequiredTaskSettlementCandidate({ ...(candidate(1) as unknown as Record<string, unknown>), projectedStars: 99 } as never)).toThrow("required_task_candidate_invalid");
  });

  it("keeps technical invalid retryable and outside the twelve terminal slots", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const state = createRequiredSessionProgressState(catalog, run);
    const technical = reduceRequiredTaskSettlement(state, candidate(1, { disposition: "technical_invalid", learnerAttempts: 0 }), catalog, {});
    expect(technical.changed).toBe(false);
    expect(technical.retryRequired).toBe(true);
    expect(Object.keys(technical.state.terminalTasks)).toHaveLength(0);
    const valid = reduceRequiredTaskSettlement(
      technical.state,
      candidate(1, { operationId: "task-operation-1-valid" }),
      catalog,
      {},
    );
    expect(valid.state.terminalTasks["1"].projectedStars).toBe(3);
    const lateTechnical = reduceRequiredTaskSettlement(
      valid.state,
      candidate(1, {
        operationId: "task-operation-1-late-technical",
        disposition: "technical_invalid",
        learnerAttempts: 1,
      }),
      catalog,
      {},
    );
    expect(lateTechnical.changed).toBe(false);
    expect(lateTechnical.retryRequired).toBe(false);
    expect(lateTechnical.state.terminalTasks["1"]).toEqual(valid.state.terminalTasks["1"]);
  });

  it("does not settle at eleven and emits one immutable local candidate at exactly twelve", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    let state = createRequiredSessionProgressState(catalog, run);
    const ledger: Record<string, string> = {};
    for (let ordinal = 1; ordinal <= 11; ordinal += 1) {
      const reduced = reduceRequiredTaskSettlement(state, candidate(ordinal), catalog, ledger);
      state = reduced.state;
      ledger[reduced.operationLedgerEntry!.operationId] = reduced.operationLedgerEntry!.candidateFingerprint;
      expect(reduced.taskSlotsSettledCandidate).toBeUndefined();
    }
    const final = reduceRequiredTaskSettlement(state, candidate(12), catalog, ledger);
    expect(final.taskSlotsSettledCandidate).toEqual(expect.objectContaining({
      schemaVersion: "learning-v2-required-session-task-slots-settled-candidate.v1",
      candidateAuthority: "untrusted_local",
      projectedBasePerformanceStars: 36,
      taskCandidateFingerprints: expect.arrayContaining(new Array(12).fill(expect.stringMatching(/^[a-f0-9]{64}$/))),
    }));
    expect(final.taskSlotsSettledCandidate?.taskCandidateFingerprints).toHaveLength(12);
    expect(Object.isFrozen(final.taskSlotsSettledCandidate)).toBe(true);
    expect(Object.isFrozen(final.taskSlotsSettledCandidate?.taskCandidateFingerprints)).toBe(true);
  });

  it("makes exact replay a no-op and rejects operation or task terminal conflicts", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const initial = createRequiredSessionProgressState(catalog, run);
    const firstCandidate = candidate(1);
    const first = reduceRequiredTaskSettlement(initial, firstCandidate, catalog, {});
    const processed = { [first.operationLedgerEntry!.operationId]: first.operationLedgerEntry!.candidateFingerprint };
    const replay = reduceRequiredTaskSettlement(first.state, firstCandidate, catalog, processed);
    expect(replay.changed).toBe(false);
    expect(replay.state).toStrictEqual(first.state);
    expect(() => reduceRequiredTaskSettlement(first.state, candidate(1, { operationId: firstCandidate.operationId, learnerAttempts: 2 }), catalog, processed)).toThrow("required_task_operation_conflict");
    expect(() => reduceRequiredTaskSettlement(first.state, candidate(1, { operationId: "different-operation", learnerAttempts: 2 }), catalog, processed)).toThrow("required_task_terminal_conflict");
    expect(() => reduceRequiredTaskSettlement(first.state, candidate(2, { operationId: firstCandidate.operationId }), catalog, {})).toThrow("required_task_operation_conflict");
  });

  it("repairs a missing snapshot projection when the exact operation journal survived", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const emptyState = createRequiredSessionProgressState(catalog, run);
    const firstCandidate = candidate(1);
    const recovered = reduceRequiredTaskSettlement(emptyState, firstCandidate, catalog, {
      [firstCandidate.operationId]: firstCandidate.candidateFingerprint,
    });
    expect(recovered.changed).toBe(true);
    expect(recovered.state.terminalTasks["1"]).toEqual(firstCandidate);
  });

  it("re-emits the same settlement candidate when its downstream effect was interrupted", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    let state = createRequiredSessionProgressState(catalog, run);
    const ledger: Record<string, string> = {};
    let twelfth = candidate(12);
    for (let ordinal = 1; ordinal <= 12; ordinal += 1) {
      const current = candidate(ordinal);
      const reduced = reduceRequiredTaskSettlement(state, current, catalog, ledger);
      state = reduced.state;
      ledger[current.operationId] = current.candidateFingerprint;
      if (ordinal === 12) twelfth = current;
    }
    const replay = reduceRequiredTaskSettlement(state, twelfth, catalog, ledger);
    expect(replay.changed).toBe(false);
    expect(replay.taskSlotsSettledCandidate).toEqual(selectRequiredSessionTaskSlotsSettledCandidate(state, catalog));
    const lateTechnical = reduceRequiredTaskSettlement(state, candidate(12, {
      operationId: "late-technical-after-settlement",
      disposition: "technical_invalid",
      learnerAttempts: 1,
    }), catalog, ledger);
    expect(lateTechnical.retryRequired).toBe(false);
    expect(lateTechnical.taskSlotsSettledCandidate).toEqual(replay.taskSlotsSettledCandidate);
  });

  it("derives mixed totals and keeps task fingerprints in canonical ordinal order", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    let state = createRequiredSessionProgressState(catalog, run);
    const ledger: Record<string, string> = {};
    const orderedReceipts = Array.from({ length: 12 }, (_, index) => {
      const ordinal = index + 1;
      if (ordinal === 2) return candidate(ordinal, { learnerAttempts: 2 });
      if (ordinal === 3) return candidate(ordinal, { learnerAttempts: 3 });
      if (ordinal === 4) return candidate(ordinal, { hintUsed: true });
      if (ordinal === 5) return candidate(ordinal, { disposition: "skipped", learnerAttempts: 0 });
      return candidate(ordinal);
    });
    for (const current of [...orderedReceipts].reverse()) {
      const reduced = reduceRequiredTaskSettlement(state, current, catalog, ledger);
      state = reduced.state;
      ledger[current.operationId] = current.candidateFingerprint;
    }
    expect(selectRequiredSessionTaskSlotsSettledCandidate(state, catalog)).toEqual(expect.objectContaining({
      projectedBasePerformanceStars: 28,
      projectedLearnerErrorCount: 2,
      projectedHintCount: 1,
      skipCount: 1,
      taskCandidateFingerprints: orderedReceipts.map((current) => current.candidateFingerprint),
    }));
  });

  it("rejects tampered derived candidate fields and carries repeat run identity only", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const initialState = createRequiredSessionProgressState(catalog, run);
    const original = candidate(1);
    expect(() => reduceRequiredTaskSettlement(initialState, { ...original, projectedStars: 0 }, catalog, {})).toThrow("required_task_candidate_invalid");
    expect(() => reduceRequiredTaskSettlement(initialState, { ...original, candidateFingerprint: hash("f") }, catalog, {})).toThrow("required_task_candidate_invalid");

    const repeatRun = { ...run, sessionRunId: "session-run-repeat-1", runKindClaim: "repeat" as const };
    let repeatState = createRequiredSessionProgressState(catalog, repeatRun);
    const ledger: Record<string, string> = {};
    for (let ordinal = 1; ordinal <= 12; ordinal += 1) {
      const current = candidate(ordinal, {
        operationId: `repeat-operation-${ordinal}`,
        sessionRunId: repeatRun.sessionRunId,
        runKindClaim: repeatRun.runKindClaim,
      });
      const reduced = reduceRequiredTaskSettlement(repeatState, current, catalog, ledger);
      repeatState = reduced.state;
      ledger[current.operationId] = current.candidateFingerprint;
    }
    const settled = selectRequiredSessionTaskSlotsSettledCandidate(repeatState, catalog);
    expect(settled?.runKindClaim).toBe("repeat");
    expect(settled).not.toHaveProperty("qualityBand");
    expect(settled).not.toHaveProperty("reward");
  });

  it("fails closed on stale account, content, run channel and unknown task bindings", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const state = createRequiredSessionProgressState(catalog, run);
    expect(() => reduceRequiredTaskSettlement(state, candidate(1, { accountGeneration: 4 }), catalog, {})).toThrow("required_task_scope_mismatch");
    expect(() => reduceRequiredTaskSettlement(state, candidate(1, { sessionSetHash: hash("c") }), catalog, {})).toThrow("required_task_catalog_mismatch");
    expect(() => reduceRequiredTaskSettlement(state, candidate(1, { runKindClaim: "repeat" }), catalog, {})).toThrow("required_task_run_mismatch");
    expect(() => reduceRequiredTaskSettlement(state, candidate(1, { taskId: "optional-repair" }), catalog, {})).toThrow("required_task_catalog_mismatch");
  });

  it("accepts honest skip/technical histories without terminalizing a technical failure", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const state = createRequiredSessionProgressState(catalog, run);
    const skipped = candidate(1, { disposition: "skipped", learnerAttempts: 1, hintUsed: true });
    expect(skipped.projectedStars).toBe(0);
    expect(reduceRequiredTaskSettlement(state, skipped, catalog, {}).state.terminalTasks["1"]).toEqual(skipped);

    const technical = candidate(2, { disposition: "technical_invalid", learnerAttempts: 1, hintUsed: true });
    const retry = reduceRequiredTaskSettlement(state, technical, catalog, {});
    expect(retry.retryRequired).toBe(true);
    expect(retry.operationLedgerEntry).toBeUndefined();
    expect(retry.state.terminalTasks["2"]).toBeUndefined();
    const laterValid = candidate(2, { operationId: "task-operation-2-valid", learnerAttempts: 2, hintUsed: true });
    expect(reduceRequiredTaskSettlement(retry.state, laterValid, catalog, {}).state.terminalTasks["2"].projectedStars).toBe(1);
  });

  it("enforces a catalog-bound no-skip rule for required voice tasks", () => {
    const voiceCatalog = createRequiredSessionCatalog({
      ...catalogInput,
      tasks: tasks.map((task, index) => index === 0 ? { ...task, skipPolicy: "forbidden" } : task),
    });
    const state = createRequiredSessionProgressState(voiceCatalog, run);
    expect(() => reduceRequiredTaskSettlement(
      state,
      candidate(1, { disposition: "skipped", learnerAttempts: 0 }),
      voiceCatalog,
      {},
    )).toThrow("required_task_skip_forbidden");
    expect(reduceRequiredTaskSettlement(
      state,
      candidate(1, { disposition: "technical_invalid", learnerAttempts: 0 }),
      voiceCatalog,
      {},
    ).retryRequired).toBe(true);
    expect(reduceRequiredTaskSettlement(state, candidate(1), voiceCatalog, {}).changed).toBe(true);
  });

  it("rejects raw catalog substitution and malformed hydrated state", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const rawDuplicateCatalog = {
      ...catalogInput,
      tasks: tasks.map((task) => ({ ...task, taskId: "same-task", activityId: "same-activity" })),
    };
    expect(() => createRequiredSessionProgressState(rawDuplicateCatalog, run)).toThrow("required_session_catalog_invalid");
    expect(() => createRequiredSessionCatalog({ ...catalog, catalogFingerprint: hash("f") })).toThrow("required_session_catalog_invalid");

    const state = createRequiredSessionProgressState(catalog, run);
    expect(() => parseRequiredSessionProgressState({
      ...state,
      terminalTasks: { "1": { projectedStars: 3, candidateFingerprint: "not-a-hash" } },
    }, catalog)).toThrow("required_task_candidate_invalid");
    expect(() => parseRequiredSessionProgressState({ ...state, forgedCompletion: { projectedBasePerformanceStars: 36 } }, catalog)).toThrow("required_session_progress_state_invalid");
  });

  it("binds revision exactly to the terminal projection cardinality", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const empty = createRequiredSessionProgressState(catalog, run);
    expect(parseRequiredSessionProgressState(empty, catalog).revision).toBe(0);
    const first = reduceRequiredTaskSettlement(empty, candidate(1), catalog, {});
    expect(first.expectedRevision).toBe(0);
    expect(first.nextRevision).toBe(1);
    expect(parseRequiredSessionProgressState(first.state, catalog).revision).toBe(1);
    for (const invalidRevision of [0, 2, 13, Number.MAX_SAFE_INTEGER]) {
      expect(() => parseRequiredSessionProgressState({ ...first.state, revision: invalidRevision }, catalog)).toThrow("required_session_progress_state_invalid");
    }
  });

  it("prevents one canonical attempt reference from settling two task slots", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const state = createRequiredSessionProgressState(catalog, run);
    const first = reduceRequiredTaskSettlement(state, candidate(1, {
      sourceAttemptOpId: "shared-attempt",
      sourceAttemptBodyHash: hash("c"),
    }), catalog, {});
    expect(() => reduceRequiredTaskSettlement(first.state, candidate(2, {
      sourceAttemptOpId: "shared-attempt",
      sourceAttemptBodyHash: hash("c"),
    }), catalog, {})).toThrow("required_task_attempt_reused");
  });

  it("uses one stable initial credit subject across competing initial run claims", () => {
    const catalog = createRequiredSessionCatalog(catalogInput);
    const settle = (sessionRunId: string) => {
      const localRun = { ...run, sessionRunId };
      let state = createRequiredSessionProgressState(catalog, localRun);
      for (let ordinal = 1; ordinal <= 12; ordinal += 1) {
        state = reduceRequiredTaskSettlement(state, candidate(ordinal, {
          operationId: `${sessionRunId}-operation-${ordinal}`,
          sessionRunId,
          sourceAttemptOpId: `${sessionRunId}-attempt-${ordinal}`,
        }), catalog, {}).state;
      }
      return selectRequiredSessionTaskSlotsSettledCandidate(state, catalog)!;
    };
    const first = settle("initial-run-a");
    const second = settle("initial-run-b");
    expect(first.sessionRunId).not.toBe(second.sessionRunId);
    expect(first.initialCreditSubjectFingerprint).toBe(second.initialCreditSubjectFingerprint);
    expect(first.candidateAuthority).toBe("untrusted_local");
    expect(first).not.toHaveProperty("creditEligible");
    const nextGenerationRun = { ...run, accountGeneration: run.accountGeneration + 1, sessionRunId: "initial-run-next-generation" };
    let nextGenerationState = createRequiredSessionProgressState(catalog, nextGenerationRun);
    for (let ordinal = 1; ordinal <= 12; ordinal += 1) {
      nextGenerationState = reduceRequiredTaskSettlement(nextGenerationState, candidate(ordinal, {
        accountGeneration: nextGenerationRun.accountGeneration,
        operationId: `next-generation-operation-${ordinal}`,
        sessionRunId: nextGenerationRun.sessionRunId,
        sourceAttemptOpId: `next-generation-attempt-${ordinal}`,
      }), catalog, {}).state;
    }
    expect(selectRequiredSessionTaskSlotsSettledCandidate(nextGenerationState, catalog)?.initialCreditSubjectFingerprint).toBe(first.initialCreditSubjectFingerprint);
  });

  it("rejects reserved operation IDs and bounds hostile payloads", () => {
    expect(() => candidate(1, { operationId: "constructor" })).toThrow("required_task_candidate_invalid");
    expect(() => createRequiredSessionCatalog({ ...catalogInput, unknown: "x".repeat(70_000) })).toThrow("required_session_catalog_invalid");
    expect(() => createRequiredSessionCatalog({ ...catalogInput, ["x".repeat(70_000)]: 0 })).toThrow("required_session_catalog_invalid");
    let arrayGetterCalled = false;
    const hostileTasks = [...tasks];
    Object.defineProperty(hostileTasks, "0", {
      enumerable: true,
      get: () => {
        arrayGetterCalled = true;
        return tasks[0];
      },
    });
    expect(() => createRequiredSessionCatalog({ ...catalogInput, tasks: hostileTasks })).toThrow("required_session_catalog_invalid");
    expect(arrayGetterCalled).toBe(false);
    const catalog = createRequiredSessionCatalog(catalogInput);
    const indexWithGetter = Object.defineProperty({}, "task-operation-1", {
      enumerable: true,
      get: () => candidate(1).candidateFingerprint,
    });
    expect(() => reduceRequiredTaskSettlement(
      createRequiredSessionProgressState(catalog, run),
      candidate(1),
      catalog,
      indexWithGetter,
    )).toThrow("required_task_operation_index_invalid");
  });

  it("parses a strict required-session slot reference without executing getters", () => {
    const slot = {
      schemaVersion: "learning-v2-required-session-task-slot-ref.v1" as const,
      courseId: catalogInput.courseId,
      courseReleaseId: catalogInput.courseReleaseId,
      sessionSetId: catalogInput.sessionSetId,
      sessionSetHash: catalogInput.sessionSetHash,
      requiredSessionOrdinal: 1,
      sessionId: catalogInput.sessionId,
      sessionRunId: run.sessionRunId,
      runKindClaim: run.runKindClaim,
      taskOrdinal: 1,
      taskId: tasks[0].taskId,
      activityId: tasks[0].activityId,
    };
    expect(parseRequiredSessionTaskSlotRef(slot)).toEqual(slot);
    const getter = jest.fn(() => slot.activityId);
    const hostile = { ...slot } as Record<string, unknown>;
    Object.defineProperty(hostile, "activityId", { enumerable: true, get: getter });
    expect(() => parseRequiredSessionTaskSlotRef(hostile))
      .toThrow("required_session_task_slot_ref_invalid");
    expect(getter).not.toHaveBeenCalled();
  });

  it("detaches and deep-freezes catalog, candidates and reduction results", () => {
    const mutable = { ...catalogInput, tasks: tasks.map((task) => ({ ...task })) };
    const catalog = createRequiredSessionCatalog(mutable);
    mutable.tasks[0].taskId = "mutated";
    expect(catalog.tasks[0].taskId).toBe("task-1");
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.tasks)).toBe(true);
    expect(Object.isFrozen(catalog.tasks[0])).toBe(true);
    expect(Object.isFrozen(candidate(1))).toBe(true);
    const reduction = reduceRequiredTaskSettlement(
      createRequiredSessionProgressState(catalog, run),
      candidate(1),
      catalog,
      {},
    );
    expect(Object.isFrozen(reduction)).toBe(true);
    expect(Object.isFrozen(reduction.operationLedgerEntry)).toBe(true);
  });
});
