import {
  parseAccountId,
  parseDeviceId,
  parseSessionId,
} from './account_authority_ids';
import type {
  AccountId,
  DeviceId,
  FirebaseAuthUid,
  SessionId,
} from './account_authority_ids';
import type { AccountAuthorityLeasePort } from './account_authority_runtime';

export const ACCOUNT_AUTHORITY_LEASE_ACQUIRE_CALLABLE = 'accountAuthorityLeaseAcquire';
export const ACCOUNT_AUTHORITY_LEASE_RELEASE_CALLABLE = 'accountAuthorityLeaseRelease';
export const ACCOUNT_AUTHORITY_INSTALLATION_BINDING_CALLABLE = 'accountAuthorityInstallationBindingCreate';
const FUNCTIONS_REGION = 'us-central1';
const CALLABLE_TIMEOUT_MS = 30_000;
const LOG = '[ACCOUNT-AUTHORITY]';

export type AccountAuthorityCallableInvoker = (
  name: string,
  data: Readonly<Record<string, unknown>>,
) => Promise<unknown>;

/**
 * Revision is durable state, not a guessed transport default. A missing value
 * must fail closed until bootstrap proves this is a brand-new server account or
 * hydrates the current revision from the server.
 */
export interface AccountAuthorityLeaseRevisionStore {
  read(firebaseAuthUid: FirebaseAuthUid): Promise<number | null>;
  write(firebaseAuthUid: FirebaseAuthUid, revision: number): Promise<void>;
  readLease(owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>): Promise<number | null>;
  bindLease(
    firebaseAuthUid: FirebaseAuthUid,
    owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>,
    revision: number,
  ): Promise<void>;
  writeLease(
    owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>,
    revision: number,
  ): Promise<void>;
}

export type AccountAuthorityInstallationBinding = Readonly<{
  bindingToken: string;
  deviceBindingId: DeviceId;
}>;

export interface AccountAuthorityInstallationBindingPort {
  obtain(firebaseAuthUid: FirebaseAuthUid): Promise<AccountAuthorityInstallationBinding>;
  readPersisted(): Promise<AccountAuthorityInstallationBinding | null>;
}

export interface AccountAuthorityInstallationBindingCredentialStore {
  read(): Promise<Readonly<{
    bindingToken: string;
    deviceBindingId: string;
  }> | null>;
  write(credentials: Readonly<{
    bindingToken: string;
    deviceBindingId: string;
  }>): Promise<void>;
}

type LeaseResponse = Readonly<{
  accountId: ReturnType<typeof parseAccountId>;
  sessionId: ReturnType<typeof parseSessionId>;
  revision: number;
  previousLeaseRevoked: boolean;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrapCallableData(value: unknown): unknown {
  if (!isRecord(value) || !Object.prototype.hasOwnProperty.call(value, 'data')) {
    throw new Error('account_authority_lease_invalid');
  }
  return value.data;
}

function parseLeaseResponse(value: unknown, expectedRevision: number | null): LeaseResponse {
  const data = unwrapCallableData(value);
  if (!isRecord(data)) throw new Error('account_authority_lease_invalid');
  const keys = Object.keys(data).sort();
  const expectedKeys = [
    'accountId',
    'idempotent',
    'previousLeaseRevoked',
    'revision',
    'schemaVersion',
    'sessionId',
    'type',
  ].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error('account_authority_lease_invalid');
  }
  if (
    data.schemaVersion !== 'account-authority-lease.v1'
    || (data.type !== 'acquired' && data.type !== 'renewed')
    || typeof data.idempotent !== 'boolean'
    || typeof data.previousLeaseRevoked !== 'boolean'
    || !Number.isSafeInteger(data.revision)
  ) {
    throw new Error('account_authority_lease_invalid');
  }
  if (expectedRevision === null) {
    if ((data.revision as number) < 1) throw new Error('account_authority_lease_invalid');
  } else {
    const requiredRevision = data.type === 'acquired'
      ? expectedRevision + 1
      : expectedRevision;
    if (!Number.isSafeInteger(requiredRevision) || data.revision !== requiredRevision) {
      throw new Error('account_authority_lease_invalid');
    }
  }
  try {
    return Object.freeze({
      accountId: parseAccountId(data.accountId),
      sessionId: parseSessionId(data.sessionId),
      revision: data.revision as number,
      previousLeaseRevoked: data.previousLeaseRevoked,
    });
  } catch {
    throw new Error('account_authority_lease_invalid');
  }
}

function parseReleaseResponse(value: unknown, expectedRevision: number): number {
  const data = unwrapCallableData(value);
  if (!isRecord(data)) throw new Error('account_authority_lease_invalid');
  const keys = Object.keys(data).sort();
  const expectedKeys = ['idempotent', 'revision', 'schemaVersion', 'type'].sort();
  if (
    keys.length !== expectedKeys.length
    || keys.some((key, index) => key !== expectedKeys[index])
    || data.schemaVersion !== 'account-authority-lease-release.v1'
    || data.type !== 'released'
    || typeof data.idempotent !== 'boolean'
    || !Number.isSafeInteger(data.revision)
    || data.revision !== expectedRevision + 1
  ) throw new Error('account_authority_lease_invalid');
  return data.revision as number;
}

function parseInstallationBindingCredentials(value: unknown): AccountAuthorityInstallationBinding {
  if (!isRecord(value)) throw new Error('account_authority_installation_binding_invalid');
  const keys = Object.keys(value).sort();
  if (
    keys.length !== 2
    || keys[0] !== 'bindingToken'
    || keys[1] !== 'deviceBindingId'
    || typeof value.bindingToken !== 'string'
    || value.bindingToken.length < 1
    || value.bindingToken.length > 512
    || value.bindingToken.trim() !== value.bindingToken
  ) {
    throw new Error('account_authority_installation_binding_invalid');
  }
  try {
    return Object.freeze({
      bindingToken: value.bindingToken,
      deviceBindingId: parseDeviceId(value.deviceBindingId),
    });
  } catch {
    throw new Error('account_authority_installation_binding_invalid');
  }
}

function parseInstallationBindingResponse(value: unknown): AccountAuthorityInstallationBinding {
  return parseInstallationBindingCredentials(unwrapCallableData(value));
}

function callableCode(error: unknown): string | null {
  if (!isRecord(error)) return null;
  const code = error.code;
  return typeof code === 'string' ? code : null;
}

// зачем (AA S0, правило «немой catch запрещён»): в лог попадает только вид
// ошибки и безопасный код (код callable или свой account_authority_*), но не
// текст чужой ошибки и не токен привязки.
function safeFailureCode(error: unknown): string {
  const code = callableCode(error);
  if (code !== null && /^[\w/-]{1,96}$/.test(code)) return code;
  if (error instanceof Error && /^account_authority_[a-z0-9_]{1,80}$/.test(error.message)) return error.message;
  return 'other';
}

function failureKind(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function mapAcquireFailure(error: unknown): Error {
  const code = callableCode(error);
  if (code === 'unauthenticated' || code === 'functions/unauthenticated') {
    return new Error('account_authority_lease_unauthenticated');
  }
  if (error instanceof Error && error.message === 'account_authority_lease_invalid') return error;
  return new Error('account_authority_lease_unavailable');
}

export function createAccountAuthorityFirebaseLeasePort(input: Readonly<{
  invoke: AccountAuthorityCallableInvoker;
  revisionStore: AccountAuthorityLeaseRevisionStore;
  installationBinding: AccountAuthorityInstallationBindingPort;
}>): AccountAuthorityLeasePort {
  const acquire: AccountAuthorityLeasePort['acquire'] = async (request) => {
      const expectedRevision = await input.revisionStore.read(request.firebaseAuthUid);
      if (
        expectedRevision !== null
        && (
          !Number.isSafeInteger(expectedRevision)
          || expectedRevision < 0
          || expectedRevision >= Number.MAX_SAFE_INTEGER
        )
      ) {
        throw new Error('account_authority_lease_revision_unavailable');
      }
      try {
        const binding = await input.installationBinding.obtain(request.firebaseAuthUid);
        const response = await input.invoke(ACCOUNT_AUTHORITY_LEASE_ACQUIRE_CALLABLE, Object.freeze({
          operationId: request.operationId.value,
          expectedRevision,
          bindingToken: binding.bindingToken,
        }));
        const parsed = parseLeaseResponse(response, expectedRevision);
        const owner = Object.freeze({ accountId: parsed.accountId, sessionId: parsed.sessionId });
        await input.revisionStore.bindLease(request.firebaseAuthUid, owner, parsed.revision);
        return Object.freeze({ ...owner, previousLeaseRevoked: parsed.previousLeaseRevoked });
      } catch (error) {
        throw mapAcquireFailure(error);
      }
    };
  const release: AccountAuthorityLeasePort['release'] = async (request) => {
    const owner = Object.freeze({ accountId: request.accountId, sessionId: request.sessionId });
    const expectedRevision = await input.revisionStore.readLease(owner);
    if (
      expectedRevision === null
      || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0
      || expectedRevision >= Number.MAX_SAFE_INTEGER
    ) throw new Error('account_authority_lease_revision_unavailable');
    try {
      const binding = await input.installationBinding.readPersisted();
      if (binding === null) throw new Error('account_authority_installation_binding_unavailable');
      const response = await input.invoke(ACCOUNT_AUTHORITY_LEASE_RELEASE_CALLABLE, Object.freeze({
        operationId: request.operationId.value,
        expectedRevision,
        sessionId: request.sessionId.value,
        bindingToken: binding.bindingToken,
      }));
      const revision = parseReleaseResponse(response, expectedRevision);
      await input.revisionStore.writeLease(owner, revision);
    } catch (error) {
      throw mapAcquireFailure(error);
    }
  };
  const port: AccountAuthorityLeasePort = {
    acquire,
    release,
    deleteAccount: async () => {
      throw new Error('account_authority_delete_not_wired');
    },
  };
  return Object.freeze(port);
}

export function createAccountAuthorityFirebaseInstallationBindingPort(input: Readonly<{
  invoke: AccountAuthorityCallableInvoker;
  installationId: string;
  credentials: AccountAuthorityInstallationBindingCredentialStore;
}>): AccountAuthorityInstallationBindingPort {
  const bindings = new Map<string, Promise<AccountAuthorityInstallationBinding>>();
  const readPersisted = async (): Promise<AccountAuthorityInstallationBinding | null> => {
    const persisted = await input.credentials.read();
    return persisted === null ? null : parseInstallationBindingCredentials(persisted);
  };
  const port: AccountAuthorityInstallationBindingPort = {
    readPersisted,
    obtain: (firebaseAuthUid) => {
      const key = firebaseAuthUid.value;
      const existing = bindings.get(key);
      if (existing !== undefined) return existing;
      const pending = Promise.resolve().then(async () => {
        const persisted = await readPersisted();
        if (persisted !== null) return persisted;
        const response = await input.invoke(
          ACCOUNT_AUTHORITY_INSTALLATION_BINDING_CALLABLE,
          Object.freeze({ installationId: input.installationId }),
        );
        const binding = parseInstallationBindingResponse(response);
        await input.credentials.write({
          bindingToken: binding.bindingToken,
          deviceBindingId: binding.deviceBindingId.value,
        });
        return binding;
      }).catch((error: unknown) => {
        bindings.delete(key);
        // зачем (AA S0): наружу по-прежнему один код «привязка недоступна»
        // (fail-closed, без утечки токена), но вид исходного сбоя — сеть,
        // отказ callable или битые сохранённые данные — теперь виден в логе.
        console.warn(`${LOG} installation_binding obtain_failed kind=${failureKind(error)} code=${safeFailureCode(error)}`);
        throw new Error('account_authority_installation_binding_unavailable');
      });
      bindings.set(key, pending);
      return pending;
    },
  };
  return Object.freeze(port);
}

async function invokeFirebaseCallable(
  name: string,
  data: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  // Keep native Firebase modules out of source tests and legacy startup while
  // the global cutover remains hardcoded off.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const callable = httpsCallable(
    getFunctions(getApp(), FUNCTIONS_REGION),
    name,
    { timeout: CALLABLE_TIMEOUT_MS },
  ) as (payload: Readonly<Record<string, unknown>>) => Promise<unknown>;
  return callable(data);
}

/** Real Firebase transport; installation into bootstrap remains a separate gate. */
export function createProductionAccountAuthorityFirebaseLeasePort(
  revisionStore: AccountAuthorityLeaseRevisionStore,
  installationBinding: AccountAuthorityInstallationBindingPort,
): AccountAuthorityLeasePort {
  return createAccountAuthorityFirebaseLeasePort({
    invoke: invokeFirebaseCallable,
    revisionStore,
    installationBinding,
  });
}

export function createProductionAccountAuthorityFirebaseInstallationBindingPort(input: Readonly<{
  installationId: string;
  credentials: AccountAuthorityInstallationBindingCredentialStore;
}>): AccountAuthorityInstallationBindingPort {
  return createAccountAuthorityFirebaseInstallationBindingPort({
    invoke: invokeFirebaseCallable,
    installationId: input.installationId,
    credentials: input.credentials,
  });
}
