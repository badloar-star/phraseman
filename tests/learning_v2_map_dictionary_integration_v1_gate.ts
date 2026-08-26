import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/(tabs)/lessons.tsx", "utf8");

assert.match(
  source,
  /import\s*\{[^}]*\bPressable\b[^}]*\}\s*from\s*"react-native"/s,
  "the floating dictionary control must use an imported React Native Pressable",
);
assert.match(
  source,
  /LearningV2LessonDictionaryOverlayV1/,
  "the Learning V2 map must render the real lesson dictionary overlay",
);
assert.match(
  source,
  /useLearningV2UnlockedLessonWordsV1/,
  "the map dictionary must read the durable lesson-scoped unlock registry",
);
assert.match(
  source,
  /testID="learning-v2-map-dictionary-open"/,
  "the expanded lesson needs an owner-visible floating dictionary control",
);
assert.match(
  source,
  /page === "v2" && expandedLearningV2Lesson !== null/,
  "the map dictionary control must be scoped to one expanded Learning V2 lesson",
);
assert.match(
  source,
  /words={learningV2DictionaryWords}/,
  "the overlay must receive only unlocked words from the active lesson",
);

process.stdout.write("LEARNING V2 MAP DICTIONARY INTEGRATION V1 GATE: PASS\n");
