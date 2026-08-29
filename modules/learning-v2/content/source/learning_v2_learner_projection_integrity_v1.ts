import type {
  LearningV2CourseSessionAuxiliaryChildV1,
  LearningV2CourseSessionLearnerChildV1,
} from "../../runtime/course_session_client_children_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../generator_course_contract";
import {
  evaluateLearningV2CourseSessionInteractionV1,
  type LearningV2CourseSessionEvaluatorCapsuleChildV1,
} from "../../runtime/course_session_evaluator_capsule_child_v1";

export type LearningV2LearnerProjectionIntegrityIssueCodeV1 =
  | "single_choice_correct_count_invalid"
  | "single_choice_distractor_count_invalid"
  | "single_choice_options_not_unique"
  | "single_choice_response_ids_not_unique"
  | "single_choice_compound_option_forbidden"
  | "single_choice_wrong_feedback_missing"
  | "single_choice_feedback_target_invalid"
  | "single_choice_wrong_feedback_not_unique"
  | "non_choice_response_feedback_forbidden"
  | "speed_match_pair_count_exceeded"
  | "speed_match_compound_meaning_forbidden";

export interface LearningV2LearnerProjectionIntegrityIssueV1 {
  readonly code: LearningV2LearnerProjectionIntegrityIssueCodeV1;
  readonly interactionId: string;
  readonly message: string;
}

export function evaluateLearningV2LearnerProjectionIntegrityV1(input: {
  readonly learnerChild: LearningV2CourseSessionLearnerChildV1;
  readonly evaluatorCapsuleChild: LearningV2CourseSessionEvaluatorCapsuleChildV1;
  readonly auxiliaryChild: LearningV2CourseSessionAuxiliaryChildV1;
}): Readonly<{ issues: readonly LearningV2LearnerProjectionIntegrityIssueV1[] }> {
  const issues: LearningV2LearnerProjectionIntegrityIssueV1[] = [];
  for (const interaction of input.learnerChild.interactions) {
    const auxiliaryEntry = input.auxiliaryChild.entries.find(
      (entry) => entry.interactionId === interaction.interactionId,
    );
    const responseFeedbackById = auxiliaryEntry?.responseFeedbackById ?? {};
    if (
      interaction.modePayload?.family === "speed_match" &&
      interaction.modePayload.pairGrid.length > 4
    ) {
      issues.push({
        code: "speed_match_pair_count_exceeded",
        interactionId: interaction.interactionId,
        message: `Speed Match may contain at most four pairs; received ${interaction.modePayload.pairGrid.length}.`,
      });
    }
    if (
      interaction.modePayload?.family === "speed_match" &&
      interaction.modePayload.pairGrid.some((pair) =>
        Object.values(pair.meaningByLocale).some((meaning) => meaning.includes("/")),
      )
    ) {
      issues.push({
        code: "speed_match_compound_meaning_forbidden",
        interactionId: interaction.interactionId,
        message: "Each Speed Match meaning must be one atomic label without slash-separated variants.",
      });
    }
    if (interaction.inputMode !== "single_choice") {
      if (Object.keys(responseFeedbackById).length > 0) {
        issues.push({
          code: "non_choice_response_feedback_forbidden",
          interactionId: interaction.interactionId,
          message: "Per-option explanations are allowed only for single-choice interactions.",
        });
      }
      continue;
    }
    const normalized = interaction.responseOptions.map((option) =>
      option.text.normalize("NFKC").trim().toLocaleLowerCase("en"),
    );
    if (new Set(normalized).size !== normalized.length) {
      issues.push({
        code: "single_choice_options_not_unique",
        interactionId: interaction.interactionId,
        message: "Visible response options must be unique.",
      });
    }
    const responseIds = interaction.responseOptions.map((option) => option.responseId);
    if (new Set(responseIds).size !== responseIds.length) {
      issues.push({
        code: "single_choice_response_ids_not_unique",
        interactionId: interaction.interactionId,
        message: "Every visible choice must have its own stable response id.",
      });
    }
    if (interaction.responseOptions.some((option) => option.text.includes("/"))) {
      issues.push({
        code: "single_choice_compound_option_forbidden",
        interactionId: interaction.interactionId,
        message: "Each visible response option must be one atomic answer without slash-separated variants.",
      });
    }
    const acceptedIds = interaction.responseOptions.filter(
      (option) =>
        evaluateLearningV2CourseSessionInteractionV1(
          input.evaluatorCapsuleChild,
          interaction.interactionId,
          { kind: "choice_token", value: option.responseId },
        ).resultCode === "provisional_correct",
    ).map((option) => option.responseId);
    if (acceptedIds.length !== 1) {
      issues.push({
        code: "single_choice_correct_count_invalid",
        interactionId: interaction.interactionId,
        message: `Expected exactly one accepted option; received ${acceptedIds.length}.`,
      });
    }
    if (interaction.responseOptions.length < 4) {
      issues.push({
        code: "single_choice_distractor_count_invalid",
        interactionId: interaction.interactionId,
        message: "A single-choice task requires one correct option and at least three authored distractors.",
      });
    }
    const acceptedSet = new Set(acceptedIds);
    const wrongIds = responseIds.filter((responseId) => !acceptedSet.has(responseId));
    const feedbackIds = Object.keys(responseFeedbackById);
    const missingFeedbackIds = wrongIds.filter((responseId) => {
      const feedback = responseFeedbackById[responseId];
      return !feedback || LEARNING_V2_INTERFACE_LOCALES.some(
        (locale) => !feedback[locale]?.trim(),
      );
    });
    if (missingFeedbackIds.length > 0) {
      issues.push({
        code: "single_choice_wrong_feedback_missing",
        interactionId: interaction.interactionId,
        message: `Every wrong choice needs exact localized feedback; missing ${missingFeedbackIds.join(", ")}.`,
      });
    }
    const wrongIdSet = new Set(wrongIds);
    const invalidFeedbackIds = feedbackIds.filter((responseId) => !wrongIdSet.has(responseId));
    if (invalidFeedbackIds.length > 0) {
      issues.push({
        code: "single_choice_feedback_target_invalid",
        interactionId: interaction.interactionId,
        message: `Feedback may target only visible wrong choices; invalid ${invalidFeedbackIds.join(", ")}.`,
      });
    }
    if (LEARNING_V2_INTERFACE_LOCALES.some((locale) => {
      const copies = wrongIds
        .map((responseId) => responseFeedbackById[responseId]?.[locale]?.normalize("NFKC").trim().toLocaleLowerCase(locale))
        .filter((copy): copy is string => Boolean(copy));
      return new Set(copies).size !== copies.length;
    })) {
      issues.push({
        code: "single_choice_wrong_feedback_not_unique",
        interactionId: interaction.interactionId,
        message: "Each distractor needs its own option-specific explanation in every locale.",
      });
    }
  }
  return Object.freeze({ issues: Object.freeze(issues) });
}
