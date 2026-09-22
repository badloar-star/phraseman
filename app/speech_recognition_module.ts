// Guarded loader for the on-device speech recognizer (expo-speech-recognition).
//
// expo-speech-recognition is a native module. On a binary that predates the
// config plugin (e.g. an OTA update applied over an older build) or on a device
// without a speech recognizer, `require('expo-speech-recognition')` can resolve
// to a module whose `ExpoSpeechRecognitionModule` is null — and calling
// `.addListener`/`.start` on that throws. SpeakingPanel already loads it lazily
// and degrades to an "unavailable" state; this module is the shared, typed
// version of that guard for every speech surface.
//
// No React / native top-level imports: pure require-in-try-catch so the host
// can decide what to render when the recognizer is absent.

export type SpeechRecognitionModule = {
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
  /**
   * Native locale inventory. ВНИМАНИЕ: реальное имя в expo-speech-recognition —
   * `getSupportedLocales`, оно принимает объект опций и возвращает
   * `{ locales, installedLocales }`, а НЕ голый массив.
   */
  getSupportedLocales?: (options: { androidRecognitionServicePackage?: string }) => Promise<{
    locales?: readonly string[];
    installedLocales?: readonly string[];
  }>;
  /** [Android only] Пакеты служб распознавания. На iOS возвращает пустой массив. */
  getSpeechRecognitionServices?: () => readonly string[];
  /** [Android only] Служба по умолчанию. */
  getDefaultRecognitionService?: () => { packageName?: string } | null | undefined;
};

export type SpeechRecognitionLocaleInventory = Readonly<{
  serviceId: string;
  locales: readonly string[];
}>;

/**
 * Dialogues cannot infer a locale from a generic availability boolean. Empty,
 * malformed and rejected inventories are intentionally `null`, so callers have
 * one fail-closed branch before permission/start.
 */
export async function readSpeechRecognitionLocaleInventory(
  speechModule: SpeechRecognitionModule | null,
  platform: 'android' | 'ios' | 'web' = 'android',
  timeoutMs = 1500,
): Promise<SpeechRecognitionLocaleInventory | null> {
  // зачем: владелец 21.09 видит «голосовой ввод недоступен» в Диалогах при
  // рабочем микрофоне в других разделах. Пять немых catch ниже умели вернуть
  // null молча — теперь каждый ранний выход называет ПРИЧИНУ и значение.
  const startedAtMs = Date.now();
  if (!speechModule) {
    if (__DEV__) console.warn('[DIALOG-VOICE] inventory: early return — speechModule=null');
    return null;
  }
  if (typeof speechModule.getSupportedLocales !== 'function') {
    if (__DEV__) console.warn('[DIALOG-VOICE] inventory: early return — нет getSupportedLocales в этом бинарнике');
    return null;
  }

  // serviceId сверяется только там, где служб распознавания реально несколько
  // (Android). На iOS распознаватель системный и единственный — там сверять
  // нечего, поэтому берём стабильный синтетический id вместо отказа.
  const isIos = platform === 'ios';
  let serviceId = 'ios-system';
  if (!isIos) {
    try {
      serviceId = speechModule.getDefaultRecognitionService?.()?.packageName
        || speechModule.getSpeechRecognitionServices?.()?.[0]
        || '';
    } catch (e) {
      if (__DEV__) console.warn('[DIALOG-VOICE] inventory: service lookup threw', String(e));
      serviceId = '';
    }
    if (!serviceId.trim()) {
      if (__DEV__) console.warn('[DIALOG-VOICE] inventory: early return — на Android не нашли службу распознавания');
      return null;
    }
  }

  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const raw = await Promise.race([
      speechModule.getSupportedLocales({}),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('speech_inventory_timeout')), timeoutMs);
      }),
    ]);
    const list = Array.isArray(raw?.locales) ? raw.locales : [];
    const exact = list.filter((locale): locale is string => typeof locale === 'string' && locale.trim().length > 0);
    if (__DEV__) console.log('[DIALOG-VOICE] inventory: ok', JSON.stringify({
      platform, serviceId,
      ms: Date.now() - startedAtMs,
      localeCount: exact.length,
      installedCount: Array.isArray(raw?.installedLocales) ? raw.installedLocales.length : -1,
      sample: exact.slice(0, 40),
    }));
    // iOS часто отдаёт пустой список, хотя распознавание работает: там это не
    // доказательство отсутствия, поэтому пустота фатальна только на Android.
    if (!exact.length && !isIos) {
      if (__DEV__) console.warn('[DIALOG-VOICE] inventory: early return — пустой список локалей (Android)');
      return null;
    }
    return { serviceId, locales: exact };
  } catch (e) {
    if (__DEV__) console.warn('[DIALOG-VOICE] inventory: threw/timeout', JSON.stringify({
      platform, serviceId, ms: Date.now() - startedAtMs,
      error: e instanceof Error ? e.message : String(e),
    }));
    // На iOS сбой инвентаря не означает отсутствие распознавателя.
    return isIos ? { serviceId, locales: [] } : null;
  } finally {
    if (timeout != null) clearTimeout(timeout);
  }
}

export type HoldPermissionResult = 'granted' | 'granted_after_prompt' | 'denied';

export const SPEECH_STOP_SETTLEMENT_MS = 1500;

export type SpeechStopTimerRef = {
  current: ReturnType<typeof setTimeout> | null;
};

/**
 * Native recognizers do not always emit result/end/error after stop(). Reuse the
 * caller's attempt timer so the UI cannot remain in "scoring" forever when the
 * native session goes silent after a completed push-to-talk gesture.
 */
export function scheduleSpeechStopSettlement(
  timerRef: SpeechStopTimerRef,
  finishAttempt: () => void,
  delayMs = SPEECH_STOP_SETTLEMENT_MS,
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
  speechModule: SpeechRecognitionModule,
): Promise<HoldPermissionResult> {
  let before: { granted: boolean } | null = null;
  if (typeof speechModule.getPermissionsAsync === 'function') {
    try {
      before = await speechModule.getPermissionsAsync();
    } catch (e) {
      if (__DEV__) console.warn('[DIALOG-VOICE] permission: getPermissionsAsync threw', String(e));
      before = null;
    }
  }
  if (before?.granted === true) return 'granted';
  try {
    const result = await speechModule.requestPermissionsAsync();
    if (result?.granted !== true) {
      if (__DEV__) console.warn('[DIALOG-VOICE] permission: denied by user/system', JSON.stringify({ granted: result?.granted ?? null }));
      return 'denied';
    }
    return before == null ? 'granted' : 'granted_after_prompt';
  } catch (e) {
    if (__DEV__) console.warn('[DIALOG-VOICE] permission: requestPermissionsAsync threw', String(e));
    return 'denied';
  }
}

export function isSpeechRecognitionAvailable(speechModule: SpeechRecognitionModule | null): boolean {
  if (!speechModule) {
    if (__DEV__) console.warn('[DIALOG-VOICE] isRecognitionAvailable: false — speechModule=null');
    return false;
  }
  if (typeof speechModule.isRecognitionAvailable !== 'function') return true;
  try {
    const raw = speechModule.isRecognitionAvailable();
    if (raw === false && __DEV__) console.warn('[DIALOG-VOICE] isRecognitionAvailable: native said false');
    return raw !== false;
  } catch (e) {
    if (__DEV__) console.warn('[DIALOG-VOICE] isRecognitionAvailable: threw', String(e));
    return false;
  }
}

/**
 * Return the native speech-recognition module, or `null` when it is not
 * available in this binary/device. Callers MUST treat `null` as "speech can't
 * run here" and offer a non-blocking fallback — never assume it is present.
 */
export function loadSpeechRecognitionModule(): SpeechRecognitionModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-speech-recognition');
    const native = mod?.ExpoSpeechRecognitionModule ?? null;
    // Guard against a stub that lacks the methods we depend on.
    if (!native || typeof native.addListener !== 'function' || typeof native.start !== 'function') {
      if (__DEV__) console.warn('[DIALOG-VOICE] loadModule: stub/absent native module', JSON.stringify({
        hasNative: !!native,
        hasAddListener: typeof native?.addListener,
        hasStart: typeof native?.start,
      }));
      return null;
    }
    return native as SpeechRecognitionModule;
  } catch (e) {
    if (__DEV__) console.warn('[DIALOG-VOICE] loadModule: require threw', String(e));
    return null;
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
