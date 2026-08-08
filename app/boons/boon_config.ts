// Weekly Boons — парсинг конфига из Remote Config (JSON-строка) в WeeklyBoonsConfig.
//
// По образцу parseLessonIdList (remote_flags.ts): любой мусор от админа тихо
// отбрасывается — конфиг не должен ронять приложение. Пусто/битый JSON → встроенный
// дефолт DEFAULT_WEEKLY_BOONS_CONFIG.

import {
  ALL_BOON_IDS,
  ALL_BOON_MODIFIER_IDS,
  type BoonId,
  type BoonModifierId,
  type BoonScheduleSlot,
  type WeeklyBoonsConfig,
} from './boon_types';

const BOON_ID_SET: ReadonlySet<string> = new Set(ALL_BOON_IDS);
const MODIFIER_ID_SET: ReadonlySet<string> = new Set(ALL_BOON_MODIFIER_IDS);

function isBoonId(v: unknown): v is BoonId {
  return typeof v === 'string' && BOON_ID_SET.has(v);
}

function isModifierId(v: unknown): v is BoonModifierId {
  return typeof v === 'string' && MODIFIER_ID_SET.has(v);
}

/**
 * Встроенный дефолт — применяется, когда «Пульт» пуст. Раскладка по умолчанию:
 *  вс → заморозка серии, пн → сундук, вт → турбо-энергия, ср → окно без энергии,
 *  чт → ×2 XP, пт → триал пака, сб → Speaking.
 * Always-on модификаторы (early_bird, perfect_week) включены.
 */
export const DEFAULT_WEEKLY_BOONS_CONFIG: WeeklyBoonsConfig = {
  schedule: {
    0: 'streak_saver',
    1: 'mystery_monday',
    2: 'turbo_regen',
    3: 'energy_free_window',
    4: 'double_xp',
    5: 'flashcard_friday',
    6: 'speaking_saturday',
  },
  enabled: {},
  modifiersEnabled: {},
};

/** Нормализует один слот расписания (BoonId | BoonId[]) → отфильтрованный слот или null. */
function parseSlot(raw: unknown): BoonScheduleSlot | null {
  if (isBoonId(raw)) return raw;
  if (Array.isArray(raw)) {
    const ids = raw.filter(isBoonId);
    if (ids.length === 0) return null;
    return ids.length === 1 ? ids[0] : ids;
  }
  return null;
}

/** Нормализует объект enabled/modifiersEnabled: оставляет только валидные ключи с boolean. */
function parseFlagMap<K extends string>(
  raw: unknown,
  isValidKey: (v: unknown) => v is K,
): Partial<Record<K, boolean>> {
  const out: Partial<Record<K, boolean>> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isValidKey(k) && typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/**
 * Парсит JSON-строку конфига в WeeklyBoonsConfig. Пусто/битое/не-объект → дефолт.
 * Отдельные битые поля внутри валидного объекта тихо игнорируются.
 */
export function parseWeeklyBoonsConfig(raw: string): WeeklyBoonsConfig {
  if (!raw || !raw.trim()) return DEFAULT_WEEKLY_BOONS_CONFIG;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_WEEKLY_BOONS_CONFIG;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return DEFAULT_WEEKLY_BOONS_CONFIG;
  }
  const obj = parsed as Record<string, unknown>;

  const schedule: Partial<Record<number, BoonScheduleSlot>> = {};
  const rawSchedule = obj.schedule;
  if (rawSchedule && typeof rawSchedule === 'object' && !Array.isArray(rawSchedule)) {
    for (const [k, v] of Object.entries(rawSchedule as Record<string, unknown>)) {
      const wd = Math.trunc(Number(k));
      if (!Number.isFinite(wd) || wd < 0 || wd > 6) continue;
      const slot = parseSlot(v);
      if (slot !== null) schedule[wd] = slot;
    }
  }

  return {
    schedule,
    enabled: parseFlagMap<BoonId>(obj.enabled, isBoonId),
    modifiersEnabled: parseFlagMap<BoonModifierId>(obj.modifiersEnabled, isModifierId),
  };
}
