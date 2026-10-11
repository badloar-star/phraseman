#!/usr/bin/env node
import fs from "node:fs";

const session = "en:lesson-01:session-15";
const sourcePath = "sessions/en/l01/s15/practice.atomic.json";
const ledgerPath = "migration/single-phrase-2026-10-03/preservation-ledger.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const local = (locale, ru, uk) => locale === "ru" ? ru : uk;

function contrast(locale) {
  const prompt = local(locale, "Различите звуки — какое слово описывает человека, который спокойно читает после отмены поезда?", "Розрізніть звуки — яке слово описує людину, що спокійно читає після скасування поїзда?");
  return { interactionId: `${session}:i15`, ordinal: 0, purpose: "guided_practice", family: "sound_contrast", inputMode: "single_choice", prompt, responseOptions: [{ responseId: `${session}:i15:r1`, text: "calm" }, { responseId: `${session}:i15:r2`, text: "come" }], mediaIds: [], audioTargetIds: [`${session}:i15:audioA`, `${session}:i15:audioB`], accessibilityLabel: prompt,
    modePayload: { family: "sound_contrast", contrastA: "calm", contrastB: "come", ipaA: "", ipaB: "", audioA: { audioTargetId: `${session}:i15:audioA`, transcript: "calm" }, audioB: { audioTargetId: `${session}:i15:audioB`, transcript: "come" }, testedPhoneticContrast: prompt, choiceFeedback: [{ responseId: `${session}:i15:r2`, correct: false, testedDimension: "calm or come", feedbackByLocale: { ru: "`come` — «приходить». Здесь описано состояние человека: `calm`.", uk: "`come` — «приходити». Тут описано стан людини: `calm`." } }] }, scriptedAlternate: null };
}
function dictation(locale, id, target, ru, uk) {
  const prompt = local(locale, ru, uk);
  return { interactionId: `${session}:${id}`, ordinal: 0, purpose: "retrieval_practice", family: "listen_build_dictation", inputMode: "ordered_tokens", prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:${id}:audio`], accessibilityLabel: prompt,
    modePayload: { family: "listen_build_dictation", referenceAudio: { audioTargetId: `${session}:${id}:audio`, transcript: target }, slowReferenceAudio: null, hiddenTargetPhrase: target, orderedTokens: target.replace(/[.]/gu, "").split(/\s+/u), authoredDistractorTokens: ["is"], slotFeedback: [] }, scriptedAlternate: null };
}
function spoken(locale) {
  const prompt = local(locale, "Скажите вслух — Мира придержала дверь для человека с коробками и сказала «спасибо»; скажите, что она вежливая", "Скажіть уголос — Міра притримала двері для людини з коробками й сказала «дякую»; скажіть, що вона ввічлива");
  return { interactionId: `${session}:i20`, ordinal: 0, purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare", prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:i20:audio`], accessibilityLabel: prompt,
    modePayload: { family: "scripted_repeat_compare", referenceAudio: { audioTargetId: `${session}:i20:audio`, transcript: "You are polite." }, slowReferenceAudio: null, targetPhrase: "You are polite.", recordControlPolicy: "hold_press_release_with_accessible_toggle", modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture", honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"] }, scriptedAlternate: null };
}

for (const locale of ["ru", "uk"]) {
  const items = source.interactionsByLocale[locale];
  const replace = (id, value) => { const index = items.findIndex((entry) => entry.interactionId === `${session}:${id}`); if (index < 0) throw new Error(`missing ${id}`); items[index] = value; };
  replace("i15", contrast(locale));
  replace("i17:s02", dictation(locale, "i17:s02", "I am not sad.", "Послушайте и соберите — Вика думает, что вы расстроены; скажите, что вы не грустите", "Послухайте й складіть — Віка думає, що ви засмучені; скажіть, що вам не сумно"));
  replace("i19:s02", dictation(locale, "i19:s02", "I am tired.", "Послушайте и соберите — Дан зовёт гулять, но вы весь день носили коробки; скажите, что вы устали", "Послухайте й складіть — Дан кличе гуляти, але ви весь день носили коробки; скажіть, що ви втомилися"));
  const chain = items.findIndex((entry) => entry.interactionId === `${session}:i20:s01`);
  if (chain >= 0) items.splice(chain, 3, spoken(locale)); else replace("i20", spoken(locale));
  items.forEach((entry, index) => { entry.ordinal = index + 4; });
}
source.answers = source.answers.filter((answer) => !["i15", "i17:s02", "i19:s02", "i20"].includes(answer.interactionId.slice(session.length + 1)) && !answer.interactionId.startsWith(`${session}:i20:`));
source.answers.push(
  { interactionId: `${session}:i15`, correctText: "calm", correctResponseId: `${session}:i15:r1` },
  { interactionId: `${session}:i17:s02`, correctText: "I am not sad.", correctResponseId: null },
  { interactionId: `${session}:i19:s02`, correctText: "I am tired.", correctResponseId: null },
  { interactionId: `${session}:i20`, correctText: "You are polite.", correctResponseId: null }
);
fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + "\n");

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
ledger.amendments = (ledger.amendments ?? []).filter((item) => !(item.courseSessionId === session && ((!item.action && item.oldInteractionId === `${session}:i15`) || (item.action === "retire" && item.oldInteractionId === `${session}:i20`) || (item.action === "replacement" && item.newInteractionId === `${session}:i20`))));
const row15 = ledger.rows.find((entry) => entry.courseSessionId === session && entry.oldInteractionId === `${session}:i15` && entry.segmentIndex === 1);
if (!row15) throw new Error("missing ledger i15");
Object.assign(row15, { newInteractionId: `${session}:i15`, newTargetSegment: "calm", correctText: "calm", audioTranscript: null });
ledger.amendments.push({ courseSessionId: session, oldInteractionId: `${session}:i15`, segmentIndex: 1, from: "You are ___ .", to: "calm", reason: "Replaced a repeated gap task with a distinct listening contrast in a factual scene (2026-10-10)." });
for (const [id, target] of [["i17:s02", "I am not sad."], ["i19:s02", "I am tired."]]) {
  const row = ledger.rows.find((entry) => entry.courseSessionId === session && entry.newInteractionId === `${session}:${id}`);
  if (!row) throw new Error(`missing ledger ${id}`);
  Object.assign(row, { newTargetSegment: target, correctText: target, audioTranscript: target });
}
for (const [index, from] of ["You are polite.", "You are calm.", "You are lucky."].entries()) ledger.amendments.push({ action: "retire", courseSessionId: session, oldInteractionId: `${session}:i20`, segmentIndex: index + 1, from, replacementInteractionId: `${session}:i20`, to: "You are polite.", reason: "Replaced an answer-revealing spoken chain with one independent spoken response (2026-10-10)." });
ledger.amendments.push({ action: "replacement", courseSessionId: session, newInteractionId: `${session}:i20`, retires: [1, 2, 3].map((segmentIndex) => ({ oldInteractionId: `${session}:i20`, segmentIndex })), reason: "One independent spoken response replaces the answer-revealing chain (2026-10-10)." });
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
