import { VoicePlaybackPolicy } from '@/modules/audio/voice_playback_policy';

describe('VoicePlaybackPolicy', () => {
  test('blocks new voice starts while disabled', () => {
    const policy = new VoicePlaybackPolicy(false);
    expect(policy.captureStart()).toBeNull();
  });

  test('invalidates a pending start and stops every registered voice source immediately', () => {
    const policy = new VoicePlaybackPolicy(true);
    const token = policy.captureStart();
    const stopSpeech = jest.fn();
    const stopPhrase = jest.fn();
    policy.registerStop(stopSpeech);
    policy.registerStop(stopPhrase);

    policy.setEnabled(false);

    expect(policy.canStart(token)).toBe(false);
    expect(stopSpeech).toHaveBeenCalledTimes(1);
    expect(stopPhrase).toHaveBeenCalledTimes(1);
  });

  test('unregistered playback such as the user own recording is not stopped', () => {
    const policy = new VoicePlaybackPolicy(true);
    const stopAppVoice = jest.fn();
    const stopOwnRecording = jest.fn();
    policy.registerStop(stopAppVoice);

    policy.setEnabled(false);

    expect(stopAppVoice).toHaveBeenCalledTimes(1);
    expect(stopOwnRecording).not.toHaveBeenCalled();
  });

  test('can be re-enabled without reviving an old pending start', () => {
    const policy = new VoicePlaybackPolicy(true);
    const stale = policy.captureStart();
    policy.setEnabled(false);
    policy.setEnabled(true);

    expect(policy.canStart(stale)).toBe(false);
    expect(policy.canStart(policy.captureStart())).toBe(true);
  });
});
