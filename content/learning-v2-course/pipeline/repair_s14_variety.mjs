#!/usr/bin/env node
import fs from "node:fs";

const session = "en:lesson-01:session-14";
const sourcePath = "sessions/en/l01/s14/practice.atomic.json";
const ledgerPath = "migration/single-phrase-2026-10-03/preservation-ledger.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const local = (locale, ru, uk) => locale === "ru" ? ru : uk;

function contrast(locale, id, target, other, ru, uk, feedbackRu, feedbackUk) {
  const prompt = local(locale, ru, uk);
  return { interactionId: `${session}:${id}`, ordinal: 0, purpose: "guided_practice", family: "sound_contrast", inputMode: "single_choice", prompt,
    responseOptions: [{ responseId: `${session}:${id}:r1`, text: target }, { responseId: `${session}:${id}:r2`, text: other }], mediaIds: [], audioTargetIds: [`${session}:${id}:audioA`, `${session}:${id}:audioB`], accessibilityLabel: prompt,
    modePayload: { family: "sound_contrast", contrastA: target, contrastB: other, ipaA: "", ipaB: "", audioA: { audioTargetId: `${session}:${id}:audioA`, transcript: target }, audioB: { audioTargetId: `${session}:${id}:audioB`, transcript: other }, testedPhoneticContrast: prompt, choiceFeedback: [{ responseId: `${session}:${id}:r2`, correct: false, testedDimension: `${target} or ${other}`, feedbackByLocale: { ru: feedbackRu, uk: feedbackUk } }] }, scriptedAlternate: null };
}
function phrase(locale) {
  const prompt = local(locale, "Соберите фразу — мимо с рёвом проносится машина, турист вздрагивает; скажите, что он испуган", "Складіть фразу — повз із ревом проноситься машина, турист здригається; скажіть, що він наляканий");
  return { interactionId: `${session}:i16`, ordinal: 0, purpose: "retrieval_practice", family: "phrase_builder", inputMode: "ordered_tokens", prompt, responseOptions: [], mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt,
    modePayload: { family: "phrase_builder", targetPhrase: "You are scared.", orderedTokens: ["You", "are", "scared"], authoredDistractorTokens: ["is"], slotFeedback: [] }, scriptedAlternate: null };
}
function spoken(locale) {
  const prompt = local(locale, "Скажите вслух — вы отвели туриста под крышу после ливня; скажите, что он в безопасности", "Скажіть уголос — ви відвели туриста під дах після зливи; скажіть, що він у безпеці");
  return { interactionId: `${session}:i18`, ordinal: 0, purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare", prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:i18:audio`], accessibilityLabel: prompt,
    modePayload: { family: "scripted_repeat_compare", referenceAudio: { audioTargetId: `${session}:i18:audio`, transcript: "You are safe." }, slowReferenceAudio: null, targetPhrase: "You are safe.", recordControlPolicy: "hold_press_release_with_accessible_toggle", modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture", honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"] }, scriptedAlternate: null };
}

for (const locale of ["ru", "uk"]) {
  const items = source.interactionsByLocale[locale];
  const replace = (id, value) => { const index = items.findIndex((entry) => entry.interactionId === `${session}:${id}`); if (index < 0) throw new Error(`missing ${id}`); items[index] = value; };
  replace("i10", contrast(locale, "i10", "dry", "drive", "Различите звуки — какое слово означает «сухой»?", "Розрізніть звуки — яке слово означає «сухий»?", "`drive` — «ехать за рулём». В `dry` после `r` сразу слышен конец слова, без `v`.", "`drive` — «їхати за кермом». У `dry` після `r` одразу чути кінець слова, без `v`."));
  replace("i15", contrast(locale, "i15", "cold", "called", "Различите звуки — какое слово описывает туриста с синими губами?", "Розрізніть звуки — яке слово описує туриста з синіми губами?", "`called` — «позвонил». Туристу холодно: `cold`.", "`called` — «зателефонував». Туристу холодно: `cold`."));
  replace("i16", phrase(locale));
  const chain = items.findIndex((entry) => entry.interactionId === `${session}:i18:s01`);
  if (chain >= 0) items.splice(chain, 4, spoken(locale)); else replace("i18", spoken(locale));
  items.forEach((entry, index) => { entry.ordinal = index + 4; });
}
source.answers = source.answers.filter((answer) => !["i10", "i15", "i16", "i18"].includes(answer.interactionId.slice(session.length + 1)) && !answer.interactionId.startsWith(`${session}:i18:`));
source.answers.push(
  { interactionId: `${session}:i10`, correctText: "dry", correctResponseId: `${session}:i10:r1` },
  { interactionId: `${session}:i15`, correctText: "cold", correctResponseId: `${session}:i15:r1` },
  { interactionId: `${session}:i16`, correctText: "You are scared.", correctResponseId: null },
  { interactionId: `${session}:i18`, correctText: "You are safe.", correctResponseId: null }
);
fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + "\n");

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
ledger.amendments = (ledger.amendments ?? []).filter((item) => !(item.courseSessionId === session && (( !item.action && ["i10", "i15", "i16"].some((id) => item.oldInteractionId === `${session}:${id}`)) || (item.action === "retire" && item.oldInteractionId === `${session}:i18`) || (item.action === "replacement" && item.newInteractionId === `${session}:i18`))));
for (const [id, to, correct] of [["i10", "dry", "dry"], ["i15", "cold", "cold"], ["i16", "You are scared.", "You are scared."]]) {
  const row = ledger.rows.find((entry) => entry.courseSessionId === session && entry.oldInteractionId === `${session}:${id}` && entry.segmentIndex === 1);
  if (!row) throw new Error(`missing ledger row ${id}`);
  Object.assign(row, { newInteractionId: `${session}:${id}`, newTargetSegment: to, correctText: correct, audioTranscript: null });
  ledger.amendments.push({ courseSessionId: session, oldInteractionId: `${session}:${id}`, segmentIndex: 1, from: "You are ___ .", to, reason: "Replaced a repeated gap task with a distinct retrieval action in a named, factual scene (2026-10-10)." });
}
for (const [index, from] of ["You are safe.", "You are dry.", "You are warm.", "You are ready."].entries()) ledger.amendments.push({ action: "retire", courseSessionId: session, oldInteractionId: `${session}:i18`, segmentIndex: index + 1, from, replacementInteractionId: `${session}:i18`, to: "You are safe.", reason: "Replaced an answer-revealing spoken chain with one independent spoken response (2026-10-10)." });
ledger.amendments.push({ action: "replacement", courseSessionId: session, newInteractionId: `${session}:i18`, retires: [1, 2, 3, 4].map((segmentIndex) => ({ oldInteractionId: `${session}:i18`, segmentIndex })), reason: "One independent spoken response replaces the answer-revealing chain (2026-10-10)." });
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
