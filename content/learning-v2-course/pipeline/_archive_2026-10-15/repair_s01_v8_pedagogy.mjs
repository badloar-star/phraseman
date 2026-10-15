import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const courseSessionId = "en:lesson-01:session-01";
const atomicPath = path.join(root, "sessions/en/l01/s01/practice.atomic.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));

for (const locale of ["ru", "uk"]) {
  const items = atomic.interactionsByLocale[locale];
  const index = items.findIndex((item) => item.interactionId === `${courseSessionId}:i17:s01`);
  if (index < 0) throw new Error(`missing interaction: ${locale}:i17:s01`);
  const prompt = locale === "ru"
    ? "Соберите фразу — Антон говорит, что вы отлично справились с первым заданием; вы рады"
    : "Складіть фразу — Антон каже, що ви чудово впоралися з першим завданням; ви раді";
  const testedDimension = locale === "ru" ? "Вы говорите, что рады успеху" : "Ви кажете, що раді успіху";
  const previous = items[index];
  items[index] = {
    interactionId: previous.interactionId,
    ordinal: previous.ordinal,
    purpose: previous.purpose,
    family: "phrase_builder",
    inputMode: "ordered_tokens",
    prompt,
    responseOptions: [],
    mediaIds: [],
    audioTargetIds: [],
    accessibilityLabel: prompt,
    modePayload: {
      family: "phrase_builder",
      targetPhrase: "I am happy.",
      localizedMeaning: {
        ru: "Соберите фразу — Антон говорит, что вы отлично справились с первым заданием; вы рады",
        uk: "Складіть фразу — Антон каже, що ви чудово впоралися з першим завданням; ви раді"
      },
      orderedTokens: ["I", "am", "happy"],
      authoredDistractorTokens: ["fine", "ready"],
      slotFeedback: [
        {
          responseId: `${courseSessionId}:i17:s01:tile:d1`,
          correct: false,
          testedDimension,
          feedbackByLocale: {
            ru: "`fine` означает «всё хорошо», но здесь вы рады своему успеху: `I am happy`.",
            uk: "`fine` означає «усе добре», але тут ви раді своєму успіху: `I am happy`."
          }
        },
        {
          responseId: `${courseSessionId}:i17:s01:tile:d2`,
          correct: false,
          testedDimension,
          feedbackByLocale: {
            ru: "`ready` означает «готов». Антон хвалит уже сделанное задание, поэтому нужна радость: `happy`.",
            uk: "`ready` означає «готовий». Антон хвалить уже виконане завдання, тому потрібна радість: `happy`."
          }
        }
      ]
    },
    scriptedAlternate: null
  };
}

atomic.answers = atomic.answers.map((answer) => answer.interactionId === `${courseSessionId}:i17:s01`
  ? { interactionId: answer.interactionId, correctText: "I am happy.", correctResponseId: null }
  : answer);
fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);

const ledgerPath = path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const row = ledger.rows.find((entry) => entry.courseSessionId === courseSessionId && entry.oldInteractionId === `${courseSessionId}:i17` && entry.segmentIndex === 1);
if (!row) throw new Error("missing preservation row: i17:s01");
Object.assign(row, { newTargetSegment: "I am happy.", correctText: "I am happy.", audioTranscript: null });
const amendment = {
  courseSessionId,
  oldInteractionId: `${courseSessionId}:i17`,
  segmentIndex: 1,
  from: "I am here.",
  to: "I am happy.",
  reason: "Replaced the third adjacent context gap with full construction of the established happy response in the same praise scene; the learner now orders the complete message and receives feedback for both extra words (2026-10-12)."
};
const amendmentIndex = ledger.amendments.findIndex((entry) => entry.courseSessionId === amendment.courseSessionId && entry.oldInteractionId === amendment.oldInteractionId && entry.segmentIndex === amendment.segmentIndex);
if (amendmentIndex < 0) throw new Error("missing preservation amendment: i17:s01");
ledger.amendments[amendmentIndex] = amendment;
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
