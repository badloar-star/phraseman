import { useCallback, useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import { getUserSettingsSnapshot, normalizeSpeechRate } from '../app/user_settings_store';

export function preloadAudio() {}
export function preloadSound(_text: string) {}

type SpeakOpts = {
  pitch?: number;
  /** BCP-47, напр. en-US, es-ES. По умолчанию en-US. */
  language?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (e: Error) => void;
};

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
    // Не пробрасываем pitch=undefined в native — на некоторых Android-движках
    // это даёт писклявый/ускоренный артефакт. Опускаем поле, если не задано.
    const speakOptions: Parameters<typeof Speech.speak>[1] = {
      language: opts?.language?.trim() || 'en-US',
      rate: safeRate,
      onStart: opts?.onStart,
      onDone: opts?.onDone,
      onStopped: opts?.onStopped,
      onError: opts?.onError,
    };
    if (opts?.pitch != null) {
      speakOptions.pitch = opts.pitch;
    }

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
