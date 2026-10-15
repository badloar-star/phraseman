#!/usr/bin/env node
import fs from "node:fs";

const session = "en:lesson-01:session-12";
const sourcePath = "sessions/en/l01/s12/practice.atomic.json";
const ledgerPath = "migration/single-phrase-2026-10-03/preservation-ledger.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const text = (locale, ru, uk) => locale === "ru" ? ru : uk;
const contextGap = (locale) => {
  const prompt = text(locale,
    "Вставьте скрепку — Нина честно сказала клиенту, что срок сорван; скажите ей, что она честная",
    "Вставте скріпку — Ніна чесно сказала клієнту, що термін зірвано; скажіть їй, що вона чесна");
  const options = ["are", "am", "is"];
  return {
    interactionId: `${session}:i09`, ordinal: 0, purpose: "retrieval_practice",
    family: "context_gap_grammar", inputMode: "single_choice", prompt, responseOptions: options.map((value, index) => ({ responseId: `${session}:i09:r${index + 1}`, text: value })), mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt,
    modePayload: {
      family: "context_gap_grammar", localizedScene: { ru: "Вставьте скрепку — Нина честно сказала клиенту, что срок сорван; скажите ей, что она честная", uk: "Вставте скріпку — Ніна чесно сказала клієнту, що термін зірвано; скажіть їй, що вона чесна" },
      gappedTargetPhrase: "You ___ honest.", gapOptions: options.map((value, index) => ({ responseId: `${session}:i09:r${index + 1}`, text: value })), testedDimension: "Выберите скрепку по факту: Нина честно сказала клиенту о сорванном сроке.",
      choiceFeedback: [
        { responseId: `${session}:i09:r2`, correct: false, testedDimension: "Здесь говорят с Ниной напрямую.", feedbackByLocale: { ru: "С `you` нужна скрепка `are`, не `am`: `am` говорят про себя.", uk: "З `you` потрібна скріпка `are`, не `am`: `am` кажуть про себе." } },
        { responseId: `${session}:i09:r3`, correct: false, testedDimension: "Здесь говорят с Ниной напрямую.", feedbackByLocale: { ru: "`is` говорят про he, she или it. С Ниной напрямую — `you are`.", uk: "`is` кажуть про he, she або it. З Ніною напряму — `you are`." } }
      ]
    }, scriptedAlternate: null
  };
};
const soundContrast = (locale) => {
  const prompt = text(locale, "Различите звуки — какое из двух означает «умная»?", "Розрізніть звуки — яке з двох означає «розумна»?");
  return { interactionId: `${session}:i08`, ordinal: 0, purpose: "guided_practice", family: "sound_contrast", inputMode: "single_choice", prompt,
    responseOptions: [{ responseId: `${session}:i08:r1`, text: "smart" }, { responseId: `${session}:i08:r2`, text: "start" }], mediaIds: [], audioTargetIds: [`${session}:i08:audioA`, `${session}:i08:audioB`], accessibilityLabel: prompt,
    modePayload: { family: "sound_contrast", contrastA: "smart", contrastB: "start", ipaA: "", ipaB: "", audioA: { audioTargetId: `${session}:i08:audioA`, transcript: "smart" }, audioB: { audioTargetId: `${session}:i08:audioB`, transcript: "start" }, testedPhoneticContrast: text(locale, "Различите звуки — какое из двух означает «умная»?", "Розрізніть звуки — яке з двох означає «розумна»?"), choiceFeedback: [{ responseId: `${session}:i08:r2`, correct: false, testedDimension: "smart или start", feedbackByLocale: { ru: "`start` — «начать». В `smart` после `s` слышно `m`, а не `t`.", uk: "`start` — «почати». У `smart` після `s` чути `m`, а не `t`." } }] }, scriptedAlternate: null };
};
const listenSmart = (locale) => {
  const prompt = text(locale, "Послушайте и выберите", "Послухайте і виберіть");
  const options = ["smart", "start", "small"];
  return { interactionId: `${session}:i10`, ordinal: 0, purpose: "guided_practice", family: "listen_choose", inputMode: "single_choice", prompt,
    responseOptions: options.map((value, index) => ({ responseId: `${session}:i10:r${index + 1}`, text: value })), mediaIds: [], audioTargetIds: [`${session}:i10:audio`], accessibilityLabel: prompt,
    modePayload: { family: "listen_choose", referenceAudio: { audioTargetId: `${session}:i10:audio`, transcript: "smart" }, slowReferenceAudio: null, localizedMeaningChoices: options.map((targetText, index) => ({ responseId: `${session}:i10:r${index + 1}`, targetText, meaningByLocale: null })), transcriptRevealPolicy: "after_first_attempt", choiceFeedback: [
      { responseId: `${session}:i10:r2`, correct: false, testedDimension: "Послушайте и выберите — smart", feedbackByLocale: { ru: "В `smart` после «с» идёт «м», а в `start` — «т».", uk: "У `smart` після «с» іде «м», а в `start` — «т»." } },
      { responseId: `${session}:i10:r3`, correct: false, testedDimension: "Послушайте и выберите — smart", feedbackByLocale: { ru: "Конец другой. В `smart` на конце «рт».", uk: "Кінець інший. У `smart` наприкінці «рт»." } }
    ], isWordCard: false, wordCard: null }, scriptedAlternate: null };
};
const phrase = (locale, id, target, ru, uk, tokens, distractors = []) => {
  const prompt = text(locale, ru, uk);
  return { interactionId: `${session}:${id}`, ordinal: 0, purpose: "retrieval_practice", family: "phrase_builder", inputMode: "ordered_tokens", prompt, responseOptions: [], mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt,
    modePayload: { family: "phrase_builder", targetPhrase: target, orderedTokens: tokens, authoredDistractorTokens: distractors, slotFeedback: [] }, scriptedAlternate: null };
};
const spoken = (locale) => {
  const prompt = text(locale,
    "Скажите вслух — Лина защитила коллегу на встрече, хотя боялась возразить; скажите, что она смелая",
    "Скажіть уголос — Ліна захистила колегу на зустрічі, хоча боялася заперечити; скажіть, що вона смілива");
  return { interactionId: `${session}:i20`, ordinal: 0, purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare", prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:i20:audio`], accessibilityLabel: prompt,
    modePayload: { family: "scripted_repeat_compare", referenceAudio: { audioTargetId: `${session}:i20:audio`, transcript: "You are brave." }, slowReferenceAudio: null, targetPhrase: "You are brave.", recordControlPolicy: "hold_press_release_with_accessible_toggle", modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture", honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"] }, scriptedAlternate: null };
};
const dictation = (locale) => {
  const prompt = text(locale, "Послушайте и соберите — Лина говорит очень тихо в вагоне; скажите ей, что она тихая", "Послухайте й складіть — Ліна говорить дуже тихо у вагоні; скажіть їй, що вона тиха");
  return { interactionId: `${session}:i16`, ordinal: 0, purpose: "retrieval_practice", family: "listen_build_dictation", inputMode: "ordered_tokens", prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:i16:audio`], accessibilityLabel: prompt,
    modePayload: { family: "listen_build_dictation", referenceAudio: { audioTargetId: `${session}:i16:audio`, transcript: "You are quiet." }, slowReferenceAudio: null, hiddenTargetPhrase: "You are quiet.", orderedTokens: ["You", "are", "quiet"], authoredDistractorTokens: ["is"], slotFeedback: [] }, scriptedAlternate: null };
};

for (const locale of ["ru", "uk"]) {
  const interactions = source.interactionsByLocale[locale];
  const replace = (id, item) => { const index = interactions.findIndex((entry) => entry.interactionId === `${session}:${id}`); if (index < 0) throw new Error(`missing ${id}`); interactions[index] = item; };
  replace("i08", soundContrast(locale));
  replace("i09", contextGap(locale));
  replace("i10", listenSmart(locale));
  replace("i12", phrase(locale, "i12", "You are honest.", "Соберите фразу — Нина честно сказала клиенту, что срок сорван; скажите ей, что она честная", "Складіть фразу — Ніна чесно сказала клієнту, що термін зірвано; скажіть їй, що вона чесна", ["You", "are", "honest"], ["is"]));
  replace("i16", dictation(locale));
  const chainStart = interactions.findIndex((entry) => entry.interactionId === `${session}:i20:s01`);
  if (chainStart >= 0) interactions.splice(chainStart, 3, spoken(locale));
  else replace("i20", spoken(locale));
  interactions.forEach((entry, index) => { entry.ordinal = index + 4; });
}

source.answers = source.answers.filter((answer) => !["i08", "i09", "i10", "i12", "i16", "i20"].includes(answer.interactionId.slice(session.length + 1)) && !answer.interactionId.startsWith(`${session}:i20:`));
source.answers.push(
  { interactionId: `${session}:i08`, correctText: "smart", correctResponseId: `${session}:i08:r1` },
  { interactionId: `${session}:i09`, correctText: "are", correctResponseId: `${session}:i09:r1` },
  { interactionId: `${session}:i10`, correctText: "smart", correctResponseId: `${session}:i10:r1` },
  { interactionId: `${session}:i12`, correctText: "You are honest.", correctResponseId: null },
  { interactionId: `${session}:i16`, correctText: "You are quiet.", correctResponseId: null },
  { interactionId: `${session}:i20`, correctText: "You are brave.", correctResponseId: null }
);
fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + "\n");

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
ledger.amendments = (ledger.amendments ?? []).filter((amendment) => !(amendment.courseSessionId === session && (
  (!amendment.action && ["i08", "i09", "i10", "i12", "i16"].some((id) => amendment.oldInteractionId === `${session}:${id}`)) ||
  (amendment.action === "retire" && amendment.oldInteractionId === `${session}:i20`) ||
  (amendment.action === "replacement" && amendment.newInteractionId === `${session}:i20`)
)));
for (const id of ["i08", "i10"]) {
  const row = ledger.rows.find((entry) => entry.courseSessionId === session && entry.oldInteractionId === `${session}:${id}` && entry.segmentIndex === 1);
  if (!row) throw new Error(`missing ledger row ${id}`);
  Object.assign(row, { newInteractionId: `${session}:${id}`, newTargetSegment: "smart", correctText: "smart", audioTranscript: id === "i10" ? "smart" : null });
}
for (const [id, from, to, audio] of [
  ["i09", "honest", "You ___ honest.", null],
  ["i12", "You ___ honest.", "You are honest.", null],
  ["i16", "You are ___ .", "You are quiet.", "You are quiet."]
]) {
  const row = ledger.rows.find((entry) => entry.courseSessionId === session && entry.oldInteractionId === `${session}:${id}` && entry.segmentIndex === 1);
  if (!row) throw new Error(`missing ledger row ${id}`);
  Object.assign(row, { newInteractionId: `${session}:${id}`, newTargetSegment: to, correctText: id === "i09" ? "are" : to, audioTranscript: audio });
  ledger.amendments.push({ courseSessionId: session, oldInteractionId: `${session}:${id}`, segmentIndex: 1, from, to, reason: "Replaced a repeated task mode with a distinct retrieval action in a named, factual scene (2026-10-10)." });
}
for (const [index, from] of ["You are brave.", "You are calm.", "You are right."].entries()) ledger.amendments.push({ action: "retire", courseSessionId: session, oldInteractionId: `${session}:i20`, segmentIndex: index + 1, from, replacementInteractionId: `${session}:i20`, to: "You are brave.", reason: "Replaced an answer-revealing spoken chain with one independent spoken response (2026-10-10)." });
ledger.amendments.push({ action: "replacement", courseSessionId: session, newInteractionId: `${session}:i20`, retires: [1, 2, 3].map((segmentIndex) => ({ oldInteractionId: `${session}:i20`, segmentIndex })), reason: "One independent spoken response replaces the answer-revealing chain (2026-10-10)." });
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
