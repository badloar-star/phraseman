#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { writeMockupFile } from "./write_mockup_file.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SESSION = path.join(ROOT, "sessions/en/l01/s01");
const SIDECAR = path.join(SESSION, "practice.explanations.v1.json");
const ATOMIC = path.join(SESSION, "practice.atomic.json");
const LOCALES = ["ru", "uk"];
const EVIDENCE = "judgements/2026-10-13_l01_s01_source_evidence.md";
const evidenceRef = (anchor) => `${EVIDENCE}#${anchor}`;
const S01_SOURCE_REFS = Object.freeze([
  evidenceRef("be-present-i-am"),
  evidenceRef("pronoun-i"),
  evidenceRef("here-adverb"),
  evidenceRef("ready-adjective"),
  evidenceRef("fine-adjective"),
  evidenceRef("happy-adjective"),
  evidenceRef("punctuation-full-stop"),
]);
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const lexical = Object.freeze({
  I: { lemma: "I", pos: "personal_pronoun", label: { ru: "личное местоимение", uk: "особовий займенник" }, meaning: { ru: "я", uk: "я" }, function: { ru: "Называет говорящего и служит подлежащим.", uk: "Називає мовця й слугує підметом." } },
  am: { lemma: "be", pos: "linking_verb", label: { ru: "глагол-связка", uk: "дієслово-зв'язка" }, meaning: { ru: "форма be после I", uk: "форма be після I" }, function: { ru: "Связывает I с сообщением о говорящем; в полной фразе после I обязательна форма am.", uk: "Пов'язує I з повідомленням про мовця; у повній фразі після I обов'язкова форма am." } },
  here: { lemma: "here", pos: "adverb", label: { ru: "наречие", uk: "прислівник" }, meaning: { ru: "здесь", uk: "тут" }, function: { ru: "Сообщает о месте, где находится говорящий.", uk: "Повідомляє про місце, де перебуває мовець." } },
  ready: { lemma: "ready", pos: "adjective", label: { ru: "прилагательное", uk: "прикметник" }, meaning: { ru: "готов / готова", uk: "готовий / готова" }, function: { ru: "Описывает готовность говорящего начать.", uk: "Описує готовність мовця почати." } },
  fine: { lemma: "fine", pos: "adjective", label: { ru: "прилагательное", uk: "прикметник" }, meaning: { ru: "всё хорошо", uk: "усе добре" }, function: { ru: "После am сообщает, что у говорящего всё хорошо.", uk: "Після am повідомляє, що в мовця все добре." } },
  happy: { lemma: "happy", pos: "adjective", label: { ru: "прилагательное", uk: "прикметник" }, meaning: { ru: "рад / рада", uk: "радий / рада" }, function: { ru: "После am описывает радость говорящего.", uk: "Після am описує радість мовця." } },
  ".": { lemma: ".", pos: "punctuation", label: { ru: "знак препинания", uk: "розділовий знак" }, meaning: { ru: "конец утверждения", uk: "кінець твердження" }, function: { ru: "Завершает предложение.", uk: "Завершує речення." } },
  "/": { lemma: "/", pos: "punctuation", label: { ru: "разделительный знак", uk: "розділовий знак" }, meaning: { ru: "разделяет варианты рода", uk: "розділяє варіанти роду" }, function: { ru: "Показывает два согласованных варианта формы.", uk: "Показує два узгоджені варіанти форми." } },
});

const localizedLexical = Object.freeze({
  ru: {
    Я: ["я", "personal_pronoun", { ru: "личное местоимение", uk: "особовий займенник" }, { ru: "я", uk: "я" }, { ru: "Называет говорящего и служит подлежащим.", uk: "Називає мовця й слугує підметом." }],
    здесь: ["здесь", "adverb", { ru: "наречие", uk: "прислівник" }, { ru: "здесь", uk: "тут" }, { ru: "Сообщает о месте говорящего.", uk: "Повідомляє про місце мовця." }],
    готов: ["готов", "adjective", { ru: "прилагательное", uk: "прикметник" }, { ru: "готов", uk: "готовий" }, { ru: "Описывает готовность говорящего в мужском роде.", uk: "Описує готовність мовця в чоловічому роді." }],
    готова: ["готов", "adjective", { ru: "прилагательное", uk: "прикметник" }, { ru: "готова", uk: "готова" }, { ru: "Описывает готовность говорящего в женском роде.", uk: "Описує готовність мовця в жіночому роді." }],
    У: ["у", "preposition", { ru: "предлог", uk: "прийменник" }, { ru: "у", uk: "у" }, { ru: "В конструкции «у меня» вводит человека, чьё состояние описывается.", uk: "У конструкції «у мене» вводить людину, чий стан описано." }],
    меня: ["я", "personal_pronoun", { ru: "личное местоимение", uk: "особовий займенник" }, { ru: "меня", uk: "мене" }, { ru: "Вместе с «у» указывает на говорящего.", uk: "Разом з «у» вказує на мовця." }],
    всё: ["всё", "pronoun", { ru: "местоимение", uk: "займенник" }, { ru: "всё", uk: "усе" }, { ru: "Обобщает состояние дел.", uk: "Узагальнює стан справ." }],
    хорошо: ["хорошо", "adverb", { ru: "наречие", uk: "прислівник" }, { ru: "хорошо", uk: "добре" }, { ru: "Сообщает положительную оценку состояния.", uk: "Повідомляє позитивну оцінку стану." }],
  },
  uk: {
    Я: ["я", "personal_pronoun", { ru: "личное местоимение", uk: "особовий займенник" }, { ru: "я", uk: "я" }, { ru: "Называет говорящего и служит подлежащим.", uk: "Називає мовця й слугує підметом." }],
    тут: ["тут", "adverb", { ru: "наречие", uk: "прислівник" }, { ru: "здесь", uk: "тут" }, { ru: "Сообщает о месте говорящего.", uk: "Повідомляє про місце мовця." }],
    готовий: ["готовий", "adjective", { ru: "прилагательное", uk: "прикметник" }, { ru: "готов", uk: "готовий" }, { ru: "Описывает готовность говорящего в мужском роде.", uk: "Описує готовність мовця в чоловічому роді." }],
    готова: ["готовий", "adjective", { ru: "прилагательное", uk: "прикметник" }, { ru: "готова", uk: "готова" }, { ru: "Описывает готовность говорящего в женском роде.", uk: "Описує готовність мовця в жіночому роді." }],
    У: ["у", "preposition", { ru: "предлог", uk: "прийменник" }, { ru: "у", uk: "у" }, { ru: "В конструкции «у меня» вводит человека, чьё состояние описывается.", uk: "У конструкції «у мене» вводить людину, чий стан описано." }],
    мене: ["я", "personal_pronoun", { ru: "личное местоимение", uk: "особовий займенник" }, { ru: "меня", uk: "мене" }, { ru: "Вместе с «у» указывает на говорящего.", uk: "Разом з «у» вказує на мовця." }],
    все: ["все", "pronoun", { ru: "местоимение", uk: "займенник" }, { ru: "всё", uk: "усе" }, { ru: "Обобщает состояние дел.", uk: "Узагальнює стан справ." }],
    добре: ["добре", "adverb", { ru: "наречие", uk: "прислівник" }, { ru: "хорошо", uk: "добре" }, { ru: "Сообщает положительную оценку состояния.", uk: "Повідомляє позитивну оцінку стану." }],
  },
});

function tokens(text) {
  return [...text.matchAll(/[\p{L}']+|[/.!?]/gu)].map((match) => ({ text: match[0], start: match.index, end: match.index + match[0].length }));
}

function englishUnit(token, sourceRefs) {
  const fact = lexical[token.text] ?? lexical[token.text.toLocaleLowerCase("en-US")];
  if (!fact) throw new Error(`s01_text_analysis_unknown_english_token:${token.text}`);
  return { ...token, lemma: fact.lemma, partOfSpeech: fact.pos, partOfSpeechLabelByLocale: fact.label, meaningByLocale: fact.meaning, functionByLocale: fact.function, sourceRefs };
}

function claimSpecificEnglishRefs(text, token) {
  const anchors = {
    I: ["i-pronoun-ru-uk"],
    am: ["be-i-am-ru-uk"],
    here: ["here-adverb-ru-uk"],
    ready: ["ready-adjective-ru-uk"],
    fine: ["fine-adjective-ru-uk"],
    happy: ["happy-adjective-ru-uk"],
    ".": ["punctuation-full-stop"],
  };
  const surface = token.text === "I" ? "I" : token.text.toLocaleLowerCase("en-US");
  const selected = [...(anchors[surface] ?? [])];
  if (text === "I am." && surface === "am") selected.push("short-answer-i-am");
  if (!selected.length) throw new Error(`s01_source_ref_unknown_english_token:${token.text}`);
  return selected.map(evidenceRef);
}

function claimSpecificLocalizedRefs(text, token) {
  if (token.text === ".") return [evidenceRef("punctuation-full-stop")];
  if (token.text === "/") return [evidenceRef("localized-gender-separator")];
  const anchors = {
    Я: "i-pronoun-ru-uk",
    здесь: "here-adverb-ru-uk",
    тут: "here-adverb-ru-uk",
    готов: "ready-adjective-ru-uk",
    готовий: "ready-adjective-ru-uk",
    готова: "ready-adjective-ru-uk",
    рад: "happy-adjective-ru-uk",
    рада: "happy-adjective-ru-uk",
    радий: "happy-adjective-ru-uk",
    У: "localized-fine-preposition-u-ru-uk",
    меня: "localized-fine-pronoun-menya-mene",
    мене: "localized-fine-pronoun-menya-mene",
    всё: "localized-fine-pronoun-vsyo-vse",
    все: "localized-fine-pronoun-vsyo-vse",
    хорошо: "localized-fine-adverb-khorosho-dobre",
    добре: "localized-fine-adverb-khorosho-dobre",
  };
  if (anchors[token.text]) return [evidenceRef(anchors[token.text])];
  throw new Error(`s01_source_ref_unknown_localized_token:${token.text}:${text}`);
}

function localizedUnit(token, locale, sourceRefs) {
  if (token.text === "." || token.text === "/") {
    const fact = lexical[token.text];
    return { ...token, lemma: fact.lemma, partOfSpeech: fact.pos, partOfSpeechLabelByLocale: fact.label, meaningByLocale: fact.meaning, functionByLocale: fact.function, sourceRefs };
  }
  const fact = localizedLexical[locale][token.text];
  if (!fact) throw new Error(`s01_text_analysis_unknown_${locale}_token:${token.text}`);
  const [lemma, partOfSpeech, label, meaning, fn] = fact;
  return {
    ...token,
    lemma,
    partOfSpeech,
    partOfSpeechLabelByLocale: label,
    meaningByLocale: meaning,
    functionByLocale: fn,
    sourceRefs,
  };
}

function contextualEnglishFunction(text, unit) {
  const invalid = {
    "Am here.": {
      Am: { ru: "Без I у формы am нет подлежащего: в полной фразе нужно I am here.", uk: "Без I форма am не має підмета: у повній фразі потрібно I am here." },
    },
    "I here.": {
      here: { ru: "Без am слово here не образует с I полную английскую фразу.", uk: "Без am слово here не утворює з I повну англійську фразу." },
    },
    "I ready.": {
      ready: { ru: "Без am прилагательное ready не образует с I полную фразу этого урока.", uk: "Без am прикметник ready не утворює з I повну фразу цього уроку." },
    },
    "I happy.": {
      happy: { ru: "Без am прилагательное happy не образует с I полную фразу этого урока.", uk: "Без am прикметник happy не утворює з I повну фразу цього уроку." },
    },
    "I ready am.": {
      am: { ru: "Am должно стоять сразу после I; в конце этого варианта порядок нарушен.", uk: "Am має стояти одразу після I; наприкінці цього варіанта порядок порушено." },
      ready: { ru: "Ready должно идти после I am, а не разрывать I и am.", uk: "Ready має стояти після I am, а не розривати I та am." },
    },
    "I am.": {
      I: { ru: "I называет говорящего и служит подлежащим, но без happy весь ответ не называет нужную эмоцию.", uk: "I називає мовця й слугує підметом, але без happy вся відповідь не називає потрібну емоцію." },
      am: { ru: "Am образует грамматический краткий ответ, но здесь без happy не называет требуемую эмоцию.", uk: "Am утворює граматичну коротку відповідь, але тут без happy не називає потрібну емоцію." },
      ".": { ru: "Точка завершает предложение, но без happy весь ответ не называет нужную эмоцию.", uk: "Крапка завершує речення, але без happy вся відповідь не називає потрібну емоцію." },
    },
  };
  return invalid[text]?.[unit.text] ?? null;
}

function englishAnalysis(text, meaningByLocale, explanationByLocale, sourceRefs) {
  return {
    text,
    meaningByLocale,
    explanationByLocale,
    units: tokens(text).map((token) => {
      const resolvedSourceRefs = typeof sourceRefs === "function" ? sourceRefs(token) : sourceRefs;
      const unit = englishUnit(token, resolvedSourceRefs);
      const functionByLocale = contextualEnglishFunction(text, unit);
      return functionByLocale ? { ...unit, functionByLocale } : unit;
    }),
  };
}

function localizedAnalysis(text, locale, meaningByLocale, explanationByLocale, sourceRefs) {
  return {
    text,
    meaningByLocale,
    explanationByLocale,
    units: tokens(text).map((token) => localizedUnit(
      token,
      locale,
      typeof sourceRefs === "function" ? sourceRefs(token) : sourceRefs,
    )),
  };
}

const phraseMeaning = Object.freeze({
  "I am here.": { ru: "Я здесь.", uk: "Я тут." },
  "I here.": { ru: "Задумано как «я здесь», но в полной английской фразе пропущено am.", uk: "Задумано як «я тут», але в повній англійській фразі пропущено am." },
  "Am here.": { ru: "Задумано как «я здесь», но не назван говорящий I.", uk: "Задумано як «я тут», але не названо мовця I." },
  "I am ready.": { ru: "Я готов / готова.", uk: "Я готовий / готова." },
  "I ready am.": { ru: "Слова относятся к готовности, но стоят в неверном порядке.", uk: "Слова стосуються готовності, але стоять у неправильному порядку." },
  "I ready.": { ru: "Задумано как «я готов / готова», но пропущено am.", uk: "Задумано як «я готовий / готова», але пропущено am." },
  "I am fine.": { ru: "У меня всё хорошо.", uk: "У мене все добре." },
  "I am happy.": { ru: "Я рад / рада.", uk: "Я радий / рада." },
  "I happy.": { ru: "Задумано как «я рад / рада», но пропущено am.", uk: "Задумано як «я радий / рада», але пропущено am." },
    "I am.": { ru: "Возможный краткий ответ «Да, я…», но здесь он не сообщает, что говорящий рад.", uk: "Можлива коротка відповідь «Так, я…», але тут вона не повідомляє, що мовець радий." },
});

const completionByPhrase = Object.freeze({
  "I am here.": { ru: "Верно: I am here. — «Я здесь».", uk: "Правильно: I am here. — «Я тут»." },
  "I am ready.": { ru: "Верно: I am ready. — «Я готов / готова».", uk: "Правильно: I am ready. — «Я готовий / готова»." },
  "I am fine.": { ru: "Верно: I am fine. — «У меня всё хорошо».", uk: "Правильно: I am fine. — «У мене все добре»." },
  "I am happy.": { ru: "Верно: I am happy. — «Я рад / рада».", uk: "Правильно: I am happy. — «Я радий / рада»." },
});

function explanationFor(text) {
  const exact = {
    "I am here.": { ru: "I называет говорящего, am связывает его со словом о месте, а here сообщает, что говорящий находится здесь.", uk: "I називає мовця, am пов'язує його зі словом про місце, а here повідомляє, що мовець перебуває тут." },
    "I am ready.": { ru: "I называет говорящего, am связывает его со словом о состоянии, а ready сообщает о готовности.", uk: "I називає мовця, am пов'язує його зі словом про стан, а ready повідомляє про готовність." },
    "I am fine.": { ru: "I называет говорящего, am связывает его со словом о состоянии, а fine означает, что у говорящего всё хорошо.", uk: "I називає мовця, am пов'язує його зі словом про стан, а fine означає, що в мовця все добре." },
    "I am happy.": { ru: "I называет говорящего, am связывает его со словом о состоянии, а happy сообщает, что говорящий рад.", uk: "I називає мовця, am пов'язує його зі словом про стан, а happy повідомляє, що мовець радий." },
    "I here.": { ru: "I называет говорящего, а here сообщает место; для полной фразы между ними нужна форма am.", uk: "I називає мовця, а here повідомляє місце; для повної фрази між ними потрібна форма am." },
    "Am here.": { ru: "am связывает говорящего со словом here, но в утверждении не назван говорящий I.", uk: "am пов'язує мовця зі словом here, але у твердженні не названо мовця I." },
    "I ready am.": { ru: "Все нужные слова присутствуют, но в утверждении am должно стоять сразу после I.", uk: "Усі потрібні слова є, але у твердженні am має стояти одразу після I." },
    "I ready.": { ru: "I называет говорящего, а ready описывает готовность; для полной фразы между ними нужна форма am.", uk: "I називає мовця, а ready описує готовність; для повної фрази між ними потрібна форма am." },
    "I happy.": { ru: "I называет говорящего, а happy описывает его состояние; для полной фразы между ними нужна форма am.", uk: "I називає мовця, а happy описує його стан; для повної фрази між ними потрібна форма am." },
    "I am.": { ru: "I am без happy не называет нужную эмоцию: как краткий ответ оно может быть грамматичным, но здесь нужно прямо сказать, что вы рады.", uk: "I am без happy не називає потрібну емоцію: як коротка відповідь воно може бути граматичним, але тут треба прямо сказати, що ви раді." },
  }[text];
  if (!exact) throw new Error(`s01_phrase_explanation_missing:${text}`);
  return exact;
}

function wordAnalysis(word) {
  const meaning = lexical[word].meaning;
  const explanations = {
    here: { ru: "here — наречие места «здесь»; после I am оно сообщает, где находится говорящий.", uk: "here — прислівник місця «тут»; після I am він повідомляє, де перебуває мовець." },
    ready: { ru: "ready — прилагательное «готов / готова»; после I am оно сообщает о готовности говорящего начать.", uk: "ready — прикметник «готовий / готова»; після I am він повідомляє про готовність мовця почати." },
    fine: { ru: "fine — прилагательное состояния «всё хорошо»; после I am оно отвечает на вопрос о самочувствии или делах.", uk: "fine — прикметник стану «усе добре»; після I am він відповідає на запитання про самопочуття або справи." },
    happy: { ru: "happy — прилагательное «рад / рада»; после I am оно называет положительную эмоцию говорящего.", uk: "happy — прикметник «радий / рада»; після I am він називає позитивну емоцію мовця." },
  };
  const anchors = { here: "here-adverb-ru-uk", ready: "ready-adjective-ru-uk", fine: "fine-adjective-ru-uk", happy: "happy-adjective-ru-uk" };
  return englishAnalysis(word, meaning, explanations[word], [evidenceRef(anchors[word])]);
}

function phraseAnalysis(text, source = "practice") {
  return englishAnalysis(
    text,
    phraseMeaning[text],
    explanationFor(text),
    (token) => claimSpecificEnglishRefs(text, token),
  );
}

function sourceRefsForAnalysis(analysis) {
  return [...new Set(analysis.units.flatMap((unit) => unit.sourceRefs))];
}

function introOptions(locale) {
  const markdown = fs.readFileSync(path.join(SESSION, `final.${locale}.md`), "utf8");
  return markdown.split(/^##\s*[ИІ]нтро\s*\d+[^\n]*$/mi).slice(1, 4).flatMap((block, pageIndex) => {
    const section = block.split(/^##\s+/m, 1)[0];
    return [...section.matchAll(/^-\s+([✅❌])\s*(?:\*\*)?(.+?)(?:\*\*)?\s+—\s+\*([^\n]+)\*\s*$/gmu)].map((match, choiceIndex) => ({
      responseId: `en:lesson-01:session-01:intro${pageIndex + 1}:r${choiceIndex + 1}`,
      text: match[2].trim().replace(/^\*\*|\*\*$/gu, ""),
      feedback: match[3].trim(),
      correct: match[1] === "✅",
    }));
  });
}

const diagnostic = (temptingRu, temptingUk, contrastRu, contrastUk, boundaryRu, boundaryUk) => ({
  whyTemptingByLocale: { ru: temptingRu, uk: temptingUk },
  minimalContrastByLocale: { ru: contrastRu, uk: contrastUk },
  acceptabilityBoundaryByLocale: { ru: boundaryRu, uk: boundaryUk },
});

const diagnosticById = Object.freeze({
  "en:lesson-01:session-01:intro1:r2": diagnostic(
    "Русская фраза «я здесь» обходится без связки, поэтому рука тянется поставить рядом только I и here.",
    "Українська фраза «я тут» обходиться без зв'язки, тому хочеться поставити поруч лише I та here.",
    "I here — пропущено am; I am here — полное утверждение «я здесь».",
    "I here — пропущено am; I am here — повне твердження «я тут».",
    "I here возможно как намеренно обрывочная речь в особом контексте; для нейтрального ответа у входа нужна полная форма I am here.",
    "I here можливе як навмисно уривчасте мовлення в особливому контексті; для нейтральної відповіді біля входу потрібна повна форма I am here.",
  ),
  "en:lesson-01:session-01:intro1:r3": diagnostic(
    "Am here сохраняет слово о месте и на слух напоминает конец правильной фразы, поэтому отсутствие подлежащего I можно пропустить.",
    "Am here зберігає слово про місце й на слух нагадує кінець правильної фрази, тому відсутність підмета I можна не помітити.",
    "Am here — не назван говорящий; I am here — говорящий назван словом I.",
    "Am here — не названо мовця; I am here — мовця названо словом I.",
    "Am here может встречаться лишь как обрывок или помета; самостоятельное нейтральное утверждение о себе начинается с I.",
    "Am here може траплятися лише як уривок або позначка; самостійне нейтральне твердження про себе починається з I.",
  ),
  "en:lesson-01:session-01:intro2:r2": diagnostic(
    "В I ready am есть все три нужных слова, и ученик может проверить только набор слов, не проверив их порядок.",
    "У I ready am є всі три потрібні слова, і учень може перевірити лише набір слів, не перевіривши їхній порядок.",
    "I ready am — ready разрывает I am; I am ready — am стоит сразу после I.",
    "I ready am — ready розриває I am; I am ready — am стоїть одразу після I.",
    "Инверсия I ready am не является обычным утверждением; в отрабатываемой нейтральной фразе порядок фиксирован: I am ready.",
    "Інверсія I ready am не є звичайним твердженням; у нейтральній фразі, яку відпрацьовують, порядок фіксований: I am ready.",
  ),
  "en:lesson-01:session-01:intro2:r3": diagnostic(
    "I ready похоже на дословное «я готов», где в русском связка в настоящем времени не произносится.",
    "I ready схоже на дослівне «я готовий», де в українській зв'язка в теперішньому часі не вимовляється.",
    "I ready — нет am; I am ready — am связывает I и ready.",
    "I ready — немає am; I am ready — am пов'язує I та ready.",
    "I ready может быть понятным учебным обрывком, но не нейтральным полным ответом о готовности; здесь требуется I am ready.",
    "I ready може бути зрозумілим навчальним уривком, але не нейтральною повною відповіддю про готовність; тут потрібне I am ready.",
  ),
  "en:lesson-01:session-01:intro3:r2": diagnostic(
    "I happy копирует безглагольную модель «я рад», поэтому короткое am легко потерять между I и happy.",
    "I happy копіює бездієслівну модель «я радий», тому коротке am легко загубити між I та happy.",
    "I happy — пропущено am; I am happy — полная фраза о радости.",
    "I happy — пропущено am; I am happy — повна фраза про радість.",
    "I happy допустимо только как намеренный обрывок; сообщая о своей эмоции нейтральной фразой, говорят I am happy.",
    "I happy припустиме лише як навмисний уривок; повідомляючи про свою емоцію нейтральною фразою, кажуть I am happy.",
  ),
  "en:lesson-01:session-01:intro3:r3": diagnostic(
    "I am может быть грамматическим кратким ответом, поэтому форма выглядит законченной даже без слова happy.",
    "I am може бути граматичною короткою відповіддю, тому форма виглядає завершеною навіть без слова happy.",
    "Краткий ответ сообщает только согласие; I am happy прямо называет требуемую эмоцию.",
    "Коротка відповідь повідомляє лише згоду; I am happy прямо називає потрібну емоцію.",
    "I am грамматично как краткий ответ, но здесь просьба требует назвать радость, поэтому без happy сообщение недостаточно.",
    "I am граматичне як коротка відповідь, але тут прохання вимагає назвати радість, тому без happy повідомлення недостатнє.",
  ),
  "en:lesson-01:session-01:i09:tile:d1": diagnostic(
    "ready подходит после I am по грамматике, поэтому лишняя плитка выглядит как возможное завершение фразы.",
    "ready підходить після I am граматично, тому зайва плитка виглядає як можливе завершення фрази.",
    "I am ready сообщает о готовности; I am here сообщает, что вы уже в комнате.",
    "I am ready повідомляє про готовність; I am here повідомляє, що ви вже в кімнаті.",
    "ready подходит, когда спрашивают, готовы ли вы начать; коллега сейчас ищет ваше местоположение, поэтому нужно here.",
    "ready підходить, коли питають, чи ви готові почати; колега зараз шукає ваше місце, тому потрібне here.",
  ),
  "en:lesson-01:session-01:i11:tile:d1": diagnostic(
    "happy и ready оба описывают состояние человека после I am, поэтому грамматическая позиция не помогает выбрать смысл.",
    "happy і ready обидва описують стан людини після I am, тому граматична позиція не допомагає вибрати зміст.",
    "I am happy — «я рад»; I am ready — «я готов начать».",
    "I am happy — «я радий»; I am ready — «я готовий почати».",
    "happy уместно после хорошей новости; вопрос начальника относится к готовности начать, поэтому здесь ready.",
    "happy доречне після хорошої новини; запитання начальника стосується готовності почати, тому тут ready.",
  ),
  "en:lesson-01:session-01:i12:tile:d1": diagnostic(
    "fine и ready оба могут описывать говорящего после I am, а без прослушивания обе плитки выглядят грамматически возможными.",
    "fine і ready обидва можуть описувати мовця після I am, а без прослуховування обидві плитки виглядають граматично можливими.",
    "I am fine отвечает о самочувствии; I am ready сообщает готовность к встрече.",
    "I am fine відповідає про самопочуття; I am ready повідомляє готовність до зустрічі.",
    "fine подходит после вопроса «как дела?»; в записи коллега говорит о готовности начать встречу, поэтому собирается ready.",
    "fine підходить після запитання «як справи?»; у записі колега говорить про готовність почати зустріч, тому складається ready.",
  ),
  "en:lesson-01:session-01:i15:tile:d1": diagnostic(
    "ready связано с готовым рабочим местом из условия, поэтому можно ошибочно повторить это слово как описание своей реакции.",
    "ready пов'язане з готовим робочим місцем в умові, тому можна помилково повторити це слово як опис власної реакції.",
    "ready сообщает о готовности к действию; I am happy описывает вашу радость от новости.",
    "ready повідомляє про готовність до дії; I am happy описує вашу радість від новини.",
    "ready годится для вашей готовности или готовности предмета; здесь требуется именно ваша эмоция, поэтому happy.",
    "ready годиться для вашої готовності або готовності предмета; тут потрібна саме ваша емоція, тому happy.",
  ),
  "en:lesson-01:session-01:i16:tile:d1": diagnostic(
    "fine и happy оба положительно описывают состояние, поэтому без слуховой опоры их легко спутать.",
    "fine і happy обидва позитивно описують стан, тому без слухової опори їх легко сплутати.",
    "I am fine — со мной всё хорошо; I am happy — я рад хорошей новости.",
    "I am fine — зі мною все добре; I am happy — я радий хорошій новині.",
    "fine уместно как нейтральный ответ о делах; в записи Мира выражает радость от первого дня, поэтому нужен happy.",
    "fine доречне як нейтральна відповідь про справи; у записі Міра висловлює радість від першого дня, тому потрібне happy.",
  ),
  "en:lesson-01:session-01:i10:tile:d1": diagnostic(
    "ready стоит в той же позиции после I am и уже знакомо, поэтому может отвлечь от вопроса о самочувствии.",
    "ready стоїть у тій самій позиції після I am і вже знайоме, тому може відвернути увагу від запитання про самопочуття.",
    "I am ready — «я готов»; I am fine — «у меня всё хорошо».",
    "I am ready — «я готовий»; I am fine — «у мене все добре».",
    "ready отвечает на вопрос о начале действия; коллега спрашивает, как у вас дела, поэтому требуется fine.",
    "ready відповідає на запитання про початок дії; колега питає, як ваші справи, тому потрібне fine.",
  ),
  "en:lesson-01:session-01:i10:tile:d2": diagnostic(
    "here тоже образует правильную фразу I am here, поэтому ошибка не видна без учёта вопроса коллеги.",
    "here теж утворює правильну фразу I am here, тому помилку не видно без урахування запитання колеги.",
    "I am here называет место; I am fine отвечает, как у вас дела.",
    "I am here називає місце; I am fine відповідає, як ваші справи.",
    "here подходит, когда вас ищут; здесь местоположение не спрашивают, поэтому ответ заканчивается словом fine.",
    "here підходить, коли вас шукають; тут про місце не питають, тому відповідь закінчується словом fine.",
  ),
  "en:lesson-01:session-01:i17:s03:tile:d1": diagnostic(
    "ready грамматически подходит к I am и связано со встречей, но аудио проверяет другой смысл.",
    "ready граматично підходить до I am і пов'язане із зустріччю, але аудіо перевіряє інший зміст.",
    "I am ready — готов начать; I am fine — всё хорошо.",
    "I am ready — готовий почати; I am fine — усе добре.",
    "ready выбирают после вопроса о готовности; в этой реплике отвечают на «как дела?», поэтому слышится fine.",
    "ready обирають після запитання про готовність; у цій репліці відповідають на «як справи?», тому чути fine.",
  ),
  "en:lesson-01:session-01:i17:s03:tile:d2": diagnostic(
    "here образует знакомую правильную фразу и может показаться безопасной плиткой, если не различить тему реплики.",
    "here утворює знайому правильну фразу й може здатися безпечною плиткою, якщо не розрізнити тему репліки.",
    "I am here отвечает «где?»; I am fine отвечает «как дела?».",
    "I am here відповідає «де?»; I am fine відповідає «як справи?».",
    "here уместно при сообщении о прибытии; эта реплика сообщает о состоянии, поэтому завершается fine.",
    "here доречне в повідомленні про прибуття; ця репліка повідомляє про стан, тому завершується fine.",
  ),
  "en:lesson-01:session-01:i02:r2": diagnostic(
    "ready — знакомое положительное состояние и грамматически подходит в пропуск после I am, поэтому форму легко принять за достаточную.",
    "ready — знайомий позитивний стан і граматично підходить у пропуск після I am, тому форму легко визнати достатньою.",
    "I am ready сообщает готовность; I am here сообщает, что вы уже в офисе.",
    "I am ready повідомляє готовність; I am here повідомляє, що ви вже в офісі.",
    "ready было бы ответом на «можно начинать?»; Мира спрашивает, добрались ли вы, поэтому нужен ответ о месте — here.",
    "ready було б відповіддю на «можна починати?»; Міра питає, чи ви дісталися, тому потрібна відповідь про місце — here.",
  ),
  "en:lesson-01:session-01:i02:r3": diagnostic(
    "fine тоже естественно стоит после I am и выглядит как вежливый ответ, если не заметить вопрос о прибытии.",
    "fine теж природно стоїть після I am і виглядає як ввічлива відповідь, якщо не помітити запитання про прибуття.",
    "I am fine — ответ о состоянии; I am here — подтверждение местоположения.",
    "I am fine — відповідь про стан; I am here — підтвердження місця.",
    "fine отвечает на «как вы?»; в этой сцене Мира уточняет, где вы, поэтому выбирается here.",
    "fine відповідає на «як ви?»; у цій сцені Міра уточнює, де ви, тому обирається here.",
  ),
  "en:lesson-01:session-01:i04:r2": diagnostic(
    "fine — положительный ответ о себе, поэтому может показаться согласительным ответом на предложение начать.",
    "fine — позитивна відповідь про себе, тому може здатися згодою на пропозицію почати.",
    "I am fine сообщает самочувствие; I am ready подтверждает готовность начать.",
    "I am fine повідомляє про самопочуття; I am ready підтверджує готовність почати.",
    "fine уместно в ответе о делах; Антон спрашивает именно о готовности к действию, поэтому нужно ready.",
    "fine доречне у відповіді про справи; Антон питає саме про готовність до дії, тому потрібне ready.",
  ),
  "en:lesson-01:session-01:i04:r3": diagnostic(
    "happy положительно описывает человека и может звучать как согласие, но оно называет эмоцию, а не готовность.",
    "happy позитивно описує людину й може звучати як згода, але воно називає емоцію, а не готовність.",
    "I am happy — я рад; I am ready — я готов начать.",
    "I am happy — я радий; I am ready — я готовий почати.",
    "happy подходит после хорошей новости; перед началом дела вопрос Антона требует ready.",
    "happy підходить після хорошої новини; перед початком справи запитання Антона вимагає ready.",
  ),
  "en:lesson-01:session-01:i06:r2": diagnostic(
    "here — уже выученное завершение I am, поэтому ученик может восстановить знакомую фразу вместо ответа на новый вопрос.",
    "here — вже вивчене завершення I am, тому учень може відновити знайому фразу замість відповіді на нове запитання.",
    "I am here сообщает местоположение; I am fine сообщает, что всё хорошо.",
    "I am here повідомляє місце; I am fine повідомляє, що все добре.",
    "here отвечает тому, кто вас ищет; коллега спрашивает о самочувствии, поэтому нужен fine.",
    "here відповідає тому, хто вас шукає; колега питає про самопочуття, тому потрібне fine.",
  ),
  "en:lesson-01:session-01:i06:r3": diagnostic(
    "ready тоже описывает состояние и стоит после I am, поэтому грамматика верна, но смысл вопроса остаётся без ответа.",
    "ready теж описує стан і стоїть після I am, тому граматика правильна, але зміст запитання лишається без відповіді.",
    "I am ready — готовность к действию; I am fine — состояние дел или самочувствие.",
    "I am ready — готовність до дії; I am fine — стан справ або самопочуття.",
    "ready уместно перед началом задачи; на вопрос «как дела?» нужен fine.",
    "ready доречне перед початком завдання; на запитання «як справи?» потрібне fine.",
  ),
  "en:lesson-01:session-01:i07:a01:r2": diagnostic(
    "fine передаёт положительное состояние и потому кажется близким к радости, но это более нейтральное «всё хорошо».",
    "fine передає позитивний стан і тому здається близьким до радості, але це нейтральніше «усе добре».",
    "I am fine — всё в порядке; I am happy — я испытываю радость.",
    "I am fine — усе гаразд; I am happy — я відчуваю радість.",
    "fine подходит для общего ответа о делах; хорошая новость в условии требует назвать эмоцию happy.",
    "fine підходить для загальної відповіді про справи; хороша новина в умові вимагає назвати емоцію happy.",
  ),
  "en:lesson-01:session-01:i07:a01:r3": diagnostic(
    "ready может выражать положительное отношение к следующему действию, но не сообщает, что новость вас радует.",
    "ready може виражати позитивне ставлення до наступної дії, але не повідомляє, що новина вас тішить.",
    "I am ready — готов действовать; I am happy — рад новости.",
    "I am ready — готовий діяти; I am happy — радий новині.",
    "ready отвечает на вопрос о подготовке; здесь нужно прямо назвать радость словом happy.",
    "ready відповідає на запитання про підготовку; тут треба прямо назвати радість словом happy.",
  ),
  "en:lesson-01:session-01:i13:r2": diagnostic(
    "Фраза «Я готов / готова» уже встречалась рядом с I am ready, поэтому её можно выбрать по знакомству, не различив услышанное here.",
    "Фраза «Я готовий / готова» вже траплялася поруч з I am ready, тому її можна обрати за знайомством, не розрізнивши почуте here.",
    "I am ready — «Я готов / готова»; I am here — «Я здесь».",
    "I am ready — «Я готовий / готова»; I am here — «Я тут».",
    "«Я готов / готова» верно переводит ready; в записи звучит here и говорится о присутствии у входа.",
    "«Я готовий / готова» правильно перекладає ready; у записі звучить here й ідеться про присутність біля входу.",
  ),
  "en:lesson-01:session-01:i13:r3": diagnostic(
    "«У меня всё хорошо» — естественная реплика о себе, поэтому она выглядит правдоподобно, хотя аудио содержит слово here.",
    "«У мене все добре» — природна репліка про себе, тому вона виглядає правдоподібно, хоча в аудіо звучить here.",
    "I am fine — «У меня всё хорошо»; I am here — «Я здесь».",
    "I am fine — «У мене все добре»; I am here — «Я тут».",
    "«У меня всё хорошо» соответствует fine; услышанная фраза заканчивается here и сообщает место.",
    "«У мене все добре» відповідає fine; почута фраза закінчується here й повідомляє місце.",
  ),
});

function wrongFields({ responseId, feedbackByLocale, errorType }) {
  const authored = diagnosticById[responseId];
  if (!authored) throw new Error(`s01_diagnostic_missing:${responseId}`);
  return { errorType, whyWrongHereByLocale: feedbackByLocale, ...authored };
}

function correctTextFor(atomic, interactionId) {
  return atomic.answers.find((answer) => answer.interactionId === interactionId)?.correctText ?? "";
}

function responseAnalysis(textByLocale, meaningByLocale, explanationByLocale, sourceRefs) {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = textByLocale[locale];
    const usesEnglish = /^[A-Za-z]/u.test(text);
    return [locale, usesEnglish
      ? (text.includes(" ") || /[.!?]/u.test(text) ? phraseAnalysis(text) : wordAnalysis(text))
      : localizedAnalysis(
        text,
        locale,
        meaningByLocale,
        explanationByLocale,
        (token) => claimSpecificLocalizedRefs(text, token),
      )];
  }));
}

const sidecar = readJson(SIDECAR);
const atomic = readJson(ATOMIC);
const ruIntro = introOptions("ru");
const ukIntro = introOptions("uk");
sidecar.introResponses = ruIntro.map((option, index) => {
  const uk = ukIntro[index];
  const textByLocale = { ru: option.text, uk: uk.text };
  const feedbackByLocale = { ru: option.feedback, uk: uk.feedback };
  const entry = {
    responseId: option.responseId,
    correct: option.correct,
    textByLocale,
    analysisByLocale: responseAnalysis(textByLocale, phraseMeaning[option.text], explanationFor(option.text), S01_SOURCE_REFS),
  };
  const errorType = option.text === "I am." ? "meaning_incomplete" : "grammar_form";
  return option.correct ? entry : { ...entry, ...wrongFields({ responseId: option.responseId, feedbackByLocale, errorType }) };
});

for (const interaction of atomic.interactionsByLocale.ru) {
  const localized = Object.fromEntries(LOCALES.map((locale) => [locale,
    atomic.interactionsByLocale[locale].find((entry) => entry.interactionId === interaction.interactionId),
  ]));
  const payload = interaction.modePayload;
  const existing = sidecar.interactions[interaction.interactionId] ?? { family: interaction.family };
  existing.family = interaction.family;
  if (["listen_choose", "context_gap_grammar"].includes(interaction.family)) {
    delete existing.completionFeedbackByLocale;
    delete existing.phrase;
    delete existing.pairs;
    const rowsByLocale = Object.fromEntries(LOCALES.map((locale) => [locale,
      localized[locale].modePayload.localizedMeaningChoices ?? localized[locale].modePayload.gapOptions,
    ]));
    const feedbackById = new Map((payload.choiceFeedback ?? []).map((row) => [row.responseId, row]));
    existing.responses = rowsByLocale.ru.map((row, index) => {
      const correct = feedbackById.get(row.responseId)?.correct ?? rowsByLocale.ru.length === 1;
      const textByLocale = Object.fromEntries(LOCALES.map((locale) => [locale, rowsByLocale[locale][index].text ?? rowsByLocale[locale][index].targetText]));
      const feedbackByLocale = feedbackById.get(row.responseId)?.feedbackByLocale ?? Object.fromEntries(LOCALES.map((locale) => [locale, rowsByLocale[locale][index].meaningByLocale?.[locale] ?? ""]));
      const meaningByLocale = Object.fromEntries(LOCALES.map((locale) => [locale, rowsByLocale[locale][index].meaningByLocale?.[locale] ?? textByLocale[locale]]));
      const entry = {
        responseId: row.responseId,
        correct,
        textByLocale,
        analysisByLocale: responseAnalysis(textByLocale, meaningByLocale, feedbackByLocale, S01_SOURCE_REFS),
      };
      return correct ? entry : { ...entry, ...wrongFields({ responseId: row.responseId, feedbackByLocale, errorType: "wrong_lexeme" }) };
    });
  }
  if (["phrase_builder", "listen_build_dictation"].includes(interaction.family)) {
    delete existing.pairs;
    const target = interaction.family === "phrase_builder" ? payload.targetPhrase : payload.hiddenTargetPhrase;
    existing.completionFeedbackByLocale = completionByPhrase[target];
    existing.phrase = phraseAnalysis(target);
    const distractorsByLocale = Object.fromEntries(LOCALES.map((locale) => [locale, localized[locale].modePayload.authoredDistractorTokens]));
    existing.responses = payload.slotFeedback.map((feedback, index) => {
      const textByLocale = Object.fromEntries(LOCALES.map((locale) => [locale, distractorsByLocale[locale][index]]));
      return {
        responseId: feedback.responseId,
        correct: false,
        textByLocale,
        analysisByLocale: responseAnalysis(textByLocale, lexical[textByLocale.ru].meaning, feedback.feedbackByLocale, S01_SOURCE_REFS),
        ...wrongFields({ responseId: feedback.responseId, feedbackByLocale: feedback.feedbackByLocale, errorType: "distractor_token" }),
      };
    });
  }
  if (interaction.family === "scripted_repeat_compare") existing.phrase = phraseAnalysis(payload.targetPhrase);
  if (interaction.family === "speed_match") {
    existing.pairs = existing.pairs.map((pair) => ({
      ...pair,
      analysisV1: (() => {
        const phrase = pair.target.includes(" ") ? phraseAnalysis(pair.target) : wordAnalysis(pair.target);
        const sourceRefs = sourceRefsForAnalysis(phrase);
        const frameRef = evidenceRef("be-i-am-ru-uk");
        return {
          ...pair.analysisV1,
          sourceRefs: interaction.interactionId.endsWith(":i08")
            ? [...new Set([frameRef, ...sourceRefs])]
            : sourceRefs,
          phrase,
        };
      })(),
    }));
  }
  sidecar.interactions[interaction.interactionId] = existing;
}

for (const locale of LOCALES) {
  const file = path.join(SESSION, `final.${locale}.md`);
  sidecar.sourceBindings[locale] = {
    path: `final.${locale}.md`,
    sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  };
}

await writeMockupFile(SIDECAR, `${JSON.stringify(sidecar, null, 2)}\n`);
console.log(JSON.stringify({ sidecar: path.relative(ROOT, SIDECAR), introResponses: sidecar.introResponses.length, interactions: Object.keys(sidecar.interactions).length }));
