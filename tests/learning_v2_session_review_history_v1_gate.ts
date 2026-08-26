import assert from "node:assert/strict";

import {
  createLearningV2SessionReviewHistoryV1,
  reduceLearningV2SessionReviewHistoryV1,
} from "../app/learning_v2_session_review_history_v1";

let state = createLearningV2SessionReviewHistoryV1();
assert.deepEqual(state, {
  furthestReached: 0,
  visibleIndex: 0,
  answered: {},
});

let transition = reduceLearningV2SessionReviewHistoryV1(state, {
  kind: "answer",
  outcome: "correct",
});
state = transition.state;
assert.deepEqual(transition.effects, ["record_attempt", "award_runes"]);

transition = reduceLearningV2SessionReviewHistoryV1(state, { kind: "advance" });
state = transition.state;
assert.equal(state.visibleIndex, 1);
assert.equal(state.furthestReached, 1);

transition = reduceLearningV2SessionReviewHistoryV1(state, { kind: "back" });
state = transition.state;
assert.equal(state.visibleIndex, 0);

transition = reduceLearningV2SessionReviewHistoryV1(state, {
  kind: "answer",
  outcome: "correct",
});
assert.deepEqual(
  transition.effects,
  [],
  "reviewing an answered screen must not award or record twice",
);

transition = reduceLearningV2SessionReviewHistoryV1(transition.state, {
  kind: "forward",
});
assert.equal(transition.state.visibleIndex, 1);
assert.equal(transition.state.furthestReached, 1);
assert.deepEqual(transition.effects, []);

process.stdout.write("LEARNING V2 SESSION REVIEW HISTORY V1 GATE: PASS\n");
