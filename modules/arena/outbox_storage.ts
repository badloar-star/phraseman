import type { ArenaKeyValueStore } from './match_store';
import type { ArenaMatchReport } from './match_machine';
import {
  ARENA_OUTBOX_SCHEMA_VERSION,
  arenaOutboxAfterFailure,
  arenaOutboxClassify,
  arenaOutboxDue,
  arenaOutboxEntryKey,
  arenaOutboxIndexKey,
  arenaOutboxEvict,
  arenaOutboxMakeEntry,
  type ArenaOutboxEntry,
  type ArenaOutboxOwnerScope,
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
export function arenaOutboxDecodeEntry(
  raw: string | null,
  scope: ArenaOutboxOwnerScope,
): ArenaOutboxEntry | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed.schemaVersion !== ARENA_OUTBOX_SCHEMA_VERSION) return null;
  if (parsed.ownerStableUid !== scope.stableUid) return null;
  if (!Number.isSafeInteger(parsed.ownerGeneration)
    || parsed.ownerGeneration !== scope.accountGeneration) return null;
  const matchId = typeof parsed.matchId === 'string' ? parsed.matchId : '';
  const report = parsed.report;
  if (!matchId || !isRecord(report)) return null;
  const enqueuedAtWallMs = Number(parsed.enqueuedAtWallMs);
  const nextAttemptAtWallMs = Number(parsed.nextAttemptAtWallMs);
  if (!Number.isFinite(enqueuedAtWallMs) || !Number.isFinite(nextAttemptAtWallMs)) return null;
  const lastFailure = parsed.lastFailure;
  return {
    schemaVersion: ARENA_OUTBOX_SCHEMA_VERSION,
    ownerStableUid: scope.stableUid,
    ownerGeneration: scope.accountGeneration,
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
  scope: ArenaOutboxOwnerScope,
): Promise<readonly ArenaOutboxEntry[]> {
  let index: readonly string[] = [];
  try {
    index = parseIndex(await store.getItem(arenaOutboxIndexKey(scope)));
  } catch {
    return [];
  }
  const entries: ArenaOutboxEntry[] = [];
  for (const matchId of index) {
    try {
      const entry = arenaOutboxDecodeEntry(await store.getItem(arenaOutboxEntryKey(scope, matchId)), scope);
      if (entry) entries.push(entry);
    } catch {
      // Одна нечитаемая запись не должна прятать остальные.
    }
  }
  return entries;
}

async function writeIndex(
  store: ArenaKeyValueStore,
  scope: ArenaOutboxOwnerScope,
  entries: readonly ArenaOutboxEntry[],
): Promise<void> {
  await store.setItem(arenaOutboxIndexKey(scope), JSON.stringify(entries.map((entry) => entry.matchId)));
}

/**
 * Rebinds rows to a new process generation only for the exact same stable UID.
 *
 * Generation is intentionally metadata, not part of storage keys: a process
 * restart must not orphan a durable report. Callers must invoke adoption while
 * holding the account-transition lock and after checking the captured owner.
 * Existing v3 rows without generation are accepted only through this explicit
 * same-owner migration path; ordinary reads remain fail-closed.
 */
export async function arenaOutboxAdoptOwnerGeneration(
  store: ArenaKeyValueStore,
  scope: ArenaOutboxOwnerScope,
): Promise<number> {
  let index: readonly string[];
  try {
    index = parseIndex(await store.getItem(arenaOutboxIndexKey(scope)));
  } catch {
    return 0;
  }
  let adopted = 0;
  for (const matchId of index) {
    try {
      const key = arenaOutboxEntryKey(scope, matchId);
      const raw = await store.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)
        || parsed.schemaVersion !== ARENA_OUTBOX_SCHEMA_VERSION
        || parsed.ownerStableUid !== scope.stableUid) continue;
      const candidate = { ...parsed, ownerGeneration: scope.accountGeneration };
      const decoded = arenaOutboxDecodeEntry(JSON.stringify(candidate), scope);
      if (!decoded) continue;
      await store.setItem(key, JSON.stringify(decoded));
      adopted += 1;
    } catch {
      // One corrupt row remains quarantined without hiding valid owner rows.
    }
  }
  return adopted;
}

/**
 * Кладёт отчёт в очередь. Возвращает `false`, только если запись не удалась
 * физически: тогда отчёт действительно потерян, и врать об этом нельзя.
 */
export async function arenaOutboxEnqueue(
  store: ArenaKeyValueStore,
  scope: ArenaOutboxOwnerScope,
  report: ArenaMatchReport,
  wallNowMs: number,
  rulesVersion = '',
): Promise<boolean> {
  try {
    const entry = arenaOutboxMakeEntry(scope, report, wallNowMs, rulesVersion);
    const existing = (await arenaOutboxList(store, scope)).filter((row) => row.matchId !== entry.matchId);
    const { keep, dropped } = arenaOutboxEvict([...existing, entry], wallNowMs);
    await store.setItem(arenaOutboxEntryKey(scope, entry.matchId), JSON.stringify(entry));
    await writeIndex(store, scope, keep);
    for (const matchId of dropped) {
      if (matchId === entry.matchId) continue;
      try { await store.removeItem(arenaOutboxEntryKey(scope, matchId)); } catch { /* протухшее и так не читается */ }
    }
    return true;
  } catch {
    return false;
  }
}

export async function arenaOutboxSave(
  store: ArenaKeyValueStore,
  scope: ArenaOutboxOwnerScope,
  entry: ArenaOutboxEntry,
): Promise<void> {
  try {
    if (entry.ownerStableUid !== scope.stableUid
      || entry.ownerGeneration !== scope.accountGeneration) return;
    await store.setItem(arenaOutboxEntryKey(scope, entry.matchId), JSON.stringify(entry));
  } catch {
    // Не сохранившийся повтор означает лишнюю попытку позже, а не потерю.
  }
}

export async function arenaOutboxRemove(
  store: ArenaKeyValueStore,
  scope: ArenaOutboxOwnerScope,
  matchId: string,
): Promise<void> {
  try {
    const rest = (await arenaOutboxList(store, scope)).filter((entry) => entry.matchId !== matchId);
    await writeIndex(store, scope, rest);
    await store.removeItem(arenaOutboxEntryKey(scope, matchId));
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
    scope: ArenaOutboxOwnerScope;
    isScopeCurrent(scope: ArenaOutboxOwnerScope): boolean;
    send(entry: ArenaOutboxEntry): Promise<void>;
    wallNowMs: number;
  }>,
): Promise<ArenaOutboxFlushResult> {
  const sent: string[] = [];
  const kept: string[] = [];
  const dropped: string[] = [];
  const due = arenaOutboxDueEntries(await arenaOutboxList(store, input.scope), input.wallNowMs);

  if (!input.isScopeCurrent(input.scope)) {
    return { sent, kept: due.map((entry) => entry.matchId), dropped };
  }

  for (const entry of due) {
    if (!input.isScopeCurrent(input.scope)) {
      kept.push(entry.matchId);
      continue;
    }
    try {
      await input.send(entry);
      if (!input.isScopeCurrent(input.scope)) {
        kept.push(entry.matchId);
        break;
      }
      await arenaOutboxRemove(store, input.scope, entry.matchId);
      sent.push(entry.matchId);
    } catch (error) {
      if (!input.isScopeCurrent(input.scope)) {
        kept.push(entry.matchId);
        break;
      }
      const failure = arenaOutboxClassify(error);
      const next = arenaOutboxAfterFailure(entry, failure, input.wallNowMs);
      if (!next) {
        await arenaOutboxRemove(store, input.scope, entry.matchId);
        dropped.push(entry.matchId);
      } else {
        await arenaOutboxSave(store, input.scope, next);
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
  scope: ArenaOutboxOwnerScope,
  matchId: string,
): Promise<boolean> {
  return (await arenaOutboxList(store, scope)).some((entry) => entry.matchId === matchId);
}
