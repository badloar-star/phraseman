export const PHRASE_AUDIO_DOWNLOAD_TIMEOUT_MS = 4500;
export const PHRASE_AUDIO_PLAYER_START_WATCHDOG_MS = 3500;

const IOS_AUDIO_SESSION_SETTLE_GRACE_MS = 1000;
const ANDROID_AUDIO_SESSION_SETTLE_GRACE_MS = 1500;

/**
 * The caller's fallback must outlive the download timeout. Otherwise a valid
 * cold MP3 is cancelled and replaced by system TTS before delivery can settle.
 */
export function phraseAudioClipStartTimeoutMs(platform: string): number {
  const grace = platform === 'android'
    ? ANDROID_AUDIO_SESSION_SETTLE_GRACE_MS
    : IOS_AUDIO_SESSION_SETTLE_GRACE_MS;
  return PHRASE_AUDIO_DOWNLOAD_TIMEOUT_MS
    + PHRASE_AUDIO_PLAYER_START_WATCHDOG_MS
    + grace;
}
