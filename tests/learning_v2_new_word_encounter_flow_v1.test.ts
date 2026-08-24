import {
  createLearningV2NewWordEncounterFlowV1,
  reduceLearningV2NewWordEncounterFlowV1,
} from "../app/learning_v2_new_word_encounter_flow_v1";

const QUEUE = ["word-i", "word-am"] as const;

describe("Learning V2 new-word blocking flow", () => {
  test("waits for intro, presents words in order and activates practice once", () => {
    const initial = createLearningV2NewWordEncounterFlowV1(QUEUE);
    expect(initial).toEqual({ kind: "inactive" });

    const first = reduceLearningV2NewWordEncounterFlowV1(
      initial,
      { kind: "intro_completed" },
      QUEUE,
    );
    expect(first).toEqual({
      state: {
        kind: "presenting",
        index: 0,
        total: 2,
        encounterId: "word-i",
      },
      effects: ["play_current_audio"],
    });

    const second = reduceLearningV2NewWordEncounterFlowV1(
      first.state,
      { kind: "continue" },
      QUEUE,
    );
    expect(second.effects).toEqual([
      "stop_current_audio",
      "play_current_audio",
    ]);
    expect(second.state).toMatchObject({
      kind: "presenting",
      index: 1,
      encounterId: "word-am",
    });

    const completed = reduceLearningV2NewWordEncounterFlowV1(
      second.state,
      { kind: "continue" },
      QUEUE,
    );
    expect(completed).toEqual({
      state: { kind: "completed" },
      effects: ["stop_current_audio", "activate_task"],
    });
    expect(
      reduceLearningV2NewWordEncounterFlowV1(
        completed.state,
        { kind: "continue" },
        QUEUE,
      ).effects,
    ).toEqual([]);
  });

  test("keeps the underlying task inert for every event except final continue", () => {
    const presenting = reduceLearningV2NewWordEncounterFlowV1(
      createLearningV2NewWordEncounterFlowV1(QUEUE),
      { kind: "intro_completed" },
      QUEUE,
    ).state;
    for (const kind of [
      "backdrop_pressed",
      "answer_pressed",
      "save_pressed",
      "audio_pressed",
    ] as const) {
      expect(
        reduceLearningV2NewWordEncounterFlowV1(
          presenting,
          { kind },
          QUEUE,
        ),
      ).toEqual({ state: presenting, effects: [] });
    }
  });

  test("completes an empty queue immediately and restart restores the initial gate", () => {
    expect(createLearningV2NewWordEncounterFlowV1([])).toEqual({
      kind: "completed",
    });
    const presenting = reduceLearningV2NewWordEncounterFlowV1(
      createLearningV2NewWordEncounterFlowV1(QUEUE),
      { kind: "intro_completed" },
      QUEUE,
    ).state;
    expect(
      reduceLearningV2NewWordEncounterFlowV1(
        presenting,
        { kind: "restart" },
        QUEUE,
      ),
    ).toEqual({ state: { kind: "inactive" }, effects: ["stop_current_audio"] });
  });
});
