import type {
  AccountId,
  DeviceId,
  OperationId,
  SessionId,
} from './account_authority_ids';
import {
  parseAccountId,
  parseDeviceId,
  parseOperationId,
  parseSessionId,
} from './account_authority_ids';

const ACCOUNT_AUTHORITY_GENERATION_BRAND: unique symbol = Symbol('account-authority-generation');

export type AccountAuthorityGeneration = Readonly<{
  value: number;
  readonly [ACCOUNT_AUTHORITY_GENERATION_BRAND]: true;
}>;

export function accountAuthorityGeneration(value: number): AccountAuthorityGeneration {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('invalid_account_authority_generation');
  }
  return Object.freeze({ value, [ACCOUNT_AUTHORITY_GENERATION_BRAND]: true as const });
}

export function assertAccountAuthorityGeneration(value: unknown): AccountAuthorityGeneration {
  if (
    typeof value !== 'object'
    || value === null
    || typeof (value as { value?: unknown }).value !== 'number'
    || !Number.isSafeInteger((value as { value: number }).value)
    || (value as { value: number }).value < 0
  ) {
    throw new Error('invalid_account_authority_generation');
  }
  return accountAuthorityGeneration((value as { value: number }).value);
}

export type AccountAuthorityPhase =
  | 'booting'
  | 'signed_out'
  | 'authenticating'
  | 'authenticated'
  | 'device_taken_over'
  | 'deleting';

export type PreservedDomain = 'lesson_progress' | 'flashcards_srs';

export type AccountAuthorityCommand =
  | Readonly<{ type: 'boot'; deviceId: DeviceId }>
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
  | Readonly<{ type: 'delete_account'; accountId: AccountId; sessionId: SessionId }>
  | Readonly<{
    type: 'commit_preserved_domain';
    operationId: OperationId;
    accountId: AccountId;
    sessionId: SessionId;
    expectedGeneration: AccountAuthorityGeneration;
    domain: PreservedDomain;
  }>;

export type AccountAuthorityResult =
  | Readonly<{ type: 'authenticated'; accountId: AccountId; sessionId: SessionId; generation: AccountAuthorityGeneration }>
  | Readonly<{ type: 'signed_out'; generation: AccountAuthorityGeneration }>
  | Readonly<{ type: 'device_taken_over'; generation: AccountAuthorityGeneration }>
  | Readonly<{ type: 'local_deleted'; generation: AccountAuthorityGeneration }>
  | Readonly<{ type: 'committed'; operationId: OperationId; domain: PreservedDomain }>
  | Readonly<{ type: 'cancelled'; reason: 'provider_cancelled' | 'user_cancelled' }>
  | Readonly<{ type: 'rejected'; operationId: OperationId; reason: 'stale_generation' | 'stale_session' | 'not_authenticated' }>;

type AuthorityStateBase = Readonly<{
  deviceId: DeviceId;
  generation: AccountAuthorityGeneration;
}>;

export type AccountAuthorityState =
  | Readonly<AuthorityStateBase & { phase: 'booting'; accountId?: never; sessionId?: never }>
  | Readonly<AuthorityStateBase & { phase: 'signed_out'; accountId?: never; sessionId?: never }>
  | Readonly<AuthorityStateBase & {
    phase: 'authenticating';
    authAttemptId: OperationId;
    accountId?: never;
    sessionId?: never;
    previousAccountId?: AccountId;
    previousSessionId?: SessionId;
  }>
  | Readonly<AuthorityStateBase & { phase: 'authenticated'; accountId: AccountId; sessionId: SessionId }>
  | Readonly<AuthorityStateBase & { phase: 'device_taken_over'; accountId?: never; sessionId?: never }>
  | Readonly<AuthorityStateBase & { phase: 'deleting'; accountId: AccountId; sessionId: SessionId }>;

export function freezeAccountAuthorityCommand(command: AccountAuthorityCommand): AccountAuthorityCommand {
  switch (command.type) {
    case 'boot':
      return Object.freeze({ type: command.type, deviceId: parseDeviceId(command.deviceId) });
    case 'authentication_started':
      return Object.freeze({ type: command.type, attemptId: parseOperationId(command.attemptId) });
    case 'provider_cancelled':
      return Object.freeze({ type: command.type, attemptId: parseOperationId(command.attemptId) });
    case 'device_taken_over':
      return Object.freeze({
        type: command.type,
        revokedSessionId: parseSessionId(command.revokedSessionId),
        expectedGeneration: assertAccountAuthorityGeneration(command.expectedGeneration),
      });
    case 'signed_out':
      return Object.freeze({ type: command.type });
    case 'authenticated':
      return Object.freeze({
        type: command.type,
        accountId: parseAccountId(command.accountId),
        sessionId: parseSessionId(command.sessionId),
        expectedGeneration: assertAccountAuthorityGeneration(command.expectedGeneration),
        expectedAttemptId: parseOperationId(command.expectedAttemptId),
      });
    case 'delete_account':
      return Object.freeze({
        type: command.type,
        accountId: parseAccountId(command.accountId),
        sessionId: parseSessionId(command.sessionId),
      });
    case 'commit_preserved_domain':
      return Object.freeze({
        type: command.type,
        operationId: parseOperationId(command.operationId),
        accountId: parseAccountId(command.accountId),
        sessionId: parseSessionId(command.sessionId),
        expectedGeneration: assertAccountAuthorityGeneration(command.expectedGeneration),
        domain: command.domain,
      });
  }
}

export function freezeAccountAuthorityResult(result: AccountAuthorityResult): AccountAuthorityResult {
  switch (result.type) {
    case 'authenticated':
      return Object.freeze({
        type: result.type,
        accountId: parseAccountId(result.accountId),
        sessionId: parseSessionId(result.sessionId),
        generation: assertAccountAuthorityGeneration(result.generation),
      });
    case 'signed_out':
    case 'device_taken_over':
    case 'local_deleted':
      return Object.freeze({ type: result.type, generation: assertAccountAuthorityGeneration(result.generation) });
    case 'committed':
      return Object.freeze({
        type: result.type,
        operationId: parseOperationId(result.operationId),
        domain: result.domain,
      });
    case 'cancelled':
      return Object.freeze({ type: result.type, reason: result.reason });
    case 'rejected':
      return Object.freeze({
        type: result.type,
        operationId: parseOperationId(result.operationId),
        reason: result.reason,
      });
  }
}

export function freezeAccountAuthorityState(state: AccountAuthorityState): AccountAuthorityState {
  const deviceId = parseDeviceId(state.deviceId);
  const generation = assertAccountAuthorityGeneration(state.generation);
  const hasAccount = state.accountId !== undefined;
  const hasSession = state.sessionId !== undefined;
  const previousAccountValue = 'previousAccountId' in state ? state.previousAccountId : undefined;
  const previousSessionValue = 'previousSessionId' in state ? state.previousSessionId : undefined;
  const hasPreviousAccount = previousAccountValue !== undefined;
  const hasPreviousSession = previousSessionValue !== undefined;
  if (state.phase === 'authenticating') {
    if (hasAccount || hasSession || !state.authAttemptId || hasPreviousAccount !== hasPreviousSession) {
      throw new Error('account_authority_authentication_state_invalid');
    }
    return Object.freeze({
      ...state,
      deviceId,
      generation,
      authAttemptId: parseOperationId(state.authAttemptId),
      ...(hasPreviousAccount && hasPreviousSession
        ? {
          previousAccountId: parseAccountId(state.previousAccountId),
          previousSessionId: parseSessionId(state.previousSessionId),
        }
        : {}),
    }) as AccountAuthorityState;
  }
  if (state.phase === 'authenticated' || state.phase === 'deleting') {
    if (!hasAccount || !hasSession) {
      throw new Error('account_authority_authenticated_identity_missing');
    }
    const accountId = parseAccountId(state.accountId);
    const sessionId = parseSessionId(state.sessionId);
    return Object.freeze({ ...state, deviceId, generation, accountId, sessionId }) as AccountAuthorityState;
  } else if (hasAccount || hasSession || hasPreviousAccount || hasPreviousSession) {
    throw new Error('account_authority_state_stale_ownership');
  }
  return Object.freeze({ ...state, deviceId, generation }) as AccountAuthorityState;
}
