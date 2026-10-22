import assert from "node:assert/strict";

import {
  createLearningV2InterleavedNewWordFlowV1,
  reduceLearningV2InterleavedNewWordFlowV1,
  shouldAutoplayLearningV2PracticeAudioV1,
} from "../app/learning_v2_interleaved_new_word_flow_v1";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
let state = createLearningV2InterleavedNewWordFlowV1();

let transition = reduceLearningV2InterleavedNewWordFlowV1(state, {
  kind: "practice_reached",
  encounterId: "ready",
});
assert.equal(transition.state.kind, "presenting");
assert.deepEqual(transition.effects, ["play_current_audio"]);

state = transition.state;
transition = reduceLearningV2InterleavedNewWordFlowV1(state, {
  kind: "continue",
});
assert.deepEqual(transition.effects, [
  "stop_current_audio",
  "play_practice_audio_after_continue",
]);
assert.equal(transition.state.kind, "ready");
assert.deepEqual(transition.state.seenEncounterIds, ["ready"]);

state = transition.state;
transition = reduceLearningV2InterleavedNewWordFlowV1(state, {
  kind: "practice_reached",
  encounterId: "ready",
});
assert.equal(transition.state.kind, "ready");
assert.deepEqual(transition.effects, []);

transition = reduceLearningV2InterleavedNewWordFlowV1(transition.state, {
  kind: "practice_reached",
  encounterId: null,
});
assert.equal(transition.state.kind, "ready");

transition = reduceLearningV2InterleavedNewWordFlowV1(transition.state, {
  kind: "practice_reached",
  encounterId: "home",
});
assert.equal(transition.state.kind, "presenting");

transition = reduceLearningV2InterleavedNewWordFlowV1(transition.state, {
  kind: "restart",
});
assert.equal(transition.state.kind, "ready");
assert.deepEqual(transition.state.seenEncounterIds, []);
assert.deepEqual(transition.effects, ["stop_current_audio"]);

transition = reduceLearningV2InterleavedNewWordFlowV1(transition.state, {
  kind: "practice_reached",
  encounterId: null,
  encounterIds: ["first", "second"],
});
assert.equal(transition.state.kind, "presenting");
assert.equal(transition.state.kind === "presenting" ? transition.state.encounterId : null, "first");
transition = reduceLearningV2InterleavedNewWordFlowV1(transition.state, { kind: "continue" });
assert.deepEqual(transition.effects, ["stop_current_audio", "play_current_audio"]);
assert.equal(transition.state.kind === "presenting" ? transition.state.encounterId : null, "second");
transition = reduceLearningV2InterleavedNewWordFlowV1(transition.state, { kind: "continue" });
assert.deepEqual(transition.effects, ["stop_current_audio", "play_practice_audio_after_continue"]);
assert.deepEqual(transition.state.seenEncounterIds, ["first", "second"]);

// A continue request is one-shot. When the next practice is committed, its
// phrase callback changes before the new-word layout gate has painted. The
// already-consumed token must not replay that phrase over the new word clip.
assert.equal(shouldAutoplayLearningV2PracticeAudioV1({
  requestedToken: 1,
  consumedToken: 0,
  practiceActivated: true,
  referenceAvailable: true,
}), true);
assert.equal(shouldAutoplayLearningV2PracticeAudioV1({
  requestedToken: 1,
  consumedToken: 1,
  practiceActivated: true,
  referenceAvailable: true,
}), false);

// A new request remains pending while its word card owns the screen, then
// becomes eligible once that card has been continued.
assert.equal(shouldAutoplayLearningV2PracticeAudioV1({
  requestedToken: 2,
  consumedToken: 1,
  practiceActivated: false,
  referenceAvailable: true,
}), false);
assert.equal(shouldAutoplayLearningV2PracticeAudioV1({
  requestedToken: 2,
  consumedToken: 1,
  practiceActivated: true,
  referenceAvailable: true,
}), true);

process.stdout.write("LEARNING V2 INTERLEAVED NEW WORD FLOW: PASS\n");
}

if (typeof test === "function") {
  test("learning_v2_interleaved_new_word_flow_v1", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
