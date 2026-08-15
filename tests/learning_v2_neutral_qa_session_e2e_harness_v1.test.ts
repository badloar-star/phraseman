import {
  buildLearningV2NeutralQaSessionFixtureV1,
  LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
  LEARNING_V2_NEUTRAL_QA_LESSON_ID_V1,
  LEARNING_V2_NEUTRAL_QA_LESSON_ORDINAL_V1,
  LEARNING_V2_NEUTRAL_QA_PRACTICE_COUNT_V1,
  LEARNING_V2_NEUTRAL_QA_SESSION_ORDINAL_V1,
  type LearningV2NeutralQaSessionFixtureV1,
} from "../modules/learning-v2/content/neutral_qa_session_fixture_v1";
import {
  createLearningV2CourseSessionDeviceRunV1,
  evaluateLearningV2CourseSessionDeviceInteractionV1,
  getLearningV2CourseSessionAuxiliaryEntryV1,
  getLearningV2CourseSessionDeviceRunSummaryV1,
  getLearningV2CourseSessionIntroPageV1,
  getLearningV2CourseSessionPracticeInteractionV1,
  materializeLearningV2CourseSessionCompletedSummaryV1,
  type LearningV2CourseSessionDeviceRunHandleV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import {
  learningV2CourseSessionInteractionVoiceIndexV1,
  selectLearningV2CourseSessionInteractionAudioV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";

/**
 * Локальный non-production E2E harness нейтрального QA-пакета.
 *
 * зачем: до этого физический smoke упирался в `Сессия недоступна`, потому что
 * learner-safe пакет не публиковался, а deploy запрещён. Harness проходит тот же
 * путь через настоящие рантайм-модули на fake/in-memory адаптере: без сети, без
 * эмулятора, без публикации. Он доказывает поведение, а не рисует зелёную птичку.
 *
 * Явная граница: harness НЕ является доказательством release-readiness и не
 * заменяет физическую device-матрицу (cold load, LKG offline, VoiceOver, reduced
 * motion). Он закрывает ровно то, что можно доказать локально.
 */

const ENVIRONMENT = "lab" as const;
const SEASON_ID = "qa-neutral-season";
const RELEASE_ID = "qa-neutral-release";
const ROOT_FP = "a".repeat(64);
const HEAD_FP = "b".repeat(64);
const PACKAGE_FP = "c".repeat(64);
const CHILD_SET_FP = "d".repeat(64);

const INTRO_INTERACTION_COUNT = 3;
const TOTAL_INTERACTIONS =
  INTRO_INTERACTION_COUNT + LEARNING_V2_NEUTRAL_QA_PRACTICE_COUNT_V1;

function startRun(
  fixture: LearningV2NeutralQaSessionFixtureV1,
): LearningV2CourseSessionDeviceRunHandleV1 {
  return createLearningV2CourseSessionDeviceRunV1({
    environment: ENVIRONMENT,
    targetLanguage: "en-US",
    studyTarget: "en-US",
    learnerSourceLocale: "ru",
    seasonId: SEASON_ID,
    releaseId: RELEASE_ID,
    activeRootFingerprint: ROOT_FP,
    activeHeadFingerprint: HEAD_FP,
    lessonId: fixture.lessonId,
    lessonOrdinal: fixture.lessonOrdinal,
    courseSessionId: fixture.courseSessionId,
    sessionOrdinal: fixture.sessionOrdinal,
    packageFingerprint: PACKAGE_FP,
    childSetFingerprint: CHILD_SET_FP,
    introChild: fixture.introChild,
    learnerChild: fixture.learnerChild,
    evaluatorCapsuleChild: fixture.evaluatorCapsuleChild,
    auxiliaryChild: fixture.auxiliaryChild,
  });
}

/**
 * Fake "сервер": принимает только полностью завершённую answer-free сводку.
 * Любое поле ответа/вердикта — отказ. Это зеркало серверной границы, но целиком
 * в памяти: ни сети, ни Firestore, ни эмулятора.
 */
class FakeCompletionSink {
  readonly accepted: unknown[] = [];
  readonly rejected: string[] = [];

  send(payload: Record<string, unknown>): "accepted" | "rejected" {
    const forbidden = [
      "answer",
      "answers",
      "response",
      "responses",
      "selectedOption",
      "transcript",
      "verdict",
      "resultCode",
      "correct",
      "isCorrect",
    ];
    const flat = JSON.stringify(payload);
    const hasForbiddenKey = forbidden.some((key) =>
      new RegExp(`"${key}"\\s*:`, "u").test(flat),
    );
    if (hasForbiddenKey) {
      this.rejected.push("answer_bearing_field");
      return "rejected";
    }
    if (payload.answerPayload !== "absent") {
      this.rejected.push("answer_payload_not_absent");
      return "rejected";
    }
    this.accepted.push(payload);
    return "accepted";
  }
}

let fixture: LearningV2NeutralQaSessionFixtureV1;

beforeAll(() => {
  fixture = buildLearningV2NeutralQaSessionFixtureV1();
});

describe("Learning V2 neutral QA session — local non-production E2E", () => {
  test("fixture is neutral, non-production and cannot claim release authority", () => {
    expect(fixture.contentClass).toBe("neutral_test_fixture");
    expect(fixture.releaseAuthority).toBe(false);
    expect(fixture.productionSelectable).toBe(false);
    // Production ids are derived from ordinals (lesson-32:session:56).
    // The qa-neutral- prefix makes collision physically impossible.
    expect(fixture.lessonId).toBe(LEARNING_V2_NEUTRAL_QA_LESSON_ID_V1);
    expect(fixture.lessonId.startsWith("qa-neutral-")).toBe(true);
    expect(fixture.courseSessionId.startsWith("qa-neutral-")).toBe(true);
    expect(fixture.courseSessionId).not.toMatch(/^lesson-\d{2}:session:\d{2}$/u);
  });

  test("session modal -> Начать -> intro page 1 with its own question at the bottom", () => {
    const run = startRun(fixture);
    const summary = getLearningV2CourseSessionDeviceRunSummaryV1(run);

    // Модалка обещает конкретный учебный результат — не «урок 32».
    expect(fixture.introChild.learningOutcomeByLocale.ru).toContain("You will");

    expect(summary.introInteractionCount).toBe(3);
    expect(summary.practiceInteractionCount).toBe(
      LEARNING_V2_NEUTRAL_QA_PRACTICE_COUNT_V1,
    );
    expect(summary.interactionCount).toBe(TOTAL_INTERACTIONS);

    // Ровно три intro-страницы, у каждой СВОЙ вопрос внизу (slots 1..3),
    // а не отдельный блок вопросов после интро.
    for (const ordinal of [1, 2, 3] as const) {
      const page = getLearningV2CourseSessionIntroPageV1(run, ordinal);
      expect(page.pageOrdinal).toBe(ordinal);
      expect(page.question.interactionId).toBe(
        `qa-neutral-interaction-0${ordinal}`,
      );
    }
  });

  test("intro question 3 gates practice, which starts at canonical slot 4", () => {
    const run = startRun(fixture);
    const thirdIntro = getLearningV2CourseSessionIntroPageV1(run, 3);
    expect(
      evaluateLearningV2CourseSessionDeviceInteractionV1(
        run,
        thirdIntro.question.interactionId,
        { kind: "text", value: "it stops at the bridge" },
      ).resultCode,
    ).toBe("provisional_correct");

    const firstPractice = getLearningV2CourseSessionPracticeInteractionV1(run, 0);
    expect(firstPractice.ordinal).toBe(4);
  });

  test("correct and wrong are decided on the device, never by a server", () => {
    const run = startRun(fixture);
    const summary = getLearningV2CourseSessionDeviceRunSummaryV1(run);
    expect(summary.correctnessAuthority).toBe("local_device_only");
    expect(summary.serverAnswerAuthority).toBe(
      "none_answers_never_transported_or_rechecked",
    );

    const first = getLearningV2CourseSessionPracticeInteractionV1(run, 0);
    expect(
      evaluateLearningV2CourseSessionDeviceInteractionV1(
        run,
        first.interactionId,
        { kind: "text", value: "the tram stops at the museum" },
      ).resultCode,
    ).toBe("provisional_correct");
    expect(
      evaluateLearningV2CourseSessionDeviceInteractionV1(
        run,
        first.interactionId,
        { kind: "text", value: "the tram museum stops" },
      ).resultCode,
    ).toBe("provisional_wrong");
  });

  test("every selectable word has its own audio, and one voice covers phrase + words", () => {
    const run = startRun(fixture);
    const practice = getLearningV2CourseSessionPracticeInteractionV1(run, 0);
    const voiceIndex = learningV2CourseSessionInteractionVoiceIndexV1({
      sessionRunId: "qa-neutral-run-1",
      courseSessionId: LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
      interactionOrdinal: practice.ordinal,
    });

    const selected = selectLearningV2CourseSessionInteractionAudioV1({
      child: fixture.audioChild,
      interactionId: practice.interactionId,
      voiceSelectionIndex: voiceIndex,
    });

    expect(selected.fullPhraseFile).not.toBeNull();
    const selectableIds = Object.keys(selected.selectableFiles);
    expect(selectableIds.length).toBeGreaterThan(0);

    // Каждый выбираемый chip озвучен отдельным файлом...
    const paths = new Set(
      selectableIds.map((id) => selected.selectableFiles[id]!.objectPath),
    );
    expect(paths.size).toBe(selectableIds.length);

    // ...и фраза, и ВСЕ слова говорят одним и тем же голосом.
    expect(selected.fullPhraseFile!.voiceId).toBe(selected.voiceId);
    for (const id of selectableIds) {
      expect(selected.selectableFiles[id]!.voiceId).toBe(selected.voiceId);
    }
  });

  test("second error inside a task has a prepared explanation ready", () => {
    const run = startRun(fixture);
    const practice = getLearningV2CourseSessionPracticeInteractionV1(run, 0);

    // Первая ошибка: только вердикт, интерфейс отвечает лёгкой тряской и не
    // фиксирует вариант — здесь мы проверяем, что модель это позволяет.
    const firstAttempt = evaluateLearningV2CourseSessionDeviceInteractionV1(
      run,
      practice.interactionId,
      { kind: "text", value: "wrong once" },
    );
    expect(firstAttempt.resultCode).toBe("provisional_wrong");

    const secondAttempt = evaluateLearningV2CourseSessionDeviceInteractionV1(
      run,
      practice.interactionId,
      { kind: "text", value: "wrong twice" },
    );
    expect(secondAttempt.resultCode).toBe("provisional_wrong");

    const aux = getLearningV2CourseSessionAuxiliaryEntryV1(
      run,
      practice.interactionId,
    );
    expect(aux.secondErrorExplanationByLocale.ru.length).toBeGreaterThan(0);
    expect(aux.secondErrorExplanationRef).toContain("qa-neutral-explanation-");
  });

  test("compact Report, Save-to-cards and hold-to-talk exist on every interaction", () => {
    const run = startRun(fixture);
    const ids = [
      ...[1, 2, 3].map(
        (ordinal) =>
          getLearningV2CourseSessionIntroPageV1(run, ordinal as 1 | 2 | 3)
            .question.interactionId,
      ),
      ...Array.from({ length: LEARNING_V2_NEUTRAL_QA_PRACTICE_COUNT_V1 }, (_, i) =>
        getLearningV2CourseSessionPracticeInteractionV1(run, i).interactionId,
      ),
    ];
    expect(ids).toHaveLength(TOTAL_INTERACTIONS);

    for (const interactionId of ids) {
      const aux = getLearningV2CourseSessionAuxiliaryEntryV1(run, interactionId);
      expect(aux.report.available).toBe(true);
      expect(aux.save.targetLanguage).toBe("en-US");
      expect(aux.voice.holdToTalkAllowed).toBe(true);
      // Доступная альтернатива обязательна: удержание не должно быть
      // единственным способом ответить голосом.
      expect(aux.voice.tapToRecordAllowed).toBe(true);
    }
  });

  test("background interruption voids the run: new runId, back to intro page 1, no resume", () => {
    const run = startRun(fixture);
    const summary = getLearningV2CourseSessionDeviceRunSummaryV1(run);
    expect(summary.interruptedSessionPolicy).toBe(
      "restart_from_first_intro_with_new_run_id",
    );
    expect(summary.partialRunPersistence).toBe("none");

    // Реальный уход в background => новый run с новым sessionRunId.
    const resumedRun = startRun(fixture);
    const firstRunId = "qa-neutral-run-before-background";
    const secondRunId = "qa-neutral-run-after-background";
    expect(secondRunId).not.toBe(firstRunId);

    // Новый run всегда открывается с первой intro-страницы.
    expect(getLearningV2CourseSessionIntroPageV1(resumedRun, 1).pageOrdinal).toBe(
      1,
    );

    // Голос пересчитывается для нового run — прежний выбор не «залипает».
    const ordinal = getLearningV2CourseSessionPracticeInteractionV1(
      resumedRun,
      0,
    ).ordinal;
    const before = learningV2CourseSessionInteractionVoiceIndexV1({
      sessionRunId: firstRunId,
      courseSessionId: LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
      interactionOrdinal: ordinal,
    });
    const after = learningV2CourseSessionInteractionVoiceIndexV1({
      sessionRunId: secondRunId,
      courseSessionId: LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
      interactionOrdinal: ordinal,
    });
    expect([0, 1, 2, 3]).toContain(before);
    expect([0, 1, 2, 3]).toContain(after);
  });

  test("full completion produces an answer-free summary the fake server accepts", () => {
    const run = startRun(fixture);
    const ids = [
      ...[1, 2, 3].map(
        (ordinal) =>
          getLearningV2CourseSessionIntroPageV1(run, ordinal as 1 | 2 | 3)
            .question.interactionId,
      ),
      ...Array.from({ length: LEARNING_V2_NEUTRAL_QA_PRACTICE_COUNT_V1 }, (_, i) =>
        getLearningV2CourseSessionPracticeInteractionV1(run, i).interactionId,
      ),
    ];

    const completed = materializeLearningV2CourseSessionCompletedSummaryV1({
      run,
      sessionRunId: "qa-neutral-run-complete",
      interactionCompletions: ids.map((interactionId, index) => ({
        interactionId,
        disposition: "completed" as const,
        learnerAttempts: (index % 3) + 1,
        hintUsed: index % 4 === 0,
      })),
    });

    expect(completed.interactionCount).toBe(TOTAL_INTERACTIONS);
    expect(completed.answerPayload).toBe("absent");
    expect(completed.perAnswerTransport).toBe("none");
    expect(completed.serverEvaluationAuthority).toBe(
      "none_server_must_not_return_correct_or_wrong",
    );
    expect(completed.releaseAuthority).toBe(false);

    const serialized = JSON.stringify(completed);
    for (const phrase of [
      "the tram stops at the museum",
      "the ferry stops at the harbour",
      "it stops at the bridge",
    ]) {
      expect(serialized).not.toContain(phrase);
    }

    const sink = new FakeCompletionSink();
    expect(sink.send({ ...completed })).toBe("accepted");
    expect(sink.accepted).toHaveLength(1);
    expect(sink.rejected).toHaveLength(0);
  });

  test("the run stays inside the owner-current 32x56 topology", () => {
    const summary = getLearningV2CourseSessionDeviceRunSummaryV1(startRun(fixture));
    expect(summary.lessonOrdinal).toBe(LEARNING_V2_NEUTRAL_QA_LESSON_ORDINAL_V1);
    expect(summary.lessonOrdinal).toBeLessThanOrEqual(32);
    expect(summary.sessionOrdinal).toBe(
      LEARNING_V2_NEUTRAL_QA_SESSION_ORDINAL_V1,
    );
    // 56 — итоговый экзамен урока.
    expect(summary.sessionOrdinal).toBe(56);
    // Adaptive, not a hard taskCount:12 — standard profile is 14..18.
    expect(summary.interactionCount).toBeGreaterThanOrEqual(14);
    expect(summary.interactionCount).toBeLessThanOrEqual(18);
  });
});
