// listen_audio.ts — откуда звучит задание Шпиля «на слух» (PM-286-A2).
//
// зачем (D47 + D55): своей озвучки у заданий Шпиля нет и скачивать её нельзя
// (D47 убрал все способы скачивания озвучки V2). Задание из Learning V2 несёт
// `audioUri: device-tts:<lang>:<hash>` — это знак «произнеси голосом телефона
// текст `phrase`». Модуль чистый: решает ЧТО и НА КАКОМ языке сказать, а сам
// вызов expo-speech делает экран (зона сессии «Дизайн», components/spire/*).
// Нечитаемый URI — не молчим: возвращаем причину, экран её логирует.

/** Языки Шпиля (D133): en/es/fr/de; it — нет. */
export const SPIRE_LISTEN_SPEECH_LANGUAGE = Object.freeze({
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
} as const);

export type SpireListenLang = keyof typeof SPIRE_LISTEN_SPEECH_LANGUAGE;

export type SpireListenAudio =
  | Readonly<{ ok: true; engine: 'device_tts'; text: string; speechLanguage: string; lang: SpireListenLang }>
  | Readonly<{ ok: false; reason: 'not_device_tts' | 'unsupported_lang' | 'empty_text' | 'lang_mismatch'; detail: string }>;

const DEVICE_TTS_RE = /^device-tts:([a-z]{2}):[0-9a-f]+$/;

export function resolveSpireListenAudio(
  payload: Readonly<{ audioUri?: unknown; phrase?: unknown }>,
  studyTarget: string,
): SpireListenAudio {
  const uri = typeof payload.audioUri === 'string' ? payload.audioUri.trim() : '';
  const match = DEVICE_TTS_RE.exec(uri);
  if (!match) return { ok: false, reason: 'not_device_tts', detail: `audioUri=${uri || '<пусто>'}` };
  const lang = match[1];
  if (!(lang in SPIRE_LISTEN_SPEECH_LANGUAGE)) return { ok: false, reason: 'unsupported_lang', detail: `lang=${lang}` };
  if (lang !== studyTarget) return { ok: false, reason: 'lang_mismatch', detail: `uri=${lang} target=${studyTarget}` };
  const text = typeof payload.phrase === 'string' ? payload.phrase.trim() : '';
  if (!text) return { ok: false, reason: 'empty_text', detail: `audioUri=${uri}` };
  const key = lang as SpireListenLang;
  return { ok: true, engine: 'device_tts', text, speechLanguage: SPIRE_LISTEN_SPEECH_LANGUAGE[key], lang: key };
}
