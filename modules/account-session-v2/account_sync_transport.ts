import type { AccountSyncQuarantineCode } from './account_sync';

/*
 * Account V2 (TG-831C22D22486) — решение клиента по ошибкам транспорта callable.
 *
 * зачем: сервер (functions/src/accounts_v2_adapter/errors.ts) задаёт TEMP-контракт
 * клиента: решение ТОЛЬКО по `details.final`; `unauthenticated` — перелогин;
 * `resource-exhausted` с `retryAfterMs` — ожидание, попытку НЕ тратит; всё прочее
 * (включая голый HTTP 500 / `internal` без details) — повтор с backoff до потолка
 * (И 5 неудач, И сутки с первой — TG-7CD73967EF61), затем ВОЗВРАТНЫЙ карантин пакета. Клиент и сервер живут в разных пакетах, поэтому
 * эталон СКОПИРОВАН, а не импортирован; сторож паритета
 * (functions/src/accounts_v2_envelope_parity.test.ts) сверяет текст этих функций и
 * таблицы с сервером и исполняет копию на общей таблице случаев.
 *
 * ВАЖНО: в этом модуле нет runtime-импортов (только `import type`) — сторож паритета
 * исполняет его после транспиляции без загрузчика модулей.
 */

/** Клиентский потолок попыток одного пакета при повторяемых ответах (TEMP-контракт). */
export const ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS = 5;
/**
 * Потолок уводит пакет в карантин, только если с ПЕРВОЙ неудачи прошли сутки
 * (часы с поправкой на сервер). зачем (TG-7CD73967EF61, P1): 5 неудач с backoff
 * набираются за ~15 с — короткий офлайн навсегда уводил живой пакет в карантин.
 */
export const ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS = 24 * 60 * 60 * 1000;

/** Ровно серверный ACCOUNTS_V2_CLIENT_ERROR_CONTRACT (сверяет сторож паритета). */
export const ACCOUNT_SYNC_CLIENT_ERROR_CONTRACT = Object.freeze({
  decideBy: 'details.final' as const,
  final: Object.freeze(['invalid-argument', 'permission-denied', 'failed-precondition'] as const),
  retryable: Object.freeze(['resource-exhausted', 'unavailable', 'internal'] as const),
  reauth: Object.freeze(['unauthenticated'] as const),
  maxAttempts: ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS,
  retryAfterConsumesAttempt: false as const,
  minFailureSpanMs: ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS,
  attemptsExhaustedRequeue: true as const,
});

export type AccountSyncClientAction = 'quarantine' | 'retry' | 'reauth';

/** true — ответ «подожди retryAfterMs»: resource-exhausted с конечным retryAfterMs > 0. */
export function accountSyncIsWaitResponse(error: Readonly<{ code: string; details?: unknown }>): boolean {
  if (error.code !== 'resource-exhausted') return false;
  const details = error.details;
  if (typeof details !== 'object' || details === null) return false;
  const retryAfterMs = (details as { retryAfterMs?: unknown }).retryAfterMs;
  return typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0;
}

/**
 * Копия эталона сервера accountsV2ClientAction.
 * failedAttempts — сколько раз этот пакет уже получил НЕУДАЧУ, ВКЛЮЧАЯ эту;
 * ответы-ожидания (accountSyncIsWaitResponse) в этот счёт НЕ включаются.
 * failingForMs — сколько прошло с ПЕРВОЙ неудачи пакета (часы с поправкой на
 * сервер); отрицательное (часы назад) потолок не включает.
 */
export function accountSyncClientAction(
  error: Readonly<{ code: string; details?: unknown }>,
  failedAttempts: number,
  failingForMs: number,
): AccountSyncClientAction {
  if (error.code === 'unauthenticated') return 'reauth';
  const details = error.details;
  const final = typeof details === 'object' && details !== null && (details as { final?: unknown }).final === true;
  if (final) return 'quarantine';
  // Ожидание ≠ неудача: пауза retryAfterMs, потолок попыток не трогаем.
  if (accountSyncIsWaitResponse(error)) return 'retry';
  // final отсутствует или false (включая голый internal без details) — повтор до потолка:
  // И ≥ maxAttempts неудач, И ≥ суток с первой (короткий офлайн карантин не даёт).
  return failedAttempts >= ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS
    && failingForMs >= ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS ? 'quarantine' : 'retry';
}

/** Снимок ошибки транспорта: только код и два машинных поля details, без текста. */
export type AccountSyncTransportError = Readonly<{
  code: string;
  details: Readonly<{ final?: boolean; retryAfterMs?: number }> | undefined;
}>;

/** Учёт неудач пакета: число неудач и время первой (часы с поправкой на сервер). */
export type AccountSyncAttemptLedger = Readonly<{
  failedAttempts: number;
  firstFailureAtMs: number | null;
}>;

export type AccountSyncTransportDecision = Readonly<{
  action: 'reauth' | 'wait' | 'retry' | 'quarantine';
  /** Неудачи пакета ПОСЛЕ этого ответа (ожидание и перелогин их не увеличивают). */
  failedAttempts: number;
  /** Время первой неудачи ПОСЛЕ этого ответа; null — неудач ещё не было. */
  firstFailureAtMs: number | null;
  /** Сколько ждать до следующей отправки; 0 для reauth/quarantine. */
  delayMs: number;
  quarantineCode: AccountSyncQuarantineCode | null;
  errorCode: string;
}>;

export const ACCOUNT_SYNC_BACKOFF_BASE_MS = 1_000;
/**
 * Верх backoff. зачем (TG-7CD73967EF61): до карантина теперь ≥ суток; при
 * верхе 60 с упрямый пакет стучал бы в сервер ~1440 раз в сутки, при 15 мин —
 * ~100 (первые 5 неудач по-прежнему 1, 2, 4, 8, 16 с — короткий офлайн догоняет быстро).
 */
export const ACCOUNT_SYNC_BACKOFF_MAX_MS = 15 * 60_000;
/**
 * Пауза перед первой отправкой пакета, возвращённого из карантина (requeue).
 * зачем: пакет уже сутки получал отказы; сразу бить в сервер снова бессмысленно.
 */
export const ACCOUNT_SYNC_REQUEUE_DELAY_MS = 60 * 60 * 1000;
/** Добавка к retryAfterMs, чтобы телефоны не били в сервер в одну миллисекунду. */
const WAIT_JITTER_MAX_MS = 1_000;
const FUNCTIONS_PREFIX = 'functions/';

function ownDataValue(target: object, key: string): unknown {
  // зачем: читаем только собственное data-свойство — геттер ошибки не вызывается никогда.
  const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
}

function unitRandom(random: () => number): number {
  const value = random();
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999) : 0;
}

/**
 * Любая брошенная транспортом ошибка → { code, details }. Код без префикса
 * `functions/` (клиентский FirebaseError). Непонятная ошибка = голый `internal`
 * без details — по контракту повторяемая.
 */
export function snapshotAccountSyncTransportError(error: unknown): AccountSyncTransportError {
  const bare: AccountSyncTransportError = Object.freeze({ code: 'internal', details: undefined });
  try {
    if (typeof error !== 'object' || error === null) return bare;
    const rawCode = ownDataValue(error, 'code');
    if (typeof rawCode !== 'string' || rawCode.length === 0) return bare;
    const code = rawCode.startsWith(FUNCTIONS_PREFIX) ? rawCode.slice(FUNCTIONS_PREFIX.length) : rawCode;
    const rawDetails = ownDataValue(error, 'details');
    if (typeof rawDetails !== 'object' || rawDetails === null) return Object.freeze({ code, details: undefined });
    const final = ownDataValue(rawDetails, 'final');
    const retryAfterMs = ownDataValue(rawDetails, 'retryAfterMs');
    const details = Object.freeze({
      ...(typeof final === 'boolean' ? { final } : {}),
      ...(typeof retryAfterMs === 'number' ? { retryAfterMs } : {}),
    });
    return Object.freeze({ code, details });
  } catch (trap) {
    // зачем: Proxy-ловушка в ошибке не должна ронять раннер; считаем голым 500.
    console.warn('[ACCOUNTS-V2-CLIENT] transport_error_unreadable',
      trap instanceof Error ? trap.name : typeof trap);
    return bare;
  }
}

/** Экспоненциальный backoff с jitter: попытка n → [cap/2, cap), cap = min(MAX, BASE·2^(n−1)). */
export function accountSyncBackoffMs(failedAttempts: number, random: () => number): number {
  const exponent = Math.min(Math.max(failedAttempts, 1) - 1, 16);
  const cap = Math.min(ACCOUNT_SYNC_BACKOFF_MAX_MS, ACCOUNT_SYNC_BACKOFF_BASE_MS * 2 ** exponent);
  const half = Math.floor(cap / 2);
  return half + Math.floor(unitRandom(random) * (cap - half));
}

/** Учёт после ещё одной засчитанной неудачи; первая неудача запускает отсчёт суток. */
function countFailure(ledger: AccountSyncAttemptLedger, serverNowMs: number): AccountSyncAttemptLedger {
  return Object.freeze({
    failedAttempts: ledger.failedAttempts + 1,
    firstFailureAtMs: ledger.firstFailureAtMs ?? serverNowMs,
  });
}

/**
 * Решение по неудачной отправке пакета. ledger — учёт ДО этого ответа,
 * serverNowMs — часы телефона с поправкой на сервер.
 * Порядок как у эталона: перелогин → final → ожидание → потолок (И попытки, И сутки).
 */
export function decideAccountSyncTransportFailure(
  error: AccountSyncTransportError,
  ledger: AccountSyncAttemptLedger,
  serverNowMs: number,
  random: () => number,
): AccountSyncTransportDecision {
  const wait = accountSyncIsWaitResponse(error);
  const reauth = error.code === 'unauthenticated';
  const next = wait || reauth ? ledger : countFailure(ledger, serverNowMs);
  const failedAttempts = next.failedAttempts;
  const failingForMs = next.firstFailureAtMs === null ? 0 : serverNowMs - next.firstFailureAtMs;
  const action = accountSyncClientAction(error, failedAttempts, failingForMs);
  const base = { failedAttempts, firstFailureAtMs: next.firstFailureAtMs, errorCode: error.code };
  if (action === 'reauth') {
    return Object.freeze({ ...base, action: 'reauth' as const, delayMs: 0, quarantineCode: null });
  }
  if (action === 'quarantine') {
    const final = error.details?.final === true;
    return Object.freeze({ ...base, action: 'quarantine' as const, delayMs: 0,
      quarantineCode: final ? 'sync_dispatch_final' as const : 'sync_dispatch_attempts_exhausted' as const });
  }
  if (wait) {
    // зачем: ждать НЕ МЕНЬШЕ retryAfterMs — иначе повтор опять упрётся в блок сервера.
    const retryAfterMs = Math.ceil(error.details?.retryAfterMs ?? 0);
    const jitter = Math.floor(unitRandom(random) * Math.min(WAIT_JITTER_MAX_MS, retryAfterMs));
    return Object.freeze({ ...base, action: 'wait' as const, delayMs: retryAfterMs + jitter, quarantineCode: null });
  }
  return Object.freeze({ ...base, action: 'retry' as const,
    delayMs: accountSyncBackoffMs(failedAttempts, random), quarantineCode: null });
}

/**
 * Квитанции ответа не прошли проверку (`sync_receipt_invalid`).
 * зачем (TG-7CD73967EF61, P2): раньше это был немедленный повтор без backoff и
 * без потолка — вечная карусель запросов. Теперь это засчитанная неудача с тем же
 * потолком (И попытки, И сутки) и СВОИМ кодом карантина.
 */
export function decideAccountSyncReceiptFailure(
  ledger: AccountSyncAttemptLedger,
  serverNowMs: number,
  random: () => number,
): AccountSyncTransportDecision {
  const next = countFailure(ledger, serverNowMs);
  const failingForMs = serverNowMs - (next.firstFailureAtMs ?? serverNowMs);
  const base = {
    failedAttempts: next.failedAttempts, firstFailureAtMs: next.firstFailureAtMs, errorCode: 'sync_receipt_invalid',
  };
  if (next.failedAttempts >= ACCOUNT_SYNC_CLIENT_MAX_ATTEMPTS && failingForMs >= ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS) {
    return Object.freeze({ ...base, action: 'quarantine' as const, delayMs: 0,
      quarantineCode: 'sync_receipt_invalid_exhausted' as const });
  }
  return Object.freeze({ ...base, action: 'retry' as const,
    delayMs: accountSyncBackoffMs(next.failedAttempts, random), quarantineCode: null });
}
