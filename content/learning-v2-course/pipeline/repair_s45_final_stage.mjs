#!/usr/bin/env node
// Replaces S45's answer-revealing three-step tail with the single
// independent article decision required by the approved 17-task plan.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(ROOT, "sessions", "en", "l03", "s45", "practice.atomic.json");
const APPLY = process.argv.includes("--apply");
const source = JSON.parse(fs.readFileSync(file, "utf8"));
const id = "en:lesson-03:session-45:i17";
const retired = ["s01", "s02", "s03"].map((suffix) => `${id}:${suffix}`);

function finalInteraction(locale, ordinal) {
  const ru = locale === "ru";
  const prompt = ru
    ? "Вставьте артикль — на демонстрационный стол впервые поставили ещё одну старую модель"
    : "Вставте артикль — на демонстраційний стіл уперше поставили ще одну стару модель";
  const scene = {
    ru: "Сотрудник поставил на демонстрационный стол ещё одну старую модель. Эту модель в разговоре ещё не называли.",
    uk: "Працівник поставив на демонстраційний стіл ще одну стару модель. Цю модель у розмові ще не називали.",
  };
  const options = ["An", "A", "The", "без артикля"].map((text, index) => ({ responseId: `${id}:r${index + 1}`, text }));
  const dimension = ru ? "новая старая модель на демонстрационном столе" : "нова стара модель на демонстраційному столі";
  return {
    interactionId: id, ordinal, purpose: "independent_check", family: "context_gap_grammar", inputMode: "single_choice",
    prompt, responseOptions: options, mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt,
    modePayload: {
      family: "context_gap_grammar", localizedScene: scene, gappedTargetPhrase: "___ old model is on the table.", gapOptions: options,
      testedDimension: dimension,
      choiceFeedback: [
        { responseId: `${id}:r2`, correct: false, testedDimension: dimension, feedbackByLocale: {
          ru: "`a` подходит для нового предмета, поэтому этот выбор понятен. Но после `a/an` слышен первый звук следующего слова: `old` начинается с гласного, поэтому нужно `an`. В новой фразе сначала слушайте начало слова после артикля.",
          uk: "`a` підходить для нового предмета, тому цей вибір зрозумілий. Але після `a/an` чуємо перший звук наступного слова: `old` починається з голосного, тому потрібне `an`. У новій фразі спершу слухайте початок слова після артикля.",
        } },
        { responseId: `${id}:r3`, correct: false, testedDimension: dimension, feedbackByLocale: {
          ru: "`the` звучит как указание на известную модель. Но сотрудник впервые показывает эту дополнительную модель, поэтому сначала нужен неопределённый артикль. В новом разговоре выбирайте `the` только для уже названного предмета.",
          uk: "`the` звучить як указівка на відому модель. Але працівник уперше показує цю додаткову модель, тому спочатку потрібен неозначений артикль. У новій розмові обирайте `the` лише для вже названого предмета.",
        } },
        { responseId: `${id}:r4`, correct: false, testedDimension: dimension, feedbackByLocale: {
          ru: "Без артикля говорят о множестве или неисчисляемом слове. Здесь одна исчисляемая модель, названная впервые, поэтому нужен `an`. В новой фразе проверьте: предмет один? Тогда перед ним нужен артикль.",
          uk: "Без артикля говорять про множину або незлічуване слово. Тут одна злічувана модель, названа вперше, тому потрібне `an`. У новій фразі перевірте: предмет один? Тоді перед ним потрібен артикль.",
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
  } else throw new Error(`s45_final_shape_unexpected:${locale}`);
  if (interactionsByLocale[locale].length !== 17) throw new Error(`s45_task_count_unexpected:${locale}`);
}
const answers = source.answers.filter((answer) => !retired.includes(answer.interactionId) && answer.interactionId !== id);
answers.push({ interactionId: id, correctText: "An", correctResponseId: `${id}:r1` });
const next = { ...source, interactionsByLocale, answers };
if (!APPLY) console.log(JSON.stringify({ verdict: "READY", locales: Object.fromEntries(Object.entries(interactionsByLocale).map(([locale, entries]) => [locale, entries.length])), retired }));
else {
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ verdict: "APPLIED", locales: Object.fromEntries(Object.entries(interactionsByLocale).map(([locale, entries]) => [locale, entries.length])), retired }));
}
