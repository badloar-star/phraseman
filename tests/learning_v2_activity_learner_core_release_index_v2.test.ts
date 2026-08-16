import {
  buildV2SeasonReleaseRecord,
  v2ManifestHash,
  type V2PublishedSeasonManifestView,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleasePointer,
} from "../modules/learning-v2/content/release_manifest";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../modules/learning-v2/policies/decision_registry";
import { materializeLearningV2ActivityLearnerCoreReleaseIndexV1 } from "../modules/learning-v2/runtime/activity_learner_core_release_index_v1";
import {
  encodeLearningV2ActivityLearnerCoreReleaseIndexV2,
  learningV2ActivitySessionIntroObjectPathV1,
  materializeLearningV2ActivityLearnerCoreReleaseIndexV2,
  parseLearningV2ActivityLearnerCoreReleaseIndexV2,
} from "../modules/learning-v2/runtime/activity_learner_core_release_index_v2";
import { materializeLearningV2ActivitySessionIntroProjectionV1 } from "../modules/learning-v2/runtime/activity_session_intro_projection_v1";

const h = (value: unknown) => hashCanonicalBody(value);

function publishedView(): V2PublishedSeasonManifestView {
  const body: V2SeasonReleaseManifestBody = {
    schemaVersion: "v2-season-release-manifest-body.v1",
    releaseId: "release-1",
    courseReleaseId: "course-release-1",
    seasonId: "season-1",
    seasonRevision: 1,
    seasonContentHash: h("season"),
    studyTarget: "en",
    learnerSourceLocale: "ru",
    releaseScope: "vertical_slice",
    decisionRegistryRef: {
      id: "decision-registry",
      version: 1,
      contentHash: h("registry"),
    },
    supportManifestRefs: [
      {
        platform: "ios",
        environment: "lab",
        minAppVersion: "1.0.0",
        manifestId: "ios",
        contentHash: h("ios"),
      },
      {
        platform: "android",
        environment: "lab",
        minAppVersion: "1.0.0",
        manifestId: "android",
        contentHash: h("android"),
      },
    ],
    voiceNetworkEgressRefs: [],
    lessonUnits: [
      {
        episodeId: "episode-1",
        lessonId: 1,
        object: {
          path: "learning-v2/releases/e1.json",
          generation: "7",
          contentHash: h("lesson"),
          byteSize: 2048,
        },
      },
    ],
  };
  const manifestHash = v2ManifestHash(body);
  const pointer: V2SeasonReleasePointer = {
    schemaVersion: "v2-season-release-pointer.v1",
    pointerId: "lab:en:ru:season-1",
    environment: "lab",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    seasonId: "season-1",
    activeReleaseId: "release-1",
    activeManifestHash: manifestHash,
    rollout: {
      revision: 1,
      state: "internal",
      percent: 0,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
    },
    expectedCatalogRevision: 1,
    updatedBy: "test-owner",
    updatedAt: "2026-08-13T00:00:00.000Z",
  };
  return Object.freeze({
    schemaVersion: "published-v2-season-manifest-view.v1" as const,
    catalogRevision: 1,
    activePointer: Object.freeze(pointer),
    manifestRecord: buildV2SeasonReleaseRecord(
      body,
      {
        path: "learning-v2/releases/manifest.json",
        generation: "8",
        contentHash: manifestHash,
        byteSize: 4096,
      },
      "2026-08-13T00:00:00.000Z",
    ),
    manifestBody: Object.freeze(body),
  });
}

function session(ordinal: number) {
  const sessionId = `episode-1:session:${String(ordinal).padStart(2, "0")}`;
  const sourceFingerprint = h(["source", ordinal]);
  const tasks = Array.from({ length: 12 }, (_, index) => ({
    taskId: `task-${ordinal}-${index + 1}`,
    slot: index + 1,
    purpose: index < 3 ? "intro_comprehension_check" : "supported_practice",
    family: "listen_choose",
    answerExposure: "allowed_after_attempt",
    promptNovelty: "trained",
    inputMode: "single_choice",
    support: "partial",
    hintsAllowed: 2,
    learner: {
      promptId: `prompt-${ordinal}-${index + 1}`,
      prompt: `Visible prompt ${ordinal}-${index + 1}`,
      responseOptions: [
        { responseId: `yes-${ordinal}-${index + 1}`, text: "Yes" },
        { responseId: `no-${ordinal}-${index + 1}`, text: "No" },
      ],
      mediaIds: [],
      audioTargetIds: [],
      accessibilityLabel: `Visible question ${ordinal}-${index + 1}`,
    },
    scriptedAlternate: null,
    runtimeCapabilityId: `runtime-${ordinal}-${index + 1}`,
  }));
  const renderRaw = canonicalJsonV1({
    schemaVersion: "v2-activity-session-render-seed.v2",
    sourceFingerprint,
    episodeId: "episode-1",
    targetLanguage: "en",
    session: {
      sessionId,
      ordinal,
      zone: ordinal <= 4 ? "understand" : ordinal <= 8 ? "use" : "master",
      targetSeconds: 240,
      tasks,
    },
    executionAuthority: "none",
    rewardAuthority: "none",
    runtimeConsumer: false,
    releaseAuthority: false,
  });
  const capsuleEnvelopeRaw = canonicalJsonV1({
    schemaVersion: "v2-activity-session-capsule-envelope.v1",
    sourceFingerprint,
    episodeId: "episode-1",
    sessionId,
    sessionOrdinal: ordinal,
    normalizationLocale: "en",
    normalizationProfileHash: h("normalization"),
    capsules: Array.from({ length: 12 }, (_, index) =>
      canonicalJsonV1({ capsule: `${ordinal}-${index + 1}` }),
    ),
    commitmentAggregate: h(["commitment", ordinal]),
    consumer: "app_internal_local_evaluator_only",
    verdictAuthority: "local_provisional_only",
  });
  const renderHash = sha256Utf8(renderRaw);
  const capsuleHash = sha256Utf8(capsuleEnvelopeRaw);
  const prefix = `learning-v2/canonical/activity-instances/${sha256Utf8("stage-activity-1")}/sessions/${String(ordinal).padStart(2, "0")}`;
  const intro = materializeLearningV2ActivitySessionIntroProjectionV1({
    contentClass: "production_candidate",
    introId: `intro-${ordinal}`,
    introFingerprint: h(["intro", ordinal]),
    sourceSubjectFingerprint: h(["subject", ordinal]),
    episodeId: "episode-1",
    sessionId,
    sessionOrdinal: ordinal,
    targetLanguage: "en",
    title: `Intro ${ordinal}`,
    pages: tasks.slice(0, 3).map((task, index) => ({
      pageOrdinal: (index + 1) as 1 | 2 | 3,
      conceptId: `concept-${ordinal}-${index + 1}`,
      heading: `Heading ${index + 1}`,
      explanation: `Explanation ${ordinal}-${index + 1}`,
      question: {
        taskId: task.taskId,
        taskSlot: (index + 1) as 1 | 2 | 3,
        questionId: `question-${ordinal}-${index + 1}`,
        coveredConceptIds: [`concept-${ordinal}-${index + 1}`],
        learnerSurfaceFingerprint: h({
          taskId: task.taskId,
          promptId: task.learner.promptId,
          prompt: task.learner.prompt,
          responseOptions: task.learner.responseOptions,
          accessibilityLabel: task.learner.accessibilityLabel,
        }),
        promptId: task.learner.promptId,
        prompt: task.learner.prompt,
        responseOptions: task.learner.responseOptions,
        accessibilityLabel: task.learner.accessibilityLabel,
      },
    })),
  });
  const introRaw = canonicalJsonV1(intro);
  const introHash = sha256Utf8(introRaw);
  return {
    sessionId,
    sessionOrdinal: ordinal,
    renderRaw,
    capsuleEnvelopeRaw,
    renderPin: {
      objectPath: `${prefix}/render/${renderHash}.json`,
      contentHash: renderHash,
      objectGeneration: String(100 + ordinal),
      byteSize: utf8ByteLengthV1(renderRaw),
      contentType: "application/json; charset=utf-8" as const,
    },
    capsulePin: {
      objectPath: `${prefix}/capsule/${capsuleHash}.json`,
      contentHash: capsuleHash,
      objectGeneration: String(200 + ordinal),
      byteSize: utf8ByteLengthV1(capsuleEnvelopeRaw),
      contentType: "application/json; charset=utf-8" as const,
    },
    introRaw,
    intro,
    introPin: {
      objectPath: learningV2ActivitySessionIntroObjectPathV1({
        stageId: "stage-activity-1",
        sessionOrdinal: ordinal,
        projectionFingerprint: intro.projectionFingerprint,
        rawHash: introHash,
      }),
      contentHash: introHash,
      objectGeneration: String(300 + ordinal),
      byteSize: utf8ByteLengthV1(introRaw),
      contentType: "application/json; charset=utf-8" as const,
    },
  };
}

// зачем: раньше урок принимался только целиком, и владелец не мог открыть на
// телефоне то, что уже написано — приложение показывало «Сессия недоступна».
// Число сессий стало параметром, чтобы проверять и полный урок, и неполный.
function build(sessionCount = 12) {
  const sessions = Array.from({ length: sessionCount }, (_, index) =>
    session(index + 1),
  );
  const core = materializeLearningV2ActivityLearnerCoreReleaseIndexV1({
    publishedView: publishedView(),
    expectedEnvironment: "lab",
    episodeId: "episode-1",
    stageId: "stage-activity-1",
    activityPackageFingerprint: h("package"),
    validatorSummaryFingerprint: h("validator"),
    permitAggregateFingerprint: h("permit"),
    childReadbackAggregateFingerprint: h("children"),
    storageReadbackFingerprint: h("storage"),
    sessions: sessions.map((row) => ({
      sessionId: row.sessionId,
      sessionOrdinal: row.sessionOrdinal,
      renderRaw: row.renderRaw,
      capsuleEnvelopeRaw: row.capsuleEnvelopeRaw,
      renderPin: row.renderPin,
      capsulePin: row.capsulePin,
    })),
  });
  return materializeLearningV2ActivityLearnerCoreReleaseIndexV2({
    coreIndexV1: core,
    planFingerprint: h("plan"),
    ownerInputFingerprint: h("owner-input"),
    introAggregateFingerprint: h(
      sessions.map((row) => row.intro.introFingerprint),
    ),
    introProjectionSetFingerprint: h(
      sessions.map((row) => row.intro.projectionFingerprint),
    ),
    ownerConfirmationFingerprint: h("confirmation"),
    sessions,
  });
}

describe("Learning V2 learner-core release index v2", () => {
  it("binds intro + render + capsule for all 12 sessions without upgrading release authority", () => {
    const parsed = parseLearningV2ActivityLearnerCoreReleaseIndexV2(
      encodeLearningV2ActivityLearnerCoreReleaseIndexV2(build()),
    );
    expect(parsed).toMatchObject({
      sessionCount: 12,
      introQuestionCount: 36,
      objectCount: 36,
      introReleaseBinding: "exact_owner_confirmed_projection_to_render_session",
      ownerConfirmationAuthority:
        "none_private_confirmed_owner_handle_required",
      runtimeAuthority: "none_active_pointer_and_readback_required",
      releaseAuthority: false,
    });
    expect(parsed.intros).toHaveLength(12);
  });

  it("rejects a coordinated intro pin or visible-question drift after refingerprinting", () => {
    const original = JSON.parse(
      encodeLearningV2ActivityLearnerCoreReleaseIndexV2(build()),
    );
    const mutations = [
      (value: any) => {
        value.intros[0].intro.objectPath = value.intros[1].intro.objectPath;
      },
      (value: any) => {
        value.intros[0].sessionId = value.intros[1].sessionId;
      },
      (value: any) => {
        value.runtimeAuthority = "active";
      },
    ];
    for (const mutate of mutations) {
      const value = structuredClone(original);
      mutate(value);
      const body = { ...value };
      delete body.indexFingerprint;
      value.indexFingerprint = h(JSON.parse(JSON.stringify(body)));
      const raw = canonicalJsonV1(JSON.parse(JSON.stringify(value)));
      expect(() =>
        parseLearningV2ActivityLearnerCoreReleaseIndexV2(raw),
      ).toThrow("learning_v2_activity_learner_core_release_index_v2_invalid");
    }
  });

  // зачем: владелец не мог проверить курс на телефоне — рантайм требовал урок
  // целиком и отвечал «Сессия недоступна», пока не написана последняя сессия.
  // Владелец (2026-08-16): «РАЗРЕШАТЬ, как мне тестировать». Урок теперь может
  // быть неполным, и это должно оставаться правдой.
  it("accepts a lesson that is still being written", () => {
    for (const sessionCount of [1, 8, 20]) {
      const index = build(sessionCount);
      expect(index.sessionCount).toBe(sessionCount);
      expect(index.intros).toHaveLength(sessionCount);
      // Вопросов ровно втрое больше: по одному внизу каждой страницы интро.
      expect(index.introQuestionCount).toBe(sessionCount * 3);
      expect(index.objectCount).toBe(sessionCount * 3);
      // Неполнота не даёт лишних прав: релизом это по-прежнему не является.
      expect(index.releaseAuthority).toBe(false);
      const reparsed = parseLearningV2ActivityLearnerCoreReleaseIndexV2(
        canonicalJsonV1(JSON.parse(JSON.stringify(index))),
      );
      expect(reparsed.sessionCount).toBe(sessionCount);
    }
  });

  // зачем: имя ошибки без суффикса v2 — не опечатка. Индекс v1 строится первым
  // и отвергает пустой или слишком длинный урок раньше, чем до него доберётся
  // v2. Важно, что запрет держится, а какой из двух слоёв сработал — деталь.
  it("still refuses an empty lesson", () => {
    expect(() => build(0)).toThrow(
      "learning_v2_activity_learner_core_release_index_invalid",
    );
  });
});
