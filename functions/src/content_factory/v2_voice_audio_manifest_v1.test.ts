import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";

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
        objectPath: `learning-v2/voice-audio/${plan.planFingerprint}/${h({ stageId: "voice-stage-1" })}/${item.generationTargetFingerprint}/${contentHash}.mp3`,
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
  v2FirebaseVoiceAudioObjectPathV1: (input: {
    planFingerprint: string;
    stageId: string;
    generationTargetFingerprint: string;
    rawSha256: string;
  }) =>
    `learning-v2/voice-audio/${input.planFingerprint}/${h({ stageId: input.stageId })}/${input.generationTargetFingerprint}/${input.rawSha256}.mp3`,
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
  encodeV2VoiceAudioManifestV1,
  isV2VoiceAudioManifestV1,
  materializeV2VoiceAudioManifestV1,
  parseV2VoiceAudioManifestV1,
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
    const raw = encodeV2VoiceAudioManifestV1(manifest);
    const parsed = parseV2VoiceAudioManifestV1(raw);
    expect(parsed).toEqual(manifest);
    expect(isV2VoiceAudioManifestV1(parsed)).toBe(true);
    expect(() => encodeV2VoiceAudioManifestV1(JSON.parse(raw))).toThrow(
      "v2_voice_audio_manifest_handle_invalid",
    );
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

  it("rejects path, one-voice task group, authority and coordinated fingerprint drift on cold parse", () => {
    const manifest = materializeV2VoiceAudioManifestV1({
      plan: plan as never,
      stageId: "voice-stage-1",
      workOrderHandle: workOrderHandle as never,
      batchHandles: Object.freeze([batchHandle as never]),
    });
    const mutate = (mutation: (value: Record<string, unknown>) => void) => {
      const value = JSON.parse(canonicalJsonV1(manifest)) as Record<
        string,
        unknown
      >;
      mutation(value);
      return canonicalJsonV1(value);
    };
    expect(() =>
      parseV2VoiceAudioManifestV1(
        mutate((value) => {
          const sessions = value.sessionManifests as Record<string, unknown>[];
          const entries = sessions[0]!.entries as Record<string, unknown>[];
          entries[0]!.objectPath = "foreign/audio.mp3";
        }),
      ),
    ).toThrow("v2_voice_audio_manifest_entry_invalid");
    expect(() =>
      parseV2VoiceAudioManifestV1(
        mutate((value) => {
          value.audioByteAuthority = "trusted";
        }),
      ),
    ).toThrow("v2_voice_audio_manifest_invalid");
    expect(() =>
      parseV2VoiceAudioManifestV1(
        mutate((value) => {
          value.manifestFingerprint = h("forged");
        }),
      ),
    ).toThrow("v2_voice_audio_manifest_fingerprint_invalid");
  });

  it("rejects hostile depth before canonicalization", () => {
    expect(() =>
      parseV2VoiceAudioManifestV1(`${"[".repeat(1_000)}0${"]".repeat(1_000)}`),
    ).toThrow("v2_voice_audio_manifest_json_complexity_invalid");
  });
});
