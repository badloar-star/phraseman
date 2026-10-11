import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "sessions", "en", "l03", "s48", "practice.atomic.json");
const id = "en:lesson-03:session-48:i17";
const old = [":s01", ":s02", ":s03", ":s04"].map((suffix) => id + suffix);
const source = JSON.parse(fs.readFileSync(file, "utf8"));

function replacement(locale, ordinal) {
  const ru = locale === "ru";
  const prompt = ru
    ? "Вставьте артикль — вы впервые проверяете один неверный заказ из нескольких распечаток"
    : "Вставте артикль — ви вперше перевіряєте одне неправильне замовлення з кількох роздруківок";
  const options = ["An", "The", "A", "без артикля"].map((text, index) => ({
    responseId: `${id}:r${index + 1}`,
    text,
  }));
  const feedback = (ruText, ukText) => ({ ru: ruText, uk: ukText });
  return {
    interactionId: id,
    ordinal,
    purpose: "independent_check",
    family: "context_gap_grammar",
    inputMode: "single_choice",
    prompt,
    responseOptions: options,
    mediaIds: [],
    audioTargetIds: [],
    accessibilityLabel: prompt,
    modePayload: {
      family: "context_gap_grammar",
      localizedScene: {
        ru: "На столе лежат несколько распечаток доставок. Вы впервые проверяете один заказ: в нём неверные данные. До этой реплики об этом заказе не говорили.",
        uk: "На столі лежать кілька роздруківок доставок. Ви вперше перевіряєте одне замовлення: у ньому неправильні дані. До цієї репліки про це замовлення не говорили.",
      },
      gappedTargetPhrase: "___ order is wrong.",
      gapOptions: options,
      testedDimension: "один новый неверный заказ среди нескольких распечаток",
      choiceFeedback: [
        {
          responseId: `${id}:r2`, correct: false,
          feedbackByLocale: feedback(
            "`the` подходит для уже понятного заказа. Здесь заказ называют впервые, поэтому нужен неопределённый артикль. Выбирайте `the` после первого упоминания.",
            "`the` підходить для вже зрозумілого замовлення. Тут замовлення називають уперше, тому потрібен неозначений артикль. Обирайте `the` після першої згадки."
          ),
        },
        {
          responseId: `${id}:r3`, correct: false,
          feedbackByLocale: feedback(
            "`a` тоже называет один новый предмет, но `order` начинается с гласного звука. Поэтому нужно `an order`. Сначала слушайте первый звук следующего слова.",
            "`a` теж називає один новий предмет, але `order` починається з голосного звука. Тому потрібно `an order`. Спершу слухайте перший звук наступного слова."
          ),
        },
        {
          responseId: `${id}:r4`, correct: false,
          feedbackByLocale: feedback(
            "Без артикля нельзя назвать один исчисляемый предмет. Здесь один новый заказ: `an order`.",
            "Без артикля не можна назвати один злічуваний предмет. Тут одне нове замовлення: `an order`."
          ),
        },
      ],
    },
    scriptedAlternate: null,
  };
}

for (const locale of ["ru", "uk"]) {
  const interactions = source.interactionsByLocale[locale];
  const start = interactions.findIndex((item) => item.interactionId === old[0]);
  const retiringCount = interactions.filter((item) => old.includes(item.interactionId)).length;
  if (retiringCount === 4 && start >= 0) {
    source.interactionsByLocale[locale] = [
      ...interactions.slice(0, start),
      replacement(locale, interactions[start].ordinal),
      ...interactions.slice(start + 4),
    ];
    continue;
  }
  const current = interactions.findIndex((item) => item.interactionId === id);
  if (retiringCount === 0 && current >= 0) {
    source.interactionsByLocale[locale] = interactions.map((item, index) =>
      index === current ? replacement(locale, item.ordinal) : item
    );
    continue;
  }
  throw new Error(`Unexpected final-stage shape for ${locale}`);
}
source.answers = source.answers.filter((answer) => !old.includes(answer.interactionId) && answer.interactionId !== id);
source.answers.push({ interactionId: id, correctText: "An", correctResponseId: `${id}:r1` });

if (process.argv.includes("--apply")) {
  fs.writeFileSync(file, JSON.stringify(source, null, 2) + "\n");
}
