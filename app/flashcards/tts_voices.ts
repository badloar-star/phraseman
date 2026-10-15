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

import { getDevVoices } from '../dev_cards_state';
import { isTechnicalVoiceName, technicalVoiceDisplayName } from './voice_display_name';

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

/** Синхронный взгляд на кэш: экран выбора голоса открывается готовым списком без кадра загрузки (аудит cards-gaps-states). null — ещё не спрашивали. */
export function peekVoicesCache(): FcVoiceLike[] | null {
  return voicesCache;
}

/**
 * Один запрос списка голосов на жизнь приложения (кэш). Ошибка → [] (оптимистичная ветка pickVoiceForLang).
 * Таймаут → [] БЕЗ записи в кэш: медленный ответ системы не должен навсегда оставить список пустым (только «Системный (авто)»).
 */
export function getVoicesOnce(): Promise<FcVoiceLike[]> {
  // зачем (координатор 12.10, cards-gap-036/038): dev `voices=demo|none` — список голосов как на образце вместо голосов эмулятора; кэш не трогаем.
  const devVoices = getDevVoices();
  if (devVoices) {
    console.warn(`[DEV-STATE] voices: список подменён n=${devVoices.length}`); // guard-ok: dev-ветка
    return Promise.resolve([...devVoices]);
  }
  if (voicesCache) {
    console.log(`[VOICE-NAME] voices:source ${JSON.stringify({ source: 'cache', count: voicesCache.length })}`);
    return Promise.resolve(voicesCache);
  }
  if (voicesInflight) return voicesInflight;
  voicesInflight = (async () => {
    try {
      const Speech = require('expo-speech') as typeof import('expo-speech');
      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), VOICES_TIMEOUT_MS),
      );
      const list = await Promise.race([
        Speech.getAvailableVoicesAsync() as Promise<FcVoiceLike[]>,
        timeout,
      ]);
      if (list === null) {
        // зачем: таймаут — не итог, список мог просто задержаться; не кэшируем пустоту, следующий вход спросит ещё раз
        console.warn('[TTS-VOICES] список голосов не пришёл за', VOICES_TIMEOUT_MS, 'мс — отдаю [] без кэша'); // guard-ok: ранний выход пишет причину
        voicesInflight = null;
        return [];
      }
      voicesCache = Array.isArray(list) ? list : [];
      console.log(`[VOICE-NAME] voices:source ${JSON.stringify({ source: 'expo-speech', count: voicesCache.length, sample: voicesCache.slice(0, 3).map((v) => ({ id: v.identifier, name: v.name ?? null, language: v.language, quality: v.quality ?? null })) })}`);
    } catch (error) {
      console.warn('[TTS-VOICES] getAvailableVoicesAsync упал —', error instanceof Error ? error.message : String(error)); // guard-ok: лог причины в catch
      voicesCache = [];
    }
    voicesInflight = null;
    return voicesCache ?? [];
  })();
  return voicesInflight;
}

/** Голос для языка (кэшированный список + чистая цепочка фолбэков).
 * E13: для en первым шагом цепочки идёт сохранённый голос из fc_voice_prefs_v1. */
export async function resolveVoiceForLang(lang: FcTtsLang): Promise<ResolvedVoice> {
  const voices = await getVoicesOnce();
  let preferred: string | null = null;
  if (lang === 'en' || lang === 'es') {
    try {
      const { getVoiceIdForLang } = require('./voice_prefs') as typeof import('./voice_prefs');
      // зачем (Ревизор 15.10): у испанского теперь тоже свой выбранный голос; английский — прежний voiceIdEn
      preferred = await getVoiceIdForLang(lang);
    } catch (error) {
      console.warn(`[VOICE-PICK] чтение выбранного голоса ${lang} не удалось — системный`, error instanceof Error ? error.message : String(error)); // guard-ok: причина фолбэка
      preferred = null;
    }
  }
  return pickVoiceForLang(voices, lang, preferred);
}

const voiceNameLogged = new Set<string>();

/** Читаемое имя: «Samantha» без служебных суффиксов (Enhanced)/(Premium).
 *  зачем: одно правило имени для экрана выбора голоса и строки «Голос озвучки (EN)» в Настройках обучения.
 *  зачем (settings-gap-034, координатор 12.10): Android отдаёт в name технический id («en-au-x-aua-local») — такой голос
 *  подписывается «English (Australia) · 2» на языке интерфейса; uiLang и список голосов (для номера) необязательны. */
export function voiceTitle(
  v: FcVoiceLike,
  uiLang?: string,
  voices?: readonly FcVoiceLike[],
  options?: Readonly<{ compact?: boolean }>,
): string {
  const compact = options?.compact === true;
  const name = (v.name ?? '').trim();
  const technical = isTechnicalVoiceName(name, v.identifier);
  let branch: string;
  let title: string;
  if (name && !technical) {
    branch = 'human_name';
    title = name.replace(/\s*\((enhanced|premium)\)\s*/i, '').trim() || name;
  } else if (technical && (name || /^[a-z]{2,3}[-_]/i.test(v.identifier))) {
    branch = 'technical_id_formatted';
    title = technicalVoiceDisplayName(v, uiLang, voices, compact);
  } else {
    // iOS-идентификатор вида com.apple.voice.compact.en-US.Samantha без имени — последний сегмент
    branch = 'identifier_tail';
    const parts = v.identifier.split('.');
    title = parts[parts.length - 1] || v.identifier;
  }
  const logKey = `${v.identifier}|${compact ? 'compact' : 'full'}`;
  if (!voiceNameLogged.has(logKey)) {
    voiceNameLogged.add(logKey);
    console.log(`[VOICE-NAME] ${JSON.stringify({ identifier: v.identifier, name: v.name ?? null, language: v.language, quality: v.quality ?? null, branch, title, compact, uiLang: uiLang ?? null, listSize: voices?.length ?? null })}`);
  }
  return title;
}

/** Только для юнит-тестов: сброс кэша модульного состояния. */
export function __resetTtsVoicesForTests(): void {
  voicesCache = null;
  voicesInflight = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
