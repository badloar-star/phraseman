export type AccountScope =
  | Readonly<{ kind: 'guest'; installationId: string; scopeKey: `guest:${string}` }>
  | Readonly<{ kind: 'account'; uid: string; scopeKey: `account:${string}` }>;

export type SessionFence = Readonly<{
  scopeKey: AccountScope['scopeKey'];
  uid: string | null;
  generation: number;
  nonce: string;
}>;

export type TransitionLease = Readonly<{
  transitionEpoch: number;
  basedOn: SessionFence;
}>;

export type StableSessionPhase =
  | Readonly<{ tag: 'guest_ready'; scope: Extract<AccountScope, { kind: 'guest' }>; fence: SessionFence }>
  | Readonly<{ tag: 'new_device_hydration_required'; scope: Extract<AccountScope, { kind: 'account' }>; fence: SessionFence; hydrationAttemptEpoch: number }>
  | Readonly<{ tag: 'cached_ready_refreshing'; scope: Extract<AccountScope, { kind: 'account' }>; fence: SessionFence }>
  | Readonly<{ tag: 'account_ready'; scope: Extract<AccountScope, { kind: 'account' }>; fence: SessionFence }>;

export type RetryableTransitionPhase =
  | Readonly<{ tag: 'closing_scope_for_sign_in'; oldScope: AccountScope; oldFence: SessionFence; targetScope: Extract<AccountScope, { kind: 'account' }>; targetFence: SessionFence; lease: TransitionLease }>
  | Readonly<{ tag: 'opening_account_scope'; scope: Extract<AccountScope, { kind: 'account' }>; fence: SessionFence; lease: TransitionLease }>
  | Readonly<{ tag: 'closing_scope_for_logout'; oldScope: Extract<AccountScope, { kind: 'account' }>; oldFence: SessionFence; transitionFence: SessionFence; lease: TransitionLease; preserveOutbox: boolean }>
  | Readonly<{ tag: 'provider_signing_out'; oldScope: Extract<AccountScope, { kind: 'account' }>; transitionFence: SessionFence; lease: TransitionLease; preserveOutbox: boolean }>
  | Readonly<{ tag: 'opening_guest_scope'; scope: Extract<AccountScope, { kind: 'guest' }>; fence: SessionFence; lease: TransitionLease }>;

export type AccountSessionPhase =
  | StableSessionPhase
  | Readonly<{ tag: 'sign_in_provider'; active: StableSessionPhase; lease: TransitionLease }>
  | Readonly<{ tag: 'logout_confirmation'; active: Extract<StableSessionPhase, { scope: { kind: 'account' } }>; lease: TransitionLease; pendingCount: number; online: boolean }>
  | RetryableTransitionPhase
  | Readonly<{ tag: 'transition_attention'; failed: RetryableTransitionPhase; code: string }>;

export type AccountSessionState = Readonly<{
  transitionEpoch: number;
  phase: AccountSessionPhase;
}>;

export type AccountSessionEvent =
  | Readonly<{ type: 'SIGN_IN_STARTED' }>
  | Readonly<{ type: 'SIGN_IN_CANCELLED'; transitionEpoch: number; expectedFence: SessionFence }>
  | Readonly<{ type: 'AUTH_UID_CONFIRMED'; transitionEpoch: number; expectedFence: SessionFence; uid: string; nextNonce: string }>
  | Readonly<{ type: 'SCOPE_CLOSE_CONFIRMED'; transitionEpoch: number; closedFence: SessionFence }>
  | Readonly<{ type: 'SCOPE_CLOSE_FAILED'; transitionEpoch: number; closedFence: SessionFence; code: string }>
  | Readonly<{ type: 'ACCOUNT_SCOPE_OPENED'; transitionEpoch: number; expectedFence: SessionFence; hasVerifiedCache: boolean }>
  | Readonly<{ type: 'ACCOUNT_SCOPE_OPEN_FAILED'; transitionEpoch: number; expectedFence: SessionFence; code: string }>
  | Readonly<{ type: 'HYDRATION_RETRY_REQUESTED' }>
  | Readonly<{ type: 'HYDRATION_CONFIRMED'; transitionEpoch: number; expectedFence: SessionFence }>
  | Readonly<{ type: 'LOGOUT_REQUESTED'; pendingCount: number; online: boolean }>
  | Readonly<{ type: 'LOGOUT_CANCELLED'; transitionEpoch: number; expectedFence: SessionFence }>
  | Readonly<{ type: 'LOGOUT_CONFIRMED_KEEP_LOCAL'; transitionEpoch: number; expectedFence: SessionFence; transitionNonce: string }>
  | Readonly<{ type: 'PROVIDER_SIGN_OUT_CONFIRMED'; transitionEpoch: number; expectedFence: SessionFence; rawGuestInstallationId: string; rawGuestNonce: string }>
  | Readonly<{ type: 'PROVIDER_SIGN_OUT_FAILED'; transitionEpoch: number; expectedFence: SessionFence; code: string }>
  | Readonly<{ type: 'GUEST_SCOPE_OPENED'; transitionEpoch: number; expectedFence: SessionFence }>
  | Readonly<{ type: 'GUEST_SCOPE_OPEN_FAILED'; transitionEpoch: number; expectedFence: SessionFence; code: string }>
  | Readonly<{ type: 'RETRY_TRANSITION'; transitionEpoch: number; expectedFence: SessionFence }>;

export type AccountSessionEffect =
  | Readonly<{ type: 'REQUEST_CANCEL_AUTH'; transitionEpoch: number }>
  | Readonly<{ type: 'INVALIDATE_SESSION'; previous: SessionFence; next: SessionFence }>
  | Readonly<{ type: 'CLOSE_SCOPE'; scope: AccountScope; closedFence: SessionFence; transitionEpoch: number }>
  | Readonly<{ type: 'OPEN_SCOPE'; scope: AccountScope; fence: SessionFence; transitionEpoch: number }>
  | Readonly<{ type: 'BEGIN_HYDRATION'; transitionEpoch: number; expectedFence: SessionFence }>
  | Readonly<{ type: 'BEGIN_PROVIDER_SIGN_OUT'; transitionEpoch: number; expectedFence: SessionFence; preserveOutbox: boolean }>;

export type ReduceResult = Readonly<{
  outcome: 'applied' | 'stale';
  state: AccountSessionState;
  effects: readonly AccountSessionEffect[];
}>;

export class AccountSessionInvariantError extends Error {
  readonly code: 'invalid_event_for_state' | 'invalid_input';

  constructor(code: AccountSessionInvariantError['code']) {
    super(code);
    this.name = 'AccountSessionInvariantError';
    this.code = code;
  }
}

function invalidInput(): never {
  throw new AccountSessionInvariantError('invalid_input');
}

function invalidEventForState(): never {
  throw new AccountSessionInvariantError('invalid_event_for_state');
}

function assertTrimExact(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    invalidInput();
  }
}

function assertNonNegativeSafeInteger(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    invalidInput();
  }
}

function incrementScalar(value: number): number {
  assertNonNegativeSafeInteger(value);
  if (value >= Number.MAX_SAFE_INTEGER) invalidInput();
  return value + 1;
}

function guestScope(rawGuestInstallationId: string): Extract<AccountScope, { kind: 'guest' }> {
  assertTrimExact(rawGuestInstallationId);
  return {
    kind: 'guest',
    installationId: rawGuestInstallationId,
    scopeKey: `guest:${rawGuestInstallationId}`,
  };
}

function accountScope(uid: string): Extract<AccountScope, { kind: 'account' }> {
  assertTrimExact(uid);
  return { kind: 'account', uid, scopeKey: `account:${uid}` };
}

function assertFence(fence: SessionFence): void {
  if (typeof fence !== 'object' || fence === null) invalidInput();
  assertTrimExact(fence.scopeKey);
  if (fence.uid !== null) assertTrimExact(fence.uid);
  assertNonNegativeSafeInteger(fence.generation);
  assertTrimExact(fence.nonce);
}

function assertScope(scope: AccountScope): void {
  if (typeof scope !== 'object' || scope === null) invalidInput();
  if (scope.kind === 'guest') {
    assertTrimExact(scope.installationId);
    if (scope.scopeKey !== `guest:${scope.installationId}`) invalidInput();
    return;
  }
  if (scope.kind === 'account') {
    assertTrimExact(scope.uid);
    if (scope.scopeKey !== `account:${scope.uid}`) invalidInput();
    return;
  }
  invalidInput();
}

function assertFenceForScope(scope: AccountScope, fence: SessionFence): void {
  assertScope(scope);
  assertFence(fence);
  const expectedUid = scope.kind === 'account' ? scope.uid : null;
  if (fence.scopeKey !== scope.scopeKey || fence.uid !== expectedUid) invalidInput();
}

function assertLease(lease: TransitionLease): void {
  if (typeof lease !== 'object' || lease === null) invalidInput();
  assertNonNegativeSafeInteger(lease.transitionEpoch);
  assertFence(lease.basedOn);
}

function assertStablePhase(phase: StableSessionPhase): void {
  assertFenceForScope(phase.scope, phase.fence);
  if (phase.tag === 'new_device_hydration_required') {
    assertNonNegativeSafeInteger(phase.hydrationAttemptEpoch);
  }
}

function assertNextFence(previous: SessionFence, next: SessionFence): void {
  if (previous.generation >= Number.MAX_SAFE_INTEGER) invalidInput();
  if (next.generation !== previous.generation + 1) invalidInput();
}

function assertRetryablePhase(phase: RetryableTransitionPhase, stateEpoch: number): void {
  assertLease(phase.lease);
  if (phase.lease.transitionEpoch !== stateEpoch) invalidInput();
  switch (phase.tag) {
    case 'closing_scope_for_sign_in':
      assertFenceForScope(phase.oldScope, phase.oldFence);
      assertFenceForScope(phase.targetScope, phase.targetFence);
      if (!sameSessionFence(phase.lease.basedOn, phase.oldFence)) invalidInput();
      assertNextFence(phase.oldFence, phase.targetFence);
      return;
    case 'opening_account_scope':
      assertFenceForScope(phase.scope, phase.fence);
      assertNextFence(phase.lease.basedOn, phase.fence);
      return;
    case 'closing_scope_for_logout':
      assertFenceForScope(phase.oldScope, phase.oldFence);
      assertFence(phase.transitionFence);
      if (
        !sameSessionFence(phase.lease.basedOn, phase.oldFence) ||
        phase.transitionFence.scopeKey !== phase.oldFence.scopeKey ||
        phase.transitionFence.uid !== phase.oldFence.uid ||
        typeof phase.preserveOutbox !== 'boolean'
      ) invalidInput();
      assertNextFence(phase.oldFence, phase.transitionFence);
      return;
    case 'provider_signing_out':
      assertFenceForScope(phase.oldScope, phase.lease.basedOn);
      assertFence(phase.transitionFence);
      if (
        phase.transitionFence.scopeKey !== phase.oldScope.scopeKey ||
        phase.transitionFence.uid !== phase.oldScope.uid ||
        typeof phase.preserveOutbox !== 'boolean'
      ) invalidInput();
      assertNextFence(phase.lease.basedOn, phase.transitionFence);
      return;
    case 'opening_guest_scope':
      assertFenceForScope(phase.scope, phase.fence);
      assertNextFence(phase.lease.basedOn, phase.fence);
      return;
  }
}

function assertState(state: AccountSessionState): void {
  if (typeof state !== 'object' || state === null) invalidInput();
  assertNonNegativeSafeInteger(state.transitionEpoch);
  const phase = state.phase;
  if (typeof phase !== 'object' || phase === null) invalidInput();
  switch (phase.tag) {
    case 'guest_ready':
    case 'new_device_hydration_required':
    case 'cached_ready_refreshing':
    case 'account_ready':
      assertStablePhase(phase);
      return;
    case 'sign_in_provider':
      assertStablePhase(phase.active);
      assertLease(phase.lease);
      if (
        phase.lease.transitionEpoch !== state.transitionEpoch ||
        !sameSessionFence(phase.lease.basedOn, phase.active.fence)
      ) invalidInput();
      return;
    case 'logout_confirmation':
      assertStablePhase(phase.active);
      assertLease(phase.lease);
      assertNonNegativeSafeInteger(phase.pendingCount);
      if (
        phase.active.scope.kind !== 'account' ||
        phase.lease.transitionEpoch !== state.transitionEpoch ||
        !sameSessionFence(phase.lease.basedOn, phase.active.fence) ||
        typeof phase.online !== 'boolean'
      ) invalidInput();
      return;
    case 'closing_scope_for_sign_in':
    case 'opening_account_scope':
    case 'closing_scope_for_logout':
    case 'provider_signing_out':
    case 'opening_guest_scope':
      assertRetryablePhase(phase, state.transitionEpoch);
      return;
    case 'transition_attention':
      assertTrimExact(phase.code);
      assertRetryablePhase(phase.failed, state.transitionEpoch);
      return;
    default:
      invalidInput();
  }
}

function assertEvent(event: AccountSessionEvent): void {
  if (typeof event !== 'object' || event === null) invalidInput();
  switch (event.type) {
    case 'SIGN_IN_STARTED':
    case 'HYDRATION_RETRY_REQUESTED':
      return;
    case 'LOGOUT_REQUESTED':
      assertNonNegativeSafeInteger(event.pendingCount);
      if (typeof event.online !== 'boolean') invalidInput();
      return;
    case 'SCOPE_CLOSE_CONFIRMED':
      assertNonNegativeSafeInteger(event.transitionEpoch);
      assertFence(event.closedFence);
      return;
    case 'SCOPE_CLOSE_FAILED':
      assertNonNegativeSafeInteger(event.transitionEpoch);
      assertFence(event.closedFence);
      assertTrimExact(event.code);
      return;
    case 'AUTH_UID_CONFIRMED':
      assertNonNegativeSafeInteger(event.transitionEpoch);
      assertFence(event.expectedFence);
      assertTrimExact(event.uid);
      assertTrimExact(event.nextNonce);
      return;
    case 'ACCOUNT_SCOPE_OPENED':
      assertNonNegativeSafeInteger(event.transitionEpoch);
      assertFence(event.expectedFence);
      if (typeof event.hasVerifiedCache !== 'boolean') invalidInput();
      return;
    case 'ACCOUNT_SCOPE_OPEN_FAILED':
    case 'PROVIDER_SIGN_OUT_FAILED':
    case 'GUEST_SCOPE_OPEN_FAILED':
      assertNonNegativeSafeInteger(event.transitionEpoch);
      assertFence(event.expectedFence);
      assertTrimExact(event.code);
      return;
    case 'LOGOUT_CONFIRMED_KEEP_LOCAL':
      assertNonNegativeSafeInteger(event.transitionEpoch);
      assertFence(event.expectedFence);
      assertTrimExact(event.transitionNonce);
      return;
    case 'PROVIDER_SIGN_OUT_CONFIRMED':
      assertNonNegativeSafeInteger(event.transitionEpoch);
      assertFence(event.expectedFence);
      assertTrimExact(event.rawGuestInstallationId);
      assertTrimExact(event.rawGuestNonce);
      return;
    case 'SIGN_IN_CANCELLED':
    case 'HYDRATION_CONFIRMED':
    case 'LOGOUT_CANCELLED':
    case 'GUEST_SCOPE_OPENED':
    case 'RETRY_TRANSITION':
      assertNonNegativeSafeInteger(event.transitionEpoch);
      assertFence(event.expectedFence);
      return;
  }
}

function applied(
  state: AccountSessionState,
  effects: readonly AccountSessionEffect[] = [],
): ReduceResult {
  return { outcome: 'applied', state, effects };
}

function stale(state: AccountSessionState): ReduceResult {
  return { outcome: 'stale', state, effects: [] };
}

function currentEpochOrStale(
  state: AccountSessionState,
  transitionEpoch: number,
): ReduceResult | null {
  return transitionEpoch === state.transitionEpoch ? null : stale(state);
}

function leaseFor(state: AccountSessionState, basedOn: SessionFence): TransitionLease {
  return { transitionEpoch: incrementScalar(state.transitionEpoch), basedOn };
}

function retryEffect(phase: RetryableTransitionPhase): AccountSessionEffect {
  switch (phase.tag) {
    case 'closing_scope_for_sign_in':
    case 'closing_scope_for_logout':
      return {
        type: 'CLOSE_SCOPE',
        scope: phase.oldScope,
        closedFence: phase.oldFence,
        transitionEpoch: phase.lease.transitionEpoch,
      };
    case 'opening_account_scope':
    case 'opening_guest_scope':
      return {
        type: 'OPEN_SCOPE',
        scope: phase.scope,
        fence: phase.fence,
        transitionEpoch: phase.lease.transitionEpoch,
      };
    case 'provider_signing_out':
      return {
        type: 'BEGIN_PROVIDER_SIGN_OUT',
        transitionEpoch: phase.lease.transitionEpoch,
        expectedFence: phase.transitionFence,
        preserveOutbox: phase.preserveOutbox,
      };
  }
}

export function createInitialGuestSession(
  rawGuestInstallationId: string,
  rawNonce: string,
): AccountSessionState {
  const scope = guestScope(rawGuestInstallationId);
  assertTrimExact(rawNonce);
  const fence: SessionFence = {
    scopeKey: scope.scopeKey,
    uid: null,
    generation: 0,
    nonce: rawNonce,
  };
  return { transitionEpoch: 0, phase: { tag: 'guest_ready', scope, fence } };
}

export function sameSessionFence(left: SessionFence, right: SessionFence): boolean {
  assertFence(left);
  assertFence(right);
  return (
    left.scopeKey === right.scopeKey &&
    left.uid === right.uid &&
    left.generation === right.generation &&
    left.nonce === right.nonce
  );
}

export function sameTransitionLease(left: TransitionLease, right: TransitionLease): boolean {
  assertLease(left);
  assertLease(right);
  return (
    left.transitionEpoch === right.transitionEpoch &&
    sameSessionFence(left.basedOn, right.basedOn)
  );
}

export function reduceAccountSession(
  state: AccountSessionState,
  event: AccountSessionEvent,
): ReduceResult {
  assertState(state);
  assertEvent(event);

  switch (event.type) {
    case 'SIGN_IN_STARTED': {
      if (state.phase.tag === 'sign_in_provider') {
        const oldEpoch = state.phase.lease.transitionEpoch;
        const lease = leaseFor(state, state.phase.active.fence);
        return applied(
          { transitionEpoch: lease.transitionEpoch, phase: { tag: 'sign_in_provider', active: state.phase.active, lease } },
          [{ type: 'REQUEST_CANCEL_AUTH', transitionEpoch: oldEpoch }],
        );
      }
      if (
        state.phase.tag !== 'guest_ready' &&
        state.phase.tag !== 'new_device_hydration_required' &&
        state.phase.tag !== 'cached_ready_refreshing' &&
        state.phase.tag !== 'account_ready'
      ) invalidEventForState();
      const lease = leaseFor(state, state.phase.fence);
      return applied({
        transitionEpoch: lease.transitionEpoch,
        phase: { tag: 'sign_in_provider', active: state.phase, lease },
      });
    }

    case 'SIGN_IN_CANCELLED': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (state.phase.tag !== 'sign_in_provider') return stale(state);
      if (!sameSessionFence(event.expectedFence, state.phase.lease.basedOn)) return stale(state);
      const transitionEpoch = incrementScalar(state.transitionEpoch);
      if (state.phase.active.tag === 'new_device_hydration_required') {
        const phase: StableSessionPhase = {
          ...state.phase.active,
          hydrationAttemptEpoch: transitionEpoch,
        };
        return applied(
          { transitionEpoch, phase },
          [
            { type: 'REQUEST_CANCEL_AUTH', transitionEpoch: event.transitionEpoch },
            { type: 'BEGIN_HYDRATION', transitionEpoch, expectedFence: phase.fence },
          ],
        );
      }
      return applied(
        { transitionEpoch, phase: state.phase.active },
        [{ type: 'REQUEST_CANCEL_AUTH', transitionEpoch: event.transitionEpoch }],
      );
    }

    case 'AUTH_UID_CONFIRMED': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (state.phase.tag !== 'sign_in_provider') return stale(state);
      if (!sameSessionFence(event.expectedFence, state.phase.lease.basedOn)) return stale(state);
      const targetScope = accountScope(event.uid);
      const targetFence: SessionFence = {
        scopeKey: targetScope.scopeKey,
        uid: targetScope.uid,
        generation: incrementScalar(state.phase.active.fence.generation),
        nonce: event.nextNonce,
      };
      const phase: RetryableTransitionPhase = {
        tag: 'closing_scope_for_sign_in',
        oldScope: state.phase.active.scope,
        oldFence: state.phase.active.fence,
        targetScope,
        targetFence,
        lease: state.phase.lease,
      };
      return applied(
        { transitionEpoch: state.transitionEpoch, phase },
        [
          { type: 'INVALIDATE_SESSION', previous: phase.oldFence, next: phase.targetFence },
          { type: 'CLOSE_SCOPE', scope: phase.oldScope, closedFence: phase.oldFence, transitionEpoch: phase.lease.transitionEpoch },
        ],
      );
    }

    case 'SCOPE_CLOSE_CONFIRMED':
    case 'SCOPE_CLOSE_FAILED': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (
        state.phase.tag !== 'closing_scope_for_sign_in' &&
        state.phase.tag !== 'closing_scope_for_logout'
      ) return stale(state);
      if (!sameSessionFence(event.closedFence, state.phase.oldFence)) return stale(state);
      if (event.type === 'SCOPE_CLOSE_FAILED') {
        return applied({ transitionEpoch: state.transitionEpoch, phase: { tag: 'transition_attention', failed: state.phase, code: event.code } });
      }
      if (state.phase.tag === 'closing_scope_for_sign_in') {
        const phase: RetryableTransitionPhase = {
          tag: 'opening_account_scope',
          scope: state.phase.targetScope,
          fence: state.phase.targetFence,
          lease: state.phase.lease,
        };
        return applied({ transitionEpoch: state.transitionEpoch, phase }, [retryEffect(phase)]);
      }
      const phase: RetryableTransitionPhase = {
        tag: 'provider_signing_out',
        oldScope: state.phase.oldScope,
        transitionFence: state.phase.transitionFence,
        lease: state.phase.lease,
        preserveOutbox: state.phase.preserveOutbox,
      };
      return applied({ transitionEpoch: state.transitionEpoch, phase }, [retryEffect(phase)]);
    }

    case 'ACCOUNT_SCOPE_OPENED':
    case 'ACCOUNT_SCOPE_OPEN_FAILED': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (state.phase.tag !== 'opening_account_scope') return stale(state);
      if (!sameSessionFence(event.expectedFence, state.phase.fence)) return stale(state);
      if (event.type === 'ACCOUNT_SCOPE_OPEN_FAILED') {
        return applied({ transitionEpoch: state.transitionEpoch, phase: { tag: 'transition_attention', failed: state.phase, code: event.code } });
      }
      if (event.hasVerifiedCache) {
        return applied({
          transitionEpoch: state.transitionEpoch,
          phase: { tag: 'cached_ready_refreshing', scope: state.phase.scope, fence: state.phase.fence },
        });
      }
      const transitionEpoch = incrementScalar(state.transitionEpoch);
      const phase: StableSessionPhase = {
        tag: 'new_device_hydration_required',
        scope: state.phase.scope,
        fence: state.phase.fence,
        hydrationAttemptEpoch: transitionEpoch,
      };
      return applied(
        { transitionEpoch, phase },
        [{ type: 'BEGIN_HYDRATION', transitionEpoch, expectedFence: phase.fence }],
      );
    }

    case 'HYDRATION_RETRY_REQUESTED': {
      if (state.phase.tag !== 'new_device_hydration_required') invalidEventForState();
      const transitionEpoch = incrementScalar(state.transitionEpoch);
      const phase: StableSessionPhase = { ...state.phase, hydrationAttemptEpoch: transitionEpoch };
      return applied(
        { transitionEpoch, phase },
        [{ type: 'BEGIN_HYDRATION', transitionEpoch, expectedFence: phase.fence }],
      );
    }

    case 'HYDRATION_CONFIRMED': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (state.phase.tag !== 'new_device_hydration_required') return stale(state);
      if (
        event.transitionEpoch !== state.phase.hydrationAttemptEpoch ||
        !sameSessionFence(event.expectedFence, state.phase.fence)
      ) return stale(state);
      return applied({
        transitionEpoch: state.transitionEpoch,
        phase: { tag: 'account_ready', scope: state.phase.scope, fence: state.phase.fence },
      });
    }

    case 'LOGOUT_REQUESTED': {
      if (
        state.phase.tag !== 'new_device_hydration_required' &&
        state.phase.tag !== 'cached_ready_refreshing' &&
        state.phase.tag !== 'account_ready'
      ) invalidEventForState();
      const lease = leaseFor(state, state.phase.fence);
      return applied({
        transitionEpoch: lease.transitionEpoch,
        phase: {
          tag: 'logout_confirmation',
          active: state.phase,
          lease,
          pendingCount: event.pendingCount,
          online: event.online,
        },
      });
    }

    case 'LOGOUT_CANCELLED': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (state.phase.tag !== 'logout_confirmation') return stale(state);
      if (!sameSessionFence(event.expectedFence, state.phase.lease.basedOn)) return stale(state);
      const transitionEpoch = incrementScalar(state.transitionEpoch);
      if (state.phase.active.tag === 'new_device_hydration_required') {
        const phase: StableSessionPhase = {
          ...state.phase.active,
          hydrationAttemptEpoch: transitionEpoch,
        };
        return applied(
          { transitionEpoch, phase },
          [{ type: 'BEGIN_HYDRATION', transitionEpoch, expectedFence: phase.fence }],
        );
      }
      return applied({ transitionEpoch, phase: state.phase.active });
    }

    case 'LOGOUT_CONFIRMED_KEEP_LOCAL': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (state.phase.tag !== 'logout_confirmation') return stale(state);
      if (!sameSessionFence(event.expectedFence, state.phase.lease.basedOn)) return stale(state);
      const transitionFence: SessionFence = {
        scopeKey: state.phase.active.scope.scopeKey,
        uid: state.phase.active.scope.uid,
        generation: incrementScalar(state.phase.active.fence.generation),
        nonce: event.transitionNonce,
      };
      const phase: RetryableTransitionPhase = {
        tag: 'closing_scope_for_logout',
        oldScope: state.phase.active.scope,
        oldFence: state.phase.active.fence,
        transitionFence,
        lease: state.phase.lease,
        preserveOutbox: true,
      };
      return applied(
        { transitionEpoch: state.transitionEpoch, phase },
        [
          { type: 'INVALIDATE_SESSION', previous: phase.oldFence, next: phase.transitionFence },
          { type: 'CLOSE_SCOPE', scope: phase.oldScope, closedFence: phase.oldFence, transitionEpoch: phase.lease.transitionEpoch },
        ],
      );
    }

    case 'PROVIDER_SIGN_OUT_CONFIRMED':
    case 'PROVIDER_SIGN_OUT_FAILED': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (state.phase.tag !== 'provider_signing_out') return stale(state);
      if (!sameSessionFence(event.expectedFence, state.phase.transitionFence)) return stale(state);
      if (event.type === 'PROVIDER_SIGN_OUT_FAILED') {
        return applied({ transitionEpoch: state.transitionEpoch, phase: { tag: 'transition_attention', failed: state.phase, code: event.code } });
      }
      const scope = guestScope(event.rawGuestInstallationId);
      const fence: SessionFence = {
        scopeKey: scope.scopeKey,
        uid: null,
        generation: state.phase.transitionFence.generation,
        nonce: event.rawGuestNonce,
      };
      const phase: RetryableTransitionPhase = { tag: 'opening_guest_scope', scope, fence, lease: state.phase.lease };
      return applied({ transitionEpoch: state.transitionEpoch, phase }, [retryEffect(phase)]);
    }

    case 'GUEST_SCOPE_OPENED':
    case 'GUEST_SCOPE_OPEN_FAILED': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (state.phase.tag !== 'opening_guest_scope') return stale(state);
      if (!sameSessionFence(event.expectedFence, state.phase.fence)) return stale(state);
      if (event.type === 'GUEST_SCOPE_OPEN_FAILED') {
        return applied({ transitionEpoch: state.transitionEpoch, phase: { tag: 'transition_attention', failed: state.phase, code: event.code } });
      }
      return applied({
        transitionEpoch: state.transitionEpoch,
        phase: { tag: 'guest_ready', scope: state.phase.scope, fence: state.phase.fence },
      });
    }

    case 'RETRY_TRANSITION': {
      const old = currentEpochOrStale(state, event.transitionEpoch);
      if (old) return old;
      if (state.phase.tag !== 'transition_attention') invalidEventForState();
      const failed = state.phase.failed;
      const expectedFence =
        failed.tag === 'closing_scope_for_sign_in' || failed.tag === 'closing_scope_for_logout'
          ? failed.oldFence
          : failed.tag === 'provider_signing_out'
            ? failed.transitionFence
            : failed.fence;
      if (!sameSessionFence(event.expectedFence, expectedFence)) return stale(state);
      return applied({ transitionEpoch: state.transitionEpoch, phase: failed }, [retryEffect(failed)]);
    }
  }
}
