/**
 * Запись «мои уровни навыков для других людей» — ключ skills_public_v1 в синхронизируемом прогрессе.
 * Владелец 11.11.2026 (D207): друзья видят навыки всегда. Телефон кладёт шесть уровней 0…30 в свой прогресс,
 * сервер отдаёт их принятым друзьям тем же ответом, которым уже отдаёт неделю друга (functions/src/friends_profiles.ts).
 *
 * зачем правило «раз в сутки»: уровень может вырасти несколько раз за вечер, а другим людям хватит вчерашней звезды —
 * запись меняется только когда уровень изменился и не чаще одного раза в календарный день, чтобы рост навыка сам
 * не будил сеть. Очки, прирост за неделю и журнал действий в запись не входят.
 */
import { parseSkillLevels, skillLevelsToWire, type SkillLevels } from './skill_visibility';

export const SKILLS_PUBLIC_STORAGE_KEY = 'skills_public_v1';

export interface SkillPublicRecord {
  readonly v: 1;
  /** Локальный день, когда запись последний раз менялась, YYYY-MM-DD. */
  readonly day: string;
  /** Шесть уровней в порядке SKILL_IDS. */
  readonly levels: readonly number[];
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type SkillPublicRecordParse =
  | Readonly<{ record: SkillPublicRecord; problem: null }>
  | Readonly<{ record: null; problem: 'empty' | 'not_json' | 'wrong_shape' }>;

/** Разбор записи с диска или из облака. Причина отказа возвращается вызывающему — он пишет её в журнал. */
export function parseSkillPublicRecord(raw: unknown): SkillPublicRecordParse {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return { record: null, problem: 'empty' };
    try {
      value = JSON.parse(raw);
    } catch (error) {
      // зачем: битая строка — штатный ответ «записи нет»; причина остаётся в журнале и уходит вызывающему
      console.warn(`[SKILLS-PUBLIC] parse:not_json ${JSON.stringify({ length: raw.length, error: error instanceof Error ? error.message : String(error) })}`); // guard-ok: catch называет причину
      return { record: null, problem: 'not_json' };
    }
  }
  if (value === null || value === undefined) return { record: null, problem: 'empty' };
  if (typeof value !== 'object' || Array.isArray(value)) return { record: null, problem: 'wrong_shape' };
  const fields = value as Record<string, unknown>;
  const levels = parseSkillLevels(fields.levels);
  if (fields.v !== 1 || typeof fields.day !== 'string' || !DAY_RE.test(fields.day) || !levels) return { record: null, problem: 'wrong_shape' };
  return { record: { v: 1, day: fields.day, levels: skillLevelsToWire(levels) }, problem: null };
}

export interface SkillPublicRecordStep {
  readonly record: SkillPublicRecord;
  /** Запись нужно сохранить и отправить; `false` — оставить прежнюю. */
  readonly changed: boolean;
  readonly reason: 'first' | 'same_levels' | 'already_today' | 'levels_changed';
}

/** Что делать с записью при текущих уровнях: создать, оставить или заменить. */
export function nextSkillPublicRecord(prev: SkillPublicRecord | null, levels: SkillLevels, dayKey: string): SkillPublicRecordStep {
  const wire = skillLevelsToWire(levels);
  if (!prev) return { record: { v: 1, day: dayKey, levels: wire }, changed: true, reason: 'first' };
  if (prev.levels.every((level, index) => level === wire[index])) return { record: prev, changed: false, reason: 'same_levels' };
  if (prev.day === dayKey) return { record: prev, changed: false, reason: 'already_today' };
  return { record: { v: 1, day: dayKey, levels: wire }, changed: true, reason: 'levels_changed' };
}
