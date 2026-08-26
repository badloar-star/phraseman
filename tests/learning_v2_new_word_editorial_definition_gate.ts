import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import { buildLearningV2AuthoringDevicePreviewV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";

const preview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
const encounters = preview.auxiliaryChild.entries.flatMap((entry) =>
  entry.newWordEncounter ? [entry.newWordEncounter] : [],
);

assert.equal(
  encounters.length,
  4,
  "session 1 must deliver one first-contact card for each of its four new words",
);

for (const encounter of encounters) {
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    const definition = encounter.playfulMeaningByLocale[locale].trim();
    const translation = encounter.save.meaningByLocale[locale].trim();
    assert.ok(
      definition.length >= 24,
      `${encounter.lexicalItemId}:${locale} needs a real manually authored definition`,
    );
    assert.notEqual(
      definition.toLocaleLowerCase(locale),
      translation.toLocaleLowerCase(locale),
      `${encounter.lexicalItemId}:${locale} definition cannot be only the translation`,
    );
  }
}

const root = resolve(__dirname, "..");
const overlay = readFileSync(
  resolve(root, "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx"),
  "utf8",
);
assert.match(overlay, /testID="learning-v2-new-word-definition"/u);
assert.match(overlay, /encounter\.playfulMeaningByLocale\[locale\]/u);
assert.match(overlay, /exactMeaningByLocale\[locale\]/u);

for (const documentPath of [
  "docs/v2/СТАРТ В2.md",
  "docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md",
  "docs/v2/LESSON_DESIGN_RULES.ru.md",
  "docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md",
]) {
  const document = readFileSync(resolve(root, documentPath), "utf8");
  assert.match(
    document,
    /словарн(?:ое|ую|ая|ой)|дефиниц/u,
    `${documentPath} must preserve the editorial dictionary-definition contract`,
  );
}

process.stdout.write("LEARNING V2 NEW WORD EDITORIAL DEFINITION GATE: PASS\n");
