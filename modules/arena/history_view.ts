/**
 * История матчей.
 *
 * Читается прямо из расписок игрока (`users/{uid}/arena_v2_receipts`): они уже
 * пишутся при закрытии матча, читать их разрешено только владельцу, и никакого
 * отдельного вызова или второй копии данных для истории не нужно. Заводить под
 * это серверный вызов значило бы платить дважды за то, что уже лежит.
 *
 * Здесь только разбор и сводка — ни сети, ни часов.
 */

export type ArenaHistoryOutcome = 'win' | 'loss' | 'draw';

export type ArenaHistoryRow = Readonly<{
  matchId: string;
  mode: string;
  outcome: ArenaHistoryOutcome;
  settledAtMs: number;
  starsEarned: number;
  xpEarned: number;
  ratingDelta: number;
  rankAfter: number;
}>;

export type ArenaHistorySummary = Readonly<{
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  starsEarned: number;
  /** Доля побед, 0..1. `null`, когда матчей нет — ноль процентов был бы враньём. */
  winRate: number | null;
  /** Побед подряд с САМОГО СВЕЖЕГО матча. Ничья серию не рвёт и не длит. */
  currentStreak: number;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function outcomeOf(value: unknown): ArenaHistoryOutcome | null {
  return value === 'win' || value === 'loss' || value === 'draw' ? value : null;
}

function intOf(value: unknown): number {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? number : 0;
}

/**
 * Разбирает одну расписку. `null` означает «строку не показывать»: битая
 * запись в истории хуже, чем её отсутствие — игрок начнёт считать по ней свои
 * звёзды и не сойдётся.
 */
export function arenaParseHistoryRow(raw: unknown): ArenaHistoryRow | null {
  if (!isRecord(raw)) return null;
  const matchId = typeof raw.matchId === 'string' ? raw.matchId : '';
  const outcome = outcomeOf(raw.outcome);
  const settledAtMs = intOf(raw.settledAtMs);
  if (!matchId || !outcome || settledAtMs <= 0) return null;
  const reward = isRecord(raw.reward) ? raw.reward : {};
  return {
    matchId,
    mode: typeof raw.mode === 'string' ? raw.mode : '',
    outcome,
    settledAtMs,
    starsEarned: Math.max(0, intOf(reward.starsEarned)),
    xpEarned: Math.max(0, intOf(reward.xpEarned)),
    ratingDelta: intOf(reward.ratingDelta),
    rankAfter: Math.max(0, intOf(reward.rankAfter)),
  };
}

/** Свежие сверху. Одинаковое время разводится идентификатором, чтобы порядок был устойчив. */
export function arenaHistoryRows(raws: readonly unknown[]): readonly ArenaHistoryRow[] {
  return raws
    .map(arenaParseHistoryRow)
    .filter((row): row is ArenaHistoryRow => row !== null)
    .sort((left, right) => right.settledAtMs - left.settledAtMs
      || left.matchId.localeCompare(right.matchId));
}

export function arenaHistorySummary(rows: readonly ArenaHistoryRow[]): ArenaHistorySummary {
  const wins = rows.filter((row) => row.outcome === 'win').length;
  const losses = rows.filter((row) => row.outcome === 'loss').length;
  const draws = rows.filter((row) => row.outcome === 'draw').length;

  // Серия считается от самого свежего матча вниз. Ничья её не рвёт и не длит:
  // она не победа и не поражение, и обнулять за неё серию было бы обидно.
  let currentStreak = 0;
  for (const row of rows) {
    if (row.outcome === 'draw') continue;
    if (row.outcome !== 'win') break;
    currentStreak += 1;
  }

  return {
    matches: rows.length,
    wins,
    losses,
    draws,
    starsEarned: rows.reduce((sum, row) => sum + row.starsEarned, 0),
    winRate: rows.length ? wins / rows.length : null,
    currentStreak,
  };
}
