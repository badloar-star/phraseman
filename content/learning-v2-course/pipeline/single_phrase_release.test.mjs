import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  KNOWN_INTERACTION_TOP_LEVEL_FIELDS,
  answerContractIssues,
  assertSinglePhraseIntro,
  assertSinglePhraseSource,
  buildPreservationLedger,
  compositeGapReleaseIssues,
  dictationAudioTargetIssues,
  feedbackLocaleParityIssues,
  familyChoreographyIssues,
  scopedFamilyChoreographyIssues,
  introPracticeTargetRepeatIssues,
  practiceTargetRepeatIssues,
  preservationLedgerIssues,
  preJudgeChoreographyIssues,
  projectSinglePhraseRelease,
  singlePhraseReleaseIssues,
  wordCardDefinitionIssues,
} from "./single_phrase_release.mjs";

test("builder and dictation feedback is bound to each physical distractor tile, not a choice ID", () => {
  const interaction = (feedback, family = "phrase_builder") => ({
    interactionId: "en:lesson-01:session-01:i09",
    family,
    inputMode: "ordered_tokens",
    responseOptions: [],
    modePayload: {
      orderedTokens: ["I", "am", "here"],
      authoredDistractorTokens: ["ready", "ready"],
      slotFeedback: feedback,
    },
  });
  const feedback = [
    { responseId: "en:lesson-01:session-01:i09:tile:d1", correct: false, feedbackByLocale: { ru: "Первый ready лишний.", uk: "Перший ready зайвий." } },
    { responseId: "en:lesson-01:session-01:i09:tile:d2", correct: false, feedbackByLocale: { ru: "Второй ready лишний.", uk: "Другий ready зайвий." } },
  ];
  assert.deepEqual(feedbackLocaleParityIssues({ ru: [interaction(feedback)], uk: [interaction(feedback)] }), []);
  assert.deepEqual(feedbackLocaleParityIssues({
    ru: [interaction(feedback, "listen_build_dictation")],
    uk: [interaction(feedback, "listen_build_dictation")],
  }), []);
  assert.ok(feedbackLocaleParityIssues({ ru: [interaction(feedback.slice(0, 1))], uk: [interaction(feedback.slice(0, 1))] })
    .some((issue) => issue.reason === "slot_feedback_missing" && issue.responseId.endsWith(":tile:d2")));
  assert.ok(feedbackLocaleParityIssues({ ru: [interaction([{ ...feedback[0], responseId: "en:lesson-01:session-01:i09:r1" }, feedback[1]])], uk: [interaction(feedback)] })
    .some((issue) => issue.reason === "slot_feedback_unknown_tile"));
  assert.ok(feedbackLocaleParityIssues({ ru: [interaction([feedback[0], feedback[0], feedback[1]])], uk: [interaction(feedback)] })
    .some((issue) => issue.reason === "slot_feedback_duplicate"));
  assert.ok(feedbackLocaleParityIssues({ ru: [interaction([{ ...feedback[0], correct: true }, feedback[1]])], uk: [interaction(feedback)] })
    .some((issue) => issue.reason === "slot_feedback_wrong_contract"));
  assert.ok(feedbackLocaleParityIssues({ ru: [interaction([{ ...feedback[0], feedbackByLocale: { ru: "Первый ready лишний.", uk: "" } }, feedback[1]])], uk: [interaction(feedback)] })
    .some((issue) => issue.reason === "slot_feedback_locale_value_missing" && issue.locale === "uk"));
  assert.ok(feedbackLocaleParityIssues({ ru: [interaction(feedback)], uk: [interaction([{ ...feedback[0], feedbackByLocale: { ru: "Иное.", uk: "Інше." } }, feedback[1]])] })
    .some((issue) => issue.reason === "slot_feedback_locale_map_mismatch"));
});

test("a word card derives its answer from the reviewed word card payload when legacy correctText is empty", () => {
  const interaction = {
    interactionId: "en:lesson-01:session-52:i01",
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [],
    modePayload: {
      isWordCard: true,
      referenceAudio: { transcript: "week" },
      wordCard: { word: "week" },
    },
  };
  assert.deepEqual(answerContractIssues([interaction], [{ interactionId: interaction.interactionId, correctText: "" }]), []);
});

test("an intro assessed target cannot repeat in practice under a different family", () => {
  const intro = {
    pages: [{
      pageId: "en:lesson-04:session-01:intro1",
      question: {
        choicesByLocale: {
          ru: [{ responseId: "r1", text: "There is a pharmacy." }],
          uk: [{ responseId: "r1", text: "There is a pharmacy." }],
        },
      },
    }],
  };
  const practice = [{
    interactionId: "en:lesson-04:session-01:i04",
    family: "phrase_builder",
    modePayload: { targetPhrase: "There is a pharmacy." },
  }];
  assert.deepEqual(introPracticeTargetRepeatIssues(intro, practice), [{
    introPageId: "en:lesson-04:session-01:intro1",
    practiceInteractionId: "en:lesson-04:session-01:i04",
    practiceFamily: "phrase_builder",
    target: "there is a pharmacy",
    reason: "intro_practice_exact_primary_target_repeat",
  }]);
});

test("a contextual retrieval task may reuse an introduced phrase without exposing that phrase", () => {
  const intro = {
    pages: [{
      pageId: "en:lesson-04:session-01:intro1",
      question: { choicesByLocale: { ru: [{ responseId: "r1", text: "There is a pharmacy." }] } },
    }],
  };
  const practice = [{
    interactionId: "en:lesson-04:session-01:i04",
    purpose: "retrieval_practice",
    family: "phrase_builder",
    prompt: "Соберите фразу: в здании есть место, где выдают лекарства.",
    modePayload: { targetPhrase: "There is a pharmacy." },
  }];
  assert.deepEqual(introPracticeTargetRepeatIssues(intro, practice), []);
});

test("a dictation may retrieve an introduced phrase from its declared audio", () => {
  const intro = {
    pages: [{
      pageId: "en:lesson-04:session-01:intro1",
      question: { choicesByLocale: { ru: [{ responseId: "r1", text: "There is a pharmacy." }] } },
    }],
  };
  const practice = [{
    interactionId: "en:lesson-04:session-01:i04",
    purpose: "guided_practice",
    family: "listen_build_dictation",
    modePayload: {
      hiddenTargetPhrase: "There is a pharmacy.",
      referenceAudio: { transcript: "There is a pharmacy." },
    },
  }];
  assert.deepEqual(introPracticeTargetRepeatIssues(intro, practice), []);
});

test("a listening choice may revisit a phrase only with a new visible situation", () => {
  const intro = { pages: [{ pageId: "intro1", question: { choicesByLocale: { ru: [{ text: "It is hot." }] } } }] };
  const generic = [{ interactionId: "i1", purpose: "supported_practice", family: "listen_choose", prompt: "Послушайте и выберите", modePayload: { referenceAudio: { transcript: "It is hot." } } }];
  const contextual = [{ ...generic[0], prompt: "Послушайте: в комнате душно. Какое сообщение вы услышали?" }];
  assert.equal(introPracticeTargetRepeatIssues(intro, generic)[0]?.reason, "intro_practice_exact_primary_target_repeat");
  assert.deepEqual(introPracticeTargetRepeatIssues(intro, contextual), []);
});

test("a sound contrast may revisit a word only when its visible situation is new", () => {
  const intro = { pages: [{ pageId: "intro1", question: { choicesByLocale: { ru: [{ text: "hot" }] } } }] };
  const generic = [{ interactionId: "i1", purpose: "retrieval_practice", family: "sound_contrast", prompt: "Различите звуки — hot / hat", modePayload: { contrastA: "hot", contrastB: "hat" } }];
  const contextual = [{ ...generic[0], prompt: "Суп только что подали. Какое слово вы слышите?" }];
  assert.equal(introPracticeTargetRepeatIssues(intro, generic)[0]?.reason, "intro_practice_exact_primary_target_repeat");
  assert.deepEqual(introPracticeTargetRepeatIssues(intro, contextual), []);
});

test("a spoken repeat needs a situation instead of a numbered generic prompt", () => {
  const intro = {
    pages: [{
      pageId: "en:lesson-04:session-01:intro1",
      question: { choicesByLocale: { ru: [{ responseId: "r1", text: "There is a pharmacy." }] } },
    }],
  };
  const generic = [{
    interactionId: "en:lesson-04:session-01:i04",
    purpose: "independent_check",
    family: "scripted_repeat_compare",
    prompt: "Произнесите одну фразу — шаг 1 из 3",
    modePayload: { targetPhrase: "There is a pharmacy.", referenceAudio: { transcript: "There is a pharmacy." } },
  }];
  const contextual = [{
    ...generic[0],
    prompt: "Скажите вслух: вы ищете лекарство и видите аптеку в этом здании.",
  }];
  assert.equal(introPracticeTargetRepeatIssues(intro, generic)[0]?.reason, "intro_practice_exact_primary_target_repeat");
  assert.deepEqual(introPracticeTargetRepeatIssues(intro, contextual), []);
});

test("an independent existential short reply may repeat an intro target when a new explicit question supplies the condition", () => {
  const intro = {
    pages: [{
      pageId: "en:lesson-04:session-16:intro3",
      question: { choicesByLocale: { ru: [{ responseId: "r1", text: "Yes, there is." }] } },
    }],
  };
  const finalId = "en:lesson-04:session-16:i12";
  const final = {
    interactionId: finalId,
    purpose: "independent_check",
    family: "phrase_builder",
    prompt: "Финал — после вопроса `Is there a swimming pool?` бассейн есть; дайте отдельный короткий ответ",
    modePayload: { targetPhrase: "Yes, there is.", orderedTokens: ["Yes,", "there", "is"] },
  };
  assert.deepEqual(introPracticeTargetRepeatIssues(intro, [final]), []);
});

test("an exact assessed practice target cannot repeat across different families", () => {
  const practice = [
    {
      interactionId: "en:lesson-04:session-01:i04",
      family: "phrase_builder",
      modePayload: { targetPhrase: "There is a pharmacy." },
    },
    {
      interactionId: "en:lesson-04:session-01:i05",
      family: "listen_choose",
      modePayload: { referenceAudio: { transcript: "  THERE IS A PHARMACY!  " } },
    },
  ];
  assert.deepEqual(practiceTargetRepeatIssues(practice), [{
    previousInteractionId: "en:lesson-04:session-01:i04",
    practiceInteractionId: "en:lesson-04:session-01:i05",
    previousFamily: "phrase_builder",
    practiceFamily: "listen_choose",
    target: "there is a pharmacy",
    reason: "practice_exact_primary_target_cross_family_repeat",
  }]);
});

test("a phrase may recur across different families only with two distinct contextual retrievals", () => {
  const target = "There is a pharmacy.";
  const practice = [
    {
      interactionId: "en:lesson-04:session-01:i04",
      purpose: "guided_practice",
      family: "scripted_repeat_compare",
      prompt: "Скажите вслух: вы ищете лекарство и видите аптеку в этом здании.",
      modePayload: { targetPhrase: target, referenceAudio: { transcript: target } },
    },
    {
      interactionId: "en:lesson-04:session-01:i05",
      purpose: "retrieval_practice",
      family: "phrase_builder",
      prompt: "Соберите фразу: у входа вам показывают, где купить лекарство.",
      modePayload: { targetPhrase: target },
    },
  ];
  assert.deepEqual(practiceTargetRepeatIssues(practice), []);
});

test("a reviewed word card may lead into one contextual sound contrast, but not a generic one", () => {
  const target = "safe";
  const card = {
    interactionId: "i1",
    family: "listen_choose",
    modePayload: { isWordCard: true, referenceAudio: { transcript: target } },
  };
  const genericContrast = {
    interactionId: "i2",
    purpose: "guided_practice",
    family: "sound_contrast",
    prompt: "Различите звуки — safe / save",
    modePayload: { contrastA: target, contrastB: "save" },
  };
  const contextualContrast = {
    ...genericContrast,
    prompt: "Вы дошли до дома без происшествий. Какое слово вы слышите?",
  };
  assert.equal(practiceTargetRepeatIssues([card, genericContrast])[0]?.reason, "practice_exact_primary_target_cross_family_repeat");
  assert.deepEqual(practiceTargetRepeatIssues([card, contextualContrast]), []);
});

test("an independent existential short reply may reassess the same form under a new explicit condition without a visible model", () => {
  const finalId = "en:lesson-04:session-12:i12";
  const options = [
    { responseId: `${finalId}:r1`, text: "Yes, there are." },
    { responseId: `${finalId}:r2`, text: "No, there aren't." },
    { responseId: `${finalId}:r3`, text: "Yes, there is." },
  ];
  const interactions = [
    {
      interactionId: "en:lesson-04:session-12:i06",
      purpose: "guided_practice",
      family: "phrase_builder",
      prompt: "Соберите короткий ответ: на табло две платформы",
      modePayload: {
        targetPhrase: "Yes, there are.",
        orderedTokens: ["Yes,", "there", "are"],
      },
    },
    {
      interactionId: "en:lesson-04:session-12:i11",
      purpose: "guided_practice",
      family: "scripted_repeat_compare",
      prompt: "Произнесите короткий отрицательный ответ после объявления",
      modePayload: { targetPhrase: "No, there aren't." },
    },
    {
      interactionId: finalId,
      purpose: "independent_check",
      family: "context_gap_grammar",
      prompt: "Финал — на новом табло две платформы. Пассажир спрашивает: `Are there two platforms?` Выберите короткий ответ.",
      responseOptions: options,
      audioTargetIds: [],
      modePayload: { gappedTargetPhrase: "___", gapOptions: options },
    },
  ];
  const issues = familyChoreographyIssues(interactions, {
    answers: [answer(finalId, `${finalId}:r1`, "Yes, there are.")],
  });
  assert.ok(!issues.some((issue) => issue.reason === "target_cross_family_repeat"));
});

test("an existential short-reply repeat still holds for the same operation or a visible answer model", () => {
  const finalId = "en:lesson-04:session-12:i12";
  const options = [
    { responseId: `${finalId}:r1`, text: "Yes, there are." },
    { responseId: `${finalId}:r2`, text: "No, there aren't." },
  ];
  const previous = {
    interactionId: "en:lesson-04:session-12:i06",
    purpose: "guided_practice",
    family: "phrase_builder",
    prompt: "На табло две платформы. Пассажир спрашивает: `Are there two platforms?` Выберите короткий ответ.",
    modePayload: { targetPhrase: "Yes, there are.", orderedTokens: ["Yes,", "there", "are"] },
  };
  const final = {
    interactionId: finalId,
    purpose: "independent_check",
    family: "context_gap_grammar",
    prompt: previous.prompt,
    responseOptions: options,
    audioTargetIds: [],
    modePayload: { gappedTargetPhrase: "___", gapOptions: options },
  };
  const answers = [answer(finalId, `${finalId}:r1`, "Yes, there are.")];
  const repeatIssues = (candidate) => familyChoreographyIssues([previous, candidate], { answers })
    .filter((issue) => issue.reason === "target_cross_family_repeat");

  assert.equal(repeatIssues(final).length, 1);
  assert.equal(repeatIssues({
    ...final,
    prompt: "Финал — на другом табло две платформы. Пассажир спрашивает: `Are there two platforms?` Образец: `Yes, there are.`",
  }).length, 1);
});

test("independent finite be replies require a new English question and new localized facts", () => {
  const target = "Yes, I am.";
  const previous = {
    interactionId: "en:lesson-02:session-03:i02",
    purpose: "guided_practice",
    family: "context_gap_grammar",
    prompt: "У двери спрашивают: `Are you hungry?` Вы голодны. Ответьте коротко.",
    responseOptions: [{ responseId: "en:lesson-02:session-03:i02:r1", text: target }],
    modePayload: { gappedTargetPhrase: "___", gapOptions: [{ responseId: "en:lesson-02:session-03:i02:r1", text: target }] },
  };
  const finalId = "en:lesson-02:session-03:i18";
  const candidate = {
    interactionId: finalId,
    purpose: "independent_check",
    family: "context_gap_grammar",
    prompt: "У стойки спрашивают: `Are you ready?` Вы готовы. Ответьте коротко.",
    responseOptions: [{ responseId: `${finalId}:r1`, text: target }],
    audioTargetIds: [],
    modePayload: { gappedTargetPhrase: "___", gapOptions: [{ responseId: `${finalId}:r1`, text: target }] },
  };
  const answers = [
    answer(previous.interactionId, `${previous.interactionId}:r1`, target),
    answer(finalId, `${finalId}:r1`, target),
  ];
  const repeatReasons = (current) => familyChoreographyIssues([previous, current], { answers })
    .filter((issue) => new Set(["target_family_repeat", "target_cross_family_repeat"]).has(issue.reason));

  assert.deepEqual(repeatReasons(candidate), []);
  assert.equal(repeatReasons({
    ...candidate,
    prompt: "У стойки спрашивают: `Are you hungry?` Вы уже поели. Ответьте коротко.",
  }).length, 1, "same English question with changed facts must HOLD");
  assert.equal(repeatReasons({
    ...candidate,
    prompt: "У двери спрашивают: `Are you ready?` Вы голодны. Ответьте коротко.",
  }).length, 1, "new English question with unchanged localized facts must HOLD");
  assert.equal(repeatReasons({
    ...candidate,
    prompt: "У стойки спрашивают: «Вы готовы?» Вы готовы. Ответьте коротко.",
  }).length, 1, "localized-only question must HOLD");

  const crossFamilyPrevious = {
    ...previous,
    family: "phrase_builder",
    modePayload: { targetPhrase: target, orderedTokens: ["Yes,", "I", "am"] },
  };
  assert.deepEqual(
    familyChoreographyIssues([crossFamilyPrevious, candidate], { answers })
      .filter((issue) => issue.reason === "target_cross_family_repeat"),
    [],
    "the same strict exception applies across families",
  );
});

test("contracted personal negative replies use the same finite reassessment exception", () => {
  const cases = [
    ["No, I'm not.", "Are you hungry?", "Are you ready?"],
    ["No, you're not.", "Am I late?", "Am I early?"],
    ["No, he's not.", "Is he hungry?", "Is he ready?"],
    ["No, she's not.", "Is she hungry?", "Is she ready?"],
    ["No, it's not.", "Is it cold?", "Is it ready?"],
    ["No, we're not.", "Are we late?", "Are we ready?"],
    ["No, they're not.", "Are they hungry?", "Are they ready?"],
  ];
  for (const [target, oldQuestion, newQuestion] of cases) {
    const previousId = `previous-${target}`;
    const finalId = `final-${target}`;
    const option = { responseId: `${finalId}:r1`, text: target };
    const previous = {
      interactionId: previousId,
      purpose: "guided_practice",
      family: "phrase_builder",
      prompt: `У двери спрашивают: \`${oldQuestion}\` Сегодня это правда. Ответьте коротко.`,
      modePayload: { targetPhrase: target, orderedTokens: target.split(" ") },
    };
    const current = {
      interactionId: finalId,
      purpose: "independent_check",
      family: "context_gap_grammar",
      prompt: `У стойки спрашивают: \`${newQuestion}\` Сейчас это неправда. Выберите короткий ответ.`,
      responseOptions: [option],
      audioTargetIds: [],
      modePayload: { gappedTargetPhrase: "___", gapOptions: [option] },
    };
    const issues = familyChoreographyIssues([previous, current], {
      answers: [answer(finalId, option.responseId, target)],
    }).filter((issue) => new Set(["target_family_repeat", "target_cross_family_repeat"]).has(issue.reason));
    assert.deepEqual(issues, [], target);
  }
});

test("short-reply factual context ignores RU and UK action boilerplate", () => {
  const target = "No, I'm not.";
  const finalId = "en:lesson-02:session-03:i18";
  const option = { responseId: `${finalId}:r1`, text: target };
  const previous = {
    interactionId: "en:lesson-02:session-03:i15",
    purpose: "guided_practice",
    family: "phrase_builder",
    prompt: "У двери спрашивают: `Are you hungry?` Вы голодны. Ответьте коротко.",
    modePayload: { targetPhrase: target, orderedTokens: ["No,", "I'm", "not"] },
  };
  const answers = [answer(finalId, option.responseId, target)];
  const repeats = (prompt) => familyChoreographyIssues([previous, {
    interactionId: finalId,
    purpose: "independent_check",
    family: "context_gap_grammar",
    prompt,
    responseOptions: [option],
    audioTargetIds: [],
    modePayload: { gappedTargetPhrase: "___", gapOptions: [option] },
  }], { answers }).filter((issue) => issue.reason === "target_cross_family_repeat");

  assert.equal(repeats("У двери спрашивают: `Are you ready?` Вы голодны. Выберите короткий ответ.").length, 1);
  assert.equal(repeats("Біля дверей питають: `Are you ready?` Ви голодні. Оберіть коротку відповідь.").length, 0,
    "different localized facts remain a valid reassessment");
  const ukPrevious = { ...previous, prompt: "Біля дверей питають: `Are you hungry?` Ви голодні. Дайте коротку відповідь." };
  const ukIssues = familyChoreographyIssues([ukPrevious, {
    interactionId: finalId,
    purpose: "independent_check",
    family: "context_gap_grammar",
    prompt: "Біля дверей питають: `Are you ready?` Ви голодні. Оберіть коротку відповідь.",
    responseOptions: [option],
    audioTargetIds: [],
    modePayload: { gappedTargetPhrase: "___", gapOptions: [option] },
  }], { answers }).filter((issue) => issue.reason === "target_cross_family_repeat");
  assert.equal(ukIssues.length, 1);
});

test("duplicate prompt and localized-scene facts do not count as new short-reply context", () => {
  const target = "No, I'm not.";
  const previousId = "en:lesson-02:session-03:i15";
  const finalId = "en:lesson-02:session-03:i18";
  const option = { responseId: `${finalId}:r1`, text: target };
  const previous = {
    interactionId: previousId,
    purpose: "guided_practice",
    family: "phrase_builder",
    prompt: "У двери спрашивают: `Are you hungry?` Вы голодны. Ответьте коротко.",
    modePayload: { targetPhrase: target, orderedTokens: ["No,", "I'm", "not"] },
  };
  const current = {
    interactionId: finalId,
    purpose: "independent_check",
    family: "context_gap_grammar",
    prompt: "У двери спрашивают: `Are you ready?` Вы голодны. Выберите короткий ответ.",
    accessibilityLabel: "Выберите короткий ответ для этой ситуации.",
    responseOptions: [option],
    audioTargetIds: [],
    modePayload: {
      gappedTargetPhrase: "___",
      localizedScene: { ru: "У двери вы голодны.", uk: "Біля дверей ви голодні." },
      gapOptions: [option],
    },
  };

  const repeatIssues = familyChoreographyIssues([previous, current], {
    answers: [answer(finalId, option.responseId, target)],
  }).filter((issue) => issue.reason === "target_cross_family_repeat");

  assert.equal(repeatIssues.length, 1);
});

test("localized short-reply facts override generic prompt wrappers", () => {
  const target = "No, I'm not.";
  const previousId = "en:lesson-02:session-03:i15";
  const finalId = "en:lesson-02:session-03:i18";
  const option = { responseId: `${finalId}:r1`, text: target };
  const repeatCount = ({ previousLabel, previousScene, currentLabel, currentScene }) => {
    const previous = {
      interactionId: previousId,
      purpose: "guided_practice",
      family: "phrase_builder",
      prompt: `${previousLabel}: \`Are you hungry?\``,
      modePayload: {
        targetPhrase: target,
        orderedTokens: ["No,", "I'm", "not"],
        localizedScene: previousScene,
      },
    };
    const current = {
      interactionId: finalId,
      purpose: "independent_check",
      family: "context_gap_grammar",
      prompt: `${currentLabel}: \`Are you ready?\``,
      responseOptions: [option],
      audioTargetIds: [],
      modePayload: { gappedTargetPhrase: "___", localizedScene: currentScene, gapOptions: [option] },
    };
    return familyChoreographyIssues([previous, current], {
      answers: [answer(finalId, option.responseId, target)],
    }).filter((issue) => issue.reason === "target_cross_family_repeat").length;
  };
  const hungryScene = { ru: "У двери вы голодны.", uk: "Біля дверей ви голодні." };
  const readyScene = { ru: "У стойки вы готовы.", uk: "Біля стійки ви готові." };

  assert.deepEqual([
    repeatCount({ previousLabel: "Тренировка", previousScene: hungryScene, currentLabel: "Финал", currentScene: hungryScene }),
    repeatCount({ previousLabel: "Финал", previousScene: hungryScene, currentLabel: "Финал", currentScene: readyScene }),
  ], [1, 0]);
});

test("independent short replies HOLD every visible or learner-heard answer leak", () => {
  const target = "No, there aren't.";
  const previous = {
    interactionId: "en:lesson-04:session-12:i06",
    purpose: "guided_practice",
    family: "phrase_builder",
    prompt: "На первом табло спрашивают: `Are there two platforms?` Платформ две.",
    modePayload: { targetPhrase: target, orderedTokens: ["No,", "there", "aren't"] },
  };
  const finalId = "en:lesson-04:session-12:i12";
  const base = {
    interactionId: finalId,
    purpose: "independent_check",
    family: "context_gap_grammar",
    prompt: "За зданием платформ нет. На вопрос `Are there platforms behind the building?` выберите короткий ответ.",
    accessibilityLabel: "Выберите короткий ответ для нового вопроса",
    responseOptions: [{ responseId: `${finalId}:r1`, text: target }],
    audioTargetIds: [],
    modePayload: {
      gappedTargetPhrase: "___",
      localizedScene: { ru: "За зданием платформ нет", uk: "За будівлею платформ немає" },
      gapOptions: [{ responseId: `${finalId}:r1`, text: target }],
    },
  };
  const answers = [answer(finalId, `${finalId}:r1`, target)];
  const repeats = (current) => familyChoreographyIssues([previous, current], { answers })
    .filter((issue) => issue.reason === "target_cross_family_repeat");

  assert.deepEqual(repeats(base), []);
  const leaked = [
    { ...base, prompt: `${base.prompt} Образец: \`${target}\`` },
    { ...base, prompt: `${base.prompt} Образец: \`No, there are not.\`` },
    { ...base, accessibilityLabel: `Правильный ответ: ${target}` },
    { ...base, modePayload: { ...base.modePayload, localizedScene: { ru: `Ответ ${target}` } } },
    { ...base, modePayload: { ...base.modePayload, referenceAudio: { transcript: target } } },
    { ...base, modePayload: { ...base.modePayload, slowReferenceAudio: { transcript: target } } },
    { ...base, modePayload: { ...base.modePayload, audioA: { transcript: target } } },
    { ...base, modePayload: { ...base.modePayload, audioB: { transcript: target } } },
    { ...base, audioTargetIds: [`${finalId}:audio`] },
  ];
  for (const current of leaked) assert.equal(repeats(current).length, 1, JSON.stringify(current));
});

test("word-card exemption covers only an exact atomic new-word contact", () => {
  const phraseLikeWordCard = [
    {
      interactionId: "en:lesson-04:session-01:i04",
      family: "phrase_builder",
      modePayload: { targetPhrase: "There is a pharmacy." },
    },
    {
      interactionId: "en:lesson-04:session-01:i05",
      family: "listen_choose",
      modePayload: {
        wordCard: { word: "pharmacy" },
        referenceAudio: { transcript: "There is a pharmacy." },
      },
    },
  ];
  assert.equal(
    practiceTargetRepeatIssues(phraseLikeWordCard, { newWords: ["pharmacy"] })[0]?.reason,
    "practice_exact_primary_target_cross_family_repeat",
  );

  const atomicWordContacts = [
    {
      interactionId: "en:lesson-04:session-01:i06",
      family: "listen_choose",
      modePayload: { wordCard: { word: "pharmacy" }, referenceAudio: { transcript: "pharmacy" } },
    },
    {
      interactionId: "en:lesson-04:session-01:i07",
      family: "phrase_builder",
      modePayload: { wordCard: { word: "pharmacy" }, targetPhrase: "pharmacy" },
    },
  ];
  assert.deepEqual(practiceTargetRepeatIssues(atomicWordContacts, { newWords: ["pharmacy"] }), []);
});

test("a planned multiword lexical surface keeps its three atomic word-first contacts", () => {
  const contacts = [
    {
      interactionId: "en:lesson-04:session-04:i04",
      family: "listen_choose",
      modePayload: { wordCard: { word: "post office" }, referenceAudio: { transcript: "post office" } },
    },
    {
      interactionId: "en:lesson-04:session-04:i05",
      family: "scripted_repeat_compare",
      modePayload: { targetPhrase: "post office" },
    },
    {
      interactionId: "en:lesson-04:session-04:i06",
      family: "phrase_builder",
      modePayload: { targetPhrase: "post office", orderedTokens: ["post", "office"] },
    },
    {
      interactionId: "en:lesson-04:session-04:i07",
      family: "listen_build_dictation",
      modePayload: { hiddenTargetPhrase: "There is a post office." },
    },
    {
      interactionId: "en:lesson-04:session-04:i08",
      family: "context_gap_grammar",
      modePayload: { gappedTargetPhrase: "There is a ___ nearby." },
    },
    {
      interactionId: "en:lesson-04:session-04:i09",
      family: "speed_match",
      modePayload: { pairGrid: [{ pairId: "p1", target: "nearby" }] },
    },
  ];
  assert.deepEqual(practiceTargetRepeatIssues(contacts, { newWords: ["post office"] }), []);
  assert.deepEqual(familyChoreographyIssues(contacts, { newWords: ["post office"] }), []);
});

test("Unicode terminal punctuation cannot hide an exact assessed target repeat", () => {
  const practice = [
    {
      interactionId: "en:lesson-04:session-01:i04",
      family: "phrase_builder",
      modePayload: { targetPhrase: "There is a pharmacy." },
    },
    {
      interactionId: "en:lesson-04:session-01:i05",
      family: "listen_choose",
      modePayload: { referenceAudio: { transcript: "There is a pharmacy…" } },
    },
  ];
  assert.equal(
    practiceTargetRepeatIssues(practice)[0]?.reason,
    "practice_exact_primary_target_cross_family_repeat",
  );
});

test("Unicode terminal punctuation cannot hide a non-adjacent same-family repeat", () => {
  const practice = [
    {
      interactionId: "en:lesson-04:session-01:i04",
      family: "phrase_builder",
      modePayload: { targetPhrase: "There is a pharmacy." },
    },
    {
      interactionId: "en:lesson-04:session-01:i05",
      family: "listen_choose",
      modePayload: { referenceAudio: { transcript: "There is a library." } },
    },
    {
      interactionId: "en:lesson-04:session-01:i06",
      family: "phrase_builder",
      modePayload: { targetPhrase: "There is a pharmacy…" },
    },
  ];
  assert.ok(familyChoreographyIssues(practice).some((issue) =>
    issue.reason === "target_family_repeat" &&
    issue.previousInteractionId === "en:lesson-04:session-01:i04" &&
    issue.interactionId === "en:lesson-04:session-01:i06"
  ));
});

test("a fourth exact planned multiword word-first contact is rejected", () => {
  const contacts = [
    {
      interactionId: "en:lesson-04:session-04:i04",
      family: "listen_choose",
      modePayload: { referenceAudio: { transcript: "post office" } },
    },
    {
      interactionId: "en:lesson-04:session-04:i05",
      family: "scripted_repeat_compare",
      modePayload: { targetPhrase: "post office" },
    },
    {
      interactionId: "en:lesson-04:session-04:i06",
      family: "phrase_builder",
      modePayload: { targetPhrase: "post office", orderedTokens: ["post", "office"] },
    },
    {
      interactionId: "en:lesson-04:session-04:i07",
      family: "listen_build_dictation",
      modePayload: { hiddenTargetPhrase: "post office", orderedTokens: ["post", "office"] },
    },
    {
      interactionId: "en:lesson-04:session-04:i08",
      family: "context_gap_grammar",
      modePayload: { gappedTargetPhrase: "There is a ___ nearby." },
    },
    {
      interactionId: "en:lesson-04:session-04:i09",
      family: "speed_match",
      modePayload: { pairGrid: [{ pairId: "p1", target: "nearby" }] },
    },
  ];
  assert.ok(familyChoreographyIssues(contacts, { newWords: ["post office"] }).some((issue) =>
    issue.reason === "word_first_contact_overflow" &&
    issue.word === "post office" &&
    issue.contacts === 4
  ));
});

test("a shared meaning grid may follow three distinct word-first contacts before the first phrase", () => {
  const word = "bank";
  const gapId = "i3";
  const options = [{ responseId: `${gapId}:r1`, text: word }, { responseId: `${gapId}:r2`, text: "bench" }];
  const contacts = [
    { interactionId: "i1", family: "listen_choose", modePayload: { referenceAudio: { transcript: word } } },
    { interactionId: "i2", family: "scripted_repeat_compare", modePayload: { targetPhrase: word } },
    { interactionId: gapId, family: "context_gap_grammar", responseOptions: options, modePayload: { gappedTargetPhrase: "___", gapOptions: options } },
    { interactionId: "i4", family: "speed_match", modePayload: { pairGrid: [{ pairId: "i4:p1", target: word }, { pairId: "i4:p2", target: "shop" }] } },
    { interactionId: "i5", family: "phrase_builder", modePayload: { targetPhrase: "This is a bank.", orderedTokens: ["This", "is", "a", "bank."] } },
  ];
  const issues = familyChoreographyIssues(contacts, { newWords: [word, "shop"], answers: [answer(gapId, `${gapId}:r1`, word)] });
  assert.ok(!issues.some((issue) => issue.word === word && issue.reason === "word_first_contact_overflow"));
});

test("release building and the all-source verifier enforce practice cross-family repeats", () => {
  const buildRelease = fs.readFileSync(new URL("./build_release.mjs", import.meta.url), "utf8");
  const verifyAll = fs.readFileSync(new URL("./verify_all_single_phrase_sources.mjs", import.meta.url), "utf8");
  assert.match(buildRelease, /practiceTargetRepeatIssues\(sourceInteractions,/u);
  assert.match(buildRelease, /practiceTargetRepeatIssues\(localeSourceInteractions,/u);
  assert.match(buildRelease, /practice_target_cross_family_repeat_hold/u);
  assert.match(verifyAll, /practiceTargetRepeatIssues\(items,/u);
  assert.match(verifyAll, /practice_target_cross_family_repeat/u);
});

test("release and verifier identities both block an incomplete L4 word-first cycle", () => {
  const item = (id, family, target) => ({
    interactionId: id,
    family,
    modePayload: family === "listen_choose" ? { referenceAudio: { transcript: target } }
      : family === "listen_build_dictation" ? { hiddenTargetPhrase: target }
      : family === "context_gap_grammar" ? { gappedTargetPhrase: target }
      : family === "speed_match" ? { pairGrid: [{ pairId: `${id}:p1`, target }] }
      : { targetPhrase: target },
  });
  const incomplete = [
    item("i1", "listen_choose", "pharmacy"),
    item("i2", "scripted_repeat_compare", "There is a pharmacy."),
    item("i3", "phrase_builder", "There is a library."),
    item("i4", "listen_build_dictation", "There is a bakery."),
    item("i5", "context_gap_grammar", "There is a ___."),
    item("i6", "speed_match", "bakery"),
  ];
  for (const identity of ["en/l04/s01", "en:lesson-04:session-01"]) {
    assert.ok(scopedFamilyChoreographyIssues(identity, incomplete, { newWords: ["pharmacy"] })
      .some((issue) => issue.reason === "word_first_three_distinct_contacts_missing"));
  }

  const buildRelease = fs.readFileSync(new URL("./build_release.mjs", import.meta.url), "utf8");
  const verifyAll = fs.readFileSync(new URL("./verify_all_single_phrase_sources.mjs", import.meta.url), "utf8");
  assert.match(buildRelease, /scopedFamilyChoreographyIssues\(SESSION,/u);
  assert.match(verifyAll, /scopedFamilyChoreographyIssues\(source\.courseSessionId,/u);
});

test("word cards reject bare English headwords and require a reviewed localized gloss", () => {
  const card = (definitionByLocale) => ({
    interactionId: "en:lesson-03:session-29:i04",
    modePayload: { wordCard: { word: "letter", definitionByLocale } },
  });
  assert.deepEqual(wordCardDefinitionIssues({
    ru: [card({ ru: "«письмо».", uk: "«лист»." })],
    uk: [card({ ru: "«письмо».", uk: "«лист»." })],
  }), []);
  assert.ok(wordCardDefinitionIssues({
    ru: [card({ ru: "letter", uk: "letter" })],
    uk: [card({ ru: "letter", uk: "letter" })],
  }).every((issue) => issue.reason === "word_card_definition_repeats_headword"));
});

test("family choreography blocks adjacent mechanics, repeated target-family pairs, missing families, and incomplete word-first contacts", () => {
  const item = (id, family, target) => ({
    interactionId: id,
    family,
    modePayload: family === "listen_choose" ? { referenceAudio: { transcript: target } }
      : family === "listen_build_dictation" ? { hiddenTargetPhrase: target }
      : family === "context_gap_grammar" ? { gappedTargetPhrase: target }
      : family === "speed_match" ? { pairGrid: [{ pairId: `${id}:p1`, target }] }
      : { targetPhrase: target },
  });
  const passing = [
    item("i1", "listen_choose", "phone"),
    item("i2", "scripted_repeat_compare", "phone"),
    {
      interactionId: "i3",
      family: "context_gap_grammar",
      responseOptions: [{ responseId: "i3:r1", text: "phone" }, { responseId: "i3:r2", text: "charger" }],
      modePayload: {
        gappedTargetPhrase: "___",
        gapOptions: [{ responseId: "i3:r1", text: "phone" }, { responseId: "i3:r2", text: "charger" }],
      },
    },
    item("i4", "listen_build_dictation", "This is a phone."),
    item("i5", "speed_match", "charger"),
    item("i6", "phrase_builder", "That is a phone."),
  ];
  const answers = [{ interactionId: "i3", correctResponseId: "i3:r1", correctText: "phone" }];
  assert.deepEqual(familyChoreographyIssues(passing, { newWords: ["phone"], answers }), []);
  const adjacent = [...passing]; adjacent[1] = item("i2", "listen_choose", "charger");
  assert.ok(familyChoreographyIssues(adjacent, { newWords: ["phone"], answers }).some((issue) => issue.reason === "adjacent_family_repeat"));
  const duplicate = [...passing, item("i7", "listen_choose", "phone")];
  assert.ok(familyChoreographyIssues(duplicate, { newWords: ["phone"], answers }).some((issue) => issue.reason === "target_family_repeat"));
  const gapTemplate = [
    item("g1", "context_gap_grammar", "It is ___ ."),
    item("g2", "context_gap_grammar", "It is ___ ."),
  ];
  assert.ok(!familyChoreographyIssues(gapTemplate)
    .some((issue) => issue.reason === "target_family_repeat"));
  assert.ok(familyChoreographyIssues(passing.slice(0, 5), { newWords: ["phone"], answers }).some((issue) => issue.reason === "required_family_missing"));
  assert.ok(familyChoreographyIssues(passing, { newWords: ["charger"], answers }).some((issue) => issue.reason === "word_first_three_distinct_contacts_missing"));
});

test("a word card followed by an audio discrimination is not a duplicate mechanic", () => {
  const card = {
    interactionId: "i1",
    family: "listen_choose",
    modePayload: { isWordCard: true, referenceAudio: { transcript: "here" } },
  };
  const discrimination = {
    interactionId: "i2",
    family: "listen_choose",
    responseOptions: [
      { responseId: "i2:r1", text: "here" },
      { responseId: "i2:r2", text: "hear" },
    ],
    modePayload: {
      referenceAudio: { transcript: "here" },
      choiceFeedback: [{ responseId: "i2:r1", text: "Верно." }],
    },
  };
  const repeats = familyChoreographyIssues([card, discrimination])
    .filter((issue) => ["adjacent_family_repeat", "target_family_repeat"].includes(issue.reason));
  assert.deepEqual(repeats, []);

  const secondCard = {
    interactionId: "i3",
    family: "listen_choose",
    modePayload: { isWordCard: true, referenceAudio: { transcript: "there" } },
  };
  const consecutiveCards = familyChoreographyIssues([card, secondCard])
    .filter((issue) => issue.reason === "adjacent_family_repeat");
  assert.deepEqual(consecutiveCards, []);

  const voiceSeries = [
    { interactionId: "i4", family: "scripted_repeat_compare", modePayload: { targetPhrase: "I'm ready." } },
    { interactionId: "i5", family: "scripted_repeat_compare", modePayload: { targetPhrase: "You're ready." } },
  ];
  assert.deepEqual(familyChoreographyIssues(voiceSeries)
    .filter((issue) => issue.reason === "adjacent_family_repeat"), []);
});

test("a one-token builder collapses and cannot count as a word-first family", () => {
  const item = (id, family, target) => ({
    interactionId: `en:lesson-04:session-01:${id}`,
    family,
    inputMode: family === "listen_choose" ? "single_choice"
      : family === "phrase_builder" || family === "listen_build_dictation" ? "ordered_tokens"
        : family === "context_gap_grammar" ? "single_choice"
          : family === "speed_match" ? "pair_grid" : "tap_record_compare",
    modePayload: family === "listen_choose" ? { referenceAudio: { transcript: target } }
      : family === "phrase_builder" ? { targetPhrase: target, orderedTokens: [target] }
        : family === "listen_build_dictation" ? { hiddenTargetPhrase: target }
          : family === "context_gap_grammar" ? { gappedTargetPhrase: target }
            : family === "speed_match" ? { pairGrid: [{ pairId: `${id}:p1`, target }] }
              : { targetPhrase: target },
  });
  const source = [
    item("i01", "listen_choose", "pharmacy"),
    item("i02", "scripted_repeat_compare", "pharmacy"),
    item("i03", "phrase_builder", "pharmacy"),
    item("i04", "listen_build_dictation", "There is a library."),
    item("i05", "context_gap_grammar", "There is a ___ bakery."),
    item("i06", "speed_match", "bakery"),
  ];
  assert.ok(familyChoreographyIssues(source, { newWords: ["pharmacy"] }).some((issue) =>
    issue.reason === "word_first_three_distinct_contacts_missing"));

  const projectedBuilder = projectSinglePhraseRelease({
    interactions: [source[2]],
    answers: [answer(source[2].interactionId)],
  });
  assert.equal(projectedBuilder.interactions[0].family, "scripted_repeat_compare");
  const projected = [...source.slice(0, 2), ...projectedBuilder.interactions, ...source.slice(3)];
  assert.ok(familyChoreographyIssues(projected, { newWords: ["pharmacy"] }).some((issue) =>
    issue.reason === "adjacent_family_repeat" || issue.reason === "word_first_three_distinct_contacts_missing"));
});

test("a one-token builder or dictation is reported as a pseudo action", () => {
  const interactions = [
    {
      interactionId: "en:lesson-03:session-38:i05",
      family: "phrase_builder",
      inputMode: "ordered_tokens",
      modePayload: { targetPhrase: "orange", orderedTokens: ["orange"] },
    },
    {
      interactionId: "en:lesson-03:session-38:i06",
      family: "listen_build_dictation",
      inputMode: "ordered_tokens",
      modePayload: {
        hiddenTargetPhrase: "orange",
        orderedTokens: ["orange"],
        referenceAudio: { transcript: "orange" },
      },
    },
  ];
  const issues = familyChoreographyIssues(interactions, { newWords: ["orange"] });
  assert.ok(issues.some((issue) => issue.reason === "one_token_pseudo_action"));
});

test("lesson 3 session 43 has no pseudo actions or premature new-word phrases", () => {
  const courseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const atomicPath = path.join(courseRoot, "sessions", "en", "l03", "s43", "practice.atomic.json");
  const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
  const issues = preJudgeChoreographyIssues({
    sessionIdentity: "en/l03/s43",
    interactionsByLocale: atomic.interactionsByLocale,
    answers: atomic.answers,
    newWords: ["book", "magazine", "newspaper"],
  });
  assert.deepEqual(issues, []);
});

test("lesson 3 session 38 has no pseudo actions or premature new-word phrases", () => {
  const courseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const atomicPath = path.join(courseRoot, "sessions", "en", "l03", "s38", "practice.atomic.json");
  const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
  const issues = preJudgeChoreographyIssues({
    sessionIdentity: "en/l03/s38",
    interactionsByLocale: atomic.interactionsByLocale,
    answers: atomic.answers,
    newWords: ["apple", "banana", "orange"],
  });
  assert.deepEqual(issues, []);
});

test("lesson 3 session 39 has no pseudo actions or premature new-word phrases", () => {
  const courseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const atomicPath = path.join(courseRoot, "sessions", "en", "l03", "s39", "practice.atomic.json");
  const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
  const issues = preJudgeChoreographyIssues({
    sessionIdentity: "en/l03/s39",
    interactionsByLocale: atomic.interactionsByLocale,
    answers: atomic.answers,
    newWords: ["grape", "lemon", "onion"],
  });
  assert.deepEqual(issues, []);
});

test("lesson 3 session 40 has no pseudo actions or premature new-word phrases", () => {
  const courseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const atomicPath = path.join(courseRoot, "sessions", "en", "l03", "s40", "practice.atomic.json");
  const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
  const issues = preJudgeChoreographyIssues({
    sessionIdentity: "en/l03/s40",
    interactionsByLocale: atomic.interactionsByLocale,
    answers: atomic.answers,
    newWords: ["barcode", "seal", "coupon"],
  });
  assert.deepEqual(issues, []);
});

test("sound contrast is inactive for L4 choreography and cannot count as word-first", () => {
  const item = (id, family, target) => ({
    interactionId: `en:lesson-04:session-01:${id}`,
    family,
    modePayload: family === "listen_choose" ? { referenceAudio: { transcript: target } }
      : family === "sound_contrast" ? { contrastA: target, contrastB: "factory" }
        : family === "listen_build_dictation" ? { hiddenTargetPhrase: target }
          : family === "context_gap_grammar" ? { gappedTargetPhrase: target }
            : family === "speed_match" ? { pairGrid: [{ pairId: `${id}:p1`, target }] }
              : { targetPhrase: target },
  });
  const contacts = [
    item("i01", "listen_choose", "pharmacy"),
    item("i02", "scripted_repeat_compare", "pharmacy"),
    item("i03", "sound_contrast", "pharmacy"),
    item("i04", "listen_build_dictation", "There is a library."),
    item("i05", "phrase_builder", "There is a bakery."),
    item("i06", "context_gap_grammar", "There is a ___ clinic."),
    item("i07", "speed_match", "garden"),
  ];
  const issues = scopedFamilyChoreographyIssues("en/l04/s01", contacts, { newWords: ["pharmacy"] });
  assert.ok(issues.some((issue) => issue.reason === "inactive_family" && issue.family === "sound_contrast"));
  assert.ok(issues.some((issue) => issue.reason === "word_first_three_distinct_contacts_missing"));
});

test("blank-only context gap resolves its exact answer as the third word-first contact in source and projection", () => {
  const word = "bank";
  const gapId = "en:lesson-04:session-03:i03";
  const gapOptions = [
    { responseId: `${gapId}:r2`, text: "bench" },
    { responseId: `${gapId}:r1`, text: word },
  ];
  const interactions = [
    { interactionId: "i1", family: "listen_choose", inputMode: "single_choice", responseOptions: [], modePayload: { referenceAudio: { transcript: word } } },
    { interactionId: "i2", family: "scripted_repeat_compare", inputMode: "tap_record_compare", responseOptions: [], modePayload: { targetPhrase: word } },
    { interactionId: gapId, family: "context_gap_grammar", inputMode: "single_choice", responseOptions: gapOptions, modePayload: { gappedTargetPhrase: "___", gapOptions } },
    { interactionId: "i4", family: "phrase_builder", inputMode: "ordered_tokens", responseOptions: [], modePayload: { targetPhrase: "There are banks.", orderedTokens: ["There", "are", "banks"] } },
    { interactionId: "i5", family: "listen_build_dictation", inputMode: "ordered_tokens", responseOptions: [], modePayload: { hiddenTargetPhrase: "There are banks here.", orderedTokens: ["There", "are", "banks", "here"], referenceAudio: { transcript: "There are banks here." } } },
    { interactionId: "i6", family: "speed_match", inputMode: "pair_grid", responseOptions: [], modePayload: { pairGrid: [{ pairId: "p1", target: "banks" }] } },
  ];
  const answers = [
    answer("i1", null, word),
    answer("i2", null, word),
    answer(gapId, `${gapId}:r1`, word),
    answer("i4", null, "There are banks."),
    answer("i5", null, "There are banks here."),
    answer("i6", "p1", "p1=banks"),
  ];

  assert.deepEqual(familyChoreographyIssues(interactions, { newWords: [word], answers }), []);
  const projected = projectSinglePhraseRelease({ interactions, answers });
  assert.deepEqual(familyChoreographyIssues(projected.interactions, { newWords: [word], answers: projected.answers }), []);
});

test("blank-only context gap maps the correct option by response id in both RU and UK and cross-checks correctText", () => {
  const id = "en:lesson-04:session-03:i03";
  const build = (options) => ({
    interactionId: id,
    family: "context_gap_grammar",
    inputMode: "single_choice",
    responseOptions: options,
    modePayload: { gappedTargetPhrase: "___", gapOptions: options },
  });
  const ru = build([{ responseId: `${id}:r1`, text: "bank" }, { responseId: `${id}:r2`, text: "bench" }]);
  const uk = build([{ responseId: `${id}:r2`, text: "bench" }, { responseId: `${id}:r1`, text: "bank" }]);
  const answers = [answer(id, `${id}:r1`, "bank")];
  for (const interaction of [ru, uk]) {
    const contacts = [
      { interactionId: "i1", family: "listen_choose", modePayload: { referenceAudio: { transcript: "bank" } } },
      { interactionId: "i2", family: "scripted_repeat_compare", modePayload: { targetPhrase: "bank" } },
      interaction,
    ];
    assert.ok(!familyChoreographyIssues(contacts, { newWords: ["bank"], answers })
      .some((issue) => issue.reason === "word_first_three_distinct_contacts_missing"));
  }
  assert.ok(familyChoreographyIssues([ru], { newWords: ["bank"], answers: [answer(id, `${id}:r1`, "bench")] })
    .some((issue) => issue.reason === "context_gap_correct_text_mismatch"));
});

test("a context gap inside a phrase remains a phrase and cannot impersonate an exact word-first contact", () => {
  const id = "en:lesson-04:session-03:i03";
  const options = [{ responseId: `${id}:r1`, text: "banks" }, { responseId: `${id}:r2`, text: "benches" }];
  const interactions = [
    { interactionId: "i1", family: "listen_choose", modePayload: { referenceAudio: { transcript: "bank" } } },
    { interactionId: "i2", family: "scripted_repeat_compare", modePayload: { targetPhrase: "bank" } },
    { interactionId: id, family: "context_gap_grammar", responseOptions: options, modePayload: { gappedTargetPhrase: "There are ___.", gapOptions: options } },
  ];
  assert.ok(familyChoreographyIssues(interactions, {
    newWords: ["bank"],
    answers: [answer(id, `${id}:r1`, "banks")],
  }).some((issue) => issue.reason === "word_first_three_distinct_contacts_missing"));
});

test("all three exact word-first contacts must precede the first phrase using the new word", () => {
  const id = "en:lesson-04:session-03:i04";
  const gapOptions = [{ responseId: `${id}:r1`, text: "bank" }, { responseId: `${id}:r2`, text: "bench" }];
  const items = [
    { interactionId: "i1", family: "listen_choose", modePayload: { referenceAudio: { transcript: "bank" } } },
    { interactionId: "i2", family: "phrase_builder", modePayload: { targetPhrase: "There are banks.", orderedTokens: ["There", "are", "banks"] } },
    { interactionId: "i3", family: "scripted_repeat_compare", modePayload: { targetPhrase: "bank" } },
    { interactionId: id, family: "context_gap_grammar", responseOptions: gapOptions, modePayload: { gappedTargetPhrase: "___", gapOptions } },
  ];
  const issues = familyChoreographyIssues(items, { newWords: ["bank"], answers: [answer(id, `${id}:r1`, "bank")] });
  assert.ok(issues.some((issue) => issue.reason === "word_first_phrase_before_three_contacts"));
});

test("release and global verifier pass answers into source and projected choreography checks", () => {
  const buildRelease = fs.readFileSync(new URL("./build_release.mjs", import.meta.url), "utf8");
  const verifyAll = fs.readFileSync(new URL("./verify_all_single_phrase_sources.mjs", import.meta.url), "utf8");
  const preJudge = fs.readFileSync(new URL("./prejudge_choreography.mjs", import.meta.url), "utf8");
  assert.match(buildRelease, /scopedFamilyChoreographyIssues\(SESSION, sourceInteractions, \{[\s\S]{0,200}?answers: sourceAnswers/u);
  assert.match(buildRelease, /scopedFamilyChoreographyIssues\(SESSION, interactions, \{[\s\S]{0,200}?answers,/u);
  assert.match(buildRelease, /scopedFamilyChoreographyIssues\(SESSION, localeSourceInteractions, \{[\s\S]{0,200}?answers: sourceAnswers/u);
  assert.match(buildRelease, /scopedFamilyChoreographyIssues\(SESSION, localeInteractions, \{[\s\S]{0,200}?answers: localeAnswers/u);
  assert.match(verifyAll, /scopedFamilyChoreographyIssues\(source\.courseSessionId, items, \{[\s\S]{0,200}?answers,/u);
  assert.match(preJudge, /preJudgeChoreographyIssues\(\{[\s\S]{0,300}?answers: atomic\.answers/u);
});

test("pre-judge dry-run permits distinct spoken phrases introduced by projection", () => {
  const gapId = "en:lesson-04:session-03:i03";
  const gapOptions = [{ responseId: `${gapId}:r1`, text: "bank" }, { responseId: `${gapId}:r2`, text: "bench" }];
  const items = [
    { interactionId: "i1", family: "listen_choose", inputMode: "single_choice", responseOptions: [], modePayload: { referenceAudio: { transcript: "bank" } } },
    { interactionId: "i2", family: "scripted_repeat_compare", inputMode: "tap_record_compare", responseOptions: [], modePayload: { targetPhrase: "bank" } },
    { interactionId: gapId, family: "context_gap_grammar", inputMode: "single_choice", responseOptions: gapOptions, modePayload: { gappedTargetPhrase: "___", gapOptions } },
    { interactionId: "i4", family: "phrase_builder", inputMode: "ordered_tokens", responseOptions: [], modePayload: { targetPhrase: "Ready", orderedTokens: ["Ready"] } },
    { interactionId: "i5", family: "scripted_repeat_compare", inputMode: "tap_record_compare", responseOptions: [], modePayload: { targetPhrase: "There are banks." } },
    { interactionId: "i6", family: "listen_build_dictation", inputMode: "ordered_tokens", responseOptions: [], modePayload: { hiddenTargetPhrase: "Banks are here.", orderedTokens: ["Banks", "are", "here"], referenceAudio: { transcript: "Banks are here." } } },
    { interactionId: "i7", family: "speed_match", inputMode: "pair_grid", responseOptions: [], modePayload: { pairGrid: [{ pairId: "p1", target: "here" }] } },
  ];
  const answers = [
    answer("i1", null, "bank"),
    answer("i2", null, "bank"),
    answer(gapId, `${gapId}:r1`, "bank"),
    answer("i4", null, "Ready"),
    answer("i5", null, "There are banks."),
    answer("i6", null, "Banks are here."),
    answer("i7", "p1", "p1=here"),
  ];
  const issues = preJudgeChoreographyIssues({
    sessionIdentity: "en/l04/s03",
    interactionsByLocale: { ru: items, uk: structuredClone(items) },
    answers,
    newWords: ["bank"],
  });
  assert.ok(!issues.some((issue) => issue.stage === "projected" && issue.reason === "adjacent_family_repeat"));
});

test("release source checks both RU and UK projected choreography with a stable hold", () => {
  const buildRelease = fs.readFileSync(new URL("./build_release.mjs", import.meta.url), "utf8");
  assert.match(buildRelease, /scopedFamilyChoreographyIssues\(SESSION, interactions,/u);
  assert.match(buildRelease, /scopedFamilyChoreographyIssues\(SESSION, localeInteractions,/u);
  assert.match(buildRelease, /projected_family_choreography_hold/u);
});

test("choice feedback locale maps must match across locale projections", () => {
  const responseId = "en:lesson-03:session-46:i16:r2";
  const item = (feedbackByLocale, includeFeedback = true) => ({
    interactionId: "en:lesson-03:session-46:i16",
    responseOptions: [{ responseId: "en:lesson-03:session-46:i16:r1" }, { responseId }],
    modePayload: { choiceFeedback: includeFeedback ? [{ responseId, correct: false, feedbackByLocale }] : [] },
  });
  assert.equal(feedbackLocaleParityIssues({
    ru: [item({ ru: "Звучит old, не new.", uk: "неверно" })],
    uk: [item({ ru: "неверно", uk: "Звучить old, а не new." })],
  }).length, 1);
  assert.deepEqual(feedbackLocaleParityIssues({
    ru: [item({ ru: "Звучит old, не new.", uk: "Звучить old, а не new." })],
    uk: [item({ ru: "Звучит old, не new.", uk: "Звучить old, а не new." })],
  }), []);
  assert.equal(feedbackLocaleParityIssues({
    ru: [item({ ru: "Звучит old, не new.", uk: "Звучить old, а не new." })],
    uk: [item({}, false)],
  })[0]?.reason, "choice_feedback_locale_map_mismatch");
  assert.equal(feedbackLocaleParityIssues({
    ru: [item({}, false)],
    uk: [item({ ru: "Звучит old, не new.", uk: "Звучить old, а не new." })],
  })[0]?.reason, "choice_feedback_locale_map_mismatch");
  assert.ok(feedbackLocaleParityIssues({
    ru: [item({ ru: "Звучит old, не new.", uk: "" })],
    uk: [item({ ru: "Звучит old, не new.", uk: "" })],
  }).some((issue) => issue.reason === "choice_feedback_locale_value_missing"));
});

test("single-choice feedback covers only wrong options and rejects correct targets", () => {
  const interactionId = "en:lesson-03:session-46:i16";
  const correctResponseId = `${interactionId}:r1`;
  const wrongResponseId = `${interactionId}:r2`;
  const feedback = [
    {
      responseId: correctResponseId,
      correct: true,
      feedbackByLocale: { ru: "Это правильный ответ.", uk: "Це правильна відповідь." },
    },
    {
      responseId: wrongResponseId,
      correct: false,
      feedbackByLocale: { ru: "Этот вариант меняет смысл.", uk: "Цей варіант змінює зміст." },
    },
  ];
  const item = (choiceFeedback) => ({
    interactionId,
    inputMode: "single_choice",
    responseOptions: [{ responseId: correctResponseId }, { responseId: wrongResponseId }],
    modePayload: { choiceFeedback },
  });
  const answers = [{ interactionId, correctResponseId }];

  assert.deepEqual(feedbackLocaleParityIssues({
    ru: [item(feedback.slice(1))],
    uk: [item(structuredClone(feedback.slice(1)))],
  }, { answers }), []);

  const correctTargetIssues = feedbackLocaleParityIssues({
    ru: [item(feedback)],
    uk: [item(structuredClone(feedback))],
  }, { answers });
  assert.ok(correctTargetIssues.some((issue) => (
    issue.responseId === correctResponseId
    && issue.reason === "feedback_target_invalid"
  )));

  const missingWrongIssues = feedbackLocaleParityIssues({
    ru: [item([])],
    uk: [item([])],
  }, { answers });
  assert.ok(missingWrongIssues.some((issue) => issue.responseId === wrongResponseId && issue.reason === "choice_feedback_missing"));
});

test("single-choice feedback rejects duplicate answer authority before projection", () => {
  const interactionId = "en:lesson-03:session-46:i16";
  const correctResponseId = `${interactionId}:r1`;
  const wrongResponseId = `${interactionId}:r2`;
  const interaction = {
    interactionId,
    inputMode: "single_choice",
    responseOptions: [{ responseId: correctResponseId }, { responseId: wrongResponseId }],
    modePayload: {
      choiceFeedback: [{
        responseId: wrongResponseId,
        correct: false,
        feedbackByLocale: { ru: "Неверная форма.", uk: "Неправильна форма." },
      }],
    },
  };
  const answer = { interactionId, correctResponseId };

  for (const answers of [
    [answer, structuredClone(answer)],
    [answer, { ...answer, correctResponseId: wrongResponseId }],
  ]) {
    assert.ok(feedbackLocaleParityIssues({
      ru: [interaction],
      uk: [structuredClone(interaction)],
    }, { answers }).some((issue) => issue.reason === "choice_feedback_answer_duplicate"));
  }
});

test("intro questions block every multi-phrase choice in every locale", () => {
  const intro = {
    pages: [{
      pageId: "en:lesson-03:session-41:intro1",
      question: {
        choicesByLocale: {
          ru: [{ responseId: "r1", text: "This is a receipt. The receipt is wrong." }],
          uk: [{ responseId: "r1", text: "This is a receipt. The receipt is wrong." }],
        },
      },
    }],
  };
  assert.throws(
    () => assertSinglePhraseIntro(intro, "en/l03/s41:intro"),
    /single_phrase_intro_hold:en:lesson-03:session-41:intro1:ru:r1:multi_sentence:2/u,
  );
});

test("intro questions accept one assessed phrase per choice", () => {
  const intro = {
    pages: [{
      pageId: "en:lesson-03:session-41:intro1",
      question: {
        choicesByLocale: {
          ru: [{ responseId: "r1", text: "The receipt is wrong." }],
          uk: [{ responseId: "r1", text: "The receipt is wrong." }],
        },
      },
    }],
  };
  assert.doesNotThrow(() => assertSinglePhraseIntro(intro, "en/l03/s41:intro"));
});

test("every learner-visible answer option rejects bundled phrase or glossary packets", () => {
  const wordCardWithGlossaryPacket = baseInteraction({
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [
      { responseId: "r1", text: "block" },
      { responseId: "r2", text: "чёрный; block — блок; blank — пустой; back — спина" },
    ],
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: "audio", transcript: "block" },
      localizedMeaningChoices: [],
      isWordCard: true,
    },
  });
  const multiSentenceChoice = baseInteraction({
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [{ responseId: "r1", text: "A sofa is here. Chairs are here." }],
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: "audio", transcript: "A sofa is here." },
      localizedMeaningChoices: [],
      isWordCard: false,
    },
  });

  assert.ok(singlePhraseReleaseIssues([wordCardWithGlossaryPacket]).some((issue) =>
    issue.field === "responseOptions[1]" && issue.reason === "delimiter_clause_packet"));
  assert.ok(singlePhraseReleaseIssues([multiSentenceChoice]).some((issue) =>
    issue.field === "responseOptions[0]" && issue.sentenceCount === 2));
});

test("localized meaning choices reject bundled meanings in one selectable answer", () => {
  const interaction = baseInteraction({
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [{ responseId: "r1", text: "block" }],
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: "audio", transcript: "block" },
      localizedMeaningChoices: [{
        responseId: "r1",
        targetText: "block",
        meaningByLocale: { ru: "блок; препятствие; квартал", uk: "блок" },
      }],
      isWordCard: false,
    },
  });

  assert.ok(singlePhraseReleaseIssues([interaction]).some((issue) =>
    issue.field === "localizedMeaningChoices[0].meaningByLocale.ru" && issue.reason === "delimiter_clause_packet"));
});

test("comma slash and middle-dot word packets are rejected in practice, meanings, and intro", () => {
  const build = (text, meaning = "один") => baseInteraction({
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [{ responseId: "r1", text }],
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: "audio", transcript: "block" },
      localizedMeaningChoices: [{ responseId: "r1", targetText: "block", meaningByLocale: { ru: meaning, uk: "один" } }],
      isWordCard: false,
    },
  });
  for (const text of ["block, blank, back", "block / blank / back", "block · blank · back"]) {
    assert.ok(singlePhraseReleaseIssues([build(text)]).some((issue) => issue.reason === "visible_choice_packet"), text);
  }
  assert.ok(singlePhraseReleaseIssues([build("block", "блок, пустой, назад")]).some((issue) => issue.reason === "visible_choice_packet"));

  const intro = { pages: [{ pageId: "intro1", question: { choicesByLocale: {
    ru: [{ responseId: "r1", text: "block — блок, blank — пустой" }],
  } } }] };
  assert.throws(() => assertSinglePhraseIntro(intro), /visible_choice_packet/u);
});

test("answer contract rejects unrelated correctText and unknown correctResponseId", () => {
  const id = "de:lesson-01:session-01:i01";
  const builder = baseInteraction({
    interactionId: id,
    family: "phrase_builder",
    inputMode: "ordered_tokens",
    responseOptions: [],
    modePayload: { family: "phrase_builder", targetPhrase: "Das ist rot.", orderedTokens: ["Das", "ist", "rot"], authoredDistractorTokens: [] },
  });
  assert.ok(answerContractIssues([builder], [{ interactionId: id, correctText: "UNRELATED PLACEHOLDER", correctResponseId: null }])
    .some((issue) => issue.reason === "correct_text_contract_mismatch"));

  const choice = baseInteraction({
    interactionId: `${id}:choice`,
    family: "sound_contrast",
    inputMode: "single_choice",
    responseOptions: [{ responseId: "known", text: "back" }],
    modePayload: { family: "sound_contrast" },
  });
  assert.ok(answerContractIssues([choice], [{ interactionId: choice.interactionId, correctText: "back", correctResponseId: "missing" }])
    .some((issue) => issue.reason === "correct_response_missing"));
});

test("choice answer authority is unique and visible before audit or projection", () => {
  const id = "en:lesson-99:session-97:i01";
  const choice = baseInteraction({
    interactionId: id,
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [
      { responseId: `${id}:r1`, text: "back" },
      { responseId: `${id}:r2`, text: "bank" },
    ],
    audioTargetIds: [`${id}:audio`],
    modePayload: {
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "back" },
      localizedMeaningChoices: [
        { responseId: `${id}:r1`, targetText: "back", meaningByLocale: null },
        { responseId: `${id}:r2`, targetText: "bank", meaningByLocale: null },
      ],
      isWordCard: false,
      choiceFeedback: [],
    },
  });
  const valid = answer(id, `${id}:r1`, "back");
  const invalidCases = [
    { answers: [], reason: "answer_missing" },
    { answers: [answer(id, null, "back")], reason: "correct_response_missing" },
    { answers: [answer(id, `${id}:stale`, "back")], reason: "correct_response_missing" },
    { answers: [valid, structuredClone(valid)], reason: "answer_duplicate" },
    { answers: [valid, answer(id, `${id}:r2`, "bank")], reason: "answer_duplicate" },
  ];

  for (const { answers, reason } of invalidCases) {
    assert.ok(answerContractIssues([choice], answers).some((issue) => issue.interactionId === id && issue.reason === reason));
    assert.throws(
      () => projectSinglePhraseRelease({ interactions: [choice], answers }),
      new RegExp(`single_phrase_projection_hold:${id}:${reason}`, "u"),
    );
  }
  assert.doesNotThrow(() => projectSinglePhraseRelease({ interactions: [choice], answers: [valid] }));
});

test("non-choice duplicate rows with null correctness remain compatible", () => {
  const id = "en:lesson-99:session-97:i02";
  const builder = baseInteraction({
    interactionId: id,
    family: "phrase_builder",
    inputMode: "ordered_tokens",
    responseOptions: [],
    audioTargetIds: [],
    modePayload: {
      targetPhrase: "I am back.",
      orderedTokens: ["I", "am", "back"],
      authoredDistractorTokens: [],
    },
  });
  const duplicateAnswers = [answer(id, null, "I am back."), answer(id, null, "I am back.")];

  assert.deepEqual(answerContractIssues([builder], duplicateAnswers), []);
  assert.doesNotThrow(() => projectSinglePhraseRelease({ interactions: [builder], answers: duplicateAnswers }));
});

test("single-word listening rejects hidden lists without semicolons", () => {
  const build = (text) => baseInteraction({
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [{ responseId: "r1", text }],
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: "audio", transcript: "block" },
      localizedMeaningChoices: [],
      isWordCard: true,
    },
  });

  for (const text of [
    "block\nblank\nback",
    "• block\n• blank\n• back",
    "block — блок, blank — пустой, back — спина",
    "block blank back",
  ]) {
    assert.ok(singlePhraseReleaseIssues([build(text)]).some((issue) =>
      issue.field === "responseOptions[0]" && issue.reason === "visible_choice_packet"), text);
  }

  const german = build("groß weiß grün");
  german.modePayload.referenceAudio.transcript = "groß";
  assert.ok(singlePhraseReleaseIssues([german]).some((issue) =>
    issue.field === "responseOptions[0]" && issue.reason === "visible_choice_packet"), "groß weiß grün");
});

test("single-phrase source rejects an input mode that its family cannot execute", () => {
  const interaction = baseInteraction({
    family: "scripted_repeat_compare",
    inputMode: "voice_recording",
    modePayload: { targetPhrase: "This is a key." },
  });
  assert.ok(singlePhraseReleaseIssues([interaction]).some((issue) => issue.reason === "input_mode_family_mismatch"));
});

const baseInteraction = (overrides = {}) => ({
  interactionId: "en:lesson-03:session-50:i17",
  ordinal: 20,
  purpose: "independent_check",
  family: "scripted_repeat_compare",
  inputMode: "tap_record_compare",
  prompt: "Финал",
  responseOptions: [],
  mediaIds: [],
  audioTargetIds: ["en:lesson-03:session-50:i17:audio"],
  accessibilityLabel: "Финал",
  modePayload: null,
  scriptedAlternate: null,
  ...overrides,
});

const answer = (interactionId, correctResponseId = null, correctText = "") => ({
  interactionId,
  correctResponseId,
  correctText,
});

test("scripted repeat splits every spoken sentence into a unique interaction", () => {
  const source = baseInteraction({
    modePayload: {
      family: "scripted_repeat_compare",
      referenceAudio: { audioTargetId: "en:lesson-03:session-50:i17:audio", transcript: "A black sofa is here. White chairs are here. The grey tables are here." },
      slowReferenceAudio: null,
      targetPhrase: "A black sofa is here. White chairs are here. The grey tables are here.",
      recordControlPolicy: "hold_press_release_with_accessible_toggle",
      modelPlayback: "reference_and_slow",
      learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["PASS_CONFIDENT", "UNCERTAIN"],
    },
  });
  const projected = projectSinglePhraseRelease({ interactions: [source], answers: [answer(source.interactionId)] });
  assert.deepEqual(projected.interactions.map((item) => item.modePayload.targetPhrase), [
    "A black sofa is here.",
    "White chairs are here.",
    "The grey tables are here.",
  ]);
  assert.deepEqual(projected.interactions.map((item) => item.interactionId), [
    `${source.interactionId}:s01`, `${source.interactionId}:s02`, `${source.interactionId}:s03`,
  ]);
  assert.deepEqual(projected.interactions.map((item) => item.ordinal), [4, 5, 6]);
  assert.deepEqual(projected.answers.map((item) => item.interactionId), projected.interactions.map((item) => item.interactionId));
  assert.deepEqual(projected.answers.map((item) => item.correctText), projected.interactions.map((item) => item.modePayload.targetPhrase));
});

test("Ukrainian split voice keeps the author-approved locale prompt", () => {
  const id = "en:lesson-03:session-29:i16";
  const source = baseInteraction({
    interactionId: id,
    prompt: "Покажіть результат",
    accessibilityLabel: "Покажіть результат",
    modePayload: {
      family: "scripted_repeat_compare",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "This is a stamp. It is small." },
      targetPhrase: "This is a stamp. It is small.",
    },
  });
  const projected = projectSinglePhraseRelease({ interactions: [source], answers: [answer(id)], locale: "uk" });
  assert.deepEqual(projected.interactions.map((item) => item.prompt), [
    "Покажіть результат",
    "Покажіть результат",
  ]);
  assert.equal(projected.interactions.every((item) => item.accessibilityLabel === item.prompt), true);
});

test("scripted voice keeps the authored locale-specific word instruction and phrase context", () => {
  const wordId = "en:lesson-04:session-01:i03";
  const wordRu = baseInteraction({
    interactionId: wordId,
    prompt: "Произнесите слово для библиотеки",
    accessibilityLabel: "Произнесите слово для библиотеки",
    modePayload: {
      family: "scripted_repeat_compare",
      referenceAudio: { audioTargetId: `${wordId}:audio`, transcript: "library" },
      targetPhrase: "library",
    },
  });
  const wordUk = structuredClone(wordRu);
  wordUk.prompt = "Промовте слово для бібліотеки";
  wordUk.accessibilityLabel = "Промовте слово для бібліотеки";
  const phraseId = "en:lesson-04:session-01:i11";
  const phrase = baseInteraction({
    interactionId: phraseId,
    prompt: "На заметке у стойки возле пекарни написано «тихая». Произнесите сообщение",
    accessibilityLabel: "На заметке у стойки возле пекарни написано «тихая». Произнесите сообщение",
    modePayload: {
      family: "scripted_repeat_compare",
      referenceAudio: { audioTargetId: `${phraseId}:audio`, transcript: "There is a quiet bakery." },
      targetPhrase: "There is a quiet bakery.",
    },
  });

  const ruProjected = projectSinglePhraseRelease({ interactions: [wordRu, phrase], answers: [answer(wordId), answer(phraseId)], locale: "ru" });
  const ukProjected = projectSinglePhraseRelease({ interactions: [wordUk], answers: [answer(wordId)], locale: "uk" });

  assert.equal(ruProjected.interactions[0].prompt, "Произнесите слово для библиотеки");
  assert.equal(ruProjected.interactions[0].accessibilityLabel, "Произнесите слово для библиотеки");
  assert.equal(ruProjected.interactions[1].prompt, "На заметке у стойки возле пекарни написано «тихая». Произнесите сообщение");
  assert.equal(ukProjected.interactions[0].prompt, "Промовте слово для бібліотеки");
  assert.equal(ukProjected.interactions[0].accessibilityLabel, "Промовте слово для бібліотеки");
});

test("scripted voice rejects a prompt that reveals its spoken target", () => {
  const id = "en:lesson-04:session-01:i12";
  const source = baseInteraction({
    interactionId: id,
    prompt: "Произнесите There is a quiet bakery.",
    accessibilityLabel: "Произнесите There is a quiet bakery.",
    modePayload: {
      family: "scripted_repeat_compare",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "There is a quiet bakery." },
      targetPhrase: "There is a quiet bakery.",
    },
  });

  assert.throws(
    () => projectSinglePhraseRelease({ interactions: [source], answers: [answer(id)], locale: "ru" }),
    /single_phrase_projection_hold:en:lesson-04:session-01:i12:prompt_target_leak/u,
  );
});

test("phrase builder and dictation retain sentence tokens and authored distractors", () => {
  const builder = baseInteraction({
    interactionId: "en:lesson-01:session-10:i19",
    family: "phrase_builder",
    inputMode: "ordered_tokens",
    audioTargetIds: [],
    modePayload: {
      family: "phrase_builder",
      targetPhrase: "You are quiet. I am tired.",
      localizedMeaning: { ru: "Соберите две фразы", uk: "Складіть дві фрази" },
      orderedTokens: ["You", "are", "quiet", "I", "am", "tired"],
      authoredDistractorTokens: ["is", "ready"],
      slotFeedback: [],
    },
  });
  const dictation = baseInteraction({
    interactionId: "en:lesson-03:session-39:i16",
    family: "listen_build_dictation",
    inputMode: "ordered_tokens",
    modePayload: {
      family: "listen_build_dictation",
      referenceAudio: { audioTargetId: "en:lesson-03:session-39:i16:audio", transcript: "These are grapes. Those are lemons. These are onions." },
      slowReferenceAudio: null,
      hiddenTargetPhrase: "These are grapes. Those are lemons. These are onions.",
      orderedTokens: ["These", "are", "grapes", "Those", "are", "lemons", "These", "are", "onions"],
      authoredDistractorTokens: ["is", "those"],
      slotFeedback: [],
    },
  });
  const projected = projectSinglePhraseRelease({
    interactions: [builder, dictation],
    answers: [answer(builder.interactionId), answer(dictation.interactionId)],
  });
  assert.deepEqual(projected.interactions.slice(0, 2).map((item) => item.modePayload.orderedTokens), [
    ["You", "are", "quiet"], ["I", "am", "tired"],
  ]);
  assert.deepEqual(projected.interactions.slice(0, 2).map((item) => item.modePayload.authoredDistractorTokens), [
    ["is", "ready"], ["is", "ready"],
  ]);
  assert.deepEqual(projected.interactions.slice(2).map((item) => item.modePayload.hiddenTargetPhrase), [
    "These are grapes.", "Those are lemons.", "These are onions.",
  ]);
  assert.deepEqual(projected.interactions.slice(2).map((item) => item.modePayload.referenceAudio.transcript), [
    "These are grapes.", "Those are lemons.", "These are onions.",
  ]);
});

test("a one-token builder segment becomes a one-phrase spoken interaction", () => {
  const id = "en:lesson-02:session-51:i03";
  const source = baseInteraction({
    interactionId: id,
    family: "phrase_builder",
    inputMode: "ordered_tokens",
    audioTargetIds: [],
    modePayload: {
      family: "phrase_builder",
      targetPhrase: "Shops. We are here.",
      localizedMeaning: { ru: "Две отдельные фразы", uk: "Дві окремі фрази" },
      orderedTokens: ["Shops", "We", "are", "here"],
      authoredDistractorTokens: ["is"],
      slotFeedback: [],
    },
  });
  const projected = projectSinglePhraseRelease({ interactions: [source], answers: [answer(id)] });
  assert.equal(projected.interactions[0].family, "scripted_repeat_compare");
  assert.equal(projected.interactions[0].modePayload.targetPhrase, "Shops.");
  assert.equal(projected.interactions[0].prompt, "Финал");
  assert.equal(projected.answers[0].correctText, "Shops.");
  assert.equal(projected.interactions[1].family, "phrase_builder");
  assert.equal(projected.interactions[1].prompt, "Соберите одну фразу — шаг 2 из 2");
  assert.deepEqual(projected.interactions[1].modePayload.orderedTokens, ["We", "are", "here"]);

  const alreadySplit = {
    ...source,
    interactionId: `${id}:s01`,
    modePayload: {
      ...source.modePayload,
      targetPhrase: "Excuse me.",
      orderedTokens: ["Excuse me."],
    },
  };
  const repaired = projectSinglePhraseRelease({ interactions: [alreadySplit], answers: [answer(alreadySplit.interactionId)] });
  assert.equal(repaired.interactions[0].family, "scripted_repeat_compare");
  assert.equal(repaired.interactions[0].modePayload.targetPhrase, "Excuse me.");
});

test("multi-sentence gap splits answer segments by each sentence blank count", () => {
  const id = "en:lesson-03:session-50:i17";
  const options = [
    ["A", "black", "white", "The", "grey"],
    ["The", "black", "white", "The", "grey"],
    ["A", "white", "black", "The", "grey"],
    ["A", "black", "white", "A", "grey"],
  ].map((parts, index) => ({ responseId: `${id}:r${index + 1}`, text: parts.join("; ") }));
  const source = baseInteraction({
    interactionId: id,
    family: "context_gap_grammar",
    inputMode: "single_choice",
    audioTargetIds: [],
    responseOptions: options,
    modePayload: {
      family: "context_gap_grammar",
      localizedScene: { ru: "Финал", uk: "Фінал" },
      gappedTargetPhrase: "___ ___ sofa is here. ___ chairs are here. ___ ___ tables are here.",
      gapOptions: options,
      testedDimension: "articles and colours",
      choiceFeedback: options.map((item, index) => ({ responseId: item.responseId, correct: index === 0, testedDimension: "articles and colours", feedbackByLocale: { ru: `ru-${item.responseId}`, uk: `uk-${item.responseId}` } })),
    },
  });
  const projected = projectSinglePhraseRelease({ interactions: [source], answers: [answer(id, `${id}:r1`, options[0].text)] });
  assert.deepEqual(projected.interactions.map((item) => item.modePayload.gappedTargetPhrase), [
    "___ sofa is here.", "___ chairs are here.", "___ tables are here.",
  ]);
  assert.deepEqual(projected.interactions.map((item) => item.responseOptions.map((option) => option.text)), [
    [["A black", "The black", "A white"]],
    [["white", "black"]],
    [["The grey", "A grey"]],
  ].map(([values]) => values));
  assert.ok(projected.answers.every((item) => item.correctResponseId && item.correctResponseId.startsWith(item.interactionId)));
  assert.deepEqual(projected.answers.map((item) => item.correctText), ["A black", "white", "The grey"]);
  assert.ok(projected.interactions.every((item, index) => {
    const feedback = item.modePayload.choiceFeedback;
    return feedback.length === item.responseOptions.length
      && feedback.find((row) => row.responseId === projected.answers[index].correctResponseId)?.correct === true
      && feedback.filter((row) => row.responseId !== projected.answers[index].correctResponseId).every((row) => row.correct === false);
  }));
  assert.deepEqual(compositeGapReleaseIssues(projected.interactions), []);
});

test("non-adjacent multiple gaps in one sentence fail closed", () => {
  const id = "en:lesson-03:session-51:i17";
  const options = [
    { responseId: `${id}:r1`, text: "A; here" },
    { responseId: `${id}:r2`, text: "The; there" },
  ];
  const source = baseInteraction({
    interactionId: id,
    family: "context_gap_grammar",
    inputMode: "single_choice",
    responseOptions: options,
    modePayload: {
      family: "context_gap_grammar",
      localizedScene: { ru: "x", uk: "x" },
      gappedTargetPhrase: "___ sofa is ___ today.",
      gapOptions: options,
      testedDimension: "x",
      choiceFeedback: [],
    },
  });
  assert.throws(
    () => projectSinglePhraseRelease({ interactions: [source], answers: [answer(id, `${id}:r1`, options[0].text)] }),
    /single_phrase_projection_hold:en:lesson-03:session-51:i17:non_adjacent_gaps/u,
  );
  assert.equal(compositeGapReleaseIssues([source]).length, 1);
});

test("gap antecedent becomes its own spoken interaction instead of being discarded", () => {
  const id = "en:lesson-03:session-29:i13";
  const options = ["It", "This", "That", "Is"].map((text, index) => ({ responseId: `${id}:r${index + 1}`, text }));
  const source = baseInteraction({
    interactionId: id,
    family: "context_gap_grammar",
    inputMode: "single_choice",
    responseOptions: options,
    modePayload: { family: "context_gap_grammar", localizedScene: { ru: "Посылка", uk: "Посилка" }, gappedTargetPhrase: "This is a parcel. ___ is heavy.", gapOptions: options, testedDimension: "pronoun", choiceFeedback: [] },
  });
  const projected = projectSinglePhraseRelease({ interactions: [source], answers: [answer(id, `${id}:r1`, "It")] });
  assert.equal(projected.interactions[0].family, "scripted_repeat_compare");
  assert.equal(projected.interactions[0].modePayload.targetPhrase, "This is a parcel.");
  assert.equal(projected.interactions[1].family, "context_gap_grammar");
  assert.equal(projected.interactions[1].modePayload.gappedTargetPhrase, "___ is heavy.");
});

test("listen choice splits sentence-aligned alternatives and turns a common prefix into one spoken interaction", () => {
  const id = "en:lesson-02:session-55:i10";
  const texts = ["Excuse me. Are you busy?", "Excuse me. Are you ready?", "Excuse me. Are we busy?"];
  const options = texts.map((text, index) => ({ responseId: `${id}:r${index + 1}`, text }));
  const source = baseInteraction({
    interactionId: id,
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: options,
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: texts[0] },
      slowReferenceAudio: null,
      localizedMeaningChoices: options.map((option) => ({ responseId: option.responseId, targetText: option.text, meaningByLocale: null })),
      transcriptRevealPolicy: "after_first_attempt",
      choiceFeedback: [],
      isWordCard: false,
      wordCard: null,
    },
  });
  const projected = projectSinglePhraseRelease({ interactions: [source], answers: [answer(id, `${id}:r1`, texts[0])] });
  assert.equal(projected.interactions.length, 2);
  assert.equal(projected.interactions[0].family, "scripted_repeat_compare");
  assert.equal(projected.interactions[0].modePayload.targetPhrase, "Excuse me.");
  assert.equal(projected.interactions[1].family, "listen_choose");
  assert.deepEqual(projected.interactions[1].responseOptions.map((option) => option.text), ["Are you busy?", "Are you ready?", "Are we busy?"]);
  assert.equal(projected.answers[1].correctText, "Are you busy?");
});

test("localized listen choices stay aligned one sentence at a time", () => {
  const id = "en:lesson-03:session-29:i14";
  const choices = ["Вон письмо. Оно мокрое.", "Вот письмо. Оно мокрое.", "Вон письмо. Оно тяжёлое.", "Вон посылка. Она мокрая."];
  const options = choices.map((text, index) => ({ responseId: `${id}:r${index + 1}`, text }));
  const source = baseInteraction({
    interactionId: id,
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: options,
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "That is a letter. It is wet." },
      slowReferenceAudio: null,
      localizedMeaningChoices: options.map((option) => ({ responseId: option.responseId, targetText: option.text, meaningByLocale: { ru: option.text, uk: option.text } })),
      transcriptRevealPolicy: "after_first_attempt",
      choiceFeedback: [], isWordCard: false, wordCard: null,
    },
  });
  const projected = projectSinglePhraseRelease({ interactions: [source], answers: [answer(id, `${id}:r1`, choices[0])] });
  assert.deepEqual(projected.interactions[0].responseOptions.map((option) => option.text), ["Вон письмо.", "Вот письмо.", "Вон посылка."]);
  assert.deepEqual(projected.interactions[1].responseOptions.map((option) => option.text), ["Оно мокрое.", "Оно тяжёлое.", "Она мокрая."]);
  assert.equal(projected.interactions[1].modePayload.localizedMeaningChoices[0].meaningByLocale.ru, "Оно мокрое.");
});

test("ambiguous gap segmentation fails closed with the exact interaction id", () => {
  const id = "en:lesson-03:session-50:i17";
  const options = [{ responseId: `${id}:r1`, text: "A; black" }, { responseId: `${id}:r2`, text: "The; black" }];
  const source = baseInteraction({ interactionId: id, family: "context_gap_grammar", inputMode: "single_choice", responseOptions: options,
    modePayload: { family: "context_gap_grammar", localizedScene: { ru: "x", uk: "x" }, gappedTargetPhrase: "___ ___ sofa is here. ___ chairs are here.", gapOptions: options, testedDimension: "x", choiceFeedback: [] } });
  assert.throws(
    () => projectSinglePhraseRelease({ interactions: [source], answers: [answer(id, `${id}:r1`, options[0].text)] }),
    new RegExp(`single_phrase_projection_hold:${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:gap_answer_segments`),
  );
});

test("source guard blocks all multi-sentence assessed families", () => {
  const scripted = baseInteraction({ modePayload: { family: "scripted_repeat_compare", referenceAudio: { audioTargetId: "a", transcript: "One. Two." }, slowReferenceAudio: null, targetPhrase: "One. Two.", recordControlPolicy: "x", modelPlayback: "x", learnerPlayback: "x", honestOutcomeStates: ["UNCERTAIN"] } });
  assert.throws(() => assertSinglePhraseSource([scripted]), /single_phrase_source_hold/);
  assert.equal(singlePhraseReleaseIssues([scripted]).length, 1, "identical target/audio text is one learner-visible violation");
  const projected = projectSinglePhraseRelease({ interactions: [scripted], answers: [answer(scripted.interactionId)] });
  assert.deepEqual(singlePhraseReleaseIssues(projected.interactions), []);
});

test("non-word-card listening requires authored reference audio while visual word cards remain exempt", () => {
  const id = "en:lesson-01:session-01:i14";
  const missingAudio = baseInteraction({
    interactionId: id,
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [{ responseId: `${id}:r1`, text: "free" }],
    audioTargetIds: [],
    modePayload: {
      family: "listen_choose",
      referenceAudio: null,
      localizedMeaningChoices: [{ responseId: `${id}:r1`, targetText: "free", meaningByLocale: { ru: "свободен", uk: "вільний" } }],
      isWordCard: false,
    },
  });

  for (const referenceAudio of [null, undefined, { audioTargetId: `${id}:audio`, transcript: "   " }, { audioTargetId: `${id}:audio`, transcript: "\u200B" }]) {
    const interaction = structuredClone(missingAudio);
    if (referenceAudio === undefined) delete interaction.modePayload.referenceAudio;
    else interaction.modePayload.referenceAudio = referenceAudio;
    assert.throws(
      () => assertSinglePhraseSource([interaction], "en/l01/s01:ru"),
      /single_phrase_source_hold:en:lesson-01:session-01:i14:referenceAudio\.transcript:listen_choice_audio_transcript_missing/u,
    );
  }

  const withAudio = structuredClone(missingAudio);
  withAudio.modePayload.referenceAudio = { audioTargetId: `${id}:audio`, transcript: "free" };
  withAudio.audioTargetIds = [`${id}:audio`];
  assert.doesNotThrow(() => assertSinglePhraseSource([withAudio], "en/l01/s01:ru"));

  const wordCard = structuredClone(missingAudio);
  wordCard.modePayload.isWordCard = true;
  wordCard.modePayload.wordCard = { word: "free", definitionByLocale: { ru: "свободен", uk: "вільний" } };
  assert.doesNotThrow(() => assertSinglePhraseSource([wordCard], "en/l01/s01:ru"));

  const soundContrast = baseInteraction({
    interactionId: `${id}:sound`,
    family: "sound_contrast",
    inputMode: "single_choice",
    modePayload: {
      family: "sound_contrast",
      contrastA: "free",
      contrastB: "three",
      audioA: { audioTargetId: `${id}:sound:a`, transcript: "free" },
      audioB: { audioTargetId: `${id}:sound:b`, transcript: "three" },
    },
  });
  assert.doesNotThrow(() => assertSinglePhraseSource([soundContrast], "en/l01/s01:ru"));
});

test("projection reports a missing listening transcript without masking the source reason", () => {
  const id = "en:lesson-01:session-01:i14";
  const source = baseInteraction({
    interactionId: id,
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [{ responseId: `${id}:r1`, text: "free" }],
    audioTargetIds: [],
    modePayload: {
      family: "listen_choose",
      referenceAudio: null,
      localizedMeaningChoices: [{ responseId: `${id}:r1`, targetText: "free", meaningByLocale: { ru: "свободен", uk: "вільний" } }],
      isWordCard: false,
    },
  });

  assert.throws(
    () => projectSinglePhraseRelease({ interactions: [source], answers: [answer(id, `${id}:r1`, "free")] }),
    /single_phrase_projection_hold:en:lesson-01:session-01:i14:referenceAudio\.transcript:listen_choice_audio_transcript_missing/u,
  );
});

test("projection keeps the legacy fallback reason for a remaining multi-sentence issue", () => {
  const id = "en:lesson-01:session-01:i14";
  const source = baseInteraction({
    interactionId: id,
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [{ responseId: `${id}:r1`, text: "One. Two." }],
    audioTargetIds: [`${id}:audio`],
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "free" },
      localizedMeaningChoices: [{ responseId: `${id}:r1`, targetText: "free", meaningByLocale: { ru: "свободен", uk: "вільний" } }],
      isWordCard: true,
      wordCard: { word: "free", definitionByLocale: { ru: "«свободен».", uk: "«вільний»." } },
    },
  });

  assert.throws(
    () => projectSinglePhraseRelease({ interactions: [source], answers: [answer(id, null, "free")] }),
    /single_phrase_projection_hold:en:lesson-01:session-01:i14:responseOptions\[0\]:remaining_multi_sentence/u,
  );
});

test("source guard rejects comma-separated clauses in every assessed target or heard-audio field", () => {
  const id = "en:lesson-03:session-50:i18";
  const clauses = "This is a sofa, That is a chair";
  const targetCases = [
    baseInteraction({ interactionId: `${id}:scripted`, modePayload: { targetPhrase: clauses } }),
    baseInteraction({ interactionId: `${id}:builder`, family: "phrase_builder", inputMode: "ordered_tokens", modePayload: { targetPhrase: clauses } }),
    baseInteraction({ interactionId: `${id}:dictation`, family: "listen_build_dictation", inputMode: "ordered_tokens", modePayload: { hiddenTargetPhrase: clauses } }),
    baseInteraction({ interactionId: `${id}:gap`, family: "context_gap_grammar", inputMode: "single_choice", modePayload: { gappedTargetPhrase: clauses } }),
    baseInteraction({ interactionId: `${id}:choose`, family: "listen_choose", inputMode: "single_choice", modePayload: { referenceAudio: { transcript: clauses } } }),
  ];
  const heardAudio = baseInteraction({
    interactionId: `${id}:slow`,
    modePayload: { targetPhrase: "This is a sofa.", slowReferenceAudio: { transcript: "Right. Wrong." } },
  });
  const issues = singlePhraseReleaseIssues([...targetCases, heardAudio]);
  for (const interaction of targetCases) {
    assert.ok(issues.some((issue) => issue.interactionId === interaction.interactionId), interaction.interactionId);
  }
  assert.ok(issues.some((issue) => issue.interactionId === heardAudio.interactionId && issue.field === "slowReferenceAudio.transcript" && issue.sentenceCount === 2));

  const allowed = baseInteraction({
    interactionId: `${id}:tag`,
    modePayload: { targetPhrase: "This is a sofa, right?", slowReferenceAudio: { transcript: "This is a sofa, right?" } },
  });
  assert.deepEqual(singlePhraseReleaseIssues([allowed]), []);
});

test("single-phrase registry covers every learner-facing atomic string and fails closed for unknown payload strings", () => {
  const id = "en:lesson-03:session-55:i99";
  const packet = "This is one. That is two.";
  let packetIndex = 0;
  const nextPacket = () => `This is item ${++packetIndex}. That is item ${packetIndex}.`;
  const interactions = [
    baseInteraction({
      interactionId: `${id}:builder`, family: "phrase_builder", inputMode: "ordered_tokens",
      modePayload: { targetPhrase: "This is one.", orderedTokens: [nextPacket()], authoredDistractorTokens: [nextPacket()], distractorTokens: [nextPacket()], tiles: [nextPacket()] },
    }),
    baseInteraction({
      interactionId: `${id}:dictation`, family: "listen_build_dictation", inputMode: "ordered_tokens",
      modePayload: { hiddenTargetPhrase: "This is one.", orderedTokens: [nextPacket()], authoredDistractorTokens: [nextPacket()], distractorTokens: [nextPacket()], referenceAudio: { transcript: nextPacket() }, slowReferenceAudio: { transcript: nextPacket() } },
    }),
    baseInteraction({
      interactionId: `${id}:choice`, family: "listen_choose", inputMode: "single_choice",
      modePayload: {
        referenceAudio: { transcript: nextPacket() }, slowReferenceAudio: { transcript: nextPacket() },
        localizedMeaningChoices: [{ targetText: nextPacket(), meaningByLocale: { ru: nextPacket(), uk: nextPacket() } }],
        wordCard: { word: nextPacket(), definitionByLocale: { ru: "определение", uk: "визначення" } },
      },
    }),
    baseInteraction({
      interactionId: `${id}:gap`, family: "context_gap_grammar", inputMode: "single_choice",
      modePayload: { gappedTargetPhrase: "___ one.", gapOptions: [{ text: nextPacket() }] },
    }),
    baseInteraction({
      interactionId: `${id}:contrast`, family: "sound_contrast", inputMode: "single_choice",
      modePayload: { contrastA: nextPacket(), contrastB: nextPacket(), audioA: { transcript: nextPacket() }, audioB: { transcript: nextPacket() } },
    }),
    baseInteraction({
      interactionId: `${id}:speed`, family: "speed_match", inputMode: "pair_grid", responseOptions: [],
      modePayload: {
        pairGrid: [{ pairId: "p1", target: nextPacket(), meaningByLocale: { ru: nextPacket(), uk: nextPacket() } }],
        leftColumn: ["other"], rightColumn: ["другое"],
      },
    }),
    baseInteraction({
      interactionId: `${id}:unknown-key`,
      modePayload: { targetPhrase: "This is one.", unexpectedLearnerText: packet },
    }),
    baseInteraction({ interactionId: `${id}:unknown-family`, family: "unknown_family", inputMode: "single_choice", modePayload: {} }),
  ];
  const issues = singlePhraseReleaseIssues(interactions);
  for (const field of [
    "orderedTokens[0]", "authoredDistractorTokens[0]", "distractorTokens[0]", "tiles[0]",
    "referenceAudio.transcript", "slowReferenceAudio.transcript", "localizedMeaningChoices[0].targetText",
    "localizedMeaningChoices[0].meaningByLocale.ru", "localizedMeaningChoices[0].meaningByLocale.uk", "wordCard.word",
    "gapOptions[0].text", "contrastA", "contrastB", "audioA.transcript", "audioB.transcript",
    "pairGrid[0].target", "pairGrid[0].meaningByLocale.ru", "pairGrid[0].meaningByLocale.uk",
  ]) assert.ok(issues.some((issue) => issue.field === field), field);
  assert.ok(issues.some((issue) => issue.field === "leftColumn" && issue.reason === "pair_grid_column_mismatch"));
  assert.ok(issues.some((issue) => issue.field === "rightColumn" && issue.reason === "pair_grid_column_mismatch"));
  assert.ok(issues.some((issue) => issue.field === "modePayload.unexpectedLearnerText" && issue.reason === "unknown_learner_facing_payload"));
  assert.ok(issues.some((issue) => issue.reason === "unknown_family"));
});

test("single-phrase registry fails closed for unknown nested payload schemas and string leaves", () => {
  const id = "en:lesson-03:session-55:i101";
  const interaction = baseInteraction({
    interactionId: id,
    modePayload: {
      targetPhrase: "This is one.",
      unexpectedObject: { text: "One. Two." },
      unexpectedObjectArray: [{ text: "One. Two." }],
      unexpectedNestedScalar: { metadata: { caption: "One. Two." } },
    },
  });

  const issues = singlePhraseReleaseIssues([interaction]);
  for (const field of [
    "modePayload.unexpectedObject.text",
    "modePayload.unexpectedObjectArray[0].text",
    "modePayload.unexpectedNestedScalar.metadata.caption",
  ]) {
    assert.ok(issues.some((issue) => issue.field === field && issue.reason === "unknown_learner_facing_payload"), field);
  }
  assert.ok(issues.some((issue) => issue.field === "modePayload.unexpectedObject"), "unknown object schema itself must be blocked");
});

test("single-phrase registry fails closed for every unknown top-level interaction value", () => {
  const id = "en:lesson-03:session-55:i102";
  const interaction = baseInteraction({
    interactionId: id,
    modePayload: { targetPhrase: "This is one." },
    unexpectedLearnerText: "One. Two.",
    unexpectedObject: { text: "One. Two." },
    unexpectedArray: [{ text: "One. Two." }],
    unexpectedNested: { metadata: { caption: "One. Two." } },
  });

  const issues = singlePhraseReleaseIssues([interaction]);
  for (const field of [
    "interaction.unexpectedLearnerText",
    "interaction.unexpectedObject",
    "interaction.unexpectedArray",
    "interaction.unexpectedNested",
    "interaction.unexpectedObject.text",
    "interaction.unexpectedArray[0].text",
    "interaction.unexpectedNested.metadata.caption",
  ]) {
    assert.ok(issues.some((issue) => issue.field === field && issue.reason === "unknown_interaction_top_level_field"), field);
  }
});

test("top-level interaction registry exactly classifies the release corpus schema", () => {
  const releaseRoot = path.resolve("content/learning-v2-course/release");
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/^learner(?:\.[a-z]{2})?\.json$/u.test(entry.name)) files.push(file);
    }
  };
  visit(releaseRoot);

  const corpusKeys = new Set();
  for (const file of files) {
    const learner = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const interaction of learner.interactions ?? []) {
      Object.keys(interaction).forEach((key) => corpusKeys.add(key));
      assert.equal(
        singlePhraseReleaseIssues([interaction], path.relative(releaseRoot, file))
          .some((issue) => issue.reason === "unknown_interaction_top_level_field"),
        false,
        file,
      );
    }
  }
  assert.deepEqual([...corpusKeys].sort(), [...KNOWN_INTERACTION_TOP_LEVEL_FIELDS].sort());
});

test("single-phrase registry keeps the classified common word card schema out of unknown payload holds", () => {
  const interaction = baseInteraction({
    modePayload: {
      targetPhrase: "This is one.",
      wordCard: { word: "one", definitionByLocale: { ru: "«один».", uk: "«один»." } },
    },
  });
  assert.equal(singlePhraseReleaseIssues([interaction]).some((issue) => issue.reason === "unknown_learner_facing_payload"), false);
});

test("scripted-repeat reveal policy is closed, versioned structural metadata", () => {
  const policy = {
    schemaVersion: "learning-v2-scripted-repeat-reveal-policy.v1",
    revealAfter: "first_submitted_attempt",
    answerExposedBeforeAttempt: false,
    targetPhraseVisibleBeforeAttempt: false,
    referenceAudioAvailableBeforeAttempt: false,
    modelPlaybackAvailableBeforeAttempt: false,
  };
  const valid = baseInteraction({
    interactionId: "en:lesson-03:session-55:i106",
    modePayload: { targetPhrase: "This is one.", scriptedRepeatRevealPolicy: policy },
  });
  assert.deepEqual(singlePhraseReleaseIssues([valid]), []);

  for (const malformed of [
    { ...policy, answerExposedBeforeAttempt: true },
    { ...policy, schemaVersion: "legacy" },
    { ...policy, unexpected: false },
  ]) {
    const interaction = {
      ...valid,
      modePayload: { ...valid.modePayload, scriptedRepeatRevealPolicy: malformed },
    };
    assert.ok(singlePhraseReleaseIssues([interaction]).some((issue) =>
      issue.field.startsWith("modePayload.scriptedRepeatRevealPolicy")
      && issue.reason === "invalid_nested_learner_schema"));
  }
});

test("builder completion feedback is a closed localized learner field", () => {
  const id = "en:lesson-03:session-55:i105";
  const valid = baseInteraction({
    interactionId: id,
    family: "phrase_builder",
    inputMode: "ordered_tokens",
    modePayload: {
      targetPhrase: "This is one.",
      orderedTokens: ["This", "is", "one"],
      completionFeedbackByLocale: { ru: "Верно: это одна вещь.", uk: "Правильно: це одна річ." },
    },
  });
  assert.equal(singlePhraseReleaseIssues([valid]).some((issue) => issue.field === "modePayload.completionFeedbackByLocale"), false);

  const malformed = {
    ...valid,
    modePayload: { ...valid.modePayload, completionFeedbackByLocale: { ru: { text: "Верно." } } },
  };
  assert.ok(singlePhraseReleaseIssues([malformed]).some((issue) =>
    issue.field === "modePayload.completionFeedbackByLocale.ru" && issue.reason === "unknown_nested_learner_schema"));
});

test("known learner containers fail closed on unknown nested audio or selectable fields", () => {
  const id = "en:lesson-03:session-55:i103";
  const interactions = [
    baseInteraction({
      interactionId: `${id}:reference`,
      modePayload: {
        targetPhrase: "This is one.",
        referenceAudio: { transcript: "This is one.", alternateTranscript: "One. Two." },
      },
    }),
    baseInteraction({
      interactionId: `${id}:word-card`, family: "listen_choose", inputMode: "single_choice",
      modePayload: {
        referenceAudio: { transcript: "one" }, isWordCard: true,
        wordCard: { word: "one", definitionByLocale: { ru: "один", uk: "один" }, audio: { transcript: "One. Two." } },
      },
    }),
    baseInteraction({
      interactionId: `${id}:option`,
      responseOptions: [{ responseId: "r1", text: "one", audio: { transcript: "One. Two." } }],
      modePayload: { targetPhrase: "This is one." },
    }),
    baseInteraction({
      interactionId: `${id}:meaning`, family: "listen_choose", inputMode: "single_choice",
      modePayload: {
        referenceAudio: { transcript: "one" }, isWordCard: false,
        localizedMeaningChoices: [{ responseId: "r1", targetText: "one", meaningByLocale: { ru: "один", uk: "один" }, audio: { transcript: "One. Two." } }],
      },
    }),
  ];

  const issues = singlePhraseReleaseIssues(interactions);
  for (const field of [
    "modePayload.referenceAudio.alternateTranscript",
    "modePayload.wordCard.audio",
    "interaction.responseOptions[0].audio",
    "modePayload.localizedMeaningChoices[0].audio",
  ]) {
    assert.ok(issues.some((issue) => issue.field === field && issue.reason === "unknown_nested_learner_schema"), field);
  }
});

test("known learner container leaves fail closed on object values", () => {
  const id = "en:lesson-03:session-55:i104";
  const interactions = [
    baseInteraction({
      interactionId: `${id}:audio`,
      modePayload: { targetPhrase: "This is one.", referenceAudio: { transcript: { hidden: "One. Two." } } },
    }),
    baseInteraction({
      interactionId: `${id}:option`,
      responseOptions: [{ responseId: "r1", text: { hidden: "One. Two." } }],
      modePayload: { targetPhrase: "This is one." },
    }),
    baseInteraction({
      interactionId: `${id}:meaning`, family: "listen_choose", inputMode: "single_choice",
      modePayload: {
        referenceAudio: { transcript: "one" }, isWordCard: false,
        localizedMeaningChoices: [{ responseId: "r1", targetText: { hidden: "One. Two." }, meaningByLocale: { ru: "один", uk: "один" } }],
      },
    }),
    baseInteraction({
      interactionId: `${id}:tokens`, family: "phrase_builder", inputMode: "ordered_tokens",
      modePayload: { targetPhrase: "This is one.", orderedTokens: [{ hidden: "One. Two." }], authoredDistractorTokens: [] },
    }),
  ];
  const issues = singlePhraseReleaseIssues(interactions);
  for (const field of [
    "modePayload.referenceAudio.transcript",
    "interaction.responseOptions[0].text",
    "modePayload.localizedMeaningChoices[0].targetText",
    "modePayload.orderedTokens[0]",
  ]) assert.ok(issues.some((issue) => issue.field === field && issue.reason === "invalid_nested_learner_schema"), field);
});

test("comma clause detection rejects three clauses, noun subjects, and imperatives but allows compact adjective lists and tag questions", () => {
  const id = "en:lesson-03:session-55:i100";
  const forbidden = [
    "This is one, That is two, These are three",
    "The dog is wet, The cat is dry",
    "Open the door, Close the window",
  ];
  for (const text of forbidden) {
    const interaction = baseInteraction({ interactionId: id, modePayload: { targetPhrase: text } });
    assert.equal(singlePhraseReleaseIssues([interaction])[0]?.reason, "comma_clause_packet", text);
  }
  for (const text of ["This is old, small, and blue.", "This is a sofa, right?"]) {
    const interaction = baseInteraction({ interactionId: id, modePayload: { targetPhrase: text } });
    assert.deepEqual(singlePhraseReleaseIssues([interaction]), [], text);
  }
});

test("speed-match columns must mirror either pair-grid locale projection", () => {
  const interaction = baseInteraction({
    interactionId: "en:lesson-03:session-55:i101", family: "speed_match", inputMode: "pair_grid", responseOptions: [],
    modePayload: {
      pairGrid: [{ pairId: "p1", target: "hook", meaningByLocale: { ru: "крючок", uk: "гачок" } }],
      leftColumn: ["hook"], rightColumn: ["крючок"],
    },
  });
  assert.deepEqual(singlePhraseReleaseIssues([interaction], "en:lesson-03:session-55:uk"), []);
  const ukrainianColumn = structuredClone(interaction);
  ukrainianColumn.modePayload.rightColumn = ["гачок"];
  assert.deepEqual(singlePhraseReleaseIssues([ukrainianColumn], "en:lesson-03:session-55:uk"), []);
});

test("source guard blocks packet delimiters in assessed target and audio strings", () => {
  const id = "en:lesson-03:session-50:i07";
  const packet = baseInteraction({
    interactionId: id,
    modePayload: {
      family: "scripted_repeat_compare",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "This is a sofa; That is a chair" },
      slowReferenceAudio: null,
      targetPhrase: "This is a sofa; That is a chair",
      recordControlPolicy: "hold_press_release_with_accessible_toggle",
      modelPlayback: "reference_and_slow",
      learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["UNCERTAIN"],
    },
  });
  assert.throws(() => assertSinglePhraseSource([packet]), /single_phrase_source_hold:.*delimiter_clause_packet/u);
  assert.equal(singlePhraseReleaseIssues([packet])[0].reason, "delimiter_clause_packet");

  const assessedList = {
    ...packet,
    modePayload: {
      ...packet.modePayload,
      targetPhrase: "black; white",
      referenceAudio: { ...packet.modePayload.referenceAudio, transcript: "black; white" },
    },
  };
  assert.equal(singlePhraseReleaseIssues([assessedList])[0]?.reason, "delimiter_clause_packet");
});

test("source guard blocks imperative packets without a finite-verb allowlist", () => {
  const id = "en:lesson-03:session-51:i07";
  for (const text of [
    "Come here; Sit down",
    "Come here； Sit down",
    "Come here| Sit down",
    "Smile now; Laugh loudly",
    "Sleep here; Wake up",
    "Dance now| Sing now",
  ]) {
    const packet = baseInteraction({
      interactionId: id,
      modePayload: {
        family: "scripted_repeat_compare",
        referenceAudio: { audioTargetId: `${id}:audio`, transcript: text },
        slowReferenceAudio: null,
        targetPhrase: text,
        recordControlPolicy: "hold_press_release_with_accessible_toggle",
        modelPlayback: "reference_and_slow",
        learnerPlayback: "available_after_capture",
        honestOutcomeStates: ["UNCERTAIN"],
      },
    });
    assert.equal(singlePhraseReleaseIssues([packet])[0]?.reason, "delimiter_clause_packet", text);
    assert.throws(() => assertSinglePhraseSource([packet]), /delimiter_clause_packet/u, text);
  }
});

test("delimiter lists are forbidden in learner-visible choices and localized meanings", () => {
  const id = "en:lesson-03:session-51:i08";
  const choiceList = baseInteraction({
    interactionId: id,
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [
      { responseId: `${id}:r1`, text: "black; white" },
      { responseId: `${id}:r2`, text: "grey; blue" },
    ],
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "black" },
      slowReferenceAudio: null,
      localizedMeaningChoices: [
        { responseId: `${id}:r1`, targetText: "black", meaningByLocale: { ru: "чёрный; белый", uk: "чорний; білий" } },
        { responseId: `${id}:r2`, targetText: "grey", meaningByLocale: { ru: "серый; синий", uk: "сірий; синій" } },
      ],
      transcriptRevealPolicy: "after_first_attempt",
      choiceFeedback: [],
      isWordCard: false,
      wordCard: null,
    },
  });
  const issues = singlePhraseReleaseIssues([choiceList]);
  assert.ok(issues.some((issue) => issue.field === "responseOptions[0]" && issue.reason === "delimiter_clause_packet"));
  assert.ok(issues.some((issue) => issue.field === "localizedMeaningChoices[0].meaningByLocale.ru" && issue.reason === "delimiter_clause_packet"));
});

test("speed match rejects sentence and compact packet targets without rejecting single pairs", () => {
  const interaction = baseInteraction({
    interactionId: "en:lesson-03:session-50:i06",
    family: "speed_match",
    inputMode: "pair_grid",
    responseOptions: [],
    modePayload: {
      family: "speed_match",
      pairGrid: [
        { pairId: "p1", target: "One. Two.", meaningByLocale: { ru: "Один", uk: "Один" } },
        { pairId: "p2", target: "three", meaningByLocale: { ru: "три; третье", uk: "три" } },
        { pairId: "p3", target: "block, blank, back", meaningByLocale: { ru: "блок", uk: "блок" } },
        { pairId: "p4", target: "block / blank / back", meaningByLocale: { ru: "пусто", uk: "порожньо" } },
        { pairId: "p5", target: "block · blank · back", meaningByLocale: { ru: "назад", uk: "назад" } },
        { pairId: "p6", target: "key", meaningByLocale: { ru: "ключ", uk: "ключ" } },
      ],
    },
  });
  const issues = singlePhraseReleaseIssues([interaction]);
  assert.ok(issues.some((issue) => issue.field === "pairGrid[0].target" && issue.sentenceCount === 2));
  assert.ok(issues.some((issue) => issue.field === "pairGrid[1].meaningByLocale.ru" && issue.reason === "delimiter_clause_packet"));
  for (const index of [2, 3, 4]) {
    assert.ok(issues.some((issue) => issue.field === `pairGrid[${index}].target` && issue.reason === "visible_choice_packet"));
  }
  assert.ok(!issues.some((issue) => issue.field === "pairGrid[5].target"));
  assert.ok(!issues.some((issue) => issue.field === "pairGrid[5].meaningByLocale.ru"));
});

test("source guard rejects two-part speed-match packets and multi-phrase sound-contrast audio", () => {
  const speedMatch = baseInteraction({
    interactionId: "en:lesson-03:session-50:i07",
    family: "speed_match",
    inputMode: "pair_grid",
    responseOptions: [],
    modePayload: {
      family: "speed_match",
      pairGrid: [
        { pairId: "p1", target: "block, blank", meaningByLocale: { ru: "блок", uk: "блок" } },
        { pairId: "p2", target: "wide / wipe", meaningByLocale: { ru: "широкий", uk: "широкий" } },
        { pairId: "p3", target: "wife · wipe", meaningByLocale: { ru: "жена", uk: "дружина" } },
        { pairId: "p4", target: "This is a sofa, That is a chair", meaningByLocale: { ru: "диван", uk: "диван" } },
        { pairId: "p5", target: "This is a sofa, right?", meaningByLocale: { ru: "диван", uk: "диван" } },
        { pairId: "p6", target: "behind", meaningByLocale: { ru: "за, позади", uk: "позаду" } },
      ],
    },
  });
  const soundContrast = baseInteraction({
    interactionId: "en:lesson-03:session-50:i08",
    family: "sound_contrast",
    inputMode: "single_choice",
    responseOptions: [{ responseId: "r1", text: "right" }, { responseId: "r2", text: "wrong" }],
    modePayload: {
      family: "sound_contrast",
      contrastA: "right",
      contrastB: "wrong",
      audioA: { audioTargetId: "audioA", transcript: "Right. Wrong." },
      audioB: { audioTargetId: "audioB", transcript: "wrong" },
    },
  });

  const issues = singlePhraseReleaseIssues([speedMatch, soundContrast]);
  for (const index of [0, 1, 2]) {
    assert.ok(issues.some((issue) => issue.field === `pairGrid[${index}].target` && issue.reason === "visible_choice_packet"));
  }
  assert.ok(issues.some((issue) => issue.field === "pairGrid[3].target" && issue.reason === "comma_clause_packet"));
  assert.ok(!issues.some((issue) => issue.field === "pairGrid[4].target"));
  assert.ok(!issues.some((issue) => issue.field === "pairGrid[5].meaningByLocale.ru"));
  assert.ok(issues.some((issue) => issue.field === "audioA.transcript" && issue.sentenceCount === 2));
});

test("projection repairs legacy dictation audio labels but fails closed on a different spoken phrase", () => {
  const id = "en:lesson-03:session-42:i14";
  const source = baseInteraction({
    interactionId: id,
    family: "listen_build_dictation",
    inputMode: "ordered_tokens",
    modePayload: {
      family: "listen_build_dictation",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "Аудио" },
      slowReferenceAudio: null,
      hiddenTargetPhrase: "The lock is broken.",
      orderedTokens: ["The", "lock", "is", "broken"],
      authoredDistractorTokens: ["A", "are"],
      slotFeedback: [],
    },
  });
  assert.equal(dictationAudioTargetIssues([source]).length, 1);
  const projected = projectSinglePhraseRelease({ interactions: [source], answers: [answer(id, null, "The lock is broken.")] });
  assert.equal(projected.interactions[0].modePayload.referenceAudio.transcript, "The lock is broken.");
  assert.deepEqual(dictationAudioTargetIssues(projected.interactions), []);

  const corrupt = structuredClone(source);
  corrupt.modePayload.referenceAudio.transcript = "The door is open.";
  assert.throws(
    () => projectSinglePhraseRelease({ interactions: [corrupt], answers: [answer(id)] }),
    /single_phrase_projection_hold:en:lesson-03:session-42:i14:dictation_audio_target_alignment/u,
  );
});

test("English assessed targets and audio reject localized control words", () => {
  const id = "en:lesson-03:session-43:i12";
  const source = baseInteraction({
    interactionId: id,
    family: "scripted_repeat_compare",
    inputMode: "tap_record_compare",
    modePayload: {
      family: "scripted_repeat_compare",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "ничего newspapers are fine." },
      slowReferenceAudio: null,
      targetPhrase: "ничего newspapers are fine.",
      recordControlPolicy: "hold_press_release_with_accessible_toggle",
      modelPlayback: "reference_and_slow",
      learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["UNCERTAIN"],
    },
  });

  const issues = singlePhraseReleaseIssues([source]);
  assert.ok(issues.some((issue) => issue.field === "targetPhrase" && issue.reason === "english_target_contains_cyrillic"));
  assert.ok(issues.some((issue) => issue.field === "referenceAudio.transcript" && issue.reason === "english_target_contains_cyrillic"));
});

test("zero-article choices reject raw localized control words", () => {
  const id = "en:lesson-03:session-43:i15";
  const gap = baseInteraction({
    interactionId: id,
    family: "context_gap_grammar",
    inputMode: "single_choice",
    responseOptions: [
      { responseId: `${id}:r1`, text: "ничего" },
      { responseId: `${id}:r2`, text: "The" },
    ],
    modePayload: {
      family: "context_gap_grammar",
      localizedScene: { ru: "Вставьте начало", uk: "Вставте початок" },
      gappedTargetPhrase: "___ newspapers are fine.",
      gapOptions: [
        { responseId: `${id}:r1`, text: "ничего" },
        { responseId: `${id}:r2`, text: "The" },
      ],
      testedDimension: "article",
      choiceFeedback: [],
    },
  });

  const issues = singlePhraseReleaseIssues([gap]);
  assert.ok(issues.some((issue) => issue.field === "responseOptions[0]" && issue.reason === "localized_zero_article_control"));
});

test("projection derives concrete correctText for word-card listening and speed-match contracts", () => {
  const wordId = "en:lesson-01:session-01:i01";
  const word = baseInteraction({
    interactionId: wordId,
    family: "listen_choose",
    inputMode: "single_choice",
    responseOptions: [],
    modePayload: {
      family: "listen_choose",
      referenceAudio: { audioTargetId: `${wordId}:audio`, transcript: "here" },
      slowReferenceAudio: null,
      localizedMeaningChoices: [{ responseId: `${wordId}:r1`, targetText: "here", meaningByLocale: { ru: "здесь", uk: "тут" } }],
      transcriptRevealPolicy: "after_first_attempt",
      choiceFeedback: [],
      isWordCard: true,
      wordCard: { word: "here", definitionByLocale: { ru: "здесь", uk: "тут" } },
    },
  });
  const speedId = "en:lesson-01:session-01:i08";
  const speed = baseInteraction({
    interactionId: speedId,
    family: "speed_match",
    inputMode: "pair_grid",
    responseOptions: [],
    audioTargetIds: [],
    modePayload: {
      family: "speed_match",
      pairGrid: [
        { pairId: `${speedId}:p1`, target: "here", meaningByLocale: { ru: "здесь", uk: "тут" } },
        { pairId: `${speedId}:p2`, target: "ready", meaningByLocale: { ru: "готов", uk: "готовий" } },
      ],
      leftColumn: ["here", "ready"],
      rightColumn: ["здесь", "готов"],
      pairingKey: "pair_id",
      timerPolicy: { enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true },
      finishStats: ["speed", "accuracy"],
    },
  });
  const projected = projectSinglePhraseRelease({
    interactions: [word, speed],
    answers: [answer(wordId), answer(speedId)],
  });
  assert.equal(projected.answers[0].correctText, "here");
  assert.equal(projected.answers[1].correctText, `${speedId}:p1=here\n${speedId}:p2=ready`);
  assert.deepEqual(answerContractIssues(projected.interactions, projected.answers), []);
});

test("preservation ledger maps every source segment to exact projected content and detects tampering", () => {
  const id = "en:lesson-03:session-50:i17";
  const source = baseInteraction({
    interactionId: id,
    modePayload: {
      family: "scripted_repeat_compare",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: "A black sofa is here. White chairs are here." },
      slowReferenceAudio: null,
      targetPhrase: "A black sofa is here. White chairs are here.",
      recordControlPolicy: "hold_press_release_with_accessible_toggle",
      modelPlayback: "reference_and_slow",
      learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["UNCERTAIN"],
    },
  });
  const projected = projectSinglePhraseRelease({ interactions: [source], answers: [answer(id)] });
  assert.equal(projected.preservationLedger.length, 2);
  assert.deepEqual(projected.preservationLedger.map((row) => ({
    oldInteractionId: row.oldInteractionId,
    segmentIndex: row.segmentIndex,
    sourceSegment: row.sourceSegment,
    newInteractionId: row.newInteractionId,
    correctText: row.correctText,
    audioTranscript: row.audioTranscript,
  })), [
    { oldInteractionId: id, segmentIndex: 1, sourceSegment: "A black sofa is here.", newInteractionId: `${id}:s01`, correctText: "A black sofa is here.", audioTranscript: "A black sofa is here." },
    { oldInteractionId: id, segmentIndex: 2, sourceSegment: "White chairs are here.", newInteractionId: `${id}:s02`, correctText: "White chairs are here.", audioTranscript: "White chairs are here." },
  ]);
  assert.deepEqual(preservationLedgerIssues({
    sourceInteractions: [source],
    projectedInteractions: projected.interactions,
    projectedAnswers: projected.answers,
    ledger: projected.preservationLedger,
  }), []);
  const tampered = structuredClone(projected.preservationLedger);
  tampered[1].correctText = "A substituted sentence.";
  assert.equal(preservationLedgerIssues({
    sourceInteractions: [source],
    projectedInteractions: projected.interactions,
    projectedAnswers: projected.answers,
    ledger: tampered,
  }).length, 1);
});

test("preservation ledger accepts only an explicit exact post-migration editorial amendment", () => {
  const id = "en:lesson-03:session-46:i08";
  const source = baseInteraction({
    interactionId: id,
    modePayload: {
      family: "phrase_builder",
      targetPhrase: "The roof is here.",
      orderedTokens: ["The", "roof", "is", "here"],
      distractorTokens: [],
    },
  });
  const projected = structuredClone(source);
  projected.modePayload.targetPhrase = "The roof is old.";
  projected.modePayload.orderedTokens = ["The", "roof", "is", "old"];
  const projectedAnswers = [{ interactionId: id, correctText: "The roof is old.", correctResponseId: null }];
  const ledger = [{
    oldInteractionId: id,
    sourceFamily: "scripted_repeat_compare",
    segmentIndex: 1,
    sourceSegment: "The roof is here.",
    newInteractionId: id,
    newTargetSegment: "The roof is old.",
    correctText: "The roof is old.",
    audioTranscript: null,
  }];
  const amendment = {
    oldInteractionId: id,
    segmentIndex: 1,
    from: "The roof is here.",
    to: "The roof is old.",
    reason: "owner-authorized natural-language correction after migration",
  };
  assert.deepEqual(preservationLedgerIssues({
    sourceInteractions: [source],
    projectedInteractions: [projected],
    projectedAnswers,
    ledger,
    amendments: [amendment],
  }), []);
  assert.equal(preservationLedgerIssues({
    sourceInteractions: [source],
    projectedInteractions: [projected],
    projectedAnswers,
    ledger,
    amendments: [{ ...amendment, to: "A different sentence." }],
  })[0]?.reason, "source_segment_substituted");
  assert.equal(preservationLedgerIssues({
    sourceInteractions: [source],
    projectedInteractions: [projected],
    projectedAnswers,
    ledger,
    amendments: [amendment, { ...amendment, to: "A different sentence." }],
  })[0]?.reason, "amendment_duplicate");
  assert.equal(preservationLedgerIssues({
    sourceInteractions: [source],
    projectedInteractions: [source],
    projectedAnswers: [{ interactionId: id, correctText: "The roof is here.", correctResponseId: null }],
    ledger: [{ ...ledger[0], newTargetSegment: "The roof is here.", correctText: "The roof is here." }],
    amendments: [amendment],
  })[0]?.reason, "amendment_orphan");
});

test("preservation ledger permits a documented retirement only with its exact replacement", () => {
  const id = "en:lesson-03:session-42:i17";
  const source = baseInteraction({ interactionId: id, modePayload: { family: "scripted_repeat_compare", targetPhrase: "The handle is stuck. The lock is broken." } });
  const ledger = [
    { oldInteractionId: id, sourceFamily: "scripted_repeat_compare", segmentIndex: 1, sourceSegment: "The handle is stuck.", newInteractionId: `${id}:s01`, newTargetSegment: "The handle is stuck.", correctText: "The handle is stuck.", audioTranscript: "The handle is stuck." },
    { oldInteractionId: id, sourceFamily: "scripted_repeat_compare", segmentIndex: 2, sourceSegment: "The lock is broken.", newInteractionId: `${id}:s02`, newTargetSegment: "The lock is broken.", correctText: "The lock is broken.", audioTranscript: "The lock is broken." },
  ];
  const replacement = baseInteraction({ interactionId: id, family: "context_gap_grammar", inputMode: "single_choice", modePayload: { family: "context_gap_grammar", gappedTargetPhrase: "___ handle is broken." } });
  const amendments = [
    { action: "retire", oldInteractionId: id, segmentIndex: 1, from: "The handle is stuck.", replacementInteractionId: id, reason: "The old revealed answer is retired in favor of one documented independent check." },
    { action: "retire", oldInteractionId: id, segmentIndex: 2, from: "The lock is broken.", replacementInteractionId: id, reason: "The old revealed answer is retired in favor of one documented independent check." },
    { action: "replacement", newInteractionId: id, retires: [{ oldInteractionId: id, segmentIndex: 1 }, { oldInteractionId: id, segmentIndex: 2 }], reason: "One context gap replaces the retired answer-revealing chain." },
  ];
  const answers = [{ interactionId: id, correctText: "the", correctResponseId: `${id}:r1` }];
  assert.deepEqual(preservationLedgerIssues({ sourceInteractions: [source], projectedInteractions: [replacement], projectedAnswers: answers, ledger, amendments }), []);
  assert.equal(preservationLedgerIssues({ sourceInteractions: [source], projectedInteractions: [replacement], projectedAnswers: answers, ledger, amendments: amendments.slice(0, 1) })[0]?.reason, "projected_interaction_missing");
});

test("preservation ledger permits only an explicitly documented additive exercise", () => {
  const id = "en:lesson-01:session-01:i07";
  const source = baseInteraction({ interactionId: id, family: "phrase_builder", inputMode: "ordered_tokens", modePayload: { family: "phrase_builder", targetPhrase: "I am happy.", orderedTokens: ["I", "am", "happy"], authoredDistractorTokens: [] } });
  const additionId = `${id}:a01`;
  const addition = baseInteraction({ interactionId: additionId, family: "phrase_builder", inputMode: "ordered_tokens", modePayload: { family: "phrase_builder", targetPhrase: "I am happy.", orderedTokens: ["I", "am", "happy"], authoredDistractorTokens: [] } });
  const answers = [
    { interactionId: id, correctText: "happy", correctResponseId: null },
    { interactionId: additionId, correctText: "happy", correctResponseId: `${additionId}:r1` },
  ];
  const ledger = buildPreservationLedger([source], [source, addition], answers).rows;
  const amendment = { action: "addition", newInteractionId: additionId, reason: "A separate visible listening check follows the teaching card." };
  assert.deepEqual(preservationLedgerIssues({ sourceInteractions: [source], projectedInteractions: [source, addition], projectedAnswers: answers, ledger, amendments: [amendment] }), []);
  assert.equal(preservationLedgerIssues({ sourceInteractions: [source], projectedInteractions: [source, addition], projectedAnswers: answers, ledger, amendments: [] })[0]?.reason, "projected_interaction_unmapped");
});
