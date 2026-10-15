import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const file = path.resolve(import.meta.dirname, "../sessions/en/l01/s05/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const prefix = "en:lesson-01:session-05";
const correct = {
  i02: { ru: "Верно: в записи hot. Это не hat и не hurt.", uk: "Правильно: у записі hot. Це не hat і не hurt." },
  i06: { ru: "Верно: в записи lost. Это не last и не list.", uk: "Правильно: у записі lost. Це не last і не list." },
  i08: { ru: "Верно: в записи sick. Это не six и не seek.", uk: "Правильно: у записі sick. Це не six і не seek." },
  i10: { ru: "Верно: с I используется am: I am lost.", uk: "Правильно: з I використовується am: I am lost." },
  i12: { ru: "Верно: внутри фразы отрицание выражает not: I am not sick.", uk: "Правильно: усередині фрази заперечення виражає not: I am not sick." },
  i15: { ru: "Верно: с I используется am: I am fine.", uk: "Правильно: з I використовується am: I am fine." },
};
const tiles = {
  i09: [
    { ru: "С I нужна форма am, поэтому is здесь лишнее.", uk: "З I потрібна форма am, тому is тут зайве." },
    { ru: "not изменило бы смысл на I am not new — «я не новичок», но вы только начали работать в команде.", uk: "not змінило б зміст на I am not new — «я не новачок», але ви щойно почали працювати в команді." },
  ],
  i13: [{ ru: "no — отдельный ответ «нет», а внутри фразы I am not sure используется not.", uk: "no — окрема відповідь «ні», а всередині фрази I am not sure використовується not." }],
  i16: [{ ru: "not изменило бы смысл на «я не устал», но здесь вы признаёте: I am tired.", uk: "not змінило б зміст на «я не втомився», але тут ви визнаєте: I am tired." }],
  "i18:s02": [
    { ru: "С I нужна форма am, поэтому is здесь лишнее.", uk: "З I потрібна форма am, тому is тут зайве." },
    { ru: "В записи I am late — «я опоздал»; not изменило бы смысл на «я не опоздал».", uk: "У записі I am late — «я запізнився»; not змінило б зміст на «я не запізнився»." },
  ],
};

for (const locale of ["ru", "uk"]) {
  for (const [suffix, feedbackByLocale] of Object.entries(correct)) {
    const id = `${prefix}:${suffix}`;
    const item = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const answer = data.answers.find((entry) => entry.interactionId === id);
    if (!item || !answer?.correctResponseId) throw new Error(`Missing correct response: ${id}`);
    if (suffix === "i12") item.modePayload.gappedTargetPhrase = "I am ___ .";
    const row = { responseId: answer.correctResponseId, correct: true, testedDimension: item.modePayload.testedDimension, feedbackByLocale };
    const previous = item.modePayload.choiceFeedback.find((entry) => entry.responseId === answer.correctResponseId);
    if (previous) Object.assign(previous, row); else item.modePayload.choiceFeedback.unshift(row);
  }
  for (const [suffix, rows] of Object.entries(tiles)) {
    const id = `${prefix}:${suffix}`;
    const item = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    if (!item) throw new Error(`Missing tile interaction: ${id}`);
    if (suffix === "i16") item.modePayload.authoredDistractorTokens = ["not"];
    item.modePayload.slotFeedback = rows.map((feedbackByLocale, index) => ({
      responseId: `${id}:tile:d${index + 1}`,
      correct: false,
      testedDimension: item.modePayload.testedDimension,
      feedbackByLocale,
    }));
  }
}

if (!apply) {
  console.log("[L01S05-FEEDBACK] dry run");
  process.exit(0);
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log("[L01S05-FEEDBACK] applied");
