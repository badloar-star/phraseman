jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
}));

import { setAudioModeAsync } from 'expo-audio';
import { setManagedAudioMode } from '../app/audio_session_coordinator';

describe('audio session coordinator', () => {
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
});
