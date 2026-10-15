import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const apply = process.argv.includes("--apply");
const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "sessions", "en", "l01", "s01", "practice.atomic.json");
const explanationsPath = path.join(root, "sessions", "en", "l01", "s01", "practice.explanations.v1.json");
const courseSessionId = "en:lesson-01:session-01";
const local = (ru, uk) => ({ ru, uk });

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function sidecarPhraseEntry(id, target, meaning) {
  const word = target.replace(/^I am /u, "").replace(/\.$/u, "");
  const wordData = {
    here: { pos: "adverb", ru: "наречие", uk: "прислівник", meaningRu: "здесь", meaningUk: "тут", functionRu: "Сообщает, где находится говорящий.", functionUk: "Повідомляє, де перебуває мовець." },
    ready: { pos: "adjective", ru: "прилагательное", uk: "прикметник", meaningRu: "готов / готова", meaningUk: "готовий / готова", functionRu: "Сообщает о готовности говорящего начать.", functionUk: "Повідомляє про готовність мовця почати." },
    fine: { pos: "adjective", ru: "прилагательное", uk: "прикметник", meaningRu: "всё хорошо", meaningUk: "усе добре", functionRu: "Сообщает, что у говорящего всё хорошо.", functionUk: "Повідомляє, що в мовця все добре." },
    happy: { pos: "adjective", ru: "прилагательное", uk: "прикметник", meaningRu: "рад / рада", meaningUk: "радий / рада", functionRu: "Сообщает о радости говорящего.", functionUk: "Повідомляє про радість мовця." },
  }[word];
  const refs = [`final.ru.md#practice-${id.replace(/:/gu, "-")}`, `final.uk.md#practice-${id.replace(/:/gu, "-")}`];
  return {
    family: id === "i17:s03" ? "listen_build_dictation" : "phrase_builder",
    completionFeedbackByLocale: local(`Верно: ${target} — «${meaning.ru}».`, `Правильно: ${target} — «${meaning.uk}».`),
    phrase: {
      text: target, meaningByLocale: meaning,
      explanationByLocale: local(`I называет говорящего, am обязательно после I, а ${word} сообщает нужный смысл.`, `I називає мовця, am обов'язкове після I, а ${word} повідомляє потрібний зміст.`),
      units: [
        { text: "I", start: 0, end: 1, lemma: "I", partOfSpeech: "personal_pronoun", partOfSpeechLabelByLocale: local("личное местоимение", "особовий займенник"), meaningByLocale: local("я", "я"), functionByLocale: local("Называет говорящего и служит подлежащим.", "Називає мовця й слугує підметом."), sourceRefs: refs },
        { text: "am", start: 2, end: 4, lemma: "be", partOfSpeech: "linking_verb", partOfSpeechLabelByLocale: local("глагол-связка", "дієслово-зв'язка"), meaningByLocale: local("форма be после I", "форма be після I"), functionByLocale: local("Связывает I с сообщением о себе.", "Пов'язує I з повідомленням про себе."), sourceRefs: refs },
        { text: word, start: 5, end: 5 + word.length, lemma: word, partOfSpeech: wordData.pos, partOfSpeechLabelByLocale: local(wordData.ru, wordData.uk), meaningByLocale: local(wordData.meaningRu, wordData.meaningUk), functionByLocale: local(wordData.functionRu, wordData.functionUk), sourceRefs: refs },
        { text: ".", start: target.length - 1, end: target.length, lemma: ".", partOfSpeech: "punctuation", partOfSpeechLabelByLocale: local("знак препинания", "розділовий знак"), meaningByLocale: local("конец утверждения", "кінець твердження"), functionByLocale: local("Завершает утверждение.", "Завершує твердження."), sourceRefs: refs },
      ],
    },
  };
}

function speedEntry() {
  const rows = [
    ["p1", "I am here.", "Мира ждёт вас у входа.", "Міра чекає на вас біля входу."],
    ["p2", "I am ready.", "Встречу можно начинать.", "Зустріч можна починати."],
    ["p3", "I am fine.", "Коллега спрашивает, как у вас дела.", "Колега запитує, як ваші справи."],
    ["p4", "I am happy.", "Вас радует хорошая новость.", "Вас тішить добра новина."],
  ];
  return { family: "speed_match", pairs: rows.map(([suffix, target, ru, uk]) => ({
    pairId: `${courseSessionId}:i17:s01:${suffix}`, target,
    analysisV1: { lemma: target, partOfSpeech: "sentence", partOfSpeechLabelByLocale: local("фраза", "фраза"), meaningByLocale: local(ru, uk), functionByLocale: local(`Подходит к ситуации: ${ru}`, `Підходить до ситуації: ${uk}`), matchExplanationByLocale: local(`Ситуация подсказывает фразу ${target}`, `Ситуація підказує фразу ${target}`), sourceRefs: ["final.ru.md#practice-i17-s01", "final.uk.md#practice-i17-s01"] },
  })) };
}

function explanation(target) {
  const word = target.replace(/^I am /u, "").replace(/\.$/u, "");
  const meaning = {
    here: local("Я здесь.", "Я тут."), ready: local("Я готов / готова.", "Я готовий / готова."),
    fine: local("У меня всё хорошо.", "У мене все добре."), happy: local("Я рад / рада.", "Я радий / рада."),
  }[word];
  return {
    phrase: {
      text: target, meaningByLocale: meaning,
      explanationByLocale: local(`I называет говорящего, am обязательно после I, а ${word} сообщает нужный смысл.`, `I називає мовця, am обов'язкове після I, а ${word} повідомляє потрібний зміст.`),
      units: [
        { text: "I", partOfSpeechLabelByLocale: local("личное местоимение", "особовий займенник"), meaningByLocale: local("я", "я"), functionByLocale: local("Называет говорящего.", "Називає мовця.") },
        { text: "am", partOfSpeechLabelByLocale: local("глагол-связка", "дієслово-зв'язка"), meaningByLocale: local("форма be после I", "форма be після I"), functionByLocale: local("Связывает I с сообщением о себе.", "Пов'язує I з повідомленням про себе.") },
        { text: word, partOfSpeechLabelByLocale: local("прилагательное / наречие", "прикметник / прислівник"), meaningByLocale: local(word === "fine" ? "всё хорошо" : word === "ready" ? "готов / готова" : word === "here" ? "здесь" : "рад / рада", word === "fine" ? "усе добре" : word === "ready" ? "готовий / готова" : word === "here" ? "тут" : "радий / рада"), functionByLocale: local("Уточняет, что вы сообщаете о себе.", "Уточнює, що ви повідомляєте про себе.") },
        { text: ".", partOfSpeechLabelByLocale: local("знак препинания", "розділовий знак"), meaningByLocale: local("конец утверждения", "кінець твердження"), functionByLocale: local("Завершает фразу.", "Завершує фразу.") },
      ],
    },
  };
}

function replace(interactions, id, next) {
  const index = interactions.findIndex((item) => item.interactionId === `${courseSessionId}:${id}`);
  if (index < 0) throw new Error(`missing source interaction ${id}`);
  next.ordinal = interactions[index].ordinal;
  interactions[index] = next;
}

function feedback(prompt, locale, rows) {
  return rows.map(([responseId, correct, ru, uk]) => ({ responseId, correct, testedDimension: prompt[locale], feedbackByLocale: local(ru, uk) }));
}

function repairLocale(interactions, locale) {
  const text = (ru, uk) => locale === "ru" ? ru : uk;
  const i10Prompt = local("Соберите фразу — коллега спросил, как у вас дела; ответьте, что всё хорошо", "Складіть фразу — колега запитав, як ваші справи; скажіть, що все добре");
  replace(interactions, "i10", {
    interactionId: `${courseSessionId}:i10`, purpose: "guided_practice", family: "phrase_builder", inputMode: "ordered_tokens", prompt: text(i10Prompt.ru, i10Prompt.uk), accessibilityLabel: text(i10Prompt.ru, i10Prompt.uk), responseOptions: [], mediaIds: [], audioTargetIds: [], scriptedAlternate: null,
    modePayload: { family: "phrase_builder", targetPhrase: "I am fine.", localizedMeaning: i10Prompt, orderedTokens: ["I", "am", "fine"], authoredDistractorTokens: ["ready", "here"], explanationV1: explanation("I am fine."), slotFeedback: feedback(i10Prompt, locale, [
      [`${courseSessionId}:i10:tile:d1`, false, "`ready` — «готов / готова». О самочувствии говорят `I am fine`.", "`ready` — «готовий / готова». Про самопочуття кажуть `I am fine`."],
      [`${courseSessionId}:i10:tile:d2`, false, "`here` — «здесь». Вопрос не о месте, а о том, как вы: `I am fine`.", "`here` — «тут». Запитання не про місце, а про те, як ви: `I am fine`."],
    ]) },
  });

  const i13Prompt = local("Послушайте реплику у входа и выберите её смысл", "Послухайте репліку біля входу та виберіть її зміст");
  const i13 = `${courseSessionId}:i13`;
  replace(interactions, "i13", {
    interactionId: i13, purpose: "retrieval_practice", family: "listen_choose", inputMode: "single_choice", prompt: text(i13Prompt.ru, i13Prompt.uk), accessibilityLabel: text(i13Prompt.ru, i13Prompt.uk), mediaIds: [], audioTargetIds: [`${i13}:audio`], scriptedAlternate: null,
    responseOptions: [["r1", "Я здесь.", "Я тут."], ["r2", "Я готов / готова.", "Я готовий / готова."], ["r3", "У меня всё хорошо.", "У мене все добре."]].map(([suffix, ru, uk]) => ({ responseId: `${i13}:${suffix}`, text: text(ru, uk) })),
    modePayload: { family: "listen_choose", referenceAudio: { audioTargetId: `${i13}:audio`, transcript: "I am here." }, slowReferenceAudio: null, transcriptRevealPolicy: "after_first_attempt", isWordCard: false, localizedScene: local("Мира ждёт вас у входа; вы сообщаете, что уже здесь.", "Міра чекає на вас біля входу; ви повідомляєте, що вже тут."), localizedMeaningChoices: [["r1", "Я здесь.", "Я тут."], ["r2", "Я готов / готова.", "Я готовий / готова."], ["r3", "У меня всё хорошо.", "У мене все добре."]].map(([suffix, ru, uk]) => ({ responseId: `${i13}:${suffix}`, targetText: text(ru, uk), meaningByLocale: null })), choiceFeedback: feedback(i13Prompt, locale, [
      [`${i13}:r1`, true, "Верно: `I am here` означает «я здесь». Так вы отвечаете Мире у входа.", "Правильно: `I am here` означає «я тут». Так ви відповідаєте Мірі біля входу."],
      [`${i13}:r2`, false, "`I am ready` — «я готов / готова». Здесь вы говорите не о готовности, а о месте.", "`I am ready` — «я готовий / готова». Тут ви кажете не про готовність, а про місце."],
      [`${i13}:r3`, false, "`I am fine` — «у меня всё хорошо». Это ответ о самочувствии, не о месте.", "`I am fine` — «у мене все добре». Це відповідь про самопочуття, не про місце."],
    ]) },
  });

  const i17s01 = `${courseSessionId}:i17:s01`;
  const matchPrompt = local("Соедините фразы с подходящими ситуациями", "З'єднайте фрази з відповідними ситуаціями");
  const pairs = [["I am here.", "Мира ждёт вас у входа.", "Міра чекає на вас біля входу."], ["I am ready.", "Встречу можно начинать.", "Зустріч можна починати."], ["I am fine.", "Коллега спрашивает, как у вас дела.", "Колега запитує, як ваші справи."], ["I am happy.", "Вас радует хорошая новость.", "Вас тішить добра новина."]];
  replace(interactions, "i17:s01", {
    interactionId: i17s01, purpose: "independent_check", family: "speed_match", inputMode: "pair_grid", prompt: text(matchPrompt.ru, matchPrompt.uk), accessibilityLabel: text(matchPrompt.ru, matchPrompt.uk), responseOptions: [], mediaIds: [], audioTargetIds: [], scriptedAlternate: null,
    modePayload: { family: "speed_match", pairGrid: pairs.map(([target, ru, uk], index) => ({ pairId: `${i17s01}:p${index + 1}`, target, meaningByLocale: local(ru, uk) })), leftColumn: pairs.map(([target]) => target), rightColumn: pairs.map(([, ru, uk]) => text(ru, uk)), pairingKey: "pair_id", timerPolicy: { enabledByDefault: false, learnerCanDisable: true, pausesOnInterruption: true }, finishStats: ["accuracy"] },
  });

  const i17s02 = `${courseSessionId}:i17:s02`;
  const readyPrompt = local("Скажите вслух — Антон начинает встречу; сообщите, что готовы", "Скажіть уголос — Антон починає зустріч; повідомте, що готові");
  replace(interactions, "i17:s02", {
    interactionId: i17s02, purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare", prompt: text(readyPrompt.ru, readyPrompt.uk), accessibilityLabel: text(readyPrompt.ru, readyPrompt.uk), responseOptions: [], mediaIds: [], audioTargetIds: [`${i17s02}:audio`], scriptedAlternate: null,
    modePayload: { family: "scripted_repeat_compare", targetPhrase: "I am ready.", referenceAudio: { audioTargetId: `${i17s02}:audio`, transcript: "I am ready." }, slowReferenceAudio: null, explanationV1: explanation("I am ready."), recordControlPolicy: "hold_press_release_with_accessible_toggle", modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture", honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"] },
  });

  const i17s03 = `${courseSessionId}:i17:s03`;
  const finePrompt = local("Послушайте и соберите — коллега спрашивает, как у вас дела", "Послухайте й складіть — колега запитує, як ваші справи");
  replace(interactions, "i17:s03", {
    interactionId: i17s03, purpose: "independent_check", family: "listen_build_dictation", inputMode: "ordered_tokens", prompt: text(finePrompt.ru, finePrompt.uk), accessibilityLabel: text(finePrompt.ru, finePrompt.uk), responseOptions: [], mediaIds: [], audioTargetIds: [`${i17s03}:audio`], scriptedAlternate: null,
    modePayload: { family: "listen_build_dictation", hiddenTargetPhrase: "I am fine.", orderedTokens: ["I", "am", "fine"], authoredDistractorTokens: ["ready", "here"], referenceAudio: { audioTargetId: `${i17s03}:audio`, transcript: "I am fine." }, slowReferenceAudio: null, localizedMeaning: local("На вопрос о самочувствии: «У меня всё хорошо».", "На запитання про самопочуття: «У мене все добре" + ".»"), explanationV1: explanation("I am fine."), slotFeedback: feedback(finePrompt, locale, [
      [`${i17s03}:tile:d1`, false, "`ready` — «готов / готова». Здесь нужен ответ о самочувствии: `I am fine`.", "`ready` — «готовий / готова». Тут потрібна відповідь про самопочуття: `I am fine`."],
      [`${i17s03}:tile:d2`, false, "`here` — «здесь». Здесь спрашивают не о месте, а о том, как вы: `I am fine`.", "`here` — «тут». Тут питають не про місце, а про те, як ви: `I am fine`."],
    ]) },
  });
}

if (!apply) {
  console.log("[S01-SOURCE-REPETITION] dry run; pass --apply to update only S01 practice.atomic.json");
  process.exit(0);
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
for (const locale of ["ru", "uk"]) repairLocale(source.interactionsByLocale[locale], locale);
for (const answer of source.answers) {
  if (answer.interactionId.endsWith(":i10")) { answer.correctText = "I am fine."; answer.correctResponseId = null; }
  if (answer.interactionId.endsWith(":i13")) { answer.correctText = "Я здесь."; answer.correctResponseId = `${courseSessionId}:i13:r1`; }
  if (answer.interactionId.endsWith(":i17:s01")) { answer.correctText = ["I am here.", "I am ready.", "I am fine.", "I am happy."].map((target, index) => `${courseSessionId}:i17:s01:p${index + 1}=${target}`).join("\n"); answer.correctResponseId = null; }
  if (answer.interactionId.endsWith(":i17:s02")) { answer.correctText = "I am ready."; answer.correctResponseId = null; }
  if (answer.interactionId.endsWith(":i17:s03")) { answer.correctText = "I am fine."; answer.correctResponseId = null; }
}
fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);
const sidecar = JSON.parse(fs.readFileSync(explanationsPath, "utf8"));
sidecar.sourceBindings = {
  ru: { path: "final.ru.md", sha256: sha256(path.join(root, "sessions", "en", "l01", "s01", "final.ru.md")) },
  uk: { path: "final.uk.md", sha256: sha256(path.join(root, "sessions", "en", "l01", "s01", "final.uk.md")) },
};
sidecar.interactions[`${courseSessionId}:i10`] = sidecarPhraseEntry("i10", "I am fine.", local("У меня всё хорошо.", "У мене все добре."));
sidecar.interactions[`${courseSessionId}:i17:s01`] = speedEntry();
sidecar.interactions[`${courseSessionId}:i17:s03`] = sidecarPhraseEntry("i17:s03", "I am fine.", local("У меня всё хорошо.", "У мене все добре."));
fs.writeFileSync(explanationsPath, `${JSON.stringify(sidecar, null, 2)}\n`);
console.log("[S01-SOURCE-REPETITION] applied six repairs to S01 source only");
