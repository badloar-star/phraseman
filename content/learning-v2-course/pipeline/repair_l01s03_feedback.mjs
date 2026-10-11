import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const file = path.resolve(import.meta.dirname, "../sessions/en/l01/s03/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const prefix = "en:lesson-01:session-03";
const correct = {
  i02: { ru: "Верно: в записи hungry. Это не angry и не hurry.", uk: "Правильно: у записі hungry. Це не angry і не hurry." },
  i04: { ru: "Верно: в записи sure, а не shore или sugar.", uk: "Правильно: у записі sure, а не shore чи sugar." },
  i05: { ru: "Верно: в записи sure. Это слово нужно выбрать.", uk: "Правильно: у записі sure. Саме це слово треба вибрати." },
  i09: { ru: "Верно: not ставится внутри фразы I am not cold.", uk: "Правильно: not стоїть усередині фрази I am not cold." },
  i12: { ru: "Верно: с I используется am: I am not tired.", uk: "Правильно: з I використовується am: I am not tired." },
  i14: { ru: "Верно: в записи I am not busy. — «я не занят».", uk: "Правильно: у записі I am not busy. — «я не зайнятий»." },
  "i17:s02": { ru: "Верно: в записи I am not hungry. — «я не голоден».", uk: "Правильно: у записі I am not hungry. — «я не голодний»." },
};
const tiles = {
  i10: { ru: "sure — «уверен», но здесь вы сообщаете: «я не один».", uk: "sure — «впевнений», але тут ви повідомляєте: «я не сам»." },
  i11: { ru: "no — отдельный ответ, а внутри фразы нужно not.", uk: "no — окрема відповідь, а всередині фрази потрібне not." },
  i13: { ru: "not лишнее: здесь вы признаёте, что опоздали.", uk: "not зайве: тут ви визнаєте, що запізнилися." },
  "i15:s02": { ru: "not меняет смысл на отрицание, а здесь: «у меня всё хорошо».", uk: "not змінює зміст на заперечення, а тут: «у мене все добре»." },
  "i17:s04": { ru: "not лишнее: здесь вы говорите I am ready. — «я готов».", uk: "not зайве: тут ви кажете I am ready. — «я готовий»." },
};
for (const locale of ["ru", "uk"]) {
  for (const [suffix, feedbackByLocale] of Object.entries(correct)) {
    const id = `${prefix}:${suffix}`; const item = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id); const answer = data.answers.find((entry) => entry.interactionId === id);
    if (!item || !answer?.correctResponseId) throw new Error(`missing ${locale}:${suffix}`);
    const row = { responseId: answer.correctResponseId, correct: true, testedDimension: item.modePayload.testedDimension, feedbackByLocale };
    const existing = item.modePayload.choiceFeedback.find((entry) => entry.responseId === answer.correctResponseId); if (existing) Object.assign(existing, row); else item.modePayload.choiceFeedback.unshift(row);
  }
  for (const [suffix, feedbackByLocale] of Object.entries(tiles)) {
    const id = `${prefix}:${suffix}`; const item = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id); if (!item) throw new Error(`missing ${locale}:${suffix}`);
    item.modePayload.slotFeedback = [{ responseId: `${id}:tile:d1`, correct: false, testedDimension: item.modePayload.testedDimension, feedbackByLocale }];
    if (suffix === "i13" && locale === "uk") item.modePayload.authoredDistractorTokens = ["not"];
  }
}
if (!apply) { console.log("[L01S03-FEEDBACK] dry run"); process.exit(0); }
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log("[L01S03-FEEDBACK] added learner feedback and restored Ukrainian not tile");
