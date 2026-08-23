import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { getUserSettingsSnapshot, normalizeSpeechRate } from '../app/user_settings_store';
import { hasPhraseAudio, playPhraseByText, stopPhraseAudio } from './phrase_audio_player';
import { voicePlaybackPolicy } from '../modules/audio/voice_playback_policy';
import {
  claimSpokenAudio,
  whenSpokenAudioReady,
  type SpokenAudioClaim,
} from '../modules/audio/audio_runtime_arbiter';
import { peekEnVoiceId } from '../app/flashcards/voice_prefs';

export function preloadAudio() {}
export function preloadSound(_text: string) {}

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
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (e: Error) => void;
};

const UK_MARKERS = /[іїєґІЇЄҐ]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;
const LATIN_LETTER_RE = /[a-zA-ZÀ-ÖØ-öø-ÿĀ-ž]/;
const STOP_SETTLE_MS = Platform.OS === 'android' ? 80 : 20;
const CLIP_START_TIMEOUT_MS = Platform.OS === 'android' ? 4500 : 3500;
type SpeechOptions = NonNullable<Parameters<typeof Speech.speak>[1]>;

function safeSpeechStop() {
  try {
    Speech.stop();
  } catch {}
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
  if (nLat >= 1 && nCyr === 0) return contentLangHint === 'es' ? 'es-ES' : 'en-US';
  return 'en-US';
}

export function speechLocaleToShortLabel(locale: string): string {
  const x = locale.trim().toLowerCase();
  if (x.startsWith('uk')) return 'UK';
  if (x.startsWith('ru')) return 'RU';
  if (x.startsWith('es')) return 'ES';
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
    stopPhraseAudio();
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
    stopPhraseAudio();

    lastTextRef.current = dedupeKey;
    lastSpeakAtRef.current = now;

    const settings = getUserSettingsSnapshot();
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
      : settingsVoice ||
        (language.toLowerCase().startsWith('en') ? (peekEnVoiceId() ?? '').trim() : '');

    // Prefer the high-quality OpenAI "echo" clip when one exists for this exact
    // text, the language is English (clips are EN-only), and the caller did not
    // force a specific system voice. Falls back to expo-speech on any miss/error.
    const isEnglish = language.toLowerCase().startsWith('en');
    const canUseClip = isEnglish && !requestedVoice && hasPhraseAudio(normalized);
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
        stopPhraseAudio();
        speakWithSystemTts();
      };
      clipStartTimer = setTimeout(fallbackOnce, CLIP_START_TIMEOUT_MS);
      clipStartTimerRef.current = clipStartTimer;
      playPhraseByText(
        normalized,
        {
          onStart: () => {
            clearClipStartTimer();
            opts?.onStart?.();
          },
          onDone: opts?.onDone,
          onError: fallbackOnce,
        },
        safeRate,
      )
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
        const speechClaim = claimSpokenAudio(stopSystemSpeechNow);
        if (!speechClaim) return;
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
            releaseSpeechClaim();
            return;
          }
          if (lastTextRef.current !== dedupeKey) {
            releaseSpeechClaim();
            return;
          }
          const finalError = (e: Error) => {
            releaseSpeechClaim();
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
              releaseSpeechClaim();
              opts?.onDone?.();
            },
            onStopped: () => {
              releaseSpeechClaim();
              opts?.onStopped?.();
            },
            onError: requestedVoice
              ? (e: Error) => {
                  if (!voicePlaybackPolicy.canStart(voicePolicyToken)) {
                    releaseSpeechClaim();
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
              if (voicePlaybackPolicy.canStart(voicePolicyToken)) {
                retrySpeechWithoutVoice(spokenText, speechOptions, finalError);
              } else {
                releaseSpeechClaim();
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
