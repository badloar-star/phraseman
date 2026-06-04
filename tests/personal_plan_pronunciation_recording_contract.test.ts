import {
  buildPlanPronunciationAttemptPayload,
  buildPlanPronunciationRecordingContract,
  canCompletePlanPronunciationRecording,
} from '../app/personal_plan_pronunciation_recording_contract';

describe('personal plan pronunciation recording contract', () => {
  it('requires recording permission and local playback before completion', () => {
    expect(buildPlanPronunciationRecordingContract()).toEqual({
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
    });
  });

  it('does not complete until a recorded uri exists', () => {
    expect(canCompletePlanPronunciationRecording({
      hasPermission: true,
      recordingUri: null,
      durationMs: 1800,
      userPlayedRecording: false,
    })).toEqual(false);

    expect(canCompletePlanPronunciationRecording({
      hasPermission: true,
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 1800,
      userPlayedRecording: false,
    })).toEqual(false);

    expect(canCompletePlanPronunciationRecording({
      hasPermission: true,
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 0,
      userPlayedRecording: true,
    })).toEqual(false);

    expect(canCompletePlanPronunciationRecording({
      hasPermission: true,
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 1800,
      userPlayedRecording: true,
    })).toEqual(true);
  });

  it('stores recording metadata without fake pronunciation score', () => {
    expect(buildPlanPronunciationAttemptPayload({
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 1800,
      userPlayedRecording: true,
    })).toEqual({
      recordingId: 'phrase.m4a',
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 1800,
      userPlayedRecording: true,
      scoringAvailable: false,
      mode: 'practice',
      status: 'recorded',
    });
  });
});
