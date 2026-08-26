export type LearningV2SessionReviewOutcomeV1 =
  | "correct"
  | "wrong"
  | "skipped";

export type LearningV2SessionReviewHistoryV1 = Readonly<{
  furthestReached: number;
  visibleIndex: number;
  answered: Readonly<Record<number, LearningV2SessionReviewOutcomeV1>>;
}>;

export type LearningV2SessionReviewHistoryEffectV1 =
  | "record_attempt"
  | "award_runes";

export type LearningV2SessionReviewHistoryEventV1 =
  | Readonly<{ kind: "back" | "forward" | "advance" }>
  | Readonly<{
      kind: "answer";
      outcome: LearningV2SessionReviewOutcomeV1;
    }>;

export function createLearningV2SessionReviewHistoryV1(): LearningV2SessionReviewHistoryV1 {
  return Object.freeze({
    furthestReached: 0,
    visibleIndex: 0,
    answered: Object.freeze({}),
  });
}

function transition(
  state: LearningV2SessionReviewHistoryV1,
  effects: readonly LearningV2SessionReviewHistoryEffectV1[] = [],
) {
  return Object.freeze({ state, effects: Object.freeze([...effects]) });
}

export function reduceLearningV2SessionReviewHistoryV1(
  state: LearningV2SessionReviewHistoryV1,
  event: LearningV2SessionReviewHistoryEventV1,
) {
  if (event.kind === "back") {
    return transition(
      Object.freeze({
        ...state,
        visibleIndex: Math.max(0, state.visibleIndex - 1),
      }),
    );
  }
  if (event.kind === "forward") {
    return transition(
      Object.freeze({
        ...state,
        visibleIndex: Math.min(
          state.furthestReached,
          state.visibleIndex + 1,
        ),
      }),
    );
  }
  if (event.kind === "advance") {
    if (state.visibleIndex < state.furthestReached) {
      return reduceLearningV2SessionReviewHistoryV1(state, { kind: "forward" });
    }
    const nextIndex = state.furthestReached + 1;
    return transition(
      Object.freeze({
        ...state,
        furthestReached: nextIndex,
        visibleIndex: nextIndex,
      }),
    );
  }

  if (state.answered[state.visibleIndex]) return transition(state);
  const answered = Object.freeze({
    ...state.answered,
    [state.visibleIndex]: event.outcome,
  });
  return transition(
    Object.freeze({ ...state, answered }),
    event.outcome === "correct"
      ? ["record_attempt", "award_runes"]
      : ["record_attempt"],
  );
}
