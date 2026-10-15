import fs from "node:fs";
import path from "node:path";
const apply = process.argv.includes("--apply");
const file = path.resolve(import.meta.dirname, "../sessions/en/l01/s07/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const prefix = "en:lesson-01:session-07";
const correct = {
  i02: { ru: "Верно: в записи звучит glad; в конце слышно d.", uk: "Правильно: у записі звучить glad; наприкінці чути d." },
  i06: { ru: "Верно: звучит scared; слово заканчивается на d.", uk: "Правильно: звучить scared; слово закінчується на d." },
  i08: { ru: "Верно: третий час однообразной презентации, и вам скучно — bored.", uk: "Правильно: третя година одноманітної презентації, і вам нудно — bored." },
  i10: { ru: "Верно: вы нашли кабинет и больше не потерялись — lost здесь нужно с not.", uk: "Правильно: ви знайшли кабінет і більше не заблукали — lost тут потрібне з not." },
  i13: { ru: "Верно: с I используется am: I am full.", uk: "Правильно: з I вживається am: I am full." },
};
const tiles = {
  i04: [{ ru: "not изменит смысл на противоположный: I am not full — «я не сыт».", uk: "not змінить зміст на протилежний: I am not full — «я не ситий»." }],
  i11: [{ ru: "bored — «скучно», а в записи звучит scared — «страшно».", uk: "bored — «нудно», а в записі звучить scared — «страшно»." }],
  i14: [{ ru: "С I нельзя is: нужно I am not lost.", uk: "З I не вживаємо is: потрібно I am not lost." }, { ru: "С I нельзя are: нужно I am not lost.", uk: "З I не вживаємо are: потрібно I am not lost." }],
  i15: [{ ru: "С I используется am, поэтому I is sure неверно.", uk: "З I вживається am, тому I is sure неправильно." }],
};
for (const locale of ["ru", "uk"]) {
  for (const [suffix, feedbackByLocale] of Object.entries(correct)) {
    const id = `${prefix}:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const answer = data.answers.find((entry) => entry.interactionId === id);
    if (!interaction || !answer?.correctResponseId) throw new Error(`Missing correct response: ${id}`);
    const row = { responseId: answer.correctResponseId, correct: true, testedDimension: interaction.prompt.slice(0, 40), feedbackByLocale };
    const previous = interaction.modePayload.choiceFeedback.find((entry) => entry.responseId === answer.correctResponseId);
    if (previous) Object.assign(previous, row); else interaction.modePayload.choiceFeedback.unshift(row);
  }
  for (const [suffix, rows] of Object.entries(tiles)) {
    const id = `${prefix}:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    if (!interaction) throw new Error(`Missing tile interaction: ${id}`);
    interaction.modePayload.slotFeedback = rows.map((feedbackByLocale, index) => ({ responseId: `${id}:tile:d${index + 1}`, correct: false, testedDimension: interaction.prompt.slice(0, 40), feedbackByLocale }));
  }
}
const correctedDistractorFeedback = {
  i02: [
    { ru: "`glass` заканчивается на `s`, а `glad` — на `d`.", uk: "`glass` закінчується на `s`, а `glad` — на `d`." },
    { ru: "В `gold` после `g` слышно «оул», а в `glad` сразу слышно `l` и короткое «э»: «глэд».", uk: "У `gold` після `g` чути «оул», а в `glad` одразу чути `l` і коротке «е»: «глед»." },
  ],
  i06: [null, { ru: "`score` заканчивается на `r`, а `scared` — на `d`.", uk: "`score` закінчується на `r`, а `scared` — на `d`." }],
  i08: [{ ru: "В этой сцене нет опасности: вы не боитесь, вам скучно.", uk: "У цій сцені немає небезпеки: вам не страшно, вам нудно." }, null],
};
for (const locale of ["ru", "uk"]) for (const [suffix, feedbackRows] of Object.entries(correctedDistractorFeedback)) {
  const id = `${prefix}:${suffix}`;
  const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
  feedbackRows.forEach((feedbackByLocale, index) => {
    if (!feedbackByLocale) return;
    const row = interaction.modePayload.choiceFeedback.find((entry) => entry.responseId === `${id}:r${index + 2}`);
    if (!row) throw new Error(`Missing distractor response: ${id}:r${index + 2}`);
    row.feedbackByLocale = feedbackByLocale;
  });
}
const promptPatches = {
  ru: { i08: "Вставьте слово — третий час повторяют одни и те же слайды о принтерах; вы смотрите на часы", i10: "Вставьте слово — коллега спрашивает, всё ещё ли вам нужны подсказки, как найти кабинет 4B. Вы уже у двери.", i15: "Соберите фразу — Саша сомневается: вы точно знаете дорогу домой?" },
  uk: { i08: "Вставте слово — третю годину повторюють ті самі слайди про принтери; ви дивитеся на годинник", i10: "Вставте слово — колега питає, чи вам іще потрібні підказки, як знайти кабінет 4B. Ви вже біля дверей.", i15: "Складіть фразу — Сашко сумнівається: ви точно знаєте дорогу додому?" },
};
for (const locale of ["ru", "uk"]) for (const [suffix, prompt] of Object.entries(promptPatches[locale])) {
  const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === `${prefix}:${suffix}`);
  interaction.prompt = prompt;
  interaction.accessibilityLabel = prompt;
}
if (!apply) { console.log("[L01S07-FEEDBACK] dry run"); process.exit(0); }
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log("[L01S07-FEEDBACK] applied");
