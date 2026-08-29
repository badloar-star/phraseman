export type LearningV2HoldCaptureRouteV1 = "pcm" | "system";

/**
 * Capture ownership is independent from transcription readiness.
 *
 * Android's live SpeechRecognizer may emit `end` while the learner is still
 * holding the button. When the app-owned PCM recorder exists, it must own the
 * entire physical hold; a neural/system transcription backend is chosen only
 * after release produced a stable WAV file.
 */
export function resolveLearningV2HoldCaptureRouteV1(
  input: Readonly<{
    platform: string;
    pcmRecorderSupported: boolean;
  }>,
): LearningV2HoldCaptureRouteV1 {
  return input.platform === "android" && input.pcmRecorderSupported
    ? "pcm"
    : "system";
}

export type LearningV2SystemHoldTerminalActionV1 = "restart" | "finish";

/** Native endpointers are advisory during hold-to-talk; the finger owns end. */
export function resolveLearningV2SystemHoldTerminalActionV1(
  input: Readonly<{ holdActive: boolean }>,
): LearningV2SystemHoldTerminalActionV1 {
  return input.holdActive ? "restart" : "finish";
}
