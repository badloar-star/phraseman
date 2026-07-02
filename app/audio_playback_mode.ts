export const LOUD_PLAYBACK_AUDIO_MODE = {
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  allowsRecording: false,
  allowsBackgroundRecording: false,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'duckOthers',
} as const;

export type LoudPlaybackAudioMode = typeof LOUD_PLAYBACK_AUDIO_MODE;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
