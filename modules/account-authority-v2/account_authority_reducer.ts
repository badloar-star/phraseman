import {
  freezeAccountAuthorityResult,
  freezeAccountAuthorityState,
  type AccountAuthorityCommand,
  type AccountAuthorityGeneration,
  type AccountAuthorityResult,
  type AccountAuthorityState,
  accountAuthorityGeneration,
} from './account_authority_contract';
import type { AccountId, DeviceId, OperationId, SessionId } from './account_authority_ids';

/** Events are data only; the runtime, not this reducer, performs I/O. */
export type AccountAuthorityEvent =
  | Readonly<{ type: 'authentication_started'; attemptId: OperationId }>
  | Readonly<{
    type: 'authenticated';
    accountId: AccountId;
    sessionId: SessionId;
    expectedGeneration: AccountAuthorityGeneration;
    expectedAttemptId: OperationId;
  }>
  | Readonly<{ type: 'provider_cancelled'; attemptId: OperationId }>
  | Readonly<{
    type: 'device_taken_over';
    revokedSessionId: SessionId;
    expectedGeneration: AccountAuthorityGeneration;
  }>
  | Readonly<{ type: 'signed_out' }>
  | Readonly<{ type: 'local_deleted' }>;

export type AccountAuthorityReduction = Readonly<{
  state: AccountAuthorityState;
  result?: AccountAuthorityResult;
}>;

function nextGeneration(state: AccountAuthorityState): AccountAuthorityGeneration {
  return accountAuthorityGeneration(state.generation.value + 1);
}

function clearOwnership(
  state: AccountAuthorityState,
  phase: 'signed_out' | 'device_taken_over',
): AccountAuthorityState {
  return freezeAccountAuthorityState({
    phase,
    deviceId: state.deviceId,
    generation: nextGeneration(state),
  });
}

export function initialAccountAuthorityState(deviceId: DeviceId): AccountAuthorityState {
  return freezeAccountAuthorityState({
    phase: 'booting',
    deviceId,
    generation: accountAuthorityGeneration(0),
  });
}

export function reduceAccountAuthorityState(
  state: AccountAuthorityState,
  event: AccountAuthorityEvent,
): AccountAuthorityReduction {
  switch (event.type) {
    case 'authentication_started': {
      // A new attempt gets its own operation fence. If the caller starts it
      // while an account is live, retain that account as the safe cancellation
      // fallback until the provider result is accepted.
      if (state.phase === 'authenticated') {
        return Object.freeze({
          state: freezeAccountAuthorityState({
            phase: 'authenticating',
            deviceId: state.deviceId,
            generation: state.generation,
            authAttemptId: event.attemptId,
            previousAccountId: state.accountId,
            previousSessionId: state.sessionId,
          }),
        });
      }
      if (state.phase === 'authenticating') {
        return Object.freeze({
          state: freezeAccountAuthorityState({
            phase: 'authenticating',
            deviceId: state.deviceId,
            generation: state.generation,
            authAttemptId: event.attemptId,
            ...(state.previousAccountId && state.previousSessionId
              ? {
                previousAccountId: state.previousAccountId,
                previousSessionId: state.previousSessionId,
              }
              : {}),
          }),
        });
      }
      return Object.freeze({
        state: freezeAccountAuthorityState({
          phase: 'authenticating',
          deviceId: state.deviceId,
          generation: state.generation,
          authAttemptId: event.attemptId,
        }),
      });
    }

    case 'authenticated': {
      // A provider callback can arrive after cancellation, takeover, sign-out,
      // or a newer attempt. Only the still-active attempt may establish owner.
      if (
        state.phase !== 'authenticating'
        || state.generation.value !== event.expectedGeneration.value
        || state.authAttemptId.value !== event.expectedAttemptId.value
      ) {
        return Object.freeze({ state });
      }
      const retainedScopeMatches = state.previousAccountId?.value === event.accountId.value
        && state.previousSessionId?.value === event.sessionId.value;
      const generation = state.previousAccountId && state.previousSessionId && !retainedScopeMatches
        ? nextGeneration(state)
        : state.generation;
      return Object.freeze({
        state: freezeAccountAuthorityState({
          phase: 'authenticated',
          deviceId: state.deviceId,
          generation,
          accountId: event.accountId,
          sessionId: event.sessionId,
        }),
        result: freezeAccountAuthorityResult({
          type: 'authenticated',
          accountId: event.accountId,
          sessionId: event.sessionId,
          generation,
        }),
      });
    }

    case 'provider_cancelled': {
      if (state.phase !== 'authenticating' || state.authAttemptId.value !== event.attemptId.value) {
        return Object.freeze({ state });
      }
      const restored = state.previousAccountId && state.previousSessionId
        ? freezeAccountAuthorityState({
          phase: 'authenticated',
          deviceId: state.deviceId,
          generation: state.generation,
          accountId: state.previousAccountId,
          sessionId: state.previousSessionId,
        })
        : freezeAccountAuthorityState({
          phase: 'signed_out',
          deviceId: state.deviceId,
          generation: state.generation,
        });
      return Object.freeze({
        state: restored,
        result: freezeAccountAuthorityResult({ type: 'cancelled', reason: 'provider_cancelled' }),
      });
    }

    case 'device_taken_over': {
      // A delayed revocation for A must not clear a newer B session. Both the
      // revoked session and the generation captured with the notification must
      // still match the live owner.
      const authenticatedSessionMatches = state.phase === 'authenticated'
        && state.sessionId.value === event.revokedSessionId.value;
      const retainedSessionMatches = state.phase === 'authenticating'
        && state.previousSessionId?.value === event.revokedSessionId.value;
      if (
        (!authenticatedSessionMatches && !retainedSessionMatches)
        || state.generation.value !== event.expectedGeneration.value
      ) {
        return Object.freeze({ state });
      }
      const generation = nextGeneration(state);
      return Object.freeze({
        state: freezeAccountAuthorityState({ phase: 'device_taken_over', deviceId: state.deviceId, generation }),
        result: freezeAccountAuthorityResult({ type: 'device_taken_over', generation }),
      });
    }

    case 'signed_out':
      return Object.freeze({
        state: clearOwnership(state, 'signed_out'),
        result: freezeAccountAuthorityResult({ type: 'signed_out', generation: nextGeneration(state) }),
      });

    case 'local_deleted':
      return Object.freeze({
        state: clearOwnership(state, 'signed_out'),
        result: freezeAccountAuthorityResult({ type: 'local_deleted', generation: nextGeneration(state) }),
      });
  }
}

export function evaluatePreservedDomainCommit(
  state: AccountAuthorityState,
  command: Extract<AccountAuthorityCommand, { type: 'commit_preserved_domain' }>,
): AccountAuthorityResult {
  if (state.phase !== 'authenticated') {
    return freezeAccountAuthorityResult({
      type: 'rejected', operationId: command.operationId, reason: 'not_authenticated',
    });
  }
  if (state.accountId.value !== command.accountId.value || state.sessionId.value !== command.sessionId.value) {
    return freezeAccountAuthorityResult({
      type: 'rejected', operationId: command.operationId, reason: 'stale_session',
    });
  }
  if (state.generation.value !== command.expectedGeneration.value) {
    return freezeAccountAuthorityResult({
      type: 'rejected', operationId: command.operationId, reason: 'stale_generation',
    });
  }
  return freezeAccountAuthorityResult({
    type: 'committed', operationId: command.operationId, domain: command.domain,
  });
}
