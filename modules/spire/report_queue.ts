/**
 * Шпиль — локальный прогресс недели и очередь отчётов о ступенях (PM-275).
 * Чистый модуль: ни React, ни Firebase, ни AsyncStorage, ни часов.
 *
 * зачем: владелец (TOWER.md §4.2, §6; TOWER_CONTRACT.md §3, §5, §6 D56):
 *   • маркер поднимается МГНОВЕННО на устройстве (optimistic) — UI не ждёт сеть;
 *   • на сервер уходит ПАЧКА (при уходе с экрана / в фон / раз в 5 минут), а не
 *     вызов на каждую ступень — одна запись `progress.spire_week_v1` на пачку;
 *   • нет сети — отчёты копятся в `pending[]` и досылаются, когда связь вернётся;
 *   • отказ сервера по правдоподобию НЕ стирает локальный прогресс (§5).
 *
 * Принцип очереди взят у Арены (`modules/arena/result_outbox.ts` +
 * `outbox_storage.ts`): чистая арифметика повторов отдельно от хранилища,
 * отправка передаётся снаружи, «нет сети» → остановиться, а не долбить сервер.
 * Отличие: у Арены один матч = один вызов; у Шпиля пачка отчётов = один вызов,
 * и идемпотентность держит сервер по времени завершения ступени (см.
 * functions/src/spire_progress_contract.ts), поэтому повтор той же пачки после
 * обрыва безопасен — сервер ответит `duplicate`.
 *
 * Сюда приходит уже ГОТОВОЕ состояние ступени из `step_machine.ts`
 * (phase = 'passed' | 'failed'); сам редьюсер ступени этот модуль не трогает.
 *
 * СИНХРОНИЗАЦИЯ: серверная форма отчёта — `functions/src/spire_progress_contract.ts`
 * (SpireStepReportWire, SPIRE_REPORT_MAX_BATCH). Правишь поле здесь — правь там.
 */

import type { SpireStepFailReason, SpireStepState } from './step_machine';

export const SPIRE_WEEK_LOCAL_SCHEMA_VERSION = 'spire-week-local.v1' as const;
/** D56: «раз в 5 минут», пока человек на экране Шпиля. */
export const SPIRE_REPORT_FLUSH_INTERVAL_MS = 5 * 60_000;
/** Зеркало серверного SPIRE_REPORT_MAX_BATCH. */
export const SPIRE_REPORT_MAX_BATCH = 60;
/**
 * Предел очереди. Неделя — максимум ~135 ступеней до вершины плюс провалы;
 * 400 строк × ~250 байт ≈ 100 КБ в AsyncStorage. При переполнении первыми
 * уходят старые ПРОВАЛЫ (они не дают очков), пройденные — последними.
 */
export const SPIRE_PENDING_MAX = 400;
const BACKOFF_BASE_MS = 15_000;
const BACKOFF_MAX_MS = 30 * 60_000;

export type SpireLang = 'en' | 'es' | 'de' | 'fr' | 'it';
export type SpireStepOutcome = 'passed' | 'failed';

/** Одна строка отчёта — ровно то, что уходит на сервер (+ поля для UI/логов). */
export type SpireStepReport = Readonly<{
  reportId: string;
  weekKey: string;
  /** Шпиль 0 = Гранит … 11 = Алмаз (шкала spire_groups.ts, PM-277). */
  tier: number;
  outcome: SpireStepOutcome;
  durationMs: number;
  completedAtMs: number;
  packHash: string;
  /** Для логов и отладки; сервер их не читает. */
  floor: number;
  stepInFloor: number;
  failReason: SpireStepFailReason | null;
}>;

export type SpireServerAck = Readonly<{
  steps: number;
  reachedAtMs: number;
  totalMs: number;
  atMs: number;
}>;

/** AsyncStorage `spire_week_v1:{uid}:{lang}` — TOWER_CONTRACT.md §3. */
export type SpireWeekLocal = Readonly<{
  schemaVersion: typeof SPIRE_WEEK_LOCAL_SCHEMA_VERSION;
  weekKey: string;
  lang: SpireLang;
  tier: number;
  /** Текущий этаж (1…), на котором стоит маркер. */
  floor: number;
  /** Сколько ступеней уже пройдено на текущем этаже. */
  stepInFloor: number;
  stepsCleared: number;
  reachedAtMs: number;
  totalMs: number;
  packHash: string;
  pending: readonly SpireStepReport[];
  attempts: number;
  lastFlushAttemptAtMs: number;
  nextAttemptAtMs: number;
  /** Что сервер подтвердил последним — для честности UI, локальный маркер НЕ трогает. */
  serverAck: SpireServerAck | null;
  /** Сколько строк сервер отверг за неделю (правдоподобие) — для лога/поддержки. */
  rejectedTotal: number;
}>;

export type SpireFlushTrigger = 'screen_leave' | 'app_background' | 'interval' | 'app_start' | 'manual' | 'floor_closed'; // floor_closed — 💸 аудит 17.10: вместо опроса раз в 5 мин

export function spireWeekLocalKey(uid: string, lang: SpireLang): string {
  return `spire_week_v1:${uid}:${lang}`;
}

/**
 * T10: ступеней в этаже — 5, 6, 7, 8, 9, затем по 10.
 * Зеркало `spireStepsForFloor` из functions/src/spire_config_contract.ts
 * (клиентская копия конфига этой функции не несёт).
 */
export function spireStepsForFloorLocal(floor: number): number {
  if (!Number.isFinite(floor) || floor < 1) return 5;
  return floor <= 5 ? 4 + floor : 10;
}

export function spireCreateWeekLocal(input: Readonly<{
  lang: SpireLang;
  weekKey: string;
  tier: number;
  packHash: string;
}>): SpireWeekLocal {
  return {
    schemaVersion: SPIRE_WEEK_LOCAL_SCHEMA_VERSION,
    weekKey: input.weekKey,
    lang: input.lang,
    tier: input.tier,
    floor: 1,
    stepInFloor: 0,
    stepsCleared: 0,
    reachedAtMs: 0,
    totalMs: 0,
    packHash: input.packHash,
    pending: [],
    attempts: 0,
    lastFlushAttemptAtMs: 0,
    nextAttemptAtMs: 0,
    serverAck: null,
    rejectedTotal: 0,
  };
}

export type SpireReportContext = Readonly<{
  lang: SpireLang;
  weekKey: string;
  tier: number;
  floor: number;
  stepInFloor: number;
  /** Часы устройства в момент вердикта — вызывающий код, модуль часов не читает. */
  completedAtMs: number;
}>;

/**
 * Готовая ступень → строка отчёта. Не финальная фаза → null (рано отчитываться).
 * durationMs = израсходованный бюджет ступени: пауза (сворачивание) его не тратит,
 * поэтому звонок посреди ступени не делает её «медленной» для сервера.
 */
export function spireReportFromStepState(
  state: SpireStepState,
  ctx: SpireReportContext,
): SpireStepReport | null {
  if (state.phase !== 'passed' && state.phase !== 'failed') return null;
  const completedAtMs = Math.trunc(ctx.completedAtMs);
  return {
    reportId: `${ctx.weekKey}:${ctx.lang}:t${ctx.tier}:f${ctx.floor}:s${ctx.stepInFloor}:${completedAtMs}`,
    weekKey: ctx.weekKey,
    tier: ctx.tier,
    outcome: state.phase,
    durationMs: Math.max(0, Math.trunc(state.elapsedBudgetMs)),
    completedAtMs,
    packHash: state.packHash,
    floor: ctx.floor,
    stepInFloor: ctx.stepInFloor,
    failReason: state.failReason,
  };
}

function capPending(pending: readonly SpireStepReport[]): {
  kept: readonly SpireStepReport[];
  dropped: readonly SpireStepReport[];
} {
  if (pending.length <= SPIRE_PENDING_MAX) return { kept: pending, dropped: [] };
  let overflow = pending.length - SPIRE_PENDING_MAX;
  const dropIds = new Set<string>();
  for (const row of pending) {
    if (overflow <= 0) break;
    if (row.outcome === 'failed') { dropIds.add(row.reportId); overflow -= 1; }
  }
  for (const row of pending) {
    if (overflow <= 0) break;
    if (!dropIds.has(row.reportId)) { dropIds.add(row.reportId); overflow -= 1; }
  }
  return {
    kept: pending.filter((row) => !dropIds.has(row.reportId)),
    dropped: pending.filter((row) => dropIds.has(row.reportId)),
  };
}

export type SpireApplyStepResult = Readonly<{
  local: SpireWeekLocal;
  /** Что именно произошло — для празднования ФАКТОМ на экране Шпиля, не durable-очередью. */
  effect: 'marker_up' | 'floor_cleared' | 'stayed' | 'duplicate_ignored' | 'week_reset';
  /** Строки, выброшенные переполнением или сменой недели — вызывающий логирует. */
  dropped: readonly SpireStepReport[];
}>;

/**
 * Optimistic-шаг: маркер поднимается сразу, отчёт встаёт в очередь.
 * Защита от двойного тапа: тот же reportId второй раз ничего не меняет.
 */
export function spireApplyStepReport(local: SpireWeekLocal, report: SpireStepReport): SpireApplyStepResult {
  let base = local;
  let dropped: readonly SpireStepReport[] = [];
  let weekReset = false;
  if (report.weekKey !== local.weekKey) {
    // Новая неделя — все на этаже 1 (TOWER.md §4.7). Хвост прошлой недели сервер
    // всё равно отверг бы как stale_week: итог уже подвёл крон лиги.
    dropped = local.pending;
    base = spireCreateWeekLocal({ lang: local.lang, weekKey: report.weekKey, tier: report.tier, packHash: report.packHash });
    weekReset = true;
  }
  if (base.pending.some((row) => row.reportId === report.reportId)) {
    return { local: base, effect: 'duplicate_ignored', dropped };
  }

  const capped = capPending([...base.pending, report]);
  dropped = [...dropped, ...capped.dropped];

  if (report.outcome === 'failed') {
    return {
      local: { ...base, tier: report.tier, pending: capped.kept },
      effect: weekReset ? 'week_reset' : 'stayed',
      dropped,
    };
  }

  const stepsInFloor = spireStepsForFloorLocal(base.floor);
  const nextStepInFloor = base.stepInFloor + 1;
  const floorCleared = nextStepInFloor >= stepsInFloor;
  return {
    local: {
      ...base,
      tier: report.tier,
      packHash: report.packHash,
      floor: floorCleared ? base.floor + 1 : base.floor,
      stepInFloor: floorCleared ? 0 : nextStepInFloor,
      stepsCleared: base.stepsCleared + 1,
      reachedAtMs: report.completedAtMs,
      totalMs: base.totalMs + report.durationMs,
      pending: capped.kept,
    },
    effect: floorCleared ? 'floor_cleared' : (weekReset ? 'week_reset' : 'marker_up'),
    dropped,
  };
}

/** Пора ли слать пачку. Решение чистое — таймер и события экрана снаружи. */
export function spireShouldFlush(local: SpireWeekLocal, nowMs: number, trigger: SpireFlushTrigger): Readonly<{
  flush: boolean;
  reason: string;
}> {
  if (local.pending.length === 0) return { flush: false, reason: 'queue_empty' };
  if (trigger !== 'manual' && nowMs < local.nextAttemptAtMs) {
    return { flush: false, reason: `backoff_until=${local.nextAttemptAtMs} now=${nowMs}` };
  }
  if (trigger === 'interval' && nowMs - local.lastFlushAttemptAtMs < SPIRE_REPORT_FLUSH_INTERVAL_MS) {
    return { flush: false, reason: `interval_not_due sinceLast=${nowMs - local.lastFlushAttemptAtMs}` };
  }
  return { flush: true, reason: `trigger=${trigger} pending=${local.pending.length}` };
}

/** Пачка на отправку: старые первыми (сервер проверяет порядок во времени). */
export function spireTakeBatch(local: SpireWeekLocal): readonly SpireStepReport[] {
  return [...local.pending]
    .sort((a, b) => a.completedAtMs - b.completedAtMs)
    .slice(0, SPIRE_REPORT_MAX_BATCH);
}

/** Сетевой вид строки — без полей, которые сервер не принимает. */
export function spireReportToWire(report: SpireStepReport): Readonly<Record<string, unknown>> {
  return {
    reportId: report.reportId,
    weekKey: report.weekKey,
    tier: report.tier,
    outcome: report.outcome,
    durationMs: report.durationMs,
    completedAtMs: report.completedAtMs,
    packHash: report.packHash,
  };
}

export function spireMarkFlushAttempt(local: SpireWeekLocal, nowMs: number): SpireWeekLocal {
  return { ...local, lastFlushAttemptAtMs: nowMs };
}

export type SpireFlushVerdict = Readonly<{
  reportId: string;
  verdict: 'accepted' | 'duplicate' | 'rejected';
  reason?: string;
}>;

export type SpireFlushResponse = Readonly<{
  ok: boolean;
  reason?: string;
  weekKey?: string;
  serverSteps?: number;
  reachedAtMs?: number;
  totalMs?: number;
  results?: readonly SpireFlushVerdict[];
}>;

function backoffMs(attempts: number): number {
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, Math.min(10, attempts - 1)));
}

/**
 * Откат маркера из-за отказа сервера (решение владельца 13.10, журнал п.86): сколько ступеней вернули, сколько времени сняли, какие строки.
 * null в SpireFlushApplied — откатывать было нечего (провал не двигал маркер, строка уже снята ранее, подтверждённый сервером счёт выше).
 */
export type SpireRollback = Readonly<{
  steps: number;
  durationMs: number;
  reports: readonly SpireStepReport[];
}>;

export type SpireFlushApplied = Readonly<{
  local: SpireWeekLocal;
  removed: number;
  rejected: readonly SpireFlushVerdict[];
  rollback: SpireRollback | null;
}>;

/** Лестница этажей: по числу пройденных ступеней → этаж и ступень внутри него (зеркало того, что делает spireApplyStepReport по одной ступени). */
export function spireMarkerFromSteps(stepsCleared: number): Readonly<{ floor: number; stepInFloor: number }> {
  let rest = Math.max(0, Math.trunc(Number.isFinite(stepsCleared) ? stepsCleared : 0));
  let floor = 1;
  while (rest >= spireStepsForFloorLocal(floor)) {
    rest -= spireStepsForFloorLocal(floor);
    floor += 1;
  }
  return { floor, stepInFloor: rest };
}

/**
 * Вернуть маркер на `steps` ступеней назад и снять `durationMs` суммарного времени. Чистая функция: ничего не читает и не пишет.
 * Ниже подтверждённого сервером числа (serverAck.steps) не опускаемся — «маркер уже ушёл дальше подтверждённым ответом» (поздний отказ не должен стирать принятое).
 * reachedAtMs: если прежнего значения не знаем — остаётся как было (чуть позже = хуже в споре «кто раньше дошёл», но не врёт вверх).
 */
export function spireRollbackSteps(
  local: SpireWeekLocal,
  input: Readonly<{ steps: number; durationMs: number; reachedAtMs?: number | null }>,
): SpireWeekLocal {
  const ack = local.serverAck ? Math.max(0, local.serverAck.steps) : 0;
  const target = Math.max(ack, Math.max(0, local.stepsCleared - Math.max(0, Math.trunc(input.steps))));
  if (target >= local.stepsCleared) return local;
  const marker = spireMarkerFromSteps(target);
  const hint = typeof input.reachedAtMs === 'number' && input.reachedAtMs >= 0 ? input.reachedAtMs : null;
  return {
    ...local,
    floor: marker.floor,
    stepInFloor: marker.stepInFloor,
    stepsCleared: target,
    totalMs: Math.max(0, local.totalMs - Math.max(0, Math.trunc(input.durationMs))),
    reachedAtMs: target === 0 ? 0 : (hint ?? local.reachedAtMs),
  };
}

/** Отвергнутые пройденные ступени той же недели → новый маркер. Провалы маркер не двигали — откатывать нечего. */
export function spireRollbackRejected(
  local: SpireWeekLocal,
  rejectedRows: readonly SpireStepReport[],
): Readonly<{ local: SpireWeekLocal; steps: number; durationMs: number }> {
  const seen = new Set<string>();
  const rows = rejectedRows.filter((row) => {
    if (row.outcome !== 'passed' || row.weekKey !== local.weekKey || seen.has(row.reportId)) return false;
    seen.add(row.reportId);
    return true;
  });
  if (rows.length === 0) return { local, steps: 0, durationMs: 0 };
  const durationMs = rows.reduce((sum, row) => sum + row.durationMs, 0);
  const stillPending = local.pending.filter((row) => row.outcome === 'passed' && !seen.has(row.reportId)).map((row) => row.completedAtMs);
  const ackReached = local.serverAck && local.serverAck.steps === Math.max(0, local.stepsCleared - rows.length) ? local.serverAck.reachedAtMs : 0;
  const reached = Math.max(0, ...stillPending, ackReached);
  const next = spireRollbackSteps(local, { steps: rows.length, durationMs, reachedAtMs: reached > 0 ? reached : null });
  return { local: next, steps: local.stepsCleared - next.stepsCleared, durationMs: next === local ? 0 : durationMs };
}

/**
 * Ответ сервера → очередь. Строки с любым окончательным вердиктом уходят из
 * очереди (принято / уже было / отвергнуто — повтор ничего не изменит).
 * МАРКЕР (раньше «не трогаем», TOWER_CONTRACT §5; решение владельца 13.10, журнал п.86): отвергнутая ПРОЙДЕННАЯ
 * ступень откатывается — см. `rollback` в результате и spireRollbackRejected. Провал и строки, которых
 * уже нет в очереди, маркер не двигают. serverAck хранит правду сервера рядом.
 *
 * Применяется к СВЕЖЕ прочитанному состоянию: пока шёл запрос, могли добавиться
 * новые ступени — удаление по reportId их не заденет (last-write-guard).
 */
export function spireApplyFlushResponse(
  local: SpireWeekLocal,
  response: SpireFlushResponse,
  nowMs: number,
): SpireFlushApplied {
  if (!response.ok) {
    // Шпиль выключен на сервере (spire_not_live) — держим очередь, ждём дольше.
    const attempts = local.attempts + 1;
    return {
      local: { ...local, attempts, nextAttemptAtMs: nowMs + backoffMs(attempts) },
      removed: 0,
      rejected: [],
      rollback: null,
    };
  }
  const results = response.results ?? [];
  const final = new Set(results.map((row) => row.reportId));
  const rejected = results.filter((row) => row.verdict === 'rejected');
  const pending = local.pending.filter((row) => !final.has(row.reportId));
  const sameWeek = response.weekKey === undefined || response.weekKey === local.weekKey;
  let next: SpireWeekLocal = {
    ...local,
    pending,
    attempts: 0,
    nextAttemptAtMs: 0,
    rejectedTotal: local.rejectedTotal + rejected.length,
    serverAck: sameWeek && typeof response.serverSteps === 'number'
      ? {
        steps: response.serverSteps,
        reachedAtMs: response.reachedAtMs ?? 0,
        totalMs: response.totalMs ?? 0,
        atMs: nowMs,
      }
      : local.serverAck,
  };
  // зачем (владелец 13.10, журнал п.86): отвергнутая сервером ПРОЙДЕННАЯ ступень больше не держит маркер. Откатываем только строки, которые в момент ответа ещё лежали
  // в очереди (`local.pending`): повторная досылка уже снятой строки ничего не откатит второй раз. Нижний предел — подтверждённое сервером число (serverAck).
  const rejectedIds = new Set(rejected.map((row) => row.reportId));
  const rolledRows = local.pending.filter((row) => rejectedIds.has(row.reportId) && row.outcome === 'passed' && row.weekKey === local.weekKey);
  let rollback: SpireRollback | null = null;
  if (rolledRows.length > 0) {
    const res = spireRollbackRejected(next, rolledRows);
    if (res.steps > 0) {
      next = res.local;
      rollback = { steps: res.steps, durationMs: res.durationMs, reports: rolledRows };
    }
  }
  return {
    local: next,
    removed: local.pending.length - pending.length,
    rejected,
    rollback,
  };
}

export type SpireFlushFailureKind = 'offline' | 'transient' | 'identity' | 'bad_request';

/** Ошибка вызова → что делать с пачкой. Коды — Firebase Functions (`functions/<code>` или `<code>`). */
export function spireClassifyFlushError(error: unknown): SpireFlushFailureKind {
  const code = String((error as { code?: unknown } | null)?.code ?? '').replace(/^functions\//u, '');
  const message = String((error as { message?: unknown } | null)?.message ?? error ?? '').toLowerCase();
  if (code === 'unavailable' || /network|offline|timeout|timed out|failed to fetch/u.test(message)) return 'offline';
  if (code === 'unauthenticated' || code === 'permission-denied' || code === 'failed-precondition') return 'identity';
  if (code === 'invalid-argument') return 'bad_request';
  return 'transient';
}

/**
 * Неудача вызова. Очередь сохраняется во всех случаях, кроме `bad_request`:
 * сервер отверг саму форму пачки, и повтор той же пачки упадёт так же — такие
 * строки выбрасываются (вызывающий обязан залогировать их), чтобы очередь не
 * застряла навсегда. Маркер при этом не трогается.
 */
export function spireApplyFlushFailure(
  local: SpireWeekLocal,
  kind: SpireFlushFailureKind,
  sentIds: readonly string[],
  nowMs: number,
): SpireFlushApplied {
  if (kind === 'bad_request') {
    const sent = new Set(sentIds);
    const pending = local.pending.filter((row) => !sent.has(row.reportId));
    return {
      local: { ...local, pending, attempts: 0, nextAttemptAtMs: 0 },
      removed: local.pending.length - pending.length,
      rejected: [],
      rollback: null,
    };
  }
  const attempts = local.attempts + 1;
  // Опознание может «доехать» (вход ещё не завершён) — ждём дольше обычного.
  const wait = kind === 'identity' ? backoffMs(attempts + 2) : backoffMs(attempts);
  return {
    local: { ...local, attempts, nextAttemptAtMs: nowMs + wait },
    removed: 0,
    rejected: [],
    rollback: null,
  };
}

/** Показывать ли «Сохраняем подъём…»: есть неотправленное. Для UI, без сети. */
export function spireHasUnsyncedSteps(local: SpireWeekLocal): boolean {
  return local.pending.some((row) => row.outcome === 'passed');
}
