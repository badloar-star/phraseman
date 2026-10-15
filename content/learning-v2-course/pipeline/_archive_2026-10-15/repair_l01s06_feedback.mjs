import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const file = path.resolve(import.meta.dirname, "../sessions/en/l01/s06/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const prefix = "en:lesson-01:session-06";
const correct = {
  i02: { ru: "Верно: в записи звучит `home` — «дома». Это не `hope` и не `hole`.", uk: "Правильно: у записі звучить `home` — «вдома». Це не `hope` і не `hole`." },
  i04: { ru: "Верно: в записи звучит `back` — «назад». Это не `bag` и не `bad`.", uk: "Правильно: у записі звучить `back` — «назад». Це не `bag` і не `bad`." },
  i08: { ru: "Верно: в записи звучит `done` — «закончил». Это не `down` и не `dawn`.", uk: "Правильно: у записі звучить `done` — «закінчив». Це не `down` і не `dawn`." },
  i09: { ru: "Верно: друг спрашивает о вашем состоянии после дороги, поэтому подходит `ok`: `I am ok.`", uk: "Правильно: друг питає про ваш стан після дороги, тому підходить `ok`: `I am ok.`" },
  i11: { ru: "Верно: вопрос о вашем состоянии; `I am ok.` значит «со мной всё в порядке».", uk: "Правильно: запитання про ваш стан; `I am ok.` означає «зі мною все гаразд»." },
};
const tiles = {
  i05: [{ ru: "С `I` нужна форма `am`, поэтому `is` здесь лишнее.", uk: "З `I` потрібна форма `am`, тому `is` тут зайве." }],
  i07: [{ ru: "С `I` нужна форма `am`, поэтому `is` здесь лишнее.", uk: "З `I` потрібна форма `am`, тому `is` тут зайве." }, { ru: "`not` изменило бы смысл на `I am not ok.` — «со мной не всё в порядке», но по условию всё хорошо.", uk: "`not` змінило б зміст на `I am not ok.` — «зі мною не все гаразд», але за умовою все добре." }],
  i12: [{ ru: "С `I` нужна форма `am`, поэтому `is` здесь лишнее.", uk: "З `I` потрібна форма `am`, тому `is` тут зайве." }, { ru: "С `I` нужна форма `am`, поэтому `are` здесь лишнее.", uk: "З `I` потрібна форма `am`, тому `are` тут зайве." }, { ru: "`not` изменило бы смысл: `I am not back.` — вы ещё не вернулись. Но по условию вы уже вернулись.", uk: "`not` змінило б зміст: `I am not back.` — ви ще не повернулися. Але за умовою ви вже повернулися." }],
  i13: [{ ru: "В записи звучит `done` — «закончил»; `home` значит «дома».", uk: "У записі звучить `done` — «закінчив»; `home` означає «вдома»." }],
  i16: [{ ru: "В записи после `I` звучит `am`; `is` здесь лишнее.", uk: "У записі після `I` звучить `am`; `is` тут зайве." }, { ru: "В записи звучит `I am free.` — «у меня есть время»; с `not` получилось бы «у меня нет времени».", uk: "У записі звучить `I am free.` — «у мене є час»; із `not` вийшло б «у мене немає часу»." }],
  i17: [{ ru: "С `I` нужна форма `am`, поэтому `is` здесь лишнее.", uk: "З `I` потрібна форма `am`, тому `is` тут зайве." }, { ru: "С `I` нужна форма `am`, поэтому `are` здесь лишнее.", uk: "З `I` потрібна форма `am`, тому `are` тут зайве." }, { ru: "С `not` получилось бы `I am not tired.` — усталости нет. Но после ночного рейса вы сообщаете, что устали.", uk: "Із `not` вийшло б `I am not tired.` — втоми немає. Але після нічного рейсу ви повідомляєте, що втомилися." }],
};
for (const locale of ["ru", "uk"]) {
  for (const [suffix, feedbackByLocale] of Object.entries(correct)) {
    const id = `${prefix}:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const answer = data.answers.find((entry) => entry.interactionId === id);
    if (!interaction || !answer?.correctResponseId) throw new Error(`Missing correct response: ${id}`);
    const row = { responseId: answer.correctResponseId, correct: true, testedDimension: interaction.modePayload.testedDimension, feedbackByLocale };
    const previous = interaction.modePayload.choiceFeedback.find((entry) => entry.responseId === answer.correctResponseId);
    if (previous) Object.assign(previous, row); else interaction.modePayload.choiceFeedback.unshift(row);
  }
  for (const [suffix, rows] of Object.entries(tiles)) {
    const id = `${prefix}:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    if (!interaction) throw new Error(`Missing tile interaction: ${id}`);
    interaction.modePayload.slotFeedback = rows.map((feedbackByLocale, index) => ({ responseId: `${id}:tile:d${index + 1}`, correct: false, testedDimension: interaction.modePayload.testedDimension, feedbackByLocale }));
  }
}
const prompts = {
  ru: "Соберите фразу — после дел вы говорите, что с вами всё в порядке",
  uk: "Складіть фразу — після справ ви кажете, що з вами все гаразд",
};
for (const locale of ["ru", "uk"]) {
  const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === `${prefix}:i07`);
  interaction.prompt = prompts[locale];
  interaction.accessibilityLabel = prompts[locale];
}
const ukrainianPromptPatches = {
  i12: "Зберіть фразу — ви пишете Дмитрові, що вже повернулися",
  i16: "Послухайте й складіть — ви відповідаєте Олегу, що завтра можете піти гуляти",
  i17: "Зберіть фразу — після нічного рейсу ви кажете Олені, що втомилися",
};
for (const [suffix, prompt] of Object.entries(ukrainianPromptPatches)) {
  const interaction = data.interactionsByLocale.uk.find((entry) => entry.interactionId === `${prefix}:${suffix}`);
  interaction.prompt = prompt;
  interaction.accessibilityLabel = prompt;
}
if (!apply) { console.log("[L01S06-FEEDBACK] dry run"); process.exit(0); }
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log("[L01S06-FEEDBACK] applied");
