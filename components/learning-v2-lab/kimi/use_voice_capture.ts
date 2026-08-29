// зачем: владелец выбрал НАСТОЯЩИЙ микрофон с распознаванием ТОЛЬКО на устройстве
// (голос никуда не отправляется и не хранится). Этот хук — тонкий слой между
// речевыми поверхностями Kimi и уже отлаженным движком приложения:
// expo-speech-recognition + app/speaking_recognition_options.ts (там учтены
// капризы Android-endpointer'ов и iOS-аудиосессии). Свой движок не пишем.
import { useCallback, useEffect, useRef, useState } from 'react';

import { buildSpeakingStartOptions } from '../../../app/speaking_recognition_options';
import { speakingMatchedFlags, speakingTargetTokens } from '../../../app/speaking_word_match';
import { useRuntimeActive } from '../../../hooks/use_runtime_active';
import {
  claimRecordingAudio,
  type RecordingAudioClaim,
  whenRecordingAudioReady,
} from '../../../modules/audio/audio_runtime_arbiter';
import { DebugLogger } from '../../../app/debug-logger';
// путь: components/learning-v2-lab/kimi → ../../../ = корень репозитория

/** Состояния захвата, на которые опирается визуальная машина Kimi. */
export type VoiceCaptureStatus =
  | 'idle'
  | 'permission_denied'
  | 'unavailable'
  | 'listening'
  | 'evaluating'
  | 'done';

export interface VoiceCaptureResult {
  /** Распознанный текст (последняя лучшая гипотеза). */
  readonly transcript: string;
  /** Совпали ли ВСЕ слова цели — по словам и порядку, не по акценту. */
  readonly allMatched: boolean;
  /** Доля совпавших слов 0..1 — для честной формулировки вердикта. */
  readonly ratio: number;
}

interface SpeechModule {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  getPermissionsAsync?: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event: string, cb: (payload: unknown) => void) => { remove?: () => void } | undefined;
  supportsOnDeviceRecognition?: () => boolean | Promise<boolean>;
}

// Нативный модуль подключаем лениво: в дев-сборке без него поверхность обязана
// деградировать в 'unavailable', а не падать.
function loadSpeechModule(): SpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-speech-recognition');
    const native = mod?.ExpoSpeechRecognitionModule ?? null;
    if (!native || typeof native.addListener !== 'function' || typeof native.start !== 'function') {
      return null;
    }
    return native as SpeechModule;
  } catch {
    return null;
  }
}

export interface UseVoiceCaptureInput {
  /** Фраза, которую ждём от ученика (биасит движок — главный рычаг точности). */
  readonly targetText: string;
  /** Локаль распознавания. Учебная цель — английский. */
  readonly locale?: string;
  /** Свободная реплика без заранее известного текста (QR/CM/DS). */
  readonly freeSpeech?: boolean;
}

export interface UseVoiceCapture {
  readonly status: VoiceCaptureStatus;
  /** Живой текст по ходу речи — для мгновенной обратной связи. */
  readonly partial: string;
  readonly result: VoiceCaptureResult | null;
  /** Флаги совпадения по каждому слову цели — подсветка по словам. */
  readonly matchedFlags: readonly boolean[];
  readonly start: () => Promise<void>;
  readonly stop: () => void;
  readonly reset: () => void;
}

/**
 * Захват речи для одной попытки. Оценивает СЛОВА И ПОРЯДОК (как честно
 * написано в фикстурах Kimi: «проверяются слова и их порядок — не акцент»),
 * ничего не отправляет по сети и не хранит аудио.
 */
export function useVoiceCapture(input: UseVoiceCaptureInput): UseVoiceCapture {
  const { targetText, locale = 'en-US', freeSpeech = false } = input;
  const runtimeActive = useRuntimeActive();
  const runtimeActiveRef = useRef(runtimeActive);
  runtimeActiveRef.current = runtimeActive;

  const [status, setStatus] = useState<VoiceCaptureStatus>('idle');
  const statusRef = useRef<VoiceCaptureStatus>('idle');
  statusRef.current = status;
  const [partial, setPartial] = useState('');
  const [result, setResult] = useState<VoiceCaptureResult | null>(null);

  const speechRef = useRef<SpeechModule | null>(null);
  const subsRef = useRef<{ remove?: () => void }[]>([]);
  const mountedRef = useRef(true);
  const bestRef = useRef('');
  // зачем: защита от гонок — поздний результат прошлой попытки не должен
  // затирать свежую (владелец: «поздний ответ не затирает свежее значение»).
  const attemptRef = useRef(0);
  // A press can end while permission UI is pending. Keep the attempt token for
  // final callbacks after a real stop, but separately revoke pending starts.
  const startGenerationRef = useRef(0);
  const pressActiveRef = useRef(false);
  const recordingLeaseRef = useRef<RecordingAudioClaim | null>(null);

  const releaseRecording = useCallback(() => {
    recordingLeaseRef.current?.release();
    recordingLeaseRef.current = null;
  }, []);

  const cleanupListeners = useCallback(() => {
    for (const sub of subsRef.current) sub?.remove?.();
    subsRef.current = [];
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      attemptRef.current += 1;
      startGenerationRef.current += 1;
      pressActiveRef.current = false;
      cleanupListeners();
      try {
        speechRef.current?.abort();
      } catch (e) {
      // модуль мог уже уйти — молча выходим
      DebugLogger.error('use_voice_capture:cleanupListeners', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      releaseRecording();
    };
  }, [cleanupListeners, releaseRecording]);

  // Speech capture lifecycle invariant: blur/background invalidates permission/start,
  // removes native listeners, aborts capture, restores playback, and never auto-resumes.
  useEffect(() => {
    if (runtimeActive) return;
    attemptRef.current += 1;
    startGenerationRef.current += 1;
    pressActiveRef.current = false;
    cleanupListeners();
    try {
      speechRef.current?.abort();
    } catch (e) {
      // no-op
      DebugLogger.error('use_voice_capture:cleanupListeners', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    releaseRecording();
    if (mountedRef.current && (statusRef.current === 'listening' || statusRef.current === 'evaluating')) {
      setStatus('idle');
    }
  }, [runtimeActive, cleanupListeners, releaseRecording]);

  const finish = useCallback(
    (attempt: number, transcript: string) => {
      if (!mountedRef.current || !runtimeActiveRef.current || attempt !== attemptRef.current) return;
      const flags = speakingMatchedFlags(targetText, transcript);
      const matched = flags.filter(Boolean).length;
      const ratio = flags.length > 0 ? matched / flags.length : 0;
      releaseRecording();
      setResult({ transcript, allMatched: flags.length > 0 && matched === flags.length, ratio });
      setStatus('done');
    },
    [releaseRecording, targetText],
  );

  const start = useCallback(async () => {
    if (!runtimeActiveRef.current) return;
    const speech = speechRef.current ?? loadSpeechModule();
    speechRef.current = speech;
    if (!speech) {
      setStatus('unavailable');
      return;
    }

    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    const startGeneration = startGenerationRef.current + 1;
    startGenerationRef.current = startGeneration;
    pressActiveRef.current = true;
    bestRef.current = '';
    setPartial('');
    setResult(null);

    let granted = false;
    try {
      granted = (await speech.requestPermissionsAsync()).granted === true;
    } catch {
      granted = false;
    }
    if (!mountedRef.current || !runtimeActiveRef.current || attempt !== attemptRef.current || startGeneration !== startGenerationRef.current) return;
    if (!granted) {
      setStatus('permission_denied');
      return;
    }

    let onDevice = false;
    try {
      onDevice = (await speech.supportsOnDeviceRecognition?.()) === true;
    } catch {
      onDevice = false;
    }
    if (!mountedRef.current || !runtimeActiveRef.current || attempt !== attemptRef.current || startGeneration !== startGenerationRef.current) return;

    cleanupListeners();
    const resultSub = speech.addListener('result', (event: unknown) => {
      if (!mountedRef.current || !runtimeActiveRef.current || attempt !== attemptRef.current) return;
      const payload = event as { results?: { transcript?: string }[]; isFinal?: boolean };
      const alts = Array.isArray(payload?.results) ? payload.results : [];
      // Берём гипотезу, наиболее полно покрывающую цель, а не слепо первую.
      let best = bestRef.current;
      let bestScore = best ? speakingMatchedFlags(targetText, best).filter(Boolean).length : -1;
      for (const alt of alts) {
        const text = String(alt?.transcript ?? '').trim();
        if (!text) continue;
        const score = speakingMatchedFlags(targetText, text).filter(Boolean).length;
        if (score > bestScore) {
          best = text;
          bestScore = score;
        }
      }
      bestRef.current = best;
      setPartial(best);
      if (payload?.isFinal) finish(attempt, best);
    });
    const endSub = speech.addListener('end', () => {
      if (!mountedRef.current || !runtimeActiveRef.current || attempt !== attemptRef.current) return;
      finish(attempt, bestRef.current);
    });
    const errorSub = speech.addListener('error', () => {
      if (!mountedRef.current || !runtimeActiveRef.current || attempt !== attemptRef.current) return;
      // Ошибка движка = «не удалось расслышать», а не «неверно»: у Kimi это
      // нейтральное восстановление с бесплатным повтором.
      finish(attempt, bestRef.current);
    });
    subsRef.current = [resultSub, endSub, errorSub].filter(Boolean) as { remove?: () => void }[];

    releaseRecording();
    const recordingLease = claimRecordingAudio(() => {
      try { speech.abort(); } catch (e) {
      // capture already gone
      DebugLogger.error('use_voice_capture:recordingLease', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    });
    recordingLeaseRef.current = recordingLease;
    try {
      const audioReady = await whenRecordingAudioReady(recordingLease);
      if (
        !audioReady
        || recordingLeaseRef.current !== recordingLease
        || !mountedRef.current
        || !runtimeActiveRef.current
        || attempt !== attemptRef.current
        || startGeneration !== startGenerationRef.current
        || !pressActiveRef.current
      ) {
        if (recordingLeaseRef.current === recordingLease) releaseRecording();
        return;
      }
      speech.start(
        buildSpeakingStartOptions({
          lang: locale,
          targetText,
          onDevice,
          // зачем: аудио не сохраняем — голос не должен оседать на диске
          // (владелец: распознавание только на устройстве, ничего не хранится)
          persistRecording: false,
          freeSpeech,
        }),
      );
      setStatus('listening');
    } catch {
      releaseRecording();
      setStatus('unavailable');
    }
  }, [cleanupListeners, finish, freeSpeech, locale, releaseRecording, targetText]);

  const stop = useCallback(() => {
    const wasListening = statusRef.current === 'listening';
    pressActiveRef.current = false;
    // Only pending permission/capability continuations are invalidated here.
    // Installed callbacks remain owned by `attempt` and may deliver stop's final.
    startGenerationRef.current += 1;
    setStatus((current) => (current === 'listening' ? 'evaluating' : current));
    try {
      speechRef.current?.stop();
    } catch {
      /* уже остановлен */
      releaseRecording();
    }
    if (!wasListening) releaseRecording();
  }, [releaseRecording]);

  const reset = useCallback(() => {
    attemptRef.current += 1;
    startGenerationRef.current += 1;
    pressActiveRef.current = false;
    bestRef.current = '';
    cleanupListeners();
    try {
      speechRef.current?.abort();
    } catch (e) {
      // нечего прерывать
      DebugLogger.error('use_voice_capture:reset', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    releaseRecording();
    setPartial('');
    setResult(null);
    setStatus('idle');
  }, [cleanupListeners, releaseRecording]);

  const matchedFlags = speakingMatchedFlags(targetText, result?.transcript ?? partial);

  return { status, partial, result, matchedFlags, start, stop, reset };
}

/** Слова цели — для подсветки по словам в поверхностях. */
export { speakingTargetTokens };
