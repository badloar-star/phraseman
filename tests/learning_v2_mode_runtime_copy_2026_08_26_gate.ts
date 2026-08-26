import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import {
  learningV2ModeAudioCopyV1,
  learningV2ModeContextGapCopyV1,
  learningV2ModeRepeatCompareCopyV1,
  learningV2ModeSpeedMatchCopyV1,
  learningV2NewWordFlipHintV1,
  learningV2RuneAccessibilityLabelV1,
} from "../modules/learning-v2/modes/mode_copy_v1";

for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
  const audio = learningV2ModeAudioCopyV1(locale);
  const contextGap = learningV2ModeContextGapCopyV1(locale);
  const repeat = learningV2ModeRepeatCompareCopyV1(locale);
  const speed = learningV2ModeSpeedMatchCopyV1(locale);
  const flipHint = learningV2NewWordFlipHintV1(locale);
  const runeLabel = learningV2RuneAccessibilityLabelV1(locale, 3);
  for (const [key, value] of Object.entries({ ...audio, ...contextGap, ...repeat, ...speed, flipHint, runeLabel })) {
    assert.ok(value.trim(), `${locale}:${key}:copy missing`);
  }
  if (locale !== "ru") {
    assert.notEqual(audio.play, "Нажми, чтобы послушать", `${locale}:Russian audio copy leaked`);
    assert.notEqual(speed.title, "Найди пару быстро", `${locale}:Russian speed copy leaked`);
    assert.notEqual(flipHint, "Нажмите на карточку, чтобы перевернуть", `${locale}:Russian flip copy leaked`);
    assert.notEqual(contextGap.title, "Заполни пропуск", `${locale}:Russian context-gap copy leaked`);
    assert.notEqual(repeat.recording, "Идёт запись", `${locale}:Russian repeat copy leaked`);
    assert.notEqual(runeLabel, "3 рун", `${locale}:Russian rune label leaked`);
  }
}

assert.equal(learningV2RuneAccessibilityLabelV1("ru", 1), "1 руна");
assert.equal(learningV2RuneAccessibilityLabelV1("ru", 2), "2 руны");
assert.equal(learningV2RuneAccessibilityLabelV1("ru", 5), "5 рун");
assert.equal(learningV2RuneAccessibilityLabelV1("ru", 11), "11 рун");
assert.equal(learningV2RuneAccessibilityLabelV1("uk", 2), "2 руни");
assert.equal(learningV2RuneAccessibilityLabelV1("pl", 1), "1 runa");
assert.equal(learningV2RuneAccessibilityLabelV1("en", 1), "1 rune");
assert.equal(learningV2RuneAccessibilityLabelV1("en", 3), "3 runes");

const root = resolve(__dirname, "..");
const contextSource = readFileSync(resolve(root, "modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx"), "utf8");
const repeatSource = readFileSync(resolve(root, "modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx"), "utf8");
const listenBuildSource = readFileSync(resolve(root, "modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx"), "utf8");
const playerSource = readFileSync(resolve(root, "app/learning_v2_direct_session_player_v1.tsx"), "utf8");
assert.match(contextSource, /learningV2ModeContextGapCopyV1\(interfaceLocale\)/);
assert.match(repeatSource, /learningV2ModeRepeatCompareCopyV1\(interfaceLocale\)/);
assert.match(listenBuildSource, /en:\s*phrase\s*\?/);
assert.match(playerSource, /learningV2RuneAccessibilityLabelV1\(lang, sessionRunes\)/);
assert.ok(!contextSource.includes('accessibilityLabel="Прослушать фразу"'));
assert.ok(!repeatSource.includes('accessibilityLabel="Прослушать эталон"'));

process.stdout.write("LEARNING V2 MODE RUNTIME COPY GATE: PASS\n");
