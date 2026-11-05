jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
}));

jest.mock('../app/swallow_log', () => ({
  noteSwallowedAs: () => () => undefined,
}));

jest.mock('../modules/audio/voice_playback_policy', () => ({
  voicePlaybackPolicy: {
    isEnabled: () => true,
    registerStop: () => () => undefined,
  },
}));

import { setAudioModeAsync } from 'expo-audio';
import {
  claimRecordingAudio,
  whenRecordingAudioReady,
} from '../modules/audio/audio_runtime_arbiter';
import {
  resetAudioActivityForTests,
  whenAudioActivitySettled,
} from '../modules/audio/audio_activity';

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

describe('recording readiness follows the native audio-mode outcome', () => {
  const nativeSet = setAudioModeAsync as jest.MockedFunction<typeof setAudioModeAsync>;

  beforeEach(async () => {
    nativeSet.mockReset().mockResolvedValue(undefined);
    resetAudioActivityForTests();
    await whenAudioActivitySettled();
    nativeSet.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects a recording start when the native recording-mode transition rejects', async () => {
    nativeSet.mockRejectedValueOnce(new Error('native recording mode rejected'));
    const claim = claimRecordingAudio(jest.fn(), 'test:recording-rejected');

    // RED on current main: intent is true and the rejection is absorbed, so
    // whenRecordingAudioReady currently resolves true.
    try {
      await expect(whenRecordingAudioReady(claim)).resolves.toBe(false);
    } finally {
      claim.release();
    }
  });

  it('rejects a recording start when the native transition exceeds its deadline', async () => {
    jest.useFakeTimers();
    let finishNative!: () => void;
    const nativePending = new Promise<void>((resolve) => {
      finishNative = resolve;
    });
    nativeSet.mockImplementationOnce(() => nativePending);
    const claim = claimRecordingAudio(jest.fn(), 'test:recording-timeout');
    const ready = whenRecordingAudioReady(claim);

    await flushMicrotasks();
    await jest.advanceTimersByTimeAsync(1_500);

    // RED on current main: the caller deadline resolves but readiness still
    // observes only recording intent, not the timed-out native outcome.
    try {
      await expect(ready).resolves.toBe(false);
      expect(nativeSet).toHaveBeenCalledTimes(1);
    } finally {
      claim.release();
      finishNative();
      await flushMicrotasks();
    }
  });

  it('does not revive a released stale claim after a delayed native transition settles', async () => {
    jest.useFakeTimers();
    let finishNative!: () => void;
    const nativePending = new Promise<void>((resolve) => {
      finishNative = resolve;
    });
    nativeSet.mockImplementationOnce(() => nativePending);
    const claim = claimRecordingAudio(jest.fn(), 'test:recording-stale-release');
    const ready = whenRecordingAudioReady(claim);

    claim.release();
    await jest.advanceTimersByTimeAsync(1_500);
    finishNative();
    await flushMicrotasks();

    try {
      await expect(ready).resolves.toBe(false);
    } finally {
      claim.release();
    }
  });
});
