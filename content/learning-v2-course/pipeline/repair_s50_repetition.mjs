import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const courseSessionId = "en:lesson-01:session-50";
const atomicPath = path.join(root, "sessions/en/l01/s50/practice.atomic.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));

const replacements = {
  "i17:s01": {
    ru: "Соберите фразу — вы показываете другу новую вещь",
    uk: "Складіть фразу — ви показуєте другові нову річ",
    targetPhrase: "It's new.",
    orderedTokens: ["It's", "new."],
    authoredDistractorTokens: ["small.", "are"]
  },
  "i17:s03": {
    ru: "Соберите фразу — вы описываете маленькую вещь на столе",
    uk: "Складіть фразу — ви описуєте маленьку річ на столі",
    targetPhrase: "It's small.",
    orderedTokens: ["It's", "small."],
    authoredDistractorTokens: ["new.", "are"]
  }
};

for (const locale of ["ru", "uk"]) {
  for (const [suffix, replacement] of Object.entries(replacements)) {
    const interactionId = `${courseSessionId}:${suffix}`;
    const items = atomic.interactionsByLocale[locale];
    const index = items.findIndex((item) => item.interactionId === interactionId);
    if (index < 0) throw new Error(`missing interaction: ${interactionId}`);
    const previous = items[index];
    const prompt = replacement[locale];
    items[index] = {
      interactionId,
      ordinal: previous.ordinal,
      purpose: "independent_check",
      family: "phrase_builder",
      inputMode: "ordered_tokens",
      prompt,
      responseOptions: [],
      mediaIds: [],
      audioTargetIds: [],
      accessibilityLabel: prompt,
      modePayload: {
        family: "phrase_builder",
        targetPhrase: replacement.targetPhrase,
        orderedTokens: replacement.orderedTokens,
        authoredDistractorTokens: replacement.authoredDistractorTokens,
        slotFeedback: []
      },
      scriptedAlternate: null
    };
  }
}

atomic.answers = atomic.answers.map((answer) => {
  const replacement = replacements[answer.interactionId.split(":").slice(-2).join(":")];
  return replacement
    ? { interactionId: answer.interactionId, correctText: replacement.targetPhrase, correctResponseId: null }
    : answer;
});
fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);

const markdownChanges = {
  "final.ru.md": [
    ["**19 · Произнесите одну фразу**\n<!-- interaction_id: en:lesson-01:session-50:i17:s01; family: scripted_repeat_compare -->", "**19 · Соберите фразу — вы показываете другу новую вещь**\n<!-- interaction_id: en:lesson-01:session-50:i17:s01; family: phrase_builder -->"],
    ["**21 · Произнесите одну фразу**\n<!-- interaction_id: en:lesson-01:session-50:i17:s03; family: scripted_repeat_compare -->", "**21 · Соберите фразу — вы описываете маленькую вещь на столе**\n<!-- interaction_id: en:lesson-01:session-50:i17:s03; family: phrase_builder -->"]
  ],
  "final.uk.md": [
    ["**19 · Промовте одну фразу**\n<!-- interaction_id: en:lesson-01:session-50:i17:s01; family: scripted_repeat_compare -->", "**19 · Складіть фразу — ви показуєте другові нову річ**\n<!-- interaction_id: en:lesson-01:session-50:i17:s01; family: phrase_builder -->"],
    ["**21 · Промовте одну фразу**\n<!-- interaction_id: en:lesson-01:session-50:i17:s03; family: scripted_repeat_compare -->", "**21 · Складіть фразу — ви описуєте маленьку річ на столі**\n<!-- interaction_id: en:lesson-01:session-50:i17:s03; family: phrase_builder -->"]
  ]
};

for (const [file, changes] of Object.entries(markdownChanges)) {
  const filePath = path.join(root, "sessions/en/l01/s50", file);
  let text = fs.readFileSync(filePath, "utf8");
  for (const [before, after] of changes) {
    if (text.includes(before)) text = text.replace(before, after);
    else if (!text.includes(after)) throw new Error(`expected source text missing: ${file}`);
  }
  text = text
    .replace(/(^|,\s*)19=scripted_repeat_compare(?=,|$)/m, "$1" + "19=phrase_builder")
    .replace(/(^|,\s*)21=scripted_repeat_compare(?=,|$)/m, "$1" + "21=phrase_builder");
  fs.writeFileSync(filePath, text);
}

const ledgerPath = path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
for (const [suffix, replacement] of Object.entries(replacements)) {
  const segmentIndex = suffix === "i17:s01" ? 1 : 3;
  const row = ledger.rows.find((entry) => entry.courseSessionId === courseSessionId && entry.oldInteractionId === `${courseSessionId}:i17` && entry.segmentIndex === segmentIndex);
  if (!row) throw new Error(`missing preservation row: ${suffix}`);
  Object.assign(row, { newTargetSegment: replacement.targetPhrase, correctText: replacement.targetPhrase, audioTranscript: null });
}
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
