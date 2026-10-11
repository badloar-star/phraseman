#!/usr/bin/env node
// Repairs the source-quality findings in session 07 while retaining a full
// preservation trail for every changed learner interaction.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-07";
const atomicPath = path.join(ROOT, "sessions/en/l01/s07/practice.atomic.json");
const ledgerPath = path.join(ROOT, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
const local = (locale, ru, uk) => locale === "ru" ? ru : uk;

const dictation = (locale) => {
  const prompt = local(locale, "Послушайте и соберите — Саша спрашивает, уверены ли вы, что найдёте выход из здания", "Послухайте й складіть — Сашко питає, чи ви впевнені, що знайдете вихід із будівлі");
  return { interactionId: `${session}:i14`, ordinal: 17, purpose: "retrieval_practice", family: "listen_build_dictation", inputMode: "ordered_tokens",
    prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:i14:audio`], accessibilityLabel: prompt,
    modePayload: { family: "listen_build_dictation", referenceAudio: { audioTargetId: `${session}:i14:audio`, transcript: "I am not lost." }, slowReferenceAudio: null,
      hiddenTargetPhrase: "I am not lost.", orderedTokens: ["I", "am", "not", "lost"], authoredDistractorTokens: ["is", "are"], slotFeedback: [] }, scriptedAlternate: null };
};

const speak = (locale, id, ordinal, target, ruPrompt, ukPrompt) => {
  const prompt = local(locale, ruPrompt, ukPrompt);
  return { interactionId: `${session}:${id}`, ordinal, purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare",
    prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:${id}:audio`], accessibilityLabel: prompt,
    modePayload: { family: "scripted_repeat_compare", referenceAudio: { audioTargetId: `${session}:${id}:audio`, transcript: target }, slowReferenceAudio: null,
      targetPhrase: target, recordControlPolicy: "hold_press_release_with_accessible_toggle", modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"] }, scriptedAlternate: null };
};

for (const locale of ["ru", "uk"]) {
  const list = atomic.interactionsByLocale[locale];
  const change = (id, replacement) => {
    const index = list.findIndex((item) => item.interactionId === `${session}:${id}`);
    if (index < 0) throw new Error(`Missing ${id} for ${locale}`);
    list[index] = replacement;
  };
  change("i14", dictation(locale));
  change("i16", speak(locale, "i16", 19, "I am hungry.", "Скажите вслух — после пропущенного обеда вы говорите Нине, что голодны", "Скажіть уголос — після пропущеного обіду ви кажете Ніні, що голодні"));
  const firstFinal = list.findIndex((item) => item.interactionId === `${session}:i18:s01`);
  const existingFinal = list.findIndex((item) => item.interactionId === `${session}:i18`);
  const final = speak(locale, "i18", 21, "I am tired.", "Итог — Дима спрашивает, как вы после длинного дня; скажите, что устали", "Підсумок — Дмитро питає, як ви після довгого дня; скажіть, що втомилися");
  if (firstFinal >= 0) list.splice(firstFinal, 4, final);
  else if (existingFinal >= 0) list[existingFinal] = final;
  else throw new Error(`Missing final for ${locale}`);
  list.forEach((item, index) => { item.ordinal = index + 4; });
}

const answers = new Map([
  ["i14", { correctText: "I am not lost.", correctResponseId: null }],
  ["i16", { correctText: "I am hungry.", correctResponseId: null }],
  ["i18", { correctText: "I am tired.", correctResponseId: null }],
]);
atomic.answers = atomic.answers.filter((answer) => !answers.has(answer.interactionId.slice(session.length + 1)) && !answer.interactionId.startsWith(`${session}:i18:`));
for (const [id, answer] of answers) atomic.answers.push({ interactionId: `${session}:${id}`, ...answer });
fs.writeFileSync(atomicPath, JSON.stringify(atomic, null, 2) + "\n");

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
ledger.amendments = (ledger.amendments ?? []).filter((entry) => !(entry.courseSessionId === session && ((entry.action === "retire" && entry.oldInteractionId === `${session}:i18`) || (entry.action === "replacement" && entry.newInteractionId === `${session}:i18`) || (!entry.action && ["i14", "i16"].some((id) => entry.oldInteractionId === `${session}:${id}`)))));
const changed = new Map([["i14", "I am not lost."], ["i16", "I am hungry."]]);
for (const [id, target] of changed) {
  const row = ledger.rows.find((entry) => entry.courseSessionId === session && entry.oldInteractionId === `${session}:${id}` && entry.segmentIndex === 1);
  if (!row) throw new Error(`Missing preservation row for ${id}`);
  Object.assign(row, { newInteractionId: `${session}:${id}`, newTargetSegment: target, correctText: target, audioTranscript: ["i14", "i16"].includes(id) ? target : null });
}
ledger.amendments.push(
  { courseSessionId: session, oldInteractionId: `${session}:i14`, segmentIndex: 1, from: "I am ___ .", to: "I am not lost.", reason: "Replaced adjacent blank filling with full-phrase auditory retrieval in a named, answerable scene (2026-10-10)." },
  { courseSessionId: session, oldInteractionId: `${session}:i16`, segmentIndex: 1, from: "I am ___ .", to: "I am hungry.", reason: "Replaced a repeated blank pattern with a standalone spoken response in a named, answerable scene (2026-10-10)." },
);
const finalTargets = ["I am tired.", "I am not lost.", "I am fine.", "I am glad."];
for (const [index, from] of finalTargets.entries()) ledger.amendments.push({ action: "retire", courseSessionId: session, oldInteractionId: `${session}:i18`, segmentIndex: index + 1, from, replacementInteractionId: `${session}:i18`, to: "I am tired.", reason: "Replaced an answer-revealing spoken chain with one independent spoken response (2026-10-10)." });
ledger.amendments.push({ action: "replacement", courseSessionId: session, newInteractionId: `${session}:i18`, retires: [1, 2, 3, 4].map((segmentIndex) => ({ oldInteractionId: `${session}:i18`, segmentIndex })), reason: "One independent spoken response replaces the four-step answer-revealing chain (2026-10-10)." });
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
