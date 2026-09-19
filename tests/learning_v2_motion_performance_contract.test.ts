import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const course = readFileSync(
  "components/learning-v2/LearningV2PulseCourse.tsx",
  "utf8",
);
const outcome = readFileSync(
  "components/LearningV2SessionOutcomeSheet.tsx",
  "utf8",
);

// Viewability may update a ref while scrolling, but repeat preparation must
// wait until the list is fully settled. In particular, a drag-end callback
// must be cancelled when native momentum begins.
assert.match(course, /visibleSessionRowsRef = useRef/);
assert.match(course, /onViewableItemsChangedRef = useRef/);
assert.match(course, /scheduleVisibleSessionsSettledAfterDrag/);
assert.match(course, /cancelVisibleSessionsSettledAfterDrag/);
assert.match(course, /onMomentumScrollBegin=\{cancelVisibleSessionsSettledAfterDrag\}/);
assert.match(course, /onMomentumScrollEnd=\{handleMomentumScrollEnd\}/);
assert.match(course, /onScrollEndDrag=\{scheduleVisibleSessionsSettledAfterDrag\}/);
assert.doesNotMatch(course, /withRepeat/);
assert.match(course, /removeClippedSubviews/);
assert.match(course, /getItemLayout=/);

assert.match(outcome, /const sceneProgress = useSharedValue\(0\)/);
assert.match(outcome, /const leave = useCallback/);
assert.match(outcome, /const dismiss = useCallback[\s\S]{0,180}leave\(onClose\)/);
assert.match(outcome, /leave\(onPrimaryPress, true\)/);
assert.match(outcome, /leave\(onSecondaryPress, true\)/);
assert.doesNotMatch(outcome, /withRepeat/);

console.log("LEARNING V2 MOTION PERFORMANCE CONTRACT: PASS");
