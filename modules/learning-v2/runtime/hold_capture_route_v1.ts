export type LearningV2HoldCaptureRouteV1 = "pcm" | "system";

/**
 * Match the proven SpeakingPanel route: PCM owns the hold only when the local
 * neural model is really ready. Otherwise the live platform recognizer must
 * receive microphone audio directly, so a visible listening animation cannot
 * end with an empty transcript merely because a model is still downloading.
 */
export function resolveLearningV2HoldCaptureRouteV1(
  input: Readonly<{
    platform: string;
    pcmRecorderSupported: boolean;
    neuralModelReady: boolean;
  }>,
): LearningV2HoldCaptureRouteV1 {
  return input.platform === "android" &&
    input.pcmRecorderSupported &&
    input.neuralModelReady
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

export type LearningV2SystemRestartStatusV1 = "requesting" | "listening";

/** Preserve visible listening state across advisory OEM recognizer restarts. */
export function resolveLearningV2SystemRestartStatusV1(
  input: Readonly<{ hasListened: boolean }>,
): LearningV2SystemRestartStatusV1 {
  return input.hasListened ? "listening" : "requesting";
}
