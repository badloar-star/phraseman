import {
  encodeLearningV2CourseSessionAudioChildV1,
  materializeLearningV2CourseSessionAudioChildV1,
} from "../../../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  encodeLearningV2CourseSessionAudioReleaseExtensionV1,
  learningV2CourseSessionAudioReleaseExtensionObjectPathV1,
  materializeLearningV2CourseSessionAudioReleaseExtensionV1,
} from "../../../modules/learning-v2/runtime/course_session_audio_release_extension_v1";
import { materializeLearningV2CourseSessionLearnerChildV1 } from "../../../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1,
  materializeLearningV2CourseSessionReleasePackageV1,
} from "../../../modules/learning-v2/runtime/course_session_release_package_v1";
import {
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type {
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  createV2CourseReleasedSessionAdapterV3,
  getV2CourseReleasedSessionSummaryV3,
  isV2CourseReleasedSessionHandleV3,
  resolveV2CourseReleasedSessionLearnerMaterialV3,
} from "./v2_course_released_session_adapter_v3";

const mockIsActive = jest.fn();
const mockResolveActive = jest.fn();
const mockLoadBase = jest.fn();

jest.mock("./v2_unified_course_release_repository_v3", () => ({
  isV2UnifiedCourseReleaseActiveHandleV3: (value: unknown) =>
    mockIsActive(value),
  resolveV2UnifiedCourseReleaseActiveMaterialV3: (value: unknown) =>
    mockResolveActive(value),
}));

jest.mock("./v2_course_released_session_adapter_v2", () => ({
  loadV2CourseReleasedSessionBaseMaterialV2: (value: unknown) =>
    mockLoadBase(value),
}));

const h = (value: unknown) => hashCanonicalBody(value);
const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const localized = (value: string) =>
  Object.freeze(
    Object.fromEntries(locales.map((locale) => [locale, `${value} ${locale}`])),
  ) as Record<(typeof locales)[number], string>;

class MemoryStorage implements V2RepositoryImmutableStoragePortV1 {
  readonly values = new Map<
    string,
    { bytes: Uint8Array; metadata: V2RepositoryImmutableObjectMetadataV1 }
  >();

  async readMetadataExact(path: string) {
    return this.values.get(path)?.metadata ?? null;
  }

  async createExact() {
    return { kind: "precondition_failed" as const };
  }

  async downloadGenerationExact(input: {
    objectPath: string;
    ifGenerationMatch: string;
  }) {
    const value = this.values.get(input.objectPath);
    if (!value) return { kind: "not_found" as const };
    if (value.metadata.generation !== input.ifGenerationMatch)
      return { kind: "generation_mismatch" as const };
    return { kind: "downloaded" as const, bytes: new Uint8Array(value.bytes) };
  }

  async quarantineConflict() {}

  put(path: string, raw: string, generation: string) {
    const bytes = new TextEncoder().encode(raw);
    this.values.set(path, {
      bytes,
      metadata: {
        generation,
        byteSize: bytes.byteLength,
        contentType: "application/json; charset=utf-8",
        contentHash: sha256Utf8(raw),
      },
    });
  }
}

function fixture() {
  const interactionIds = Array.from(
    { length: 16 },
    (_, index) => `interaction-${index + 1}`,
  );
  const learner = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: "lesson-01:session:01",
    targetLanguage: "en-US",
    interactionProfile: "standard",
    interactions: interactionIds.slice(3).map((interactionId, index) => ({
      interactionId,
      ordinal: index + 4,
      purpose: "supported_practice" as const,
      family: "phrase_builder" as const,
      inputMode: "ordered_tokens" as const,
      prompt: `Neutral ${index + 1}`,
      responseOptions: [
        { responseId: `chip-${index + 1}`, text: `word${index + 1}` },
      ],
      mediaIds: [],
      audioTargetIds: index === 0 ? [h("target")] : [],
      accessibilityLabel: `Neutral ${index + 1}`,
      scriptedAlternate: null,
    })),
  });
  const files = (["ash", "onyx", "nova", "coral"] as const).map((voiceId) => {
    const contentHash = h([voiceId, "word"]);
    return {
      voiceId,
      objectPath: `learning-v2/voice-audio/${h("a")}/${h("b")}/${h("c")}/${contentHash}.mp3`,
      contentHash,
      objectGeneration: "1",
      byteSize: 999,
      contentType: "audio/mpeg" as const,
    };
  });
  const audio = materializeLearningV2CourseSessionAudioChildV1({
    learner,
    interactions: [
      {
        interactionId: "interaction-4",
        taskVoiceGroupFingerprint: h("group"),
        fullPhraseFiles: files,
        selectables: [
          {
            selectableId: "chip-1",
            audioTargetId: h("target"),
            wordId: h("word"),
            wordOrdinal: 1,
            visibleText: "word1",
            files,
          },
        ],
      },
    ],
  });
  const childKinds = [
    "intro",
    "learner",
    "evaluator_capsule",
    "evaluator_sidecar",
    "auxiliary",
  ] as const;
  const sessionPackage = materializeLearningV2CourseSessionReleasePackageV1({
    releaseId: "neutral-release",
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    learningOutcomeKind: "learn",
    learningOutcomeByLocale: localized("Neutral outcome"),
    interactionProfile: "standard",
    interactionIds,
    children: childKinds.map((kind) => ({
      kind,
      schemaVersion: LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1[kind],
      artifactFingerprint: h([kind, "artifact"]),
      contentHash: h([kind, "raw"]),
      objectGeneration: "1",
      byteSize: 100,
    })),
  });
  const extension = materializeLearningV2CourseSessionAudioReleaseExtensionV1({
    package: sessionPackage,
    learner,
    audio,
    audioChildObjectGeneration: "7",
  });
  const extensionRaw =
    encodeLearningV2CourseSessionAudioReleaseExtensionV1(extension);
  const audioRaw = encodeLearningV2CourseSessionAudioChildV1(audio);
  const extensionPin = Object.freeze({
    objectPath: learningV2CourseSessionAudioReleaseExtensionObjectPathV1({
      releaseId: sessionPackage.releaseId,
      lessonId: sessionPackage.lessonId,
      courseSessionId: sessionPackage.courseSessionId,
      extensionFingerprint: extension.extensionFingerprint,
      rawHash: sha256Utf8(extensionRaw),
    }),
    contentHash: sha256Utf8(extensionRaw),
    objectGeneration: "8",
    byteSize: utf8ByteLengthV1(extensionRaw),
    contentType: "application/json; charset=utf-8" as const,
  });
  const storage = new MemoryStorage();
  storage.put(extensionPin.objectPath, extensionRaw, "8");
  storage.put(extension.audioChildPin.objectPath, audioRaw, "7");
  const activeHandle = Object.freeze({ kind: "opaque-v3-active" });
  const audioIndexFingerprint = h("audio-index");
  const active = Object.freeze({
    root: Object.freeze({
      releaseId: sessionPackage.releaseId,
      rootFingerprint: h("v3-root"),
      baseRootFingerprint: h("v2-root"),
      topologyFingerprint: sessionPackage.topologyFingerprint,
      lessons: Object.freeze([
        Object.freeze({
          lessonId: sessionPackage.lessonId,
          audioIndexFingerprint,
        }),
      ]),
    }),
    baseRoot: Object.freeze({}),
    head: Object.freeze({ headFingerprint: h("v3-head") }),
    audioIndexes: Object.freeze([
      Object.freeze({
        lessonId: sessionPackage.lessonId,
        lessonOrdinal: 1,
        indexFingerprint: audioIndexFingerprint,
        sessions: Object.freeze([
          Object.freeze({
            courseSessionId: sessionPackage.courseSessionId,
            sessionOrdinal: 1,
            basePackageFingerprint: sessionPackage.packageFingerprint,
            baseChildSetFingerprint: sessionPackage.childSetFingerprint,
            learnerFingerprint: learner.learnerFingerprint,
            audioFingerprint: audio.audioFingerprint,
            extensionFingerprint: extension.extensionFingerprint,
            extensionPin,
          }),
        ]),
      }),
    ]),
  });
  const base = Object.freeze({
    summary: Object.freeze({
      lessonIndexFingerprint: h("base-index"),
      packageFingerprint: sessionPackage.packageFingerprint,
      childSetFingerprint: sessionPackage.childSetFingerprint,
    }),
    learnerChild: learner,
  });
  return { storage, activeHandle, active, base, extension, audio };
}

describe("Learning V2 released session v3 audio projection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads exact text and audio without transporting answers or server verdict authority", async () => {
    const value = fixture();
    mockIsActive.mockImplementation((input) => input === value.activeHandle);
    mockResolveActive.mockReturnValue(value.active);
    mockLoadBase.mockResolvedValue(value.base);
    const adapter = createV2CourseReleasedSessionAdapterV3({
      storage: value.storage,
    });
    const handle = await adapter.load({
      activeHandle: value.activeHandle as never,
      lessonOrdinal: 1,
      sessionOrdinal: 1,
    });
    expect(isV2CourseReleasedSessionHandleV3(handle)).toBe(true);
    expect(getV2CourseReleasedSessionSummaryV3(handle)).toMatchObject({
      audioExtensionFingerprint: value.extension.extensionFingerprint,
      audioFingerprint: value.audio.audioFingerprint,
      answerPayload: "absent",
      correctnessAuthority: "local_device_only",
      serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
      evaluatorIsolation: "server_sidecar_not_exposed",
      serverRequestPerPlayback: false,
      completionAuthority: "none",
      releaseAuthority: false,
    });
    expect(
      resolveV2CourseReleasedSessionLearnerMaterialV3(handle),
    ).toMatchObject({
      evaluatorSidecarRawExposed: false,
      answerPayloadExposed: false,
    });
    expect(mockLoadBase).toHaveBeenCalledWith(
      expect.objectContaining({
        activeReleaseBinding:
          "exact_v3_composite_head_base_root_lesson_index_session_package_join",
      }),
    );
  });

  test("rejects a copied active handle before any storage read", async () => {
    const value = fixture();
    mockIsActive.mockReturnValue(false);
    const adapter = createV2CourseReleasedSessionAdapterV3({
      storage: value.storage,
    });
    await expect(
      adapter.load({
        activeHandle: { ...value.activeHandle } as never,
        lessonOrdinal: 1,
        sessionOrdinal: 1,
      }),
    ).rejects.toThrow("v2_course_released_session_v3_active_handle_invalid");
    expect(mockLoadBase).not.toHaveBeenCalled();
  });

  test("rejects audio metadata drift before parsing bytes", async () => {
    const value = fixture();
    mockIsActive.mockImplementation((input) => input === value.activeHandle);
    mockResolveActive.mockReturnValue(value.active);
    mockLoadBase.mockResolvedValue(value.base);
    const firstPath =
      value.active.audioIndexes[0].sessions[0].extensionPin.objectPath;
    const stored = value.storage.values.get(firstPath)!;
    value.storage.values.set(firstPath, {
      ...stored,
      metadata: { ...stored.metadata, generation: "999" },
    });
    const adapter = createV2CourseReleasedSessionAdapterV3({
      storage: value.storage,
    });
    await expect(
      adapter.load({
        activeHandle: value.activeHandle as never,
        lessonOrdinal: 1,
        sessionOrdinal: 1,
      }),
    ).rejects.toThrow(
      "v2_course_released_session_v3_audio_extension_metadata_mismatch",
    );
  });
});
