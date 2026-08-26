import assert from "node:assert/strict";

import {
  createLearningV2NewWordAutoFlipControllerV1,
  learningV2NewWordAudioEnabledV1,
} from "../app/learning_v2_new_word_card_runtime_v1";

type Scheduled = Readonly<{ id: number; callback: () => void }>;
let nextId = 0;
const scheduled = new Map<number, Scheduled>();
const flips: string[] = [];

const controller = createLearningV2NewWordAutoFlipControllerV1({
  delayMs: 3_000,
  schedule(callback) {
    const id = ++nextId;
    scheduled.set(id, { id, callback });
    return id;
  },
  cancel(id) {
    scheduled.delete(id as number);
  },
  onAutoFlip() {
    flips.push("auto");
  },
});

controller.arm();
assert.equal(scheduled.size, 1);
controller.manualFlip();
assert.equal(scheduled.size, 0, "manual flip must cancel the pending auto flip");
for (const entry of scheduled.values()) entry.callback();
assert.deepEqual(flips, []);

controller.arm();
const timer = [...scheduled.values()][0];
assert.ok(timer);
timer.callback();
assert.deepEqual(flips, ["auto"], "untouched card must auto-flip once");
controller.dispose();

assert.equal(learningV2NewWordAudioEnabledV1("idle"), true);
assert.equal(learningV2NewWordAudioEnabledV1("playing"), true);
assert.equal(
  learningV2NewWordAudioEnabledV1("unavailable"),
  false,
  "an unavailable word clip must not leave an active speaker button",
);

process.stdout.write("LEARNING V2 NEW WORD RUNTIME BEHAVIOR GATE: PASS\n");
