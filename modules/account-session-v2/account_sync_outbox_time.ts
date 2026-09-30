import type { SessionFence } from './account_session';
import type { AccountScopeTransaction } from './account_scope_store';
import type { AccountSyncEffect, AccountSyncWireBatch, AccountSyncWireOperation } from './account_sync';
import { normalizeDispatchEffect } from './account_sync_outbox_effects';
import {
  ACCOUNT_SYNC_OPERATION_MAX_AGE_MS,
  fail,
  operationKey,
  parsePending,
  pendingJson,
  semanticEqual,
  type AccountSyncDispatchState,
  type EnqueueTimes,
  type Pending,
} from './account_sync_outbox_records';

/*
 * Account V2 — время операций outbox: срок жизни (карантин просроченных) и оценка
 * времени постановки для сервера (TG-DFA918464DFA).
 * зачем: вынесено из account_sync_outbox.ts (правило ≤ 800 строк) при добавлении
 * серверной проверки возраста операции.
 */

const LOG = '[ACCOUNTS-V2-CLIENT]';

/** Сейчас по двум часам: телефона как есть и с поправкой на сервер. */
export type NowPair = Readonly<{ localMs: number; serverMs: number }>;
export type Scanned = Readonly<{ sequence: number; pending: Pending }>;
type DispatchEffect = Extract<AccountSyncEffect, { type: 'DISPATCH_OUTBOX_BATCH' }>;

/**
 * Просроченные операции окна.
 * зачем (TG-CF3E51F11C41, P1): квитанции сервера живут 180 суток; старше 170 —
 * карантин, не отправка. Возраст меряется ДВУМЯ часами (местные и с поправкой на
 * сервер); сбитые и затем исправленные часы (или устаревшая поправка) портят одну
 * оценку. Правило (ремонт №3, TG-085BF4F55515, P2-1):
 *   expire = (serverOld && localOld)
 *         || (serverOld && localAge < 0)
 *         || (localOld && serverAge < 0)
 * зачем: отрицательный возраст — доказанно ложная оценка (время постановки не
 * может быть в будущем), поэтому решает вторая. Если же одна оценка ПОЛОЖИТЕЛЬНА,
 * но молода, — доверяем ей (операция живая, лог outbox_age_disagree): ложное
 * истечение хуже, чем редкий поздний повтор.
 *
 * Остаточный риск прежнего TEMP (часы ушли ВПЕРЁД меньше чем на 170 сут при
 * постановке и затем исправлены — местная оценка занижена) закрыт сервером
 * (TG-DFA918464DFA): операция несёт enqueuedAtServerMs, сервер меряет возраст
 * СВОИМИ часами и отказывает `operation_expired` (здесь → sync_operation_expired).
 */
export function expiredOf(scanned: readonly Scanned[], now: NowPair): readonly Scanned[] {
  let negative = 0;
  let disagree = 0;
  const expired = scanned.filter(({ pending }) => {
    const serverAge = now.serverMs - pending.enqueuedAtMs;
    const localAge = now.localMs - pending.enqueuedLocalAtMs;
    if (serverAge < 0 || localAge < 0) negative += 1;
    const serverOld = serverAge > ACCOUNT_SYNC_OPERATION_MAX_AGE_MS;
    const localOld = localAge > ACCOUNT_SYNC_OPERATION_MAX_AGE_MS;
    if (serverOld !== localOld) disagree += 1;
    return (serverOld && localOld) || (serverOld && localAge < 0) || (localOld && serverAge < 0);
  });
  if (negative > 0) console.warn(`${LOG} outbox_age_negative`, `operations=${negative}`);
  if (disagree > 0) console.warn(`${LOG} outbox_age_disagree`, `operations=${disagree}`);
  return expired;
}

/** Самая молодая из правдоподобных оценок (не в будущем); правдоподобных нет — «сейчас». */
function youngestPlausible(estimates: readonly number[], serverNowMs: number): number {
  const plausible = estimates.filter((estimate) => estimate <= serverNowMs);
  return plausible.length === 0 ? serverNowMs : Math.max(...plausible);
}

/**
 * Оценка времени постановки для сервера (`enqueuedAtServerMs`, TG-DFA918464DFA,
 * ремонт №1 после ревью). Считается при КАЖДОЙ отправке из неизменных записей:
 *
 *   постановка  = младшая правдоподобная из { enqueuedAtMs (часы + смещение ТОГДА),
 *                                             enqueuedLocalAtMs + смещение СЕЙЧАС }
 *   первая отпр.= младшая правдоподобная из { firstSent.serverMs, firstSent.localMs + смещение СЕЙЧАС }
 *   на провод   = min(постановка, первая отправка)
 *
 * «Правдоподобная» = не в будущем относительно «сейчас по серверу»: время события
 * позже «сейчас» доказанно ложно (отрицательный возраст) и отбрасывается. Обе
 * ложны — берётся «сейчас».
 *
 * зачем две оценки (P2-2): одна замороженная оценка (часы + смещение в момент
 * постановки) навсегда врёт, если смещение тогда было устаревшим: дату телефона
 * сбросили в прошлое (заводской сброс), смещение старое — живая правка получала бы
 * `operation_expired` на каждой отправке, и requeue слал бы то же число. Вторая
 * оценка берёт местное время постановки и ТЕКУЩЕЕ смещение (из ответа сервера
 * после сброса) — она верна, пока часы телефона не переводили после постановки.
 * Из двух правдоподобных берётся МЛАДШАЯ: ложное истечение живой правки хуже
 * позднего повтора (то же правило, что у срока жизни outbox).
 *
 * зачем граница первой отправки (P2-1): квитанция сервера не может появиться
 * раньше первой отправки, а живёт 180 сут. Если граница не позже настоящего
 * момента первой отправки, то после истечения квитанции возраст на сервере
 * ≥ 180 сут > 170 — повтор получает `operation_expired`, двойного применения нет.
 * Прежний зажим «сейчас по серверу» пересчитывался при каждой отправке: при часах,
 * убежавших вперёд, обе оценки постановки оставались «в будущем», на провод шло
 * «сейчас», возраст всегда ~0 — и повтор через 181 сут после потерянного ответа
 * применялся второй раз. Граница из записи первой отправки неизменна.
 *
 * Почему «младшая» не открывает дыру снова: граница первой отправки — тоже
 * младшая из двух оценок, но каждая из них ПОЗЖЕ настоящего момента только в
 * одном случае: (а) firstSent.serverMs — часы спешили И смещение было устаревшим
 * в момент первой отправки; (б) localMs + смещение сейчас — часы перевели НАЗАД
 * после первой отправки. В обоих случаях граница позже настоящей на величину
 * сдвига, и дыра остаётся лишь при сдвиге больше запаса 10 сут (170 vs 180), а не
 * «навсегда». Взять старшую нельзя: при сброшенной дате (P2-2) firstSent.serverMs
 * тоже в далёком прошлом — и правка снова истекала бы навечно.
 * TEMP (остаточный риск, принят): сдвиг часов больше 10 сут в указанных случаях
 * при потерянном ответе и простое приложения ≥ 170 сут.
 * TEMP (ревью 2026-09-30, не регрессия): дата сброшена в прошлое, правка сделана
 * офлайн, а телефон САМ исправил часы до первой отправки (смещение ≈ 0) — все
 * четыре оценки остаются в эпохе сброса и правдоподобны, правка получает
 * `operation_expired` при каждом возврате из карантина. Починка — монотонные часы
 * (время с загрузки + id загрузки при постановке), отдельная задача.
 */
export function wireEnqueuedAtServerMs(times: EnqueueTimes, offsetMs: number, serverNowMs: number): number {
  const enqueued = youngestPlausible(
    [times.enqueuedAtMs, Math.max(0, times.enqueuedLocalAtMs + offsetMs)], serverNowMs,
  );
  const firstSent = times.firstSent === null ? serverNowMs : youngestPlausible(
    [times.firstSent.serverMs, Math.max(0, times.firstSent.localMs + offsetMs)], serverNowMs,
  );
  return Math.min(enqueued, firstSent);
}

export type AccountSyncWireContext = Readonly<{
  ownerUid: string;
  boundFence: SessionFence;
  transact<T>(work: (transaction: AccountScopeTransaction) => Promise<T>): Promise<T>;
  readDispatch(transaction: AccountScopeTransaction): Promise<AccountSyncDispatchState>;
  localNowMs(): number;
}>;

/**
 * Пакет на провод для эффекта отправки: каждая операция + её enqueuedAtServerMs.
 * В той же транзакции у ещё не отправлявшейся операции ОДИН раз записывается
 * момент первой отправки (обе оценки). Операции нет в очереди или конверт
 * другой — отказ (конфликт), а не пакет без оценки.
 */
export function createAccountSyncWireBatch(
  context: AccountSyncWireContext,
): (effect: DispatchEffect) => Promise<AccountSyncWireBatch> {
  const { ownerUid, boundFence } = context;
  return async (rawEffect) => {
    const batch = normalizeDispatchEffect(rawEffect, boundFence, ownerUid);
    return context.transact(async (transaction) => {
      const offsetMs = (await context.readDispatch(transaction)).clockOffsetMs ?? 0;
      const localMs = context.localNowMs();
      const serverNowMs = Math.max(0, localMs + offsetMs);
      let firstSends = 0;
      let youngerThanFrozen = 0;
      const operations: AccountSyncWireOperation[] = [];
      for (const owned of batch.operations) {
        const key = operationKey('pending', owned.operation.operationId);
        const record = await transaction.readRecord(key);
        if (record === null) {
          console.warn(`${LOG} outbox_wire_operation_missing`, `operations=${batch.operations.length}`);
          return fail('account_sync_outbox_conflict');
        }
        const stored = parsePending(record.value, ownerUid);
        if (!semanticEqual(stored.envelope, owned)) {
          console.warn(`${LOG} outbox_wire_operation_mismatch`, `operations=${batch.operations.length}`);
          return fail('account_sync_outbox_conflict');
        }
        const pending: Pending = stored.firstSent !== null ? stored
          : Object.freeze({ ...stored, firstSent: Object.freeze({ serverMs: serverNowMs, localMs }) });
        if (pending !== stored) {
          firstSends += 1;
          await transaction.putRecord({ key, value: pendingJson(ownerUid, pending) });
        }
        const enqueuedAtServerMs = wireEnqueuedAtServerMs(pending, offsetMs, serverNowMs);
        if (enqueuedAtServerMs > pending.enqueuedAtMs) youngerThanFrozen += 1;
        operations.push(Object.freeze({ ownerUid: owned.ownerUid, operation: owned.operation, enqueuedAtServerMs }));
      }
      // Лог решений без данных: сколько операций отправлено впервые и у скольких
      // замороженная оценка постановки заменена младшей (сброшенная дата / смещение).
      if (firstSends > 0) console.warn(`${LOG} outbox_first_send_recorded`, `operations=${firstSends}`);
      if (youngerThanFrozen > 0) console.warn(`${LOG} outbox_enqueue_time_younger`, `operations=${youngerThanFrozen}`);
      return Object.freeze({ batchId: batch.batchId, operations: Object.freeze(operations) });
    });
  };
}

/**
 * Порт отправки раннера поверх outbox: на callable уходит ТОЛЬКО пакет провода
 * (wireBatch), а не голый пакет эффекта. зачем (ремонт №1, P3): без оценки времени
 * сервер отклоняет пакет целиком (missing_field) — подключение обязано брать этот порт.
 */
export function createAccountSyncDispatchPort(
  wireBatch: (effect: DispatchEffect) => Promise<AccountSyncWireBatch>,
  send: (batch: AccountSyncWireBatch) => unknown,
): (effect: DispatchEffect) => Promise<unknown> {
  return async (effect) => send(await wireBatch(effect));
}
