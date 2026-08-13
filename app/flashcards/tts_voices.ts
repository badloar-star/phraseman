/**
 * cards-2.0 (E10): выбор TTS-голосов с фолбэк-цепочками (§3.8, п.8 критики).
 * Идентификаторы голосов НЕ хардкодятся — только Speech.getAvailableVoicesAsync()
 * (один раз, с кэшем) + приоритет по полю quality (Enhanced/Premium).
 *
 * Цепочки:
 *  - en: en-US → en-GB → любой en-*;
 *  - uk: uk-UA/uk-* → ru-RU/ru-* → «нет озвучки» (текст показывается визуально);
 *  - ru: ru-RU/ru-* → «нет озвучки»;
 *  - es: es-ES → любой es-* → «нет озвучки».
 *
 * Пустой список голосов (часть Android-движков и headless web возвращают []) —
 * оптимистичная ветка: available=true с каноничным BCP-47 без voiceId, движок
 * сам подберёт голос по language в Speech.speak.
 *
 * Чистая pickVoiceForLang(voices, lang) — для юнит-тестов (tests/fc_tts_voices).
 */

export type FcTtsLang = 'en' | 'uk' | 'ru' | 'es';

/** Подмножество Speech.Voice, достаточное для выбора (quality — enum или строка). */
export type FcVoiceLike = {
  identifier: string;
  name?: string;
  quality?: string;
  language: string;
};

export type ResolvedVoice = {
  /** false — голоса нет даже после фолбэков → ветка «текст без озвучки» (§3.8). */
  available: boolean;
  /** BCP-47 для Speech.speak (канон или язык фолбэка, напр. uk → ru-RU). */
  language: string;
  /** Лучший найденный голос (Enhanced/Premium приоритетнее). */
  voiceId?: string;
  /** Заполнено, когда сработал языковой фолбэк (uk → 'ru'). */
  usedFallbackLang?: FcTtsLang;
};

/** Цепочка фолбэков: языки по убыванию приоритета; префиксы — внутри языка. */
const FALLBACK_CHAINS: Record<FcTtsLang, { lang: FcTtsLang; canonical: string; prefixes: string[] }[]> = {
  en: [{ lang: 'en', canonical: 'en-US', prefixes: ['en-us', 'en-gb', 'en'] }],
  ru: [{ lang: 'ru', canonical: 'ru-RU', prefixes: ['ru'] }],
  uk: [
    { lang: 'uk', canonical: 'uk-UA', prefixes: ['uk'] },
    { lang: 'ru', canonical: 'ru-RU', prefixes: ['ru'] },
  ],
  es: [{ lang: 'es', canonical: 'es-ES', prefixes: ['es-es', 'es'] }],
};

const normalizeTag = (tag: string): string => tag.trim().toLowerCase().replace(/_/g, '-');

/** BCP-47 → наш язык ('uk-UA' → 'uk'); незнакомое → 'en'. */
export function ttsLangFromLocale(locale: string): FcTtsLang {
  const x = normalizeTag(locale);
  if (x.startsWith('uk')) return 'uk';
  if (x.startsWith('ru')) return 'ru';
  if (x.startsWith('es')) return 'es';
  return 'en';
}

/** Enhanced/Premium (по quality, затем по имени) > обычный. Без хардкода id. */
function voiceQualityScore(v: FcVoiceLike): number {
  const q = (v.quality ?? '').toLowerCase();
  if (q.includes('enhanced') || q.includes('premium')) return 2;
  const n = (v.name ?? '').toLowerCase();
  if (n.includes('enhanced') || n.includes('premium')) return 1;
  return 0;
}

/**
 * Чистый выбор голоса по цепочке фолбэков. voices — снимок
 * getAvailableVoicesAsync (может быть пуст — тогда оптимистичная ветка).
 * E13: preferredVoiceId (fc_voice_prefs_v1) — «сохранённый» шаг цепочки §3.8:
 * если голос ещё существует в списке (или список пуст — доверяем), берём его.
 */
export function pickVoiceForLang(
  voices: readonly FcVoiceLike[],
  lang: FcTtsLang,
  preferredVoiceId?: string | null,
): ResolvedVoice {
  const chain = FALLBACK_CHAINS[lang];
  const primary = chain[0]!;
  if (preferredVoiceId) {
    const saved = voices.find((v) => v.identifier === preferredVoiceId);
    if (saved) {
      return { available: true, language: saved.language || primary.canonical, voiceId: saved.identifier };
    }
    if (voices.length === 0) {
      // Список пуст (движок не отдал) — доверяем сохранённому выбору юзера.
      return { available: true, language: primary.canonical, voiceId: preferredVoiceId };
    }
    // Голос удалён с устройства → обычная цепочка ниже.
  }
  if (voices.length === 0) {
    // Движок не отдал список (пустой список ≠ «нет голосов» на части Android/web) —
    // доверяем language-тегу в Speech.speak.
    return { available: true, language: primary.canonical };
  }
  for (const entry of chain) {
    for (const prefix of entry.prefixes) {
      const candidates = voices.filter((v) => normalizeTag(v.language).startsWith(prefix));
      if (candidates.length === 0) continue;
      let best = candidates[0]!;
      for (const c of candidates) {
        if (voiceQualityScore(c) > voiceQualityScore(best)) best = c;
      }
      return {
        available: true,
        language: best.language || entry.canonical,
        voiceId: best.identifier,
        ...(entry.lang !== lang ? { usedFallbackLang: entry.lang } : {}),
      };
    }
  }
  return { available: false, language: primary.canonical };
}

// ── Кэш getAvailableVoicesAsync ──────────────────────────────────────────────

let voicesCache: FcVoiceLike[] | null = null;
let voicesInflight: Promise<FcVoiceLike[]> | null = null;

/** Web: onvoiceschanged может не стрельнуть (headless) — промис зависает; страхуемся. */
const VOICES_TIMEOUT_MS = 2000;

/**
 * Один запрос списка голосов на жизнь приложения (кэш). Ошибка/таймаут → []
 * (оптимистичная ветка pickVoiceForLang).
 */
export function getVoicesOnce(): Promise<FcVoiceLike[]> {
  if (voicesCache) return Promise.resolve(voicesCache);
  if (voicesInflight) return voicesInflight;
  voicesInflight = (async () => {
    try {
      const Speech = require('expo-speech') as typeof import('expo-speech');
      const timeout = new Promise<FcVoiceLike[]>((resolve) =>
        setTimeout(() => resolve([]), VOICES_TIMEOUT_MS),
      );
      const list = await Promise.race([
        Speech.getAvailableVoicesAsync() as Promise<FcVoiceLike[]>,
        timeout,
      ]);
      voicesCache = Array.isArray(list) ? list : [];
    } catch {
      voicesCache = [];
    }
    voicesInflight = null;
    return voicesCache;
  })();
  return voicesInflight;
}

/** Голос для языка (кэшированный список + чистая цепочка фолбэков).
 * E13: для en первым шагом цепочки идёт сохранённый голос из fc_voice_prefs_v1. */
export async function resolveVoiceForLang(lang: FcTtsLang): Promise<ResolvedVoice> {
  const voices = await getVoicesOnce();
  let preferred: string | null = null;
  if (lang === 'en') {
    try {
      const { getVoicePrefs } = require('./voice_prefs') as typeof import('./voice_prefs');
      preferred = (await getVoicePrefs()).voiceIdEn;
    } catch {
      preferred = null;
    }
  }
  return pickVoiceForLang(voices, lang, preferred);
}

/** Только для юнит-тестов: сброс кэша модульного состояния. */
export function __resetTtsVoicesForTests(): void {
  voicesCache = null;
  voicesInflight = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
