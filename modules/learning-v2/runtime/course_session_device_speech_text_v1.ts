import type { LearningV2CourseSessionPracticeInteractionV1 } from "./course_session_client_children_v1";

export function resolveLearningV2CourseSessionDeviceSpeechTextV1(
  interaction: LearningV2CourseSessionPracticeInteractionV1,
): string | null {
  const payload = interaction.modePayload;
  if (!payload) return null;
  if (payload.family === "listen_choose")
    return payload.referenceAudio?.transcript.trim() || null;
  if (payload.family === "listen_build_dictation")
    return payload.referenceAudio?.transcript.trim() || payload.hiddenTargetPhrase.trim() || null;
  if (payload.family === "scripted_repeat_compare")
    return payload.referenceAudio?.transcript.trim() || payload.targetPhrase.trim() || null;
  return null;
}
