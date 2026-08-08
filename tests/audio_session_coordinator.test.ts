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
    await capture;
    await playback;

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
    await Promise.all([recording, playback]);
    unsubscribe();

    expect(observed).toEqual([true, false]);
  });
});
