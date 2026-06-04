export type PlanPronunciationRecordingContract = {
  mode: 'record_and_self_check';
  requiresMicrophonePermission: true;
  requiresUserPlaybackBeforeCompletion: true;
  scoringAvailable: false;
  completionPolicy: 'completion_only_after_recording';
  audioMode: {
    allowsRecording: true;
    playsInSilentMode: true;
    shouldPlayInBackground: false;
    shouldRouteThroughEarpiece: false;
    interruptionMode: 'doNotMix';
  };
};

export type PlanPronunciationRecordingState = {
  hasPermission: boolean;
  recordingUri: string | null;
  durationMs?: number;
  userPlayedRecording: boolean;
};

export type PlanPronunciationAttemptPayload = {
  recordingId: string;
  recordingUri: string;
  durationMs: number;
  userPlayedRecording: true;
  scoringAvailable: false;
  mode: 'practice';
  status: 'recorded';
};

export function buildPlanPronunciationRecordingContract(): PlanPronunciationRecordingContract {
  return {
    mode: 'record_and_self_check',
    requiresMicrophonePermission: true,
    requiresUserPlaybackBeforeCompletion: true,
    scoringAvailable: false,
    completionPolicy: 'completion_only_after_recording',
    audioMode: {
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    },
  };
}

export function canCompletePlanPronunciationRecording(
  state: PlanPronunciationRecordingState,
): boolean {
  return state.hasPermission
    && Boolean(state.recordingUri?.trim())
    && typeof state.durationMs === 'number'
    && Number.isFinite(state.durationMs)
    && state.durationMs > 0
    && state.userPlayedRecording;
}

function recordingIdFromUri(uri: string): string {
  const cleanUri = uri.trim();
  const lastSegment = cleanUri.split(/[\\/]/).filter(Boolean).pop() || cleanUri;
  return lastSegment.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'local_pronunciation_recording';
}

export function buildPlanPronunciationAttemptPayload(input: {
  recordingUri: string;
  durationMs: number;
  userPlayedRecording: true;
}): PlanPronunciationAttemptPayload {
  return {
    recordingId: recordingIdFromUri(input.recordingUri),
    recordingUri: input.recordingUri.trim(),
    durationMs: Math.max(1, Math.round(input.durationMs)),
    userPlayedRecording: true,
    scoringAvailable: false,
    mode: 'practice',
    status: 'recorded',
  };
}
