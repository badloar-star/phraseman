/**
 * D128: клипы OpenAI для карточек — клиентское зеркало functions/src/card_tts_core.ts.
 *
 * зачем: карточка обязана звучать голосом нужного языка. Сервер кладёт клип по
 * детерминированному пути (хэш языка+голоса+модели+текста), клиент вычисляет ту
 * же ссылку сам — без единого чтения Firestore на карточку. Нет клипа → голос
 * устройства, но ТОЛЬКО если на устройстве есть голос ровно этого языка; иначе —
 * спокойное «Голос недоступен» (паттерн app/dialogue_voice_capability.ts),
 * никогда не чужой язык.
 *
 * Константы держать равными серверным: сторож tests/card_tts_client_server_parity.test.ts.
 */
import * as Crypto from 'expo-crypto';

export type CardTtsLanguage = 'en' | 'es' | 'fr' | 'de' | 'it';

export const CARD_TTS_MODEL = 'gpt-4o-mini-tts';
export const CARD_TTS_VOICE_BY_LANGUAGE: Readonly<Record<CardTtsLanguage, string>> = Object.freeze({
  en: 'echo',
  es: 'marin',
  fr: 'marin',
  de: 'marin',
  it: 'marin',
});
export const CARD_TTS_STYLE_VERSION = 'v1';
export const CARD_TTS_MAX_CHARS = 300;
export const CARD_TTS_STORAGE_PREFIX = 'card-audio';
export const CARD_TTS_DEFAULT_BUCKET = 'phraseman-ea0b3.firebasestorage.app';

/** Промах «клипа нет» помним недолго: сервер мог озвучить набор за это время. */
const MISSING_TTL_MS = 10 * 60 * 1000;
const MISSING_MAX_ENTRIES = 500;

type Sha256Hex = (material: string) => Promise<string>;

const expoSha256: Sha256Hex = (material) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, material, {
    encoding: Crypto.CryptoEncoding.HEX,
  });

/** 'es-ES' → 'es'; ru/uk/zxx и прочее → null (эти языки клипами не озвучиваются). */
export function cardTtsLanguageFromSpeechLocale(locale: string | null | undefined): CardTtsLanguage | null {
  const x = String(locale ?? '').trim().toLowerCase().replace(/_/g, '-');
  const base = x.split('-')[0];
  return base === 'en' || base === 'es' || base === 'fr' || base === 'de' || base === 'it' ? base : null;
}

export function normalizeCardTtsText(text: unknown): string {
  let s = String(text ?? '');
  try {
    s = s.normalize('NFC');
  } catch (error: unknown) {
    // Движок без normalize — берём текст как есть; ключ совпадёт для уже NFC-текста.
    console.warn('[CARD-TTS] normalize_unavailable', error instanceof Error ? error.message : String(error)); // guard-ok: проглоченная ошибка пишет причину
  }
  return s.trim().replace(/\s+/g, ' ');
}

function formatToken(hex: string): string {
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}

export type CardTtsTarget = Readonly<{
  language: CardTtsLanguage;
  text: string;
  key: string;
  objectPath: string;
  url: string;
  /** Ключ дискового кэша плеера (hooks/phrase_audio_player.ts). */
  cacheKey: string;
}>;

/** null — текст пуст/слишком длинный: клипа по правилам сервера быть не может. */
export async function resolveCardTtsTarget(
  language: CardTtsLanguage,
  rawText: string,
  sha256Hex: Sha256Hex = expoSha256,
): Promise<CardTtsTarget | null> {
  const text = normalizeCardTtsText(rawText);
  if (!text || text.length > CARD_TTS_MAX_CHARS) return null;
  const material = [
    `card-tts-${CARD_TTS_STYLE_VERSION}`,
    language,
    CARD_TTS_VOICE_BY_LANGUAGE[language],
    CARD_TTS_MODEL,
    text,
  ].join('\n');
  const key = (await sha256Hex(material)).toLowerCase().slice(0, 40);
  const objectPath = `${CARD_TTS_STORAGE_PREFIX}/${CARD_TTS_STYLE_VERSION}/${language}/${key}.mp3`;
  const token = formatToken((await sha256Hex(`card-audio-token:${objectPath}`)).toLowerCase());
  const url = `https://firebasestorage.googleapis.com/v0/b/${CARD_TTS_DEFAULT_BUCKET}`
    + `/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
  return { language, text, key, objectPath, url, cacheKey: `card_${language}_${key}` };
}

// ── Память промахов (без сети на каждый тап по неозвученной карточке) ────────

const missingUntil = new Map<string, number>();

export function isCardTtsKnownMissing(key: string, nowMs: number = Date.now()): boolean {
  const until = missingUntil.get(key);
  if (until == null) return false;
  if (until > nowMs) return true;
  missingUntil.delete(key);
  return false;
}

export function markCardTtsMissing(key: string, nowMs: number = Date.now()): void {
  if (missingUntil.size >= MISSING_MAX_ENTRIES) {
    const oldest = missingUntil.keys().next().value;
    if (oldest !== undefined) missingUntil.delete(oldest);
  }
  missingUntil.set(key, nowMs + MISSING_TTL_MS);
}

// ── Голос устройства: только точное совпадение языка ─────────────────────────

export type CardDeviceVoiceLike = Readonly<{ identifier: string; language: string }>;

export type CardDeviceVoiceRoute =
  | Readonly<{ available: true; locale: string }>
  | Readonly<{ available: false; reason: 'inventory_unverified' | 'exact_language_missing' }>;

const CANONICAL_LOCALE: Readonly<Record<CardTtsLanguage, string>> = Object.freeze({
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
});

/**
 * Список голосов — доказательство, а не подсказка (как в диалогах). Пустой
 * список для не-английского языка = «не доказано» → недоступно: иначе движок
 * молча возьмёт голос по умолчанию и прочтёт испанское слово английским.
 * Английский оставляем доступным и при пустом списке — английский голос есть
 * на любом устройстве, и так вели себя карточки до D128.
 */
export function resolveCardDeviceVoice(
  language: CardTtsLanguage,
  voices: readonly CardDeviceVoiceLike[] | null | undefined,
): CardDeviceVoiceRoute {
  const list = Array.isArray(voices) ? voices : [];
  if (list.length === 0) {
    return language === 'en'
      ? { available: true, locale: CANONICAL_LOCALE.en }
      : { available: false, reason: 'inventory_unverified' };
  }
  const canonical = CANONICAL_LOCALE[language].toLowerCase();
  const tags = list
    .filter((v) => String(v.identifier ?? '').trim().length > 0)
    .map((v) => String(v.language ?? '').trim().toLowerCase().replace(/_/g, '-'));
  if (tags.includes(canonical)) return { available: true, locale: CANONICAL_LOCALE[language] };
  const sameLanguage = tags.find((tag) => tag === language || tag.startsWith(`${language}-`));
  return sameLanguage
    ? { available: true, locale: sameLanguage }
    : { available: false, reason: 'exact_language_missing' };
}

// ── «Голос недоступен» — спокойная подсказка, не чаще раза в 15 секунд ───────

const UNAVAILABLE_NOTICE_COOLDOWN_MS = 15_000;
let lastUnavailableNoticeAt = 0;

export function notifyCardVoiceUnavailable(language: CardTtsLanguage, reason: string, nowMs: number = Date.now()): boolean {
  console.warn('[CARD-TTS] voice:unavailable', JSON.stringify({ language, reason })); // guard-ok: трасса отказа озвучки
  if (nowMs - lastUnavailableNoticeAt < UNAVAILABLE_NOTICE_COOLDOWN_MS) return false;
  lastUnavailableNoticeAt = nowMs;
  try {
    // Ленивый require: модуль событий тянет много зависимостей, тестам и
    // холодному старту он здесь не нужен.
    const { emitAppEvent, actionToastTri } = require('../events') as typeof import('../events');
    emitAppEvent('action_toast', actionToastTri('info', {
      ru: 'Голос недоступен',
      uk: 'Голос недоступний',
      en: 'Voice unavailable',
      es: 'Voz no disponible',
      'pt-BR': 'Voz indisponível',
      vi: 'Không có giọng đọc',
      id: 'Suara tidak tersedia',
      tr: 'Ses kullanılamıyor',
      pl: 'Głos niedostępny',
    }));
    return true;
  } catch (error: unknown) {
    console.warn('[CARD-TTS] voice:unavailable_notice_failed', error instanceof Error ? error.message : String(error)); // guard-ok: проглоченная ошибка пишет причину
    return false;
  }
}

/** Только для тестов. */
export function __resetCardTtsAudioForTests(): void {
  missingUntil.clear();
  lastUnavailableNoticeAt = 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
