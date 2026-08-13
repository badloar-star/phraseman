export type PlanPronunciationRecordingContract = {
  mode: 'device_listen_score_and_retry';
  requiresMicrophonePermission: true;
  requiresUserPlaybackBeforeCompletion: false;
  scoringAvailable: true;
  passThreshold: 90;
  completionPolicy: 'device_transcript_score_at_least_90';
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
  score?: number;
  passed?: boolean;
};

export type PlanPronunciationAttemptPayload = {
  recordingId: string;
  recordingUri: string;
  durationMs: number;
  userPlayedRecording: boolean;
  scoringAvailable: true;
  mode: 'scored';
  status: 'scored';
  transcript: string;
  score: number;
  passed: boolean;
  threshold: 90;
  provider: 'device_speech_recognition';
  scoringVersion: string;
  recognitionConfidence: number;
};

export function buildPlanPronunciationRecordingContract(): PlanPronunciationRecordingContract {
  return {
    mode: 'device_listen_score_and_retry',
    requiresMicrophonePermission: true,
    requiresUserPlaybackBeforeCompletion: false,
    scoringAvailable: true,
    passThreshold: 90,
    completionPolicy: 'device_transcript_score_at_least_90',
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
    && typeof state.durationMs === 'number'
    && Number.isFinite(state.durationMs)
    && state.durationMs > 0
    && typeof state.score === 'number'
    && Number.isFinite(state.score)
    && state.score >= 90
    && state.passed === true;
}

function recordingIdFromUri(uri: string): string {
  const cleanUri = uri.trim();
  const lastSegment = cleanUri.split(/[\\/]/).filter(Boolean).pop() || cleanUri;
  return lastSegment.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'device_speech_attempt';
}

export function buildPlanPronunciationAttemptPayload(input: {
  recordingUri?: string | null;
  durationMs: number;
  userPlayedRecording: boolean;
  transcript: string;
  score: number;
  passed: boolean;
  provider: 'device_speech_recognition';
  scoringVersion: string;
  recognitionConfidence: number;
}): PlanPronunciationAttemptPayload {
  const recordingUri = input.recordingUri?.trim() || 'local://device-speech-recognition';
  return {
    recordingId: recordingIdFromUri(recordingUri),
    recordingUri,
    durationMs: Math.max(1, Math.round(input.durationMs)),
    userPlayedRecording: input.userPlayedRecording,
    scoringAvailable: true,
    mode: 'scored',
    status: 'scored',
    transcript: input.transcript.trim(),
    score: Math.max(0, Math.min(100, Math.round(input.score))),
    passed: input.passed,
    threshold: 90,
    provider: input.provider,
    scoringVersion: input.scoringVersion.trim(),
    recognitionConfidence: Math.max(0, Math.min(1, input.recognitionConfidence)),
  };
}
