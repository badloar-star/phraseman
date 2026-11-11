/**
 * Голос карточки — только голос устройства нужного языка.
 *
 * зачем (владелец 11.11.2026, «удали всю озвучку»): заранее сгенерированных клипов карточек
 * (D128, OpenAI TTS, папка card-audio в хранилище) больше нет. Карточку читает встроенный голос
 * телефона, но ТОЛЬКО голос ровно этого языка; иначе — спокойное «Голос недоступен»
 * (паттерн app/dialogue_voice_capability.ts), никогда не чужой язык.
 *
 * resolveCardTtsTarget и память промахов оставлены пустыми заглушками: их вызывает
 * hooks/use-audio.ts, который сейчас правит другая сессия. «Клипа нет» → use-audio сразу
 * идёт в speakCardWithDevice. Убрать заглушки вместе с веткой клипа в use-audio.
 */
export type CardTtsLanguage = 'en' | 'es' | 'fr' | 'de' | 'it';

/** 'es-ES' → 'es'; ru/uk/zxx и прочее → null (эти языки клипами не озвучиваются). */
export function cardTtsLanguageFromSpeechLocale(locale: string | null | undefined): CardTtsLanguage | null {
  const x = String(locale ?? '').trim().toLowerCase().replace(/_/g, '-');
  const base = x.split('-')[0];
  return base === 'en' || base === 'es' || base === 'fr' || base === 'de' || base === 'it' ? base : null;
}

export type CardTtsTarget = Readonly<{
  language: CardTtsLanguage;
  text: string;
  key: string;
  objectPath: string;
  url: string;
  cacheKey: string;
}>;

/** Клипов нет: всегда null → вызывающий говорит голосом устройства. */
export async function resolveCardTtsTarget(
  _language: CardTtsLanguage,
  _rawText: string,
): Promise<CardTtsTarget | null> {
  return null;
}

/** Клипов нет — помнить промахи незачем. */
export function isCardTtsKnownMissing(_key: string, _nowMs: number = Date.now()): boolean {
  return false;
}

export function markCardTtsMissing(_key: string, _nowMs: number = Date.now()): void {}

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
 * на любом устройстве.
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
  lastUnavailableNoticeAt = 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
