import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  FACTORY_NATIVE_AUTHORED_LOCALES_V1,
  FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1,
  factoryNativeSpeedMatchColumnsV1,
  factoryNativeLearningV2AvailabilityV1,
  materializeFactoryNativeLearningV2SessionV1,
} from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
import { evaluateLearningV2CourseSessionInteractionV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { createLearningV2CourseSessionDeviceRunV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";
import { adaptLearningV2DirectSessionIntroV1 } from "../app/learning_v2_direct_session_intro_adapter_v1";

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
assert.deepEqual(availability.sessions.map((row) => row.courseSessionId),
  canonicalSessions.map((row) => row.courseSessionId));
for (const [index, row] of availability.sessions.entries()) {
  assert.equal(row.lessonOrdinal, Math.floor(index / 56) + 1);
  assert.equal(row.sessionOrdinal, index % 56 + 1);
}

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
assert.equal(first.learnerChild.interactions[0].prompt, "Послушайте и выберите");
assert.equal(first.learnerChild.interactions[0].ordinal, 4);
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
  "Похоже звучит, но это «волосы». Слушайте гласную: here тянется «иэ».",
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
  "Так можно по-русски, но не по-английски: потерялась скрепка am, и фраза рассыпалась.");
assert.equal(feedbackForDisplayedText("Am here."),
  "Пропало I — непонятно, кто здесь. Скрепке нужен тот, кого она скрепляет.");
assert.equal(
  first.practiceSemanticsByInteractionId["lesson-01:session:01:i02"]
    ?.reviewedMeaningByLocale,
  null,
  "a listening label without an authored translation must not become a saved meaning",
);
assert.equal(
  first.practiceSemanticsByInteractionId["lesson-01:session:01:i09"]
    ?.reviewedMeaningByLocale?.ru,
  "я здесь",
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

const withQueuedCards = availability.sessions
  .map((row) => materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: row.lessonOrdinal,
    sessionOrdinal: row.sessionOrdinal,
    interfaceLocale: "uk",
  }))
  .find((session) => Object.values(session?.wordEncounterQueuesByInteractionId ?? {}).some((entries) => entries.length > 1));
assert.ok(withQueuedCards, "at least one authored consecutive-card queue must survive");
const queued = Object.values(withQueuedCards.wordEncounterQueuesByInteractionId).find((entries) => entries.length > 1);
assert.ok(queued);
assert.deepEqual(
  queued.map((entry) => entry.orderWithinSession),
  queued.map((_, index) => (queued[0]?.orderWithinSession ?? 1) + index),
);

const authoredEncounters: typeof first.wordEncounterQueuesByInteractionId[string][number][] = [];
for (const row of availability.sessions) for (const interfaceLocale of ["ru", "uk"] as const) {
  const session = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: row.lessonOrdinal,
    sessionOrdinal: row.sessionOrdinal,
    interfaceLocale,
  });
  assert.ok(session);
  assert.equal(session.learnerChild.interactions.length + 3, session.evaluatorCapsuleChild.entries.length);
  assert.deepEqual(
    session.evaluatorCapsuleChild.entries.map((entry) => entry.interactionId),
    session.auxiliaryChild.entries.map((entry) => entry.interactionId),
  );
  for (const page of session.introChild.pages) {
    const auxiliary = session.auxiliaryChild.entries.find((entry) =>
      entry.interactionId === page.question.interactionId);
    const feedback = auxiliary?.responseFeedbackById ?? {};
    assert.equal(Object.keys(feedback).length,
      page.question.choicesByLocale[interfaceLocale].length - 1);
    for (const localizedFeedback of Object.values(feedback)) {
      assert.ok(localizedFeedback.ru.trim());
      assert.ok(localizedFeedback.uk.trim());
    }
  }
  if (interfaceLocale === "ru") authoredEncounters.push(
    ...Object.values(session.wordEncounterQueuesByInteractionId).flat(),
  );
  for (const interaction of session.learnerChild.interactions) {
    const semantic = session.practiceSemanticsByInteractionId[interaction.interactionId];
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
      const verdicts = interaction.responseOptions.map((option) => evaluateLearningV2CourseSessionInteractionV1(
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

const expectedEncounterCount = canonicalSessions.reduce((count, row) => {
  const learner = JSON.parse(fs.readFileSync(row.learnerPath, "utf8")) as {
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
for (const polysemous of ["busy", "full", "free", "late", "cold", "hot"])
  assert.equal(lexicalIds(polysemous).size, 2, `${polysemous} keeps its two reviewed senses distinct`);
const one = authoredEncounters.find((entry) =>
  entry.save.targetText.toLocaleLowerCase("en") === "one");
assert.equal(one?.save.meaningByLocale.ru,
  "заменяет вещь, которую уже назвали. Вместо `Which bag?` говорят `Which one?`");
assert.equal(one?.save.meaningByLocale.uk,
  "заміняє річ, яку вже назвали. Замість `Which bag?` кажуть `Which one?`");

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
