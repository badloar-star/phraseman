/**
 * cards-2.0 (E13): выбранный голос TTS для EN — ключ `fc_voice_prefs_v1`
 * (`{voiceIdEn}`; null = системный/авто). Экран выбора: app/flashcards_voice_picker.tsx.
 *
 * `useAudio().speak` — синхронный, поэтому рядом с async-геттером живёт
 * прогретый кэш `peekEnVoiceId()` (паттерн cachedSfxOn в SoundService):
 * значение подтягивается при импорте модуля и после каждого set.
 * Идентификаторы голосов НЕ хардкодятся (§3.8 п.8) — только выбор юзера
 * из Speech.getAvailableVoicesAsync (tts_voices.getVoicesOnce).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../debug-logger';

export const FC_VOICE_PREFS_KEY = 'fc_voice_prefs_v1';

export type FcVoicePrefs = {
  /** identifier выбранного EN-голоса; null — системный (авто по language). */
  voiceIdEn: string | null;
};

export const DEFAULT_VOICE_PREFS: FcVoicePrefs = { voiceIdEn: null };

/** Толерантный парсинг сырого JSON (битое/чужое → дефолт). Чистая — для тестов. */
export function parseVoicePrefs(raw: string | null | undefined): FcVoicePrefs {
  if (!raw || !raw.trim()) return { ...DEFAULT_VOICE_PREFS };
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return { ...DEFAULT_VOICE_PREFS };
    const v = p.voiceIdEn;
    return { voiceIdEn: typeof v === 'string' && v.trim().length > 0 ? v : null };
  } catch {
    return { ...DEFAULT_VOICE_PREFS };
  }
}

// ── Кэш для синхронного speak (hooks/use-audio) ──────────────────────────────
let cachedVoiceIdEn: string | null = null;
let hydrated = false;

/** Прогрев кэша при импорте — speak() остаётся синхронным. */
void AsyncStorage.getItem(FC_VOICE_PREFS_KEY)
  .then((raw) => {
    if (!hydrated) {
      cachedVoiceIdEn = parseVoicePrefs(raw).voiceIdEn;
      hydrated = true;
    }
  })
  .catch(() => {
    hydrated = true;
  });

/** Синхронный снимок выбранного EN-голоса (null = авто). */
export function peekEnVoiceId(): string | null {
  return cachedVoiceIdEn;
}

let setVoiceSeq = 0;

/** Актуальные prefs с диска (кэш обновляется попутно). */
export async function getVoicePrefs(): Promise<FcVoicePrefs> {
  try {
    const raw = await AsyncStorage.getItem(FC_VOICE_PREFS_KEY);
    const prefs = parseVoicePrefs(raw);
    cachedVoiceIdEn = prefs.voiceIdEn;
    hydrated = true;
    return prefs;
  } catch {
    return { voiceIdEn: cachedVoiceIdEn };
  }
}

/**
 * Сохранить выбор (null = вернуться к системному). Кэш — мгновенно, диск — фоном.
 * зачем (аудит Optimistic UI 15.10): раньше сбой записи только уходил в DebugLogger и экран не знал о нём — выбор «держался» до перезапуска и молча пропадал.
 * Теперь возвращает true, если диск принял запись; false — экран откатывает выбор (`[VOICE-PICK]`).
 */
export async function setEnVoiceId(voiceId: string | null): Promise<boolean> {
  // зачем (Ревизор P1, 15.10): при сбое записи кэш (его читает озвучка) тоже возвращается к прежнему — иначе экран показывает старый голос, а речь идёт новым до перезапуска; номер записи защищает более новый выбор
  const previousCached = cachedVoiceIdEn;
  const mySeq = ++setVoiceSeq;
  cachedVoiceIdEn = voiceId && voiceId.trim().length > 0 ? voiceId : null;
  hydrated = true;
  try {
    // Merge с сырым значением — не затираем будущие поля prefs.
    const raw = await AsyncStorage.getItem(FC_VOICE_PREFS_KEY);
    let base: Record<string, unknown> = {};
    try {
      const p = raw ? JSON.parse(raw) : null;
      if (p && typeof p === 'object' && !Array.isArray(p)) base = p as Record<string, unknown>;
    } catch (e) {
      DebugLogger.error('voice_prefs:p', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    await AsyncStorage.setItem(
      FC_VOICE_PREFS_KEY,
      JSON.stringify({ ...base, voiceIdEn: cachedVoiceIdEn }),
    );
    return true;
  } catch (e) {
    const rolledBack = setVoiceSeq === mySeq;
    if (rolledBack) cachedVoiceIdEn = previousCached;
    console.warn(`[VOICE-PICK] запись выбора голоса на диск не удалась id=${voiceId ?? 'авто'} — кэш ${rolledBack ? `возвращён на ${previousCached ?? 'авто'}` : 'не трогаю: уже есть более новый выбор'} — ${e instanceof Error ? e.message : String(e)}`); // guard-ok: причина отказа записи
    DebugLogger.error('voice_prefs:p', e instanceof Error ? e : new Error(String(e)), 'warning');
    return false;
  }
}

// ── Голос для остальных изучаемых языков (Ревизор 15.10, 🟡 к e6392a5a7) ─────────────────────────────────
// зачем: выбор голоса был только среди en-*, а озвучка es/fr/de/it шла системным голосом без выбора. Английский остаётся
// в прежнем ключе (fc_voice_prefs_v1 {voiceIdEn}) — старые установки и сторожа не меняются; остальные языки — в своём ключе.
export const FC_VOICE_PREFS_BY_LANG_KEY = 'fc_voice_prefs_by_lang_v1';
export type VoiceStudyLang = 'en' | 'es' | 'fr' | 'de' | 'it';
type OtherLang = Exclude<VoiceStudyLang, 'en'>;
const OTHER_LANGS: readonly OtherLang[] = ['es', 'fr', 'de', 'it'];

/** 'es-ES' / 'es' / 'ES' → 'es'; иначе null. */
export function voiceStudyLangOf(value: unknown): VoiceStudyLang | null {
  if (typeof value !== 'string') return null;
  const short = value.trim().toLowerCase().split(/[-_]/)[0];
  return short === 'en' || (OTHER_LANGS as readonly string[]).includes(short) ? (short as VoiceStudyLang) : null;
}

export function parseVoicePrefsByLang(raw: string | null | undefined): Partial<Record<OtherLang, string>> {
  if (!raw || !raw.trim()) return {};
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return {};
    const out: Partial<Record<OtherLang, string>> = {};
    for (const lang of OTHER_LANGS) {
      const v = p[lang];
      if (typeof v === 'string' && v.trim().length > 0) out[lang] = v;
    }
    return out;
  } catch (e) {
    DebugLogger.error('voice_prefs:by_lang_parse', e instanceof Error ? e : new Error(String(e)), 'warning');
    return {};
  }
}

let cachedByLang: Partial<Record<OtherLang, string>> = {};
let byLangHydrated = false;
void AsyncStorage.getItem(FC_VOICE_PREFS_BY_LANG_KEY)
  .then((raw) => {
    if (!byLangHydrated) {
      cachedByLang = parseVoicePrefsByLang(raw);
      byLangHydrated = true;
    }
  })
  .catch((e: unknown) => {
    byLangHydrated = true;
    DebugLogger.error('voice_prefs:by_lang_hydrate', e instanceof Error ? e : new Error(String(e)), 'warning');
  });

/** Синхронный снимок выбранного голоса для языка речи ('fr-FR' / 'fr'); null — системный. */
export function peekVoiceIdForLocale(locale: string): string | null {
  const lang = voiceStudyLangOf(locale);
  if (lang === null) return null;
  return lang === 'en' ? cachedVoiceIdEn : (cachedByLang[lang] ?? null);
}

/** Выбор для языка с диска (кэш обновляется попутно). */
export async function getVoiceIdForLang(lang: VoiceStudyLang): Promise<string | null> {
  if (lang === 'en') return (await getVoicePrefs()).voiceIdEn;
  try {
    cachedByLang = parseVoicePrefsByLang(await AsyncStorage.getItem(FC_VOICE_PREFS_BY_LANG_KEY));
    byLangHydrated = true;
  } catch (e) {
    DebugLogger.error('voice_prefs:by_lang_read', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
  return cachedByLang[lang] ?? null;
}

let setByLangSeq = 0;
/** Сохранить выбор для языка (null — системный). Кэш — сразу; false — диск не принял, кэш откатан (экран откатывает выбор). */
export async function setVoiceIdForLang(lang: VoiceStudyLang, voiceId: string | null): Promise<boolean> {
  if (lang === 'en') return setEnVoiceId(voiceId);
  const previous = cachedByLang;
  const mySeq = ++setByLangSeq;
  const next: Partial<Record<OtherLang, string>> = { ...cachedByLang };
  if (voiceId && voiceId.trim().length > 0) next[lang] = voiceId; else delete next[lang];
  cachedByLang = next;
  byLangHydrated = true;
  try {
    await AsyncStorage.setItem(FC_VOICE_PREFS_BY_LANG_KEY, JSON.stringify(next));
    return true;
  } catch (e) {
    const rolledBack = setByLangSeq === mySeq;
    if (rolledBack) cachedByLang = previous;
    console.warn(`[VOICE-PICK] запись голоса ${lang}=${voiceId ?? 'авто'} не удалась — кэш ${rolledBack ? 'возвращён' : 'не трогаю: есть более новый выбор'} — ${e instanceof Error ? e.message : String(e)}`); // guard-ok: причина отказа записи
    return false;
  }
}

/** Только для юнит-тестов: сброс модульного кэша. */
export function __resetVoicePrefsForTests(): void {
  cachedVoiceIdEn = null;
  hydrated = false;
  cachedByLang = {};
  byLangHydrated = false;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
