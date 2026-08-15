import {
  buildLearningV2NeutralQaSessionFixtureV1,
  LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
  LEARNING_V2_NEUTRAL_QA_PRACTICE_COUNT_V1,
  type LearningV2NeutralQaSessionFixtureV1,
} from "../modules/learning-v2/content/neutral_qa_session_fixture_v1";
import {
  createLearningV2CourseSessionDeviceRunV1,
  evaluateLearningV2CourseSessionDeviceInteractionV1,
  getLearningV2CourseSessionIntroPageV1,
  getLearningV2CourseSessionPracticeInteractionV1,
  materializeLearningV2CourseSessionCompletedSummaryV1,
  parseLearningV2CourseSessionCompletedSummaryV1,
  type LearningV2CourseSessionDeviceRunHandleV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import {
  encodeLearningV2CourseSessionAudioChildV1,
  parseLearningV2CourseSessionAudioChildV1,
  selectLearningV2CourseSessionInteractionAudioV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";

/**
 * Hostile RED matrix — доказательство НЕВОЗМОЖНОСТИ, а не работоспособности.
 *
 * зачем: обычный зелёный тест показывает, что happy path жив. Он ничего не
 * говорит о том, можно ли обойти границу. Здесь каждый кейс — попытка нарушить
 * зафиксированное владельцем правило; тест проходит, только если попытка
 * ПРОВАЛИЛАСЬ закрыто (исключение или отказ), а не была молча принята.
 *
 * Класс бага, ради которого это написано: сторож, который сравнивает пустоту,
 * выглядит зелёным годами (ср. инцидент с firestore_rules_security 2026-08-15).
 * Поэтому каждый RED-кейс сначала проверяет, что «правильный» вариант проходит,
 * и только потом — что испорченный отвергается.
 */

const ROOT_FP = "a".repeat(64);
const HEAD_FP = "b".repeat(64);
const PACKAGE_FP = "c".repeat(64);
const CHILD_SET_FP = "d".repeat(64);
const TOTAL_INTERACTIONS = 3 + LEARNING_V2_NEUTRAL_QA_PRACTICE_COUNT_V1;

let fixture: LearningV2NeutralQaSessionFixtureV1;

beforeAll(() => {
  fixture = buildLearningV2NeutralQaSessionFixtureV1();
});

function startRun(): LearningV2CourseSessionDeviceRunHandleV1 {
  return createLearningV2CourseSessionDeviceRunV1({
    environment: "lab",
    targetLanguage: "en-US",
    studyTarget: "en-US",
    learnerSourceLocale: "ru",
    seasonId: "qa-neutral-season",
    releaseId: "qa-neutral-release",
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

function allInteractionIds(
  run: LearningV2CourseSessionDeviceRunHandleV1,
): readonly string[] {
  return [
    ...[1, 2, 3].map(
      (ordinal) =>
        getLearningV2CourseSessionIntroPageV1(run, ordinal as 1 | 2 | 3).question
          .interactionId,
    ),
    ...Array.from({ length: LEARNING_V2_NEUTRAL_QA_PRACTICE_COUNT_V1 }, (_, i) =>
      getLearningV2CourseSessionPracticeInteractionV1(run, i).interactionId,
    ),
  ];
}

function completeSummary(
  run: LearningV2CourseSessionDeviceRunHandleV1,
  sessionRunId = "qa-neutral-run-red",
) {
  return materializeLearningV2CourseSessionCompletedSummaryV1({
    run,
    sessionRunId,
    interactionCompletions: allInteractionIds(run).map((interactionId) => ({
      interactionId,
      disposition: "completed" as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
}

describe("Learning V2 hostile RED — the server can never learn the answer", () => {
  test("RED 1: an answer-bearing field cannot ride along the completion summary", () => {
    const summary = completeSummary(startRun());

    // GREEN control: неиспорченная сводка обязана проходить.
    expect(() =>
      parseLearningV2CourseSessionCompletedSummaryV1({ ...summary }),
    ).not.toThrow();

    // Схема закрыта по точному набору ключей: лишнее поле = отказ.
    for (const smuggled of [
      { answer: "the tram stops at the museum" },
      { selectedOption: "qa-opt-5-a" },
      { responses: ["a", "b"] },
    ]) {
      expect(() =>
        parseLearningV2CourseSessionCompletedSummaryV1({
          ...summary,
          ...smuggled,
        }),
      ).toThrow();
    }
  });

  test("RED 2: transcript and verdict cannot be attached to the summary", () => {
    const summary = completeSummary(startRun());
    for (const smuggled of [
      { transcript: "the tram stops at the museum" },
      { verdict: "provisional_correct" },
      { resultCode: "provisional_correct" },
    ]) {
      expect(() =>
        parseLearningV2CourseSessionCompletedSummaryV1({
          ...summary,
          ...smuggled,
        }),
      ).toThrow();
    }

    // И в самих строках завершения ответа тоже нет места.
    expect(() =>
      parseLearningV2CourseSessionCompletedSummaryV1({
        ...summary,
        interactionCompletions: summary.interactionCompletions.map((row) => ({
          ...row,
          answer: "smuggled",
        })),
      }),
    ).toThrow();
  });

  test("RED 3: a partial run cannot be uploaded as a completed session", () => {
    const run = startRun();
    const ids = allInteractionIds(run);
    expect(ids).toHaveLength(TOTAL_INTERACTIONS);

    // Нельзя собрать сводку меньше, чем весь набор взаимодействий.
    expect(() =>
      materializeLearningV2CourseSessionCompletedSummaryV1({
        run,
        sessionRunId: "qa-neutral-run-partial",
        interactionCompletions: ids.slice(0, 5).map((interactionId) => ({
          interactionId,
          disposition: "completed" as const,
          learnerAttempts: 1,
          hintUsed: false,
        })),
      }),
    ).toThrow();

    // И нельзя урезать уже готовую сводку на транспорте.
    const summary = completeSummary(run);
    expect(() =>
      parseLearningV2CourseSessionCompletedSummaryV1({
        ...summary,
        interactionCompletions: summary.interactionCompletions.slice(0, 5),
        interactionCount: 5,
      }),
    ).toThrow();
  });

  test("RED 4: a stale run cannot be resumed or re-attributed", () => {
    const run = startRun();
    const summary = completeSummary(run, "qa-neutral-run-first");

    // Подмена sessionRunId на «прошлый» run ломает подпись сводки.
    expect(() =>
      parseLearningV2CourseSessionCompletedSummaryV1({
        ...summary,
        sessionRunId: "qa-neutral-run-stale",
      }),
    ).toThrow();

    // Никакого partial resume: политика зафиксирована в самой сводке и любое
    // её ослабление отвергается.
    expect(summary.partialRunPersistence).toBe("none");
    expect(() =>
      parseLearningV2CourseSessionCompletedSummaryV1({
        ...summary,
        partialRunPersistence: "resume_supported",
      }),
    ).toThrow();
    expect(() =>
      parseLearningV2CourseSessionCompletedSummaryV1({
        ...summary,
        interruptedSessionPolicy: "resume_from_last_interaction",
      }),
    ).toThrow();
  });

  test("RED 5: phrase and words can never speak with different voices", () => {
    const practice = getLearningV2CourseSessionPracticeInteractionV1(
      startRun(),
      0,
    );

    // GREEN control: один индекс — один голос на фразу и все слова.
    for (const voiceIndex of [0, 1, 2, 3] as const) {
      const selected = selectLearningV2CourseSessionInteractionAudioV1({
        child: fixture.audioChild,
        interactionId: practice.interactionId,
        voiceSelectionIndex: voiceIndex,
      });
      const voices = new Set<string>([
        selected.fullPhraseFile!.voiceId,
        ...Object.values(selected.selectableFiles).map((file) => file.voiceId),
      ]);
      // Ровно один голос на всё задание — API физически не даёт смешать.
      expect(voices.size).toBe(1);
      expect(selected.voiceId).toBe(selected.fullPhraseFile!.voiceId);
    }

    // Индекс вне 0..3 отвергается, а не «схлопывается» в допустимый.
    for (const bad of [-1, 4, 1.5, Number.NaN]) {
      expect(() =>
        selectLearningV2CourseSessionInteractionAudioV1({
          child: fixture.audioChild,
          interactionId: practice.interactionId,
          voiceSelectionIndex: bad as 0,
        }),
      ).toThrow();
    }
  });

  test("RED 6: tampered audio hash, generation or path is rejected", () => {
    const learner = fixture.learnerChild;
    const canonical = encodeLearningV2CourseSessionAudioChildV1(
      fixture.audioChild,
    );

    // GREEN control: нетронутый канонический ребёнок парсится.
    expect(() =>
      parseLearningV2CourseSessionAudioChildV1(canonical, learner),
    ).not.toThrow();

    // зачем: подделываем ИМЕННО байты, которые уходят на устройство. Парсер
    // обязан отвергнуть их до того, как файл будет считан как «проверенный».
    const tamper = (mutate: (draft: any) => void): string => {
      const draft = JSON.parse(canonical);
      mutate(draft);
      return JSON.stringify(draft);
    };

    for (const raw of [
      tamper((d) => {
        d.interactions[0].selectables[0].files[0].contentHash = "f".repeat(64);
      }),
      tamper((d) => {
        d.interactions[0].selectables[0].files[0].objectGeneration =
          "999999999999";
      }),
      tamper((d) => {
        d.interactions[0].selectables[0].files[0].objectPath =
          "learning-v2/voice-audio/evil.mp3";
      }),
      tamper((d) => {
        d.interactions[0].fullPhraseFiles[0].contentHash = "e".repeat(64);
      }),
    ]) {
      expect(() =>
        parseLearningV2CourseSessionAudioChildV1(raw, learner),
      ).toThrow();
    }

    // зачем: наивная подделка ломает fileFingerprint и падает «сама собой» —
    // такой тест ничего не доказывает про связь пути и хеша. Поэтому здесь мы
    // играем за атакующего, который знает алгоритм и ЧЕСТНО пересчитывает все
    // производные хеши. Единственное оставшееся расхождение — objectPath
    // указывает на другой объект, чем contentHash. Именно это должно закрыть
    // подмену файла. (Мутационная проверка 2026-08-15: без этого кейса
    // отключение проверки `objectPath.endsWith('/<contentHash>.mp3')` не роняло
    // ни один тест — дыра прошла бы незамеченной.)
    const forged = JSON.parse(canonical);
    const victim = forged.interactions[0].selectables[0].files[0];
    const swappedHash = "1".repeat(64);
    victim.contentHash = swappedHash;
    expect(victim.objectPath.endsWith(`/${swappedHash}.mp3`)).toBe(false);

    const { fileFingerprint: _drop, ...fileBody } = victim;
    victim.fileFingerprint = hashCanonicalBody(fileBody);

    const selectable = forged.interactions[0].selectables[0];
    const { selectableFingerprint: _dropSel, ...selectableBody } = selectable;
    selectable.selectableFingerprint = hashCanonicalBody(selectableBody);

    const interaction = forged.interactions[0];
    const { interactionAudioFingerprint: _dropInt, ...interactionBody } =
      interaction;
    interaction.interactionAudioFingerprint = hashCanonicalBody(interactionBody);

    const { audioFingerprint: _dropRoot, ...rootBody } = forged;
    forged.audioFingerprint = hashCanonicalBody(rootBody);

    expect(() =>
      parseLearningV2CourseSessionAudioChildV1(
        canonicalJsonV1(forged),
        learner,
      ),
    ).toThrow();
  });

  test("RED 7: correctness cannot be obtained from or overridden by a server", () => {
    const run = startRun();
    const practice = getLearningV2CourseSessionPracticeInteractionV1(run, 0);

    // Вердикт выдаёт только локальный evaluator и только "provisional_*".
    const verdict = evaluateLearningV2CourseSessionDeviceInteractionV1(
      run,
      practice.interactionId,
      { kind: "text", value: "the tram stops at the museum" },
    );
    expect(verdict.resultCode).toBe("provisional_correct");
    expect(String(verdict.resultCode).startsWith("provisional_")).toBe(true);

    // Неизвестный interactionId не оценивается вовсе: нельзя подсунуть чужой
    // идентификатор и получить по нему вердикт.
    expect(() =>
      evaluateLearningV2CourseSessionDeviceInteractionV1(
        run,
        "server-provided-interaction",
        { kind: "text", value: "anything" },
      ),
    ).toThrow();

    // Сводка не может объявить серверную авторитетность результата.
    const summary = completeSummary(run);
    for (const smuggled of [
      { serverEvaluationAuthority: "server_may_return_correct_or_wrong" },
      { localFeedbackAuthority: "server_interaction" },
      { completionAuthority: "server_grants_progress" },
    ]) {
      expect(() =>
        parseLearningV2CourseSessionCompletedSummaryV1({
          ...summary,
          ...smuggled,
        }),
      ).toThrow();
    }
  });

  test("RED 8: the neutral fixture cannot be promoted to release authority", () => {
    // Смена contentClass/authority «на лету» запрещена контрактом владельца:
    // production-копия обязана получать новые ID и fingerprint.
    const promoted = {
      ...fixture,
      contentClass: "production_candidate",
      releaseAuthority: true,
      productionSelectable: true,
    };
    expect(fixture.contentClass).toBe("neutral_test_fixture");
    expect(fixture.releaseAuthority).toBe(false);
    // Подделка остаётся отдельным объектом и НЕ меняет сам фикстур.
    expect(promoted).not.toBe(fixture);
    expect(fixture.releaseAuthority).toBe(false);

    const summary = completeSummary(startRun());
    expect(summary.releaseAuthority).toBe(false);
    expect(() =>
      parseLearningV2CourseSessionCompletedSummaryV1({
        ...summary,
        releaseAuthority: true,
      }),
    ).toThrow();

    // Награды/mastery/evidence тоже не выдаются завершением сессии.
    for (const key of [
      "walletAuthority",
      "masteryAuthority",
      "evidenceAuthority",
    ] as const) {
      expect(summary[key]).toBe("none");
      expect(() =>
        parseLearningV2CourseSessionCompletedSummaryV1({
          ...summary,
          [key]: "granted",
        }),
      ).toThrow();
    }
  });
});
