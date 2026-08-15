import {
  encodeLearningV2CourseSessionAudioChildV1,
  learningV2CourseSessionInteractionVoiceIndexV1,
  materializeLearningV2CourseSessionAudioChildV1,
  parseLearningV2CourseSessionAudioChildV1,
  selectLearningV2CourseSessionInteractionAudioV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import { materializeLearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);

function learner() {
  return materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: "lesson-01:session:01",
    targetLanguage: "en-US",
    interactionProfile: "standard",
    interactions: Array.from({ length: 13 }, (_, index) => ({
      interactionId: `interaction-${index + 4}`,
      ordinal: index + 4,
      purpose: "supported_practice" as const,
      family: "phrase_builder" as const,
      inputMode: "ordered_tokens" as const,
      prompt: `Build neutral phrase ${index + 1}`,
      responseOptions: [
        { responseId: `word-${index + 1}-a`, text: `Word${index + 1}` },
        { responseId: `word-${index + 1}-b`, text: `chip${index + 1}` },
      ],
      mediaIds: [],
      audioTargetIds: index === 0 ? [h("target-a"), h("target-b")] : [],
      accessibilityLabel: `Build neutral phrase ${index + 1}`,
      scriptedAlternate: null,
    })),
  });
}

function file(voiceId: "ash" | "onyx" | "nova" | "coral", suffix: string) {
  const contentHash = h([voiceId, suffix]);
  return {
    voiceId,
    objectPath: `learning-v2/voice-audio/${h("manifest")}/${h("session")}/${h(suffix)}/${contentHash}.mp3`,
    contentHash,
    objectGeneration: "1",
    byteSize: 1_024,
    contentType: "audio/mpeg" as const,
  };
}

const fourFiles = (suffix: string) =>
  (["ash", "onyx", "nova", "coral"] as const).map((voiceId) =>
    file(voiceId, suffix),
  );

function material() {
  const childLearner = learner();
  return {
    childLearner,
    child: materializeLearningV2CourseSessionAudioChildV1({
      learner: childLearner,
      interactions: [
        {
          interactionId: "interaction-4",
          taskVoiceGroupFingerprint: h("group"),
          fullPhraseFiles: fourFiles("full"),
          selectables: [
            {
              selectableId: "word-1-a",
              audioTargetId: h("target-a"),
              wordId: h("word-a"),
              wordOrdinal: 1,
              visibleText: "Word1",
              files: fourFiles("word-a"),
            },
            {
              selectableId: "word-1-b",
              audioTargetId: h("target-b"),
              wordId: h("word-b"),
              wordOrdinal: 2,
              visibleText: "chip1",
              files: fourFiles("word-b"),
            },
          ],
        },
      ],
    }),
  };
}

describe("Learning V2 direct course-session audio child", () => {
  test("binds exact visible chips and four local variants without any answer authority", () => {
    const { child, childLearner } = material();
    const raw = encodeLearningV2CourseSessionAudioChildV1(child);
    expect(parseLearningV2CourseSessionAudioChildV1(raw, childLearner)).toEqual(
      child,
    );
    expect(child).toMatchObject({
      courseSessionId: "lesson-01:session:01",
      learnerFingerprint: childLearner.learnerFingerprint,
      variantsPerAudioCoordinate: 4,
      serverRequestPerPlayback: false,
      remoteTtsFallbackDuringSession: false,
      answerPayload: "absent_by_exact_schema",
      correctnessAuthority: "none",
      releaseAuthority: false,
    });
  });

  test("one selected voice is reused for full phrase and every tapped word", () => {
    const { child } = material();
    const selection = selectLearningV2CourseSessionInteractionAudioV1({
      child,
      interactionId: "interaction-4",
      voiceSelectionIndex: 2,
    });
    expect(selection.voiceId).toBe("nova");
    expect(selection.fullPhraseFile?.voiceId).toBe("nova");
    expect(Object.values(selection.selectableFiles)).toHaveLength(2);
    expect(
      Object.values(selection.selectableFiles).every(
        (entry) => entry.voiceId === "nova",
      ),
    ).toBe(true);
  });

  test("selects one deterministic shuffled-cycle voice when the interaction starts", () => {
    const input = {
      sessionRunId: "run-neutral-1",
      courseSessionId: "lesson-01:session:01",
    };
    const cycle = Array.from({ length: 8 }, (_, index) =>
      learningV2CourseSessionInteractionVoiceIndexV1({
        ...input,
        interactionOrdinal: index + 1,
      }),
    );
    expect(new Set(cycle.slice(0, 4))).toEqual(new Set([0, 1, 2, 3]));
    expect(cycle.slice(4)).toEqual(cycle.slice(0, 4));
    expect(
      learningV2CourseSessionInteractionVoiceIndexV1({
        ...input,
        interactionOrdinal: 1,
      }),
    ).toBe(cycle[0]);
  });

  test("rejects visible-text drift, voice substitution and canonical unknown fields", () => {
    const { child, childLearner } = material();
    const raw = encodeLearningV2CourseSessionAudioChildV1(child);
    const decoded = JSON.parse(raw);
    decoded.interactions[0].selectables[0].visibleTextHash = h("Wrong word");
    decoded.interactions[0].selectables[0].selectableFingerprint = h(
      decoded.interactions[0].selectables[0],
    );
    expect(() =>
      parseLearningV2CourseSessionAudioChildV1(
        canonicalJsonV1(decoded),
        childLearner,
      ),
    ).toThrow("learning_v2_course_session_audio_child_invalid");

    const swapped = JSON.parse(raw);
    swapped.interactions[0].selectables[0].files[0].voiceId = "onyx";
    expect(() =>
      parseLearningV2CourseSessionAudioChildV1(
        canonicalJsonV1(swapped),
        childLearner,
      ),
    ).toThrow("learning_v2_course_session_audio_child_invalid");

    const extra = JSON.parse(raw);
    extra.correctResponse = "forbidden";
    expect(() =>
      parseLearningV2CourseSessionAudioChildV1(
        canonicalJsonV1(extra),
        childLearner,
      ),
    ).toThrow("learning_v2_course_session_audio_child_invalid");
  });
});
