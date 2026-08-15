import {
  encodeLearningV2CourseSessionAudioChildV1,
  materializeLearningV2CourseSessionAudioChildV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  getLearningV2CourseSessionAudioReadbackSummaryV1,
  loadLearningV2CourseSessionAudioReadbackV1,
  resolveLearningV2CourseSessionAudioLocalFileV1,
} from "../modules/learning-v2/runtime/course_session_audio_readback_v1";
import { materializeLearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const voices = ["ash", "onyx", "nova", "coral"] as const;

function fixture() {
  const learner = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: "lesson-01:session:01",
    targetLanguage: "en-US",
    interactionProfile: "standard",
    interactions: Array.from({ length: 13 }, (_, index) => ({
      interactionId: `interaction-${index + 4}`,
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
  const files = (kind: string) =>
    voices.map((voiceId) => {
      const contentHash = h([kind, voiceId]);
      return {
        voiceId,
        objectPath: `learning-v2/voice-audio/${h("manifest")}/${h("session")}/${h(kind)}/${contentHash}.mp3`,
        contentHash,
        objectGeneration: "9",
        byteSize: 2_048,
        contentType: "audio/mpeg" as const,
      };
    });
  const child = materializeLearningV2CourseSessionAudioChildV1({
    learner,
    interactions: [
      {
        interactionId: "interaction-4",
        taskVoiceGroupFingerprint: h("group"),
        fullPhraseFiles: files("full"),
        selectables: [
          {
            selectableId: "chip-1",
            audioTargetId: h("target"),
            wordId: h("word"),
            wordOrdinal: 1,
            visibleText: "word1",
            files: files("word"),
          },
        ],
      },
    ],
  });
  return {
    learner,
    child,
    raw: encodeLearningV2CourseSessionAudioChildV1(child),
  };
}

describe("Learning V2 direct session audio generation-pinned readback", () => {
  test("preloads exact files and resolves phrase/chip from the same selected voice", async () => {
    const value = fixture();
    const readExact = jest.fn(async (file) => ({
      fileUri: `file:///cache/${file.contentHash}.mp3`,
      objectGeneration: file.objectGeneration,
      byteSize: file.byteSize,
      contentHash: file.contentHash,
      contentType: file.contentType,
    }));
    const handle = await loadLearningV2CourseSessionAudioReadbackV1({
      learner: value.learner,
      child: value.child,
      childRaw: value.raw,
      reader: { readExact },
    });
    expect(
      getLearningV2CourseSessionAudioReadbackSummaryV1(handle),
    ).toMatchObject({
      localFileCount: 8,
      serverRequestPerPlayback: false,
      answerPayload: "absent",
      correctnessAuthority: "none",
      releaseAuthority: false,
    });
    const phrase = resolveLearningV2CourseSessionAudioLocalFileV1({
      handle,
      interactionId: "interaction-4",
      selectableId: null,
      voiceSelectionIndex: 1,
    });
    const word = resolveLearningV2CourseSessionAudioLocalFileV1({
      handle,
      interactionId: "interaction-4",
      selectableId: "chip-1",
      voiceSelectionIndex: 1,
    });
    expect(phrase?.voiceId).toBe("onyx");
    expect(word?.voiceId).toBe("onyx");
    expect(readExact).toHaveBeenCalledTimes(8);
  });

  test("fails closed on generation/hash/size metadata drift", async () => {
    const value = fixture();
    await expect(
      loadLearningV2CourseSessionAudioReadbackV1({
        learner: value.learner,
        child: value.child,
        childRaw: value.raw,
        reader: {
          readExact: async (file) => ({
            fileUri: `file:///cache/${file.contentHash}.mp3`,
            objectGeneration: "10",
            byteSize: file.byteSize,
            contentHash: file.contentHash,
            contentType: file.contentType,
          }),
        },
      }),
    ).rejects.toThrow("learning_v2_course_session_audio_readback_invalid");
  });
});
