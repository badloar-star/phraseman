export type LearningV2NewWordEncounterFlowStateV1 =
  | Readonly<{ kind: "inactive" }>
  | Readonly<{
      kind: "presenting";
      index: number;
      total: number;
      encounterId: string;
    }>
  | Readonly<{ kind: "completed" }>;

export type LearningV2NewWordEncounterFlowEventV1 = Readonly<{
  kind:
    | "intro_completed"
    | "continue"
    | "restart"
    | "backdrop_pressed"
    | "answer_pressed"
    | "save_pressed"
    | "audio_pressed";
}>;

export type LearningV2NewWordEncounterFlowEffectV1 =
  | "play_current_audio"
  | "stop_current_audio"
  | "activate_task";

export type LearningV2NewWordEncounterFlowTransitionV1 = Readonly<{
  state: LearningV2NewWordEncounterFlowStateV1;
  effects: readonly LearningV2NewWordEncounterFlowEffectV1[];
}>;

const INACTIVE = Object.freeze({ kind: "inactive" as const });
const COMPLETED = Object.freeze({ kind: "completed" as const });
const NO_EFFECTS = Object.freeze(
  [],
) as readonly LearningV2NewWordEncounterFlowEffectV1[];

function fail(): never {
  throw new Error("learning_v2_new_word_encounter_flow_invalid");
}

function validateQueue(encounterIds: readonly string[]): void {
  if (
    !Array.isArray(encounterIds) ||
    encounterIds.some(
      (id) =>
        typeof id !== "string" ||
        id.length < 1 ||
        id.length > 160 ||
        id !== id.normalize("NFC"),
    ) ||
    new Set(encounterIds).size !== encounterIds.length
  )
    fail();
}

function transition(
  state: LearningV2NewWordEncounterFlowStateV1,
  effects: readonly LearningV2NewWordEncounterFlowEffectV1[] = NO_EFFECTS,
): LearningV2NewWordEncounterFlowTransitionV1 {
  return Object.freeze({ state, effects: Object.freeze([...effects]) });
}

function presenting(
  index: number,
  encounterIds: readonly string[],
): LearningV2NewWordEncounterFlowStateV1 {
  const encounterId = encounterIds[index];
  if (!encounterId) fail();
  return Object.freeze({
    kind: "presenting" as const,
    index,
    total: encounterIds.length,
    encounterId,
  });
}

export function createLearningV2NewWordEncounterFlowV1(
  encounterIds: readonly string[],
): LearningV2NewWordEncounterFlowStateV1 {
  validateQueue(encounterIds);
  return encounterIds.length === 0 ? COMPLETED : INACTIVE;
}

export function reduceLearningV2NewWordEncounterFlowV1(
  state: LearningV2NewWordEncounterFlowStateV1,
  event: LearningV2NewWordEncounterFlowEventV1,
  encounterIds: readonly string[],
): LearningV2NewWordEncounterFlowTransitionV1 {
  validateQueue(encounterIds);

  if (event.kind === "restart") {
    return transition(
      createLearningV2NewWordEncounterFlowV1(encounterIds),
      state.kind === "presenting" ? ["stop_current_audio"] : NO_EFFECTS,
    );
  }

  if (state.kind === "completed") return transition(state);

  if (state.kind === "inactive") {
    if (event.kind !== "intro_completed") return transition(state);
    if (encounterIds.length === 0) return transition(COMPLETED);
    return transition(presenting(0, encounterIds), ["play_current_audio"]);
  }

  if (
    state.total !== encounterIds.length ||
    state.index < 0 ||
    state.index >= state.total ||
    encounterIds[state.index] !== state.encounterId
  )
    fail();

  if (event.kind !== "continue") return transition(state);
  const nextIndex = state.index + 1;
  if (nextIndex < encounterIds.length) {
    return transition(presenting(nextIndex, encounterIds), [
      "stop_current_audio",
      "play_current_audio",
    ]);
  }
  return transition(COMPLETED, ["stop_current_audio", "activate_task"]);
}
