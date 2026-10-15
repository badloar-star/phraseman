#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { writeMockupFile } from "./write_mockup_file.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SESSION = path.join(ROOT, "sessions/en/l01/s01");
const ATOMIC = path.join(SESSION, "practice.atomic.json");
const SESSION_ID = "en:lesson-01:session-01";
const locales = ["ru", "uk"];
const atomic = JSON.parse(fs.readFileSync(ATOMIC, "utf8"));

const copy = {
  ru: {
    i09Prompt: "Соберите фразу — коллега ищет вас, а вы уже в комнате",
    i10Prompt: "Соберите фразу — коллега спросил, как у вас дела; ответьте, что всё хорошо",
    i11Prompt: "Соберите фразу — начальник спрашивает, готовы ли вы начать",
    i12Prompt: "Послушайте реплику коллеги перед началом встречи и соберите её",
  },
  uk: {
    i09Prompt: "Складіть фразу — колега шукає вас, а ви вже в кімнаті",
    i10Prompt: "Складіть фразу — колега запитав, як ваші справи; скажіть, що все добре",
    i11Prompt: "Складіть фразу — начальник питає, чи ви готові почати",
    i12Prompt: "Послухайте репліку колеги перед початком зустрічі та складіть її",
  },
};
for (const locale of locales) {
  const interactions = atomic.interactionsByLocale[locale];
  const i09 = interactions.find((entry) => entry.interactionId === `${SESSION_ID}:i09`);
  const i10 = interactions.find((entry) => entry.interactionId === `${SESSION_ID}:i10`);
  const i11 = interactions.find((entry) => entry.interactionId === `${SESSION_ID}:i11`);
  const i12 = interactions.find((entry) => entry.interactionId === `${SESSION_ID}:i12`);
  if (!i09 || !i10 || !i11 || !i12) throw new Error(`s01_i09_i10_i11_i12_missing:${locale}`);

  const i13 = interactions.find((entry) => entry.interactionId === `${SESSION_ID}:i13`);
  if (!i13) throw new Error(`s01_i13_missing:${locale}`);
  const i13Prompt = locale === "ru"
    ? "Послушайте реплику у входа и выберите её смысл"
    : "Послухайте репліку біля входу та виберіть її зміст";
  i13.prompt = i13Prompt;
  i13.accessibilityLabel = i13Prompt;
  for (const feedback of i13.modePayload?.choiceFeedback ?? []) {
    feedback.testedDimension = i13Prompt;
  }

  i09.family = "phrase_builder";
  i09.inputMode = "ordered_tokens";
  i09.prompt = copy[locale].i09Prompt;
  i09.accessibilityLabel = copy[locale].i09Prompt;
  i09.audioTargetIds = [];
  i09.responseOptions = [];
  i09.modePayload = {
    family: "phrase_builder",
    targetPhrase: "I am here.",
    localizedMeaning: Object.fromEntries(locales.map((key) => [key, copy[key].i09Prompt])),
    orderedTokens: ["I", "am", "here"],
    authoredDistractorTokens: ["ready"],
    slotFeedback: [{
      responseId: `${SESSION_ID}:i09:tile:d1`,
      correct: false,
      testedDimension: copy[locale].i09Prompt,
      feedbackByLocale: {
        ru: "Ready означает «готов / готова». Здесь нужно сообщить, где вы: I am here.",
        uk: "Ready означає «готовий / готова». Тут треба повідомити, де ви: I am here.",
      },
    }],
  };

  i10.family = "phrase_builder";
  i10.inputMode = "ordered_tokens";
  i10.prompt = copy[locale].i10Prompt;
  i10.accessibilityLabel = copy[locale].i10Prompt;
  i10.audioTargetIds = [];
  i10.responseOptions = [];
  i10.modePayload = {
    family: "phrase_builder",
    targetPhrase: "I am fine.",
    localizedMeaning: Object.fromEntries(locales.map((key) => [key, copy[key].i10Prompt])),
    orderedTokens: ["I", "am", "fine"],
    authoredDistractorTokens: ["ready", "here"],
    slotFeedback: [
      { responseId: `${SESSION_ID}:i10:tile:d1`, correct: false, testedDimension: copy[locale].i10Prompt, feedbackByLocale: {
        ru: "Ready означает «готов / готова». О самочувствии говорят I am fine.",
        uk: "Ready означає «готовий / готова». Про самопочуття кажуть I am fine.",
      } },
      { responseId: `${SESSION_ID}:i10:tile:d2`, correct: false, testedDimension: copy[locale].i10Prompt, feedbackByLocale: {
        ru: "Here означает «здесь». Вопрос не о месте, а о том, как вы: I am fine.",
        uk: "Here означає «тут». Запитання не про місце, а про те, як ви: I am fine.",
      } },
    ],
  };

  i11.family = "phrase_builder";
  i11.inputMode = "ordered_tokens";
  i11.prompt = copy[locale].i11Prompt;
  i11.accessibilityLabel = copy[locale].i11Prompt;
  i11.audioTargetIds = [];
  i11.responseOptions = [];
  i11.modePayload = {
    family: "phrase_builder",
    targetPhrase: "I am ready.",
    localizedMeaning: Object.fromEntries(locales.map((key) => [key, copy[key].i11Prompt])),
    orderedTokens: ["I", "am", "ready"],
    authoredDistractorTokens: ["happy"],
    slotFeedback: [{
      responseId: `${SESSION_ID}:i11:tile:d1`,
      correct: false,
      testedDimension: copy[locale].i11Prompt,
      feedbackByLocale: {
        ru: "Happy означает «рад / рада». Здесь спрашивают о готовности: I am ready.",
        uk: "Happy означає «радий / рада». Тут питають про готовність: I am ready.",
      },
    }],
  };

  i12.family = "listen_build_dictation";
  i12.inputMode = "ordered_tokens";
  i12.prompt = copy[locale].i12Prompt;
  i12.accessibilityLabel = copy[locale].i12Prompt;
  i12.audioTargetIds = [`${SESSION_ID}:i12:audio`];
  i12.responseOptions = [];
  i12.modePayload = {
    family: "listen_build_dictation",
    referenceAudio: { audioTargetId: `${SESSION_ID}:i12:audio`, transcript: "I am ready." },
    slowReferenceAudio: null,
    hiddenTargetPhrase: "I am ready.",
    orderedTokens: ["I", "am", "ready"],
    authoredDistractorTokens: ["fine"],
    slotFeedback: [{
      responseId: `${SESSION_ID}:i12:tile:d1`,
      correct: false,
      testedDimension: copy[locale].i12Prompt,
      feedbackByLocale: {
        ru: "Fine означает «всё хорошо», а коллега сообщает, что готов к встрече: I am ready.",
        uk: "Fine означає «усе добре», а колега повідомляє, що готовий до зустрічі: I am ready.",
      },
    }],
  };
}

for (const [suffix, correctText, correctResponseId] of [
  ["i09", "I am here.", null],
  ["i10", "I am fine.", null],
  ["i11", "I am ready.", null],
  ["i12", "I am ready.", null],
]) {
  const answer = atomic.answers.find((entry) => entry.interactionId === `${SESSION_ID}:${suffix}`);
  if (!answer) throw new Error(`s01_answer_missing:${suffix}`);
  answer.correctText = correctText;
  answer.correctResponseId = correctResponseId;
}

const orderedIds = [
  "i01", "i02", "i03", "i04", "i05", "i06", "i07", "i07:a01", "i08",
  "i09", "i13", "i10", "i12", "i11", "i14", "i15", "i16", "i17:s01", "i17:s02", "i17:s03",
].map((suffix) => `${SESSION_ID}:${suffix}`);
const orderById = new Map(orderedIds.map((id, index) => [id, index]));
for (const locale of locales) {
  atomic.interactionsByLocale[locale].sort((left, right) => orderById.get(left.interactionId) - orderById.get(right.interactionId));
  atomic.interactionsByLocale[locale].forEach((interaction, index) => { interaction.ordinal = index + 1; });
}
atomic.answers.sort((left, right) => orderById.get(left.interactionId) - orderById.get(right.interactionId));

await writeMockupFile(ATOMIC, `${JSON.stringify(atomic, null, 2)}\n`);
console.log(JSON.stringify({ session: "en/l01/s01", repaired: ["visible_tasks_11_12_duplicate_mechanic"] }));
