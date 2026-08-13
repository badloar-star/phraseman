import {
  buildV2LocalEvaluatorCapsuleRawV1,
  createV2LocalEvaluatorCommitmentV1,
  parseV2LocalEvaluatorCapsuleV1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
} from "../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import {
  createLearningV2ActivityAttemptControllerV1,
  LEARNING_V2_ACTIVITY_VOICE_IDS_V1,
} from "../modules/learning-v2/runtime/activity_attempt_controller_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const identity = Object.freeze({
  episodeId: "episode-1",
  sessionId: "session-1",
  sessionOrdinal: 1,
  taskId: "task-1",
  activityId: "activity-1",
  promptId: "prompt-1",
});
const salt = hashCanonicalBody("salt");
const commitment = createV2LocalEvaluatorCommitmentV1({
  capsuleId: "capsule-1",
  taskId: identity.taskId,
  activityId: identity.activityId,
  family: "listen_choose",
  inputKind: "choice_token",
  normalizationLocale: "en-US",
  normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  salt,
  response: "correct-option",
});
const capsule = parseV2LocalEvaluatorCapsuleV1(
  buildV2LocalEvaluatorCapsuleRawV1({
    capsuleId: "capsule-1",
    taskId: identity.taskId,
    activityId: identity.activityId,
    family: "listen_choose",
    inputKind: "choice_token",
    normalizationLocale: "en-US",
    normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
    salt,
    acceptedCommitments: [commitment],
  }),
);

function controller(reducedMotion = false) {
  return createLearningV2ActivityAttemptControllerV1({
    identity,
    capsuleHandle: capsule,
    voiceSelectionIndex: 2,
    fullPhraseAudioTargetId: "audio-full",
    selectableAudioTargets: {
      "word-one": { audioTargetId: "audio-full", wordId: "word-one" },
      "word-two": { audioTargetId: "audio-full", wordId: "word-two" },
    },
    savablePhraseRef: "phrase-1",
    reportContextRef: "report-context-1",
    reducedMotion,
    holdToTalkEnabled: true,
    resolveWrongExplanation: ({ errorOrdinal }) => ({
      explanationRef: "error-explanation-1",
      localizedText: `Explanation after error ${errorOrdinal}`,
    }),
  });
}

describe("Learning V2 activity attempt controller", () => {
  it("rejects prototype-reserved selectable identifiers", () => {
    expect(() =>
      createLearningV2ActivityAttemptControllerV1({
        identity,
        capsuleHandle: capsule,
        voiceSelectionIndex: 0,
        fullPhraseAudioTargetId: "audio-full",
        selectableAudioTargets: JSON.parse(
          '{"__proto__":{"audioTargetId":"audio-full","wordId":"word-one"}}',
        ),
        savablePhraseRef: "phrase-1",
        reportContextRef: "report-context-1",
        reducedMotion: false,
        holdToTalkEnabled: true,
        resolveWrongExplanation: () => ({
          explanationRef: "error-explanation-1",
          localizedText: "Explanation",
        }),
      }),
    ).toThrow("learning_v2_activity_attempt_controller_invalid");
  });

  it("uses one voice for every selected word and the full phrase", () => {
    const value = controller();
    expect(LEARNING_V2_ACTIVITY_VOICE_IDS_V1).toEqual([
      "ash",
      "onyx",
      "nova",
      "coral",
    ]);
    expect(value.selectAudioTarget("word-one")).toMatchObject({
      kind: "play_audio",
      audioTargetId: "audio-full",
      wordId: "word-one",
      voiceId: "nova",
    });
    expect(value.selectAudioTarget("word-two")).toMatchObject({
      voiceId: "nova",
    });
    expect(value.playFullPhrase()).toMatchObject({
      voiceId: "nova",
      source: "full_phrase",
    });
  });

  it("does not select or frame the first wrong answer and explains the second", () => {
    const value = controller();
    const first = value.evaluateResponse({
      response: { kind: "choice_token", value: "wrong-one" },
      feedbackTargetId: "option-one",
    });
    expect(first).toEqual({
      kind: "wrong_feedback",
      targetId: "option-one",
      motion: "transparent_nudge",
      showRedFrame: false,
      commitSelection: false,
      errorOrdinal: 1,
      explanation: null,
    });
    expect(
      value.evaluateResponse({
        response: { kind: "choice_token", value: "wrong-two" },
        feedbackTargetId: "option-two",
      }),
    ).toMatchObject({
      kind: "wrong_feedback",
      showRedFrame: false,
      commitSelection: false,
      errorOrdinal: 2,
      explanation: {
        explanationRef: "error-explanation-1",
        localizedText: "Explanation after error 2",
      },
    });
    expect(value.getSnapshot().learningErrorCount).toBe(2);
  });

  it("plays the selected word immediately but commits it only when evaluation is correct", () => {
    const value = controller();
    expect(
      value.attemptSelection({
        selectableId: "word-one",
        response: { kind: "choice_token", value: "wrong-one" },
        feedbackTargetId: "word-one",
      }),
    ).toEqual({
      effects: [
        {
          kind: "play_audio",
          audioTargetId: "audio-full",
          wordId: "word-one",
          voiceId: "nova",
          source: "selected_word_or_chip",
        },
        {
          kind: "wrong_feedback",
          targetId: "word-one",
          motion: "transparent_nudge",
          showRedFrame: false,
          commitSelection: false,
          errorOrdinal: 1,
          explanation: null,
        },
      ],
      commitSelection: false,
    });
    expect(
      value.attemptSelection({
        selectableId: "word-two",
        response: { kind: "choice_token", value: "correct-option" },
        feedbackTargetId: "word-two",
      }),
    ).toMatchObject({
      effects: [
        { kind: "play_audio", voiceId: "nova" },
        { kind: "provisional_correct", commitSelection: true },
      ],
      commitSelection: true,
    });
  });

  it("uses crossfade for reduced motion and technical invalid stays neutral", () => {
    const value = controller(true);
    expect(
      value.evaluateResponse({
        response: { kind: "choice_token", value: "wrong" },
        feedbackTargetId: "option-one",
      }),
    ).toMatchObject({ motion: "reduced_motion_crossfade" });
    expect(
      value.evaluateResponse({
        response: { kind: "text", value: "wrong-kind" },
        feedbackTargetId: "option-one",
      }),
    ).toMatchObject({
      kind: "technical_invalid",
      freeRetry: true,
      learningErrorCountChanged: false,
    });
    expect(value.getSnapshot().learningErrorCount).toBe(1);
  });

  it("exposes compact Report, Save and accessible tap/optional hold voice commands", () => {
    const value = controller();
    expect(value.getSnapshot()).toMatchObject({
      compactActions: ["report", "save", "voice"],
      networkAuthority: "none_local_attempt_controller",
      walletAuthority: "none",
    });
    expect(value.invokeCompactAction("report")).toMatchObject({
      kind: "open_report",
      reportContextRef: "report-context-1",
    });
    expect(value.invokeCompactAction("save")).toMatchObject({
      kind: "save_phrase",
      savablePhraseRef: "phrase-1",
    });
    expect(value.tapVoiceControl()).toEqual({
      kind: "voice_control",
      command: "start",
      interaction: "tap",
    });
    expect(value.tapVoiceControl()).toEqual({
      kind: "voice_control",
      command: "stop",
      interaction: "tap",
    });
    expect(value.holdVoiceControl("press_in")).toMatchObject({
      command: "start",
      interaction: "hold",
    });
    expect(value.holdVoiceControl("press_out")).toMatchObject({
      command: "stop",
      interaction: "hold",
    });
  });

  it("commits only a provisional correct result with no economy authority", () => {
    expect(
      controller().evaluateResponse({
        response: { kind: "choice_token", value: "correct-option" },
        feedbackTargetId: "option-one",
      }),
    ).toMatchObject({
      kind: "provisional_correct",
      commitSelection: true,
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
    });
  });
});
