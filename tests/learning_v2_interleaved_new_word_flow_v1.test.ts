import assert from "node:assert/strict";

import {
  createLearningV2InterleavedNewWordFlowV1,
  reduceLearningV2InterleavedNewWordFlowV1,
} from "../app/learning_v2_interleaved_new_word_flow_v1";

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

process.stdout.write("LEARNING V2 INTERLEAVED NEW WORD FLOW: PASS\n");
