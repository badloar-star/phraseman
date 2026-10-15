import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const apply = process.argv.includes("--apply");
const root = path.resolve(import.meta.dirname, "..");
const candidate = path.join(root, "mockup", "staging-s01");
const courseSessionId = "en:lesson-01:session-01";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const textByLocale = (ru, uk) => ({ ru, uk });

function phraseExplanation(target) {
  const word = target.replace(/^I am\s+/u, "").replace(/\.$/u, "");
  const meanings = {
    here: textByLocale("Я здесь.", "Я тут."),
    ready: textByLocale("Я готов / готова.", "Я готовий / готова."),
    fine: textByLocale("У меня всё хорошо.", "У мене все добре."),
    happy: textByLocale("Я рад / рада.", "Я радий / рада."),
  };
  const wordMeanings = {
    here: textByLocale("здесь", "тут"), ready: textByLocale("готов / готова", "готовий / готова"),
    fine: textByLocale("всё хорошо", "усе добре"), happy: textByLocale("рад / рада", "радий / рада"),
  };
  return {
    completionFeedbackByLocale: textByLocale(`Верно: ${target} — «${meanings[word].ru.toLowerCase().replace(/\.$/u, "")}».`, `Правильно: ${target} — «${meanings[word].uk.toLowerCase().replace(/\.$/u, "")}».`),
    phrase: {
      text: target, meaningByLocale: meanings[word],
      explanationByLocale: textByLocale(`I называет говорящего, am обязательно после I, а ${word} сообщает нужный смысл.`, `I називає мовця, am обов'язкове після I, а ${word} повідомляє потрібний зміст.`),
      units: [
        { text: "I", partOfSpeechLabelByLocale: textByLocale("личное местоимение", "особовий займенник"), meaningByLocale: textByLocale("я", "я"), functionByLocale: textByLocale("Называет говорящего.", "Називає мовця.") },
        { text: "am", partOfSpeechLabelByLocale: textByLocale("глагол-связка", "дієслово-зв'язка"), meaningByLocale: textByLocale("форма be после I", "форма be після I"), functionByLocale: textByLocale("Связывает I с сообщением о себе.", "Пов'язує I з повідомленням про себе.") },
        { text: word, partOfSpeechLabelByLocale: textByLocale("прилагательное / наречие", "прикметник / прислівник"), meaningByLocale: wordMeanings[word], functionByLocale: textByLocale("Уточняет, что вы сообщаете о себе.", "Уточнює, що ви повідомляєте про себе.") },
        { text: ".", partOfSpeechLabelByLocale: textByLocale("знак препинания", "розділовий знак"), meaningByLocale: textByLocale("конец утверждения", "кінець твердження"), functionByLocale: textByLocale("Завершает фразу.", "Завершує фразу.") },
      ],
    },
  };
}

function phraseBuilder(id, ordinal, prompt, target, distractors, feedback) {
  return {
    interactionId: `${courseSessionId}:${id}`,
    ordinal,
    purpose: "retrieval_practice",
    family: "phrase_builder",
    inputMode: "ordered_tokens",
    prompt: prompt.ru,
    responseOptions: [], mediaIds: [], audioTargetIds: [], accessibilityLabel: prompt.ru,
    modePayload: {
      family: "phrase_builder", targetPhrase: target, localizedMeaning: prompt,
      orderedTokens: target.replace(".", "").split(" "), authoredDistractorTokens: distractors,
      explanationV1: phraseExplanation(target),
      slotFeedback: distractors.map((word, index) => ({
        responseId: `${courseSessionId}:${id}:tile:d${index + 1}`,
        correct: false, testedDimension: prompt.ru, feedbackByLocale: feedback[index],
      })),
    },
    scriptedAlternate: null,
  };
}

function applyLocale(learner, locale) {
  const localized = (ru, uk) => locale === "ru" ? ru : uk;
  const replace = (id, value) => {
    const index = learner.interactions.findIndex((item) => item.interactionId === `${courseSessionId}:${id}`);
    if (index < 0) throw new Error(`missing candidate interaction: ${locale}:${id}`);
    learner.interactions[index] = value;
  };

  replace("i10", phraseBuilder(
    "i10", 14,
    textByLocale(
      "Соберите фразу — коллега спросил, как у вас дела; ответьте, что всё хорошо",
      "Складіть фразу — колега запитав, як ваші справи; скажіть, що все добре",
    ),
    "I am fine.", ["ready", "here"], [
      textByLocale("`ready` — «готов / готова». О самочувствии говорят `I am fine`.", "`ready` — «готовий / готова». Про самопочуття кажуть `I am fine`."),
      textByLocale("`here` — «здесь». Вопрос не о месте, а о том, как вы: `I am fine`.", "`here` — «тут». Запитання не про місце, а про те, як ви: `I am fine`."),
    ],
  ));

  const i13Id = `${courseSessionId}:i13`;
  const i13Prompt = localized(
    "Послушайте фразу Миры у входа и выберите её смысл",
    "Послухайте фразу Міри біля входу та виберіть її зміст",
  );
  replace("i13", {
    interactionId: i13Id, ordinal: 17, purpose: "retrieval_practice", family: "listen_choose", inputMode: "single_choice",
    prompt: i13Prompt, accessibilityLabel: i13Prompt, mediaIds: [], audioTargetIds: [`${i13Id}:audio`], scriptedAlternate: null,
    responseOptions: [
      { responseId: `${i13Id}:r1`, text: localized("Я здесь.", "Я тут.") },
      { responseId: `${i13Id}:r2`, text: localized("Я готов / готова.", "Я готовий / готова.") },
      { responseId: `${i13Id}:r3`, text: localized("У меня всё хорошо.", "У мене все добре.") },
    ],
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: `${i13Id}:audio`, transcript: "I am here." }, slowReferenceAudio: null,
      targetPhrase: "I am here.", transcriptRevealPolicy: "after_first_attempt", isWordCard: false,
      localizedScene: textByLocale("Мира ждёт вас у входа; вы сообщаете, что уже здесь.", "Міра чекає на вас біля входу; ви повідомляєте, що вже тут."),
      choiceFeedback: [
        { responseId: `${i13Id}:r1`, correct: true, testedDimension: i13Prompt, feedbackByLocale: textByLocale("Верно: `I am here` означает «я здесь». Так вы отвечаете Мире у входа.", "Правильно: `I am here` означає «я тут». Так ви відповідаєте Мірі біля входу.") },
        { responseId: `${i13Id}:r2`, correct: false, testedDimension: i13Prompt, feedbackByLocale: textByLocale("`I am ready` — «я готов / готова». Здесь вы говорите не о готовности, а о месте.", "`I am ready` — «я готовий / готова». Тут ви кажете не про готовність, а про місце.") },
        { responseId: `${i13Id}:r3`, correct: false, testedDimension: i13Prompt, feedbackByLocale: textByLocale("`I am fine` — «у меня всё хорошо». Это ответ о самочувствии, не о месте.", "`I am fine` — «у мене все добре». Це відповідь про самопочуття, не про місце.") },
      ],
    },
  });

  const i17s01 = `${courseSessionId}:i17:s01`;
  const matchPrompt = localized("Соедините фразы с подходящими ситуациями", "З'єднайте фрази з відповідними ситуаціями");
  const pairs = [
    ["here", "I am here.", "Мира ждёт вас у входа.", "Міра чекає на вас біля входу."],
    ["ready", "I am ready.", "Встречу можно начинать.", "Зустріч можна починати."],
    ["fine", "I am fine.", "Коллега спрашивает, как у вас дела.", "Колега запитує, як ваші справи."],
    ["happy", "I am happy.", "Вас радует хорошая новость.", "Вас тішить добра новина."],
  ];
  replace("i17:s01", {
    interactionId: i17s01, ordinal: 21, purpose: "independent_check", family: "speed_match", inputMode: "pair_grid",
    prompt: matchPrompt, accessibilityLabel: matchPrompt, responseOptions: [], mediaIds: [], audioTargetIds: [], scriptedAlternate: null,
    modePayload: {
      family: "speed_match",
      pairGrid: pairs.map(([key, target, ru, uk], index) => ({
        pairId: `${i17s01}:p${index + 1}`, target, meaningByLocale: textByLocale(ru, uk),
        analysisV1: {
          lemma: target, partOfSpeechLabelByLocale: textByLocale("фраза", "фраза"),
          meaningByLocale: textByLocale(target === "I am here." ? "я здесь" : target === "I am ready." ? "я готов / готова" : target === "I am fine." ? "у меня всё хорошо" : "я рад / рада", target === "I am here." ? "я тут" : target === "I am ready." ? "я готовий / готова" : target === "I am fine." ? "у мене все добре" : "я радий / рада"),
          functionByLocale: textByLocale(`Подходит к ситуации: ${ru}`, `Підходить до ситуації: ${uk}`),
          matchExplanationByLocale: textByLocale(`Ситуация подсказывает фразу ${target}`, `Ситуація підказує фразу ${target}`),
        },
      })),
      leftColumn: pairs.map(([, target]) => target), rightColumn: pairs.map(([, , ru, uk]) => localized(ru, uk)), pairingKey: "pair_id",
      timerPolicy: { enabledByDefault: false, learnerCanDisable: true, pausesOnInterruption: true }, finishStats: ["accuracy"],
    },
  });

  const i17s02 = `${courseSessionId}:i17:s02`;
  const readyPrompt = localized("Скажите вслух — Антон начинает встречу; сообщите, что готовы", "Скажіть уголос — Антон починає зустріч; повідомте, що готові");
  replace("i17:s02", {
    interactionId: i17s02, ordinal: 22, purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare",
    prompt: readyPrompt, accessibilityLabel: readyPrompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${i17s02}:audio`], scriptedAlternate: null,
    modePayload: {
      family: "scripted_repeat_compare", targetPhrase: "I am ready.",
      referenceAudio: { audioTargetId: `${i17s02}:audio`, transcript: "I am ready." }, slowReferenceAudio: null,
      localizedMeaning: textByLocale("Я готов / готова.", "Я готовий / готова."),
      completionFeedbackByLocale: textByLocale("Верно: `I am ready` — «я готов / готова». Этой фразой вы отвечаете перед началом встречи.", "Правильно: `I am ready` — «я готовий / готова». Цією фразою ви відповідаєте перед початком зустрічі."),
      explanationV1: phraseExplanation("I am ready."),
      recordControlPolicy: "hold_press_release_with_accessible_toggle", modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"],
    },
  });

  const i17s03Prompt = localized("Послушайте и соберите — коллега спрашивает, как у вас дела", "Послухайте й складіть — колега запитує, як ваші справи");
  replace("i17:s03", {
    interactionId: `${courseSessionId}:i17:s03`, ordinal: 23, purpose: "independent_check", family: "listen_build_dictation", inputMode: "ordered_tokens",
    prompt: i17s03Prompt, accessibilityLabel: i17s03Prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${courseSessionId}:i17:s03:audio`], scriptedAlternate: null,
    modePayload: {
      family: "listen_build_dictation", hiddenTargetPhrase: "I am fine.", orderedTokens: ["I", "am", "fine"], authoredDistractorTokens: ["ready", "here"],
      referenceAudio: { audioTargetId: `${courseSessionId}:i17:s03:audio`, transcript: "I am fine." }, slowReferenceAudio: null,
      localizedMeaning: textByLocale("На вопрос о самочувствии: «У меня всё хорошо».", "На запитання про самопочуття: «У мене все добре»."),
      explanationV1: phraseExplanation("I am fine."),
      slotFeedback: [
        { responseId: `${courseSessionId}:i17:s03:tile:d1`, correct: false, testedDimension: i17s03Prompt, feedbackByLocale: textByLocale("`ready` — «готов / готова». Здесь нужен ответ о самочувствии: `I am fine`.", "`ready` — «готовий / готова». Тут потрібна відповідь про самопочуття: `I am fine`.") },
        { responseId: `${courseSessionId}:i17:s03:tile:d2`, correct: false, testedDimension: i17s03Prompt, feedbackByLocale: textByLocale("`here` — «здесь». Здесь спрашивают не о месте, а о том, как вы: `I am fine`.", "`here` — «тут». Тут питають не про місце, а про те, як ви: `I am fine`.") },
      ],
    },
  });

}

const ruPath = path.join(candidate, "release/en/l01/s01/learner.json");
const ukPath = path.join(candidate, "release/en/l01/s01/learner.uk.json");
const ru = readJson(ruPath);
const uk = readJson(ukPath);
applyLocale(ru, "ru");
applyLocale(uk, "uk");

const context = { window: {} };
vm.createContext(context);
const dataPath = path.join(candidate, "data.js");
vm.runInContext(fs.readFileSync(dataPath, "utf8"), context);
const record = context.window.__DATA__[0];
record.learner = ru;
record.learnerByLocale = { uk };
record.answers = record.answers.map((answer) => {
  if (answer.interactionId === `${courseSessionId}:i13`) return { interactionId: answer.interactionId, correctText: "I am here.", correctResponseId: `${courseSessionId}:i13:r1` };
  if (answer.interactionId === `${courseSessionId}:i17:s01`) return {
    interactionId: answer.interactionId,
    correctText: ["I am here.", "I am ready.", "I am fine.", "I am happy."].map((target, index) => `${courseSessionId}:i17:s01:p${index + 1}=${target}`).join("\n"),
    correctResponseId: null,
  };
  if (answer.interactionId === `${courseSessionId}:i17:s02`) return { interactionId: answer.interactionId, correctText: "I am ready.", correctResponseId: null };
  if (answer.interactionId === `${courseSessionId}:i17:s03`) return { interactionId: answer.interactionId, correctText: "I am fine.", correctResponseId: null };
  return answer;
});

const findings = JSON.stringify({});
const updatedData = `window.__DATA__ = ${JSON.stringify([record])};\n`;
const updateHtmlData = (file) => {
  const before = fs.readFileSync(file, "utf8");
  const next = before
    .replace(/(<script id="data" type="application\/json">)[\s\S]*?(<\/script>)/u, `$1${JSON.stringify([record])}$2`)
    .replace(/(<script id="source-quality-findings" type="application\/json">)[\s\S]*?(<\/script>)/u, `$1${findings}$2`);
  return next;
};

if (!apply) {
  console.log("[S01-CANDIDATE-REPETITION] dry run: add --apply to update only mockup/staging-s01");
  process.exit(0);
}

writeJson(ruPath, ru);
writeJson(ukPath, uk);
fs.writeFileSync(dataPath, updatedData);
for (const file of ["index.html", "external.html"]) fs.writeFileSync(path.join(candidate, file), updateHtmlData(path.join(candidate, file)));
console.log("[S01-CANDIDATE-REPETITION] applied six distinct S01 retrieval actions in isolated staging only");
