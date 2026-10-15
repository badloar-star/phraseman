#!/usr/bin/env node
// Replaces two mechanically duplicated drills with distinct, answerable work.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-17";
const atomicPath = path.join(root, "sessions/en/l01/s17/practice.atomic.json");
const ledgerPath = path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
const id = (suffix) => `${session}:${suffix}`;

for (const locale of ["ru", "uk"]) {
  const interactions = atomic.interactionsByLocale[locale];
  const sound = interactions.find((item) => item.interactionId === id("i08"));
  const build = interactions.find((item) => item.interactionId === id("i12"));
  if (!sound || !build) throw new Error(`missing target interaction for ${locale}`);

  const soundPrompt = locale === "ru"
    ? "Различите звуки — new или no"
    : "Розрізніть звуки — new чи no";
  Object.assign(sound, {
    family: "sound_contrast", inputMode: "single_choice", prompt: soundPrompt,
    responseOptions: [{ responseId: id("i08:r1"), text: "new" }, { responseId: id("i08:r2"), text: "no" }],
    audioTargetIds: [id("i08:audioA"), id("i08:audioB")], accessibilityLabel: soundPrompt,
    modePayload: {
      family: "sound_contrast", contrastA: "new", contrastB: "no", ipaA: "", ipaB: "",
      audioA: { audioTargetId: id("i08:audioA"), transcript: "new" },
      audioB: { audioTargetId: id("i08:audioB"), transcript: "no" },
      testedPhoneticContrast: locale === "ru" ? "Выберите услышанное слово: new или no." : "Оберіть почуте слово: new чи no.",
      choiceFeedback: [{ responseId: id("i08:r2"), correct: false, testedDimension: "new or no", feedbackByLocale: {
        ru: "`no` — «нет». Здесь прозвучало `new` — «новый».",
        uk: "`no` — «ні». Тут прозвучало `new` — «новий»."
      }}]
    }, scriptedAlternate: null,
  });

  const buildPrompt = locale === "ru"
    ? "Соберите фразу — парень у окна зевает третий раз подряд"
    : "Складіть фразу — хлопець біля вікна позіхає втретє поспіль";
  Object.assign(build, {
    family: "phrase_builder", inputMode: "ordered_tokens", prompt: buildPrompt,
    responseOptions: [], mediaIds: [], audioTargetIds: [], accessibilityLabel: buildPrompt,
    modePayload: { family: "phrase_builder", targetPhrase: "He is tired.", orderedTokens: ["He", "is", "tired"], authoredDistractorTokens: [], slotFeedback: [] },
    scriptedAlternate: null,
  });

  const spoken = interactions.find((item) => item.interactionId === id("i17"));
  const spokenPrompt = locale === "ru"
    ? "Скажите вслух — парень у окна зевает третий раз подряд"
    : "Скажіть уголос — хлопець біля вікна позіхає втретє поспіль";
  Object.assign(spoken, {
    purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare", prompt: spokenPrompt,
    responseOptions: [], audioTargetIds: [id("i17:audio")], accessibilityLabel: spokenPrompt,
    modePayload: {
      family: "scripted_repeat_compare", referenceAudio: { audioTargetId: id("i17:audio"), transcript: "He is tired." },
      slowReferenceAudio: null, targetPhrase: "He is tired.", recordControlPolicy: "hold_press_release_with_accessible_toggle",
      modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"]
    }, scriptedAlternate: null,
  });
}
atomic.answers = atomic.answers.filter((answer) => ![id("i08"), id("i12")].includes(answer.interactionId));
atomic.answers.push({ interactionId: id("i08"), correctText: "new", correctResponseId: id("i08:r1") });
atomic.answers.push({ interactionId: id("i12"), correctText: "He is tired.", correctResponseId: null });
fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const i12Row = ledger.rows.find((row) => row.courseSessionId === session && row.oldInteractionId === id("i12") && row.segmentIndex === 1);
if (!i12Row) throw new Error("missing preservation row for i12");
Object.assign(i12Row, { newInteractionId: id("i12"), newTargetSegment: "He is tired.", correctText: "He is tired.", audioTranscript: null });
const i08Row = ledger.rows.find((row) => row.courseSessionId === session && row.oldInteractionId === id("i08") && row.segmentIndex === 1);
const i17Row = ledger.rows.find((row) => row.courseSessionId === session && row.oldInteractionId === id("i17") && row.segmentIndex === 1);
if (!i08Row || !i17Row) throw new Error("missing preservation row for changed practice");
Object.assign(i08Row, { newInteractionId: id("i08"), newTargetSegment: "new", correctText: "new", audioTranscript: null });
Object.assign(i17Row, { newInteractionId: id("i17"), newTargetSegment: "He is tired.", correctText: "He is tired.", audioTranscript: "He is tired." });
ledger.amendments = (ledger.amendments ?? []).filter((item) => !(item.courseSessionId === session && item.oldInteractionId === id("i12") && item.segmentIndex === 1));
ledger.amendments.push({
  courseSessionId: session, oldInteractionId: id("i12"), segmentIndex: 1,
  from: "He is ___ .", to: "He is tired.",
  reason: "Replaced a repeated gap with phrase construction in the same named, factual office scene (2026-10-10).",
});
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

const markdownChanges = {
  "final.ru.md": [
    ["**8 · Карточка слова — new**\n<!-- interaction_id: en:lesson-01:session-17:i08; family: listen_choose -->\nЦель: `new`", "**8 · Различите звуки — new или no**\n<!-- interaction_id: en:lesson-01:session-17:i08; family: sound_contrast -->\nЦель: `new`\nВарианты: `new` · `no`"],
    ["**12 · Вставьте слово — парень у окна зевает третий раз подряд**\n<!-- interaction_id: en:lesson-01:session-17:i12; family: context_gap_grammar -->\nЦель: `He is ___ .`\nВарианты: `tired` · `new` · `tall`", "**12 · Соберите фразу — парень у окна зевает третий раз подряд**\n<!-- interaction_id: en:lesson-01:session-17:i12; family: phrase_builder -->\nЦель: `He is tired.`"],
    ["**17 · Соберите фразу — тот же парень у окна к обеду совсем сник**\n<!-- interaction_id: en:lesson-01:session-17:i17; family: phrase_builder -->", "**17 · Скажите вслух — парень у окна зевает третий раз подряд**\n<!-- interaction_id: en:lesson-01:session-17:i17; family: scripted_repeat_compare -->"],
    ["modes: 1=listen_choose, 2=listen_choose, 3=listen_choose, 4=listen_choose, 5=phrase_builder, 6=context_gap_grammar, 7=listen_choose, 8=sound_contrast, 9=listen_build_dictation, 10=context_gap_grammar, 11=listen_choose, 12=phrase_builder, 13=speed_match, 14=listen_choose, 15=phrase_builder, 16=context_gap_grammar, 17=phrase_builder", "modes: 1=listen_choose, 2=listen_choose, 3=listen_choose, 4=listen_choose, 5=phrase_builder, 6=context_gap_grammar, 7=listen_choose, 8=sound_contrast, 9=listen_build_dictation, 10=context_gap_grammar, 11=listen_choose, 12=phrase_builder, 13=speed_match, 14=listen_choose, 15=phrase_builder, 16=context_gap_grammar, 17=scripted_repeat_compare"],
  ],
  "final.uk.md": [
    ["**8 · Картка слова — new**\n<!-- interaction_id: en:lesson-01:session-17:i08; family: listen_choose -->\nЦіль: `new`", "**8 · Розрізніть звуки — new чи no**\n<!-- interaction_id: en:lesson-01:session-17:i08; family: sound_contrast -->\nЦіль: `new`\nВаріанти: `new` · `no`"],
    ["**12 · Вставте слово — хлопець біля вікна позіхає втретє поспіль**\n<!-- interaction_id: en:lesson-01:session-17:i12; family: context_gap_grammar -->\nЦіль: `He is ___ .`\nВаріанти: `tired` · `new` · `tall`", "**12 · Складіть фразу — хлопець біля вікна позіхає втретє поспіль**\n<!-- interaction_id: en:lesson-01:session-17:i12; family: phrase_builder -->\nЦіль: `He is tired.`"],
    ["**17 · Складіть фразу — той самий хлопець біля вікна до обіду зовсім знітився**\n<!-- interaction_id: en:lesson-01:session-17:i17; family: phrase_builder -->", "**17 · Скажіть уголос — хлопець біля вікна позіхає втретє поспіль**\n<!-- interaction_id: en:lesson-01:session-17:i17; family: scripted_repeat_compare -->"],
    ["modes: 1=listen_choose, 2=listen_choose, 3=listen_choose, 4=listen_choose, 5=phrase_builder, 6=context_gap_grammar, 7=listen_choose, 8=sound_contrast, 9=listen_build_dictation, 10=context_gap_grammar, 11=listen_choose, 12=phrase_builder, 13=speed_match, 14=listen_choose, 15=phrase_builder, 16=context_gap_grammar, 17=phrase_builder", "modes: 1=listen_choose, 2=listen_choose, 3=listen_choose, 4=listen_choose, 5=phrase_builder, 6=context_gap_grammar, 7=listen_choose, 8=sound_contrast, 9=listen_build_dictation, 10=context_gap_grammar, 11=listen_choose, 12=phrase_builder, 13=speed_match, 14=listen_choose, 15=phrase_builder, 16=context_gap_grammar, 17=scripted_repeat_compare"],
  ],
};
for (const [name, replacements] of Object.entries(markdownChanges)) {
  const file = path.join(root, "sessions/en/l01/s17", name);
  let text = fs.readFileSync(file, "utf8");
  for (const [before, after] of replacements) {
    if (text.includes(before)) text = text.replace(before, after);
    else if (!text.includes(after)) throw new Error(`${name}: expected text not found`);
  }
  fs.writeFileSync(file, text);
}
