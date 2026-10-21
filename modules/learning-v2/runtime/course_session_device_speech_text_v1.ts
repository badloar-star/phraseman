import type { LearningV2CourseSessionPracticeInteractionV1 } from "./course_session_client_children_v1";

export function resolveLearningV2CourseSessionDeviceSpeechTextV1(
  interaction: LearningV2CourseSessionPracticeInteractionV1,
  canonicalTargetText?: string | null,
): string | null {
  const payload = interaction.modePayload;
  if (!payload) return null;
  if (payload.family === "listen_choose")
    return payload.referenceAudio?.transcript.trim() || null;
  if (payload.family === "listen_build_dictation")
    return payload.referenceAudio?.transcript.trim() || payload.hiddenTargetPhrase.trim() || null;
  if (payload.family === "scripted_repeat_compare")
    return payload.referenceAudio?.transcript.trim() || payload.targetPhrase.trim() || null;
  return canonicalTargetText?.trim() || null;
}

export function resolveLearningV2CourseSessionSelectableDeviceSpeechTextV1(
  interaction: LearningV2CourseSessionPracticeInteractionV1,
  selectableId: string,
): string | null {
  if (interaction.modePayload?.family !== "sound_contrast") return null;
  return interaction.responseOptions.find(
    (entry) => entry.responseId === selectableId,
  )?.text.trim() || null;
}
