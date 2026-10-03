import type { DeviceId } from './account_authority_ids';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
} from './account_authority_ids';
import type { AccountAuthorityLocalStorePort } from './account_authority_local_store';
import type { AccountAuthorityLeasePort } from './account_authority_runtime';

/** Complete production composition required before Account Authority can run. */
export type AccountAuthorityProductionBootstrap = Readonly<{
  deviceId: DeviceId;
  lease: AccountAuthorityLeasePort;
  localStore: AccountAuthorityLocalStorePort;
  providerSignOut: () => Promise<void>;
}>;

export interface AccountAuthorityProductionBootstrapRegistry {
  install(bootstrap: unknown): void;
  requireInstalled(): AccountAuthorityProductionBootstrap;
}

const BOOTSTRAP_KEYS = Object.freeze([
  'deviceId',
  'lease',
  'localStore',
  'providerSignOut',
] as const);

const LEASE_METHODS = Object.freeze([
  'acquire',
  'release',
  'deleteAccount',
] as const);

const LOCAL_STORE_METHODS = Object.freeze([
  'getAuthorityGeneration',
  'advanceAuthorityGeneration',
  'getOperationKind',
  'getDestructiveOperation',
  'reserveOperation',
  'bindDeferredDestructiveOperation',
  'markDestructiveOperationLocalApplied',
  'completeDestructiveOperation',
  'getOpenScope',
  'openScope',
  'closeScope',
  'clearAccountData',
  'commitPreservedWrite',
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasExactBootstrapKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === BOOTSTRAP_KEYS.length
    && keys.every((key, index) => key === [...BOOTSTRAP_KEYS].sort()[index]);
}

function hasMethods(value: unknown, methods: readonly string[]): boolean {
  return isRecord(value) && methods.every((method) => typeof value[method] === 'function');
}

function normalizeLease(value: unknown): AccountAuthorityLeasePort {
  if (!hasMethods(value, LEASE_METHODS)) throw new Error('account_authority_bootstrap_invalid');
  const port = value as unknown as AccountAuthorityLeasePort;
  const normalized: AccountAuthorityLeasePort = {
    acquire: async (request) => {
      const safeRequest = Object.freeze({
        firebaseAuthUid: parseFirebaseAuthUid(request.firebaseAuthUid),
        deviceId: parseDeviceId(request.deviceId),
        operationId: parseOperationId(request.operationId),
      });
      const response: unknown = await port.acquire(safeRequest);
      try {
        if (!isRecord(response)) throw new Error('invalid');
        return Object.freeze({
          accountId: parseAccountId(response.accountId),
          sessionId: parseSessionId(response.sessionId),
        });
      } catch {
        // Keep malformed server payloads fail-closed without reflecting IDs or credentials.
        throw new Error('account_authority_lease_invalid');
      }
    },
    release: (request) => port.release(Object.freeze({
      accountId: parseAccountId(request.accountId),
      sessionId: parseSessionId(request.sessionId),
      deviceId: parseDeviceId(request.deviceId),
      operationId: parseOperationId(request.operationId),
    })),
    deleteAccount: (request) => port.deleteAccount(Object.freeze({
      accountId: parseAccountId(request.accountId),
      sessionId: parseSessionId(request.sessionId),
      deviceId: parseDeviceId(request.deviceId),
      operationId: parseOperationId(request.operationId),
    })),
  };
  return Object.freeze(normalized);
}

function normalizeLocalStore(value: unknown): AccountAuthorityLocalStorePort {
  if (!hasMethods(value, LOCAL_STORE_METHODS)) throw new Error('account_authority_bootstrap_invalid');
  const port = value as unknown as AccountAuthorityLocalStorePort;
  const normalized: AccountAuthorityLocalStorePort = {
    getAuthorityGeneration: () => port.getAuthorityGeneration(),
    advanceAuthorityGeneration: (generation) => port.advanceAuthorityGeneration(generation),
    getOperationKind: (operationId) => port.getOperationKind(operationId),
    getDestructiveOperation: (operationId) => port.getDestructiveOperation(operationId),
    reserveOperation: (operationId, kind, destructive) => (
      port.reserveOperation(operationId, kind, destructive)
    ),
    bindDeferredDestructiveOperation: (
      operationId,
      kind,
      fingerprint,
      owner,
      expectedGeneration,
    ) => port.bindDeferredDestructiveOperation(
      operationId,
      kind,
      fingerprint,
      owner,
      expectedGeneration,
    ),
    markDestructiveOperationLocalApplied: (operationId, kind, fingerprint) => (
      port.markDestructiveOperationLocalApplied(operationId, kind, fingerprint)
    ),
    completeDestructiveOperation: (operationId, kind, fingerprint, receipt) => (
      port.completeDestructiveOperation(operationId, kind, fingerprint, receipt)
    ),
    getOpenScope: () => port.getOpenScope(),
    openScope: (scope) => port.openScope(scope),
    closeScope: (scope) => port.closeScope(scope),
    clearAccountData: (accountId) => port.clearAccountData(accountId),
    commitPreservedWrite: (write) => port.commitPreservedWrite(write),
  };
  return Object.freeze(normalized);
}

function normalizeBootstrap(value: unknown): AccountAuthorityProductionBootstrap {
  if (!isRecord(value) || !hasExactBootstrapKeys(value)) {
    throw new Error('account_authority_bootstrap_invalid');
  }
  if (typeof value.providerSignOut !== 'function') {
    throw new Error('account_authority_bootstrap_invalid');
  }

  let deviceId: DeviceId;
  try {
    deviceId = parseDeviceId(value.deviceId);
  } catch {
    throw new Error('account_authority_bootstrap_invalid');
  }
  const providerSignOut = value.providerSignOut as () => Promise<void>;
  return Object.freeze({
    deviceId,
    lease: normalizeLease(value.lease),
    localStore: normalizeLocalStore(value.localStore),
    providerSignOut: () => providerSignOut(),
  });
}

/**
 * One-shot composition registry. A partial install publishes nothing, and a
 * successful install can never be rebound to different authority ports.
 */
export function createAccountAuthorityProductionBootstrapRegistry(
): AccountAuthorityProductionBootstrapRegistry {
  let installed: AccountAuthorityProductionBootstrap | null = null;
  return Object.freeze({
    install: (bootstrap: unknown): void => {
      if (installed !== null) throw new Error('account_authority_bootstrap_already_installed');
      installed = normalizeBootstrap(bootstrap);
    },
    requireInstalled: (): AccountAuthorityProductionBootstrap => {
      if (installed === null) throw new Error('account_authority_bootstrap_missing');
      return installed;
    },
  });
}
