import fs from "node:fs";
import path from "node:path";
const apply = process.argv.includes("--apply");
const file = path.resolve(import.meta.dirname, "../sessions/en/l01/s08/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const prefix = "en:lesson-01:session-08";
const correct = {
  i01: { ru: "Верно: вы нашли дорогу, поэтому говорите I am not lost — «я не заблудился».", uk: "Правильно: ви знайшли дорогу, тому кажете I am not lost — «я не заблукав»." },
  i02: { ru: "Верно: в записи tired. В нём два слога; tried и tide звучат в один слог.", uk: "Правильно: у записі tired. У ньому два склади; tried і tide звучать в один склад." },
  i04: { ru: "Верно: после I нужна форма am: I am new here.", uk: "Правильно: після I потрібна форма am: I am new here." },
  i09: { ru: "Верно: в записи free. Оно начинается со звука /f/ и заканчивается долгим /iː/.", uk: "Правильно: у записі free. Воно починається зі звука /f/ і закінчується довгим /iː/." },
  i10: { ru: "Верно: пятница свободна, поэтому ответ — I am free.", uk: "Правильно: п’ятниця вільна, тому відповідь — I am free." },
};
const tiles = {
  i03: [{ ru: "not изменило бы смысл на «я не устал», но после длинного дня вы признаёте: I am tired.", uk: "not змінило б зміст на «я не втомився», але після довгого дня ви визнаєте: I am tired." }],
  i11: [{ ru: "В записи ready — «готов»; done изменило бы ответ на «я закончил».", uk: "У записі ready — «готовий»; done змінило б відповідь на «я закінчив»." }],
  i13: [{ ru: "free означает «свободен», но здесь вы сообщаете, что закончили: I am done.", uk: "free означає «вільний», але тут ви повідомляєте, що закінчили: I am done." }],
  i16: [{ ru: "С I нужна форма am, поэтому is здесь лишнее.", uk: "З I потрібна форма am, тому is тут зайве." }],
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
for (const locale of ["ru", "uk"]) {
  const id = `${prefix}:i02`;
  const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
  const tide = interaction.modePayload.choiceFeedback.find((entry) => entry.responseId === `${id}:r3`);
  if (!tide) throw new Error(`Missing distractor response: ${id}:r3`);
  tide.feedbackByLocale = {
    ru: "В `tide` нет второго слога /əd/: это один слог /taɪd/.",
    uk: "У `tide` немає другого складу /əd/: це один склад /taɪd/.",
  };
}
const promptPatches = {
  ru: {
    i10: "Вставьте слово — вас зовут на общий обед в пятницу. В пятницу вы свободны",
    i12: "Скажите вслух — Мира спрашивает, вы здесь недавно. Вы отвечаете, что уже нет",
  },
  uk: {
    i10: "Вставте слово — вас кличуть на спільний обід у п'ятницю. У п’ятницю ви вільні",
    i12: "Скажіть уголос — Міра питає, чи ви тут нещодавно. Ви відповідаєте, що вже ні",
  },
};
for (const locale of ["ru", "uk"]) for (const [suffix, prompt] of Object.entries(promptPatches[locale])) {
  const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === `${prefix}:${suffix}`);
  interaction.prompt = prompt;
  interaction.accessibilityLabel = prompt;
  if (suffix === "i10") {
    const answer = data.answers.find((entry) => entry.interactionId === interaction.interactionId);
    const feedback = interaction.modePayload.choiceFeedback.find((entry) => entry.responseId === answer?.correctResponseId);
    if (feedback) feedback.testedDimension = prompt.slice(0, 40);
  }
}
if (!apply) { console.log("[L01S08-FEEDBACK] dry run"); process.exit(0); }
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log("[L01S08-FEEDBACK] applied");
