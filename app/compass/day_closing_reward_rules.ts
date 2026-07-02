/**
 * Компас — чистые правила награды вечернего ритуала. Крыло «Экономика».
 *
 * ЗАЧЕМ: закрытие дня должно что-то стоить (петля «открыл утром — закрыл
 * вечером»), но не раздувать экономику. Здесь — только чистые функции без
 * сайд-эффектов (Date.now()/Math.random() не вызываются): расчёт XP по
 * насыщенности дня и переход серии закрытых дней. Начисление и хранение —
 * в day_closing_reward.ts (применяющий слой).
 */
import type { DayClosingRitual } from './day_closing_ritual';

/** Базовый XP за сам факт закрытия дня (ниже сундука сессии, выше задачи плана). */
const CLOSE_BASE_XP = 10;
/** Надбавка за насыщенный день (2+ вида активности в итоге). */
const CLOSE_RICH_BONUS_XP = 5;
/** Надбавка за полный день (3 вида активности — потолок сетки итога). */
const CLOSE_FULL_BONUS_XP = 5;

/**
 * Рекомендуемый XP за закрытие дня: 10 за факт, +5 за 2+ вида активности,
 * ещё +5 за 3 (максимум 20 — сопоставимо с lesson_dive из compass_economy,
 * не конкурирует с сундуком сессии).
 */
export function computeDayClosingRewardXp(ritual: Pick<DayClosingRitual, 'highlights'>): number {
  const kinds = ritual.highlights.length;
  let xp = CLOSE_BASE_XP;
  if (kinds >= 2) xp += CLOSE_RICH_BONUS_XP;
  if (kinds >= 3) xp += CLOSE_FULL_BONUS_XP;
  return xp;
}

export interface DayClosingStreak {
  /** Сколько дней подряд закрыто (включая lastDateKey). 0 = ещё ни разу. */
  count: number;
  /** Ключ даты (UTC yyyy-mm-dd) последнего закрытого дня, null = не закрывали. */
  lastDateKey: string | null;
}

/** Предыдущий календарный день для UTC-ключа yyyy-mm-dd. */
export function prevDateKey(dateKey: string): string {
  const parsed = Date.parse(`${dateKey}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return '';
  return new Date(parsed - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * Переход серии закрытых дней. Идемпотентно по дню: повторное закрытие того же
 * dateKey не растит серию. Вчера закрывал → +1; пропуск → серия начинается с 1.
 */
export function nextDayClosingStreak(prev: DayClosingStreak, dateKey: string): DayClosingStreak {
  if (!dateKey) return prev;
  if (prev.lastDateKey === dateKey) return prev;
  const continues = prev.lastDateKey != null && prev.lastDateKey === prevDateKey(dateKey);
  return {
    count: continues ? prev.count + 1 : 1,
    lastDateKey: dateKey,
  };
}

/** Безопасный разбор сохранённой серии (повреждённое значение → пустая серия). */
export function parseDayClosingStreak(raw: string | null): DayClosingStreak {
  if (!raw) return { count: 0, lastDateKey: null };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { count: 0, lastDateKey: null };
    const row = parsed as { count?: unknown; lastDateKey?: unknown };
    const count = Number(row.count);
    const lastDateKey = typeof row.lastDateKey === 'string' && row.lastDateKey ? row.lastDateKey : null;
    return {
      count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
      lastDateKey,
    };
  } catch {
    return { count: 0, lastDateKey: null };
  }
}
