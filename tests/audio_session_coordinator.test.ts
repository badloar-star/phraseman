jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
}));

import { setAudioModeAsync } from 'expo-audio';
import {
  getManagedAudioModeSnapshot,
  setManagedAudioMode,
  subscribeManagedAudioMode,
} from '../app/audio_session_coordinator';
import {
  acquireAudioActivity,
  resetAudioActivityForTests,
  whenAudioActivitySettled,
} from '../modules/audio/audio_activity';

describe('audio session coordinator', () => {
  beforeEach(async () => {
    (setAudioModeAsync as jest.Mock).mockReset();
    resetAudioActivityForTests();
    await whenAudioActivitySettled();
    (setAudioModeAsync as jest.Mock).mockClear();
  });

  it('serializes global native mode transitions in invocation order', async () => {
    let finishCapture!: () => void;
    const capturePending = new Promise<void>((resolve) => {
      finishCapture = resolve;
    });
    const nativeSet = setAudioModeAsync as jest.MockedFunction<typeof setAudioModeAsync>;
    nativeSet
      .mockImplementationOnce(() => capturePending)
      .mockResolvedValueOnce(undefined);

    const capture = setManagedAudioMode({ allowsRecording: true });
    const playback = setManagedAudioMode({ allowsRecording: false });

    await Promise.resolve();
    await Promise.resolve();
    expect(nativeSet).toHaveBeenCalledTimes(1);
    finishCapture();
    await expect(capture).resolves.toEqual({ outcome: 'applied' });
    await expect(playback).resolves.toEqual({ outcome: 'applied' });

    expect(nativeSet.mock.calls.map(([mode]) => mode.allowsRecording)).toEqual([true, false]);
  });

  it('keeps recording dominant when a stale spoken lease releases', async () => {
    (setAudioModeAsync as jest.Mock).mockResolvedValue(undefined);
    const spoken = acquireAudioActivity('spoken');
    const recording = acquireAudioActivity('recording');
    spoken.release();
    await whenAudioActivitySettled();

    const modes = (setAudioModeAsync as jest.Mock).mock.calls.map(([mode]) => mode.interruptionMode);
    expect(modes.at(-1)).toBe('doNotMix');

    recording.release();
    await whenAudioActivitySettled();
    expect((setAudioModeAsync as jest.Mock).mock.calls.at(-1)?.[0].interruptionMode).toBe('mixWithOthers');
  });

  it('publishes recording intent synchronously for legacy capture surfaces', async () => {
    (setAudioModeAsync as jest.Mock).mockResolvedValue(undefined);
    const observed: boolean[] = [];
    const unsubscribe = subscribeManagedAudioMode(() => {
      observed.push(getManagedAudioModeSnapshot().recordingActive);
    });

    const recording = setManagedAudioMode({ allowsRecording: true });
    expect(getManagedAudioModeSnapshot().recordingActive).toBe(true);
    const playback = setManagedAudioMode({ allowsRecording: false });
    expect(getManagedAudioModeSnapshot().recordingActive).toBe(false);
    await expect(recording).resolves.toEqual({ outcome: 'applied' });
    await expect(playback).resolves.toEqual({ outcome: 'applied' });
    unsubscribe();

    expect(observed).toEqual([true, false]);
  });

  it('reports applied and failed native outcomes without late deadline warnings', async () => {
    jest.useFakeTimers();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (setAudioModeAsync as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('native mode rejected'));

    await expect(setManagedAudioMode({ allowsRecording: false })).resolves.toEqual({ outcome: 'applied' });
    await expect(setManagedAudioMode({ allowsRecording: true })).resolves.toEqual({ outcome: 'failed' });
    await jest.advanceTimersByTimeAsync(2_000);

    expect(warn.mock.calls.some(([message]) => String(message).includes('audio_mode:timeout'))).toBe(false);
    warn.mockRestore();
    jest.useRealTimers();
  });

  it('times out callers without overlapping a still-pending native mode change', async () => {
    jest.useFakeTimers();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let finishFirst!: () => void;
    const firstPending = new Promise<void>((resolve) => { finishFirst = resolve; });
    const nativeSet = setAudioModeAsync as jest.MockedFunction<typeof setAudioModeAsync>;
    nativeSet
      .mockImplementationOnce(() => firstPending)
      .mockResolvedValueOnce(undefined);

    const first = setManagedAudioMode({ allowsRecording: true });
    await Promise.resolve();
    const second = setManagedAudioMode({ allowsRecording: false });
    await jest.advanceTimersByTimeAsync(3_000);
    await expect(first).resolves.toEqual({ outcome: 'timed_out' });
    await expect(second).resolves.toEqual({ outcome: 'timed_out' });

    const callsAtDeadline = nativeSet.mock.calls.length;
    finishFirst();
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
    expect(callsAtDeadline).toBe(1);
    expect(nativeSet).toHaveBeenCalledTimes(2);
    await expect(first).resolves.toEqual({ outcome: 'timed_out' });

    warn.mockRestore();
    jest.useRealTimers();
  });

});
