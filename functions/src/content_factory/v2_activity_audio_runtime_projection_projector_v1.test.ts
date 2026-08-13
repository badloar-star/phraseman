import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
let trustedManifest: object;
let trustedCatalog: object;
let trustedPackage: object;

jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === trustedManifest,
}));
jest.mock("./v2_activity_audio_target_catalog_v1", () => ({
  isV2ActivityAudioTargetCatalogV1: (value: unknown) =>
    value === trustedCatalog,
}));
jest.mock("./v2_voice_targets_package_v2", () => ({
  isV2VoiceTargetsPackageV2: (value: unknown) => value === trustedPackage,
}));

// Jest hoists the private-handle predicates before these imports.
// eslint-disable-next-line import/first
import { projectV2ActivityAudioRuntimeSessionV1 } from "./v2_activity_audio_runtime_projection_projector_v1";
// eslint-disable-next-line import/first
import {
  encodeLearningV2ActivityAudioRuntimeProjectionV1,
  getLearningV2ActivitySelectableAudioBindingsV1,
  parseLearningV2ActivityAudioRuntimeProjectionV1,
  selectLearningV2ActivityTaskAudioV1,
} from "../../../modules/learning-v2/runtime/activity_audio_runtime_projection_v1";

const voices = ["ash", "onyx", "nova", "coral"] as const;
const taskId = "task-1";
const groupFingerprint = h("group");
const audioTargetId = h("target");
const wordId = h("word");
const catalogFingerprint = h("catalog");
const packageFingerprint = h("package");

function entry(
  voiceId: (typeof voices)[number],
  kind: "full_utterance" | "word",
) {
  const coordinate = {
    inputKind: kind,
    wordId: kind === "word" ? wordId : null,
    wordOrdinal: kind === "word" ? 1 : null,
  };
  const contentHash = h([voiceId, coordinate]);
  const body = {
    generationTargetFingerprint: h(["generation", voiceId, coordinate]),
    itemFingerprint: h(["item", voiceId, coordinate]),
    taskId,
    taskVoiceGroupFingerprint: groupFingerprint,
    audioTargetId,
    ...coordinate,
    voiceId,
    objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${contentHash}.mp3`,
    contentHash,
    objectGeneration: "9",
    byteSize: 2_048,
    contentType: "audio/mpeg" as const,
    codecRulesFingerprint: h("codec-rules"),
    codecResultFingerprint: h(["codec-result", voiceId, coordinate]),
  };
  return Object.freeze({ ...body, entryFingerprint: h(body) });
}

function fixture() {
  const entries = Object.freeze(
    voices.flatMap((voiceId) => [
      entry(voiceId, "full_utterance"),
      entry(voiceId, "word"),
    ]),
  );
  const catalogTarget = Object.freeze({
    taskId,
    taskVoiceGroupFingerprint: groupFingerprint,
    audioTargetId,
    sourceRef: Object.freeze({
      kind: "phrase_builder_response_option" as const,
      responseId: "chip-one",
    }),
    wordCount: 1,
    words: Object.freeze([Object.freeze({ wordId, wordOrdinal: 1 })]),
  });
  const voiceTarget = Object.freeze({
    taskId,
    taskVoiceGroupFingerprint: groupFingerprint,
    audioTargetId,
    wordCount: 1,
    variants: Object.freeze(
      voices.map((voiceId) =>
        Object.freeze({
          voiceId,
          words: Object.freeze([Object.freeze({ wordId, wordOrdinal: 1 })]),
        }),
      ),
    ),
  });
  trustedCatalog = Object.freeze({
    catalogFingerprint,
    sessions: Object.freeze(
      Array.from({ length: 12 }, (_, index) =>
        Object.freeze({
          sessionOrdinal: index + 1,
          sessionId: `session-${index + 1}`,
          targets: Object.freeze([catalogTarget]),
        }),
      ),
    ),
  });
  trustedPackage = Object.freeze({
    root: Object.freeze({
      artifactFingerprint: packageFingerprint,
      activityAudioCatalogFingerprint: catalogFingerprint,
    }),
    sessionShards: Object.freeze(
      Array.from({ length: 12 }, (_, index) =>
        Object.freeze({
          sessionOrdinal: index + 1,
          sessionId: `session-${index + 1}`,
          targets: Object.freeze([voiceTarget]),
        }),
      ),
    ),
  });
  trustedManifest = Object.freeze({
    episodeId: "episode-1",
    packageFingerprint,
    manifestFingerprint: h("manifest"),
    sessionManifests: Object.freeze(
      Array.from({ length: 12 }, (_, index) =>
        Object.freeze({
          sessionOrdinal: index + 1,
          sessionId: `session-${index + 1}`,
          itemCount: entries.length,
          entries,
          sessionManifestFingerprint: h(["session-manifest", index + 1]),
        }),
      ),
    ),
  });
}

function project() {
  fixture();
  return projectV2ActivityAudioRuntimeSessionV1({
    manifest: trustedManifest as never,
    catalog: trustedCatalog as never,
    voiceTargetsPackage: trustedPackage as never,
    sessionOrdinal: 1,
  });
}

describe("Learning V2 server audio runtime projector", () => {
  it("binds selectable chip to exact per-word audio and survives learner rehydration", () => {
    const learner = parseLearningV2ActivityAudioRuntimeProjectionV1(
      encodeLearningV2ActivityAudioRuntimeProjectionV1(project()),
    );
    expect(learner).toMatchObject({
      episodeId: "episode-1",
      sessionId: "session-1",
      entryCount: 8,
      selectableBindingCount: 1,
      activityAudioCatalogFingerprint: catalogFingerprint,
      voiceTargetsPackageFingerprint: packageFingerprint,
      runtimeAuthority: "none_release_binding_required",
    });
    expect(
      getLearningV2ActivitySelectableAudioBindingsV1(learner, taskId),
    ).toMatchObject([
      {
        selectableId: "chip-one",
        audioTargetId,
        wordId,
        wordOrdinal: 1,
      },
    ]);
    expect(
      selectLearningV2ActivityTaskAudioV1({
        projection: learner,
        taskId,
        voiceId: "coral",
      }),
    ).toHaveLength(2);
  });

  it("rejects clones, package/catalog mismatch and incomplete voice coverage", () => {
    project();
    expect(() =>
      projectV2ActivityAudioRuntimeSessionV1({
        manifest: { ...trustedManifest } as never,
        catalog: trustedCatalog as never,
        voiceTargetsPackage: trustedPackage as never,
        sessionOrdinal: 1,
      }),
    ).toThrow("v2_activity_audio_runtime_projection_projector_invalid");

    trustedPackage = Object.freeze({
      ...(trustedPackage as Record<string, unknown>),
      root: Object.freeze({
        artifactFingerprint: packageFingerprint,
        activityAudioCatalogFingerprint: h("wrong-catalog"),
      }),
    });
    expect(() =>
      projectV2ActivityAudioRuntimeSessionV1({
        manifest: trustedManifest as never,
        catalog: trustedCatalog as never,
        voiceTargetsPackage: trustedPackage as never,
        sessionOrdinal: 1,
      }),
    ).toThrow("v2_activity_audio_runtime_projection_projector_invalid");

    fixture();
    const current = trustedManifest as {
      sessionManifests: readonly Record<string, unknown>[];
    };
    const first = current.sessionManifests[0] as {
      entries: readonly unknown[];
      itemCount: number;
    };
    trustedManifest = Object.freeze({
      ...current,
      sessionManifests: Object.freeze([
        Object.freeze({
          ...first,
          entries: Object.freeze(first.entries.slice(0, -2)),
          itemCount: first.itemCount - 2,
        }),
        ...current.sessionManifests.slice(1),
      ]),
    });
    expect(() =>
      projectV2ActivityAudioRuntimeSessionV1({
        manifest: trustedManifest as never,
        catalog: trustedCatalog as never,
        voiceTargetsPackage: trustedPackage as never,
        sessionOrdinal: 1,
      }),
    ).toThrow("learning_v2_activity_audio_runtime_projection_invalid");
  });
});
