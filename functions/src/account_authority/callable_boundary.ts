import {
  AccountLeaseError,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asSessionId,
  asTenantId,
  releaseActiveAccountLease,
  startOrRenewAccountLease,
  verifiedAuthContext,
  type AccountId,
  type AccountPrincipalResolverPort,
  type DeviceId,
  type FirebaseAuthUid,
  type ServerClockPort,
  type ServerSessionIdPort,
  type SessionId,
  type TenantId,
  type VerifiedAuthContext,
} from './lease_contract';
import {
  acquireAuthenticatedAccountLease,
  type AccountLeaseHandlerPorts,
  type AccountLeaseTransactionPort,
} from './lease_handlers';
import {
  beginAuthenticatedAccountDeletion,
  type AccountDeleteHandlerPorts,
  type AccountDeleteTransactionPort,
  type AccountDeleteStatus,
  type ProviderIdentityReleasePort,
} from './delete_contract';

export type AccountAuthorityCallableErrorCode =
  | 'unauthenticated'
  | 'invalid-argument'
  | 'failed-precondition'
  // зачем (AA S0): временный сбой хранилища (contention, deadline, сеть) обязан
  // отличаться от «отклонено». Клиент повторяет unavailable, а отказ — нет.
  | 'unavailable'
  | 'internal';

/** Public, deliberately detail-free error contract for a future Firebase adapter. */
export class AccountAuthorityCallableError extends Error {
  readonly code: AccountAuthorityCallableErrorCode;

  constructor(code: AccountAuthorityCallableErrorCode, message: string) {
    super(message);
    this.name = 'AccountAuthorityCallableError';
    this.code = code;
  }
}

type UnknownRecord = Readonly<Record<string, unknown>>;

export type AccountAuthorityCallableRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown; token?: unknown }> | null;
  /** Optional because App Check enforcement is owner-sealed off in this project. */
  app?: Readonly<{ appId?: unknown; token?: unknown }> | null;
  data: unknown;
}>;

export type AccountAuthorityCallableIdentitySource = Readonly<{
  firebaseAuthUid: FirebaseAuthUid;
  authToken: UnknownRecord;
  app: Readonly<{ appId: string; token: UnknownRecord }> | null;
}>;

/**
 * Returned only by a server adapter that resolves device/session binding from
 * trusted Firebase callable metadata or durable server state. Request data is
 * intentionally absent from AccountAuthorityCallableIdentitySource.
 */
export type AccountAuthorityCallableIdentityResolution = Readonly<{
  tenantId: TenantId;
  deviceId: DeviceId;
  authEpoch: number;
  activeSessionId?: SessionId;
}>;

export interface AccountAuthorityCallableIdentityPort {
  resolve(
    source: AccountAuthorityCallableIdentitySource,
    bindingToken: string | null,
  ): Promise<AccountAuthorityCallableIdentityResolution>;
}

type LeaseBoundaryPorts = Readonly<{
  principals: AccountPrincipalResolverPort;
  sessions: ServerSessionIdPort;
  clock: ServerClockPort;
  transactions: AccountLeaseTransactionPort;
}>;

type DeleteBoundaryPorts = Readonly<{
  principals: AccountPrincipalResolverPort;
  clock: ServerClockPort;
  claims: AccountDeleteHandlerPorts<AccountAuthorityCallableRequest>['claims'];
  transactions: AccountDeleteTransactionPort;
  identity: ProviderIdentityReleasePort;
}>;

export type AccountAuthorityCallableBoundaryPorts = Readonly<{
  identities: AccountAuthorityCallableIdentityPort;
  lease: LeaseBoundaryPorts;
  deletion: DeleteBoundaryPorts;
}>;

export type AccountAuthorityLeaseCallableResponse = Readonly<{
  schemaVersion: 'account-authority-lease.v1';
  type: 'acquired' | 'renewed';
  accountId: AccountId;
  sessionId: SessionId;
  revision: number;
  idempotent: boolean;
  previousLeaseRevoked: boolean;
}>;

export type AccountAuthorityLeaseReleaseCallableResponse = Readonly<{
  schemaVersion: 'account-authority-lease-release.v1';
  type: 'released';
  revision: number;
  idempotent: boolean;
}>;

export type AccountAuthorityDeleteCallableResponse = Readonly<{
  schemaVersion: 'account-authority-delete.v1';
  jobId: string;
  status: AccountDeleteStatus;
  createdAtMs: number;
  updatedAtMs: number;
}>;

type ParsedOperationRequest = Readonly<{
  operationId: string;
  expectedRevision: number;
}>;

type ParsedLeaseRequest = Readonly<{
  operationId: string;
  expectedRevision: number | null;
  bindingToken: string;
}>;

type ParsedReleaseRequest = Readonly<{
  operationId: string;
  expectedRevision: number;
  sessionId: SessionId;
  bindingToken: string;
}>;

function publicError(
  code: AccountAuthorityCallableErrorCode,
  message: string,
): AccountAuthorityCallableError {
  return new AccountAuthorityCallableError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function frozenRecord(value: unknown): UnknownRecord | null {
  if (!isRecord(value)) return null;
  return Object.freeze({ ...value });
}

function validMetadataId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 256
    && value.trim() === value
    && !value.includes('..')
    && !/[\\/\u0000-\u001f\u007f]/.test(value)
    && !/%2e|%2f|%5c/i.test(value);
}

function parseOperationRequest(data: unknown): ParsedOperationRequest {
  if (!isRecord(data)) {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
  const keys = Object.keys(data).sort();
  if (keys.length !== 2 || keys[0] !== 'expectedRevision' || keys[1] !== 'operationId') {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
  if (!Number.isSafeInteger(data.expectedRevision) || (data.expectedRevision as number) < 0) {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
  try {
    return Object.freeze({
      operationId: asOperationId(data.operationId),
      expectedRevision: data.expectedRevision as number,
    });
  } catch {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
}

function parseLeaseRequest(data: unknown): ParsedLeaseRequest {
  if (!isRecord(data)) {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
  const keys = Object.keys(data).sort();
  if (
    keys.length !== 3
    || keys[0] !== 'bindingToken'
    || keys[1] !== 'expectedRevision'
    || keys[2] !== 'operationId'
    || (
      data.expectedRevision !== null
      && (!Number.isSafeInteger(data.expectedRevision) || (data.expectedRevision as number) < 0)
    )
    || typeof data.bindingToken !== 'string'
    || data.bindingToken.length < 1
    || data.bindingToken.length > 512
    || data.bindingToken.trim() !== data.bindingToken
  ) {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
  try {
    return Object.freeze({
      operationId: asOperationId(data.operationId),
      expectedRevision: data.expectedRevision as number | null,
      bindingToken: data.bindingToken,
    });
  } catch {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
}

function parseReleaseRequest(data: unknown): ParsedReleaseRequest {
  if (!isRecord(data)) {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
  const keys = Object.keys(data).sort();
  if (
    keys.length !== 4
    || keys[0] !== 'bindingToken'
    || keys[1] !== 'expectedRevision'
    || keys[2] !== 'operationId'
    || keys[3] !== 'sessionId'
    || !Number.isSafeInteger(data.expectedRevision)
    || (data.expectedRevision as number) < 0
    || typeof data.bindingToken !== 'string'
    || data.bindingToken.length < 1
    || data.bindingToken.length > 512
    || data.bindingToken.trim() !== data.bindingToken
  ) {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
  try {
    return Object.freeze({
      operationId: asOperationId(data.operationId),
      expectedRevision: data.expectedRevision as number,
      sessionId: asSessionId(data.sessionId),
      bindingToken: data.bindingToken,
    });
  } catch {
    throw publicError('invalid-argument', 'account_authority_request_invalid');
  }
}

function parseIdentitySource(request: AccountAuthorityCallableRequest): AccountAuthorityCallableIdentitySource {
  const authToken = frozenRecord(request.auth?.token);
  if (request.auth == null || authToken === null) {
    throw publicError('unauthenticated', 'account_authority_auth_required');
  }
  let firebaseAuthUid: FirebaseAuthUid;
  try {
    firebaseAuthUid = asFirebaseAuthUid(request.auth.uid);
  } catch {
    throw publicError('unauthenticated', 'account_authority_auth_invalid');
  }

  let app: AccountAuthorityCallableIdentitySource['app'] = null;
  if (request.app != null) {
    const appToken = frozenRecord(request.app.token);
    if (!validMetadataId(request.app.appId) || appToken === null) {
      throw publicError('unauthenticated', 'account_authority_auth_invalid');
    }
    app = Object.freeze({ appId: request.app.appId, token: appToken });
  }
  return Object.freeze({ firebaseAuthUid, authToken, app });
}

async function resolveIdentity(
  port: AccountAuthorityCallableIdentityPort,
  source: AccountAuthorityCallableIdentitySource,
  bindingToken: string | null,
): Promise<Readonly<{
  auth: VerifiedAuthContext;
  activeSessionId: SessionId | null;
}>> {
  try {
    const resolved = await port.resolve(source, bindingToken);
    const auth = verifiedAuthContext({
      tenantId: asTenantId(resolved.tenantId),
      firebaseAuthUid: source.firebaseAuthUid,
      deviceId: asDeviceId(resolved.deviceId),
      authEpoch: resolved.authEpoch,
    });
    const activeSessionId = resolved.activeSessionId === undefined
      ? null
      : asSessionId(resolved.activeSessionId);
    return Object.freeze({ auth, activeSessionId });
  } catch (error) {
    if (error instanceof AccountAuthorityCallableError) throw error;
    throw publicError('internal', 'account_authority_unavailable');
  }
}

async function acquireWithServerRevision(
  ports: LeaseBoundaryPorts,
  auth: VerifiedAuthContext,
  request: Readonly<{ operationId: string }>,
) {
  const principal = await ports.principals.resolvePrincipal(auth);
  const sessionId = await ports.sessions.issueSessionId();
  const operationId = asOperationId(request.operationId);
  const serverNowMs = ports.clock.nowMs();
  return ports.transactions.transact(
    { accountId: principal.accountId, tenantId: auth.tenantId },
    Object.freeze([sessionId]),
    ({ state, retiredSessions }) => {
      const prior = state.receiptLedger.entries.find(
        (receipt) => receipt.operationId === operationId,
      );
      return startOrRenewAccountLease(state, {
      principal: Object.freeze({
        accountId: principal.accountId,
        providerSubject: principal.providerSubject,
        tenantId: auth.tenantId,
        firebaseAuthUid: auth.firebaseAuthUid,
        authEpoch: auth.authEpoch,
      }),
      deviceId: auth.deviceId,
      sessionId,
      operationId,
      // Explicit null bootstrap is resolved from the serialized server state.
      // Existing accounts therefore never receive a client-invented revision 0.
      expectedRevision: prior?.kind === 'acquire'
        ? prior.expectedRevision
        : state.revision,
      serverNowMs,
      }, retiredSessions);
    },
  );
}

function fixedAuthPort(
  context: VerifiedAuthContext,
): AccountLeaseHandlerPorts<AccountAuthorityCallableRequest>['auth'] {
  return Object.freeze({
    async requireAuthenticated() {
      return context;
    },
  });
}

function mapContractError(error: unknown): AccountAuthorityCallableError {
  if (error instanceof AccountAuthorityCallableError) return error;
  if (error instanceof AccountLeaseError && error.code !== 'invalid_input') {
    return publicError('failed-precondition', 'account_authority_request_rejected');
  }
  if (error instanceof Error && error.message.startsWith('account_authority_delete_')) {
    return publicError('failed-precondition', 'account_authority_request_rejected');
  }
  return publicError('internal', 'account_authority_unavailable');
}

export async function handleAccountLeaseAcquireCallable(
  ports: AccountAuthorityCallableBoundaryPorts,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityLeaseCallableResponse> {
  const data = parseLeaseRequest(request.data);
  const source = parseIdentitySource(request);
  const identity = await resolveIdentity(ports.identities, source, data.bindingToken);
  try {
    const result = data.expectedRevision === null
      ? await acquireWithServerRevision(ports.lease, identity.auth, data)
      : await acquireAuthenticatedAccountLease({
        ...ports.lease,
        auth: fixedAuthPort(identity.auth),
      }, request, {
        operationId: data.operationId,
        expectedRevision: data.expectedRevision,
      });
    return Object.freeze({
      schemaVersion: 'account-authority-lease.v1' as const,
      type: result.type,
      accountId: result.lease.accountId,
      sessionId: result.lease.sessionId,
      revision: result.lease.revision,
      idempotent: result.idempotent,
      previousLeaseRevoked: result.revokedLease !== null,
    });
  } catch (error) {
    throw mapContractError(error);
  }
}

export async function handleAccountLeaseReleaseCallable(
  ports: AccountAuthorityCallableBoundaryPorts,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityLeaseReleaseCallableResponse> {
  const data = parseReleaseRequest(request.data);
  const source = parseIdentitySource(request);
  const identity = await resolveIdentity(ports.identities, source, data.bindingToken);
  if (identity.activeSessionId !== null && identity.activeSessionId !== data.sessionId) {
    throw publicError('failed-precondition', 'account_authority_request_rejected');
  }
  try {
    const principal = await ports.lease.principals.resolvePrincipal(identity.auth);
    const operationId = asOperationId(data.operationId);
    const serverNowMs = ports.lease.clock.nowMs();
    const result = await ports.lease.transactions.transact(
      { accountId: principal.accountId, tenantId: identity.auth.tenantId },
      Object.freeze([data.sessionId]),
      ({ state, retiredSessions }) => releaseActiveAccountLease(state, {
        accountId: principal.accountId,
        tenantId: identity.auth.tenantId,
        deviceId: identity.auth.deviceId,
        sessionId: data.sessionId,
        operationId,
        expectedRevision: data.expectedRevision,
        serverNowMs,
      }, retiredSessions),
    );
    return Object.freeze({
      schemaVersion: 'account-authority-lease-release.v1' as const,
      type: result.type,
      revision: result.revision,
      idempotent: result.idempotent,
    });
  } catch (error) {
    throw mapContractError(error);
  }
}

export async function handleAccountDeleteBeginCallable(
  ports: AccountAuthorityCallableBoundaryPorts,
  request: AccountAuthorityCallableRequest,
): Promise<AccountAuthorityDeleteCallableResponse> {
  const data = parseOperationRequest(request.data);
  const source = parseIdentitySource(request);
  const identity = await resolveIdentity(ports.identities, source, null);
  if (identity.activeSessionId === null) {
    throw publicError('failed-precondition', 'account_authority_request_rejected');
  }
  try {
    const result = await beginAuthenticatedAccountDeletion({
      ...ports.deletion,
      auth: fixedAuthPort(identity.auth),
    }, request, {
      operationId: data.operationId,
      expectedRevision: data.expectedRevision,
      sessionId: identity.activeSessionId,
    });
    return Object.freeze({
      schemaVersion: 'account-authority-delete.v1' as const,
      jobId: result.jobId,
      status: result.status,
      createdAtMs: result.createdAtMs,
      updatedAtMs: result.updatedAtMs,
    });
  } catch (error) {
    throw mapContractError(error);
  }
}
