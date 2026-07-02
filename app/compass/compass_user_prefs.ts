/**
 * Компас — ПОЛЬЗОВАТЕЛЬСКИЕ настройки (не путать с админскими remote-флагами
 * compass_flags: те — kill-switch владельца, эти — личный выбор ученика).
 *
 * Слои гейтинга поверхности Компаса:
 *   1) compassOn() (админ, remote) — выключено → Компаса нет вообще;
 *   2) эти prefs (ученик, локально) — выключил брифинг → утром тишина.
 *
 * Хранение: один JSON-ключ в AsyncStorage, дефолт — всё включено (поведение
 * до появления настроек не меняется). Чтение/запись — иммутабельно.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'compass_user_prefs_v1';

export interface CompassUserPrefs {
  /** Утренний брифинг дня (включая приветствия первого дня/возврата). */
  briefing: boolean;
  /** Вечерний итог дня (ритуал закрытия). */
  dayClosing: boolean;
  /** Живой ИИ-голос в брифинге (выкл → всегда текст Библии, 0 вызовов CF). */
  aiVoice: boolean;
  /** Соц-сводка «Кстати…» в брифинге (заявки/принятия/лайки). */
  social: boolean;
}

export const DEFAULT_COMPASS_USER_PREFS: CompassUserPrefs = {
  briefing: true,
  dayClosing: true,
  aiVoice: true,
  social: true,
};

function readBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Защитный разбор сохранённых настроек: мусор → дефолты (всё включено). */
export function parseCompassUserPrefs(raw: string | null): CompassUserPrefs {
  if (!raw) return { ...DEFAULT_COMPASS_USER_PREFS };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_COMPASS_USER_PREFS };
    const row = parsed as Partial<Record<keyof CompassUserPrefs, unknown>>;
    return {
      briefing: readBool(row.briefing, DEFAULT_COMPASS_USER_PREFS.briefing),
      dayClosing: readBool(row.dayClosing, DEFAULT_COMPASS_USER_PREFS.dayClosing),
      aiVoice: readBool(row.aiVoice, DEFAULT_COMPASS_USER_PREFS.aiVoice),
      social: readBool(row.social, DEFAULT_COMPASS_USER_PREFS.social),
    };
  } catch {
    return { ...DEFAULT_COMPASS_USER_PREFS };
  }
}

export async function loadCompassUserPrefs(): Promise<CompassUserPrefs> {
  const raw = await AsyncStorage.getItem(PREFS_KEY).catch(() => null);
  return parseCompassUserPrefs(raw);
}

/** Иммутабельное частичное обновление; возвращает новое состояние целиком. */
export async function saveCompassUserPrefs(patch: Partial<CompassUserPrefs>): Promise<CompassUserPrefs> {
  const current = await loadCompassUserPrefs();
  const next: CompassUserPrefs = { ...current, ...patch };
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  return next;
}
