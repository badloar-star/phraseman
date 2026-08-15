import {
  learningV2CourseSessionVoiceResponseV1,
  mergeLearningV2LocalTranscriptV1,
} from "../modules/learning-v2/runtime/course_session_voice_response_v1";
import type { LearningV2CourseSessionPracticeInteractionV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";

const interaction = (
  inputMode: LearningV2CourseSessionPracticeInteractionV1["inputMode"],
): LearningV2CourseSessionPracticeInteractionV1 => ({
  interactionId: "interaction-1",
  ordinal: 4,
  purpose: "supported_practice",
  family:
    inputMode === "single_choice"
      ? "listen_choose"
      : inputMode === "scripted_speech"
        ? "scripted_repeat_compare"
        : "phrase_builder",
  inputMode,
  prompt: "Respond",
  responseOptions: [
    { responseId: "choice-a", text: "Merhaba dünya" },
    { responseId: "choice-b", text: "Güle güle" },
  ],
  mediaIds: [],
  audioTargetIds: [],
  accessibilityLabel: "Respond",
  scriptedAlternate: null,
});

test("maps a spoken visible choice to its local choice token without answer data", () => {
  expect(
    learningV2CourseSessionVoiceResponseV1(
      interaction("single_choice"),
      "MERHABA, DÜNYA!",
      "tr-TR",
    ),
  ).toEqual({ kind: "choice_token", value: "choice-a" });
  expect(
    learningV2CourseSessionVoiceResponseV1(
      interaction("single_choice"),
      "not a visible option",
      "tr-TR",
    ),
  ).toEqual({ kind: "choice_token", value: null });
});

test("keeps phrase and scripted speech as local text-only responses", () => {
  expect(
    learningV2CourseSessionVoiceResponseV1(
      interaction("ordered_tokens"),
      "  Jestem tutaj  ",
      "pl-PL",
    ),
  ).toEqual({ kind: "text", value: "Jestem tutaj" });
  expect(
    learningV2CourseSessionVoiceResponseV1(
      interaction("scripted_speech"),
      "Tôi đang ở đây",
      "vi-VN",
    ),
  ).toEqual({ kind: "transcript", value: "Tôi đang ở đây" });
});

test("merges cumulative and segmented Unicode transcripts without dropping repeated words", () => {
  expect(
    mergeLearningV2LocalTranscriptV1("Dzień", "Dzień dobry", "pl-PL"),
  ).toBe("Dzień dobry");
  expect(
    mergeLearningV2LocalTranscriptV1("Tôi muốn", "muốn cà phê", "vi-VN"),
  ).toBe("Tôi muốn cà phê");
  expect(mergeLearningV2LocalTranscriptV1("çok", "çok güzel", "tr-TR")).toBe(
    "çok güzel",
  );
});
