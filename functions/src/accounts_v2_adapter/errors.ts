import { HttpsError } from 'firebase-functions/v2/https';
import { AccountsV2ApplyError } from '../accounts_v2_apply_core';

/*
 * Account V2 — классификация ошибок callable для клиента.
 * Ремонт №2 (TG-6ACFDD4A9F0F): окончательным считается ТОЛЬКО отказ с явной
 * меткой `details.final === true`.
 *
 * зачем: ревью (SPEC HOLD P1) — временные сбои (gRPC 13/2/1, ошибки без кода,
 * таймаут/OOM функции → голый HTTP 500 = `internal`) уходили в окончательный
 * `internal`, и клиент отправлял живой пакет в карантин. Теперь метку `final:true`
 * ставит только сервер и только на СВОИ детерминированные отказы (тот же пакет →
 * тот же ответ). Всё, чего сервер не классифицировал, — повторяемое: клиент
 * повторяет с backoff и сам ограничивает число попыток (потолок → карантин).
 *
 * В details — только машинный код и числа, без путей, id и содержимого.
 */

/** Клиентский потолок попыток одного пакета при повторяемых ответах (TEMP-контракт). */
export const ACCOUNTS_V2_CLIENT_MAX_ATTEMPTS = 5;
/**
 * Сколько должны длиться неудачи пакета, прежде чем потолок попыток уведёт его в
 * карантин: сутки с ПЕРВОЙ неудачи (часы клиента с поправкой на serverNowMs).
 *
 * зачем (TG-7CD73967EF61, ревью SPEC HOLD P1): пять неудач с backoff 1–8 с
 * набираются за ~15 с — короткий офлайн (лифт, метро) навсегда уводил живой
 * пакет в карантин. Потолок теперь = И ≥ maxAttempts неудач, И ≥ суток; и
 * карантин по потолку ВОЗВРАТНЫЙ (клиент возвращает пакет в очередь, requeue).
 */
export const ACCOUNTS_V2_CLIENT_MIN_FAILURE_SPAN_MS = 24 * 60 * 60 * 1000;

/**
 * TEMP-контракт клиента (outbox). Решение принимается по `details.final`,
 * код HttpsError — справочно (кроме `unauthenticated`).
 *
 * Ремонт №3 (TG-9CA66AD34ABC): `resource-exhausted` с валидным
 * `details.retryAfterMs` (> 0) — это ОЖИДАНИЕ, а не неудача: клиент ждёт не
 * меньше retryAfterMs и повторяет, НЕ увеличивая счётчик неудач пакета
 * (потолок maxAttempts не расходуется). зачем: иначе лимит частоты / блок серии
 * неудач в минуту офлайн-разгрузки отправлял бы в карантин живые пакеты.
 * Бесконечного цикла это не даёт: пока блок действует, повтор стоит серверу
 * ноль чтений (кэш блока) или одно (другой инстанс), а клиент ждёт паузу.
 */
export const ACCOUNTS_V2_CLIENT_ERROR_CONTRACT = Object.freeze({
  decideBy: 'details.final' as const,
  /** Коды, которые сервер отдаёт ТОЛЬКО с `final:true`. */
  final: Object.freeze(['invalid-argument', 'permission-denied', 'failed-precondition'] as const),
  /** Коды с `final:false`; `internal` сервер сам не отдаёт — это голый HTTP 500 (таймаут/OOM). */
  retryable: Object.freeze(['resource-exhausted', 'unavailable', 'internal'] as const),
  reauth: Object.freeze(['unauthenticated'] as const),
  maxAttempts: ACCOUNTS_V2_CLIENT_MAX_ATTEMPTS,
  /** resource-exhausted + retryAfterMs > 0 — ожидание: потолок попыток НЕ расходует. */
  retryAfterConsumesAttempt: false as const,
  /** Потолок срабатывает, только если с первой неудачи прошло не меньше этого. */
  minFailureSpanMs: ACCOUNTS_V2_CLIENT_MIN_FAILURE_SPAN_MS,
  /** Карантин по потолку возвратный: клиент может вернуть пакет в очередь. */
  attemptsExhaustedRequeue: true as const,
  /**
   * Все возвратные коды карантина клиента (requeue). зачем (TG-CF3E51F11C41): кроме
   * потолка попыток — «кривые квитанции» и «просрочено по часам клиента». Повтор
   * просроченной операции безопасен при условии, что клиент верно оценил её возраст
   * правилом двух оценок (TG-085BF4F55515: истекает, если обе оценки > 170 суток,
   * или одна > 170, а вторая отрицательна, то есть доказанно ложна): тогда
   * операция моложе 170 суток, квитанция (180 суток) жива, сервер ответит duplicate.
   * Оговорка про сбитые часы (часы ушли вперёд при постановке и потом исправлены)
   * закрыта сервером (TG-DFA918464DFA): операция несёт `enqueuedAtServerMs`, и ядро
   * отказывает старше 170 суток по СВОИМ часам (`rejected operation_expired` →
   * у клиента `sync_operation_expired`). Остаток (TEMP): оценку ставит клиент —
   * если и его поправка на сервер была неверна при постановке, возраст занижен.
   * `sync_operation_time_in_future` (TG-DFA918464DFA) возвратный: оценка из
   * будущего значит, что клиент ещё не знал смещения часов; ответ с отказом несёт
   * serverNowMs, и возвращённая операция уходит с оценкой, зажатой сверху.
   */
  requeueQuarantineCodes: Object.freeze([
    'sync_dispatch_attempts_exhausted', 'sync_receipt_invalid_exhausted', 'sync_operation_expired',
    'sync_operation_time_in_future',
  ] as const),
});

export type AccountsV2ClientAction = 'quarantine' | 'retry' | 'reauth';

/** true — ответ «подожди retryAfterMs»: resource-exhausted с конечным retryAfterMs > 0. */
export function accountsV2IsWaitResponse(error: Readonly<{ code: string; details?: unknown }>): boolean {
  if (error.code !== 'resource-exhausted') return false;
  const details = error.details;
  if (typeof details !== 'object' || details === null) return false;
  const retryAfterMs = (details as { retryAfterMs?: unknown }).retryAfterMs;
  return typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0;
}

/**
 * Эталон решения клиента (клиентский пакет повторяет его дословно).
 * failedAttempts — сколько раз этот пакет уже получил НЕУДАЧУ, ВКЛЮЧАЯ эту;
 * ответы-ожидания (accountsV2IsWaitResponse) клиент в этот счёт НЕ включает.
 * failingForMs — сколько прошло с ПЕРВОЙ неудачи пакета (часы с поправкой на
 * сервер); отрицательное (часы назад) потолок не включает.
 */
export function accountsV2ClientAction(
  error: Readonly<{ code: string; details?: unknown }>,
  failedAttempts: number,
  failingForMs: number,
): AccountsV2ClientAction {
  if (error.code === 'unauthenticated') return 'reauth';
  const details = error.details;
  const final = typeof details === 'object' && details !== null && (details as { final?: unknown }).final === true;
  if (final) return 'quarantine';
  // Ожидание ≠ неудача: пауза retryAfterMs, потолок попыток не трогаем.
  if (accountsV2IsWaitResponse(error)) return 'retry';
  // final отсутствует или false (включая голый internal без details) — повтор до потолка:
  // И ≥ maxAttempts неудач, И ≥ суток с первой (короткий офлайн карантин не даёт).
  return failedAttempts >= ACCOUNTS_V2_CLIENT_MAX_ATTEMPTS
    && failingForMs >= ACCOUNTS_V2_CLIENT_MIN_FAILURE_SPAN_MS ? 'quarantine' : 'retry';
}

/** Отказ сторожа частоты (бросается из транзакции, маппится в resource-exhausted). */
export class AccountsV2RateLimited extends Error {
  constructor(readonly blockedUntilMs: number) {
    super('rate_limited');
    this.name = 'AccountsV2RateLimited';
  }
}

export function finalError(
  code: 'invalid-argument' | 'permission-denied' | 'failed-precondition',
  reason: string,
): HttpsError {
  return new HttpsError(code, reason, { final: true, code: reason });
}

export function retryableError(): HttpsError {
  return new HttpsError('unavailable', 'retryable', { final: false });
}

export function reauthError(): HttpsError {
  return new HttpsError('unauthenticated', 'auth_required', { final: false });
}

export function rateLimitedError(retryAfterMs: number, reason = 'rate_limited'): HttpsError {
  return new HttpsError('resource-exhausted', reason, { final: false, retryAfterMs: Math.max(1, retryAfterMs) });
}

/** true — отказ помечен окончательным (клиент кладёт пакет в карантин). */
export function isFinalHttpsError(error: HttpsError): boolean {
  const details: unknown = error.details;
  return typeof details === 'object' && details !== null && (details as { final?: unknown }).final === true;
}

const GRPC_NAMES: Readonly<Record<number, string>> = Object.freeze({
  1: 'cancelled', 2: 'unknown', 3: 'invalid-argument', 4: 'deadline-exceeded', 8: 'resource-exhausted',
  9: 'failed-precondition', 10: 'aborted', 13: 'internal', 14: 'unavailable',
});

/**
 * gRPC-коды Firestore, которые считаются следствием ВХОДА (окончательные).
 *
 * Только INVALID_ARGUMENT(3): в нашей транзакции нет запросов, только get/getAll/set
 * документов под uid; 3 здесь — документ/поле вне пределов Firestore (размер,
 * вложенность, недопустимое значение), а это функция пакета и сохранённого
 * состояния: повтор того же пакета даст тот же отказ.
 * Исключение (ремонт №3): код 3 с сообщением /transaction has expired/i —
 * состояние транзакции, а не вход (долгая транзакция, пауза инстанса). SDK
 * повторяет его сам, но после исчерпания своих попыток он доходит наружу —
 * и это ПОВТОРЯЕМЫЙ сбой. Сообщение только сверяется с шаблоном и в лог НЕ
 * пишется (может нести id транзакции и пути).
 *
 * FAILED_PRECONDITION(9) — НЕ окончательный: в Firestore он детерминирован для
 * запросов без индекса, которых здесь нет; в транзакции get/set он означает
 * состояние транзакции/сервера (истёкшая/недействительная транзакция), а не
 * входные данные. Повторяем; бесплатную карусель режет учёт неудач инстанса
 * и клиентский потолок попыток.
 */
const FINAL_GRPC = new Set(['invalid-argument']);
const ADAPTER_CODE = /^accounts_v2_([a-z0-9_]+)$/;
/** Временный вариант INVALID_ARGUMENT(3): сверяется с сообщением, само сообщение не логируется. */
const TRANSACTION_EXPIRED = /transaction has expired/i;
/**
 * Коды адаптера, которые НЕ функция пакета (ремонт №3): getall_mismatch — SDK
 * вернул не столько снапшотов, сколько запрошено; это аномалия SDK/сети, повтор
 * того же пакета её не воспроизводит — повторяемый.
 */
const RETRYABLE_ADAPTER_CODES = new Set(['getall_mismatch']);

/** true — Firestore отверг транзакцию как истёкшую (gRPC 3 с шаблоном сообщения). */
function isExpiredTransaction(error: unknown, grpc: string): boolean {
  if (grpc !== 'invalid-argument' || !(error instanceof Error)) return false;
  return TRANSACTION_EXPIRED.test(error.message);
}

/** gRPC-код ошибки Firestore в нормальной форме ('aborted', …) или 'none'. */
function grpcName(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return 'none';
  const { code } = error as { code: unknown };
  if (typeof code === 'number') return GRPC_NAMES[code] ?? `grpc_${code}`;
  if (typeof code === 'string') return code.toLowerCase().replace(/_/g, '-');
  return 'none';
}

/**
 * Любая ошибка обработки → HttpsError с явной меткой details.final.
 * quotaRetryAfterMs — пауза для квоты Firestore (RESOURCE_EXHAUSTED).
 */
export function mapAccountsV2Error(error: unknown, tag: string, nowMs: number, quotaRetryAfterMs: number): HttpsError {
  if (error instanceof HttpsError) return error;
  if (error instanceof AccountsV2RateLimited) return rateLimitedError(error.blockedUntilMs - nowMs);
  if (error instanceof AccountsV2ApplyError) {
    // Ядро синхронное и без ввода-вывода: его отказ детерминирован.
    console.error(`[ACCOUNTS-V2] apply_error uid=${tag} code=${error.code}`);
    if (error.code === 'uid_mismatch') return finalError('permission-denied', 'uid_mismatch');
    if (error.code === 'unauthenticated') return reauthError();
    return finalError('failed-precondition', error.code);
  }
  const name = error instanceof Error ? error.name : typeof error;
  const adapter = error instanceof Error ? ADAPTER_CODE.exec(error.message) : null;
  if (adapter !== null && RETRYABLE_ADAPTER_CODES.has(adapter[1])) {
    console.error(`[ACCOUNTS-V2] adapter_error uid=${tag} code=${adapter[1]} class=retryable`);
    return retryableError();
  }
  if (adapter !== null) {
    // Свой машинный код адаптера — детерминирован, повтор даст то же.
    console.error(`[ACCOUNTS-V2] adapter_error uid=${tag} code=${adapter[1]}`);
    return finalError('failed-precondition', adapter[1]);
  }
  // Сбой Firestore/сети/среды: в лог только имя и код — сообщение может нести пути.
  const grpc = grpcName(error);
  if (isExpiredTransaction(error, grpc)) {
    // зачем: истёкшая транзакция — состояние сервера, не вход; текст сообщения не пишем.
    console.error(`[ACCOUNTS-V2] apply_failed uid=${tag} name=${name} grpc=${grpc} class=retryable variant=tx_expired`);
    return retryableError();
  }
  if (FINAL_GRPC.has(grpc)) {
    console.error(`[ACCOUNTS-V2] apply_failed uid=${tag} name=${name} grpc=${grpc} class=final`);
    return finalError('failed-precondition', 'firestore_rejected');
  }
  if (grpc === 'resource-exhausted') {
    console.error(`[ACCOUNTS-V2] apply_failed uid=${tag} name=${name} grpc=${grpc} class=quota`);
    return rateLimitedError(quotaRetryAfterMs, 'firestore_quota');
  }
  // Всё неклассифицированное (13/2/1/10/14/4/9, без кода, чужие исключения) — повторяемое.
  console.error(`[ACCOUNTS-V2] apply_failed uid=${tag} name=${name} grpc=${grpc} class=retryable`);
  return retryableError();
}
