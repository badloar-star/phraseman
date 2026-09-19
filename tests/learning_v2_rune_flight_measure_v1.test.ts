import assert from "node:assert/strict";

import {
  measureLearningV2RuneFlightWithRetryV1,
  type LearningV2RuneMeasureNodeV1,
} from "../app/learning_v2_rune_flight_measure_v1";
import { projectLearningV2InteractionRuneAwardV1 } from "../modules/learning-v2/progress/interaction_rune_award_v1";

const node = (rect: readonly [number, number, number, number]): LearningV2RuneMeasureNodeV1 => ({
  measureInWindow: (callback) => callback(...rect),
});

assert.equal(projectLearningV2InteractionRuneAwardV1({ learnerAttempts: 1, hintUsed: false }), 3);
assert.equal(projectLearningV2InteractionRuneAwardV1({ learnerAttempts: 2, hintUsed: false }), 2);
assert.equal(projectLearningV2InteractionRuneAwardV1({ learnerAttempts: 3, hintUsed: false }), 1);

const scheduled: Array<() => void> = [];
let origin: LearningV2RuneMeasureNodeV1 | null = null;
let measured: unknown = null;
measureLearningV2RuneFlightWithRetryV1({
  getOrigin: () => origin,
  getCounter: () => node([100, 40, 20, 20]),
  schedule: (callback) => { scheduled.push(callback); },
  shouldContinue: () => true,
  onMeasured: (value) => { measured = value; },
});
assert.equal(scheduled.length, 1, "a missing layout must retry on the next frame");
origin = node([10, 20, 30, 40]);
scheduled.shift()?.();
assert.deepEqual(measured, {
  from: { x: 25, y: 40 },
  to: { x: 110, y: 50 },
});

const invalidRetries: Array<() => void> = [];
measureLearningV2RuneFlightWithRetryV1({
  getOrigin: () => node([0, 0, 0, 0]),
  getCounter: () => node([0, 0, 0, 0]),
  schedule: (callback) => { invalidRetries.push(callback); },
  shouldContinue: () => true,
  onMeasured: () => assert.fail("zero-size layouts must never animate"),
  maxAttempts: 3,
});
invalidRetries.shift()?.();
invalidRetries.shift()?.();
assert.equal(invalidRetries.length, 0, "measurement retries must be bounded");

console.log("LEARNING V2 RUNE FLIGHT MEASURE: PASS");
