/**
 * Шпиль — хранение недельного прогресса и досылка очереди отчётов (PM-275).
 *
 * зачем: арифметика очереди живёт в `report_queue.ts` (чистая), здесь только
 * чтение/запись и порядок операций — тот же раздел ответственности, что у Арены
 * (`result_outbox.ts` ↔ `outbox_storage.ts`). Хранилище, отправка и логгер
 * приходят снаружи, поэтому модуль не знает ни про AsyncStorage, ни про
 * Firebase и проверяется тестом целиком.
 *
 * Гонки (правило Optimistic UI, «история с осколками»):
 *   • все чтения-изменения-записи одного ключа идут строго по очереди (lock);
 *   • сеть идёт ВНЕ замка — новая ступень не ждёт ответа сервера;
 *   • ответ применяется к СВЕЖЕ прочитанному состоянию и удаляет строки только
 *     по reportId — поздний ответ не затирает ступени, пройденные за время запроса;
 *   • одна отправка на ключ одновременно (single-flight): двойной «уход с экрана»
 *     не шлёт одну пачку дважды.
 */

import {
  SPIRE_WEEK_LOCAL_SCHEMA_VERSION,
  spireApplyFlushFailure,
  spireApplyFlushResponse,
  spireApplyStepReport,
  spireClassifyFlushError,
  spireCreateWeekLocal,
  spireMarkFlushAttempt,
  spireReportToWire,
  spireShouldFlush,
  spireTakeBatch,
  spireWeekLocalKey,
  type SpireApplyStepResult,
  type SpireFlushApplied,
  type SpireFlushResponse,
  type SpireFlushTrigger,
  type SpireRollback,
  type SpireLang,
  type SpireStepReport,
  type SpireWeekLocal,
} from './report_queue';
import { noteSwallowedAs } from '../../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type SpireKeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

/** Сигнатура как у DebugLogger.warn/info (app/debug-logger.ts): (context, message). */
export type SpireReportLogger = {
  info(context: string, message: string): void;
  warn(context: string, message: string): void;
};

const LOG = '[SPIRE-REPORT]';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function decodeReport(raw: unknown): SpireStepReport | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.reportId !== 'string' || typeof raw.weekKey !== 'string' || typeof raw.packHash !== 'string') return null;
  const outcome = raw.outcome;
  if (outcome !== 'passed' && outcome !== 'failed') return null;
  const rawFail = raw.failReason;
  const failReason: SpireStepReport['failReason'] = rawFail === 'hearts' || rawFail === 'timeout' || rawFail === 'backed_out'
    ? rawFail
    : null;
  return {
    reportId: raw.reportId,
    weekKey: raw.weekKey,
    tier: num(raw.tier, 0),
    outcome,
    durationMs: num(raw.durationMs),
    completedAtMs: num(raw.completedAtMs),
    packHash: raw.packHash,
    floor: num(raw.floor, 1),
    stepInFloor: num(raw.stepInFloor),
    failReason,
  };
}

/** Разбор закрытый: чужая схема/язык → null, вызывающий начнёт неделю заново и залогирует. */
export function spireDecodeWeekLocal(raw: string | null, lang: SpireLang): SpireWeekLocal | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Не немой: spireLoadWeekLocal логирует «не разобралась» с длиной записи.
    return null;
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== SPIRE_WEEK_LOCAL_SCHEMA_VERSION) return null;
  if (parsed.lang !== lang || typeof parsed.weekKey !== 'string') return null;
  const pending = Array.isArray(parsed.pending)
    ? parsed.pending.map(decodeReport).filter((row): row is SpireStepReport => row !== null)
    : [];
  const ack = isRecord(parsed.serverAck) ? parsed.serverAck : null;
  return {
    schemaVersion: SPIRE_WEEK_LOCAL_SCHEMA_VERSION,
    weekKey: parsed.weekKey,
    lang,
    tier: num(parsed.tier, 0),
    floor: Math.max(1, num(parsed.floor, 1)),
    stepInFloor: Math.max(0, num(parsed.stepInFloor)),
    stepsCleared: Math.max(0, num(parsed.stepsCleared)),
    reachedAtMs: num(parsed.reachedAtMs),
    totalMs: num(parsed.totalMs),
    packHash: typeof parsed.packHash === 'string' ? parsed.packHash : '',
    pending,
    attempts: Math.max(0, num(parsed.attempts)),
    lastFlushAttemptAtMs: num(parsed.lastFlushAttemptAtMs),
    nextAttemptAtMs: num(parsed.nextAttemptAtMs),
    serverAck: ack
      ? { steps: num(ack.steps), reachedAtMs: num(ack.reachedAtMs), totalMs: num(ack.totalMs), atMs: num(ack.atMs) }
      : null,
    rejectedTotal: Math.max(0, num(parsed.rejectedTotal)),
  };
}

const locks = new Map<string, Promise<unknown>>();
const inFlight = new Map<string, Promise<SpireFlushOutcome>>();

/** Последовательное выполнение по ключу — чтения-записи одного ключа не пересекаются. */
function withKeyLock<T>(key: string, run: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(run, run);
  // Хвост очереди замка не должен рваться на чужой ошибке; сама ошибка уходит
  // вызывающему через `next` и логируется там.
  const tail = next.catch(noteSwallowedAs('report_store:promise_1', undefined));
  locks.set(key, tail);
  void tail.then(() => { if (locks.get(key) === tail) locks.delete(key); });
  return next;
}

export async function spireLoadWeekLocal(
  store: SpireKeyValueStore,
  uid: string,
  lang: SpireLang,
  logger: SpireReportLogger,
): Promise<SpireWeekLocal | null> {
  const key = spireWeekLocalKey(uid, lang);
  try {
    const raw = await store.getItem(key);
    const decoded = spireDecodeWeekLocal(raw, lang);
    if (raw && !decoded) logger.warn(LOG, `load: запись ${key} не разобралась (длина=${raw.length}) — начнём неделю заново`);
    return decoded;
  } catch (error) {
    logger.warn(LOG, `load: чтение ${key} упало (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

async function save(store: SpireKeyValueStore, key: string, local: SpireWeekLocal): Promise<void> {
  await store.setItem(key, JSON.stringify(local));
}

export type SpireRecordStepInput = Readonly<{
  uid: string;
  lang: SpireLang;
  report: SpireStepReport;
  logger: SpireReportLogger;
}>;

/**
 * Записывает результат ступени: маркер вверх + строка в очередь, одной записью
 * AsyncStorage. Экран должен поднять маркер СРАЗУ тем же чистым
 * `spireApplyStepReport` у себя в состоянии, не дожидаясь этого промиса.
 *
 * Возвращает `persisted: false`, если запись на диск не удалась физически —
 * тогда отчёт живёт только в памяти, и врать «сохранено» нельзя.
 */
export function spireRecordStep(
  store: SpireKeyValueStore,
  input: SpireRecordStepInput,
): Promise<SpireApplyStepResult & { persisted: boolean }> {
  const key = spireWeekLocalKey(input.uid, input.lang);
  return withKeyLock(key, async () => {
    const current = await spireLoadWeekLocal(store, input.uid, input.lang, input.logger)
      ?? spireCreateWeekLocal({
        lang: input.lang,
        weekKey: input.report.weekKey,
        tier: input.report.tier,
        packHash: input.report.packHash,
      });
    const applied = spireApplyStepReport(current, input.report);
    input.logger.info(LOG, `record: ${input.report.reportId} outcome=${input.report.outcome} durationMs=${input.report.durationMs} effect=${applied.effect} steps=${applied.local.stepsCleared} floor=${applied.local.floor}/${applied.local.stepInFloor} pending=${applied.local.pending.length}`);
    if (applied.dropped.length > 0) {
      input.logger.warn(LOG, `record: выброшено из очереди ${applied.dropped.length} строк (смена недели или переполнение): ${applied.dropped.map((r) => r.reportId).slice(0, 5).join(',')}`);
    }
    if (applied.effect === 'duplicate_ignored') return { ...applied, persisted: true };
    try {
      await save(store, key, applied.local);
      return { ...applied, persisted: true };
    } catch (error) {
      input.logger.warn(LOG, `record: запись ${key} не удалась (${error instanceof Error ? error.message : String(error)}) — отчёт ${input.report.reportId} только в памяти`);
      return { ...applied, persisted: false };
    }
  });
}

export type SpireFlushOutcome = Readonly<{
  status: 'skipped' | 'sent' | 'failed';
  reason: string;
  sent: number;
  removed: number;
  rejected: number;
  local: SpireWeekLocal | null;
  /** Откат маркера из-за отказа сервера (решение владельца 13.10): экран применяет тот же откат к своей неделе и показывает строку. null — откатывать нечего. */
  rollback: SpireRollback | null;
}>;

export type SpireFlushInput = Readonly<{
  uid: string;
  lang: SpireLang;
  trigger: SpireFlushTrigger;
  nowMs(): number;
  /** Один вызов spireReportSteps. Бросает — значит ошибка сети/сервера. */
  send(payload: Readonly<{ lang: SpireLang; reports: readonly Readonly<Record<string, unknown>>[] }>): Promise<SpireFlushResponse>;
  logger: SpireReportLogger;
}>;

/**
 * Досылает очередь одной пачкой (до SPIRE_REPORT_MAX_BATCH строк). Если строк
 * больше — остаток уйдёт следующим триггером; гнать цикл запросов тут незачем.
 */
export function spireFlushReports(store: SpireKeyValueStore, input: SpireFlushInput): Promise<SpireFlushOutcome> {
  const key = spireWeekLocalKey(input.uid, input.lang);
  const running = inFlight.get(key);
  if (running) {
    input.logger.info(LOG, `flush: ${key} уже отправляется — trigger=${input.trigger} присоединяется к текущей`);
    return running;
  }
  const task = runFlush(store, key, input).finally(() => { inFlight.delete(key); });
  inFlight.set(key, task);
  return task;
}

async function runFlush(store: SpireKeyValueStore, key: string, input: SpireFlushInput): Promise<SpireFlushOutcome> {
  const { logger } = input;
  const prepared = await withKeyLock(key, async () => {
    const local = await spireLoadWeekLocal(store, input.uid, input.lang, logger);
    if (!local) return { skip: 'no_local_state' as const, local: null, batch: [] as readonly SpireStepReport[] };
    const decision = spireShouldFlush(local, input.nowMs(), input.trigger);
    if (!decision.flush) return { skip: decision.reason, local, batch: [] as readonly SpireStepReport[] };
    const marked = spireMarkFlushAttempt(local, input.nowMs());
    try {
      await save(store, key, marked);
    } catch (error) {
      // Не сохранилась отметка попытки — отправка всё равно безопасна (сервер идемпотентен).
      logger.warn(LOG, `flush: отметка попытки не сохранилась (${error instanceof Error ? error.message : String(error)})`);
    }
    return { skip: null, local: marked, batch: spireTakeBatch(marked) };
  });

  if (prepared.skip) {
    logger.info(LOG, `flush: пропуск trigger=${input.trigger} причина=${prepared.skip}`);
    return { status: 'skipped', reason: prepared.skip, sent: 0, removed: 0, rejected: 0, local: prepared.local, rollback: null };
  }

  const batch = prepared.batch;
  const sentIds = batch.map((row) => row.reportId);
  const startedAt = input.nowMs();
  logger.info(LOG, `flush: отправка trigger=${input.trigger} строк=${batch.length} первая=${sentIds[0]} последняя=${sentIds[sentIds.length - 1]}`);

  let response: SpireFlushResponse | null = null;
  let failure: unknown = null;
  try {
    response = await input.send({ lang: input.lang, reports: batch.map(spireReportToWire) });
  } catch (error) {
    failure = error;
  }
  const tookMs = input.nowMs() - startedAt;

  return withKeyLock(key, async () => {
    // Свежее чтение: за время запроса могли добавиться ступени.
    const fresh = await spireLoadWeekLocal(store, input.uid, input.lang, logger) ?? prepared.local;
    if (!fresh) {
      logger.warn(LOG, 'flush: состояние пропало во время отправки — ответ некуда применить');
      return { status: 'failed', reason: 'local_state_lost', sent: batch.length, removed: 0, rejected: 0, local: null, rollback: null };
    }
    const nowMs = input.nowMs();
    let applied: SpireFlushApplied;
    let status: SpireFlushOutcome['status'];
    let reason: string;
    if (response) {
      applied = spireApplyFlushResponse(fresh, response, nowMs);
      status = response.ok ? 'sent' : 'failed';
      reason = response.ok ? 'ok' : `server_not_ok:${response.reason ?? 'unknown'}`;
      logger.info(LOG, `flush: ответ ok=${response.ok} reason=${response.reason ?? '-'} serverSteps=${response.serverSteps ?? '-'} localSteps=${fresh.stepsCleared} снято=${applied.removed} отвергнуто=${applied.rejected.length} за ${tookMs}мс`);
      // зачем (СПЕРВА ЛОГИ, координатор 13.10): весь путь отказа в одном месте — id ступени, причина, что это была за ступень, маркер ДО и ПОСЛЕ, откуда решение.
      for (const row of applied.rejected) {
        const wasPending = fresh.pending.find((p) => p.reportId === row.reportId);
        const rolled = applied.rollback?.reports.some((r) => r.reportId === row.reportId) === true;
        logger.warn('[SPIRE-REJECT]', `flush: сервер отверг ${row.reportId} причина=${row.reason ?? 'unknown'}; в очереди=${wasPending ? `да (${wasPending.outcome} этаж=${wasPending.floor ?? '?'} ступень=${wasPending.stepInFloor ?? '?'} за ${wasPending.durationMs}мс)` : 'нет (строка уже снята ранее — откат не нужен)'}; откат=${rolled ? 'да' : 'нет'}`);
      }
      if (applied.rejected.length > 0) {
        const b = fresh;
        const a = applied.local;
        logger.warn('[SPIRE-REJECT]', `flush: маркер до: этаж=${b.floor} ступень=${b.stepInFloor} пройдено=${b.stepsCleared} время=${b.totalMs}мс | после: этаж=${a.floor} ступень=${a.stepInFloor} пройдено=${a.stepsCleared} время=${a.totalMs}мс | сервер подтвердил=${response.serverSteps ?? '-'} | откатили ступеней=${applied.rollback?.steps ?? 0} | источник=ответ досылки trigger=${input.trigger}`);
      }
    } else {
      const kind = spireClassifyFlushError(failure);
      applied = spireApplyFlushFailure(fresh, kind, sentIds, nowMs);
      status = 'failed';
      reason = `error:${kind}`;
      const message = failure instanceof Error ? failure.message : String(failure);
      logger.warn(LOG, `flush: вызов упал kind=${kind} (${message}) за ${tookMs}мс; ${kind === 'bad_request' ? `выброшено ${applied.removed} строк` : `повтор после ${applied.local.nextAttemptAtMs}`}`);
    }
    try {
      await save(store, key, applied.local);
    } catch (error) {
      // Не сохранили снятие строк — следующая отправка повторит их, сервер ответит duplicate.
      logger.warn(LOG, `flush: запись результата не удалась (${error instanceof Error ? error.message : String(error)})`);
    }
    return {
      status,
      reason,
      sent: batch.length,
      removed: applied.removed,
      rejected: applied.rejected.length,
      local: applied.local,
      rollback: applied.rollback,
    };
  });
}
