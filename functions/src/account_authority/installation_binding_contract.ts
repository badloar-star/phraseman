import {
  ACCOUNT_AUTHORITY_RECORD_TTL_MS,
  INSTALLATION_BINDING_ACTIVE_LIMIT,
  INSTALLATION_BINDING_CREATE_MAX_PER_WINDOW,
  INSTALLATION_BINDING_CREATE_WINDOW_MS,
} from './account_authority_policy';

// зачем (AA S2a, пункт 2): лимит и троттлинг привязок отвечают resource-exhausted.
export type InstallationBindingErrorCode = 'invalid-argument' | 'failed-precondition' | 'resource-exhausted';

export class InstallationBindingError extends Error {
  readonly code: InstallationBindingErrorCode;

  constructor(code: InstallationBindingErrorCode, message: string) {
    super(message);
    this.name = 'InstallationBindingError';
    this.code = code;
  }
}

export type InstallationBindingRecord = Readonly<{
  schemaVersion: 'account-authority-installation-binding-record.v1';
  authUidHash: string;
  installationIdHash: string;
  bindingTokenHash: string;
  deviceBindingId: string;
  createdAtMs: number;
  rotatedAtMs: number;
  revokedAtMs: number | null;
}>;

export type InstallationBindingResponse = Readonly<{
  bindingToken: string;
  deviceBindingId: string;
}>;

/**
 * Пункт 2 (AA S2a): счётчик привязок одного uid. Ключ документа — хеш uid,
 * внутри только ключи привязок (тоже хеши) и моменты вызовов.
 *   - `bindings`: ключ привязки → когда её последний раз создавали или ротировали;
 *     активной считается привязка моложе срока жизни записи (90 дней);
 *   - `recentCallsAtMs`: моменты вызовов привязки за последнее окно троттлинга.
 */
export type InstallationBindingQuota = Readonly<{
  bindings: Readonly<Record<string, number>>;
  recentCallsAtMs: readonly number[];
}>;

type InstallationBindingTransition = Readonly<{
  record: InstallationBindingRecord;
  response: InstallationBindingResponse;
  quota: InstallationBindingQuota;
  /**
   * Раунд 2, M2: привязка, вытесненная ради новой установки. Хранилище в той
   * же транзакции ставит ей revokedAtMs и удаляет индекс её токена.
   */
  evictedBindingKey: string | null;
}>;

/**
 * Раунд 2, M2/M3: «жизнь» привязок по их записям. Ключ привязки → момент
 * последнего использования (мс) или null, если привязка мертва (нет записи,
 * отозвана, истёк срок). Хранилище читает записи только когда лимит достигнут
 * (installationBindingEvictionCandidates), то есть редко.
 */
export type InstallationBindingLiveness = Readonly<Record<string, number | null>>;

export type InstallationBindingStoreOptions = Readonly<{
  /** Хеш uid: ключ документа счётчика привязок этого uid. */
  quotaKey: string;
}>;

export interface InstallationBindingStorePort {
  /**
   * Одна транзакция: читает запись привязки и счётчик uid, применяет переход
   * и пишет запись, индекс токена и счётчик. Счётчик обязан читаться в той же
   * транзакции, иначе параллельные вызовы обойдут лимит.
   */
  transact(
    bindingKey: string,
    transition: (
      current: InstallationBindingRecord | null,
      // Необязателен только для хранилищ в памяти (тесты контракта): там
      // счётчика нет. Firestore-хранилище передаёт его всегда (свой тест).
      quota?: InstallationBindingQuota | null,
      liveness?: InstallationBindingLiveness,
    ) => InstallationBindingTransition,
    options: InstallationBindingStoreOptions,
  ): Promise<InstallationBindingResponse>;
}

export type InstallationBindingPorts = Readonly<{
  hash: Readonly<{ digest(value: string): string }>;
  ids: Readonly<{
    issueBindingToken(): string;
    issueDeviceBindingId(): string;
  }>;
  clock: Readonly<{ nowMs(): number }>;
  store: InstallationBindingStorePort;
}>;

export type InstallationBindingRequest = Readonly<{ installationId: string }>;

const INSTALLATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function invalidRequest(): InstallationBindingError {
  return new InstallationBindingError(
    'invalid-argument',
    'account_authority_installation_request_invalid',
  );
}

function parseRequest(value: unknown): InstallationBindingRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidRequest();
  }
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 1 || !Object.prototype.hasOwnProperty.call(data, 'installationId')) {
    throw invalidRequest();
  }
  if (typeof data.installationId !== 'string' || !INSTALLATION_ID_PATTERN.test(data.installationId)) {
    throw invalidRequest();
  }
  return Object.freeze({ installationId: data.installationId });
}

function validIssuedId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 1
    && value.length <= 512
    && value.trim() === value;
}

function assertExistingRecord(
  current: InstallationBindingRecord,
  authUidHash: string,
  installationIdHash: string,
): void {
  if (
    current.schemaVersion !== 'account-authority-installation-binding-record.v1'
    || current.authUidHash !== authUidHash
    || current.installationIdHash !== installationIdHash
    || current.revokedAtMs !== null
    || !validIssuedId(current.bindingTokenHash)
    || !validIssuedId(current.deviceBindingId)
    || !Number.isSafeInteger(current.createdAtMs)
    || current.createdAtMs < 0
    || !Number.isSafeInteger(current.rotatedAtMs)
    || current.rotatedAtMs < 0
    || current.rotatedAtMs < current.createdAtMs
  ) {
    throw new InstallationBindingError(
      'failed-precondition',
      'account_authority_installation_binding_invalid',
    );
  }
}

function resourceExhausted(reason: 'throttled'): InstallationBindingError {
  return new InstallationBindingError('resource-exhausted', `account_authority_installation_binding_${reason}`);
}

function needsSlot(quota: InstallationBindingQuota | null | undefined, bindingKey: string, hasLiveRecord: boolean): boolean {
  const bindings = quota?.bindings ?? {};
  return !hasLiveRecord
    && !Object.prototype.hasOwnProperty.call(bindings, bindingKey)
    && Object.keys(bindings).length >= INSTALLATION_BINDING_ACTIVE_LIMIT;
}

/**
 * Раунд 2, M2/M3: какие привязки хранилищу прочитать перед переходом. Пусто,
 * пока новой установке хватает места (обычный случай — ноль лишних чтений).
 * Когда места нет — все привязки счётчика (≤ лимита): живость решают их записи
 * (срок expireAt продлевается арендой), а не моменты создания в счётчике.
 */
export function installationBindingEvictionCandidates(
  quota: InstallationBindingQuota | null | undefined,
  bindingKey: string,
  hasLiveRecord: boolean,
): readonly string[] {
  if (!needsSlot(quota, bindingKey, hasLiveRecord)) return Object.freeze([]);
  return Object.freeze(Object.keys(quota?.bindings ?? {}).sort());
}

type QuotaOutcome = Readonly<{ quota: InstallationBindingQuota; evictedBindingKey: string | null }>;

/**
 * Пункт 2 и раунд 2 (M2): троттлинг и место для новой установки. Сначала
 * троттлинг (любой вызов выдаёт токен и стоит записей) — отказ
 * resource-exhausted до записей. Лимит активных привязок больше НЕ отказ:
 * мёртвые привязки (по записям) выбывают, а если живых всё ещё не меньше
 * лимита — вытесняется та, которой дольше всех не пользовались. Ротация уже
 * существующей привязки места не расходует.
 *
 * Без `liveness` (хранилища в памяти) живость берётся из моментов счётчика.
 */
export function applyInstallationBindingQuota(
  quota: InstallationBindingQuota | null | undefined,
  bindingKey: string,
  hasLiveRecord: boolean,
  nowMs: number,
  liveness?: InstallationBindingLiveness,
): QuotaOutcome {
  const recentCalls = (quota?.recentCallsAtMs ?? []).filter((at) => (
    Number.isSafeInteger(at) && at <= nowMs && at > nowMs - INSTALLATION_BINDING_CREATE_WINDOW_MS
  ));
  if (recentCalls.length >= INSTALLATION_BINDING_CREATE_MAX_PER_WINDOW) throw resourceExhausted('throttled');
  const slotNeeded = needsSlot(quota, bindingKey, hasLiveRecord);
  const alive: Record<string, number> = {};
  for (const [key, touchedAtMs] of Object.entries(quota?.bindings ?? {})) {
    // Пока место есть, счётчик не чистится: момент в нём — время создания или
    // ротации, а живость по аренде видна только в записи привязки (M3).
    if (!slotNeeded) {
      alive[key] = touchedAtMs;
      continue;
    }
    const lastUsedMs = liveness !== undefined ? liveness[key] ?? null : touchedAtMs;
    if (lastUsedMs !== null && Number.isSafeInteger(lastUsedMs) && lastUsedMs + ACCOUNT_AUTHORITY_RECORD_TTL_MS > nowMs) {
      alive[key] = lastUsedMs;
    }
  }
  let evictedBindingKey: string | null = null;
  if (slotNeeded && !Object.prototype.hasOwnProperty.call(alive, bindingKey)
    && Object.keys(alive).length >= INSTALLATION_BINDING_ACTIVE_LIMIT) {
    // Самая давно не использованная; при равенстве — меньший ключ (детерминизм).
    evictedBindingKey = Object.entries(alive)
      .sort(([leftKey, left], [rightKey, right]) => left - right || leftKey.localeCompare(rightKey))[0]?.[0] ?? null;
  }
  const bindings: Record<string, number> = {};
  for (const [key, lastUsedMs] of Object.entries(alive)) {
    if (key !== evictedBindingKey) bindings[key] = lastUsedMs;
  }
  bindings[bindingKey] = nowMs;
  return Object.freeze({
    quota: Object.freeze({
      bindings: Object.freeze(bindings),
      recentCallsAtMs: Object.freeze([...recentCalls, nowMs]),
    }),
    evictedBindingKey,
  });
}

export async function createInstallationBinding(
  ports: InstallationBindingPorts,
  firebaseAuthUid: string,
  input: unknown,
): Promise<InstallationBindingResponse> {
  const request = parseRequest(input);
  if (typeof firebaseAuthUid !== 'string' || firebaseAuthUid.length < 1 || firebaseAuthUid.length > 256) {
    throw invalidRequest();
  }

  const bindingKey = ports.hash.digest(
    `account-authority-installation-key.v1\u0000${firebaseAuthUid}\u0000${request.installationId}`,
  );
  const authUidHash = ports.hash.digest(`account-authority-auth-uid.v1\u0000${firebaseAuthUid}`);
  const installationIdHash = ports.hash.digest(
    `account-authority-installation-id.v1\u0000${request.installationId}`,
  );

  return ports.store.transact(bindingKey, (stored, quota, liveness) => {
    const nowMs = ports.clock.nowMs();
    // зачем (раунд 2, M2): отозванная (вытесненная) привязка этой же установки
    // этого же uid не тупик — установка получает свежую привязку и новый id
    // устройства. Чужая или испорченная запись по-прежнему отказ ниже.
    const current = stored !== null
      && stored.revokedAtMs !== null
      && stored.authUidHash === authUidHash
      && stored.installationIdHash === installationIdHash
      ? null
      : stored;
    const bindingToken = ports.ids.issueBindingToken();
    if (!Number.isSafeInteger(nowMs) || nowMs < 0 || !validIssuedId(bindingToken)) {
      throw new InstallationBindingError(
        'failed-precondition',
        'account_authority_installation_binding_invalid',
      );
    }
    // зачем (AA S2a, пункт 2): троттлинг и лимит проверяются в той же
    // транзакции, что и запись привязки, до любых записей.
    const quotaOutcome = applyInstallationBindingQuota(quota, bindingKey, current !== null, nowMs, liveness);
    const bindingTokenHash = ports.hash.digest(
      `account-authority-binding-token.v1\u0000${bindingToken}`,
    );

    let deviceBindingId: string;
    let createdAtMs: number;
    if (current === null) {
      deviceBindingId = ports.ids.issueDeviceBindingId();
      createdAtMs = nowMs;
      if (!validIssuedId(deviceBindingId)) {
        throw new InstallationBindingError(
          'failed-precondition',
          'account_authority_installation_binding_invalid',
        );
      }
    } else {
      assertExistingRecord(current, authUidHash, installationIdHash);
      if (nowMs < current.rotatedAtMs || bindingTokenHash === current.bindingTokenHash) {
        throw new InstallationBindingError(
          'failed-precondition',
          'account_authority_installation_binding_invalid',
        );
      }
      deviceBindingId = current.deviceBindingId;
      createdAtMs = current.createdAtMs;
    }

    const record: InstallationBindingRecord = {
      schemaVersion: 'account-authority-installation-binding-record.v1',
      authUidHash,
      installationIdHash,
      bindingTokenHash,
      deviceBindingId,
      createdAtMs,
      rotatedAtMs: nowMs,
      revokedAtMs: null,
    };
    Object.defineProperty(record, 'toJSON', {
      enumerable: false,
      value: () => ({
        schemaVersion: record.schemaVersion,
        authUidHash: '[redacted]',
        installationIdHash: '[redacted]',
        bindingTokenHash: '[redacted]',
        deviceBindingId: record.deviceBindingId,
        createdAtMs: record.createdAtMs,
        rotatedAtMs: record.rotatedAtMs,
        revokedAtMs: record.revokedAtMs,
      }),
    });
    Object.freeze(record);
    const response: InstallationBindingResponse = Object.freeze({
      bindingToken,
      deviceBindingId,
    });
    return Object.freeze({
      record,
      response,
      quota: quotaOutcome.quota,
      evictedBindingKey: quotaOutcome.evictedBindingKey,
    });
  }, Object.freeze({ quotaKey: authUidHash }));
}
