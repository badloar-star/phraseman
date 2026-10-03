import {
  parseAccountId,
  parseDeviceId,
  parseOperationId,
  parseSessionId,
} from '../modules/account-authority-v2/account_authority_ids';
import {
  initialAccountAuthorityState,
  reduceAccountAuthorityState,
  evaluatePreservedDomainCommit,
  type AccountAuthorityEvent,
} from '../modules/account-authority-v2/account_authority_reducer';
import { accountAuthorityGeneration, type AccountAuthorityCommand } from
  '../modules/account-authority-v2/account_authority_contract';

const deviceId = parseDeviceId('device-01');
const accountA = parseAccountId('account-a');
const accountB = parseAccountId('account-b');
const sessionA = parseSessionId('session-a');
const sessionB = parseSessionId('session-b');
const operation = parseOperationId('operation-01');
const attemptA = parseOperationId('attempt-a');
const attemptB = parseOperationId('attempt-b');

function event<T extends AccountAuthorityEvent>(value: T): T { return value; }

function authenticatedState(
  base: ReturnType<typeof initialAccountAuthorityState>,
  accountId = accountA,
  sessionId = sessionA,
  attemptId = attemptA,
) {
  const started = reduceAccountAuthorityState(base, event({ type: 'authentication_started', attemptId })).state;
  return reduceAccountAuthorityState(started, event({
    type: 'authenticated', accountId, sessionId,
    expectedGeneration: started.generation, expectedAttemptId: attemptId,
  })).state;
}

describe('Account Authority 2.0 pure reducer', () => {
  test('boot → authenticating → authenticated is deterministic and frozen', () => {
    let current = initialAccountAuthorityState(deviceId);
    expect(current.phase).toBe('booting');

    current = reduceAccountAuthorityState(current, event({ type: 'authentication_started', attemptId: attemptA })).state;
    expect(current.phase).toBe('authenticating');

    const authenticated = reduceAccountAuthorityState(current, event({
      type: 'authenticated', accountId: accountA, sessionId: sessionA,
      expectedGeneration: current.generation, expectedAttemptId: attemptA,
    }));
    expect(authenticated.state).toMatchObject({ phase: 'authenticated', accountId: accountA, sessionId: sessionA });
    expect(Object.isFrozen(authenticated.state)).toBe(true);
  });

  test('provider cancellation preserves the last authenticated account', () => {
    const current = authenticatedState(initialAccountAuthorityState(deviceId));
    const authenticating = reduceAccountAuthorityState(current, event({
      type: 'authentication_started', attemptId: attemptB,
    })).state;
    const authenticated = reduceAccountAuthorityState(authenticating, event({
      type: 'provider_cancelled', attemptId: attemptB,
    }));

    expect(authenticated.state.phase).toBe('authenticated');
    expect(authenticated.state.accountId).toEqual(accountA);
    expect(authenticated.result).toEqual({ type: 'cancelled', reason: 'provider_cancelled' });
  });

  test('device takeover invalidates the old account generation and clears ownership', () => {
    const result = reduceAccountAuthorityState(
      authenticatedState(initialAccountAuthorityState(deviceId)),
      event({
        type: 'device_taken_over', revokedSessionId: sessionA,
        expectedGeneration: accountAuthorityGeneration(0),
      }),
    );

    expect(result.state.phase).toBe('device_taken_over');
    expect(result.state).not.toHaveProperty('accountId');
    expect(result.state).not.toHaveProperty('sessionId');
    expect(result.state.generation.value).toBe(1);
    expect(result.result?.type).toBe('device_taken_over');
  });

  test('sign-out and local deletion clear ownership before remote work', () => {
    const signedOut = reduceAccountAuthorityState(
      authenticatedState(initialAccountAuthorityState(deviceId)),
      event({ type: 'signed_out' }),
    );
    expect(signedOut.state.phase).toBe('signed_out');
    expect(signedOut.state).not.toHaveProperty('accountId');
    expect(signedOut.state.generation.value).toBe(1);

    const deleting = reduceAccountAuthorityState(
      authenticatedState(initialAccountAuthorityState(deviceId), accountB),
      event({ type: 'local_deleted' }),
    );
    expect(deleting.state.phase).toBe('signed_out');
    expect(deleting.state).not.toHaveProperty('accountId');
    expect(deleting.result?.type).toBe('local_deleted');
  });

  test('preserved-domain commit rejects stale generation/session/account ownership', () => {
    const authenticated = authenticatedState(initialAccountAuthorityState(deviceId));
    const base = {
      type: 'commit_preserved_domain' as const,
      operationId: operation,
      accountId: accountA,
      sessionId: sessionA,
      expectedGeneration: authenticated.generation,
      domain: 'lesson_progress' as const,
    } satisfies Extract<AccountAuthorityCommand, { type: 'commit_preserved_domain' }>;

    expect(evaluatePreservedDomainCommit(authenticated, base)).toEqual({
      type: 'committed', operationId: operation, domain: 'lesson_progress',
    });
    expect(evaluatePreservedDomainCommit(
      authenticated,
      { ...base, expectedGeneration: accountAuthorityGeneration(authenticated.generation.value + 1) },
    )).toEqual({ type: 'rejected', operationId: operation, reason: 'stale_generation' });
    expect(evaluatePreservedDomainCommit(authenticated, { ...base, accountId: accountB })).toEqual({
      type: 'rejected', operationId: operation, reason: 'stale_session',
    });
    const signedOut = reduceAccountAuthorityState(authenticated, event({ type: 'signed_out' })).state;
    expect(evaluatePreservedDomainCommit(signedOut, base)).toEqual({
      type: 'rejected', operationId: operation, reason: 'not_authenticated',
    });
  });

  test('late authenticated callbacks cannot resurrect a taken-over or signed-out account', () => {
    let current = initialAccountAuthorityState(deviceId);
    current = reduceAccountAuthorityState(current, event({ type: 'authentication_started', attemptId: attemptA })).state;
    const oldGeneration = current.generation;
    current = reduceAccountAuthorityState(current, event({
      type: 'authenticated', accountId: accountA, sessionId: sessionA,
      expectedGeneration: oldGeneration, expectedAttemptId: attemptA,
    })).state;
    current = reduceAccountAuthorityState(current, event({
      type: 'device_taken_over', revokedSessionId: sessionA, expectedGeneration: oldGeneration,
    })).state;

    const afterTakeover = reduceAccountAuthorityState(current, event({
      type: 'authenticated', accountId: accountA, sessionId: sessionA,
      expectedGeneration: oldGeneration, expectedAttemptId: attemptA,
    }));
    expect(afterTakeover.state).toEqual(current);
    expect(afterTakeover.state.phase).toBe('device_taken_over');

    current = authenticatedState(current, accountB, sessionB, attemptB);
    const afterOldTakeover = reduceAccountAuthorityState(current, event({
      type: 'device_taken_over', revokedSessionId: sessionA, expectedGeneration: oldGeneration,
    }));
    expect(afterOldTakeover.state).toEqual(current);
    expect(afterOldTakeover.state.phase).toBe('authenticated');
    const signedOut = reduceAccountAuthorityState(current, event({ type: 'signed_out' })).state;
    const afterSignOut = reduceAccountAuthorityState(signedOut, event({
      type: 'authenticated', accountId: accountB, sessionId: sessionB,
      expectedGeneration: current.generation, expectedAttemptId: attemptB,
    }));
    expect(afterSignOut.state).toEqual(signedOut);
    expect(afterSignOut.state.phase).toBe('signed_out');
  });

  test('late success from cancelled attempt A cannot win over active attempt B', () => {
    let current = initialAccountAuthorityState(deviceId);
    current = reduceAccountAuthorityState(current, event({
      type: 'authentication_started', attemptId: attemptA,
    })).state;
    current = reduceAccountAuthorityState(current, event({ type: 'provider_cancelled', attemptId: attemptA })).state;
    current = reduceAccountAuthorityState(current, event({
      type: 'authentication_started', attemptId: attemptB,
    })).state;

    const lateA = reduceAccountAuthorityState(current, event({
      type: 'authenticated', accountId: accountA, sessionId: sessionA,
      expectedGeneration: current.generation, expectedAttemptId: attemptA,
    }));
    expect(lateA.state).toEqual(current);
    expect(lateA.state.phase).toBe('authenticating');

    const acceptedB = reduceAccountAuthorityState(current, event({
      type: 'authenticated', accountId: accountB, sessionId: sessionB,
      expectedGeneration: current.generation, expectedAttemptId: attemptB,
    }));
    expect(acceptedB.state.phase).toBe('authenticated');
    expect(acceptedB.state.accountId).toEqual(accountB);
  });

  test('takeover of the retained session during auth cannot be restored by cancellation', () => {
    const current = authenticatedState(initialAccountAuthorityState(deviceId));
    const authenticating = reduceAccountAuthorityState(current, event({
      type: 'authentication_started', attemptId: attemptB,
    })).state;
    const takenOver = reduceAccountAuthorityState(authenticating, event({
      type: 'device_taken_over', revokedSessionId: sessionA,
      expectedGeneration: current.generation,
    }));
    expect(takenOver.state.phase).toBe('device_taken_over');

    const cancelled = reduceAccountAuthorityState(takenOver.state, event({
      type: 'provider_cancelled', attemptId: attemptB,
    }));
    expect(cancelled.state).toEqual(takenOver.state);
    expect(cancelled.state.phase).toBe('device_taken_over');
  });

  test('overlapping authentication attempts carry the original fallback forward', () => {
    const current = authenticatedState(initialAccountAuthorityState(deviceId));
    const attemptBState = reduceAccountAuthorityState(current, event({
      type: 'authentication_started', attemptId: attemptB,
    })).state;
    const attemptCState = reduceAccountAuthorityState(attemptBState, event({
      type: 'authentication_started', attemptId: operation,
    })).state;
    const cancelled = reduceAccountAuthorityState(attemptCState, event({
      type: 'provider_cancelled', attemptId: operation,
    }));

    expect(cancelled.state.phase).toBe('authenticated');
    expect(cancelled.state.accountId).toEqual(accountA);
    expect(cancelled.state.sessionId).toEqual(sessionA);
  });
});
