// Guarded loader for the on-device speech recognizer (expo-speech-recognition).
//
// expo-speech-recognition is a native module. On a binary that predates the
// config plugin (e.g. an OTA update applied over an older build) or on a device
// without a speech recognizer, `require('expo-speech-recognition')` can resolve
// to a module whose `ExpoSpeechRecognitionModule` is null — and calling
// `.addListener`/`.start` on that throws. SpeakingPanel already loads it lazily
// and degrades to an "unavailable" state; this module is the shared, typed
// version of that guard so the personal-plan pronunciation exercise degrades
// the same way instead of crashing on mount.
//
// No React / native top-level imports: pure require-in-try-catch so the host
// can decide what to render when the recognizer is absent.

export type PlanSpeechModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    event: string,
    cb: (payload: any) => void,
  ) => { remove?: () => void } | undefined;
};

/**
 * Return the native speech-recognition module, or `null` when it is not
 * available in this binary/device. Callers MUST treat `null` as "speech can't
 * run here" and offer a non-blocking fallback — never assume it is present.
 */
export function loadPlanSpeechModule(): PlanSpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-speech-recognition');
    const native = mod?.ExpoSpeechRecognitionModule ?? null;
    // Guard against a stub that lacks the methods we depend on.
    if (!native || typeof native.addListener !== 'function' || typeof native.start !== 'function') {
      return null;
    }
    return native as PlanSpeechModule;
  } catch {
    return null;
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
