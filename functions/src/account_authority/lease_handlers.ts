import {
  asOperationId,
  startOrRenewAccountLease,
  type AccountId,
  type AccountLeaseAcquireResult,
  type AccountLeaseState,
  type AccountLeaseTransition,
  type AccountPrincipalResolverPort,
  type AccountRetiredSessionLookup,
  type AuthenticatedRequestContextPort,
  type ServerClockPort,
  type ServerSessionIdPort,
  type SessionId,
  type TenantId,
} from './lease_contract';

export type AccountAuthorityTransactionIdentity = Readonly<{
  accountId: AccountId;
  tenantId: TenantId;
}>;

export type AccountLeaseTransactionContext = Readonly<{
  state: AccountLeaseState;
  retiredSessions: AccountRetiredSessionLookup;
}>;

export interface AccountLeaseTransactionPort {
  /**
   * Must serialize by tenantId plus accountId, provide keyed retirement
   * existence reads for every supplied key plus the persisted active session,
   * and atomically apply returned retirement operations.
   */
  transact<T>(
    identity: AccountAuthorityTransactionIdentity,
    retirementSessionIds: readonly SessionId[],
    transition: (context: AccountLeaseTransactionContext) => AccountLeaseTransition<T>,
  ): Promise<T>;
}

export type AccountLeaseHandlerPorts<RequestContext> = Readonly<{
  auth: AuthenticatedRequestContextPort<RequestContext>;
  principals: AccountPrincipalResolverPort;
  sessions: ServerSessionIdPort;
  clock: ServerClockPort;
  transactions: AccountLeaseTransactionPort;
}>;

export type AuthenticatedLeaseAcquireRequest = Readonly<{
  operationId: string;
  expectedRevision: number;
}>;

export async function acquireAuthenticatedAccountLease<RequestContext>(
  ports: AccountLeaseHandlerPorts<RequestContext>,
  requestContext: RequestContext,
  request: AuthenticatedLeaseAcquireRequest,
): Promise<AccountLeaseAcquireResult> {
  const auth = await ports.auth.requireAuthenticated(requestContext);
  const resolved = await ports.principals.resolvePrincipal(auth);
  const sessionId = await ports.sessions.issueSessionId();
  const operationId = asOperationId(request.operationId);
  const serverNowMs = ports.clock.nowMs();
  return ports.transactions.transact(
    { accountId: resolved.accountId, tenantId: auth.tenantId },
    Object.freeze([sessionId]),
    ({ state, retiredSessions }) => startOrRenewAccountLease(state, {
      principal: Object.freeze({
        accountId: resolved.accountId,
        providerSubject: resolved.providerSubject,
        tenantId: auth.tenantId,
        firebaseAuthUid: auth.firebaseAuthUid,
        authEpoch: auth.authEpoch,
      }),
      deviceId: auth.deviceId,
      sessionId,
      operationId,
      expectedRevision: request.expectedRevision,
      serverNowMs,
    }, retiredSessions),
  );
}
