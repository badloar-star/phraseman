#!/usr/bin/env node
import fs from "node:fs";

const session = "en:lesson-01:session-13";
const sourcePath = "sessions/en/l01/s13/practice.atomic.json";
const ledgerPath = "migration/single-phrase-2026-10-03/preservation-ledger.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

function spoken(locale) {
  const prompt = locale === "ru"
    ? "Скажите вслух — Лина заметила, что у вас тяжёлые сумки, и помогла донести их; скажите, что она добрая"
    : "Скажіть уголос — Ліна помітила, що у вас важкі сумки, і допомогла їх донести; скажіть, що вона добра";
  return { interactionId: `${session}:i18`, ordinal: 0, purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare", prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${session}:i18:audio`], accessibilityLabel: prompt,
    modePayload: { family: "scripted_repeat_compare", referenceAudio: { audioTargetId: `${session}:i18:audio`, transcript: "You are kind." }, slowReferenceAudio: null, targetPhrase: "You are kind.", recordControlPolicy: "hold_press_release_with_accessible_toggle", modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture", honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"] }, scriptedAlternate: null };
}
for (const locale of ["ru", "uk"]) {
  const entries = source.interactionsByLocale[locale];
  const old = entries.findIndex((entry) => entry.interactionId === `${session}:i18:s01`);
  if (old >= 0) entries.splice(old, 4, spoken(locale));
  else {
    const current = entries.findIndex((entry) => entry.interactionId === `${session}:i18`);
    if (current < 0) throw new Error("missing i18");
    entries[current] = spoken(locale);
  }
  entries.forEach((entry, index) => { entry.ordinal = index + 4; });
}
source.answers = source.answers.filter((answer) => answer.interactionId !== `${session}:i18` && !answer.interactionId.startsWith(`${session}:i18:`));
source.answers.push({ interactionId: `${session}:i18`, correctText: "You are kind.", correctResponseId: null });
fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + "\n");

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
ledger.amendments = (ledger.amendments ?? []).filter((item) => !(item.courseSessionId === session && ((item.action === "retire" && item.oldInteractionId === `${session}:i18`) || (item.action === "replacement" && item.newInteractionId === `${session}:i18`))));
for (const [index, from] of ["You are kind.", "You are brave.", "I am ready.", "I am strong."].entries()) ledger.amendments.push({ action: "retire", courseSessionId: session, oldInteractionId: `${session}:i18`, segmentIndex: index + 1, from, replacementInteractionId: `${session}:i18`, to: "You are kind.", reason: "Replaced an answer-revealing spoken chain with one independent spoken response (2026-10-10)." });
ledger.amendments.push({ action: "replacement", courseSessionId: session, newInteractionId: `${session}:i18`, retires: [1, 2, 3, 4].map((segmentIndex) => ({ oldInteractionId: `${session}:i18`, segmentIndex })), reason: "One independent spoken response replaces the answer-revealing chain (2026-10-10)." });
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
