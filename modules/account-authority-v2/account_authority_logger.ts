/*
 * Account Authority 2.0, этап S1: порт-логгер.
 *
 * зачем (правило владельца «сперва логи», 2026-08-29): в модулях AA не было ни
 * одной строки лога, и любой отказ входа, выхода или аренды был немым. Логгер
 * сделан портом (DI): runtime, транспорт, bootstrap и адаптер получают его
 * снаружи, тесты подменяют своим, глобального состояния нет. Чистый reducer не
 * логирует, его переходы пишет драйвер (runtime).
 *
 * Приватность. Вызывающий код обязан передавать только виды, фазы, коды и
 * длительности. Это проверяют сторож и поведенческие тесты. Здесь стоит
 * последний рубеж, и он строгий: строковое значение пропускается, только если
 * ключ есть в списке перечислимых полей (ALLOWED_STRING_KEYS) и само значение
 * похоже на короткий машинный код. Под это требование не подходят:
 *   - заглавные буквы (кроме полей с именем класса ошибки),
 *   - `/` и `@`,
 *   - буквенно-цифровой кусок с цифрой длиной от 8 символов
 *     (так отсекаются хвосты uid и куски UUID),
 *   - любой кусок длиннее 32 символов.
 * Всё остальное становится `redacted`. Числа и флаги идут как есть, но только
 * под ключами, которые выглядят как идентификатор поля.
 *
 * Поля с видом ошибки (`kind`, `errorKind`) допускают смешанный регистр только
 * из фиксированного списка имён классов (KNOWN_ERROR_NAMES); любое другое имя
 * класса нормализуется в `Error` ещё в accountAuthorityErrorKind. Поле
 * `callable` допускает только три имени callable AA (ACCOUNT_AUTHORITY_CALLABLE_NAMES,
 * сторож сверяет их с константами транспорта). Так буквенный uid смешанного
 * регистра не проходит ни под каким ключом.
 *
 * Принятый остаток (ревью R1): строчное буквенное слово длиной до 32 символов
 * без цифр проходит как код (LOWER_CODE). Это нужно для видов операций runtime
 * (sign_in, sign_out, delete, revoke, resume) и кодов вроде `unavailable`.
 * Строчный буквенный uid такой длины теоретически прошёл бы, но код AA не
 * кладёт uid в поля лога (это проверяет сторож), а у uid Firebase 28 символов
 * смешанного регистра.
 */

export const ACCOUNT_AUTHORITY_LOG_PREFIX = '[ACCOUNT-AUTHORITY]';

export type AccountAuthorityLogValue = string | number | boolean | null;
export type AccountAuthorityLogFields = Readonly<Record<string, AccountAuthorityLogValue>>;

export interface AccountAuthorityLogger {
  info(event: string, fields?: AccountAuthorityLogFields): void;
  warn(event: string, fields?: AccountAuthorityLogFields): void;
}

/** Поля-перечисления: только у них строковое значение может уйти в лог. */
const ALLOWED_STRING_KEYS: ReadonlySet<string> = new Set([
  'action', 'branch', 'callable', 'code', 'errorKind', 'expectedRevision', 'from', 'kind',
  'mappedTo', 'permanentStage', 'phase', 'previousOwner', 'reason', 'result', 'resultType',
  'source', 'to', 'type',
]);
/** Поля, где значение — вид ошибки: смешанный регистр только из KNOWN_ERROR_NAMES. */
const ERROR_NAME_KEYS: ReadonlySet<string> = new Set(['kind', 'errorKind']);
/** Известные имена классов ошибок; всё прочее нормализуется в `Error`. */
export const KNOWN_ERROR_NAMES: ReadonlySet<string> = new Set([
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError',
  'AggregateError', 'HttpsError', 'FirebaseError', 'FirestoreError', 'AccountLeaseError',
  'AccountAuthorityCallableError', 'InstallationBindingError', 'AbortError', 'TimeoutError',
]);
const TYPEOF_VALUES: ReadonlySet<string> = new Set([
  'undefined', 'object', 'boolean', 'number', 'bigint', 'string', 'symbol', 'function',
]);
/**
 * Имена callable AA. Дублируют константы транспорта (импорт оттуда дал бы
 * цикл модулей); совпадение проверяет сторож account_authority_logging_guard.
 */
export const ACCOUNT_AUTHORITY_CALLABLE_NAMES: ReadonlySet<string> = new Set([
  'accountAuthorityLeaseAcquire',
  'accountAuthorityLeaseRelease',
  'accountAuthorityInstallationBindingCreate',
]);

const FIELD_KEY = /^[A-Za-z][A-Za-z0-9]{0,47}$/;
const LOWER_CODE = /^[a-z0-9_.:-]{1,80}$/;
const OWN_ERROR_CODE = /^account_authority_[a-z0-9_]{1,80}$/;

function hasIdentifierLikeRun(value: string): boolean {
  return value.split(/[^A-Za-z0-9]+/).some((run) => (
    run.length > 32 || (run.length >= 8 && /[0-9]/.test(run))
  ));
}

/** Короткий машинный код: строчные буквы/цифры/`_.:-`, без хвостов идентификаторов. */
export function isAccountAuthoritySafeCode(value: string): boolean {
  return LOWER_CODE.test(value) && !hasIdentifierLikeRun(value);
}

function safeStringValue(key: string, value: string): string {
  if (!ALLOWED_STRING_KEYS.has(key)) return 'redacted';
  if (key === 'callable') return ACCOUNT_AUTHORITY_CALLABLE_NAMES.has(value) ? value : 'redacted';
  if (ERROR_NAME_KEYS.has(key) && KNOWN_ERROR_NAMES.has(value)) return value;
  return isAccountAuthoritySafeCode(value) ? value : 'redacted';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Вид ошибки без текста сообщения: имя класса из KNOWN_ERROR_NAMES (любое
 * другое → `Error`, ревью R1) или значение typeof.
 */
export function accountAuthorityErrorKind(error: unknown): string {
  if (error instanceof Error) return KNOWN_ERROR_NAMES.has(error.name) ? error.name : 'Error';
  const kind = typeof error;
  return TYPEOF_VALUES.has(kind) ? kind : 'unknown';
}

/**
 * Безопасный код ошибки: код callable/Firebase (префикс `functions/` снимается,
 * потому что `/` в коде запрещён), свой `account_authority_*` или `other`.
 * Сырой текст чужой ошибки в лог не попадает никогда.
 */
export function accountAuthorityErrorCode(error: unknown): string {
  const code = isRecord(error) ? error.code : undefined;
  if (typeof code === 'number' && Number.isSafeInteger(code)) return String(code);
  if (typeof code === 'string') {
    const bare = code.startsWith('functions/') ? code.slice('functions/'.length) : code;
    if (isAccountAuthoritySafeCode(bare)) return bare;
  }
  if (error instanceof Error && OWN_ERROR_CODE.test(error.message)) return error.message;
  return 'other';
}

/**
 * Код ошибки провайдера/Firebase для AA-входа: `auth/invalid-credential` →
 * `auth_invalid-credential`. Только короткий машинный код (см. логгер S1),
 * иначе `unknown`. Текст ошибки не читается вовсе.
 */
export function accountAuthorityProviderErrorCode(error: unknown): string {
  const raw = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  if (typeof raw === 'number' && Number.isSafeInteger(raw)) return String(raw);
  if (typeof raw !== 'string' || raw.length === 0) return 'unknown';
  const normalized = raw.toLowerCase().replace(/\//g, '_');
  const safe = accountAuthorityErrorCode({ code: normalized });
  return safe === 'other' ? 'unknown' : safe;
}

/** Строковый код состояния (например, ошибка перехода V2): безопасный код или `other`. */
export function accountAuthoritySafeCode(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'none';
  return isAccountAuthoritySafeCode(value) ? value : 'other';
}

/** Последний рубеж: см. шапку файла. */
export function sanitizeAccountAuthorityLogFields(
  fields: AccountAuthorityLogFields | undefined,
): AccountAuthorityLogFields | undefined {
  if (fields === undefined) return undefined;
  const safe: Record<string, AccountAuthorityLogValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!FIELD_KEY.test(key)) continue;
    safe[key] = typeof value === 'string' ? safeStringValue(key, value) : value;
  }
  return Object.freeze(safe);
}

function line(event: string, fields: AccountAuthorityLogFields | undefined): string {
  const safe = sanitizeAccountAuthorityLogFields(fields);
  const tail = safe === undefined
    ? ''
    : Object.entries(safe).map(([key, value]) => ` ${key}=${String(value)}`).join('');
  return `${ACCOUNT_AUTHORITY_LOG_PREFIX} ${event}${tail}`;
}

/** Реализация по умолчанию: console с префиксом `[ACCOUNT-AUTHORITY]` (зеркалится в metro-console.log). */
export const consoleAccountAuthorityLogger: AccountAuthorityLogger = Object.freeze({
  info: (event: string, fields?: AccountAuthorityLogFields) => {
    console.log(line(event, fields));
  },
  warn: (event: string, fields?: AccountAuthorityLogFields) => {
    console.warn(line(event, fields));
  },
});

/**
 * зачем (AA S1, ревью L3): лог не имеет права ломать то, что он описывает. Сбой
 * внедрённого логгера (бросил исключение) уходит одной строкой в console.warn,
 * а commitState, очередь операций и транспорт продолжают работу как обычно.
 * Поля чистятся до передачи внедрённому логгеру, так что и он не видит ничего
 * сверх кодов.
 */
export function safeAccountAuthorityLogger(
  logger: AccountAuthorityLogger | undefined,
): AccountAuthorityLogger {
  const target = logger ?? consoleAccountAuthorityLogger;
  const call = (level: 'info' | 'warn', event: string, fields?: AccountAuthorityLogFields): void => {
    try {
      target[level](event, sanitizeAccountAuthorityLogFields(fields));
    } catch (error) {
      console.warn(`${ACCOUNT_AUTHORITY_LOG_PREFIX} logger_failed level=${level} kind=${accountAuthorityErrorKind(error)}`);
    }
  };
  return Object.freeze({
    info: (event: string, fields?: AccountAuthorityLogFields) => call('info', event, fields),
    warn: (event: string, fields?: AccountAuthorityLogFields) => call('warn', event, fields),
  });
}

/** Миллисекунды с момента `startedAt` (Date.now), для поля durationMs. */
export function accountAuthorityElapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}
