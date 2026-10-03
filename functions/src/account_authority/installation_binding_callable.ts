import { createHash, randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from '../callable_options';
import {
  AccountAuthorityCallableError,
  type AccountAuthorityCallableIdentityPort,
} from './callable_boundary';
import { asDeviceId, asTenantId } from './lease_contract';
import {
  createInstallationBinding,
  InstallationBindingError,
  type InstallationBindingPorts,
  type InstallationBindingRecord,
  type InstallationBindingResponse,
  type InstallationBindingStorePort,
} from './installation_binding_contract';

const INSTALLATION_BINDINGS_COLLECTION = 'account_authority_installation_bindings_v1';
const INSTALLATION_BINDING_TOKENS_COLLECTION = 'account_authority_installation_binding_tokens_v1';
const PRIMARY_TENANT_ID = asTenantId('phraseman-primary');
const INSTALLATION_BINDING_RECORD_FIELDS = [
  'schemaVersion',
  'authUidHash',
  'installationIdHash',
  'bindingTokenHash',
  'deviceBindingId',
  'createdAtMs',
  'rotatedAtMs',
  'revokedAtMs',
] as const;

type UnknownRecord = Record<string, unknown>;

type InstallationBindingIndex = Readonly<{
  schemaVersion: 'account-authority-installation-binding-index.v1';
  bindingKey: string;
  bindingTokenHash: string;
  authUidHash: string;
  rotatedAtMs: number;
}>;

export type InstallationBindingCallableRequest = Readonly<{
  auth: Readonly<{ uid: string }> | null;
  data: unknown;
}>;

type InstallationBindingCallableGateDependencies = Readonly<{
  rolloutEnabled?: boolean;
}>;

export type InstallationBindingCallableDependencies =
  InstallationBindingCallableGateDependencies & (
    | Readonly<{
      ports: InstallationBindingPorts;
      getPorts?: never;
    }>
    | Readonly<{
      ports?: never;
      getPorts: () => InstallationBindingPorts;
    }>
  );

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 1
    && value.length <= 512
    && value.trim() === value;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function invalidStoredRecord(): Error {
  return new Error('account_authority_installation_binding_record_invalid');
}

function parseInstallationBindingRecord(value: unknown): InstallationBindingRecord {
  if (!isRecord(value)) throw invalidStoredRecord();
  const keys = Object.keys(value);
  if (
    keys.length !== INSTALLATION_BINDING_RECORD_FIELDS.length
    || INSTALLATION_BINDING_RECORD_FIELDS.some((field) => !Object.prototype.hasOwnProperty.call(value, field))
    || value.schemaVersion !== 'account-authority-installation-binding-record.v1'
    || !isNonEmptyTrimmedString(value.authUidHash)
    || !isNonEmptyTrimmedString(value.installationIdHash)
    || !isNonEmptyTrimmedString(value.bindingTokenHash)
    || !isNonEmptyTrimmedString(value.deviceBindingId)
    || !isNonNegativeSafeInteger(value.createdAtMs)
    || !isNonNegativeSafeInteger(value.rotatedAtMs)
    || (value.revokedAtMs !== null && !isNonNegativeSafeInteger(value.revokedAtMs))
  ) {
    throw invalidStoredRecord();
  }
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    authUidHash: value.authUidHash,
    installationIdHash: value.installationIdHash,
    bindingTokenHash: value.bindingTokenHash,
    deviceBindingId: value.deviceBindingId,
    createdAtMs: value.createdAtMs,
    rotatedAtMs: value.rotatedAtMs,
    revokedAtMs: value.revokedAtMs,
  });
}

function storedInstallationBindingRecord(record: InstallationBindingRecord): UnknownRecord {
  return {
    schemaVersion: record.schemaVersion,
    authUidHash: record.authUidHash,
    installationIdHash: record.installationIdHash,
    bindingTokenHash: record.bindingTokenHash,
    deviceBindingId: record.deviceBindingId,
    createdAtMs: record.createdAtMs,
    rotatedAtMs: record.rotatedAtMs,
    revokedAtMs: record.revokedAtMs,
  };
}

export function createFirestoreInstallationBindingStore(
  db: Firestore,
): InstallationBindingStorePort {
  const store: InstallationBindingStorePort = {
    async transact(bindingKey, transition) {
      const ref = db.collection(INSTALLATION_BINDINGS_COLLECTION).doc(bindingKey);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists
          ? parseInstallationBindingRecord(snapshot.data())
          : null;
        const result = transition(current);
        transaction.set(ref, storedInstallationBindingRecord(result.record));
        if (current !== null && current.bindingTokenHash !== result.record.bindingTokenHash) {
          const previousTokenRef = db.collection(INSTALLATION_BINDING_TOKENS_COLLECTION)
            .doc(current.bindingTokenHash);
          transaction.delete(previousTokenRef);
        }
        const tokenRef = db.collection(INSTALLATION_BINDING_TOKENS_COLLECTION)
          .doc(result.record.bindingTokenHash);
        transaction.set(tokenRef, {
          schemaVersion: 'account-authority-installation-binding-index.v1',
          bindingKey,
          bindingTokenHash: result.record.bindingTokenHash,
          authUidHash: result.record.authUidHash,
          rotatedAtMs: result.record.rotatedAtMs,
        });
        return result.response;
      });
    },
  };
  return Object.freeze(store);
}

function parseInstallationBindingIndex(value: unknown): InstallationBindingIndex {
  if (!isRecord(value)) throw invalidStoredRecord();
  const keys = Object.keys(value).sort();
  const expected = [
    'authUidHash',
    'bindingKey',
    'bindingTokenHash',
    'rotatedAtMs',
    'schemaVersion',
  ];
  if (
    keys.length !== expected.length
    || keys.some((key, index) => key !== expected[index])
    || value.schemaVersion !== 'account-authority-installation-binding-index.v1'
    || !/^[0-9a-f]{64}$/.test(String(value.bindingKey))
    || !/^[0-9a-f]{64}$/.test(String(value.bindingTokenHash))
    || !/^[0-9a-f]{64}$/.test(String(value.authUidHash))
    || !isNonNegativeSafeInteger(value.rotatedAtMs)
  ) throw invalidStoredRecord();
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    bindingKey: value.bindingKey as string,
    bindingTokenHash: value.bindingTokenHash as string,
    authUidHash: value.authUidHash as string,
    rotatedAtMs: value.rotatedAtMs,
  });
}

const LOG = '[ACCOUNT-AUTHORITY]';

type BindingRejectReason =
  | 'token_malformed'
  | 'token_unknown'
  | 'binding_missing'
  | 'binding_mismatch'
  | 'record_invalid';

function bindingRejected(): AccountAuthorityCallableError {
  return new AccountAuthorityCallableError(
    'failed-precondition',
    'account_authority_request_rejected',
  );
}

// зачем (AA S0, «сперва логи»): каждая ветка отказа пишет свою причину, чтобы
// по логу отличать подделанный/устаревший токен от отозванной привязки. Ни uid,
// ни токена, ни их хешей в лог не уходит — только код ветки.
function rejectBinding(reason: BindingRejectReason): AccountAuthorityCallableError {
  logger.warn(`${LOG} installation_binding resolve_rejected`, { reason });
  return bindingRejected();
}

function safeErrorCode(error: unknown): string {
  const code = isRecord(error) ? error.code : undefined;
  if (typeof code === 'number' && Number.isSafeInteger(code)) return String(code);
  if (typeof code === 'string' && /^[\w/-]{1,96}$/.test(code)) return code;
  return 'none';
}

/**
 * зачем (AA S0): раньше любой сбой Firestore внутри resolve (contention,
 * DEADLINE_EXCEEDED, UNAVAILABLE) превращался в «отклонено» — клиент видел отзыв
 * привязки там, где надо было просто повторить. Теперь это отдельный
 * повторяемый код `unavailable`, а причина видна в логе.
 */
function bindingUnavailable(error: unknown): AccountAuthorityCallableError {
  logger.warn(`${LOG} installation_binding resolve_unavailable`, {
    kind: error instanceof Error ? error.name : typeof error,
    code: safeErrorCode(error),
  });
  return new AccountAuthorityCallableError(
    'unavailable',
    'account_authority_installation_binding_unavailable',
  );
}

export function createFirebaseInstallationBindingIdentityPort(
  db: Firestore,
): AccountAuthorityCallableIdentityPort {
  const port: AccountAuthorityCallableIdentityPort = {
    resolve: async (source, bindingToken) => {
      try {
        if (
          typeof bindingToken !== 'string'
          || bindingToken.length < 1
          || bindingToken.length > 512
          || bindingToken.trim() !== bindingToken
        ) throw rejectBinding('token_malformed');
        const tokenHash = sha256(`account-authority-binding-token.v1\u0000${bindingToken}`);
        const authUidHash = sha256(
          `account-authority-auth-uid.v1\u0000${source.firebaseAuthUid}`,
        );
        return await db.runTransaction(async (transaction) => {
          const indexRef = db.collection(INSTALLATION_BINDING_TOKENS_COLLECTION).doc(tokenHash);
          const indexSnapshot = await transaction.get(indexRef);
          if (!indexSnapshot.exists) throw rejectBinding('token_unknown');
          const index = parseStoredOrReject(() => parseInstallationBindingIndex(indexSnapshot.data()));
          const bindingRef = db.collection(INSTALLATION_BINDINGS_COLLECTION).doc(index.bindingKey);
          const bindingSnapshot = await transaction.get(bindingRef);
          if (!bindingSnapshot.exists) throw rejectBinding('binding_missing');
          const binding = parseStoredOrReject(() => parseInstallationBindingRecord(bindingSnapshot.data()));
          if (
            index.bindingTokenHash !== tokenHash
            || binding.bindingTokenHash !== tokenHash
            || index.authUidHash !== authUidHash
            || binding.authUidHash !== authUidHash
            || index.rotatedAtMs !== binding.rotatedAtMs
            || binding.revokedAtMs !== null
          ) throw rejectBinding('binding_mismatch');
          return Object.freeze({
            tenantId: PRIMARY_TENANT_ID,
            deviceId: asDeviceId(binding.deviceBindingId),
            // The epoch is server-issued with the binding rotation. Client or
            // Firebase token timestamps are not installation proof.
            authEpoch: binding.rotatedAtMs,
          });
        });
      } catch (error) {
        if (error instanceof AccountAuthorityCallableError) throw error;
        throw bindingUnavailable(error);
      }
    },
  };
  return Object.freeze(port);
}

// Повреждённая запись не лечится повтором: это отказ, а не временный сбой.
function parseStoredOrReject<T>(parse: () => T): T {
  try {
    return parse();
  } catch {
    throw rejectBinding('record_invalid');
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function createFirebaseInstallationBindingPorts(db: Firestore): InstallationBindingPorts {
  return Object.freeze({
    hash: Object.freeze({ digest: sha256 }),
    ids: Object.freeze({
      issueBindingToken: () => randomUUID(),
      issueDeviceBindingId: () => randomUUID(),
    }),
    clock: Object.freeze({ nowMs: () => Date.now() }),
    store: createFirestoreInstallationBindingStore(db),
  });
}

function resolvePorts(dependencies: InstallationBindingCallableDependencies): InstallationBindingPorts {
  if (dependencies.ports !== undefined) return dependencies.ports;
  return dependencies.getPorts();
}

function mapCallableError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  if (error instanceof InstallationBindingError) {
    return new HttpsError(error.code, error.message);
  }
  return new HttpsError('internal', 'account_authority_installation_binding_unavailable');
}

export async function handleInstallationBindingCallable(
  dependencies: InstallationBindingCallableDependencies,
  request: InstallationBindingCallableRequest,
): Promise<InstallationBindingResponse> {
  try {
    if (dependencies.rolloutEnabled !== true) {
      throw new HttpsError(
        'failed-precondition',
        'account_authority_installation_binding_disabled',
      );
    }
    const firebaseAuthUid = request.auth?.uid;
    if (typeof firebaseAuthUid !== 'string' || firebaseAuthUid.length === 0) {
      throw new HttpsError('unauthenticated', 'account_authority_auth_required');
    }
    return await createInstallationBinding(
      resolvePorts(dependencies),
      firebaseAuthUid,
      request.data,
    );
  } catch (error) {
    throw mapCallableError(error);
  }
}

export const accountAuthorityInstallationBindingCreate = onCall(
  HOT_CALLABLE_OPTIONS,
  (request) => handleInstallationBindingCallable(
    {
      getPorts: () => createFirebaseInstallationBindingPorts(admin.firestore()),
      rolloutEnabled: false,
    },
    {
      auth: request.auth === undefined ? null : { uid: request.auth.uid },
      data: request.data,
    },
  ),
);
