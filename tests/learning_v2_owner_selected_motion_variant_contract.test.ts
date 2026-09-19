import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const map = readFileSync("components/learning-v2/LearningV2PulseCourse.tsx", "utf8");
const modal = readFileSync("components/LearningV2SessionOutcomeSheet.tsx", "utf8");

assert.match(map, /function LearningV2PulseMapEntryRow/);
assert.match(map, /Math\.abs\(index - currentRowIndex\)/);
assert.match(map, /translateY: \(1 - localProgress\) \* 18/);
assert.match(map, /scale: 0\.76 \+ localProgress \* 0\.24/);
assert.match(map, /strokeDashoffset: 900 \* \(1 - progress\.value\)/);
assert.match(map, /strokeDasharray="900 900"/);
assert.match(map, /duration: 580/);
assert.doesNotMatch(map, /onScroll=\{/,
  "the map entrance must stay on the UI thread and must not add JS scroll work");

assert.match(modal, /duration: 320/);
assert.match(modal, /translateY: \(1 - cardProgress\.value\) \* 18/);
assert.match(modal, /scale: 0\.96 \+ cardProgress\.value \* 0\.04/);
assert.match(modal, /sceneProgress\.value = withDelay\(90/);
assert.match(modal, /cardProgress\.value = withTiming\(0/,
  "the whole session modal must animate out before it unmounts");

console.log("LEARNING V2 OWNER-SELECTED MOTION VARIANT CONTRACT: PASS");
