import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { V2_REQUIRED_VOICE_IDS } from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";
import {
  V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1,
  V2_VOICE_WORD_VARIANT_MAX_BYTES_V1,
} from "./v2_voice_profile_contracts_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const authenticatedHandle = Object.freeze({ private: "authenticated-input" });
let sourceKind: "phrase_builder_response_option" | "learner_audio_target" =
  "phrase_builder_response_option";

function material() {
  const audioTargetId = h("target");
  const wordId = h("word");
  const taskVoiceGroupFingerprint = h("voice-group");
  const targetFingerprint = h("target-body");
  const variants = V2_REQUIRED_VOICE_IDS.map((voiceId) =>
    Object.freeze({
      voiceId,
      taskVoiceGroupFingerprint,
      fullUtteranceGenerationTargetFingerprint: h(["phrase", voiceId]),
      words: Object.freeze([
        Object.freeze({
          wordId,
          wordOrdinal: 1,
          sourceWordHash: h("word-source"),
          voiceId,
          generationTargetFingerprint: h(["word", voiceId]),
        }),
      ]),
    }),
  );
  const catalogTarget = Object.freeze({
    audioTargetId,
    taskId: "task-1",
    sourceHash: h("source"),
    taskVoiceGroupFingerprint,
    wordCount: 1,
    sourceRef:
      sourceKind === "phrase_builder_response_option"
        ? Object.freeze({
            kind: "phrase_builder_response_option" as const,
            responseId: "answer-1",
          })
        : Object.freeze({
            kind: "learner_audio_target" as const,
            learnerAudioTargetId: "learner-audio-1",
          }),
    spokenText: "Hello",
    words: Object.freeze([
      Object.freeze({
        wordId,
        wordOrdinal: 1,
        sourceHash: h("word-source"),
        text: "Hello",
      }),
    ]),
  });
  const authenticatedInput = Object.freeze({
    planFingerprint: plan.planFingerprint,
    workspaceFingerprint: h("workspace"),
    stageId: "voice-stage-1",
    episodeId: "episode-1",
    candidateFingerprint: h("candidate"),
    packageFingerprint: h("package"),
    summaryFingerprint: h("authenticated-summary"),
    profileObservationAggregateFingerprint: h("profile-observations"),
    targetCount: 1,
    wordTargetCount: 1,
    generationTargetCount: 8,
  });
  return Object.freeze({
    summary: authenticatedInput,
    profiles: Object.freeze({
      voiceGenerationProfile: Object.freeze({
        model: "gpt-4o-mini-tts" as const,
        format: "mp3" as const,
        contentType: "audio/mpeg" as const,
        speed: 1 as const,
        maximumBytesPerWordVariant: V2_VOICE_WORD_VARIANT_MAX_BYTES_V1,
      }),
    }),
    packageInputs: Object.freeze({
      catalog: Object.freeze({
        sessions: Object.freeze([
          Object.freeze({
            sessionOrdinal: 1,
            sessionId: "session-1",
            targets: Object.freeze([catalogTarget]),
          }),
        ]),
      }),
    }),
    packageValue: Object.freeze({
      root: Object.freeze({ generationTargetCount: 8 }),
      sessionShards: Object.freeze([
        Object.freeze({
          sessionOrdinal: 1,
          sessionId: "session-1",
          targets: Object.freeze([
            Object.freeze({
              audioTargetId,
              taskId: "task-1",
              sourceHash: h("source"),
              taskVoiceGroupFingerprint,
              wordCount: 1,
              targetFingerprint,
              variants: Object.freeze(variants),
            }),
          ]),
        }),
      ]),
    }),
  });
}

jest.mock("./v2_firebase_voice_targets_authenticated_input_v1", () => ({
  resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
  }) => {
    if (
      input.handle !== authenticatedHandle ||
      input.plan !== plan ||
      input.stageId !== "voice-stage-1"
    )
      throw new Error("test_authenticated_input_invalid");
    return material();
  },
}));

// Jest hoists the private authenticated-input mock before this import.
// eslint-disable-next-line import/first
import {
  getV2VoiceTtsWorkOrderSummaryV1,
  isV2VoiceTtsWorkOrderHandleV1,
  materializeV2VoiceTtsWorkOrderV1,
  resolveV2VoiceTtsWorkOrderMaterialV1,
} from "./v2_voice_tts_work_order_v1";

describe("Learning V2 private TTS work order", () => {
  beforeEach(() => {
    sourceKind = "phrase_builder_response_option";
  });

  it("creates full-utterance and separately tappable word work for all four voices", () => {
    const handle = materializeV2VoiceTtsWorkOrderV1({
      authenticatedInputHandle: authenticatedHandle as never,
      plan: plan as never,
      stageId: "voice-stage-1",
    });
    const summary = getV2VoiceTtsWorkOrderSummaryV1(handle);
    const work = resolveV2VoiceTtsWorkOrderMaterialV1({
      handle,
      plan: plan as never,
      stageId: "voice-stage-1",
    });
    expect(isV2VoiceTtsWorkOrderHandleV1(handle)).toBe(true);
    expect(summary.workItemCount).toBe(8);
    expect(summary.executionDisposition).toBe(
      "eligible_for_guarded_tts_execution",
    );
    expect(summary.providerExecutionAuthority).toBe("none");
    expect(summary.audioByteAuthority).toBe("none");
    expect(work.items.filter((item) => item.inputKind === "word")).toHaveLength(
      4,
    );
    expect(
      work.items
        .filter((item) => item.inputKind === "word")
        .map((item) => item.voiceId),
    ).toEqual(["ash", "onyx", "nova", "coral"]);
    expect(
      new Set(work.items.map((item) => item.taskVoiceGroupFingerprint)).size,
    ).toBe(1);
    expect(work.items[0]?.instructions).toBe(
      V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1.body.instructions,
    );
  });

  it("keeps unverified learner-audio declarations blocked from provider execution", () => {
    sourceKind = "learner_audio_target";
    const handle = materializeV2VoiceTtsWorkOrderV1({
      authenticatedInputHandle: authenticatedHandle as never,
      plan: plan as never,
      stageId: "voice-stage-1",
    });
    const summary = getV2VoiceTtsWorkOrderSummaryV1(handle);
    expect(summary.executionDisposition).toBe(
      "blocked_unverified_spoken_source",
    );
    expect(summary.blockingIssueCodes).toEqual([
      "v2_voice_tts_unverified_spoken_source",
    ]);
    expect(summary.providerExecutionAuthority).toBe("none");
  });

  it("rejects clones and cross-stage material resolution", () => {
    const handle = materializeV2VoiceTtsWorkOrderV1({
      authenticatedInputHandle: authenticatedHandle as never,
      plan: plan as never,
      stageId: "voice-stage-1",
    });
    expect(isV2VoiceTtsWorkOrderHandleV1({ ...handle })).toBe(false);
    expect(() =>
      resolveV2VoiceTtsWorkOrderMaterialV1({
        handle,
        plan: plan as never,
        stageId: "voice-stage-2",
      }),
    ).toThrow("v2_voice_tts_work_order_handle_invalid");
  });
});
