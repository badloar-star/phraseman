export const UI_SFX_AUDIO_MODE = {
  playsInSilentMode: false,
  shouldPlayInBackground: false,
  allowsRecording: false,
  allowsBackgroundRecording: false,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'mixWithOthers',
} as const;

export const SPOKEN_AUDIO_MODE = {
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  allowsRecording: false,
  allowsBackgroundRecording: false,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'duckOthers',
} as const;

// Compatibility alias while existing voice surfaces migrate to scoped leases.
// Both names intentionally reference the same object.
export const LOUD_PLAYBACK_AUDIO_MODE = SPOKEN_AUDIO_MODE;

// Shared capture session for every speech-recognition surface. The previous
// flows restored playback mode after TTS but did not always switch back to a
// record-capable session before opening the microphone.
export const SPEAKING_RECORDING_AUDIO_MODE = {
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  allowsRecording: true,
  allowsBackgroundRecording: false,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'doNotMix',
} as const;

export type LoudPlaybackAudioMode = typeof LOUD_PLAYBACK_AUDIO_MODE;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
