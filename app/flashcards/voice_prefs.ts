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

/** Сохранить выбор (null = вернуться к системному). Кэш — мгновенно, диск — фоном. */
export async function setEnVoiceId(voiceId: string | null): Promise<void> {
  cachedVoiceIdEn = voiceId && voiceId.trim().length > 0 ? voiceId : null;
  hydrated = true;
  try {
    // Merge с сырым значением — не затираем будущие поля prefs.
    const raw = await AsyncStorage.getItem(FC_VOICE_PREFS_KEY);
    let base: Record<string, unknown> = {};
    try {
      const p = raw ? JSON.parse(raw) : null;
      if (p && typeof p === 'object' && !Array.isArray(p)) base = p as Record<string, unknown>;
    } catch {}
    await AsyncStorage.setItem(
      FC_VOICE_PREFS_KEY,
      JSON.stringify({ ...base, voiceIdEn: cachedVoiceIdEn }),
    );
  } catch {}
}

/** Только для юнит-тестов: сброс модульного кэша. */
export function __resetVoicePrefsForTests(): void {
  cachedVoiceIdEn = null;
  hydrated = false;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
