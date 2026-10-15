#!/usr/bin/env node
// Replaces adjacent listening clones and a four-line answer-revealing finale
// with distinct retrieval modes.  This is intentionally scoped to one session.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-05";
const atomicPath = path.join(ROOT, "sessions/en/l01/s05/practice.atomic.json");
const ledgerPath = path.join(ROOT, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));

const phrase = (locale) => ({
  interactionId: `${session}:i09`, ordinal: 12, purpose: "guided_practice", family: "phrase_builder", inputMode: "ordered_tokens",
  prompt: locale === "ru" ? "Соберите фразу — вы только начали работать в команде" : "Складіть фразу — ви щойно почали працювати в команді",
  responseOptions: [], mediaIds: [], audioTargetIds: [],
  accessibilityLabel: locale === "ru" ? "Соберите фразу — вы только начали работать в команде" : "Складіть фразу — ви щойно почали працювати в команді",
  modePayload: { family: "phrase_builder", targetPhrase: "I am new.", localizedMeaning: {
    ru: "Вы здесь недавно: соберите полную фразу.", uk: "Ви тут недавно: складіть повну фразу."
  }, orderedTokens: ["I", "am", "new"], authoredDistractorTokens: ["is", "not"], slotFeedback: [] }, scriptedAlternate: null,
});

const dictation = (locale) => ({
  interactionId: `${session}:i18:s02`, ordinal: 22, purpose: "independent_check", family: "listen_build_dictation", inputMode: "ordered_tokens",
  prompt: locale === "ru" ? "Послушайте и соберите — вы пришли после начала встречи" : "Послухайте й складіть — ви прийшли після початку зустрічі",
  responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:i18:s02:audio`],
  accessibilityLabel: locale === "ru" ? "Послушайте и соберите — вы пришли после начала встречи" : "Послухайте й складіть — ви прийшли після початку зустрічі",
  modePayload: { family: "listen_build_dictation", referenceAudio: { audioTargetId: `${session}:i18:s02:audio`, transcript: "I am late." }, slowReferenceAudio: null,
    hiddenTargetPhrase: "I am late.", orderedTokens: ["I", "am", "late"], authoredDistractorTokens: ["is", "not"], slotFeedback: [] }, scriptedAlternate: null,
});

const finale = (locale) => {
  const ru = locale === "ru";
  const entries = [
    ["I am hot.", ru ? "жарко" : "спекотно"],
    ["I am not sick.", ru ? "здоров" : "здоровий"],
    ["I am ready.", ru ? "готов" : "готовий"],
    ["I am not new.", ru ? "давно работаете здесь" : "давно працюєте тут"],
  ];
  const pairGrid = entries.map(([target, meaning], index) => ({ pairId: `${session}:i19:p${index + 1}`, target, meaningByLocale: { ru: index === 0 ? "жарко" : index === 1 ? "здоров" : index === 2 ? "готов" : "давно работаете здесь", uk: index === 0 ? "спекотно" : index === 1 ? "здоровий" : index === 2 ? "готовий" : "давно працюєте тут" } }));
  return { interactionId: `${session}:i19`, ordinal: 23, purpose: "independent_check", family: "speed_match", inputMode: "pair_grid",
    prompt: ru ? "Итог — соедините фразы с фактами" : "Підсумок — з'єднайте фрази з фактами", responseOptions: [], mediaIds: [], audioTargetIds: [],
    accessibilityLabel: ru ? "Итог — соедините фразы с фактами" : "Підсумок — з'єднайте фрази з фактами",
    modePayload: { family: "speed_match", pairGrid, leftColumn: entries.map(([target]) => target), rightColumn: entries.map(([, meaning]) => meaning), pairingKey: "pair_id", timerPolicy: { enabledByDefault: false, learnerCanDisable: true, pausesOnInterruption: true }, finishStats: ["accuracy"] }, scriptedAlternate: null };
};

for (const locale of ["ru", "uk"]) {
  const list = atomic.interactionsByLocale[locale];
  const i09 = list.findIndex((item) => item.interactionId === `${session}:i09`);
  const i18s02 = list.findIndex((item) => item.interactionId === `${session}:i18:s02`);
  const firstI19 = list.findIndex((item) => item.interactionId === `${session}:i19:s01`);
  const existingI19 = list.findIndex((item) => item.interactionId === `${session}:i19`);
  if (i09 < 0 || i18s02 < 0 || (firstI19 < 0 && existingI19 < 0)) throw new Error(`Expected interactions missing for ${locale}`);
  list[i09] = phrase(locale);
  list[i18s02] = dictation(locale);
  if (firstI19 >= 0) list.splice(firstI19, 4, finale(locale));
  else list[existingI19] = finale(locale);
  list.forEach((item, index) => { item.ordinal = index + 4; });
}
atomic.answers = atomic.answers.filter((answer) => !answer.interactionId.startsWith(`${session}:i19:`) && answer.interactionId !== `${session}:i19`);
atomic.answers = atomic.answers.filter((answer) => answer.interactionId !== `${session}:i09` && answer.interactionId !== `${session}:i18:s02`);
atomic.answers.push(
  { interactionId: `${session}:i09`, correctText: "I am new.", correctResponseId: null },
  { interactionId: `${session}:i18:s02`, correctText: "I am late.", correctResponseId: null },
  { interactionId: `${session}:i19`, correctText: entriesText(), correctResponseId: null },
);
function entriesText() { return [1, 2, 3, 4].map((n) => `${session}:i19:p${n}=${["I am hot.", "I am not sick.", "I am ready.", "I am not new."][n - 1]}`).join("\n"); }
fs.writeFileSync(atomicPath, JSON.stringify(atomic, null, 2) + "\n");

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const has = (predicate) => (ledger.amendments ?? []).some(predicate);
const i09Ledger = ledger.rows.find((row) => row.courseSessionId === session && row.oldInteractionId === `${session}:i09` && row.segmentIndex === 1);
if (!i09Ledger) throw new Error("Missing preservation row for i09");
Object.assign(i09Ledger, { newInteractionId: `${session}:i09`, newTargetSegment: "I am new.", correctText: "I am new.", audioTranscript: null });
if (!has((a) => a.courseSessionId === session && a.oldInteractionId === `${session}:i09`)) ledger.amendments.push({ courseSessionId: session, oldInteractionId: `${session}:i09`, segmentIndex: 1, from: "new", to: "I am new.", reason: "Replaced the adjacent listening duplicate with phrase-building retrieval (2026-10-10)." });
for (const [segmentIndex, from] of [[1, "I am hot."], [2, "I am not sick."], [3, "I am ready."], [4, "I am not new."]]) {
  if (!has((a) => a.action === "retire" && a.courseSessionId === session && a.oldInteractionId === `${session}:i19` && a.segmentIndex === segmentIndex)) ledger.amendments.push({ action: "retire", courseSessionId: session, oldInteractionId: `${session}:i19`, segmentIndex, from, replacementInteractionId: `${session}:i19`, to: entriesText(), reason: "Replaced an answer-revealing spoken chain with one independent phrase-to-fact retrieval check (2026-10-10)." });
}
if (!has((a) => a.action === "replacement" && a.courseSessionId === session && a.newInteractionId === `${session}:i19`)) ledger.amendments.push({ action: "replacement", courseSessionId: session, newInteractionId: `${session}:i19`, retires: [1, 2, 3, 4].map((segmentIndex) => ({ oldInteractionId: `${session}:i19`, segmentIndex })), reason: "One independent matching task replaces the four-step answer-revealing spoken chain (2026-10-10)." });
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
