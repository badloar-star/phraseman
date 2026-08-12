import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { getUserSettingsSnapshot, normalizeSpeechRate } from '../app/user_settings_store';
import { peekEnVoiceId } from '../app/flashcards/voice_prefs';

export function preloadAudio() {}
export function preloadSound(_text: string) {}

export type SpeakOpts = {
  pitch?: number;
  /** BCP-47, напр. en-US, es-ES. По умолчанию en-US. */
  language?: string;
  /**
   * cards-2.0 (E13): явный идентификатор голоса (voice picker preview).
   * Без него для en-* подставляется выбранный юзером голос из fc_voice_prefs_v1;
   * uk/ru/es автодетект языка не трогаем — голос применяется только к en.
   */
  voiceId?: string | null;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (e: Error) => void;
};

const UK_MARKERS = /[іїєґІЇЄҐ]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;
const LATIN_LETTER_RE = /[a-zA-ZÀ-ÖØ-öø-ÿĀ-ž]/;

/**
 * Підбирає мову expo-speech за вмістом рядка.
 * Лицьова сторона картки може бути не англійською; зворотна — з підказкою `contentLangHint`
 * для латиниці (іспанський переклад без окремих «іспанських» символів).
 */
export function inferExpoSpeechLanguage(
  text: string,
  contentLangHint?: 'ru' | 'uk' | 'es',
): string {
  const s = text.trim();
  if (!s) return 'en-US';
  if (UK_MARKERS.test(s)) return 'uk-UA';
  let nCyr = 0;
  let nLat = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (CYRILLIC_RE.test(ch)) nCyr += 1;
    else if (LATIN_LETTER_RE.test(ch)) nLat += 1;
  }
  if (nCyr >= 1 && nCyr >= nLat) return 'ru-RU';
  if (nLat >= 1 && nCyr === 0) {
    if (contentLangHint === 'es') return 'es-ES';
    return 'en-US';
  }
  return 'en-US';
}

export function speechLocaleToShortLabel(locale: string): string {
  const x = locale.trim().toLowerCase();
  if (x.startsWith('uk')) return 'UK';
  if (x.startsWith('ru')) return 'RU';
  if (x.startsWith('es')) return 'ES';
  return 'EN';
}

/**
 * На Android `Speech.stop()` отправляет команду TTS-движку асинхронно.
 * Если сразу за ним вызвать `Speech.speak()`, движок может не успеть
 * обработать остановку — и оба utterance запускаются параллельно,
 * звучит как «перемотка плёнки». 80 мс эмпирически достаточно
 * (тестировано на Pixel/Samsung), при этом задержка незаметна UX.
 */
const STOP_SETTLE_MS = 80;

export function useAudio() {
  const lastTextRef = useRef('');
  const lastSpeakAtRef = useRef(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Подстраховка: если экран размонтировался между stop() и отложенным speak() —
  // не оставлять висящий таймер, который вызовет Speech.speak уже после ухода.
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    Speech.stop();
    // Reset dedupe so a deliberate replay right after stop is allowed.
    lastTextRef.current = '';
    lastSpeakAtRef.current = 0;
  }, []);

  // ВАЖНО: если caller не передал rate — берём ТЕКУЩУЮ настройку юзера из snapshot,
  // а не хардкод 0.9. Иначе экраны, забывшие пробросить settings.speechRate
  // (flashcards practice tap, lesson_verbs auto-speak, FlashcardListItem.onSpeak,
  // UgcPackEditorCardPreview.onSpeakEn), будут звучать на 0.9 при выставленных
  // в настройках 0.5/0.6/0.7 — это и воспринимается как «перемотка пленки».
  const speak = useCallback((text: string, rate?: number, opts?: SpeakOpts) => {
    const normalized = text?.trim();
    if (!normalized) return;
    const now = Date.now();

    // Ignore accidental double-taps for the same token to avoid TTS restart jitter.
    if (normalized === lastTextRef.current && now - lastSpeakAtRef.current < 220) {
      return;
    }

    // Если есть отложенный speak (предыдущий тап ещё не запустился) — отменяем,
    // запускаем только новейший запрос. Это правильное UX-поведение:
    // юзер тапнул на новое — играем новое.
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }

    // Always stop before speaking to avoid overlapping utterances.
    // Overlap sounds like "ultra-fast" broken speech on device.
    Speech.stop();

    lastTextRef.current = normalized;
    lastSpeakAtRef.current = now;
    const desired = rate ?? getUserSettingsSnapshot().speechRate;
    const safeRate = normalizeSpeechRate(desired);
    // Помогает диагностировать «озвучка ультра-быстрая» — видно реальный rate
    // и был ли он передан явно (req) или взят из user settings (snapshot).
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[useAudio] speak rate=${safeRate} (req=${rate ?? 'snapshot'}) text="${normalized.slice(0, 40)}${normalized.length > 40 ? '…' : ''}"`);
    }
    // Явный volume/stabilized pitch уменьшают «то громче, то тише» между материализациями на TTS-движке.
    // pitch всегда число (never undefined в native — иначе часть Android-движков даёт «уставший» голос или писклявость).
    const speakLanguage = opts?.language?.trim() || 'en-US';
    // E13: выбранный EN-голос (fc_voice_prefs_v1) — только для английского,
    // чтобы не ломать uk/ru/es автодетект. Явный opts.voiceId (превью в voice
    // picker) имеет приоритет; null = принудительно системный.
    const preferredEnVoice =
      opts?.voiceId !== undefined
        ? opts.voiceId
        : speakLanguage.toLowerCase().startsWith('en')
          ? peekEnVoiceId()
          : null;
    const speakOptions = {
      language: speakLanguage,
      ...(preferredEnVoice ? { voice: preferredEnVoice } : {}),
      rate: safeRate,
      volume: 1,
      pitch: opts?.pitch != null ? opts.pitch : 1,
      onStart: opts?.onStart,
      onDone: opts?.onDone,
      onStopped: opts?.onStopped,
      onError: opts?.onError,
      ...(Platform.OS === 'ios' ? { useApplicationAudioSession: false as const } : {}),
    } satisfies Parameters<typeof Speech.speak>[1];

    // Откладываем сам speak() на STOP_SETTLE_MS, чтобы Speech.stop() выше
    // гарантированно успел отработать на Android TTS-движке. Без этого
    // gap'а старый utterance успевает наложиться на новый — это и есть
    // «работает через раз / эффект перемотки».
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      Speech.speak(normalized, speakOptions);
    }, STOP_SETTLE_MS);
  }, []);

  return { speak, stop };
}
