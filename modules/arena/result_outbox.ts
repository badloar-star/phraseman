import type { ArenaMatchReport } from './match_machine';

/**
 * Очередь отложенной отправки результатов матча.
 *
 * Владелец (D-58): матч доигрывается оффлайн, результат уходит когда сеть
 * вернётся. Значит отчёт обязан пережить и потерю сети, и закрытие приложения,
 * и перезапуск.
 *
 * Хранение — ключ на отчёт плюс отдельный ключ-индекс. Никогда не один JSON-
 * массив: падение посреди записи испортило бы все очереди сразу, а не одну.
 *
 * Ключ идемпотентности — идентификатор матча. Клиентских ключей здесь нет
 * намеренно: они ломаются при восстановлении из резервной копии, а пара
 * «игрок + матч» уже уникальна и переживает всё.
 *
 * MMKV в проекте нет, поэтому запись асинхронная. Это не ослабляет гарантии:
 * снимок сохраняется на каждой границе задания, а потеря самого последнего
 * снимка означает ровно то же, что и холодный старт — незакрытое задание
 * закрывается просрочкой, звёзды за восстановленное время не начисляются.
 */

export const ARENA_OUTBOX_SCHEMA_VERSION = 'arena-outbox.v2' as const;
export const ARENA_OUTBOX_MAX = 20;
/** Совпадает со сроком жизни документа матча: позже расчёт всё равно невозможен. */
export const ARENA_OUTBOX_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
export const ARENA_OUTBOX_INDEX_KEY = 'arena.outbox.v2.index';
export const ARENA_OUTBOX_ENTRY_PREFIX = 'arena.outbox.v2.';

export type ArenaOutboxFailure = 'offline' | 'transient' | 'gated' | 'rejected';

export type ArenaOutboxEntry = Readonly<{
  schemaVersion: typeof ARENA_OUTBOX_SCHEMA_VERSION;
  matchId: string;
  report: ArenaMatchReport;
  /**
   * Версия правил, по которым игрался матч. Хранится вместе с отчётом, потому
   * что досылка может случиться через сутки — и к тому моменту знать её будет
   * неоткуда: плана матча на руках уже нет.
   */
  rulesVersion: string;
  enqueuedAtWallMs: number;
  /** Растёт ТОЛЬКО на отказе сервера. Отсутствие сети попыток не тратит. */
  attempts: number;
  nextAttemptAtWallMs: number;
  lastFailure: ArenaOutboxFailure | null;
}>;

/**
 * Задержки повтора для временной ошибки. Дальше — раз в пять минут до
 * истечения срока матча.
 */
export const ARENA_OUTBOX_BACKOFF_MS = Object.freeze([1_000, 4_000, 15_000, 60_000, 300_000] as const);

/**
 * Классификация отказа. От неё зависит, тратится ли попытка.
 *
 * «Мёртв после пяти попыток» — примерно шесть минут: это выбросило бы
 * результат матча, сыгранного в самолёте. Поэтому попытки тратит только
 * настоящий отказ сервера.
 */
export function arenaOutboxClassify(error: unknown): ArenaOutboxFailure {
  const raw = typeof error === 'string' ? error : String((error as { message?: unknown })?.message ?? error ?? '');
  const code = String((error as { code?: unknown })?.code ?? '');
  const text = `${code} ${raw}`.toLowerCase();

  if (text.includes('arena_client_update_required')) return 'gated';
  if (text.includes('unavailable') || text.includes('network') || text.includes('offline')
    || text.includes('failed to fetch') || text.includes('timeout') || text.includes('econn')) {
    return 'offline';
  }
  if (text.includes('deadline-exceeded') || text.includes('internal') || text.includes('resource-exhausted')
    || text.includes('aborted') || text.includes('app check') || text.includes('appcheck')) {
    return 'transient';
  }
  return 'rejected';
}

export function arenaOutboxNextAttemptAtMs(
  entry: Pick<ArenaOutboxEntry, 'attempts'>,
  failure: ArenaOutboxFailure,
  wallNowMs: number,
): number {
  if (failure === 'offline') return wallNowMs;
  if (failure === 'gated') return wallNowMs + ARENA_OUTBOX_BACKOFF_MS[ARENA_OUTBOX_BACKOFF_MS.length - 1];
  if (failure === 'rejected') return wallNowMs;
  const index = Math.min(entry.attempts, ARENA_OUTBOX_BACKOFF_MS.length - 1);
  const base = ARENA_OUTBOX_BACKOFF_MS[index] as number;
  // Дрожание: без него все клиенты, потерявшие сеть одновременно, вернутся
  // одной волной.
  return wallNowMs + base + Math.floor(Math.random() * Math.min(1_000, base));
}

/** Пережил ли отчёт срок, после которого расчёт на сервере уже невозможен. */
export function arenaOutboxExpired(entry: ArenaOutboxEntry, wallNowMs: number): boolean {
  return wallNowMs - entry.enqueuedAtWallMs > ARENA_OUTBOX_TTL_MS;
}

export function arenaOutboxDue(entry: ArenaOutboxEntry, wallNowMs: number): boolean {
  return wallNowMs >= entry.nextAttemptAtWallMs;
}

/**
 * Применяет исход попытки к записи. Возвращает `null`, если запись пора
 * выбросить.
 */
export function arenaOutboxAfterFailure(
  entry: ArenaOutboxEntry,
  failure: ArenaOutboxFailure,
  wallNowMs: number,
): ArenaOutboxEntry | null {
  if (failure === 'rejected') return null;
  if (arenaOutboxExpired(entry, wallNowMs)) return null;
  return {
    ...entry,
    // Попытку тратит только отказ сервера — но он и так снимает запись выше.
    attempts: failure === 'transient' ? entry.attempts + 1 : entry.attempts,
    nextAttemptAtWallMs: arenaOutboxNextAttemptAtMs(entry, failure, wallNowMs),
    lastFailure: failure,
  };
}

/**
 * Какие записи вытеснить при переполнении. Выбрасывается САМАЯ СТАРАЯ: самая
 * новая — это матч, который игрок только что сыграл.
 */
export function arenaOutboxEvict(
  entries: readonly ArenaOutboxEntry[],
  wallNowMs: number,
): Readonly<{ keep: readonly ArenaOutboxEntry[]; dropped: readonly string[] }> {
  const alive = entries.filter((entry) => !arenaOutboxExpired(entry, wallNowMs));
  const expired = entries.filter((entry) => arenaOutboxExpired(entry, wallNowMs)).map((entry) => entry.matchId);
  if (alive.length <= ARENA_OUTBOX_MAX) return { keep: alive, dropped: expired };
  const sorted = [...alive].sort((a, b) => a.enqueuedAtWallMs - b.enqueuedAtWallMs);
  const overflow = sorted.slice(0, alive.length - ARENA_OUTBOX_MAX);
  const overflowIds = new Set(overflow.map((entry) => entry.matchId));
  return {
    keep: alive.filter((entry) => !overflowIds.has(entry.matchId)),
    dropped: [...expired, ...overflow.map((entry) => entry.matchId)],
  };
}

export function arenaOutboxEntryKey(matchId: string): string {
  return `${ARENA_OUTBOX_ENTRY_PREFIX}${matchId}`;
}

export function arenaOutboxMakeEntry(
  report: ArenaMatchReport,
  wallNowMs: number,
  rulesVersion = '',
): ArenaOutboxEntry {
  return {
    schemaVersion: ARENA_OUTBOX_SCHEMA_VERSION,
    matchId: report.matchId,
    report,
    rulesVersion,
    enqueuedAtWallMs: wallNowMs,
    attempts: 0,
    nextAttemptAtWallMs: wallNowMs,
    lastFailure: null,
  };
}

/** Есть ли отчёт, который ждёт обновления приложения — для видимой подсказки. */
export function arenaOutboxHasGated(entries: readonly ArenaOutboxEntry[]): boolean {
  return entries.some((entry) => entry.lastFailure === 'gated');
}
