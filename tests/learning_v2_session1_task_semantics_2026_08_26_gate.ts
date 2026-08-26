import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildLearningV2AuthoringDevicePreviewV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";

const preview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
const interactions = preview.learnerChild.interactions;
const amMeaning = interactions[5];
assert.ok(amMeaning, "the standalone am meaning contact must be present");
assert.equal(amMeaning.prompt, "Выберите точное значение слова.");
assert.deepEqual(
  amMeaning.responseOptions.map((entry) => entry.text),
  [
    "есть / являюсь",
    "неопределённый артикль an",
    "буква m",
    "быть — словарная форма",
  ],
  "meaning choices must be locale-native meanings, not another set of English spellings",
);

const root = resolve(__dirname, "..");
const phraseBuilder = readFileSync(
  resolve(root, "modules/learning-v2/modes/phrase_builder_mode_v1.tsx"),
  "utf8",
);
assert.match(phraseBuilder, /styles\.taskLabel/);
assert.match(phraseBuilder, /localizedMeaning\[interfaceLocale\]/);

const listenBuild = readFileSync(
  resolve(root, "modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx"),
  "utf8",
);
assert.match(listenBuild, /phrase \? "Послушай и собери фразу" : "Послушай и собери слово"/);

const speedMatch = readFileSync(
  resolve(root, "modules/learning-v2/modes/speed_match_mode_v1.tsx"),
  "utf8",
);
assert.ok(
  speedMatch.includes("<V2Chip") && speedMatch.includes("singleLine"),
  "pair tiles must reuse the canonical Arena V2Chip with single-line labels",
);
assert.ok(!speedMatch.includes("runOnJS"), "touched mode motion must use scheduleOnRN");

process.stdout.write("LEARNING V2 SESSION 1 TASK SEMANTICS 2026-08-26 GATE: PASS\n");
