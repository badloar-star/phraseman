import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { getUserSettingsSnapshot, normalizeSpeechRate } from '../app/user_settings_store';
import type * as PhraseAudioPlayer from './phrase_audio_player';
import { voicePlaybackPolicy } from '../modules/audio/voice_playback_policy';
import {
  claimSpokenAudio,
  whenSpokenAudioReady,
  type SpokenAudioClaim,
} from '../modules/audio/audio_runtime_arbiter';
import { phraseAudioClipStartTimeoutMs } from '../modules/audio/phrase_audio_timing';
import { peekEnVoiceId } from '../app/flashcards/voice_prefs';

export function preloadAudio() {}
export function preloadSound(_text: string) {}

let phraseAudioPlayerModulePromise: Promise<typeof PhraseAudioPlayer> | null = null;

function loadPhraseAudioPlayer(): Promise<typeof PhraseAudioPlayer> {
  phraseAudioPlayerModulePromise ??= import('./phrase_audio_player');
  return phraseAudioPlayerModulePromise;
}

function stopPhraseAudioIfLoaded(): void {
  if (!phraseAudioPlayerModulePromise) return;
  void phraseAudioPlayerModulePromise
    .then(({ stopPhraseAudio }) => stopPhraseAudio())
    .catch(() => {});
}

export type SpeakOpts = {
  pitch?: number;
  language?: string;
  voice?: string;
  /** Optional pronunciation-only text; the visible lesson text stays unchanged. */
  speechText?: string;
  /**
   * cards-2.0 (E13): явный идентификатор голоса (voice picker preview).
   * Без него для en-* подставляется выбранный юзером голос из fc_voice_prefs_v1;
   * uk/ru/es автодетект языка не трогаем — голос применяется только к en.
   */
  voiceId?: string | null;
  /**
   * Dialogues opt in only after a capability receipt selected this exact native
   * voice. Strict callers must never fall back to the device default language.
   */
  strictVoice?: boolean;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (e: Error) => void;
};

const UK_MARKERS = /[іїєґІЇЄҐ]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;
const LATIN_LETTER_RE = /[a-zA-ZÀ-ÖØ-öø-ÿĀ-ž]/;
const STOP_SETTLE_MS = Platform.OS === 'android' ? 80 : 20;
// зачем: TestFlight 115 держал здесь iOS 3500мс при внутреннем download-timeout
// 4500мс и таком же 3500мс watchdog запуска плеера. Внешний fallback отменял
// исправный холодный MP3 раньше доставки/старта и включал системного робота.
// Значение покрывает обе стадии плюс смену audio session и выводится из общего
// timing-контракта, поэтому три таймера больше не могут разъехаться.
const CLIP_START_TIMEOUT_MS = phraseAudioClipStartTimeoutMs(Platform.OS);
type SpeechOptions = NonNullable<Parameters<typeof Speech.speak>[1]>;

function safeSpeechStop() {
  try {
    Speech.stop();
  } catch (error: unknown) {
    // Немой catch запрещён (владелец): неостановленный синтезатор продолжает
    // говорить поверх следующей фразы — и это выглядит как «звук сломался».
    console.warn('[SPEECH] stop_failed', // guard-ok: проглоченная ошибка обязана писать причину
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
}

function retrySpeechWithoutVoice(
  text: string,
  options: SpeechOptions,
  onError?: (e: Error) => void,
) {
  try {
    Speech.speak(text, {
      ...options,
      voice: undefined,
      onError,
    });
  } catch (e) {
    onError?.(e instanceof Error ? e : new Error(String(e)));
  }
}

export function inferExpoSpeechLanguage(
  text: string,
  contentLangHint?: string,
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
  if (nCyr >= 1 && nCyr >= nLat) return contentLangHint === 'uk' ? 'uk-UA' : 'ru-RU';
  if (nLat >= 1 && nCyr === 0) {
    if (contentLangHint === 'fr') return 'fr-FR';
    if (contentLangHint === 'de') return 'de-DE';
    return contentLangHint === 'es' ? 'es-ES' : 'en-US';
  }
  return 'en-US';
}

export function speechLocaleToShortLabel(locale: string): string {
  const x = locale.trim().toLowerCase();
  if (x.startsWith('uk')) return 'UK';
  if (x.startsWith('ru')) return 'RU';
  if (x.startsWith('es')) return 'ES';
  if (x.startsWith('fr')) return 'FR';
  if (x.startsWith('de')) return 'DE';
  return 'EN';
}

export function useAudio() {
  const lastTextRef = useRef('');
  const lastSpeakAtRef = useRef(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechGenerationRef = useRef(0);
  const speechClaimRef = useRef<SpokenAudioClaim | null>(null);

  const stopSystemSpeechNow = useCallback(() => {
    speechGenerationRef.current += 1;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    if (clipStartTimerRef.current) clearTimeout(clipStartTimerRef.current);
    clipStartTimerRef.current = null;
    safeSpeechStop();
    speechClaimRef.current?.release();
    speechClaimRef.current = null;
  }, []);

  const stopVoiceNow = useCallback(() => {
    stopSystemSpeechNow();
    stopPhraseAudioIfLoaded();
  }, [stopSystemSpeechNow]);

  useEffect(() => {
    const unregisterVoiceStop = voicePlaybackPolicy.registerStop(stopVoiceNow);
    return () => {
      unregisterVoiceStop();
      stopVoiceNow();
      lastTextRef.current = '';
    };
  }, [stopVoiceNow]);

  const stop = useCallback(() => {
    stopVoiceNow();
    lastTextRef.current = '';
    lastSpeakAtRef.current = 0;
  }, [stopVoiceNow]);

  const speak = useCallback((text: string, rate?: number, opts?: SpeakOpts) => {
    const normalized = text?.trim();
    if (!normalized) return;
    const voicePolicyToken = voicePlaybackPolicy.captureStart();
    if (voicePolicyToken === null) return;

    const spokenText = opts?.speechText?.trim() || normalized;

    const now = Date.now();
    const dedupeKey = `${normalized}\u0000${spokenText}`;
    if (dedupeKey === lastTextRef.current && now - lastSpeakAtRef.current < 220) return;

    speechGenerationRef.current += 1;
    const generation = speechGenerationRef.current;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    if (clipStartTimerRef.current) clearTimeout(clipStartTimerRef.current);
    clipStartTimerRef.current = null;
    safeSpeechStop();
    stopPhraseAudioIfLoaded();

    lastTextRef.current = dedupeKey;
    lastSpeakAtRef.current = now;

    const settings = getUserSettingsSnapshot();
    // зачем: скорость применяется ТОЛЬКО к системному TTS. Готовые клипы озвучки
    // играют в оригинальной длине (решение владельца 2026-08-24) — им safeRate
    // не передаётся, см. playPhraseByText ниже и phrase_audio_player.ts.
    const safeRate = normalizeSpeechRate(rate ?? settings.speechRate);
    const language = opts?.language?.trim() || inferExpoSpeechLanguage(spokenText);
    // cards-2.0 (E13): voiceId — алиас voice для voice picker карточек. Явный
    // opts (в т.ч. null = «системный») всегда сильнее; иначе для en берём голос
    // из настроек, а если он не задан — выбранный в разделе карточек.
    const hasVoiceOverride =
      !!opts &&
      (Object.prototype.hasOwnProperty.call(opts, 'voice') ||
        Object.prototype.hasOwnProperty.call(opts, 'voiceId'));
    const settingsVoice = settings.speechVoiceId.trim();
    const requestedVoice = hasVoiceOverride
      ? (opts.voice ?? opts.voiceId ?? '').trim()
      : (language.toLowerCase().startsWith('en') ? settingsVoice || (peekEnVoiceId() ?? '').trim() : '');

    // Prefer the high-quality OpenAI "echo" clip when one exists for this exact
    // text, the language is English (clips are EN-only), and the caller did not
    // force a specific system voice. Falls back to expo-speech on any miss/error.
    if (opts?.strictVoice && !requestedVoice) {
      opts.onError?.(new Error('strict_dialogue_voice_missing'));
      return;
    }
    const isEnglish = language.toLowerCase().startsWith('en');
    const canUseClip = isEnglish && !requestedVoice;
    if (canUseClip) {
      // Single fallback trigger: the promise resolves false on any failure
      // (including the internal catch that also reports onError), so we fall
      // back here exactly once and never double-speak.
      let fellBack = false;
      let clipStartTimer: ReturnType<typeof setTimeout> | null = null;
      const clearClipStartTimer = () => {
        if (clipStartTimer) clearTimeout(clipStartTimer);
        if (clipStartTimerRef.current === clipStartTimer) clipStartTimerRef.current = null;
        clipStartTimer = null;
      };
      const fallbackOnce = () => {
        if (
          speechGenerationRef.current !== generation
          || !voicePlaybackPolicy.canStart(voicePolicyToken)
        ) {
          clearClipStartTimer();
          return;
        }
        if (fellBack) return;
        fellBack = true;
        clearClipStartTimer();
        stopPhraseAudioIfLoaded();
        speakWithSystemTts();
      };
      clipStartTimer = setTimeout(fallbackOnce, CLIP_START_TIMEOUT_MS);
      clipStartTimerRef.current = clipStartTimer;
      void loadPhraseAudioPlayer()
        .then(({ hasPhraseAudio, playPhraseByText }) => {
          if (
            fellBack
            || speechGenerationRef.current !== generation
            || !voicePlaybackPolicy.canStart(voicePolicyToken)
          ) return false;
          if (!hasPhraseAudio(normalized)) return false;
          return playPhraseByText(
            normalized,
            {
              onStart: () => {
                clearClipStartTimer();
                opts?.onStart?.();
              },
              onDone: opts?.onDone,
              onError: fallbackOnce,
            },
          );
        })
        .then((played) => {
          clearClipStartTimer();
          if (!played) fallbackOnce();
        })
        .catch(fallbackOnce);
      return;
    }

    speakWithSystemTts();

    function speakWithSystemTts() {
      if (
        speechGenerationRef.current !== generation
        || !voicePlaybackPolicy.canStart(voicePolicyToken)
      ) return;
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null;
        if (
          speechGenerationRef.current !== generation
          || !voicePlaybackPolicy.canStart(voicePolicyToken)
        ) return;
        speechClaimRef.current?.release();
        const speechClaim = claimSpokenAudio(stopSystemSpeechNow, 'use-audio:system-tts');
        if (!speechClaim) {
          // зачем (2026-09-14): претензия на голос не выдаётся, пока аудиотракт
          // в режиме записи — озвучка молча пропадала (эхо эталона после
          // оценки). Пишем причину; сам отказ не ломает вызывающего.
          console.warn('[SPEAK-MIC] tts:skip', JSON.stringify({ reason: 'claim_refused_recording_active', text: spokenText })); // guard-ok: трасса владельца, только на отказе
          return;
        }
        speechClaimRef.current = speechClaim;
        const releaseSpeechClaim = () => {
          speechClaim.release();
          if (speechClaimRef.current === speechClaim) speechClaimRef.current = null;
        };
        void whenSpokenAudioReady(speechClaim).then((audioReady) => {
          if (
            !audioReady
            || speechGenerationRef.current !== generation
            || !voicePlaybackPolicy.canStart(voicePolicyToken)
          ) {
            if (!audioReady) console.warn('[SPEAK-MIC] tts:skip', JSON.stringify({ reason: 'audio_not_ready', text: spokenText })); // guard-ok: трасса владельца, только на отказе
            releaseSpeechClaim();
            return;
          }
          if (lastTextRef.current !== dedupeKey) {
            releaseSpeechClaim();
            return;
          }
          /**
           * Страховка завершения речи.
           *
           * зачем (жалобы «пропадает озвучка», аудит 2026-09-15): аренда голоса
           * освобождалась ИСКЛЮЧИТЕЛЬНО колбэками expo-speech. Если движок не
           * присылал ни одного (обрыв нативной сессии, отзыв фокуса, редкий
           * Android-баг), аренда висела вечно: озвучка по всему приложению
           * молчала, эффекты глушились как «идёт речь», лечил перезапуск.
           * Страховка спрашивает у движка ФАКТ (`isSpeakingAsync`), а не гадает
           * по длине текста: оценка «столько-то миллисекунд на символ» врёт при
           * замедленной речи и на длинных репликах диалога, и такая страховка
           * отбирала бы аренду у ЖИВОЙ озвучки — регресс вместо починки. Пока
           * движок отвечает «говорю», проверка откладывается; аренда снимается,
           * только когда речи фактически нет, а колбэк так и не пришёл. Отказ
           * опроса трактуем в пользу пользователя: считаем, что речь идёт, и
           * ждём дальше — худшее, что случится, это срабатывание общего
           * предохранителя аренды.
           */
          const SPEECH_PROBE_MS = 4_000;
          let speechGuard: ReturnType<typeof setTimeout> | null = null;
          let speechSettled = false;
          const armSpeechProbe = () => {
            speechGuard = setTimeout(() => {
              speechGuard = null;
              if (speechSettled) return;
              void Speech.isSpeakingAsync()
                .then((speaking) => {
                  if (speechSettled) return;
                  if (speaking) {
                    armSpeechProbe();
                    return;
                  }
                  console.warn('[AUDIO-LEASE] tts:completion-guard', JSON.stringify({
                    chars: spokenText.length,
                    reason: 'engine_idle_without_callback',
                  })); // guard-ok: срабатывание = движок молча бросил речь
                  speechSettled = true;
                  releaseSpeechClaim();
                })
                .catch((e: unknown) => {
                  console.warn('[AUDIO-LEASE] tts:probe-failed', JSON.stringify({
                    error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
                  })); // guard-ok: только отказ опроса
                  if (!speechSettled) armSpeechProbe();
                });
            }, SPEECH_PROBE_MS);
            // В React Native unref отсутствует — опциональный вызов это учитывает.
            (speechGuard as unknown as { unref?: () => void }).unref?.();
          };
          armSpeechProbe();
          const settleSpeech = () => {
            speechSettled = true;
            if (speechGuard != null) clearTimeout(speechGuard);
            speechGuard = null;
            releaseSpeechClaim();
          };
          const finalError = (e: Error) => {
            settleSpeech();
            opts?.onError?.(e);
          };
          const speechOptions: SpeechOptions = {
            language,
            ...(requestedVoice ? { voice: requestedVoice } : {}),
            rate: safeRate,
            pitch: opts?.pitch ?? 1,
            volume: 1,
            onStart: opts?.onStart,
            onDone: () => {
              settleSpeech();
              opts?.onDone?.();
            },
            onStopped: () => {
              settleSpeech();
              opts?.onStopped?.();
            },
            onError: requestedVoice
              ? (e: Error) => {
                  if (!voicePlaybackPolicy.canStart(voicePolicyToken)) {
                    settleSpeech();
                    return;
                  }
                  if (opts?.strictVoice) {
                    finalError(e);
                    return;
                  }
                  retrySpeechWithoutVoice(spokenText, speechOptions, finalError);
                }
              : finalError,
            ...(Platform.OS === 'ios' ? { useApplicationAudioSession: false as const } : {}),
          };
          try {
            Speech.speak(spokenText, speechOptions);
          } catch (e) {
            if (requestedVoice) {
              if (opts?.strictVoice) {
                finalError(e instanceof Error ? e : new Error(String(e)));
                return;
              }
              if (voicePlaybackPolicy.canStart(voicePolicyToken)) {
                retrySpeechWithoutVoice(spokenText, speechOptions, finalError);
              } else {
                settleSpeech();
              }
            } else {
              finalError(e instanceof Error ? e : new Error(String(e)));
            }
          }
        });
      }, STOP_SETTLE_MS);
    }
  }, [stopSystemSpeechNow]);

  return { speak, stop };
}
