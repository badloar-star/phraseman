import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
const course = readFileSync(
  "components/learning-v2/LearningV2PulseCourse.tsx",
  "utf8",
);
const overlay = readFileSync(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  "utf8",
);
const unlockedHook = readFileSync(
  "hooks/use_learning_v2_unlocked_lesson_words_v1.ts",
  "utf8",
);

assert.match(lessons, /testID="learning-v2-map-dictionary-open"/);
assert.match(
  lessons,
  /learning-v2-map-dictionary-open[\s\S]{0,1800}width:\s*44[\s\S]{0,300}height:\s*44/,
  "dictionary control must be a compact 44×44 header target",
);
assert.match(
  lessons,
  /learningV2ResourceHud[\s\S]{0,2200}learning-v2-map-dictionary-open/,
  "dictionary control must live in the resource header",
);
assert.doesNotMatch(course, /dictionaryControl/);
assert.doesNotMatch(course, /styles\.dictionary/);

assert.match(overlay, /onPresented\(\)/);
assert.match(
  unlockedHook,
  /subscribeLearningV2UnlockedLessonWordsV1/,
  "dictionary must project durable presented-word receipts",
);

console.log("LEARNING V2 DICTIONARY VISIBILITY CONTRACT: PASS");
