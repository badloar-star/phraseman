import {
  createInitialProgressState,
  deriveRequiredLoopsComplete,
  reduceProgress,
  type ProgressEvent,
} from "../modules/learning-v2/progress/progress_reducer";
import type { ProgressReducerContext } from "../modules/learning-v2/progress/progress_types";

describe("Learning V2 pure progress reducer", () => {
  const attempt = (n: string) => ({
    schemaVersion: "v2-attempt-ref.v1" as const,
    opId: `op-${n}`,
    attemptBodyHash: "b".repeat(64),
  });
  const context: ProgressReducerContext = {
    expectedAccountScopeHash: "anonymous",
    expectedSeasonId: "season-01",
    processedAttemptIndex: {},
    checkpointContract: {
      tupleKeys: ["letk1.semantic"],
      assessmentNodeIds: ["node-1"],
      assessedObjectiveIds: ["objective-1"],
      criticalTupleKeys: ["letk1.semantic"],
      repairTupleKeys: ["letk1.semantic"],
      alternateTupleKeys: ["letk1.semantic"],
    },
    slotCatalog: {
      "slot-1": {
        episodeId: "episode-1",
        activityId: "activity-1",
        progressCompatibilityKey: "compat-1",
      },
    },
    validateAttemptRef: () => true,
    validateEvidenceRef: () => true,
    evidenceBindings: {
      "letk1.semantic": {
        bodyHash: "a".repeat(64),
        sourceAttempt: {
          schemaVersion: "v2-attempt-ref.v1",
          opId: "op-1",
          attemptBodyHash: "b".repeat(64),
        },
      },
      "letk1.x": {
        bodyHash: "a".repeat(64),
        sourceAttempt: {
          schemaVersion: "v2-attempt-ref.v1",
          opId: "op",
          attemptBodyHash: "b".repeat(64),
        },
      },
    },
    declaredEvidenceTupleKeys: ["letk1.semantic", "letk1.x"],
  };
  const event = (
    candidateStars: number,
    overrides: Partial<ProgressEvent> = {},
  ): ProgressEvent => ({
    eventId: `event-${candidateStars}`,
    starSlotId: "slot-1",
    candidateStars,
    attemptRef: attempt(String(candidateStars)),
    ...overrides,
  });

  it("keeps the best 0..3 performance and derives access from the same delta", () => {
    const initial = createInitialProgressState();
    const first = reduceProgress(initial, event(2), context);
    expect(first.state.slots["slot-1"].bestPerformanceStars).toBe(2);
    expect(first.state.slots["slot-1"].bestPerformanceStars).toBe(2);
    expect(first.delta).toBe(2);

    const replay = reduceProgress(
      first.state,
      event(1, { eventId: "worse", attemptRef: attempt("worse") }),
      context,
    );
    expect(replay.delta).toBe(0);
    expect(replay.state.slots["slot-1"].bestPerformanceStars).toBe(2);
  });

  it("deduplicates an accepted event id without mutating legacy fields", () => {
    const initial = createInitialProgressState({
      legacy: { lesson1_best_score: 5 },
    });
    const first = reduceProgress(initial, event(3), context);
    const replay = reduceProgress(first.state, event(3), context);
    expect(replay.delta).toBe(0);
    expect(replay.state).toEqual(
      expect.objectContaining({ legacy: { lesson1_best_score: 5 } }),
    );
  });

  it("keeps learning evidence independent from stars", () => {
    const result = reduceProgress(
      createInitialProgressState(),
      event(3, {
        learningEvidence: {
          tupleKey: "letk1.semantic",
          assessedRef: {
            observationId: "obs-1",
            evidenceBodyHash: "a".repeat(64),
            tupleKey: "letk1.semantic",
            sourceAttempt: {
              schemaVersion: "v2-attempt-ref.v1",
              opId: "op-1",
              attemptBodyHash: "b".repeat(64),
            },
          },
        },
      }),
      context,
    );
    expect(
      result.state.learningEvidenceIndex["letk1.semantic"]
        .bestAssessedEvidenceRef?.observationId,
    ).toBe("obs-1");
    expect(result.state.slots["slot-1"].bestPerformanceStars).toBe(3);
  });

  it("rejects malformed stars and makes duplicate tuple refs idempotent", () => {
    expect(() =>
      reduceProgress(createInitialProgressState(), event(4), context),
    ).toThrow("performance_stars_invalid");
    const duplicate = reduceProgress(
      {
        ...createInitialProgressState(),
        learningEvidenceIndex: {
          "letk1.x": {
            bestAssessedEvidenceRef: {
              observationId: "same",
              evidenceBodyHash: "a".repeat(64),
              tupleKey: "letk1.x",
              sourceAttempt: {
                schemaVersion: "v2-attempt-ref.v1",
                opId: "op",
                attemptBodyHash: "b".repeat(64),
              },
            },
          },
        },
      },
      event(1, {
        learningEvidence: {
          tupleKey: "letk1.x",
          assessedRef: {
            observationId: "same",
            evidenceBodyHash: "a".repeat(64),
            tupleKey: "letk1.x",
            sourceAttempt: {
              schemaVersion: "v2-attempt-ref.v1",
              opId: "op",
              attemptBodyHash: "b".repeat(64),
            },
          },
        },
      }),
      context,
    );
    expect(duplicate.changed).toBe(false);
  });

  it("fails closed on scope, forged checkpoint and catalog mismatches", () => {
    expect(() =>
      reduceProgress(createInitialProgressState(), event(1), {
        ...context,
        expectedAccountScopeHash: "other",
      }),
    ).toThrow("progress_scope_mismatch");
    expect(() =>
      reduceProgress(
        createInitialProgressState(),
        event(1, {
          checkpointEvidence: {
            checkpointEpisodeId: "cp-1",
            tupleKey: "letk1.semantic",
            state: "passed",
          },
        }),
        {
          ...context,
          checkpointContract: {
            ...context.checkpointContract,
            tupleKeys: ["letk1.semantic"],
          },
        },
      ),
    ).toThrow("checkpoint_evidence_required");
    expect(() =>
      reduceProgress(
        createInitialProgressState(),
        event(1, { activityId: "tampered" }),
        context,
      ),
    ).toThrow("star_slot_catalog_mismatch");
  });

  it("rejects a malformed persisted checkpoint index before reduction", () => {
    const state = {
      ...createInitialProgressState(),
      checkpointEvidenceIndex: {
        bad: {
          checkpointEpisodeId: "cp",
          tupleKey: "letk1.x",
          state: "passed" as const,
        },
      },
    };
    expect(() => reduceProgress(state, event(1), context)).toThrow(
      "checkpoint_index_invalid",
    );
  });

  it("does not derive loops from a restored node outcome absent from the durable ledger", () => {
    const loopContext = {
      ...context,
      nodeCatalog: {
        encounter: {
          activityId: "activity-1",
          progressCompatibilityKey: "compat-1",
        },
        transfer: {
          activityId: "activity-1",
          progressCompatibilityKey: "compat-1",
        },
      },
      requiredLoopNodeIds: {
        encounterBuild: ["encounter"],
        nearTransfer: ["transfer"],
      },
    };
    const ref = attempt("forged");
    const state = {
      ...createInitialProgressState(),
      nodeOutcomes: {
        encounter: {
          nodeId: "encounter",
          activityId: "activity-1",
          progressCompatibilityKey: "compat-1",
          bestAcceptedAttemptRef: ref,
          bestAcceptedOutcome: { resultCode: "CORRECT" as const },
        },
        transfer: {
          nodeId: "transfer",
          activityId: "activity-1",
          progressCompatibilityKey: "compat-1",
          bestAcceptedAttemptRef: ref,
          bestAcceptedOutcome: { resultCode: "CORRECT" as const },
        },
      },
    };
    expect(deriveRequiredLoopsComplete(state, loopContext)).toBe(false);
    expect(
      deriveRequiredLoopsComplete(state, {
        ...loopContext,
        processedAttemptIndex: { [ref.opId]: ref.attemptBodyHash },
      }),
    ).toBe(true);
  });
});
