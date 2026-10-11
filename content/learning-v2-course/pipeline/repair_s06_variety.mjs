#!/usr/bin/env node
// Repairs the remaining variety findings in session 06 without inventing a
// release. Each replacement retains a learner-solvable scene and records its
// relationship to the old preservation rows.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-06";
const atomicPath = path.join(ROOT, "sessions/en/l01/s06/practice.atomic.json");
const ledgerPath = path.join(ROOT, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));

const text = (locale, ru, uk) => locale === "ru" ? ru : uk;
const builder = (locale, id, ordinal, target, ruPrompt, ukPrompt, ruMeaning, ukMeaning) => {
  const prompt = text(locale, ruPrompt, ukPrompt);
  return {
    interactionId: `${session}:${id}`, ordinal, purpose: "independent_check", family: "phrase_builder", inputMode: "ordered_tokens",
    prompt, responseOptions: [], mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt,
    modePayload: { family: "phrase_builder", targetPhrase: target, localizedMeaning: { ru: ruMeaning, uk: ukMeaning },
      orderedTokens: target.replace(/[.?!]$/, "").split(" "), authoredDistractorTokens: ["is", "are", "not"], slotFeedback: [] },
    scriptedAlternate: null,
  };
};
const gap = (locale) => {
  const prompt = text(locale,
    "Выберите слово — Марина написала, что добралась домой после долгой дороги, и вы уточняете, всё ли с ней в порядке",
    "Виберіть слово — Марина написала, що дісталася додому після довгої дороги, і ви уточнюєте, чи все з нею гаразд");
  const options = ["ok", "home", "back"].map((value, index) => ({ responseId: `${session}:i09:r${index + 1}`, text: value }));
  const feedback = (value, correct, ru, uk) => ({ responseId: `${session}:i09:r${["ok", "home", "back"].indexOf(value) + 1}`, correct, testedDimension: prompt, feedbackByLocale: { ru, uk } });
  return {
    interactionId: `${session}:i09`, ordinal: 12, purpose: "guided_practice", family: "context_gap_grammar", inputMode: "single_choice",
    prompt, responseOptions: options, mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt,
    modePayload: { family: "context_gap_grammar", gappedTargetPhrase: "I am ___.", gapOptions: options, testedDimension: prompt,
      choiceFeedback: [
        feedback("home", false, "`home` связано с домом, поэтому вариант может казаться подходящим. Но Марина уже написала, что добралась домой; сейчас спрашивают, всё ли с ней в порядке. Здесь нужно `ok`.", "`home` пов'язане з домом, тому варіант може здаватися доречним. Але Марина вже написала, що дісталася додому; зараз питають, чи все з нею гаразд. Тут потрібне `ok`."),
        feedback("back", false, "`back` говорит о возвращении, поэтому оно могло бы подойти к сообщению «я вернулась». Но вопрос не о возвращении, а о состоянии после дороги. Здесь нужно `ok`.", "`back` говорить про повернення, тому воно могло б підійти до повідомлення «я повернулася». Але питання не про повернення, а про стан після дороги. Тут потрібне `ok`."),
      ] }, scriptedAlternate: null,
  };
};
const dictation = (locale) => {
  const prompt = text(locale,
    "Послушайте и соберите — вы отвечаете Олегу, что завтра можете пойти гулять",
    "Послухайте й складіть — ви відповідаєте Олегові, що завтра можете піти гуляти");
  return { interactionId: `${session}:i16`, ordinal: 19, purpose: "retrieval_practice", family: "listen_build_dictation", inputMode: "ordered_tokens",
    prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:i16:audio`], accessibilityLabel: prompt,
    modePayload: { family: "listen_build_dictation", referenceAudio: { audioTargetId: `${session}:i16:audio`, transcript: "I am free." }, slowReferenceAudio: null,
      hiddenTargetPhrase: "I am free.", orderedTokens: ["I", "am", "free"], authoredDistractorTokens: ["is", "not"], slotFeedback: [] }, scriptedAlternate: null };
};
const finale = (locale) => {
  const prompt = text(locale,
    "Итог — Дима спросил, где вы; скажите ему, что вы дома",
    "Підсумок — Дмитро запитав, де ви; скажіть йому, що ви вдома");
  const target = "I am home.";
  return { interactionId: `${session}:i19`, ordinal: 22, purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare",
    prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:i19:audio`], accessibilityLabel: prompt,
    modePayload: { family: "scripted_repeat_compare", referenceAudio: { audioTargetId: `${session}:i19:audio`, transcript: target }, slowReferenceAudio: null,
      targetPhrase: target, recordControlPolicy: "hold_press_release_with_accessible_toggle", modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"] }, scriptedAlternate: null };
};

for (const locale of ["ru", "uk"]) {
  const list = atomic.interactionsByLocale[locale];
  const replace = (id, value) => {
    const index = list.findIndex((item) => item.interactionId === `${session}:${id}`);
    if (index < 0) throw new Error(`Expected ${id} for ${locale}`);
    list[index] = value;
  };
  replace("i09", gap(locale));
  replace("i12", builder(locale, "i12", 15, "I am back.", "Соберите фразу — вы пишете Диме, что уже вернулись", "Складіть фразу — ви пишете Дмитрові, що вже повернулися", "Вы уже вернулись: скажите это полной фразой.", "Ви вже повернулися: скажіть це повною фразою."));
  replace("i16", dictation(locale));
  replace("i17", builder(locale, "i17", 20, "I am tired.", "Соберите фразу — после ночного рейса вы говорите Лене, что устали", "Складіть фразу — після нічного рейсу ви кажете Олені, що втомилися", "После ночного рейса сообщите, что вы устали.", "Після нічного рейсу повідомте, що ви втомилися."));
  const oldFinale = list.findIndex((item) => item.interactionId === `${session}:i19:s01`);
  const existingFinale = list.findIndex((item) => item.interactionId === `${session}:i19`);
  if (oldFinale >= 0) list.splice(oldFinale, 4, finale(locale));
  else if (existingFinale >= 0) list[existingFinale] = finale(locale);
  else throw new Error(`Expected finale for ${locale}`);
  list.forEach((item, index) => { item.ordinal = index + 4; });
}

const answers = new Map([
  ["i09", { correctText: "ok", correctResponseId: `${session}:i09:r1` }],
  ["i12", { correctText: "I am back.", correctResponseId: null }],
  ["i16", { correctText: "I am free.", correctResponseId: null }],
  ["i17", { correctText: "I am tired.", correctResponseId: null }],
  ["i19", { correctText: "I am home.", correctResponseId: null }],
]);
atomic.answers = atomic.answers.filter((answer) => !answers.has(answer.interactionId.slice(session.length + 1)) && !answer.interactionId.startsWith(`${session}:i19:`));
for (const [id, answer] of answers) atomic.answers.push({ interactionId: `${session}:${id}`, ...answer });
fs.writeFileSync(atomicPath, JSON.stringify(atomic, null, 2) + "\n");

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
// i09 first became a phrase builder, then was deliberately replaced by a
// context choice. The earlier amendment is superseded, not an additional
// preservation operation.
ledger.amendments = (ledger.amendments ?? []).filter((entry) => !(entry.courseSessionId === session && entry.oldInteractionId === `${session}:i09` && entry.to === "I am ok."));
ledger.amendments = ledger.amendments.filter((entry) => !(entry.courseSessionId === session && !entry.action && ["i09", "i12", "i16", "i17"].some((id) => entry.oldInteractionId === `${session}:${id}`)));
ledger.amendments = ledger.amendments.filter((entry) => !(entry.courseSessionId === session && ((entry.action === "retire" && entry.oldInteractionId === `${session}:i19`) || (entry.action === "replacement" && entry.newInteractionId === `${session}:i19`))));
const revised = new Map([["i09", "I am ___."], ["i12", "I am back."], ["i16", "I am free."], ["i17", "I am tired."]]);
for (const [id, target] of revised) {
  const row = ledger.rows.find((entry) => entry.courseSessionId === session && entry.oldInteractionId === `${session}:${id}` && entry.segmentIndex === 1);
  if (!row) throw new Error(`Missing preservation row for ${id}`);
  Object.assign(row, { newInteractionId: `${session}:${id}`, newTargetSegment: target, correctText: id === "i09" ? "ok" : target, audioTranscript: id === "i16" ? "I am free." : null });
}
ledger.amendments ??= [];
const addAmendment = (entry, predicate) => { if (!ledger.amendments.some(predicate)) ledger.amendments.push(entry); };
for (const [id, from, target] of [["i09", "ok", "I am ___."], ["i12", "I ___ back.", "I am back."], ["i17", "I am ___ .", "I am tired."]]) addAmendment({ courseSessionId: session, oldInteractionId: `${session}:${id}`, segmentIndex: 1, from, to: target, reason: "Replaced repeated exercise handling with a distinct, context-bound retrieval mode (2026-10-10)." }, (entry) => entry.courseSessionId === session && entry.oldInteractionId === `${session}:${id}` && entry.to === target && !entry.action);
const finalTargets = ["I am home.", "I am back.", "I am tired.", "I am ok."];
for (const [index, from] of finalTargets.entries()) addAmendment({ action: "retire", courseSessionId: session, oldInteractionId: `${session}:i19`, segmentIndex: index + 1, from, replacementInteractionId: `${session}:i19`, to: answers.get("i19").correctText, reason: "Replaced an answer-revealing spoken chain with one independent context-bound retrieval check (2026-10-10)." }, (entry) => entry.action === "retire" && entry.courseSessionId === session && entry.oldInteractionId === `${session}:i19` && entry.segmentIndex === index + 1);
addAmendment({ action: "replacement", courseSessionId: session, newInteractionId: `${session}:i19`, retires: [1, 2, 3, 4].map((segmentIndex) => ({ oldInteractionId: `${session}:i19`, segmentIndex })), reason: "One independent context-bound check replaces the four-step answer-revealing spoken chain (2026-10-10)." }, (entry) => entry.action === "replacement" && entry.courseSessionId === session && entry.newInteractionId === `${session}:i19`);
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
