import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  FACTORY_NATIVE_AUTHORED_LOCALES_V1,
  FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1,
  factoryNativeSpeedMatchColumnsV1,
  factoryNativeLearningV2AvailabilityV1,
  factoryNativeIntroResponseFeedbackByIdV1,
  factoryNativeExplanationV1,
  factoryNativeOrderedTokenSlotFeedbackV1,
  materializeFactoryNativeLearningV2SessionV1,
} from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
import { evaluateLearningV2CourseSessionInteractionV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { createLearningV2CourseSessionDeviceRunV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";
import { adaptLearningV2DirectSessionIntroV1 } from "../app/learning_v2_direct_session_intro_adapter_v1";
import { projectLearnerVisiblePromptV1 } from "../modules/learning-v2/content/learner_visible_text_v1";

test("factory-native preserves legacy wrong-only and new all-response intro feedback", () => {
  const feedback = factoryNativeIntroResponseFeedbackByIdV1({
    rawAuxiliary: {
      entries: [{
        interactionId: "en:lesson-01:session-01:intro1:q",
        responseFeedbackById: {
          "en:lesson-01:session-01:intro1:r2": { ru: "Пропущено am.", uk: "Пропущено am." },
          "en:lesson-01:session-01:intro1:r3": { ru: "Пропущено I.", uk: "Пропущено I." },
        },
      }],
    },
    sourceInteractionId: "en:lesson-01:session-01:intro1:q",
    sourceResponseIds: [
      "en:lesson-01:session-01:intro1:r1",
      "en:lesson-01:session-01:intro1:r2",
      "en:lesson-01:session-01:intro1:r3",
    ],
    sourceCorrectResponseId: "en:lesson-01:session-01:intro1:r1",
    oldPrefix: "en:lesson-01:session-01",
    courseSessionId: "lesson-01:session:01",
  });
  assert.equal(feedback["lesson-01:session:01:intro1:r1"], undefined);
  const completeFeedback = factoryNativeIntroResponseFeedbackByIdV1({
    rawAuxiliary: {
      entries: [{
        interactionId: "en:lesson-01:session-01:intro1:q",
        responseFeedbackById: {
          "en:lesson-01:session-01:intro1:r1": { ru: "Верно.", uk: "Правильно." },
          "en:lesson-01:session-01:intro1:r2": { ru: "Пропущено am.", uk: "Пропущено am." },
          "en:lesson-01:session-01:intro1:r3": { ru: "Пропущено I.", uk: "Пропущено I." },
        },
      }],
    },
    sourceInteractionId: "en:lesson-01:session-01:intro1:q",
    sourceResponseIds: [
      "en:lesson-01:session-01:intro1:r1",
      "en:lesson-01:session-01:intro1:r2",
      "en:lesson-01:session-01:intro1:r3",
    ],
    sourceCorrectResponseId: "en:lesson-01:session-01:intro1:r1",
    oldPrefix: "en:lesson-01:session-01",
    courseSessionId: "lesson-01:session:01",
  });
  assert.equal(completeFeedback["lesson-01:session:01:intro1:r1"].ru, "Верно.");
});

test("factory-native maps S01 i16 authored distractor feedback to the generated runtime tile", () => {
  const source = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, "../content/learning-v2-course/sessions/en/l01/s01/practice.atomic.json"),
    "utf8",
  )) as {
    interactionsByLocale: Record<string, Array<{
      interactionId: string;
      modePayload: Record<string, unknown>;
    }>>;
  };
  const raw = source.interactionsByLocale.ru.find((entry) =>
    entry.interactionId === "en:lesson-01:session-01:i16")?.modePayload;
  assert.ok(raw);
  const runtimeOptions = ["I", "am", "happy", "fine"].map((text, index) => ({
    responseId: `lesson-01:session:01:i16:t${String(index + 1).padStart(2, "0")}`,
    text,
  }));
  const feedback = factoryNativeOrderedTokenSlotFeedbackV1(raw, runtimeOptions);
  assert.deepEqual(feedback.map((entry) => entry.responseId), ["lesson-01:session:01:i16:t04"]);
  assert.equal(
    feedback[0]?.feedbackByLocale.ru,
    "happy означает «рад / рада» и говорит о радости; fine изменило бы смысл на «у меня всё хорошо».",
  );
  assert.equal(
    feedback[0]?.feedbackByLocale.uk,
    "happy означає «радий / рада» й говорить про радість; fine змінило б зміст на «у мене все добре».",
  );
});

test("factory-native preserves the complete S01 phrase and speed-match explanation packets", () => {
  const sidecar = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, "../content/learning-v2-course/sessions/en/l01/s01/practice.explanations.v1.json"),
    "utf8",
  ));
  const phrase = sidecar.interactions["en:lesson-01:session-01:i09"];
  const projectedPhrase = factoryNativeExplanationV1(phrase);
  assert.equal(projectedPhrase?.completionFeedbackByLocale.uk, phrase.completionFeedbackByLocale.uk);
  assert.equal(projectedPhrase?.phrase.units[0]?.lemma, phrase.phrase.units[0].lemma);
  assert.equal(projectedPhrase?.phrase.units[0]?.functionByLocale.uk, phrase.phrase.units[0].functionByLocale.uk);
  assert.equal(
    factoryNativeExplanationV1({ completionFeedbackByLocale: phrase.completionFeedbackByLocale })
      ?.completionFeedbackByLocale?.ru,
    phrase.completionFeedbackByLocale.ru,
  );

  const pair = sidecar.interactions["en:lesson-01:session-01:i08"].pairs[0];
  const projectedAnalysis = factoryNativeExplanationV1({ analysisV1: pair.analysisV1 })?.analysisV1;
  assert.equal(projectedAnalysis?.lemma, pair.analysisV1.lemma);
  assert.equal(projectedAnalysis?.meaningByLocale.ru, pair.analysisV1.meaningByLocale.ru);
  assert.equal(projectedAnalysis?.matchExplanationByLocale.uk, pair.analysisV1.matchExplanationByLocale.uk);
  assert.deepEqual(projectedAnalysis?.sourceRefs, pair.analysisV1.sourceRefs);
});

test("factory-native omits intentionally blank optional completion feedback without weakening locale validation", () => {
  assert.deepEqual(
    factoryNativeExplanationV1({ completionFeedbackByLocale: { ru: "", uk: "" } }),
    {},
  );
  assert.throws(
    () => factoryNativeExplanationV1({ completionFeedbackByLocale: { ru: "Текст", uk: "" } }),
    /learning_v2_factory_native_locale_missing/u,
  );
});

test("direct player reveals the authored ordered-token explanation only from the second wrong attempt", () => {
  const player = fs.readFileSync(
    path.resolve(__dirname, "../app/learning_v2_direct_session_player_v1.tsx"),
    "utf8",
  );
  assert.match(player, /!isCheckpoint && wrongCount >= 2 && auxiliary/u);
  assert.match(
    player,
    /orderedIds\.find\([\s\S]{0,240}auxiliary\?\.responseFeedbackById\?\.\[responseId\] !== undefined/u,
  );
  assert.match(
    player,
    /auxiliary\.responseFeedbackById\?\.\[lastWrongResponseId\]\?\.\[lang\][\s\S]{0,120}auxiliary\.secondErrorExplanationByLocale\[lang\]/u,
  );
});

// зачем (координатор §46, 2026-10-01): файл был сценарием из голых assert без
// единого test(), и jest его не исполнял («must contain at least one test») —
// контракт фактически не проверялся. Тело обёрнуто в один test без изменений.
test("factory-native lesson 1 projection contract", () => {
assert.deepEqual(FACTORY_NATIVE_AUTHORED_LOCALES_V1, ["ru", "uk"]);
assert.equal(FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1.es, "ru");

for (const [pairCount, boardSeed] of [[5, "fixture-5-18"], [7, "fixture-7-10"]] as const) {
  const pairIds = Array.from({ length: pairCount }, (_, index) => `p${index + 1}`);
  const columns = factoryNativeSpeedMatchColumnsV1(pairIds, boardSeed);
  assert.deepEqual([...columns.leftColumn].sort(), [...pairIds].sort());
  assert.deepEqual([...columns.rightColumn].sort(), [...pairIds].sort());
  assert.notDeepEqual(columns.rightColumn, pairIds);
  assert.equal(
    columns.rightColumn.some((pairId, index) => pairId === columns.leftColumn[index]),
    false,
    `${pairCount}-pair fallback must never reveal a correct row`,
  );
}

const availability = factoryNativeLearningV2AvailabilityV1();
const releaseRoot = path.resolve(__dirname, "../content/learning-v2-course/release/en");
const canonicalSessions = fs.readdirSync(releaseRoot).filter((name) => /^l\d{2}$/.test(name)).sort()
  .flatMap((lesson) => fs.readdirSync(path.join(releaseRoot, lesson))
    .filter((name) => /^s\d{2}$/.test(name)).sort()
    .filter((session) => fs.existsSync(path.join(releaseRoot, lesson, session, "learner.json")))
    .map((session) => ({
      courseSessionId: `lesson-${lesson.slice(1)}:session:${session.slice(1)}`,
      learnerPath: path.join(releaseRoot, lesson, session, "learner.json"),
    })));
assert.ok(canonicalSessions.length >= 117, "the existing admitted course must not disappear");
assert.equal(availability.targetLanguage, "en");
assert.equal(availability.sessionCount, canonicalSessions.length);
assert.equal(availability.releaseSource, "content/learning-v2-course/release/en");
// зачем: node:assert сверяет и прототип массива, а каталог приходит из другого
// realm тестовой песочницы («no visual difference»). Сравниваем содержимое.
expect(availability.sessions.map((row) => row.courseSessionId))
  .toEqual(canonicalSessions.map((row) => row.courseSessionId));
for (const [index, row] of availability.sessions.entries()) {
  assert.equal(row.lessonOrdinal, Math.floor(index / 56) + 1);
  assert.equal(row.sessionOrdinal, index % 56 + 1);
}

// зачем (координатор §46, 2026-10-01): assert.ok-сужение внутри цикла
// зацикливает вывод типа (TS7022, набор не запускался вовсе). Тип берём
// явно из сигнатуры — проверки те же.
type FactoryMaterial = NonNullable<ReturnType<typeof materializeFactoryNativeLearningV2SessionV1>>;
type FactoryAuxiliaryEntry = FactoryMaterial["auxiliaryChild"]["entries"][number];

const first = materializeFactoryNativeLearningV2SessionV1({
  lessonOrdinal: 1,
  sessionOrdinal: 1,
  interfaceLocale: "ru",
});
assert.ok(first);

assert.equal(first.courseSessionId, "lesson-01:session:01");
assert.equal(first.introChild.pages[0].bodyByLocale.ru.includes("`I`"), false);
assert.equal(first.introChild.pages[0].bodyRunsByLocale?.ru.every((run) => run.semantic === "explanation"), true);
assert.equal(first.learnerChild.interactions[0].interactionId, "lesson-01:session:01:i02");
assert.equal(first.learnerChild.interactions[0].prompt, /* зачем (18.10, класс А): имена сняты по правилу владельца «без имён, только роли» (16.10), Мира → начальница */ "Вставьте слово — начальница звонит и спрашивает, добрались ли вы до офиса; ответьте, что вы уже здесь");
assert.equal(first.learnerChild.interactions[0].ordinal, 4);
assert.equal(first.learnerChild.interactions.find((item) => item.interactionId === "lesson-01:session:01:i08")?.prompt, "Соедините пары");
// The current S01 contains guided speaking; S02 retains the independent-check fixture.
const independentRepeatSession = materializeFactoryNativeLearningV2SessionV1({ lessonOrdinal: 1, sessionOrdinal: 2, interfaceLocale: "ru" });
assert.ok(independentRepeatSession);
const firstIndependentRepeat = independentRepeatSession.learnerChild.interactions.find(
  (interaction) => interaction.purpose === "independent_check"
    && interaction.modePayload?.family === "scripted_repeat_compare",
);
assert.ok(firstIndependentRepeat?.modePayload?.family === "scripted_repeat_compare");
assert.deepEqual(firstIndependentRepeat.modePayload.scriptedRepeatRevealPolicy, {
  schemaVersion: "learning-v2-scripted-repeat-reveal-policy.v1",
  revealAfter: "first_submitted_attempt",
  answerExposedBeforeAttempt: false,
  targetPhraseVisibleBeforeAttempt: false,
  referenceAudioAvailableBeforeAttempt: false,
  modelPlaybackAvailableBeforeAttempt: false,
});
assert.deepEqual(
  first.wordEncounterQueuesByInteractionId["lesson-01:session:01:i02"]?.map((entry) => entry.save.targetText),
  ["here"],
);
assert.equal(
  evaluateLearningV2CourseSessionInteractionV1(
    first.evaluatorCapsuleChild,
    "lesson-01:session:01:i02",
    { kind: "choice_token", value: "lesson-01:session:01:i02:r1" },
  ).resultCode,
  "provisional_correct",
);
assert.equal(
  evaluateLearningV2CourseSessionInteractionV1(
    first.evaluatorCapsuleChild,
    "lesson-01:session:01:i02",
    { kind: "choice_token", value: "lesson-01:session:01:i02:r2" },
  ).resultCode,
  "provisional_wrong",
);
assert.equal(
  first.auxiliaryChild.entries[3].responseFeedbackById?.[
    "lesson-01:session:01:i02:r2"
  ]?.ru,
  "Ready означает «готов / готова». Это подходит перед началом дела, но начальница спрашивает, добрались ли вы до офиса.",
);
const firstRun = createLearningV2CourseSessionDeviceRunV1({
  environment: "production",
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "learning-v2",
  releaseId: "factory-native-v1",
  activeRootFingerprint: "1".repeat(64),
  activeHeadFingerprint: "2".repeat(64),
  lessonId: "lesson-01",
  lessonOrdinal: 1,
  courseSessionId: first.courseSessionId,
  sessionOrdinal: 1,
  packageFingerprint: "3".repeat(64),
  childSetFingerprint: "4".repeat(64),
  introChild: first.introChild,
  learnerChild: first.learnerChild,
  evaluatorCapsuleChild: first.evaluatorCapsuleChild,
  auxiliaryChild: first.auxiliaryChild,
});
const firstIntroScreens = adaptLearningV2DirectSessionIntroV1(firstRun);
let foundShuffledIntro = false;
firstIntroScreens.forEach((screen, pageIndex) => {
  const question = screen.learningV2EmbeddedQuestion!;
  const sourceQuestion = first.introChild.pages[pageIndex]!.question;
  question.responseIdsInVisibleOrder!.forEach((responseId, visibleIndex) => {
    const sourceIndex = Number(responseId.match(/:r(\d+)$/u)?.[1]) - 1;
    assert.equal(question.choicesByLocale.ru[visibleIndex],
      sourceQuestion.choicesByLocale.ru[sourceIndex]);
    if (sourceIndex !== visibleIndex) foundShuffledIntro = true;
  });
});
assert.equal(foundShuffledIntro, true, "the adapter regression must exercise a non-identity shuffle");
const displayedFirstQuestion = firstIntroScreens[0].learningV2EmbeddedQuestion!;
const firstAuxiliary = first.auxiliaryChild.entries[0];
const feedbackForDisplayedText = (text: string) => {
  const visibleIndex = displayedFirstQuestion.choicesByLocale.ru.indexOf(text);
  const responseId = displayedFirstQuestion.responseIdsInVisibleOrder?.[visibleIndex];
  return responseId ? firstAuxiliary.responseFeedbackById?.[responseId]?.ru : undefined;
};
assert.equal(feedbackForDisplayedText("I here."),
  "Между `I` и `here` нужно `am`: `I am here`.");
assert.equal(feedbackForDisplayedText("Am here."),
  "Назовите себя словом `I`: `I am here`.");
assert.equal(
  feedbackForDisplayedText("I am here."),
  undefined,
  "the error-feedback map must not target the correct intro response",
);
assert.equal(
  first.practiceSemanticsByInteractionId["lesson-01:session:01:i02"]
    ?.reviewedMeaningByLocale,
  null,
  "a listening label without an authored translation must not become a saved meaning",
);
assert.equal(
  first.practiceSemanticsByInteractionId["lesson-01:session:01:i09"]
    ?.reviewedMeaningByLocale,
  null,
  "a contextual builder instruction is not a reviewed translation of its answer",
);

const repairedMissingScene = materializeFactoryNativeLearningV2SessionV1({
  lessonOrdinal: 1,
  sessionOrdinal: 6,
  interfaceLocale: "ru",
});
assert.ok(repairedMissingScene);
const repairedGap = repairedMissingScene.learnerChild.interactions.find((entry) =>
  entry.modePayload?.family === "context_gap_grammar");
assert.ok(repairedGap);
assert.ok(repairedGap.modePayload.localizedScene.ru.trim(), "a legacy missing scene is restored from reviewed source title");
assert.ok(repairedGap.modePayload.localizedScene.uk.trim(), "the restored scene has both reviewed interface locales");

const repairedMissingAuxiliary = materializeFactoryNativeLearningV2SessionV1({
  lessonOrdinal: 1,
  sessionOrdinal: 8,
  interfaceLocale: "ru",
});
assert.ok(repairedMissingAuxiliary);
assert.equal(
  repairedMissingAuxiliary.auxiliaryChild.entries[0]?.responseFeedbackById?.[
    "lesson-01:session:08:intro1:r2"
  ]?.ru,
  "Bored означает «Мне скучно», а вы волнуетесь.",
  "the current release keeps authored feedback attached to its response",
);

const repairedPhraseScene = materializeFactoryNativeLearningV2SessionV1({
  lessonOrdinal: 2,
  sessionOrdinal: 11,
  interfaceLocale: "ru",
});
assert.ok(repairedPhraseScene);
const repairedPhrase = repairedPhraseScene.learnerChild.interactions.find((entry) =>
  entry.interactionId.endsWith(":i01"));
assert.ok(repairedPhrase?.modePayload && repairedPhrase.modePayload.family === "phrase_builder");
assert.equal(
  repairedPhrase.modePayload.localizedMeaning.ru,
  "Лена просит проверить список гостей выставки. Спросите, срочно ли это",
  "the reviewed source scene is retained as the phrase-builder explanation",
);

const unsupportedDisplayLocale = materializeFactoryNativeLearningV2SessionV1({
  lessonOrdinal: 1,
  sessionOrdinal: 1,
  interfaceLocale: "es",
});
assert.ok(unsupportedDisplayLocale);
assert.equal(unsupportedDisplayLocale.localeResolution.authoredLocale, "ru");
assert.equal(unsupportedDisplayLocale.localeResolution.kind, "explicit_display_fallback");
assert.equal(
  unsupportedDisplayLocale.introChild.pages[0].titleByLocale.es,
  unsupportedDisplayLocale.introChild.pages[0].titleByLocale.ru,
);

const authoredEncounters: typeof first.wordEncounterQueuesByInteractionId[string][number][] = [];
for (const row of availability.sessions) for (const interfaceLocale of ["ru", "uk"] as const) {
  const session = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: row.lessonOrdinal,
    sessionOrdinal: row.sessionOrdinal,
    interfaceLocale,
  });
  assert.ok(session);
  const sourceDirectory = path.resolve(__dirname, "../modules/learning-v2/content/factory_native/generated_release/en",
    `l${String(row.lessonOrdinal).padStart(2, "0")}`, `s${String(row.sessionOrdinal).padStart(2, "0")}`);
  const sourceLearner = JSON.parse(fs.readFileSync(path.join(sourceDirectory, interfaceLocale === "uk" ? "learner.uk.json" : "learner.json"), "utf8"));
  const sourceAnswers = JSON.parse(fs.readFileSync(path.join(sourceDirectory, "answers.json"), "utf8"));
  const sourceIntro = JSON.parse(fs.readFileSync(path.join(sourceDirectory, "intro.json"), "utf8"));
  const sourcePrefix = sourceIntro.pages[0].pageId.replace(/:intro1$/u, "");
  for (const projected of session.learnerChild.interactions) {
    const sourceId = projected.interactionId.replace(session.courseSessionId, sourcePrefix);
    const source = sourceLearner.interactions.find((item: { interactionId: string }) => item.interactionId === sourceId);
    const answer = sourceAnswers.find((item: { interactionId: string }) => item.interactionId === sourceId);
    assert.ok(source, `${projected.interactionId}: source interaction missing`);
    assert.equal(projected.family, source.family, `${projected.interactionId}: task family changed`);
    assert.equal(projected.prompt, projectLearnerVisiblePromptV1({ title: source.prompt, family: source.family,
      correctText: answer?.correctText ?? "" }), `${projected.interactionId}/${interfaceLocale}: instruction belongs to another task`);
  }
  assert.equal(session.learnerChild.interactions.length + 3, session.evaluatorCapsuleChild.entries.length);
  assert.deepEqual(
    session.evaluatorCapsuleChild.entries.map((entry) => entry.interactionId),
    session.auxiliaryChild.entries.map((entry) => entry.interactionId),
  );
  for (const page of session.introChild.pages) {
    const auxiliary: FactoryAuxiliaryEntry | undefined = session.auxiliaryChild.entries.find((entry) =>
      entry.interactionId === page.question.interactionId);
    const feedback: NonNullable<FactoryAuxiliaryEntry["responseFeedbackById"]> = auxiliary?.responseFeedbackById ?? {};
    const visibleIds = page.question.choicesByLocale[interfaceLocale].map((choice) => choice.responseId);
    assert.equal(Object.keys(feedback).length,
      visibleIds.length - 1,
      `${page.question.interactionId}: every wrong visible intro response needs reviewed feedback`);
    for (const localizedFeedback of Object.values(feedback)) {
      assert.ok(localizedFeedback.ru.trim());
      assert.ok(localizedFeedback.uk.trim());
    }
  }
  // Current cards may be separated by practice tasks. Validate every authored queue,
  // including consecutive cards when present, without requiring an obsolete layout.
  for (const queued of Object.values(session.wordEncounterQueuesByInteractionId)) {
    assert.ok(queued.length > 0);
    assert.deepEqual(queued.map((entry) => entry.orderWithinSession),
      queued.map((_, index) => queued[0].orderWithinSession + index));
  }
  if (interfaceLocale === "ru") authoredEncounters.push(
    ...Object.values(session.wordEncounterQueuesByInteractionId).flat(),
  );
  for (const interaction of session.learnerChild.interactions) {
    const semantic: FactoryMaterial["practiceSemanticsByInteractionId"][string] | undefined =
      session.practiceSemanticsByInteractionId[interaction.interactionId];
    assert.ok(semantic?.canonicalTarget.trim());
    if (semantic.reviewedMeaningByLocale) {
      assert.equal(/^(?:Соберите|Складіть|Вставьте|Вставте|Послушайте|Прослухайте|Скажите|Промовте)\b/iu.test(
        semantic.reviewedMeaningByLocale[interfaceLocale],
      ), false, `${interaction.interactionId}: instruction leaked into reviewed meaning`);
    }
    if (interaction.inputMode === "ordered_tokens")
      assert.ok(interaction.responseOptions.length >= 2, `${interaction.interactionId}: tile bank missing`);
    assert.notEqual(session.auxiliaryChild.entries.find((entry) => entry.interactionId === interaction.interactionId)?.save.targetText, "all_pairs_matched");
    assert.equal(/:r\d+$/u.test(session.auxiliaryChild.entries.find((entry) => entry.interactionId === interaction.interactionId)?.save.targetText ?? ""), false);
    if (interaction.modePayload?.family !== "speed_match") continue;
    const speedMatch = interaction.modePayload;
    const pairIds = speedMatch.pairGrid.map((pair) => pair.pairId);
    assert.deepEqual([...speedMatch.leftColumn].sort(), [...pairIds].sort());
    assert.notDeepEqual(speedMatch.leftColumn, pairIds);
    assert.deepEqual([...speedMatch.rightColumn].sort(), [...pairIds].sort());
    assert.notDeepEqual(speedMatch.rightColumn, pairIds);
    assert.equal(speedMatch.rightColumn.some((pairId, index) => pairId === speedMatch.leftColumn[index]), false);
  }
  for (const interaction of session.learnerChild.interactions) {
    if (interaction.inputMode === "single_choice") {
      const verdicts: ReturnType<typeof evaluateLearningV2CourseSessionInteractionV1>["resultCode"][] = interaction.responseOptions.map((option) => evaluateLearningV2CourseSessionInteractionV1(
        session.evaluatorCapsuleChild,
        interaction.interactionId,
        { kind: "choice_token", value: option.responseId },
      ).resultCode);
      assert.equal(verdicts.filter((value) => value === "provisional_correct").length, 1);
      assert.equal(verdicts.filter((value) => value === "provisional_wrong").length, interaction.responseOptions.length - 1);
    } else if (interaction.inputMode === "pair_grid") {
      assert.equal(evaluateLearningV2CourseSessionInteractionV1(session.evaluatorCapsuleChild, interaction.interactionId, { kind: "choice_token", value: "all_pairs_matched" }).resultCode, "provisional_correct");
    } else if (interaction.inputMode === "ordered_tokens") {
      const mode = interaction.modePayload;
      const answer = mode?.family === "phrase_builder" || mode?.family === "listen_build_dictation"
        ? mode.orderedTokens.join(" ") : "";
      assert.equal(evaluateLearningV2CourseSessionInteractionV1(session.evaluatorCapsuleChild, interaction.interactionId, { kind: "text", value: answer }).resultCode, "provisional_correct");
    }
  }
}

// The factory runtime consumes Metro's generated_release assets, so the word-card
// oracle must inspect those exact bytes rather than the separate authoring release
// tree (which may contain sessions not yet regenerated into the app projection).
const expectedEncounterCount = availability.sessions.reduce((count, row) => {
  const learnerPath = path.resolve(
    __dirname,
    "../modules/learning-v2/content/factory_native/generated_release/en",
    `l${String(row.lessonOrdinal).padStart(2, "0")}`,
    `s${String(row.sessionOrdinal).padStart(2, "0")}`,
    "learner.json",
  );
  const learner = JSON.parse(fs.readFileSync(learnerPath, "utf8")) as {
    interactions: { modePayload?: { isWordCard?: boolean } }[];
  };
  return count + learner.interactions.filter((item) => item.modePayload?.isWordCard === true).length;
}, 0);
assert.equal(authoredEncounters.length, expectedEncounterCount);
assert.equal(new Set(authoredEncounters.map((entry) => entry.encounterId)).size, expectedEncounterCount);
const lexicalIds = (word: string) => new Set(authoredEncounters
  .filter((entry) => entry.save.targetText.toLocaleLowerCase("en") === word)
  .map((entry) => entry.lexicalItemId));
assert.equal(lexicalIds("quiet").size, 1, "copy variants of one reviewed sense share unlock identity");
assert.equal(lexicalIds("full").size, 1, "the single authored full sense keeps one unlock identity");
for (const polysemous of ["busy", "free", "late", "cold", "hot"])
  assert.equal(lexicalIds(polysemous).size, 1, `${polysemous} has one introduced sense in the current course`);
assert.equal(lexicalIds("one").size, 0, "an absent legacy word card must not be invented");

assert.equal(
  materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: Math.floor(canonicalSessions.length / 56) + 1,
    sessionOrdinal: canonicalSessions.length % 56 + 1,
    interfaceLocale: "ru",
  }),
  null,
  "the next unreleased session must fail closed",
);

console.log("Learning V2 factory native projection v1: PASS");
});
