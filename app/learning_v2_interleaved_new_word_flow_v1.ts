export type LearningV2InterleavedNewWordFlowStateV1 =
  | Readonly<{
      kind: "ready";
      seenEncounterIds: readonly string[];
    }>
  | Readonly<{
      kind: "presenting";
      encounterId: string;
      seenEncounterIds: readonly string[];
    }>;

export type LearningV2InterleavedNewWordFlowEventV1 =
  | Readonly<{ kind: "practice_reached"; encounterId: string | null }>
  | Readonly<{ kind: "continue" }>
  | Readonly<{ kind: "restart" }>
  | Readonly<{ kind: "audio_pressed" }>
  | Readonly<{ kind: "save_pressed" }>;

export type LearningV2InterleavedNewWordFlowEffectV1 =
  | "play_current_audio"
  | "play_practice_audio_after_continue"
  | "stop_current_audio";

export type LearningV2InterleavedNewWordFlowTransitionV1 = Readonly<{
  state: LearningV2InterleavedNewWordFlowStateV1;
  effects: readonly LearningV2InterleavedNewWordFlowEffectV1[];
}>;

const NO_EFFECTS = Object.freeze(
  [],
) as readonly LearningV2InterleavedNewWordFlowEffectV1[];

function ready(
  seenEncounterIds: readonly string[],
): LearningV2InterleavedNewWordFlowStateV1 {
  return Object.freeze({
    kind: "ready" as const,
    seenEncounterIds: Object.freeze([...seenEncounterIds]),
  });
}

function transition(
  state: LearningV2InterleavedNewWordFlowStateV1,
  effects: readonly LearningV2InterleavedNewWordFlowEffectV1[] = NO_EFFECTS,
): LearningV2InterleavedNewWordFlowTransitionV1 {
  return Object.freeze({ state, effects: Object.freeze([...effects]) });
}

function validEncounterId(value: string): boolean {
  return (
    value.length > 0 && value.length <= 160 && value === value.normalize("NFC")
  );
}

export function createLearningV2InterleavedNewWordFlowV1(): LearningV2InterleavedNewWordFlowStateV1 {
  return ready([]);
}

export function reduceLearningV2InterleavedNewWordFlowV1(
  state: LearningV2InterleavedNewWordFlowStateV1,
  event: LearningV2InterleavedNewWordFlowEventV1,
): LearningV2InterleavedNewWordFlowTransitionV1 {
  if (event.kind === "restart") {
    return transition(
      ready([]),
      state.kind === "presenting" ? ["stop_current_audio"] : NO_EFFECTS,
    );
  }

  if (state.kind === "presenting") {
    if (event.kind !== "continue") return transition(state);
    return transition(
      ready([...state.seenEncounterIds, state.encounterId]),
      ["stop_current_audio", "play_practice_audio_after_continue"],
    );
  }

  if (event.kind !== "practice_reached" || event.encounterId === null)
    return transition(state);
  if (!validEncounterId(event.encounterId))
    throw new Error("learning_v2_interleaved_new_word_flow_invalid");
  if (state.seenEncounterIds.includes(event.encounterId))
    return transition(state);

  return transition(
    Object.freeze({
      kind: "presenting" as const,
      encounterId: event.encounterId,
      seenEncounterIds: state.seenEncounterIds,
    }),
    ["play_current_audio"],
  );
}
