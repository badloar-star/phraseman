import {
  PHRASE_AUDIO_DOWNLOAD_TIMEOUT_MS,
  PHRASE_AUDIO_PLAYER_START_WATCHDOG_MS,
  phraseAudioClipStartTimeoutMs,
} from '../modules/audio/phrase_audio_timing';

describe('phrase audio timing contract', () => {
  it.each(['ios', 'android'] as const)(
    'lets the %s download settle before starting system TTS fallback',
    (platform) => {
      expect(phraseAudioClipStartTimeoutMs(platform)).toBeGreaterThan(
        PHRASE_AUDIO_DOWNLOAD_TIMEOUT_MS + PHRASE_AUDIO_PLAYER_START_WATCHDOG_MS,
      );
    },
  );

  it('keeps the audited platform grace windows', () => {
    expect(phraseAudioClipStartTimeoutMs('ios')).toBe(9000);
    expect(phraseAudioClipStartTimeoutMs('android')).toBe(9500);
  });
});
