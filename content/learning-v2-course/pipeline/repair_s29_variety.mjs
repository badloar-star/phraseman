#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-29";
const id = `${session}:i12`;
const atomicPath = path.join(root, "sessions/en/l01/s29/practice.atomic.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
for (const locale of ["ru", "uk"]) {
  const item = atomic.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
  if (!item) throw new Error(`missing:${locale}:${id}`);
  const prompt = locale === "ru"
    ? "Соберите фразу — рубашку только что постирали, она чистая"
    : "Складіть фразу — сорочку щойно випрали, вона чиста";
  Object.assign(item, {
    family: "phrase_builder", inputMode: "ordered_tokens", prompt,
    responseOptions: [], mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt,
    modePayload: { family: "phrase_builder", targetPhrase: "It is clean.", orderedTokens: ["It", "is", "clean"], authoredDistractorTokens: ["are"], slotFeedback: [] },
    scriptedAlternate: null,
  });
}
atomic.answers = atomic.answers.map((answer) => answer.interactionId === id
  ? { interactionId: id, correctText: "It is clean.", correctResponseId: null }
  : answer);
fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
const changes = {
  "final.ru.md": [
    ["**12 · Вставьте скрепку — вы говорите про рубашку, которую только что постирали**\n<!-- interaction_id: en:lesson-01:session-29:i12; family: context_gap_grammar -->\nЦель: `It ___ clean.`\nВарианты: `is` · `are` · `am`", "**12 · Соберите фразу — рубашку только что постирали, она чистая**\n<!-- interaction_id: en:lesson-01:session-29:i12; family: phrase_builder -->\nЦель: `It is clean.`"],
    ["12=context_gap_grammar, 13=listen_build_dictation", "12=phrase_builder, 13=listen_build_dictation"],
  ],
  "final.uk.md": [
    ["**12 · Вставте скріпку — ви говорите про сорочку, яку щойно випрали**\n<!-- interaction_id: en:lesson-01:session-29:i12; family: context_gap_grammar -->\nЦіль: `It ___ clean.`\nВаріанти: `is` · `are` · `am`", "**12 · Складіть фразу — сорочку щойно випрали, вона чиста**\n<!-- interaction_id: en:lesson-01:session-29:i12; family: phrase_builder -->\nЦіль: `It is clean.`"],
    ["12=context_gap_grammar, 13=listen_build_dictation", "12=phrase_builder, 13=listen_build_dictation"],
  ],
};
for (const [name, replacements] of Object.entries(changes)) {
  const file = path.join(root, "sessions/en/l01/s29", name);
  let text = fs.readFileSync(file, "utf8");
  for (const [before, after] of replacements) {
    if (!text.includes(before)) throw new Error(`missing:${name}`);
    text = text.replace(before, after);
  }
  fs.writeFileSync(file, text);
}
const ledgerPath = path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const row = ledger.rows.find((entry) => entry.courseSessionId === session && entry.oldInteractionId === id);
if (!row) throw new Error(`missing-ledger:${id}`);
Object.assign(row, { newTargetSegment: "It is clean.", correctText: "It is clean." });
ledger.amendments ??= [];
ledger.amendments = ledger.amendments.filter((entry) => !(entry.courseSessionId === session && entry.oldInteractionId === id));
ledger.amendments.push({ courseSessionId: session, oldInteractionId: id, segmentIndex: 1, from: "It ___ clean.", to: "It is clean.", reason: "Full phrase construction replaces the second of two adjacent word-choice tasks while preserving the freshly washed shirt context and the correct word clean (2026-10-10)." });
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
