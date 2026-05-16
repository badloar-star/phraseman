import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { getUserSettingsSnapshot, normalizeSpeechRate } from '../app/user_settings_store';

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
      Speech.stop();
    };
  }, []);

  const stop = useCallback(() => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    lastTextRef.current = '';
    lastSpeakAtRef.current = 0;
    Speech.stop();
  }, []);

  const speak = useCallback((text: string, rate?: number, opts?: SpeakOpts) => {
    const normalized = text?.trim();
    if (!normalized) return;

    const now = Date.now();
    if (normalized === lastTextRef.current && now - lastSpeakAtRef.current < 220) return;

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    Speech.stop();

    lastTextRef.current = normalized;
    lastSpeakAtRef.current = now;

    const settings = getUserSettingsSnapshot();
    const safeRate = normalizeSpeechRate(rate ?? settings.speechRate);
    const language = opts?.language?.trim() || inferExpoSpeechLanguage(normalized);
    const requestedVoice = opts?.voice?.trim() || settings.speechVoiceId.trim();

    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      Speech.speak(normalized, {
        language,
        ...(requestedVoice ? { voice: requestedVoice } : {}),
        rate: safeRate,
        pitch: opts?.pitch ?? 1,
        volume: 1,
        onStart: opts?.onStart,
        onDone: opts?.onDone,
        onStopped: opts?.onStopped,
        onError: opts?.onError,
        ...(Platform.OS === 'ios' ? { useApplicationAudioSession: false as const } : {}),
      });
    }, STOP_SETTLE_MS);
  }, []);

  return { speak, stop };
}
