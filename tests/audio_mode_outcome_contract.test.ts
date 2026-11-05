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
  claimSpokenAudio,
  whenRecordingAudioReady,
  whenSpokenAudioReady,
} from '../modules/audio/audio_runtime_arbiter';
import {
  releaseStaleAudioActivity,
  resetAudioActivityForTests,
  whenAudioActivitySettled,
} from '../modules/audio/audio_activity';

function deferred(): Readonly<{ promise: Promise<void>; resolve(): void }> {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

describe('audio readiness outcome and revision contract', () => {
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

  it('rejects spoken readiness when the native spoken-mode transition rejects', async () => {
    nativeSet.mockRejectedValueOnce(new Error('native spoken mode rejected'));
    const claim = claimSpokenAudio(jest.fn(), 'test:spoken-rejected');
    expect(claim).not.toBeNull();

    try {
      await expect(whenSpokenAudioReady(claim!)).resolves.toBe(false);
    } finally {
      claim?.release();
    }
  });

  it('rejects spoken readiness on timeout and never promotes a late native fulfillment', async () => {
    jest.useFakeTimers();
    const native = deferred();
    nativeSet.mockImplementationOnce(() => native.promise);
    const claim = claimSpokenAudio(jest.fn(), 'test:spoken-timeout');
    expect(claim).not.toBeNull();
    const ready = whenSpokenAudioReady(claim!);

    await flushMicrotasks();
    await jest.advanceTimersByTimeAsync(1_500);

    try {
      await expect(ready).resolves.toBe(false);
      native.resolve();
      await flushMicrotasks();
      await expect(ready).resolves.toBe(false);
    } finally {
      claim?.release();
      native.resolve();
      await flushMicrotasks();
    }
  });

  it('permits first recording and spoken starts after applied native transitions', async () => {
    const recording = claimRecordingAudio(jest.fn(), 'test:recording-applied');
    await expect(whenRecordingAudioReady(recording)).resolves.toBe(true);
    recording.release();
    await whenAudioActivitySettled();

    const spoken = claimSpokenAudio(jest.fn(), 'test:spoken-applied');
    expect(spoken).not.toBeNull();
    try {
      await expect(whenSpokenAudioReady(spoken!)).resolves.toBe(true);
    } finally {
      spoken?.release();
    }
  });

  it('keeps rapid recording r1, UI r2, recording r3 closures isolated by revision', async () => {
    const r1Native = deferred();
    const r2Native = deferred();
    const r3Native = deferred();
    nativeSet
      .mockImplementationOnce(() => r1Native.promise)
      .mockImplementationOnce(() => r2Native.promise)
      .mockImplementationOnce(() => r3Native.promise);

    const r1Claim = claimRecordingAudio(jest.fn(), 'test:recording-r1');
    const r1Ready = whenRecordingAudioReady(r1Claim);
    r1Claim.release();
    const r3Claim = claimRecordingAudio(jest.fn(), 'test:recording-r3');
    let r3Settled = false;
    const r3Ready = whenRecordingAudioReady(r3Claim).then((ready) => {
      r3Settled = true;
      return ready;
    });

    await flushMicrotasks();
    expect(nativeSet).toHaveBeenCalledTimes(1);
    r1Native.resolve();
    await flushMicrotasks();
    await expect(r1Ready).resolves.toBe(false);
    expect(r3Settled).toBe(false);
    expect(nativeSet).toHaveBeenCalledTimes(2);

    r2Native.resolve();
    await flushMicrotasks();
    expect(r3Settled).toBe(false);
    expect(nativeSet).toHaveBeenCalledTimes(3);

    r3Native.resolve();
    try {
      await expect(r3Ready).resolves.toBe(true);
    } finally {
      r3Claim.release();
    }
  });

  it('does not authorize a current spoken claim from an applied UI transition after lease cleanup', async () => {
    jest.useFakeTimers();
    const claim = claimSpokenAudio(jest.fn(), 'test:spoken-kind-mismatch');
    expect(claim).not.toBeNull();
    await expect(whenSpokenAudioReady(claim!)).resolves.toBe(true);

    await jest.advanceTimersByTimeAsync(2_000);
    expect(releaseStaleAudioActivity('test:kind-mismatch')).toBe(1);
    await whenAudioActivitySettled();
    expect(claim?.isCurrent()).toBe(true);

    try {
      await expect(whenSpokenAudioReady(claim!)).resolves.toBe(false);
    } finally {
      claim?.release();
    }
  });
});
