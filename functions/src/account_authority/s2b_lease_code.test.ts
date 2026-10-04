/*
 * AA S2b раунд 2: точный код отказа контракта аренды уходит клиенту в
 * `details.leaseCode` — только из закрытого списка, без идентификаторов.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import {
  ACCOUNT_AUTHORITY_PUBLIC_LEASE_CODES,
  AccountAuthorityCallableError,
  accountAuthorityPublicLeaseCode,
  type AccountAuthorityCallableBoundaryPorts,
} from './callable_boundary';
import {
  handleFirebaseAccountAuthorityLeaseAcquire,
  handleFirebaseAccountAuthorityLeaseRelease,
} from './firebase_lease_callable';
import { AccountLeaseError, type AccountLeaseErrorCode } from './lease_contract';

const AUTH = { uid: 'firebase-a', token: { auth_time: 100, firebase: { sign_in_provider: 'google.com' } } };
const SESSION = 'session-0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a';

function portsThrowing(error: unknown): AccountAuthorityCallableBoundaryPorts {
  const fail = async () => { throw error; };
  return {
    lease: {
      sessions: { issueSessionId: async () => SESSION as never },
      clock: { nowMs: () => 1 },
      transactions: { transact: fail },
      bound: { transactAcquire: fail, transactRelease: fail },
    },
    deletion: {
      clock: { nowMs: () => 1 },
      bound: { transactPrepare: fail },
      claims: {} as never,
      identity: {} as never,
      transactions: {} as never,
    },
  } as unknown as AccountAuthorityCallableBoundaryPorts;
}

async function caught(promise: Promise<unknown>): Promise<HttpsError> {
  try {
    await promise;
  } catch (error) {
    return error as HttpsError;
  }
  throw new Error('expected rejection');
}

const gates = { rolloutEnabled: true, trustedInstallationBindingAvailable: true } as const;

describe('AA S2b round 2 — public lease codes', () => {
  test('allowlist passes known contract codes and hides everything else', () => {
    for (const code of ACCOUNT_AUTHORITY_PUBLIC_LEASE_CODES) {
      expect(accountAuthorityPublicLeaseCode(code)).toBe(code);
    }
    for (const leaked of ['invalid_input', 'users/account-a', 'firebase-a', '', null, 42, 'STALE_LEASE']) {
      expect(accountAuthorityPublicLeaseCode(leaked)).toBe('other');
    }
    const error = new AccountAuthorityCallableError('failed-precondition', 'account_authority_request_rejected', {
      leaseCode: 'users/account-a' as never,
    });
    expect(error.details).toEqual({ leaseCode: 'other' });
  });

  test.each([
    'revision_mismatch',
    'stale_lease',
    'stale_auth_epoch',
    'identity_mismatch',
    'account_lifecycle_blocked',
  ] as const)('acquire contract rejection %s reaches the client as details.leaseCode', async (code) => {
    const failure = await caught(handleFirebaseAccountAuthorityLeaseAcquire(
      { ...gates, ports: portsThrowing(new AccountLeaseError(code as AccountLeaseErrorCode)) },
      { auth: AUTH, app: null, data: { operationId: 'operation-a', expectedRevision: 3, bindingToken: 'binding-token-a' } },
    ));
    expect(failure).toBeInstanceOf(HttpsError);
    expect({ code: failure.code, message: failure.message, details: failure.details }).toEqual({
      code: 'failed-precondition',
      message: 'account_authority_request_rejected',
      details: { leaseCode: code },
    });
  });

  test('release contract rejection carries the code; nothing but the code is published', async () => {
    const failure = await caught(handleFirebaseAccountAuthorityLeaseRelease(
      { ...gates, ports: portsThrowing(new AccountLeaseError('stale_lease')) },
      {
        auth: AUTH,
        app: null,
        data: { operationId: 'release-a', expectedRevision: 3, sessionId: SESSION, bindingToken: 'binding-token-a' },
      },
    ));
    expect(failure.details).toEqual({ leaseCode: 'stale_lease' });
    expect(Object.keys(failure.details as object)).toEqual(['leaseCode']);
    expect(JSON.stringify(failure.details)).not.toMatch(/firebase-a|binding-token|session-0a/);
  });

  test('non-contract refusals keep no details', async () => {
    const failure = await caught(handleFirebaseAccountAuthorityLeaseAcquire(
      {
        ...gates,
        ports: portsThrowing(new AccountAuthorityCallableError('failed-precondition', 'account_authority_binding_mismatch')),
      },
      { auth: AUTH, app: null, data: { operationId: 'operation-a', expectedRevision: 3, bindingToken: 'binding-token-a' } },
    ));
    expect(failure.message).toBe('account_authority_binding_mismatch');
    expect(failure.details).toBeUndefined();
  });
});
