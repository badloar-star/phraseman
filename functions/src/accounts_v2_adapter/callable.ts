import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  AccountsV2ApplyError,
  resolveCallerUid,
  validateClientBatch,
  type AccountsV2Receipt,
} from '../accounts_v2_apply_core';
import {
  accountsV2MetaPath,
  accountsV2UidPathSafe,
  applyBatchInFirestore,
  type AccountsV2GuardDecision,
  type AccountsV2TxGuard,
} from './firestore_port';
import { HOT_CALLABLE_OPTIONS } from '../callable_options';
import { assertAuthAccountUsableForCallable } from '../account_gate';
import { accountsV2FlagsReader, type AccountsV2FlagsReader } from '../accounts_v2_flags';
import { ACCOUNTS_V2_CLIENT_TOO_OLD, accountsV2ClientTooOld, splitClientVersion } from '../accounts_v2_client_version';
import {
  AccountsV2RateLimited,
  finalError,
  isFinalHttpsError,
  mapAccountsV2Error,
  rateLimitedError,
  reauthError,
  retryableError,
} from './errors';

export {
  ACCOUNTS_V2_CLIENT_ERROR_CONTRACT,
  ACCOUNTS_V2_CLIENT_MAX_ATTEMPTS,
  accountsV2ClientAction,
  accountsV2IsWaitResponse,
  type AccountsV2ClientAction,
} from './errors';

/*
 * Account V2, Пакет 3A-srv (TG-AEB4A011B5CF) — callable применения пакета синхронизации.
 * Ремонт №1 (TG-A09A44FE758E): лимит частоты ограничивает СТОИМОСТЬ, коды
 * ошибок делятся на окончательные и повторяемые.
 *
 * зачем: тонкая граница между клиентским outbox и ядром 3S:
 *   auth → resolveCallerUid → uid пригоден для пути → кэш блока инстанса →
 *   validateClientBatch → «все ownerUid = uid» →
 *   одна транзакция (tx.get счётчика → decide → getAll плана → applyBatch → записи) →
 *   `{ receipts, serverNowMs }`.
 * Пакет 6A: `accountsV2SyncApply` экспортирован из index.ts, но закрыт серверным
 *   флагом config/accounts_v2.syncEnabled (выкл по умолчанию). Включает только
 *   владелец — после клиентского пакета 6B (исходы conflict/rejected,
 *   TEMP-контракт (а)–(д) ядра) и проверки на трёх аккаунтах.
 * App Check запломбирован владельцем (2026-08-17): опции — HOT_CALLABLE_OPTIONS
 *   проекта (enforceAppCheck = ENFORCE_APP_CHECK = false).
 *
 * Ошибки уходят клиенту только кодами (HttpsError code + машинный код в
 * message/details), без путей, id и содержимого. Логи — префикс [ACCOUNTS-V2],
 * uid — только усечённым sha256.
 *
 * TEMP-контракт клиента (outbox). Ремонт №2 (TG-6ACFDD4A9F0F): решение — по
 * `details.final`, а НЕ по коду (классификация — errors.ts):
 *
 *   ответ                                  | действие клиента
 *   ---------------------------------------+------------------------------------------------
 *   details.final === true                 | пакет в карантин сразу (тот же пакет — тот же
 *     invalid-argument  (форма пакета)     |   отказ навсегда). Сервер ставит метку ТОЛЬКО на
 *     permission-denied (чужой ownerUid)   |   свои детерминированные отказы: коды ядра,
 *     failed-precondition {code}           |   коды адаптера accounts_v2_*, uid не для пути,
 *                                          |   Firestore INVALID_ARGUMENT(3).
 *   unauthenticated                        | обновить вход и повторить; НЕ карантин.
 *   resource-exhausted {retryAfterMs}      | повтор НЕ раньше retryAfterMs, затем backoff
 *                                          |   (лимит частоты, квота Firestore, серия неудач).
 *                                          |   Это ОЖИДАНИЕ: потолок попыток НЕ расходует.
 *   final отсутствует или false — ЛЮБОЙ    | повтор с экспоненциальным backoff + jitter.
 *     код, включая голый HTTP 500 /        |   Клиентский потолок: И ≥5 неудачных попыток
 *     `internal` без details (таймаут/OOM  |   одного пакета, И ≥24 ч с первой неудачи →
 *     функции), unavailable 'retryable'    |   карантин, и он ВОЗВРАТНЫЙ (requeue)
 *     (gRPC 13/2/1/10/14/4/9, gRPC 3       |   (ACCOUNTS_V2_CLIENT_MAX_ATTEMPTS,
 *     «transaction has expired», без кода, |   ACCOUNTS_V2_CLIENT_MIN_FAILURE_SPAN_MS,
 *     accounts_v2_getall_mismatch)         |   requeueQuarantineCodes).
 *
 * Эталон решения клиента — accountsV2ClientAction (errors.ts).
 * «Окончательный» значит: тот же пакет получит тот же ответ; повтор без
 * изменения пакета только тратит лимит. Карантин не удаляет операции молча —
 * это решение клиентского пакета (показ/диагностика).
 *
 * TEMP-заметки (ремонт №2):
 *  - кэш блока живёт в памяти инстанса: ручной сброс документа `rate` в
 *    Firestore НЕ снимает блок на тёплых инстансах — до истечения блока
 *    (суточный — до 24 ч) или до перезапуска инстанса;
 *  - клиент обязан склеивать отправки: не чаще раза в N секунд и/или в конце
 *    урока, до 50 операций в пакете — лимит частоты рассчитан на это;
 *  - тег uid в логах — НЕсолёный усечённый sha256 (перебор известных uid его
 *    раскрывает); позже заменить на HMAC с секретом.
 *
 * TEMP-заметки (ремонт №3, TG-9CA66AD34ABC):
 *  - resource-exhausted с retryAfterMs — ожидание, клиентский потолок попыток
 *    НЕ расходует (errors.ts, accountsV2IsWaitResponse);
 *  - ПОТОЛОК ОБХОДА. Неудачи, откатившие транзакцию (повторяемые и
 *    окончательные с откатом), счётчик частоты НЕ увеличивают, а блок серии
 *    неудач живёт в памяти ОДНОГО инстанса. При намеренно вызываемых сбоях
 *    один uid, попадая на разные инстансы, получает до
 *    ≈ 80 инстансов × 5 вызовов за ~30 с ≈ 800 вызовов/мин
 *    (каждый — 1 чтение счётчика + чтения плана до сбоя). План: суточный учёт
 *    неудач в документе `rate` ОТДЕЛЬНОЙ записью вне транзакции (переживает
 *    откат и общий для всех инстансов), с тем же суточным потолком.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Лимит частоты вызовов на uid: два фиксированных окна (минута и сутки) в ОДНОМ
 * документе-счётчике `accounts_v2/{uid}/accounts_v2_meta/rate`, который
 * транзакция читает ПЕРВЫМ отдельным tx.get.
 *
 * зачем документ, а не только память инстанса: у HOT_CALLABLE_OPTIONS до 80
 * инстансов, счётчик в памяти каждый ведёт отдельно — лимит был бы ×80.
 * зачем кэш блока в памяти ВДОБАВОК: повторный отказ на том же инстансе не
 * стоит ни одного чтения (до обращения к Firestore). Первый отказ на
 * инстансе — одно чтение (+ одна запись blockedUntilMs, если блок новый).
 *
 * Минутное окно: 20 вызовов × 50 операций = до 1000 операций в минуту на
 * разгрузку outbox после офлайна.
 * Суточный предел 600 вызовов: это 30 000 операций в сутки — на порядки больше
 * живого человека (урок даёт десятки операций), и 30 минут непрерывной
 * разгрузки на полной минутной скорости. Зато потолок стоимости одного
 * зацикленного uid в сутки: 600 × (1 + 100) ≈ 60 600 чтений и ≈ 60 600 записей
 * в худшем пакете — против ≈ 2,9 млн чтений при одном минутном окне
 * (20 × 1440 вызовов). Отказы сверх этого: ≤ 1 чтение на инстанс за окно блока.
 * TEMP: сверить обе величины с частотой выгрузки outbox клиентского пакета.
 */
export const ACCOUNTS_V2_RATE_LIMIT = Object.freeze({
  windowMs: 60_000,
  maxCalls: 20,
  dayMs: DAY_MS,
  maxCallsPerDay: 600,
});

export type AccountsV2RateLimit = Readonly<{ windowMs: number; maxCalls: number; dayMs: number; maxCallsPerDay: number }>;

/**
 * Учёт повторяемых неудач в памяти инстанса (P3).
 *
 * зачем: повторяемый сбой (13/4/10/14/…) откатывает транзакцию ЦЕЛИКОМ — вместе
 * с записью счётчика частоты. Детерминированно падающий «повторяемый» пакет
 * (например, стабильный DEADLINE_EXCEEDED на тяжёлом пакете) крутился бы
 * бесплатно для лимита, но не для счёта (чтения до сбоя оплачены). После
 * maxConsecutive повторяемых сбоев одного uid подряд (без успеха между ними)
 * в пределах windowMs — блок на blockMs в кэше блоков: дальнейшие вызовы на
 * этом инстансе стоят ноль чтений. K = 5 совпадает с клиентским потолком
 * попыток одного пакета; блок 30 с короче минутного окна лимита — живой
 * человек при сбое Firestore теряет не больше полуминуты.
 * Ремонт №3: серию копят ВСЕ неудачи, не оплаченные записью счётчика, — и
 * окончательные с откатом транзакции (gRPC 3, коды адаптера): клиент,
 * игнорирующий final, иначе крутил бы их бесплатно. Серию не копят только
 * ошибки ядра (AccountsV2ApplyError): адаптер коммитит на них счётчик.
 * Окончательный ответ при этом остаётся окончательным; блок — в кэше.
 */
export const ACCOUNTS_V2_FAILURE_LIMIT = Object.freeze({
  maxConsecutive: 5,
  windowMs: 60_000,
  blockMs: 30_000,
});

export type AccountsV2FailureLimit = Readonly<{ maxConsecutive: number; windowMs: number; blockMs: number }>;
export type AccountsV2FailureRecord = Readonly<{ count: number; firstMs: number }>;

/** Потолок каждого кэша инстанса (блоки, серии неудач): память ограничена даже при потоке разных uid. */
export const ACCOUNTS_V2_BLOCK_CACHE_MAX = 10_000;

export type AccountsV2SyncResponse = Readonly<{
  receipts: readonly AccountsV2Receipt[];
  /** Тот же nowMs, что ушёл в applyBatch (TEMP-контракт (в) ядра). */
  serverNowMs: number;
}>;

export type AccountsV2SyncRequest = Readonly<{ auth?: Readonly<{ uid?: string }> | null; data: unknown }>;

/**
 * Память инстанса (тесты дают свою):
 * blockCache — uid → blockedUntilMs; failureCache — uid → серия повторяемых неудач;
 * cacheMax — потолок каждого из двух кэшей (тест вытеснения даёт маленький).
 */
export type AccountsV2SyncDeps = Readonly<{
  nowMs: () => number;
  rate: AccountsV2RateLimit;
  blockCache: Map<string, number>;
  failure: AccountsV2FailureLimit;
  failureCache: Map<string, AccountsV2FailureRecord>;
  cacheMax: number;
}>;

const DEFAULT_DEPS: AccountsV2SyncDeps = Object.freeze({
  nowMs: () => Date.now(),
  rate: ACCOUNTS_V2_RATE_LIMIT,
  blockCache: new Map<string, number>(),
  failure: ACCOUNTS_V2_FAILURE_LIMIT,
  failureCache: new Map<string, AccountsV2FailureRecord>(),
  cacheMax: ACCOUNTS_V2_BLOCK_CACHE_MAX,
});

export function accountsV2RatePath(uid: string): string {
  return accountsV2MetaPath(uid, 'rate');
}

/** uid в логах — только первые 12 hex sha256: связывает строки одного вызова, не раскрывая личность. */
function uidTag(uid: string): string {
  return createHash('sha256').update(uid).digest('hex').slice(0, 12);
}

type RateWindow = Readonly<{ startMs: number; count: number }>;
type RateState = Readonly<{ minute: RateWindow; day: RateWindow; blockedUntilMs: number }>;

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function readRateState(stored: Readonly<Record<string, unknown>> | null, tag: string): RateState | null {
  if (stored === null) return null;
  const { windowStartMs, count, dayStartMs, dayCount, blockedUntilMs } = stored;
  if (!Number.isSafeInteger(windowStartMs) || !isCount(count) || !Number.isSafeInteger(dayStartMs) || !isCount(dayCount)) {
    // Испорченный счётчик не должен запирать человека навсегда — начинаем новые окна.
    console.warn(`[ACCOUNTS-V2] rate_doc_invalid uid=${tag} -> new window`);
    return null;
  }
  return {
    minute: { startMs: windowStartMs as number, count },
    day: { startMs: dayStartMs as number, count: dayCount },
    blockedUntilMs: Number.isSafeInteger(blockedUntilMs) ? blockedUntilMs as number : 0,
  };
}

/**
 * Текущее окно. age < 0 (часы этого инстанса отстают от записавшего) — ТО ЖЕ
 * окно: иначе сдвиг часов между инстансами обнулял бы счётчик. Окно «из
 * будущего» дальше собственной длины — не сдвиг часов, а порча: новое окно,
 * чтобы не запереть человека до далёкой даты.
 */
function currentWindow(stored: RateWindow | null, nowMs: number, lengthMs: number, tag: string, kind: string): RateWindow {
  if (stored === null) return { startMs: nowMs, count: 0 };
  const age = nowMs - stored.startMs;
  if (age >= lengthMs) return { startMs: nowMs, count: 0 };
  if (age < -lengthMs) {
    console.warn(`[ACCOUNTS-V2] rate_window_future uid=${tag} kind=${kind} ageMs=${age} -> new window`);
    return { startMs: nowMs, count: 0 };
  }
  return stored;
}

function rateDoc(minute: RateWindow, day: RateWindow, blockedUntilMs: number): Readonly<Record<string, number>> {
  return {
    windowStartMs: minute.startMs,
    count: minute.count,
    dayStartMs: day.startMs,
    dayCount: day.count,
    blockedUntilMs,
  };
}

export function decideAccountsV2Rate(
  stored: Readonly<Record<string, unknown>> | null,
  nowMs: number,
  rate: AccountsV2RateLimit,
  tag: string,
): AccountsV2GuardDecision {
  const current = readRateState(stored, tag);
  const minute = currentWindow(current?.minute ?? null, nowMs, rate.windowMs, tag, 'minute');
  const day = currentWindow(current?.day ?? null, nowMs, rate.dayMs, tag, 'day');
  const minuteFull = minute.count >= rate.maxCalls;
  const dayFull = day.count >= rate.maxCallsPerDay;
  if (minuteFull || dayFull) {
    const blockedUntilMs = Math.max(minuteFull ? minute.startMs + rate.windowMs : 0, dayFull ? day.startMs + rate.dayMs : 0);
    // Блок уже записан тем же значением — отказ не пишет ничего (только 1 чтение).
    const known = current !== null && current.blockedUntilMs === blockedUntilMs;
    console.warn(`[ACCOUNTS-V2] rate_limited uid=${tag} count=${minute.count} dayCount=${day.count} `
      + `window=${minuteFull ? 'minute' : 'day'} blockedForMs=${blockedUntilMs - nowMs} write=${known ? 'none' : 'block'}`);
    return {
      allowed: false,
      write: known ? null : rateDoc(minute, day, blockedUntilMs),
      error: new AccountsV2RateLimited(blockedUntilMs),
    };
  }
  return {
    allowed: true,
    write: rateDoc({ ...minute, count: minute.count + 1 }, { ...day, count: day.count + 1 }, 0),
  };
}

function rateGuard(uid: string, tag: string, nowMs: number, rate: AccountsV2RateLimit): AccountsV2TxGuard {
  return { path: accountsV2RatePath(uid), decide: (stored) => decideAccountsV2Rate(stored, nowMs, rate, tag) };
}

/** Действующий блок из памяти инстанса (0 чтений) или null; истёкший — удаляется. */
function cachedBlock(cache: Map<string, number>, uid: string, nowMs: number): number | null {
  const until = cache.get(uid);
  if (until === undefined) return null;
  if (nowMs < until) return until;
  cache.delete(uid);
  return null;
}

/**
 * Запись в ограниченный кэш: сперва чистим протухшие, затем (если всё ещё полон)
 * вытесняем самую старую запись с warn — худший исход вытеснения блока —
 * одно лишнее чтение, серии неудач — серия начнётся заново.
 */
function boundedSet<V>(
  cache: Map<string, V>, key: string, value: V, max: number, expired: (value: V) => boolean, kind: string,
): void {
  if (cache.size >= max && !cache.has(key)) {
    for (const [other, stored] of cache) if (expired(stored)) cache.delete(other); // guard-ok: Map в памяти
  }
  if (cache.size >= max && !cache.has(key)) {
    const oldest = cache.keys().next();
    console.warn(`[ACCOUNTS-V2] cache_evict kind=${kind} size=${cache.size} max=${max}`);
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, value); // guard-ok: Map в памяти
}

function rememberBlock(deps: AccountsV2SyncDeps, uid: string, until: number, nowMs: number): void {
  boundedSet(deps.blockCache, uid, until, deps.cacheMax, (stored) => stored <= nowMs, 'block');
}

/**
 * Учитывает неудачу uid, НЕ оплаченную записью счётчика частоты (повторяемую
 * или окончательную с откатом транзакции). Возвращает blockedUntilMs, если серия
 * достигла порога (блок уже в кэше), иначе null.
 */
function noteUnpaidFailure(
  deps: AccountsV2SyncDeps, uid: string, tag: string, nowMs: number, kind: 'final' | 'retryable',
): number | null {
  const { maxConsecutive, windowMs, blockMs } = deps.failure;
  const previous = deps.failureCache.get(uid);
  const next: AccountsV2FailureRecord =
    previous === undefined || nowMs - previous.firstMs >= windowMs || nowMs < previous.firstMs
      ? { count: 1, firstMs: nowMs }
      : { count: previous.count + 1, firstMs: previous.firstMs };
  if (next.count >= maxConsecutive) {
    deps.failureCache.delete(uid);
    const until = nowMs + blockMs;
    rememberBlock(deps, uid, until, nowMs);
    console.warn(`[ACCOUNTS-V2] failure_backoff uid=${tag} class=${kind} failures=${next.count} blockMs=${blockMs}`);
    return until;
  }
  boundedSet(deps.failureCache, uid, next, deps.cacheMax, (stored) => nowMs - stored.firstMs >= windowMs, 'failure');
  console.warn(`[ACCOUNTS-V2] unpaid_failure uid=${tag} class=${kind} failures=${next.count} of=${maxConsecutive}`);
  return null;
}

/**
 * Ответ на сбой: отказ лимита → кэш блока; ошибка ядра → как есть (оплачена
 * записью счётчика); всё остальное (повторяемое И окончательное с откатом
 * транзакции) → серия неудач, которая может стать блоком.
 */
function failedResponse(
  deps: AccountsV2SyncDeps, error: unknown, uid: string, tag: string, ops: number, nowMs: number,
): HttpsError {
  const limited = error instanceof AccountsV2RateLimited;
  if (limited) rememberBlock(deps, uid, error.blockedUntilMs, nowMs);
  // Ошибку ядра адаптер ловит ВНУТРИ транзакции и коммитит счётчик (firestore_port.ts) — попытка оплачена.
  const paidByCounter = error instanceof AccountsV2ApplyError;
  const mapped = mapAccountsV2Error(error, tag, nowMs, deps.rate.windowMs);
  const final = isFinalHttpsError(mapped);
  console.warn(`[ACCOUNTS-V2] sync failed uid=${tag} ops=${ops} code=${mapped.code} reason=${mapped.message} `
    + `final=${final} paid=${paidByCounter}`);
  if (limited || paidByCounter || mapped.code === 'unauthenticated') return mapped;
  // зачем (ремонт №3): окончательный отказ с откатом (gRPC 3, коды адаптера) тоже не
  // оплачен счётчиком — клиент, игнорирующий final, иначе крутил бы его бесплатно.
  const blockedUntil = noteUnpaidFailure(deps, uid, tag, nowMs, final ? 'final' : 'retryable');
  // Окончательный ответ остаётся окончательным (тот же пакет — тот же ответ); блок уже в кэше.
  if (final || blockedUntil === null) return mapped;
  return rateLimitedError(blockedUntil - nowMs, 'failure_backoff');
}

function summarize(receipts: readonly AccountsV2Receipt[]): string {
  const counts = new Map<string, number>();
  for (const { outcome } of receipts) counts.set(outcome, (counts.get(outcome) ?? 0) + 1); // guard-ok: Map в памяти
  return [...counts].map(([outcome, count]) => `${outcome}:${count}`).join(',');
}

/** Логика callable без firebase-functions — её гоняют тесты на фейковом Firestore. */
export async function handleAccountsV2Sync(
  db: Firestore,
  request: AccountsV2SyncRequest,
  deps: AccountsV2SyncDeps = DEFAULT_DEPS,
): Promise<AccountsV2SyncResponse> {
  const startedAt = Date.now();
  const caller = resolveCallerUid(request.auth ?? null);
  if (!caller.ok) {
    console.warn(`[ACCOUNTS-V2] reject reason=${caller.code} auth=${request.auth ? 'present' : 'missing'}`);
    throw reauthError();
  }
  const { uid } = caller;
  const tag = uidTag(uid);
  if (!accountsV2UidPathSafe(uid)) {
    // Custom token с uid вроде `a/b` или `__x__`: путь не построить — окончательный отказ до лимита.
    console.warn(`[ACCOUNTS-V2] reject reason=uid_not_path_safe uid=${tag}`);
    throw finalError('failed-precondition', 'uid_not_path_safe');
  }
  // nowMs фиксируется ДО транзакции: retry Firestore видит то же время -> тот же результат.
  const nowMs = deps.nowMs();
  const blockedUntil = cachedBlock(deps.blockCache, uid, nowMs);
  if (blockedUntil !== null) {
    // Повторный отказ на этом инстансе: ноль чтений, пакет даже не разбираем.
    console.warn(`[ACCOUNTS-V2] rate_limited_cached uid=${tag} retryAfterMs=${blockedUntil - nowMs}`);
    throw rateLimitedError(blockedUntil - nowMs);
  }
  // зачем (TG-DFA918464DFA): пакет клиента обязан нести оценку времени постановки
  // каждой операции — по ней ядро отказывает старым (> 170 сут) и «будущим».
  const validated = validateClientBatch(request.data);
  if (!validated.ok) {
    // path не логируем: он может содержать имена полей payload пользователя.
    console.warn(`[ACCOUNTS-V2] reject reason=invalid_batch code=${validated.code} uid=${tag}`);
    throw finalError('invalid-argument', validated.code);
  }
  const { batch } = validated;
  const ops = batch.operations.length;
  console.info(`[ACCOUNTS-V2] sync start uid=${tag} ops=${ops}`);
  // uid из пакета полномочий не даёт: чужой ownerUid — отказ до любого чтения Firestore.
  const foreign = batch.operations.filter(({ ownerUid }) => ownerUid !== uid).length;
  if (foreign > 0) {
    console.warn(`[ACCOUNTS-V2] reject reason=uid_mismatch uid=${tag} ops=${ops} foreign=${foreign}`);
    throw finalError('permission-denied', 'uid_mismatch');
  }
  try {
    const receipts = await applyBatchInFirestore(db, uid, batch, nowMs, rateGuard(uid, tag, nowMs, deps.rate));
    // Успех обрывает серию повторяемых неудач.
    deps.failureCache.delete(uid);
    console.info(`[ACCOUNTS-V2] sync done uid=${tag} ops=${ops} outcomes=${summarize(receipts)} ms=${Date.now() - startedAt}`);
    return { receipts, serverNowMs: nowMs };
  } catch (error) {
    throw failedResponse(deps, error, uid, tag, ops, nowMs);
  }
}

/**
 * Пакет 6A (TG-29D525D1B798): ворота серверного флага `config/accounts_v2.syncEnabled`.
 *
 * зачем: callable экспортируется из index.ts, но деплой ничего не меняет, пока
 * владелец не включит флаг. Проверка — ПЕРВЫМ шагом, до auth и разбора пакета:
 * выключено → окончательный failed-precondition `accounts_v2_disabled`, ноль
 * чтений/записей данных (сам флаг — один документ, кэш инстанса ≤ 5 мин).
 * Сбой чтения флага → повторяемая ошибка (не «выкл» молча и не «вкл» вслепую).
 * TEMP-контракт для Пакета 6B: клиент обязан отличать код `accounts_v2_disabled`
 * от прочих окончательных отказов и НЕ класть пакет в карантин — просто не слать
 * до следующего входа (сервер выключен целиком, а не отверг этот пакет).
 */
export async function handleAccountsV2SyncGated(
  db: Firestore,
  request: AccountsV2SyncRequest,
  flags: AccountsV2FlagsReader,
  deps: AccountsV2SyncDeps = DEFAULT_DEPS,
  /**
   * зачем (сверка Ревизора 25.10, вариант Б 713677ddd): в 14-дневной отсрочке удаления вход жив — синк не должен писать прогресс
   * удаляемому аккаунту. Шлюз ПОСЛЕ ворот флага и версии (выключено → по-прежнему 0 чтений). Боевая обёртка передаёт
   * assertAuthAccountUsableForCallable; по умолчанию — без шлюза (тесты на фейковом Firestore считают точное число чтений).
   */
  assertAccountUsable: (db: Firestore, authUid: string) => Promise<void> = async () => undefined,
): Promise<AccountsV2SyncResponse> {
  const read = await flags.read();
  if (!read.ok) {
    console.warn('[ACCOUNTS-V2] reject reason=flag_unavailable reads=0');
    throw retryableError();
  }
  if (!read.flags.syncEnabled) {
    console.warn(`[ACCOUNTS-V2] reject reason=accounts_v2_disabled auth=${request.auth ? 'present' : 'missing'} reads=0`);
    throw finalError('failed-precondition', 'accounts_v2_disabled');
  }
  // зачем (8F, PM-235 T2): клиент ниже минимума — окончательный отказ до разбора пакета, 0 чтений.
  const version = splitClientVersion(request.data);
  if (accountsV2ClientTooOld(read.flags.minClientVersion, version.clientVersion)) {
    console.warn(`[ACCOUNTS-V2] reject reason=client_too_old client=${version.clientVersion} min=${read.flags.minClientVersion} reads=0`);
    throw finalError('failed-precondition', ACCOUNTS_V2_CLIENT_TOO_OLD);
  }
  // нет uid — шлюз не нужен: handleAccountsV2Sync сам откажет reauth
  const callerUid = typeof request.auth?.uid === 'string' ? request.auth.uid : '';
  if (callerUid) await assertAccountUsable(db, callerUid);
  return handleAccountsV2Sync(db, { ...request, data: version.data }, deps);
}

/**
 * Callable. Экспортируется из index.ts (Пакет 6A), но выключена флагом
 * `config/accounts_v2.syncEnabled` (по умолчанию выкл) — см. handleAccountsV2SyncGated.
 */
export const accountsV2SyncApply = onCall(HOT_CALLABLE_OPTIONS, (request) => {
  const db = admin.firestore();
  return handleAccountsV2SyncGated(
    db, { auth: request.auth ?? null, data: request.data }, accountsV2FlagsReader(db), DEFAULT_DEPS,
    (gateDb, authUid) => assertAuthAccountUsableForCallable(gateDb, authUid, 'accountsV2SyncApply'),
  );
});
