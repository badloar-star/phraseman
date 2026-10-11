import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const file = path.resolve(import.meta.dirname, "../sessions/en/l01/s01/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const feedback = {
  i02: {
    ru: "Верно: в записи here. В нём долгий гласный, и слово не заканчивается на л.",
    uk: "Правильно: у записі here. У ньому довгий голосний, і слово не закінчується на л.",
  },
  i04: {
    ru: "Верно: ready — слово из двух слогов, которое заканчивается на -dy.",
    uk: "Правильно: ready — слово з двох складів, яке закінчується на -dy.",
  },
  i06: {
    ru: "Верно: в записи fine: слово заканчивается на n, а не на v или d.",
    uk: "Правильно: у записі fine: слово закінчується на n, а не на v чи d.",
  },
  i08: {
    ru: "Верно: в записи happy — с открытым гласным /æ/ и звуком /p/ в середине.",
    uk: "Правильно: у записі happy — з відкритим голосним /æ/ і звуком /p/ посередині.",
  },
  i11: {
    ru: "Верно: на вопрос «как дела?» отвечают I am fine — «у меня всё хорошо».",
    uk: "Правильно: на запитання «як справи?» відповідають I am fine — «у мене все добре».",
  },
  i14: {
    ru: "Верно: I называет говорящего; получается полная фраза I am here.",
    uk: "Правильно: I називає мовця; виходить повна фраза I am here.",
  },
  "i18:s02": {
    ru: "Верно: встреча начинается, а ready означает «готов начать».",
    uk: "Правильно: зустріч починається, а ready означає «готовий почати».",
  },
};
const tileFeedback = {
  i10: { ru: "ready означает «готов», а здесь вы сообщаете, где находитесь: I am here.", uk: "ready означає «готовий», а тут ви повідомляєте, де перебуваєте: I am here." },
  i12: { ru: "С I нужна форма am, поэтому is здесь лишнее.", uk: "З I потрібна форма am, тому is тут зайве." },
  i13: { ru: "В записи звучит ready — «готов»; fine меняет смысл на «всё хорошо».", uk: "У записі звучить ready — «готовий»; fine змінює зміст на «усе добре»." },
  i16: { ru: "С I нужна форма am, поэтому is здесь лишнее.", uk: "З I потрібна форма am, тому is тут зайве." },
  i17: { ru: "В записи звучит fine — «всё хорошо»; happy означает «рад».", uk: "У записі звучить fine — «усе добре»; happy означає «радий»." },
};
const wrongFeedback = {
  i02: [
    { ru: "Это «волосы», а не «здесь». В записи нужно выбрать слово `here`.", uk: "Це «волосся», а не «тут». У записі потрібно вибрати слово `here`." },
    { ru: "Это «холм», а не «здесь». В записи нужно выбрать слово `here`.", uk: "Це «пагорб», а не «тут». У записі потрібно вибрати слово `here`." },
  ],
  i04: [
    { ru: "Похожее начало, но это другое слово: «действительно». В записи нужно выбрать `ready`.", uk: "Схожий початок, але це інше слово: «дійсно». У записі потрібно вибрати `ready`." },
    { ru: "Это «красный», а не «готов». В записи нужно выбрать `ready`.", uk: "Це «червоний», а не «готовий». У записі потрібно вибрати `ready`." },
  ],
  i06: [
    { ru: "Это «пять». В конце `five` слышен /v/, а в `fine` — /n/.", uk: "Це «п'ять». Наприкінці `five` чути /v/, а в `fine` — /n/." },
    { ru: "Это «находить». В `find` после /n/ есть ещё /d/; в `fine` его нет.", uk: "Це «знаходити». У `find` після /n/ є ще /d/; у `fine` його немає." },
  ],
  i08: [
    { ru: "Это «хобби», а не «рад». В записи нужно выбрать `happy`.", uk: "Це «хобі», а не «радісний». У записі потрібно вибрати `happy`." },
    { ru: "Это «тяжёлый». В середине `heavy` есть /v/, а в `happy` его нет.", uk: "Це «важкий». У середині `heavy` є /v/, а в `happy` його немає." },
  ],
  i14: [
    { ru: "Сначала нужно назвать того, о ком речь: `I am here`.", uk: "Спершу треба назвати того, про кого йдеться: `I am here`." },
    { ru: "Here — это «здесь»; в этой фразе `here` стоит после `am`.", uk: "Here — це «тут»; у цій фразі `here` стоїть після `am`." },
  ],
};

for (const locale of ["ru", "uk"]) {
  for (const [suffix, feedbackByLocale] of Object.entries(feedback)) {
    const interactionId = `en:lesson-01:session-01:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
    const answer = data.answers.find((entry) => entry.interactionId === interactionId);
    if (!interaction || !answer?.correctResponseId) throw new Error(`missing ${locale}:${suffix}`);
    const rows = interaction.modePayload.choiceFeedback;
    const next = { responseId: answer.correctResponseId, correct: true, testedDimension: interaction.modePayload.testedDimension, feedbackByLocale };
    const current = rows.find((entry) => entry.responseId === answer.correctResponseId);
    if (current) Object.assign(current, next); else rows.unshift(next);
  }
  for (const [suffix, feedbackByLocale] of Object.entries(tileFeedback)) {
    const interactionId = `en:lesson-01:session-01:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
    if (!interaction) throw new Error(`missing ${locale}:${suffix}`);
    interaction.modePayload.slotFeedback = [{ responseId: `${interactionId}:tile:d1`, correct: false, testedDimension: interaction.modePayload.testedDimension, feedbackByLocale }];
  }
  for (const [suffix, rows] of Object.entries(wrongFeedback)) {
    const interactionId = `en:lesson-01:session-01:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
    if (!interaction) throw new Error(`missing ${locale}:${suffix}`);
    const options = interaction.responseOptions ?? [];
    for (const [wrongIndex, feedbackByLocale] of rows.entries()) {
      const option = options[wrongIndex + 1];
      const row = interaction.modePayload.choiceFeedback.find((entry) => entry.responseId === option?.responseId);
      if (!row) throw new Error(`missing feedback ${locale}:${suffix}:${wrongIndex + 1}`);
      row.feedbackByLocale = feedbackByLocale;
    }
  }
}

if (!apply) {
  console.log("[L01S01-FEEDBACK] dry run: add --apply to write practice.atomic.json");
  process.exit(0);
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log("[L01S01-FEEDBACK] applied correct-choice feedback for seven learner-selectable interactions");
