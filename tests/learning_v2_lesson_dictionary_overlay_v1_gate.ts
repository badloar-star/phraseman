import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx",
  "utf8",
);

assert.match(source, /FlatList/, "dictionary must be the original list model, not cards");
assert.match(source, /<AddToFlashcard/, "each unlocked row needs a real bookmark toggle");
assert.match(source, /speakAudio/, "every row needs repeatable audio");
assert.match(source, /triLang\(lang,/, "dictionary chrome must support every active interface locale");
assert.match(source, /ttsLocaleForStudyTarget/, "dictionary audio must follow the active target language");
assert.doesNotMatch(source, /CollectionDeckView|Training|EnergyCost/, "map dictionary is browse-only");

process.stdout.write("LEARNING V2 LESSON DICTIONARY OVERLAY V1 GATE: PASS\n");
