import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import { getUserSettingsSnapshot, normalizeSpeechRate } from '../app/user_settings_store';
import { LOUD_PLAYBACK_AUDIO_MODE } from '../app/audio_playback_mode';
import { hasPhraseAudio, playPhraseByText, stopPhraseAudio } from './phrase_audio_player';

export function preloadAudio() {}
export function preloadSound(_text: string) {}

export type SpeakOpts = {
  pitch?: number;
  language?: string;
  voice?: string;
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

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
      safeSpeechStop();
      stopPhraseAudio();
    };
  }, []);

  const stop = useCallback(() => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    lastTextRef.current = '';
    lastSpeakAtRef.current = 0;
    safeSpeechStop();
    stopPhraseAudio();
  }, []);

  const speak = useCallback((text: string, rate?: number, opts?: SpeakOpts) => {
    const normalized = text?.trim();
    if (!normalized) return;

    const now = Date.now();
    if (normalized === lastTextRef.current && now - lastSpeakAtRef.current < 220) return;

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    safeSpeechStop();
    stopPhraseAudio();

    lastTextRef.current = normalized;
    lastSpeakAtRef.current = now;

    const settings = getUserSettingsSnapshot();
    const safeRate = normalizeSpeechRate(rate ?? settings.speechRate);
    const language = opts?.language?.trim() || inferExpoSpeechLanguage(normalized);
    const hasVoiceOverride = !!opts && Object.prototype.hasOwnProperty.call(opts, 'voice');
    const requestedVoice = hasVoiceOverride
      ? (opts.voice ?? '').trim()
      : settings.speechVoiceId.trim();

    // Prefer the high-quality OpenAI "fable" clip when one exists for this exact
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
        clipStartTimer = null;
      };
      const fallbackOnce = () => {
        if (fellBack) return;
        fellBack = true;
        clearClipStartTimer();
        stopPhraseAudio();
        speakWithSystemTts();
      };
      clipStartTimer = setTimeout(fallbackOnce, CLIP_START_TIMEOUT_MS);
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
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null;
        void setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE).catch(() => undefined).finally(() => {
          if (lastTextRef.current !== normalized) return;
          const speechOptions: SpeechOptions = {
            language,
            ...(requestedVoice ? { voice: requestedVoice } : {}),
            rate: safeRate,
            pitch: opts?.pitch ?? 1,
            volume: 1,
            onStart: opts?.onStart,
            onDone: opts?.onDone,
            onStopped: opts?.onStopped,
            onError: requestedVoice
              ? (e: Error) => retrySpeechWithoutVoice(normalized, speechOptions, opts?.onError)
              : opts?.onError,
            ...(Platform.OS === 'ios' ? { useApplicationAudioSession: false as const } : {}),
          };
          try {
            Speech.speak(normalized, speechOptions);
          } catch (e) {
            if (requestedVoice) {
              retrySpeechWithoutVoice(normalized, speechOptions, opts?.onError);
            } else {
              opts?.onError?.(e instanceof Error ? e : new Error(String(e)));
            }
          }
        });
      }, STOP_SETTLE_MS);
    }
  }, []);

  return { speak, stop };
}
