import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const workOrderHandle = Object.freeze({ private: "work-order" });
const batchHandle = Object.freeze({ private: "audio-batch" });
let omitLast = false;

const items = Object.freeze(
  Array.from({ length: 12 }, (_, index) => {
    const ordinal = index + 1;
    return Object.freeze({
      sessionOrdinal: ordinal,
      sessionId: `session-${ordinal}`,
      taskId: `task-${ordinal}`,
      taskVoiceGroupFingerprint: h(["group", ordinal]),
      audioTargetId: h(["target", ordinal]),
      targetFingerprint: h(["target-body", ordinal]),
      inputKind: "word" as const,
      wordId: h(["word", ordinal]),
      wordOrdinal: 1,
      voiceId: "ash" as const,
      generationTargetFingerprint: h(["generation", ordinal]),
      itemFingerprint: h(["item", ordinal]),
    });
  }),
);
const objects = Object.freeze(
  items.map((item, index) => {
    const contentHash = h(["audio", index]);
    return Object.freeze({
      generationTargetFingerprint: item.generationTargetFingerprint,
      itemFingerprint: item.itemFingerprint,
      voiceId: item.voiceId,
      inputKind: item.inputKind,
      wordOrdinal: item.wordOrdinal,
      codecRulesFingerprint: h("codec-rules"),
      codecResultFingerprint: h(["codec-result", index]),
      pin: Object.freeze({
        objectPath: `learning-v2/voice-audio/${contentHash}.mp3`,
        contentHash,
        objectGeneration: "7",
        byteSize: 100 + index,
        contentType: "audio/mpeg" as const,
      }),
      objectFingerprint: h(["object", index]),
    });
  }),
);
const work = Object.freeze({
  plan,
  summary: Object.freeze({
    planFingerprint: plan.planFingerprint,
    stageId: "voice-stage-1",
    episodeId: "episode-1",
    candidateFingerprint: h("candidate"),
    packageFingerprint: h("package"),
    workOrderFingerprint: h("work-order"),
    profileObservationAggregateFingerprint: h("profiles"),
  }),
  items,
  packageValue: Object.freeze({
    sessionShards: Object.freeze(
      Array.from({ length: 12 }, (_, index) =>
        Object.freeze({
          sessionOrdinal: index + 1,
          sessionId: `session-${index + 1}`,
        }),
      ),
    ),
  }),
});

jest.mock("./v2_voice_tts_work_order_v1", () => ({
  resolveV2VoiceTtsWorkOrderMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
  }) => {
    if (
      input.handle !== workOrderHandle ||
      input.plan !== plan ||
      input.stageId !== "voice-stage-1"
    )
      throw new Error("test_work_order_invalid");
    return work;
  },
}));
jest.mock("./v2_firebase_voice_audio_persistence_v1", () => ({
  resolveV2FirebaseVoiceAudioBatchMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
  }) => {
    if (
      input.handle !== batchHandle ||
      input.plan !== plan ||
      input.stageId !== "voice-stage-1"
    )
      throw new Error("test_batch_invalid");
    const selected = omitLast ? objects.slice(0, -1) : objects;
    return Object.freeze({
      plan,
      stageId: "voice-stage-1",
      summary: Object.freeze({
        workOrderFingerprint: work.summary.workOrderFingerprint,
        totalWorkItemCount: 12,
        batchStartIndex: 0,
        batchItemCount: selected.length,
      }),
      objects: Object.freeze(selected),
    });
  },
}));

// Jest hoists both private-handle mocks before this import.
// eslint-disable-next-line import/first
import {
  isV2VoiceAudioManifestV1,
  materializeV2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";

describe("Learning V2 complete voice audio manifest", () => {
  beforeEach(() => {
    omitLast = false;
  });

  it("proves gap-free 12-session coverage without granting stored authority", () => {
    const manifest = materializeV2VoiceAudioManifestV1({
      plan: plan as never,
      stageId: "voice-stage-1",
      workOrderHandle: workOrderHandle as never,
      batchHandles: Object.freeze([batchHandle as never]),
    });
    expect(isV2VoiceAudioManifestV1(manifest)).toBe(true);
    expect(manifest.sessionCount).toBe(12);
    expect(manifest.generationTargetCount).toBe(12);
    expect(manifest.audioObjectCount).toBe(12);
    expect(manifest.sessionManifests[0]!.entries[0]).toMatchObject({
      codecRulesFingerprint: h("codec-rules"),
      codecResultFingerprint: h(["codec-result", 0]),
    });
    expect(manifest.sessionManifests).toHaveLength(12);
    expect(
      manifest.sessionManifests.every((value) => value.itemCount === 1),
    ).toBe(true);
    expect(manifest.audioByteAuthority).toBe("none");
    expect(manifest.artifactStorageAuthority).toBe("none");
    expect(manifest.releaseAuthority).toBe(false);
    expect(isV2VoiceAudioManifestV1({ ...manifest })).toBe(false);
  });

  it("rejects a missing generation target", () => {
    omitLast = true;
    expect(() =>
      materializeV2VoiceAudioManifestV1({
        plan: plan as never,
        stageId: "voice-stage-1",
        workOrderHandle: workOrderHandle as never,
        batchHandles: Object.freeze([batchHandle as never]),
      }),
    ).toThrow("v2_voice_audio_manifest_incomplete");
  });

  it("rejects duplicate batch coverage", () => {
    expect(() =>
      materializeV2VoiceAudioManifestV1({
        plan: plan as never,
        stageId: "voice-stage-1",
        workOrderHandle: workOrderHandle as never,
        batchHandles: Object.freeze([batchHandle, batchHandle] as never),
      }),
    ).toThrow("v2_voice_audio_manifest_batch_count_invalid");
  });
});
