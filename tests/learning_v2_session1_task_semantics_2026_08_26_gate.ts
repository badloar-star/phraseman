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
    "я",
  ],
  "meaning choices must be plain locale-native meanings without grammar jargon",
);
assert.ok(
  !amMeaning.responseOptions.some((entry) => entry.text.includes("словарн")),
  "an A0 learner must never need the term 'dictionary form' to answer a meaning task",
);

const root = resolve(__dirname, "..");
const phraseBuilder = readFileSync(
  resolve(root, "modules/learning-v2/modes/phrase_builder_mode_v1.tsx"),
  "utf8",
);
// зачем (владелец 22.10, колонка «Предлагаем»): прежняя серая строка задания заменена общим началом тела — «Собери фразу» со значком и карточка ситуации
assert.match(phraseBuilder, /<LearningV2TaskLead[^>]*parts={parts}/);
// смысл фразы (цель «Скажите по-английски») теперь берут правила Learning V2 из разбора фразы задания
assert.match(phraseBuilder, /useLearningV2TaskParts\(\{[^}]*modePayload/);

const listenBuild = readFileSync(
  resolve(root, "modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx"),
  "utf8",
);
// зачем (владелец 22.10, колонка «Предлагаем»): название диктанта постоянное — «Послушай и собери» (по правилам Learning V2), ситуация видна отдельной карточкой
assert.match(listenBuild, /<LearningV2TaskLead[^>]*parts=\{parts\}/);

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
