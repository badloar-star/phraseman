import {
  buildPlanPronunciationAttemptPayload,
  buildPlanPronunciationRecordingContract,
  canCompletePlanPronunciationRecording,
} from '../app/personal_plan_pronunciation_recording_contract';

describe('personal plan pronunciation recording contract', () => {
  it('requires recording permission and scored pronunciation before completion', () => {
    expect(buildPlanPronunciationRecordingContract()).toEqual({
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
    });
  });

  it('does not complete until a speech attempt and passing score exist', () => {
    expect(canCompletePlanPronunciationRecording({
      hasPermission: true,
      recordingUri: null,
      durationMs: 1800,
      userPlayedRecording: false,
      score: 100,
      passed: true,
    })).toEqual(true);

    expect(canCompletePlanPronunciationRecording({
      hasPermission: true,
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 1800,
      userPlayedRecording: false,
      score: 89,
      passed: false,
    })).toEqual(false);

    expect(canCompletePlanPronunciationRecording({
      hasPermission: true,
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 0,
      userPlayedRecording: true,
      score: 100,
      passed: true,
    })).toEqual(false);

    expect(canCompletePlanPronunciationRecording({
      hasPermission: true,
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 1800,
      userPlayedRecording: false,
      score: 90,
      passed: true,
    })).toEqual(true);
  });

  it('stores scored recording metadata with transcript and threshold evidence', () => {
    expect(buildPlanPronunciationAttemptPayload({
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 1800,
      userPlayedRecording: false,
      transcript: 'The next steps are clear',
      score: 94,
      passed: true,
      provider: 'device_speech_recognition',
      scoringVersion: 'device-transcript-match-v1',
      recognitionConfidence: 0.91,
    })).toEqual({
      recordingId: 'phrase.m4a',
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 1800,
      userPlayedRecording: false,
      scoringAvailable: true,
      mode: 'scored',
      status: 'scored',
      transcript: 'The next steps are clear',
      score: 94,
      passed: true,
      threshold: 90,
      provider: 'device_speech_recognition',
      scoringVersion: 'device-transcript-match-v1',
      recognitionConfidence: 0.91,
    });
  });
});
