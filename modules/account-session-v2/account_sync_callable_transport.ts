import type { AccountSyncWireBatch } from './account_sync';

/*
 * Account V2, Пакет 6B (TG-F76EA3701B55) — настоящий транспорт синхронизации:
 * callable `accountsV2SyncApply` под портом dispatch раннера.
 *
 * зачем: раннер ждёт от порта `{ outcome: 'accepted', receipts, serverNowMs? }`,
 * а callable отвечает `{ data: { receipts, serverNowMs } }`. Здесь — только
 * перевод формы и ОДНО особое правило контракта 6A:
 *
 *   `failed-precondition` + `accounts_v2_disabled` = «сервер выключен целиком»,
 *   а не «этот пакет плохой». Пакет НЕ уходит в карантин: транспорт сообщает
 *   владельцу сессии (onServerDisabled — тот останавливает раннер до следующего
 *   запуска) и бросает раннеру ОЖИДАНИЕ (`resource-exhausted` + retryAfterMs),
 *   которое по TEMP-контракту не тратит попытку и карантина не даёт. Двойная
 *   защита: даже если раннер не остановили, пакет лишь ждёт, а не гибнет.
 *
 * `rate_limited` / `resource-exhausted` с retryAfterMs раннер уже понимает сам
 * (пауза не меньше retryAfterMs) — ошибка пробрасывается как есть.
 * В логах только коды и числа (префикс [ACCOUNT-V2]).
 */

const LOG = '[ACCOUNT-V2]';
const FUNCTIONS_PREFIX = 'functions/';

export const ACCOUNTS_V2_SYNC_CALLABLE = 'accountsV2SyncApply';
export const ACCOUNTS_V2_DISABLED_CODE = 'accounts_v2_disabled';
/** Пауза, которую раннер увидит вместо «сервер выключен» (если его не остановили). */
export const ACCOUNTS_V2_DISABLED_PAUSE_MS = 60 * 60 * 1000;

export type AccountSyncCallableSendPorts = Readonly<{
  /** Вызов callable; отдаёт результат httpsCallable (`{ data }`) или бросает его ошибку. */
  call: (batch: AccountSyncWireBatch) => Promise<unknown>;
  /** Сервер выключен (accounts_v2_disabled): остановить отправку до следующего запуска. */
  onServerDisabled: () => void;
}>;

/** Ожидание для раннера: не тратит попытку, не даёт карантина (TEMP-контракт 6A). */
export class AccountsV2ServerDisabledWait extends Error {
  readonly code = 'resource-exhausted';
  readonly details = Object.freeze({ final: false, retryAfterMs: ACCOUNTS_V2_DISABLED_PAUSE_MS });

  constructor() {
    super(ACCOUNTS_V2_DISABLED_CODE);
    this.name = 'AccountsV2ServerDisabledWait';
  }
}

function ownData(target: unknown, key: string): unknown {
  if (typeof target !== 'object' || target === null) return undefined;
  // зачем: только собственное data-свойство — геттеры чужой ошибки не вызываем.
  const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
}

function kindOf(value: unknown): string {
  return value instanceof Error ? value.name : typeof value;
}

/** true — отказ «сервер Account V2 выключен» (ворота config/accounts_v2 на сервере). */
export function isAccountsV2DisabledError(error: unknown): boolean {
  try {
    const rawCode = ownData(error, 'code');
    if (typeof rawCode !== 'string') return false;
    const code = rawCode.startsWith(FUNCTIONS_PREFIX) ? rawCode.slice(FUNCTIONS_PREFIX.length) : rawCode;
    if (code !== 'failed-precondition') return false;
    if (ownData(ownData(error, 'details'), 'code') === ACCOUNTS_V2_DISABLED_CODE) return true;
    // зачем: у части SDK details теряются в пути — тогда различаем по тексту отказа.
    return ownData(error, 'message') === ACCOUNTS_V2_DISABLED_CODE;
  } catch (trap) {
    console.warn(`${LOG} transport disabled_check_unreadable kind=${kindOf(trap)}`);
    return false;
  }
}

/** Ответ callable → ответ порта раннера. Проверку самих квитанций делает раннер. */
export function toAccountSyncAcceptedResponse(response: unknown): unknown {
  try {
    const data = ownData(response, 'data');
    const receipts = ownData(data, 'receipts');
    const serverNowMs = ownData(data, 'serverNowMs');
    if (typeof serverNowMs === 'number' && Number.isSafeInteger(serverNowMs) && serverNowMs >= 0) {
      return Object.freeze({ outcome: 'accepted' as const, receipts, serverNowMs });
    }
    console.warn(`${LOG} transport server_now_missing type=${typeof serverNowMs}`);
    return Object.freeze({ outcome: 'accepted' as const, receipts });
  } catch (trap) {
    // зачем: ловушка Proxy в ответе = ответ непригоден; раннер уйдёт в response_malformed.
    console.warn(`${LOG} transport response_unreadable kind=${kindOf(trap)}`);
    return Object.freeze({ outcome: 'malformed' as const });
  }
}

export function createAccountSyncCallableSend(
  ports: AccountSyncCallableSendPorts,
): (batch: AccountSyncWireBatch) => Promise<unknown> {
  return async (batch) => {
    const startedAt = Date.now();
    const ops = batch.operations.length;
    let response: unknown;
    try {
      response = await ports.call(batch);
    } catch (error) {
      if (isAccountsV2DisabledError(error)) {
        console.warn(`${LOG} transport server_disabled ops=${ops} ms=${Date.now() - startedAt}`);
        try {
          ports.onServerDisabled();
        } catch (stopError) {
          console.warn(`${LOG} transport on_disabled_failed kind=${kindOf(stopError)}`);
        }
        throw new AccountsV2ServerDisabledWait();
      }
      const code = ownData(error, 'code');
      console.warn(`${LOG} transport call_failed code=${typeof code === 'string' ? code : 'none'} ops=${ops} ms=${Date.now() - startedAt}`);
      throw error;
    }
    console.log(`${LOG} transport call_ok ops=${ops} ms=${Date.now() - startedAt}`);
    return toAccountSyncAcceptedResponse(response);
  };
}
