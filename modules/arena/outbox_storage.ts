import type { ArenaKeyValueStore } from './match_store';
import type { ArenaMatchReport } from './match_machine';
import {
  ARENA_OUTBOX_INDEX_KEY,
  ARENA_OUTBOX_SCHEMA_VERSION,
  arenaOutboxAfterFailure,
  arenaOutboxClassify,
  arenaOutboxDue,
  arenaOutboxEntryKey,
  arenaOutboxEvict,
  arenaOutboxMakeEntry,
  type ArenaOutboxEntry,
} from './result_outbox';

/**
 * Хранилище очереди отправки результатов.
 *
 * Владелец (D-58): матч доигрывается оффлайн, результат уходит, когда сеть
 * вернётся. Арифметика очереди была написана (`result_outbox.ts`) и покрыта
 * тестами — но НЕ ПОДКЛЮЧЕНА НИ К ЧЕМУ. Экран матча при неудачной отправке
 * глотал ошибку с комментарием «очередь дошлёт», и отчёт пропадал навсегда:
 * игрок терял звёзды, очки ранга и сам факт матча, доигранного в метро.
 *
 * Здесь только чтение и запись. Решения о повторах остаются в чистом модуле:
 * что делать с записью — считается там, а не здесь.
 *
 * Ключ на запись плюс отдельный ключ-индекс. Никогда не один JSON-массив:
 * падение посреди записи испортило бы всю очередь, а не одну строку.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseIndex(raw: string | null): readonly string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
}

/** Разбор закрытый: непонятная запись выбрасывается, а не чинится догадками. */
export function arenaOutboxDecodeEntry(raw: string | null): ArenaOutboxEntry | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed.schemaVersion !== ARENA_OUTBOX_SCHEMA_VERSION) return null;
  const matchId = typeof parsed.matchId === 'string' ? parsed.matchId : '';
  const report = parsed.report;
  if (!matchId || !isRecord(report)) return null;
  const enqueuedAtWallMs = Number(parsed.enqueuedAtWallMs);
  const nextAttemptAtWallMs = Number(parsed.nextAttemptAtWallMs);
  if (!Number.isFinite(enqueuedAtWallMs) || !Number.isFinite(nextAttemptAtWallMs)) return null;
  const lastFailure = parsed.lastFailure;
  return {
    schemaVersion: ARENA_OUTBOX_SCHEMA_VERSION,
    matchId,
    report: report as unknown as ArenaMatchReport,
    rulesVersion: typeof parsed.rulesVersion === 'string' ? parsed.rulesVersion : '',
    enqueuedAtWallMs: Math.trunc(enqueuedAtWallMs),
    attempts: Math.max(0, Math.trunc(Number(parsed.attempts) || 0)),
    nextAttemptAtWallMs: Math.trunc(nextAttemptAtWallMs),
    lastFailure: lastFailure === 'offline' || lastFailure === 'transient'
      || lastFailure === 'gated' || lastFailure === 'rejected' ? lastFailure : null,
  };
}

export async function arenaOutboxList(
  store: ArenaKeyValueStore,
): Promise<readonly ArenaOutboxEntry[]> {
  let index: readonly string[] = [];
  try {
    index = parseIndex(await store.getItem(ARENA_OUTBOX_INDEX_KEY));
  } catch {
    return [];
  }
  const entries: ArenaOutboxEntry[] = [];
  for (const matchId of index) {
    try {
      const entry = arenaOutboxDecodeEntry(await store.getItem(arenaOutboxEntryKey(matchId)));
      if (entry) entries.push(entry);
    } catch {
      // Одна нечитаемая запись не должна прятать остальные.
    }
  }
  return entries;
}

async function writeIndex(store: ArenaKeyValueStore, entries: readonly ArenaOutboxEntry[]): Promise<void> {
  await store.setItem(ARENA_OUTBOX_INDEX_KEY, JSON.stringify(entries.map((entry) => entry.matchId)));
}

/**
 * Кладёт отчёт в очередь. Возвращает `false`, только если запись не удалась
 * физически: тогда отчёт действительно потерян, и врать об этом нельзя.
 */
export async function arenaOutboxEnqueue(
  store: ArenaKeyValueStore,
  report: ArenaMatchReport,
  wallNowMs: number,
  rulesVersion = '',
): Promise<boolean> {
  try {
    const entry = arenaOutboxMakeEntry(report, wallNowMs, rulesVersion);
    const existing = (await arenaOutboxList(store)).filter((row) => row.matchId !== entry.matchId);
    const { keep, dropped } = arenaOutboxEvict([...existing, entry], wallNowMs);
    await store.setItem(arenaOutboxEntryKey(entry.matchId), JSON.stringify(entry));
    await writeIndex(store, keep);
    for (const matchId of dropped) {
      if (matchId === entry.matchId) continue;
      try { await store.removeItem(arenaOutboxEntryKey(matchId)); } catch { /* протухшее и так не читается */ }
    }
    return true;
  } catch {
    return false;
  }
}

export async function arenaOutboxSave(
  store: ArenaKeyValueStore,
  entry: ArenaOutboxEntry,
): Promise<void> {
  try {
    await store.setItem(arenaOutboxEntryKey(entry.matchId), JSON.stringify(entry));
  } catch {
    // Не сохранившийся повтор означает лишнюю попытку позже, а не потерю.
  }
}

export async function arenaOutboxRemove(
  store: ArenaKeyValueStore,
  matchId: string,
): Promise<void> {
  try {
    const rest = (await arenaOutboxList(store)).filter((entry) => entry.matchId !== matchId);
    await writeIndex(store, rest);
    await store.removeItem(arenaOutboxEntryKey(matchId));
  } catch {
    // Осталась в индексе — попробуем ещё раз при следующей отправке.
  }
}

/** Записи, которым пора уходить прямо сейчас. */
export function arenaOutboxDueEntries(
  entries: readonly ArenaOutboxEntry[],
  wallNowMs: number,
): readonly ArenaOutboxEntry[] {
  return entries.filter((entry) => arenaOutboxDue(entry, wallNowMs));
}

export type ArenaOutboxFlushResult = Readonly<{
  /** Ушли на сервер. */
  sent: readonly string[];
  /** Остались ждать следующей попытки. */
  kept: readonly string[];
  /** Выброшены: сервер отказал по существу или истёк срок расчёта. */
  dropped: readonly string[];
}>;

/**
 * Досылает всё, чему пришло время.
 *
 * Отправка передаётся снаружи: модуль не знает ни про Firebase, ни про сеть, и
 * поэтому проверяется тестом целиком, вместе с политикой повторов.
 *
 * Отчёты идут ПО ОЧЕРЕДИ, а не пачкой: при отсутствии сети первый же отказ
 * означает, что и остальные не уйдут, и долбить сервер двадцатью запросами
 * подряд незачем.
 */
export async function arenaOutboxFlush(
  store: ArenaKeyValueStore,
  input: Readonly<{
    send(entry: ArenaOutboxEntry): Promise<void>;
    wallNowMs: number;
  }>,
): Promise<ArenaOutboxFlushResult> {
  const sent: string[] = [];
  const kept: string[] = [];
  const dropped: string[] = [];
  const due = arenaOutboxDueEntries(await arenaOutboxList(store), input.wallNowMs);

  for (const entry of due) {
    try {
      await input.send(entry);
      await arenaOutboxRemove(store, entry.matchId);
      sent.push(entry.matchId);
    } catch (error) {
      const failure = arenaOutboxClassify(error);
      const next = arenaOutboxAfterFailure(entry, failure, input.wallNowMs);
      if (!next) {
        await arenaOutboxRemove(store, entry.matchId);
        dropped.push(entry.matchId);
      } else {
        await arenaOutboxSave(store, next);
        kept.push(entry.matchId);
      }
      // Сети нет — остальные тоже не уйдут. Прекращаем, а не долбим сервер.
      if (failure === 'offline' || failure === 'gated') break;
    }
  }
  return { sent, kept, dropped };
}

/** Ждёт ли отправки отчёт именно об этом матче. */
export async function arenaOutboxHasMatch(
  store: ArenaKeyValueStore,
  matchId: string,
): Promise<boolean> {
  return (await arenaOutboxList(store)).some((entry) => entry.matchId === matchId);
}
