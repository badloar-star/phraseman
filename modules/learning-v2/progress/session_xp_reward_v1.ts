const COURSE_SESSION_ID = /^learning-v2:en:l(?:0[1-9]|[12][0-9]|3[0-2]):s(?:0[1-9]|[1-4][0-9]|5[0-6])$/u;

export const LEARNING_V2_BASE_XP_PER_PRACTICE_V1 = 5;

export function learningV2SessionBaseXpV1(
  interactionCount: number,
  introInteractionCount: number,
): number {
  if (
    !Number.isSafeInteger(interactionCount) ||
    !Number.isSafeInteger(introInteractionCount) ||
    interactionCount < 0 ||
    introInteractionCount < 0 ||
    introInteractionCount > interactionCount
  ) {
    throw new Error("learning_v2_session_xp_counts_invalid");
  }
  return (interactionCount - introInteractionCount) *
    LEARNING_V2_BASE_XP_PER_PRACTICE_V1;
}

export function learningV2SessionXpEventIdV1(courseSessionId: string): string {
  if (!COURSE_SESSION_ID.test(courseSessionId)) {
    throw new Error("learning_v2_session_xp_identity_invalid");
  }
  return `${courseSessionId}:xp:v1`;
}
