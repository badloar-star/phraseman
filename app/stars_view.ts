/**
 * Клиентская проекция единого баланса звёзд.
 *
 * Владелец (D-05/D-06): звезда — одна общая валюта приложения. Внешние
 * подтверждённые события пишет server ledger, а обычные локальные награды
 * (например Spin) добавляются неизменяемым client-authoritative composite по
 * Economy Constitution. Клиентская проекция никогда не откатывает уже
 * зафиксированную локальную награду из-за сбоя сети.
 *
 * Функции ниже — байт-в-байт копии серверных проекций. Расхождение здесь
 * означает, что игрок видит одно число, а получает другое, поэтому есть тест
 * на паритет.
 *
 * ВАЖНО: читать `weekEarned`, `prevWeekEarned` и `seasonEarned` напрямую
 * запрещено. Устаревший счётчик выглядит как настоящее число, и именно такое
 * прямое чтение раздавало награды сезонного пропуска по счётчику ПРОШЛОГО
 * сезона. Только через проекции.
 */

export const STARS_SCHEMA_VERSION = 'stars.v1' as const;

export type StarsView = Readonly<{
  schemaVersion: string;
  balance: number;
  earnedTotal: number;
  grantedTotal: number;
  spentTotal: number;
  weekKey: string;
  weekEarned: number;
  prevWeekKey: string;
  prevWeekEarned: number;
  seasonId: string;
  seasonEarned: number;
  seq: number;
  updatedAtMs: number;
}>;

function int(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function normalizeStarsView(raw: unknown): StarsView {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    schemaVersion: typeof data.schemaVersion === 'string' ? data.schemaVersion : STARS_SCHEMA_VERSION,
    balance: int(data.balance),
    earnedTotal: int(data.earnedTotal),
    grantedTotal: int(data.grantedTotal),
    spentTotal: int(data.spentTotal),
    weekKey: typeof data.weekKey === 'string' ? data.weekKey : '',
    weekEarned: int(data.weekEarned),
    prevWeekKey: typeof data.prevWeekKey === 'string' ? data.prevWeekKey : '',
    prevWeekEarned: int(data.prevWeekEarned),
    seasonId: typeof data.seasonId === 'string' ? data.seasonId : '',
    seasonEarned: int(data.seasonEarned),
    seq: int(data.seq),
    updatedAtMs: int(data.updatedAtMs),
  };
}

/** Тратимый баланс. */
export function starsSpendable(stars: StarsView | undefined): number {
  return Math.max(0, stars?.balance ?? 0);
}

/**
 * D-10: заработано за всё время. Не уменьшается при тратах — именно это число
 * открывает награды.
 */
export function starsEarnedAllTime(stars: StarsView | undefined): number {
  return Math.max(0, stars?.earnedTotal ?? 0);
}

/** D-11: заработано за указанную неделю. Устаревшая неделя честно даёт ноль. */
export function starsWeekEarned(stars: StarsView | undefined, weekKeyNow: string): number {
  if (!stars) return 0;
  if (stars.weekKey === weekKeyNow) return Math.max(0, stars.weekEarned);
  if (stars.prevWeekKey === weekKeyNow) return Math.max(0, stars.prevWeekEarned);
  return 0;
}

/** D-09: заработано за активный сезон. Чужой сезон даёт ноль. */
export function starsSeasonEarned(stars: StarsView | undefined, activeSeasonId: string): number {
  if (!stars || stars.seasonId !== activeSeasonId) return 0;
  return Math.max(0, stars.seasonEarned);
}

/**
 * D-10 требует, чтобы игрок понимал разницу между тратимым балансом и
 * счётчиком, открывающим награды. Текст короткий намеренно: длинное объяснение
 * в интерфейсе никто не читает.
 */
export const STARS_EXPLAINER_RU = Object.freeze({
  title: 'Две цифры про руны',
  body: 'Сверху — сколько рун можно потратить сейчас. Награды открываются по другому счётчику: он считает всё заработанное за всё время и от трат не уменьшается.',
});
