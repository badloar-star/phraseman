import { createHash, randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from '../callable_options';
import { createFirebaseInstallationBindingIdentityPort } from './installation_binding_callable';
import {
  AccountAuthorityCallableError,
  handleAccountLeaseAcquireCallable,
  handleAccountLeaseReleaseCallable,
  type AccountAuthorityCallableBoundaryPorts,
  type AccountAuthorityCallableRequest,
  type AccountAuthorityLeaseCallableResponse,
  type AccountAuthorityLeaseReleaseCallableResponse,
} from './callable_boundary';
import {
  asAccountId,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asProviderSubject,
  asSessionId,
  asTenantId,
  createEmptyAccountLeaseState,
  type AccountId,
  type AccountLeaseAcquireResult,
  type AccountLeaseOperationReceipt,
  type AccountLeaseState,
  type AccountRetiredSessionLookup,
  type FirebaseAuthUid,
  type ProviderSubject,
  type SessionId,
  type TenantId,
} from './lease_contract';

const PRINCIPALS_COLLECTION = 'account_authority_principals_v1';
const ACCOUNTS_COLLECTION = 'account_authority_accounts_v1';
const RETIRED_SESSIONS_COLLECTION = 'retired_sessions';
type UnknownRecord = Record<string, unknown>;

type FirebaseAccountAuthorityLeaseGateDependencies = Readonly<{
  rolloutEnabled?: boolean;
  trustedInstallationBindingAvailable?: boolean;
}>;

export type FirebaseAccountAuthorityLeaseDependencies =
  FirebaseAccountAuthorityLeaseGateDependencies & (
    | Readonly<{
      ports: AccountAuthorityCallableBoundaryPorts;
      getPorts?: never;
    }>
    | Readonly<{
      ports?: never;
      getPorts: () => AccountAuthorityCallableBoundaryPorts;
    }>
  );

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  return value as number;
}

function positiveInteger(value: unknown): number {
  const parsed = nonNegativeInteger(value);
  if (parsed < 1) throw new Error('account_authority_firestore_state_invalid');
  return parsed;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function activeLease(value: unknown): AccountLeaseState['activeLease'] {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error('account_authority_firestore_state_invalid');
  return Object.freeze({
    accountId: asAccountId(value.accountId),
    tenantId: asTenantId(value.tenantId),
    firebaseAuthUid: asFirebaseAuthUid(value.firebaseAuthUid),
    providerSubject: asProviderSubject(value.providerSubject),
    authEpoch: nonNegativeInteger(value.authEpoch),
    deviceId: asDeviceId(value.deviceId),
    sessionId: asSessionId(value.sessionId),
    issuedAtMs: nonNegativeInteger(value.issuedAtMs),
    renewedAtMs: nonNegativeInteger(value.renewedAtMs),
    revision: nonNegativeInteger(value.revision),
  });
}

function acquireResult(value: unknown): AccountLeaseAcquireResult {
  if (!isRecord(value) || (value.type !== 'acquired' && value.type !== 'renewed')) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  if (typeof value.idempotent !== 'boolean') {
    throw new Error('account_authority_firestore_state_invalid');
  }
  const lease = activeLease(value.lease);
  if (lease === null) throw new Error('account_authority_firestore_state_invalid');
  const revoked = value.revokedLease;
  let revokedLease: AccountLeaseAcquireResult['revokedLease'] = null;
  if (revoked !== null) {
    if (!isRecord(revoked)) throw new Error('account_authority_firestore_state_invalid');
    const parsed = activeLease(revoked);
    if (parsed === null) throw new Error('account_authority_firestore_state_invalid');
    revokedLease = Object.freeze({ ...parsed, revokedAtMs: nonNegativeInteger(revoked.revokedAtMs) });
  }
  return Object.freeze({ type: value.type, lease, revokedLease, idempotent: value.idempotent });
}

function operationReceipt(value: unknown): AccountLeaseOperationReceipt {
  if (!isRecord(value) || (value.kind !== 'acquire' && value.kind !== 'release')) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  const common = {
    operationId: asOperationId(value.operationId),
    accountId: asAccountId(value.accountId),
    tenantId: asTenantId(value.tenantId),
    deviceId: asDeviceId(value.deviceId),
    expectedRevision: nonNegativeInteger(value.expectedRevision),
    expiresAtMs: nonNegativeInteger(value.expiresAtMs),
  };
  if (value.kind === 'acquire') {
    return Object.freeze({
      kind: 'acquire' as const,
      ...common,
      firebaseAuthUid: asFirebaseAuthUid(value.firebaseAuthUid),
      providerSubject: asProviderSubject(value.providerSubject),
      authEpoch: nonNegativeInteger(value.authEpoch),
      result: acquireResult(value.result),
    });
  }
  if (!isRecord(value.result) || value.result.type !== 'released' || typeof value.result.idempotent !== 'boolean') {
    throw new Error('account_authority_firestore_state_invalid');
  }
  return Object.freeze({
    kind: 'release' as const,
    ...common,
    sessionId: asSessionId(value.sessionId),
    result: Object.freeze({
      type: 'released' as const,
      revision: nonNegativeInteger(value.result.revision),
      idempotent: value.result.idempotent,
    }),
  });
}

function leaseState(value: unknown, accountId: AccountId, tenantId: TenantId): AccountLeaseState {
  if (!isRecord(value) || value.schemaVersion !== 'account-authority-firestore-lease.v1') {
    throw new Error('account_authority_firestore_state_invalid');
  }
  if (!isRecord(value.lifecycle) || !isRecord(value.receiptLedger)) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  const storedAccountId = asAccountId(value.accountId);
  const storedTenantId = asTenantId(value.tenantId);
  if (storedAccountId !== accountId || storedTenantId !== tenantId) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  let lifecycle: AccountLeaseState['lifecycle'];
  if (value.lifecycle.status === 'active') {
    lifecycle = Object.freeze({ status: 'active' as const });
  } else if (value.lifecycle.status === 'deleting' || value.lifecycle.status === 'deleted') {
    if (typeof value.lifecycle.jobId !== 'string') throw new Error('account_authority_firestore_state_invalid');
    lifecycle = Object.freeze({
      status: value.lifecycle.status,
      jobId: value.lifecycle.jobId,
      changedAtMs: nonNegativeInteger(value.lifecycle.changedAtMs),
    });
  } else {
    throw new Error('account_authority_firestore_state_invalid');
  }
  if (!Array.isArray(value.receiptLedger.entries)) {
    throw new Error('account_authority_firestore_state_invalid');
  }
  const latestAuthEpoch = value.latestAuthEpoch === null
    ? null
    : nonNegativeInteger(value.latestAuthEpoch);
  return Object.freeze({
    accountId,
    tenantId,
    lifecycle,
    revision: nonNegativeInteger(value.revision),
    activeLease: activeLease(value.activeLease),
    latestAuthEpoch,
    receiptLedger: Object.freeze({
      maxEntries: positiveInteger(value.receiptLedger.maxEntries),
      retentionMs: positiveInteger(value.receiptLedger.retentionMs),
      entries: Object.freeze(value.receiptLedger.entries.map(operationReceipt)),
    }),
    lastServerNowMs: nonNegativeInteger(value.lastServerNowMs),
  });
}

function storedLeaseState(state: AccountLeaseState): UnknownRecord {
  return { schemaVersion: 'account-authority-firestore-lease.v1', ...state };
}

function principalKey(tenantId: TenantId, firebaseAuthUid: FirebaseAuthUid): string {
  return sha256(JSON.stringify([tenantId, firebaseAuthUid]));
}

function providerSubject(firebaseAuthUid: FirebaseAuthUid): ProviderSubject {
  return asProviderSubject(`firebase-${sha256(firebaseAuthUid)}`);
}

export function createFirebaseLeasePorts(db: Firestore): AccountAuthorityCallableBoundaryPorts {
  const principals: AccountAuthorityCallableBoundaryPorts['lease']['principals'] = {
    resolvePrincipal: async (context) => {
      const ref = db.collection(PRINCIPALS_COLLECTION).doc(
        principalKey(context.tenantId, context.firebaseAuthUid),
      );
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (snapshot.exists) {
          const data = snapshot.data();
          if (!isRecord(data) || data.schemaVersion !== 'account-authority-principal.v1') {
            throw new Error('account_authority_principal_invalid');
          }
          const storedTenant = asTenantId(data.tenantId);
          const storedUid = asFirebaseAuthUid(data.firebaseAuthUid);
          if (storedTenant !== context.tenantId || storedUid !== context.firebaseAuthUid) {
            throw new Error('account_authority_principal_invalid');
          }
          return Object.freeze({
            accountId: asAccountId(data.accountId),
            providerSubject: asProviderSubject(data.providerSubject),
          });
        }
        const accountId = asAccountId(`acct-${randomUUID()}`);
        const subject = providerSubject(context.firebaseAuthUid);
        transaction.create(ref, {
          schemaVersion: 'account-authority-principal.v1',
          accountId,
          tenantId: context.tenantId,
          firebaseAuthUid: context.firebaseAuthUid,
          providerSubject: subject,
          createdAtMs: Date.now(),
        });
        return Object.freeze({ accountId, providerSubject: subject });
      });
    },
  };

  const transactions: AccountAuthorityCallableBoundaryPorts['lease']['transactions'] = {
    transact: async (identity, retirementSessionIds, transition) => {
      const accountRef = db.collection(ACCOUNTS_COLLECTION).doc(identity.accountId);
      return db.runTransaction(async (transaction) => {
        const accountSnapshot = await transaction.get(accountRef);
        const state = accountSnapshot.exists
          ? leaseState(accountSnapshot.data(), identity.accountId, identity.tenantId)
          : createEmptyAccountLeaseState(identity.accountId, identity.tenantId);
        const sessionIds = new Map<string, SessionId>();
        for (const sessionId of retirementSessionIds) sessionIds.set(sessionId, sessionId);
        if (state.activeLease !== null) {
          sessionIds.set(state.activeLease.sessionId, state.activeLease.sessionId);
        }
        const retired = new Set<string>();
        for (const sessionId of sessionIds.values()) {
          const retirementRef = accountRef.collection(RETIRED_SESSIONS_COLLECTION).doc(sessionId);
          const retirement = await transaction.get(retirementRef);
          if (retirement.exists) retired.add(sessionId);
        }
        const lookup: AccountRetiredSessionLookup = Object.freeze({
          isRetired: (sessionId: SessionId) => retired.has(sessionId),
        });
        const result = transition({ state, retiredSessions: lookup });
        transaction.set(accountRef, storedLeaseState(result.state));
        for (const operation of result.retirements) {
          const retirementRef = accountRef.collection(RETIRED_SESSIONS_COLLECTION).doc(operation.sessionId);
          transaction.create(retirementRef, {
            schemaVersion: 'account-authority-retired-session.v1',
            accountId: identity.accountId,
            tenantId: identity.tenantId,
            sessionId: operation.sessionId,
            retiredAtMs: result.state.lastServerNowMs,
          });
        }
        return result.result;
      });
    },
  };

  const installationBindingIdentities = createFirebaseInstallationBindingIdentityPort(db);
  const identities: AccountAuthorityCallableBoundaryPorts['identities'] = {
    async resolve(source, bindingToken) {
      const binding = await installationBindingIdentities.resolve(source, bindingToken);
      const principalRef = db.collection(PRINCIPALS_COLLECTION).doc(
        principalKey(binding.tenantId, source.firebaseAuthUid),
      );
      const activeSessionId = await db.runTransaction(async (transaction) => {
        const principalSnapshot = await transaction.get(principalRef);
        if (!principalSnapshot.exists) return undefined;
        const principalData = principalSnapshot.data();
        if (
          !isRecord(principalData)
          || principalData.schemaVersion !== 'account-authority-principal.v1'
          || asTenantId(principalData.tenantId) !== binding.tenantId
          || asFirebaseAuthUid(principalData.firebaseAuthUid) !== source.firebaseAuthUid
        ) throw new Error('account_authority_principal_invalid');
        const accountId = asAccountId(principalData.accountId);
        const accountRef = db.collection(ACCOUNTS_COLLECTION).doc(accountId);
        const accountSnapshot = await transaction.get(accountRef);
        if (!accountSnapshot.exists) return undefined;
        const state = leaseState(accountSnapshot.data(), accountId, binding.tenantId);
        return state.activeLease?.sessionId;
      });
      return Object.freeze({ ...binding, activeSessionId });
    },
  };

  return Object.freeze({
    identities,
    lease: {
      principals,
      sessions: { issueSessionId: async () => asSessionId(`session-${randomUUID()}`) },
      clock: { nowMs: () => Date.now() },
      transactions,
    },
    deletion: {
      principals,
      clock: { nowMs: () => Date.now() },
      claims: { issueClaimId: () => { throw new Error('account_authority_delete_not_wired'); } },
      transactions: { transact: async () => { throw new Error('account_authority_delete_not_wired'); } },
      identity: {
        releaseProviderIdentity: async () => { throw new Error('account_authority_delete_not_wired'); },
      },
    },
  });
}

function mapCallableError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  if (error instanceof AccountAuthorityCallableError) {
    return new HttpsError(error.code, error.message);
  }
  return new HttpsError('internal', 'account_authority_unavailable');
}

function resolveCallablePorts(
  dependencies: FirebaseAccountAuthorityLeaseDependencies,
): AccountAuthorityCallableBoundaryPorts {
  if (dependencies.ports !== undefined) return dependencies.ports;
  return dependencies.getPorts();
}

export async function handleFirebaseAccountAuthorityLeaseAcquire(
  dependencies: FirebaseAccountAuthorityLeaseDependencies,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityLeaseCallableResponse> {
  try {
    if (dependencies.rolloutEnabled !== true) {
      throw new HttpsError('failed-precondition', 'account_authority_disabled');
    }
    if (dependencies.trustedInstallationBindingAvailable !== true) {
      throw new HttpsError(
        'failed-precondition',
        'account_authority_installation_binding_unavailable',
      );
    }
    return await handleAccountLeaseAcquireCallable(resolveCallablePorts(dependencies), request);
  } catch (error) {
    throw mapCallableError(error);
  }
}

export async function handleFirebaseAccountAuthorityLeaseRelease(
  dependencies: FirebaseAccountAuthorityLeaseDependencies,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityLeaseReleaseCallableResponse> {
  try {
    if (dependencies.rolloutEnabled !== true) {
      throw new HttpsError('failed-precondition', 'account_authority_disabled');
    }
    if (dependencies.trustedInstallationBindingAvailable !== true) {
      throw new HttpsError(
        'failed-precondition',
        'account_authority_installation_binding_unavailable',
      );
    }
    return await handleAccountLeaseReleaseCallable(resolveCallablePorts(dependencies), request);
  } catch (error) {
    throw mapCallableError(error);
  }
}

export const accountAuthorityLeaseAcquire = onCall(HOT_CALLABLE_OPTIONS, (request) => (
  handleFirebaseAccountAuthorityLeaseAcquire(
    {
      getPorts: () => createFirebaseLeasePorts(admin.firestore()),
      rolloutEnabled: false,
      trustedInstallationBindingAvailable: false,
    },
    {
      auth: request.auth ?? null,
      app: request.app ?? null,
      data: request.data,
    },
  )
));

export const accountAuthorityLeaseRelease = onCall(HOT_CALLABLE_OPTIONS, (request) => (
  handleFirebaseAccountAuthorityLeaseRelease(
    {
      getPorts: () => createFirebaseLeasePorts(admin.firestore()),
      rolloutEnabled: false,
      trustedInstallationBindingAvailable: false,
    },
    {
      auth: request.auth ?? null,
      app: request.app ?? null,
      data: request.data,
    },
  )
));
