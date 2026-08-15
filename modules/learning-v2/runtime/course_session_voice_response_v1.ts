import { normalizeV2LocalEvaluatorResponseV1 } from "./local_evaluator_capsule_v1";
import type { V2LocalEvaluatorResponseV1 } from "./local_evaluator_capsule_v1";
import type { LearningV2CourseSessionPracticeInteractionV1 } from "./course_session_client_children_v1";

/**
 * Converts an on-device transcript into the exact response kind owned by the
 * current interaction. It never needs evaluator commitments or accepted text.
 */
export function learningV2CourseSessionVoiceResponseV1(
  interaction: LearningV2CourseSessionPracticeInteractionV1,
  transcript: string,
  locale: string,
): V2LocalEvaluatorResponseV1 {
  const spoken = transcript.trim();
  if (!spoken) {
    return Object.freeze({
      kind:
        interaction.inputMode === "single_choice"
          ? "choice_token"
          : interaction.inputMode === "scripted_speech"
            ? "transcript"
            : "text",
      value: null,
    });
  }
  if (interaction.inputMode === "single_choice") {
    const normalizedSpoken = normalizeV2LocalEvaluatorResponseV1(
      "text",
      spoken,
      locale,
    );
    if (normalizedSpoken === null)
      return Object.freeze({ kind: "choice_token", value: null });
    const matches = interaction.responseOptions.filter(
      (option) =>
        normalizeV2LocalEvaluatorResponseV1("text", option.text, locale) ===
        normalizedSpoken,
    );
    return Object.freeze({
      kind: "choice_token" as const,
      value: matches.length === 1 ? matches[0]!.responseId : null,
    });
  }
  return Object.freeze({
    kind: interaction.inputMode === "scripted_speech" ? "transcript" : "text",
    value: spoken,
  });
}

export function mergeLearningV2LocalTranscriptV1(
  previous: string,
  incoming: string,
  locale: string,
): string {
  const left = previous.trim().replace(/\s+/gu, " ");
  const right = incoming.trim().replace(/\s+/gu, " ");
  if (!right) return left;
  if (!left) return right;
  const leftWords = left.split(" ");
  const rightWords = right.split(" ");
  const fold = (value: string) =>
    value.normalize("NFKC").toLocaleLowerCase(locale);
  const foldedLeft = leftWords.map(fold);
  const foldedRight = rightWords.map(fold);
  if (
    foldedRight.length >= foldedLeft.length &&
    foldedLeft.every((word, index) => foldedRight[index] === word)
  )
    return right;
  if (
    foldedLeft.length >= foldedRight.length &&
    foldedRight.every(
      (word, index) =>
        foldedLeft[foldedLeft.length - foldedRight.length + index] === word,
    )
  )
    return left;
  const maximum = Math.min(foldedLeft.length, foldedRight.length);
  for (let size = maximum; size > 0; size -= 1) {
    if (
      foldedRight
        .slice(0, size)
        .every(
          (word, index) =>
            foldedLeft[foldedLeft.length - size + index] === word,
        )
    )
      return [...leftWords, ...rightWords.slice(size)].join(" ");
  }
  return `${left} ${right}`;
}
