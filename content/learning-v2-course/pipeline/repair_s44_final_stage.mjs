#!/usr/bin/env node
// Replaces the answer-revealing three-step tail of S44 with the single
// independent article decision required by its approved 17-task plan.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(ROOT, "sessions", "en", "l03", "s44", "practice.atomic.json");
const APPLY = process.argv.includes("--apply");
const source = JSON.parse(fs.readFileSync(file, "utf8"));
const id = "en:lesson-03:session-44:i17";
const retired = ["s01", "s02", "s03"].map((suffix) => `${id}:${suffix}`);

function finalInteraction(locale, ordinal) {
  const ru = locale === "ru";
  const prompt = ru
    ? "Вставьте маленькое слово — кассир впервые сообщает, что покупатель готов к обслуживанию"
    : "Вставте маленьке слово — касир уперше повідомляє, що покупець готовий до обслуговування";
  const scene = {
    ru: "К кассе подошёл новый покупатель. Кассир впервые сообщает, что этот покупатель готов к обслуживанию.",
    uk: "До каси підійшов новий покупець. Касир уперше повідомляє, що цей покупець готовий до обслуговування.",
  };
  const options = ["A", "The", "An", "без артикля"].map((text, index) => ({ responseId: `${id}:r${index + 1}`, text }));
  const dimension = ru ? "новый один покупатель у кассы" : "новий один покупець біля каси";
  return {
    interactionId: id, ordinal, purpose: "independent_check", family: "context_gap_grammar", inputMode: "single_choice",
    prompt, responseOptions: options, mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt,
    modePayload: {
      family: "context_gap_grammar", localizedScene: scene, gappedTargetPhrase: "___ customer is ready.", gapOptions: options,
      testedDimension: dimension,
      choiceFeedback: [
        { responseId: `${id}:r2`, correct: false, testedDimension: dimension, feedbackByLocale: {
          ru: "`the customer` может казаться знакомой формой для конкретного человека. Но кассир видит этого покупателя впервые, поэтому сначала нужен `a customer`. В новой сцене выбирайте `the` только для человека, который уже понятен обоим.",
          uk: "`the customer` може здаватися знайомою формою для конкретної людини. Але касир бачить цього покупця вперше, тому спочатку потрібне `a customer`. У новій сцені обирайте `the` лише для людини, яку вже розуміють обидва.",
        } },
        { responseId: `${id}:r3`, correct: false, testedDimension: dimension, feedbackByLocale: {
          ru: "`an` — тоже артикль для одного человека, поэтому его легко вспомнить. Но `customer` начинается со звука /k/, не с гласного, поэтому нужен `a`. В новой фразе сначала слушайте первый звук следующего слова.",
          uk: "`an` — теж артикль для однієї людини, тому його легко пригадати. Але `customer` починається зі звуку /k/, не з голосного, тому потрібне `a`. У новій фразі спершу слухайте перший звук наступного слова.",
        } },
        { responseId: `${id}:r4`, correct: false, testedDimension: dimension, feedbackByLocale: {
          ru: "Форма без артикля бывает во множественном числе или с неисчисляемыми словами. Здесь один новый покупатель, поэтому перед `customer` нужен `a`. В новой фразе проверьте: предмет один и исчисляемый? Тогда артикль обязателен.",
          uk: "Форма без артикля буває у множині або з незлічуваними словами. Тут один новий покупець, тому перед `customer` потрібне `a`. У новій фразі перевірте: предмет один і злічуваний? Тоді артикль обов’язковий.",
        } },
      ],
    }, scriptedAlternate: null,
  };
}

const interactionsByLocale = {};
for (const locale of ["ru", "uk"]) {
  const entries = source.interactionsByLocale?.[locale];
  const old = entries.filter((entry) => retired.includes(entry.interactionId));
  const existing = entries.filter((entry) => entry.interactionId === id);
  if (old.length === 3) {
    const first = entries.findIndex((entry) => entry.interactionId === retired[0]);
    interactionsByLocale[locale] = [...entries.slice(0, first), finalInteraction(locale, entries[first].ordinal), ...entries.slice(first + 3)];
  } else if (old.length === 0 && existing.length === 1 && entries.length === 17) {
    interactionsByLocale[locale] = entries.map((entry) => entry.interactionId === id ? finalInteraction(locale, entry.ordinal) : entry);
  } else throw new Error(`s44_final_shape_unexpected:${locale}`);
  if (interactionsByLocale[locale].length !== 17) throw new Error(`s44_task_count_unexpected:${locale}`);
}
const answers = source.answers.filter((answer) => !retired.includes(answer.interactionId) && answer.interactionId !== id);
answers.push({ interactionId: id, correctText: "A", correctResponseId: `${id}:r1` });
const next = { ...source, interactionsByLocale, answers };
if (!APPLY) console.log(JSON.stringify({ verdict: "READY", locales: Object.fromEntries(Object.entries(interactionsByLocale).map(([locale, entries]) => [locale, entries.length])), retired }));
else {
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ verdict: "APPLIED", locales: Object.fromEntries(Object.entries(interactionsByLocale).map(([locale, entries]) => [locale, entries.length])), retired }));
}
