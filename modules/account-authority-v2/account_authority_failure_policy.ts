/*
 * Account Authority 2.0, этап S2b: политика отказов, повторов и продлений.
 *
 * зачем (S2b-R1…R5, security-ревью S2a раунд 5): сервер S2a различает
 * окончательные отказы (привязка, удаление, личность, провайдер) и временный
 * сбой (`unavailable`). Клиент обязан:
 *   - окончательный отказ НЕ повторять (иначе цикл и лишние транзакции 8–12 чтений);
 *   - временный сбой повторять с нарастающей паузой;
 *   - повтор после потерянного ответа слать с тем же operationId и тем же
 *     expectedRevision; начальный вход (expectedRevision null) повторять сам
 *     только в пределах ~50 минут (квитанция живёт 60);
 *   - продлевать аренду только на холодном старте и при возврате из фона, не
 *     чаще раза в 5 минут.
 *
 * Модуль чистый: ни сети, ни хранилища, ни часов по умолчанию внутри решений —
 * время и случайность передаются снаружи, поэтому всё проверяется тестами.
 *
 * Отказы контракта аренды приходят сообщением `account_authority_request_rejected`
 * с точным кодом в `details.leaseCode` (S2b раунд 2, сервер — callable_boundary.ts).
 * Старый сервер кода не даёт (leaseCode null) — транспорт тогда применяет прежнюю
 * грубую трактовку и пишет лог `lease_code_missing`.
 */

export type AccountAuthorityFinalReason =
  | 'binding_missing'
  | 'binding_mismatch'
  | 'deletion_pending'
  | 'identity_unresolved'
  | 'provider_rejected'
  | 'anonymous_rejected'
  | 'disabled'
  | 'request_invalid'
  | 'server_error'
  | 'local_failure'
  | 'unknown';

export type AccountAuthorityFailureClass =
  | Readonly<{ kind: 'retryable'; reason: 'unavailable' | 'network' | 'throttled' }>
  | Readonly<{ kind: 'final'; reason: AccountAuthorityFinalReason; resetBinding: boolean }>
  /** leaseCode — точный код контракта из details сервера; null — старый сервер без кода. */
  | Readonly<{ kind: 'contract_rejected'; leaseCode: string | null }>
  | Readonly<{ kind: 'unauthenticated' }>;

/** Публичные сообщения сервера S2a → окончательная причина. */
const FINAL_MESSAGES: ReadonlyMap<string, Readonly<{ reason: AccountAuthorityFinalReason; resetBinding: boolean }>> = new Map([
  ['account_authority_binding_missing', { reason: 'binding_missing', resetBinding: true }],
  ['account_authority_binding_mismatch', { reason: 'binding_mismatch', resetBinding: true }],
  ['account_authority_deletion_pending', { reason: 'deletion_pending', resetBinding: false }],
  ['account_authority_identity_unresolved', { reason: 'identity_unresolved', resetBinding: false }],
  ['account_authority_sign_in_provider_rejected', { reason: 'provider_rejected', resetBinding: false }],
  ['account_authority_anonymous_rejected', { reason: 'anonymous_rejected', resetBinding: false }],
  ['account_authority_disabled', { reason: 'disabled', resetBinding: false }],
  ['account_authority_installation_binding_disabled', { reason: 'disabled', resetBinding: false }],
  ['account_authority_request_invalid', { reason: 'request_invalid', resetBinding: false }],
] as const);

const CONTRACT_REJECTED_MESSAGE = 'account_authority_request_rejected';
const OWN_ERROR = /^account_authority_[a-z0-9_]{1,80}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Код callable без префикса `functions/`; null — у ошибки нет кода. */
function bareCode(error: unknown): string | null {
  const code = isRecord(error) ? error.code : undefined;
  if (typeof code !== 'string' || code.length === 0) return null;
  return code.startsWith('functions/') ? code.slice('functions/'.length) : code;
}

/**
 * Сообщение сервера, только если это машинный код AA. Сырой текст чужой
 * ошибки сюда не попадает и никуда дальше не уходит — только сравнение.
 */
function serverMessage(error: unknown): string | null {
  const message = isRecord(error) ? error.message : undefined;
  return typeof message === 'string' && OWN_ERROR.test(message) ? message : null;
}

/**
 * зачем (S2b раунд 2): сервер публикует точный код отказа контракта в
 * `details.leaseCode` (закрытый список). Берём только короткий строчный код;
 * отсутствие — старый сервер (null).
 */
function publishedLeaseCode(error: unknown): string | null {
  const details = isRecord(error) ? error.details : undefined;
  const code = isRecord(details) ? details.leaseCode : undefined;
  return typeof code === 'string' && /^[a-z_]{1,40}$/.test(code) ? code : null;
}

/** S2b-R3: ротация привязки — только при устаревшей эпохе устройства. */
export const ACCOUNT_AUTHORITY_ROTATE_LEASE_CODES: ReadonlySet<string> = new Set(['stale_auth_epoch']);
/** S2b-R4: на ПОВТОРЕ потерянного выхода эти коды значат «первая попытка дошла». */
export const ACCOUNT_AUTHORITY_RELEASE_DONE_LEASE_CODES: ReadonlySet<string> = new Set(['revision_mismatch', 'stale_lease']);

export function classifyAccountAuthorityFailure(error: unknown): AccountAuthorityFailureClass {
  const code = bareCode(error);
  const message = serverMessage(error);
  if (message !== null) {
    const final = FINAL_MESSAGES.get(message);
    if (final !== undefined) return Object.freeze({ kind: 'final', ...final });
    if (message === CONTRACT_REJECTED_MESSAGE) {
      return Object.freeze({ kind: 'contract_rejected', leaseCode: publishedLeaseCode(error) });
    }
  }
  if (code === 'unauthenticated') return Object.freeze({ kind: 'unauthenticated' });
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return Object.freeze({ kind: 'retryable', reason: 'unavailable' });
  }
  // зачем: троттлинг привязок (10/мин на uid) — подождать и повторить, а не сдаваться.
  if (code === 'resource-exhausted') return Object.freeze({ kind: 'retryable', reason: 'throttled' });
  if (code === 'invalid-argument') {
    return Object.freeze({ kind: 'final', reason: 'request_invalid', resetBinding: false });
  }
  if (code === 'internal') return Object.freeze({ kind: 'final', reason: 'server_error', resetBinding: false });
  if (code === 'network-request-failed') return Object.freeze({ kind: 'retryable', reason: 'network' });
  if (code !== null) return Object.freeze({ kind: 'final', reason: 'unknown', resetBinding: false });
  // Своя ошибка клиента (разбор ответа, хранилище, привязка недоступна) —
  // повтор того же запроса её не исправит.
  if (error instanceof Error && OWN_ERROR.test(error.message)) {
    return Object.freeze({ kind: 'final', reason: 'local_failure', resetBinding: false });
  }
  // Ошибка без кода — обрыв транспорта (ответ потерян): повторяемая.
  return Object.freeze({ kind: 'retryable', reason: 'network' });
}

export const ACCOUNT_AUTHORITY_RETRY_MAX_ATTEMPTS = 3;
export const ACCOUNT_AUTHORITY_RETRY_BASE_DELAY_MS = 500;
export const ACCOUNT_AUTHORITY_RETRY_MAX_DELAY_MS = 8_000;
/** Троттлинг привязок считается по минуте — пауза не меньше 6 с. */
export const ACCOUNT_AUTHORITY_THROTTLED_MIN_DELAY_MS = 6_000;

/**
 * Пауза перед повтором номер `retry` (1, 2, …): экспонента с потолком и
 * джиттером 50–100 %, чтобы устройства после общего сбоя не били сервер разом.
 */
export function accountAuthorityRetryDelayMs(
  retry: number,
  reason: 'unavailable' | 'network' | 'throttled',
  random: () => number,
): number {
  const exponent = Math.max(0, Math.floor(retry) - 1);
  const raw = Math.min(ACCOUNT_AUTHORITY_RETRY_MAX_DELAY_MS, ACCOUNT_AUTHORITY_RETRY_BASE_DELAY_MS * 2 ** exponent);
  const jitter = 0.5 + Math.min(1, Math.max(0, random())) / 2;
  const delay = Math.round(raw * jitter);
  return reason === 'throttled' ? Math.max(ACCOUNT_AUTHORITY_THROTTLED_MIN_DELAY_MS, delay) : delay;
}

/** S2b-R2: квитанция живёт 60 мин — сами повторяем начальный вход не дольше 50. */
export const ACCOUNT_AUTHORITY_INITIAL_ACQUIRE_REPLAY_WINDOW_MS = 50 * 60_000;

export type AccountAuthorityAcquireReplayDecision = 'replay_same_operation' | 'requires_user_action';

/**
 * S2b-R2: можно ли автоматически повторить вход с тем же operationId.
 * С известной ревизией — всегда (её охраняет expectedRevision). Начальный
 * вход без ревизии — только пока жива его квитанция на сервере.
 */
export function planAccountAuthorityAcquireReplay(input: Readonly<{
  expectedRevision: number | null;
  firstAttemptAtMs: number;
  nowMs: number;
}>): AccountAuthorityAcquireReplayDecision {
  if (input.expectedRevision !== null) return 'replay_same_operation';
  const elapsed = input.nowMs - input.firstAttemptAtMs;
  return elapsed >= 0 && elapsed <= ACCOUNT_AUTHORITY_INITIAL_ACQUIRE_REPLAY_WINDOW_MS
    ? 'replay_same_operation'
    : 'requires_user_action';
}

/** S2b-R1: продление не чаще раза в 5 минут на устройство. */
export const ACCOUNT_AUTHORITY_RENEWAL_MIN_INTERVAL_MS = 5 * 60_000;

export type AccountAuthorityRenewalTrigger = 'cold_start' | 'foreground' | 'other';
export type AccountAuthorityRenewalDecision =
  | Readonly<{ renew: true }>
  | Readonly<{ renew: false; reason: 'trigger_not_allowed' | 'in_flight' | 'debounced' }>;

export interface AccountAuthorityRenewalGate {
  /** Решение и, если «да», занятие слота продления до finish(). */
  tryBegin(trigger: AccountAuthorityRenewalTrigger): AccountAuthorityRenewalDecision;
  finish(result: 'succeeded' | 'failed'): void;
}

/**
 * S2b-R1, чистая политика. Где подключать (жизненный цикл продлений в
 * клиенте ещё не собран, cutover выключен): `app/accounts_v2_client_flag.ts`
 * → перед `resumeAccountAuthorityProviderSessionIfIdle` звать
 * `tryBegin('cold_start')`, а в слушателе AppState 'active' —
 * `tryBegin('foreground')`; по завершении resume — `finish(...)`.
 * Неудача продления не сдвигает отметку: следующий повод может повторить.
 */
export function createAccountAuthorityRenewalGate(input: Readonly<{
  nowMs: () => number;
  minIntervalMs?: number;
  lastSucceededAtMs?: number | null;
}>): AccountAuthorityRenewalGate {
  const minIntervalMs = input.minIntervalMs ?? ACCOUNT_AUTHORITY_RENEWAL_MIN_INTERVAL_MS;
  let lastSucceededAtMs: number | null = input.lastSucceededAtMs ?? null;
  let inFlight = false;
  return Object.freeze({
    tryBegin: (trigger: AccountAuthorityRenewalTrigger): AccountAuthorityRenewalDecision => {
      if (trigger !== 'cold_start' && trigger !== 'foreground') {
        return Object.freeze({ renew: false, reason: 'trigger_not_allowed' });
      }
      if (inFlight) return Object.freeze({ renew: false, reason: 'in_flight' });
      const now = input.nowMs();
      if (lastSucceededAtMs !== null && now - lastSucceededAtMs < minIntervalMs && now >= lastSucceededAtMs) {
        return Object.freeze({ renew: false, reason: 'debounced' });
      }
      inFlight = true;
      return Object.freeze({ renew: true });
    },
    finish: (result: 'succeeded' | 'failed'): void => {
      inFlight = false;
      if (result === 'succeeded') lastSucceededAtMs = input.nowMs();
    },
  });
}
