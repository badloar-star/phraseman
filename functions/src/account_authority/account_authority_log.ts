import * as logger from 'firebase-functions/logger';

/*
 * Account Authority 2.0, этап S1: серверный логгер со скрытием PII.
 *
 * зачем (правило владельца «сперва логи»): раньше любой неизвестный сбой в
 * callable превращался в `internal`, и на сервере не оставалось ни одной строки
 * лога. Теперь каждый вызов пишет вход (вид операции), ветку, итог (код) и
 * длительность. Это тонкая обёртка над `firebase-functions/logger`: глобального
 * состояния нет, тесты перехватывают сам модуль logger.
 *
 * Одна ошибка — одна итоговая строка (ревью L4). Промежуточные слои (разбор
 * запроса, контракт, резолвер привязки) сами не логируют. Они прикрепляют к
 * ошибке подробности через `attachAccountAuthorityFailureDetail`. Внешний слой
 * пишет одну строку через `logAccountAuthorityFailureOnce`, и туда собраны все
 * подробности. Повторный вызов для той же ошибки ничего не пишет. Хранилища —
 * WeakMap/WeakSet по объекту ошибки: ссылок они не удерживают, общего
 * изменяемого состояния между вызовами нет.
 *
 * Приватность, последний рубеж (ревью L1). Строковое значение пропускается,
 * только если ключ есть в списке перечислимых полей и значение — короткий
 * машинный код. Под это требование не подходят:
 *   - заглавные буквы (кроме полей с именем класса ошибки),
 *   - `/` и `@`,
 *   - буквенно-цифровой кусок с цифрой длиной от 8 символов,
 *   - кусок длиннее 32 символов.
 * Всё остальное становится `redacted`. Числа и флаги идут как есть. Сам вызов
 * logger обёрнут: сбой лога не ломает обработку запроса.
 *
 * Поля `kind` и `causeKind` допускают смешанный регистр только из
 * фиксированного списка имён классов (KNOWN_ERROR_NAMES); любое другое имя
 * нормализуется в `Error` ещё в accountAuthorityServerErrorKind (ревью R1).
 *
 * Принятый остаток: строчное буквенное слово длиной до 32 символов без цифр
 * проходит как код (LOWER_CODE). Это нужно для кодов вроде `unavailable` и
 * `lease_acquire`. Строчный буквенный uid такой длины прошёл бы, но код AA
 * не кладёт uid в поля лога (это проверяет сторож).
 */

export const ACCOUNT_AUTHORITY_SERVER_LOG_PREFIX = '[ACCOUNT-AUTHORITY]';

export type AccountAuthorityServerLogValue = string | number | boolean | null;
export type AccountAuthorityServerLogFields = Readonly<Record<string, AccountAuthorityServerLogValue>>;

const ALLOWED_STRING_KEYS: ReadonlySet<string> = new Set([
  // 'from' (S2a раунд 2): вид прежнего источника принципала при перепривязке.
  'activeSession', 'causeCode', 'causeKind', 'code', 'deleteCode', 'from', 'kind', 'leaseCode',
  'mappedTo', 'operation', 'reason', 'revision', 'stage', 'status', 'type',
]);
const ERROR_NAME_KEYS: ReadonlySet<string> = new Set(['kind', 'causeKind']);
/** Известные имена классов ошибок; всё прочее нормализуется в `Error`. */
export const KNOWN_ERROR_NAMES: ReadonlySet<string> = new Set([
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError',
  'AggregateError', 'HttpsError', 'FirebaseError', 'FirestoreError', 'AccountLeaseError',
  'AccountAuthorityCallableError', 'InstallationBindingError', 'AbortError', 'TimeoutError',
]);
const TYPEOF_VALUES: ReadonlySet<string> = new Set([
  'undefined', 'object', 'boolean', 'number', 'bigint', 'string', 'symbol', 'function',
]);
const FIELD_KEY = /^[A-Za-z][A-Za-z0-9]{0,47}$/;
const LOWER_CODE = /^[a-z0-9_.:-]{1,80}$/;

function hasIdentifierLikeRun(value: string): boolean {
  return value.split(/[^A-Za-z0-9]+/).some((run) => (
    run.length > 32 || (run.length >= 8 && /[0-9]/.test(run))
  ));
}

export function isAccountAuthorityServerSafeCode(value: string): boolean {
  return LOWER_CODE.test(value) && !hasIdentifierLikeRun(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function redactAccountAuthorityLogFields(
  fields: AccountAuthorityServerLogFields,
): AccountAuthorityServerLogFields {
  const safe: Record<string, AccountAuthorityServerLogValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!FIELD_KEY.test(key)) continue;
    if (typeof value !== 'string') {
      safe[key] = value;
    } else if (!ALLOWED_STRING_KEYS.has(key)) {
      safe[key] = 'redacted';
    } else if (ERROR_NAME_KEYS.has(key) && KNOWN_ERROR_NAMES.has(value)) {
      safe[key] = value;
    } else {
      safe[key] = isAccountAuthorityServerSafeCode(value) ? value : 'redacted';
    }
  }
  return Object.freeze(safe);
}

type Level = 'info' | 'warn' | 'error';

function write(level: Level, event: string, fields: AccountAuthorityServerLogFields): void {
  try {
    logger[level](`${ACCOUNT_AUTHORITY_SERVER_LOG_PREFIX} ${event}`, redactAccountAuthorityLogFields(fields));
  } catch (error) {
    // зачем (ревью L3): сбой самого лога не должен ронять обработку запроса.
    console.warn(`${ACCOUNT_AUTHORITY_SERVER_LOG_PREFIX} logger_failed level=${level} kind=${accountAuthorityServerErrorKind(error)}`);
  }
}

export function accountAuthorityLogInfo(event: string, fields: AccountAuthorityServerLogFields = {}): void {
  write('info', event, fields);
}

export function accountAuthorityLogWarn(event: string, fields: AccountAuthorityServerLogFields = {}): void {
  write('warn', event, fields);
}

export function accountAuthorityLogError(event: string, fields: AccountAuthorityServerLogFields = {}): void {
  write('error', event, fields);
}

/**
 * Вид ошибки без текста сообщения: имя класса из KNOWN_ERROR_NAMES (любое
 * другое → `Error`, ревью R1) или значение typeof.
 */
export function accountAuthorityServerErrorKind(error: unknown): string {
  if (error instanceof Error) return KNOWN_ERROR_NAMES.has(error.name) ? error.name : 'Error';
  const kind = typeof error;
  return TYPEOF_VALUES.has(kind) ? kind : 'unknown';
}

/** Безопасный код: числовой gRPC-код, короткий строковый код или `none`. Текст сообщения — никогда. */
export function accountAuthorityServerErrorCode(error: unknown): string {
  const code = isRecord(error) ? error.code : undefined;
  if (typeof code === 'number' && Number.isSafeInteger(code)) return String(code);
  if (typeof code === 'string' && isAccountAuthorityServerSafeCode(code)) return code;
  if (error instanceof Error && /^account_authority_[a-z0-9_]{1,80}$/.test(error.message)) return error.message;
  return 'none';
}

// gRPC: 4 DEADLINE_EXCEEDED, 8 RESOURCE_EXHAUSTED, 10 ABORTED (contention), 14 UNAVAILABLE.
const TRANSIENT_NUMERIC_CODES = new Set([4, 8, 10, 14]);
const TRANSIENT_STRING_CODES = new Set([
  'deadline-exceeded',
  'resource-exhausted',
  'aborted',
  'unavailable',
  'DEADLINE_EXCEEDED',
  'RESOURCE_EXHAUSTED',
  'ABORTED',
  'UNAVAILABLE',
]);

/** Временный сбой хранилища или сети: повтор имеет смысл (в отличие от отказа и поломки). */
export function isTransientAccountAuthorityStorageError(error: unknown): boolean {
  const code = isRecord(error) ? error.code : undefined;
  if (typeof code === 'number') return TRANSIENT_NUMERIC_CODES.has(code);
  if (typeof code === 'string') return TRANSIENT_STRING_CODES.has(code);
  return false;
}

export function accountAuthorityServerErrorFields(error: unknown): AccountAuthorityServerLogFields {
  return Object.freeze({
    kind: accountAuthorityServerErrorKind(error),
    code: accountAuthorityServerErrorCode(error),
  });
}

/** Поля причины (для подробностей итоговой строки): causeKind/causeCode. */
export function accountAuthorityServerCauseFields(error: unknown): AccountAuthorityServerLogFields {
  return Object.freeze({
    causeKind: accountAuthorityServerErrorKind(error),
    causeCode: accountAuthorityServerErrorCode(error),
  });
}

const failureDetails = new WeakMap<object, AccountAuthorityServerLogFields>();
const loggedFailures = new WeakSet<object>();

/**
 * Прикрепляет подробности к ошибке вместо отдельной строки лога. Подробности
 * копятся, и итоговая строка внешнего слоя выводит их все разом.
 */
export function attachAccountAuthorityFailureDetail<E extends object>(
  error: E,
  ...details: readonly AccountAuthorityServerLogFields[]
): E {
  const merged = Object.assign({}, failureDetails.get(error) ?? {}, ...details);
  failureDetails.set(error, Object.freeze(merged));
  return error;
}

export function readAccountAuthorityFailureDetail(error: unknown): AccountAuthorityServerLogFields {
  return isRecord(error) ? failureDetails.get(error) ?? Object.freeze({}) : Object.freeze({});
}

export function isAccountAuthorityFailureLogged(error: unknown): boolean {
  return isRecord(error) && loggedFailures.has(error);
}

/**
 * Итоговая строка ошибки: ровно одна на ошибку. `related` — ошибки той же
 * цепочки (исходная и публичная): их подробности сливаются, и все они
 * помечаются как залогированные. Если любая из них уже залогирована, второй
 * строки не будет. Уровень: `error` для internal, иначе `warn`.
 */
export function logAccountAuthorityFailureOnce(
  event: string,
  fields: AccountAuthorityServerLogFields,
  related: readonly unknown[],
): boolean {
  const objects = related.filter(isRecord);
  if (objects.some((error) => loggedFailures.has(error))) {
    objects.forEach((error) => loggedFailures.add(error));
    return false;
  }
  const merged = Object.assign({}, ...objects.map((error) => failureDetails.get(error) ?? {}), fields);
  objects.forEach((error) => loggedFailures.add(error));
  write(merged.code === 'internal' ? 'error' : 'warn', event, merged);
  return true;
}

/** Миллисекунды с момента `startedAt` (Date.now), для поля durationMs. */
export function accountAuthorityServerElapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}
