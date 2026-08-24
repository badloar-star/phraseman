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
  getPermissionsAsync?: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    event: string,
    cb: (payload: any) => void,
  ) => { remove?: () => void } | undefined;
  /** Present on expo-speech-recognition; resolves whether offline recognition
   *  is available on this device. Optional so older stubs still typecheck. */
  supportsOnDeviceRecognition?: () => boolean | Promise<boolean>;
  /** Present on expo-speech-recognition; resolves whether any recognizer can run. */
  isRecognitionAvailable?: () => boolean;
};

export type HoldPermissionResult = 'granted' | 'granted_after_prompt' | 'denied';

export const PLAN_SPEECH_STOP_SETTLEMENT_MS = 1500;

export type PlanSpeechStopTimerRef = {
  current: ReturnType<typeof setTimeout> | null;
};

/**
 * Native recognizers do not always emit result/end/error after stop(). Reuse the
 * caller's attempt timer so the UI cannot remain in "scoring" forever when the
 * native session goes silent after a completed push-to-talk gesture.
 */
export function schedulePlanSpeechStopSettlement(
  timerRef: PlanSpeechStopTimerRef,
  finishAttempt: () => void,
  delayMs = PLAN_SPEECH_STOP_SETTLEMENT_MS,
): void {
  if (timerRef.current != null) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {
    timerRef.current = null;
    finishAttempt();
  }, delayMs);
}

/**
 * Permission handshake for push-to-talk. If a system prompt was shown, the
 * original touch is no longer trustworthy (iOS/Android may swallow press-out),
 * so callers must return to idle and require one fresh hold.
 */
export async function requestSpeechPermissionForHold(
  speechModule: PlanSpeechModule,
): Promise<HoldPermissionResult> {
  let before: { granted: boolean } | null = null;
  if (typeof speechModule.getPermissionsAsync === 'function') {
    try {
      before = await speechModule.getPermissionsAsync();
    } catch {
      before = null;
    }
  }
  if (before?.granted === true) return 'granted';
  try {
    const result = await speechModule.requestPermissionsAsync();
    if (result?.granted !== true) return 'denied';
    return before == null ? 'granted' : 'granted_after_prompt';
  } catch {
    return 'denied';
  }
}

export function isSpeechRecognitionAvailable(speechModule: PlanSpeechModule | null): boolean {
  if (!speechModule) return false;
  if (typeof speechModule.isRecognitionAvailable !== 'function') return true;
  try {
    return speechModule.isRecognitionAvailable() !== false;
  } catch {
    return false;
  }
}

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
