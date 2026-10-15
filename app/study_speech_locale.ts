/**
 * Язык распознавания речи и озвучки по изучаемому языку (studyTarget) или языку набора карточек (packLanguage).
 *
 * зачем (аудит R49 + R57, координатор 15.10): es/fr/de/it открыты всем, а микрофоны в уроке, «Моих ошибках», Карточках
 * и онбординге слушали по-английски (зашитый 'en-US' или только fr/en), озвучка карточек тоже читала чужой язык
 * английским голосом. Один источник для всех микрофонов и TTS; сторож tests/study_speech_locale_contract.test.ts
 * не даёт снова зашить 'en-US' в местах речи.
 *
 * Точная локаль важна: «es-MX» не доказательство «es-ES» (см. dialogue_voice_capability.ts) — берём ту же таблицу, что Диалоги,
 * и добавляем итальянский.
 */
export type SpeechStudyLanguage = 'en' | 'es' | 'fr' | 'de' | 'it';

export const STUDY_SPEECH_LOCALE: Readonly<Record<SpeechStudyLanguage, string>> = Object.freeze({
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
});

/** Язык по умолчанию, когда изучаемый неизвестен (старые данные, пустой набор). */
export const DEFAULT_STUDY_SPEECH_LOCALE = STUDY_SPEECH_LOCALE.en;

/** 'es' / 'ES' / 'es-ES' / 'es_MX' → 'es'; иначе null. */
export function speechStudyLanguageOf(value: unknown): SpeechStudyLanguage | null {
  if (typeof value !== 'string') return null;
  const short = value.trim().toLowerCase().split(/[-_]/)[0];
  return short === 'en' || short === 'es' || short === 'fr' || short === 'de' || short === 'it' ? short : null;
}

/**
 * Локаль распознавания/озвучки для изучаемого языка. Неизвестное значение → английский с одной строкой журнала
 * (раньше молча становилось английским — так и прятался этот баг).
 */
export function studySpeechLocale(target: unknown, surface = 'unknown'): string {
  const lang = speechStudyLanguageOf(target);
  if (lang) return STUDY_SPEECH_LOCALE[lang];
  if (target !== undefined && target !== null && target !== '') {
    console.warn('[SPEECH-LOCALE] неизвестный язык → en-US', JSON.stringify({ surface, target: String(target).slice(0, 16) })); // guard-ok: редкий ранний выход
  }
  return DEFAULT_STUDY_SPEECH_LOCALE;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
