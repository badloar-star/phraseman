import { act, cleanup, renderHook } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

const mockRelease = jest.fn();
const mockCardTarget = jest.fn();

jest.mock('../modules/audio/audio_runtime_arbiter', () => ({
  claimSpokenAudio: jest.fn(() => ({ isCurrent: () => true, release: mockRelease })),
  whenSpokenAudioReady: jest.fn(async () => true),
}));

jest.mock('../modules/audio/voice_playback_policy', () => ({
  voicePlaybackPolicy: {
    captureStart: () => 1,
    canStart: () => true,
    registerStop: () => () => undefined,
  },
}));

jest.mock('../app/user_settings_store', () => ({
  getUserSettingsSnapshot: () => ({ speechRate: 0.9, speechVoiceId: '' }),
  normalizeSpeechRate: (value: number) => value,
}));

jest.mock('../app/flashcards/voice_prefs', () => ({
  peekEnVoiceId: () => null,
  peekVoiceIdForLocale: () => null,
}));

jest.mock('../app/flashcards/card_tts_audio', () => ({
  cardTtsLanguageFromSpeechLocale: jest.fn(() => 'en'),
  isCardTtsKnownMissing: jest.fn(() => false),
  markCardTtsMissing: jest.fn(),
  notifyCardVoiceUnavailable: jest.fn(),
  resolveCardDeviceVoice: jest.fn(),
  resolveCardTtsTarget: mockCardTarget,
}));

jest.mock('../app/flashcards/tts_voices', () => ({ getVoicesOnce: jest.fn() }));
jest.mock('../app/net_status', () => ({ getNetStatus: jest.fn() }));

import { useAudio } from '../hooks/use-audio';

describe('useAudio systemTtsOnly', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('sends the exact text and locale to device speech without entering card or corpus playback', async () => {
    const onStart = jest.fn();
    const hook = await renderHook(() => useAudio());

    await act(async () => {
      hook.result.current.speak('sad', undefined, {
        language: 'en-US',
        cardAudio: true,
        systemTtsOnly: true,
        onStart,
      });
    });
    await act(async () => {
      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledWith('sad', expect.objectContaining({
      language: 'en-US',
      onStart,
    }));
    expect(mockCardTarget).not.toHaveBeenCalled();
  });
});
