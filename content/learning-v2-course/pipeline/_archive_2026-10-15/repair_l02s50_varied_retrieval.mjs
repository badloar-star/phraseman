import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-02:session-50";
const file = path.join(root, "sessions/en/l02/s50/practice.atomic.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const localized = {
  ru: "Вставьте слово — друг спрашивает, уверены ли вы после сверки маршрута. Подтвердите о себе.",
  uk: "Вставте слово — друг питає, чи ви впевнені після звірки маршруту. Підтвердьте про себе.",
};
const feedback = {
  r1: {
    ru: "Верно: о себе отвечают `Yes, I am.`",
    uk: "Правильно: про себе відповідають `Yes, I am`.",
  },
  r2: {
    ru: "`are` было в вопросе `Are you sure?`, но о себе отвечают с `I am`.",
    uk: "`are` було в запитанні `Are you sure?`, але про себе відповідають з `I am`.",
  },
  r3: {
    ru: "`is` подходит к `he`, `she` или `it`. Здесь вы отвечаете о себе: `I am`.",
    uk: "`is` підходить до `he`, `she` або `it`. Тут ви відповідаєте про себе: `I am`.",
  },
};

const correctChoices = {
  i01: ["Верно: в записи сотрудник спрашивает `Are you ready?` — «Вы готовы?»", "Правильно: у записі працівник запитує `Are you ready?` — «Ви готові?»"],
  i03: ["Верно: друг спрашивает о сотруднице: `Is she free?`", "Правильно: друг питає про працівницю: `Is she free?`"],
  i06: ["Верно: сотрудник подтверждает близость парка: `Yes, it is.`", "Правильно: працівник підтверджує близькість парку: `Yes, it is`."],
  i11: ["Верно: вопрос о готовности к поездке — `Are you ready?`", "Правильно: це запитання про готовність їхати — `Are you ready?`"],
  i12: ["Верно: друг говорит о своей готовности: `Yes, I am ready.`", "Правильно: друг говорить про свою готовність: `Yes, I am ready`."],
  i14: ["Верно: о сотруднике отвечают `Yes, he is.`", "Правильно: про працівника відповідають `Yes, he is`."],
  i16: ["Верно: после объяснения маршрута друг спрашивает `Are you sure?`", "Правильно: після пояснення маршруту друг питає `Are you sure?`"],
  i17: [feedback.r1.ru, feedback.r1.uk],
};

for (const locale of ["ru", "uk"]) {
  const item = data.interactionsByLocale[locale].find((entry) => entry.interactionId === `${session}:i17`);
  const prompt = localized[locale];
  const options = ["am", "are", "is"].map((text, index) => ({ responseId: `${session}:i17:r${index + 1}`, text }));
  item.purpose = "independent_check";
  item.family = "context_gap_grammar";
  item.inputMode = "single_choice";
  item.prompt = prompt;
  item.accessibilityLabel = prompt;
  item.responseOptions = options;
  item.modePayload = {
    family: "context_gap_grammar",
    localizedScene: { ru: localized.ru, uk: localized.uk },
    gappedTargetPhrase: "Yes, I ___ .",
    gapOptions: options,
    testedDimension: prompt,
    choiceFeedback: options.map((option, index) => ({
      responseId: option.responseId,
      correct: index === 0,
      testedDimension: prompt,
      feedbackByLocale: feedback[`r${index + 1}`],
    })),
  };

  for (const [id, [ru, uk]] of Object.entries(correctChoices)) {
    const choice = data.interactionsByLocale[locale].find((entry) => entry.interactionId === `${session}:${id}`);
    const previous = choice.modePayload.choiceFeedback ?? [];
    const next = { responseId: `${session}:${id}:r1`, correct: true, testedDimension: choice.prompt, feedbackByLocale: { ru, uk } };
    const index = previous.findIndex((entry) => entry.responseId === next.responseId);
    choice.modePayload.choiceFeedback = index < 0 ? [...previous, next] : previous.map((entry, entryIndex) => entryIndex === index ? next : entry);
  }
  const answer = data.answers.find((entry) => entry.interactionId === `${session}:i17`);
  answer.correctText = "am";
  answer.correctResponseId = `${session}:i17:r1`;
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
