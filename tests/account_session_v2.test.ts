import {
  AccountSessionInvariantError,
  type AccountSessionEvent,
  type AccountSessionPhase,
  type AccountSessionState,
  type SessionFence,
  createInitialGuestSession,
  reduceAccountSession,
  sameSessionFence,
  sameTransitionLease,
} from '../modules/account-session-v2/account_session';

const MAX = Number.MAX_SAFE_INTEGER;

function phaseAs<Tag extends AccountSessionPhase['tag']>(
  state: AccountSessionState,
  tag: Tag,
): Extract<AccountSessionPhase, { tag: Tag }> {
  expect(state.phase.tag).toBe(tag);
  return state.phase as Extract<AccountSessionPhase, { tag: Tag }>;
}

function expectInvariant(
  code: AccountSessionInvariantError['code'],
  operation: () => unknown,
): void {
  try {
    operation();
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AccountSessionInvariantError);
    expect((error as AccountSessionInvariantError).code).toBe(code);
  }
}

function initialGuest(): AccountSessionState {
  return createInitialGuestSession('installation-1', 'guest-nonce-1');
}

function startSignIn(state = initialGuest()): AccountSessionState {
  return reduceAccountSession(state, { type: 'SIGN_IN_STARTED' }).state;
}

function closeForSignIn(state = startSignIn()): AccountSessionState {
  const phase = phaseAs(state, 'sign_in_provider');
  return reduceAccountSession(state, {
    type: 'AUTH_UID_CONFIRMED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.lease.basedOn,
    uid: 'uid-1',
    nextNonce: 'account-nonce-1',
  }).state;
}

function openAccount(state = closeForSignIn()): AccountSessionState {
  const phase = phaseAs(state, 'closing_scope_for_sign_in');
  return reduceAccountSession(state, {
    type: 'SCOPE_CLOSE_CONFIRMED',
    transitionEpoch: phase.lease.transitionEpoch,
    closedFence: phase.oldFence,
  }).state;
}

function cachedAccount(): AccountSessionState {
  const state = openAccount();
  const phase = phaseAs(state, 'opening_account_scope');
  return reduceAccountSession(state, {
    type: 'ACCOUNT_SCOPE_OPENED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.fence,
    hasVerifiedCache: true,
  }).state;
}

function hydratingAccount(): AccountSessionState {
  const state = openAccount();
  const phase = phaseAs(state, 'opening_account_scope');
  return reduceAccountSession(state, {
    type: 'ACCOUNT_SCOPE_OPENED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.fence,
    hasVerifiedCache: false,
  }).state;
}

function logoutConfirmation(): AccountSessionState {
  return reduceAccountSession(cachedAccount(), {
    type: 'LOGOUT_REQUESTED',
    pendingCount: 3,
    online: false,
  }).state;
}

function closingForLogout(): AccountSessionState {
  const state = logoutConfirmation();
  const phase = phaseAs(state, 'logout_confirmation');
  return reduceAccountSession(state, {
    type: 'LOGOUT_CONFIRMED_KEEP_LOCAL',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.lease.basedOn,
    transitionNonce: 'logout-nonce-1',
  }).state;
}

function providerSigningOut(): AccountSessionState {
  const state = closingForLogout();
  const phase = phaseAs(state, 'closing_scope_for_logout');
  return reduceAccountSession(state, {
    type: 'SCOPE_CLOSE_CONFIRMED',
    transitionEpoch: phase.lease.transitionEpoch,
    closedFence: phase.oldFence,
  }).state;
}

function openingGuest(): AccountSessionState {
  const state = providerSigningOut();
  const phase = phaseAs(state, 'provider_signing_out');
  return reduceAccountSession(state, {
    type: 'PROVIDER_SIGN_OUT_CONFIRMED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.transitionFence,
    rawGuestInstallationId: 'installation-2',
    rawGuestNonce: 'guest-nonce-2',
  }).state;
}

test('creates the exact initial guest scope and fence', () => {
  expect(initialGuest()).toEqual({
    transitionEpoch: 0,
    phase: {
      tag: 'guest_ready',
      scope: {
        kind: 'guest',
        installationId: 'installation-1',
        scopeKey: 'guest:installation-1',
      },
      fence: {
        scopeKey: 'guest:installation-1',
        uid: null,
        generation: 0,
        nonce: 'guest-nonce-1',
      },
    },
  });
});

test.each(['', ' ', ' installation-1 '])(
  'rejects invalid guest installation id %p',
  rawInstallationId => {
    expectInvariant('invalid_input', () =>
      createInitialGuestSession(rawInstallationId, 'nonce'),
    );
  },
);

test.each(['', '\t', ' nonce '])('rejects invalid initial nonce %p', rawNonce => {
  expectInvariant('invalid_input', () =>
    createInitialGuestSession('installation', rawNonce),
  );
});

test('issues the sign-in lease and epoch inside the reducer', () => {
  const result = reduceAccountSession(initialGuest(), { type: 'SIGN_IN_STARTED' });
  const phase = phaseAs(result.state, 'sign_in_provider');

  expect(result.outcome).toBe('applied');
  expect(result.state.transitionEpoch).toBe(1);
  expect(phase.lease).toEqual({
    transitionEpoch: 1,
    basedOn: phase.active.fence,
  });
  expect(result.effects).toEqual([]);
});

test('supersedes a sign-in attempt and requests best-effort cancellation', () => {
  const first = startSignIn();
  const oldLease = phaseAs(first, 'sign_in_provider').lease;
  const result = reduceAccountSession(first, { type: 'SIGN_IN_STARTED' });

  expect(result.state.transitionEpoch).toBe(2);
  expect(phaseAs(result.state, 'sign_in_provider').lease.transitionEpoch).toBe(2);
  expect(result.effects).toEqual([
    { type: 'REQUEST_CANCEL_AUTH', transitionEpoch: oldLease.transitionEpoch },
  ]);

  const late = reduceAccountSession(result.state, {
    type: 'AUTH_UID_CONFIRMED',
    transitionEpoch: oldLease.transitionEpoch,
    expectedFence: oldLease.basedOn,
    uid: 'uid-1',
    nextNonce: 'account-nonce-1',
  });
  expect(late).toEqual({ outcome: 'stale', state: result.state, effects: [] });
});

test('exact sign-in cancellation increments epoch and makes old auth stale', () => {
  const state = startSignIn();
  const lease = phaseAs(state, 'sign_in_provider').lease;
  const cancelled = reduceAccountSession(state, {
    type: 'SIGN_IN_CANCELLED',
    transitionEpoch: lease.transitionEpoch,
    expectedFence: lease.basedOn,
  });

  expect(cancelled.state.transitionEpoch).toBe(2);
  expect(cancelled.state.phase.tag).toBe('guest_ready');
  expect(cancelled.effects).toEqual([
    { type: 'REQUEST_CANCEL_AUTH', transitionEpoch: lease.transitionEpoch },
  ]);
  expect(
    reduceAccountSession(cancelled.state, {
      type: 'AUTH_UID_CONFIRMED',
      transitionEpoch: lease.transitionEpoch,
      expectedFence: lease.basedOn,
      uid: 'uid-1',
      nextNonce: 'account-nonce-1',
    }),
  ).toEqual({ outcome: 'stale', state: cancelled.state, effects: [] });
});

test('auth completion invalidates the old fence and closes before opening', () => {
  const state = startSignIn();
  const phase = phaseAs(state, 'sign_in_provider');
  const result = reduceAccountSession(state, {
    type: 'AUTH_UID_CONFIRMED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.lease.basedOn,
    uid: 'uid-1',
    nextNonce: 'account-nonce-1',
  });
  const closing = phaseAs(result.state, 'closing_scope_for_sign_in');

  expect(closing.targetScope.scopeKey).toBe('account:uid-1');
  expect(closing.targetFence).toEqual({
    scopeKey: 'account:uid-1',
    uid: 'uid-1',
    generation: 1,
    nonce: 'account-nonce-1',
  });
  expect(result.effects).toEqual([
    {
      type: 'INVALIDATE_SESSION',
      previous: closing.oldFence,
      next: closing.targetFence,
    },
    {
      type: 'CLOSE_SCOPE',
      scope: closing.oldScope,
      closedFence: closing.oldFence,
      transitionEpoch: closing.lease.transitionEpoch,
    },
  ]);
  expect(result.effects.some(effect => effect.type === 'OPEN_SCOPE')).toBe(false);
});

test('only exact close proof emits account OPEN_SCOPE', () => {
  const state = closeForSignIn();
  const phase = phaseAs(state, 'closing_scope_for_sign_in');
  const staleFence = { ...phase.oldFence, nonce: 'other-nonce' };

  expect(
    reduceAccountSession(state, {
      type: 'SCOPE_CLOSE_CONFIRMED',
      transitionEpoch: phase.lease.transitionEpoch,
      closedFence: staleFence,
    }),
  ).toEqual({ outcome: 'stale', state, effects: [] });

  const opened = reduceAccountSession(state, {
    type: 'SCOPE_CLOSE_CONFIRMED',
    transitionEpoch: phase.lease.transitionEpoch,
    closedFence: phase.oldFence,
  });
  expect(opened.effects).toEqual([
    {
      type: 'OPEN_SCOPE',
      scope: phase.targetScope,
      fence: phase.targetFence,
      transitionEpoch: phase.lease.transitionEpoch,
    },
  ]);
});

test('close failure quarantines the failed phase and retry only recloses it', () => {
  const state = closeForSignIn();
  const phase = phaseAs(state, 'closing_scope_for_sign_in');
  const failed = reduceAccountSession(state, {
    type: 'SCOPE_CLOSE_FAILED',
    transitionEpoch: phase.lease.transitionEpoch,
    closedFence: phase.oldFence,
    code: 'close_failed',
  });
  const attention = phaseAs(failed.state, 'transition_attention');

  expect(attention.failed).toEqual(phase);
  expect(attention.code).toBe('close_failed');
  expect(failed.effects).toEqual([]);

  const retried = reduceAccountSession(failed.state, {
    type: 'RETRY_TRANSITION',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.oldFence,
  });
  expect(retried.state.phase).toEqual(phase);
  expect(retried.effects).toEqual([
    {
      type: 'CLOSE_SCOPE',
      scope: phase.oldScope,
      closedFence: phase.oldFence,
      transitionEpoch: phase.lease.transitionEpoch,
    },
  ]);
});

test('verified account cache becomes ready-refreshing without hydration', () => {
  const state = openAccount();
  const phase = phaseAs(state, 'opening_account_scope');
  const result = reduceAccountSession(state, {
    type: 'ACCOUNT_SCOPE_OPENED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.fence,
    hasVerifiedCache: true,
  });

  expect(phaseAs(result.state, 'cached_ready_refreshing').fence).toEqual(phase.fence);
  expect(result.effects).toEqual([]);
});

test('new device allocates a separate hydration epoch and never exposes empty ready state', () => {
  const state = openAccount();
  const phase = phaseAs(state, 'opening_account_scope');
  const result = reduceAccountSession(state, {
    type: 'ACCOUNT_SCOPE_OPENED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.fence,
    hasVerifiedCache: false,
  });
  const hydration = phaseAs(result.state, 'new_device_hydration_required');

  expect(result.state.transitionEpoch).toBe(state.transitionEpoch + 1);
  expect(hydration.hydrationAttemptEpoch).toBe(result.state.transitionEpoch);
  expect(result.effects).toEqual([
    {
      type: 'BEGIN_HYDRATION',
      transitionEpoch: hydration.hydrationAttemptEpoch,
      expectedFence: hydration.fence,
    },
  ]);
});

test('account open failure stays quarantined and retry only reopens scope', () => {
  const state = openAccount();
  const phase = phaseAs(state, 'opening_account_scope');
  const failed = reduceAccountSession(state, {
    type: 'ACCOUNT_SCOPE_OPEN_FAILED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.fence,
    code: 'open_failed',
  });
  const attention = phaseAs(failed.state, 'transition_attention');
  expect(attention.failed).toEqual(phase);

  const retried = reduceAccountSession(failed.state, {
    type: 'RETRY_TRANSITION',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.fence,
  });
  expect(retried.state.phase).toEqual(phase);
  expect(retried.effects).toEqual([
    {
      type: 'OPEN_SCOPE',
      scope: phase.scope,
      fence: phase.fence,
      transitionEpoch: phase.lease.transitionEpoch,
    },
  ]);
});

test('hydration retry supersedes the old attempt within the same session', () => {
  const state = hydratingAccount();
  const phase = phaseAs(state, 'new_device_hydration_required');
  const retry = reduceAccountSession(state, { type: 'HYDRATION_RETRY_REQUESTED' });
  const next = phaseAs(retry.state, 'new_device_hydration_required');

  expect(next.hydrationAttemptEpoch).toBe(phase.hydrationAttemptEpoch + 1);
  expect(retry.effects).toEqual([
    {
      type: 'BEGIN_HYDRATION',
      transitionEpoch: next.hydrationAttemptEpoch,
      expectedFence: next.fence,
    },
  ]);
  expect(
    reduceAccountSession(retry.state, {
      type: 'HYDRATION_CONFIRMED',
      transitionEpoch: phase.hydrationAttemptEpoch,
      expectedFence: phase.fence,
    }),
  ).toEqual({ outcome: 'stale', state: retry.state, effects: [] });
});

test('exact hydration completion creates account_ready', () => {
  const state = hydratingAccount();
  const phase = phaseAs(state, 'new_device_hydration_required');
  const result = reduceAccountSession(state, {
    type: 'HYDRATION_CONFIRMED',
    transitionEpoch: phase.hydrationAttemptEpoch,
    expectedFence: phase.fence,
  });

  expect(phaseAs(result.state, 'account_ready').fence).toEqual(phase.fence);
  expect(result.effects).toEqual([]);
});

test('same UID with a new generation rejects old hydration completion', () => {
  const state = hydratingAccount();
  const oldPhase = phaseAs(state, 'new_device_hydration_required');
  const newerFence = { ...oldPhase.fence, generation: oldPhase.fence.generation + 1 };
  const newerState: AccountSessionState = {
    transitionEpoch: state.transitionEpoch + 1,
    phase: {
      ...oldPhase,
      fence: newerFence,
      hydrationAttemptEpoch: state.transitionEpoch + 1,
    },
  };

  expect(
    reduceAccountSession(newerState, {
      type: 'HYDRATION_CONFIRMED',
      transitionEpoch: oldPhase.hydrationAttemptEpoch,
      expectedFence: oldPhase.fence,
    }),
  ).toEqual({ outcome: 'stale', state: newerState, effects: [] });
});

test('session and transition equality require every fence and lease field', () => {
  const fence: SessionFence = {
    scopeKey: 'account:uid-1',
    uid: 'uid-1',
    generation: 7,
    nonce: 'nonce-7',
  };
  expect(sameSessionFence(fence, { ...fence })).toBe(true);
  expect(sameSessionFence(fence, { ...fence, scopeKey: 'account:uid-2' })).toBe(false);
  expect(sameSessionFence(fence, { ...fence, uid: 'uid-2' })).toBe(false);
  expect(sameSessionFence(fence, { ...fence, generation: 8 })).toBe(false);
  expect(sameSessionFence(fence, { ...fence, nonce: 'nonce-8' })).toBe(false);

  const lease = { transitionEpoch: 9, basedOn: fence } as const;
  expect(sameTransitionLease(lease, { ...lease })).toBe(true);
  expect(sameTransitionLease(lease, { ...lease, transitionEpoch: 10 })).toBe(false);
  expect(
    sameTransitionLease(lease, { ...lease, basedOn: { ...fence, nonce: 'other' } }),
  ).toBe(false);
});

test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 0.5, MAX + 1])(
  'sameSessionFence rejects malformed generation %p on either side',
  generation => {
    const fence: SessionFence = {
      scopeKey: 'account:uid-1',
      uid: 'uid-1',
      generation: 0,
      nonce: 'nonce-1',
    };
    expectInvariant('invalid_input', () =>
      sameSessionFence({ ...fence, generation }, fence),
    );
    expectInvariant('invalid_input', () =>
      sameSessionFence(fence, { ...fence, generation }),
    );
  },
);

test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 0.5, MAX + 1])(
  'sameTransitionLease rejects malformed epoch %p on either side',
  transitionEpoch => {
    const fence: SessionFence = {
      scopeKey: 'account:uid-1',
      uid: 'uid-1',
      generation: 0,
      nonce: 'nonce-1',
    };
    const lease = { transitionEpoch: 0, basedOn: fence };
    expectInvariant('invalid_input', () =>
      sameTransitionLease({ ...lease, transitionEpoch }, lease),
    );
    expectInvariant('invalid_input', () =>
      sameTransitionLease(lease, { ...lease, transitionEpoch }),
    );
  },
);

test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 0.5, MAX + 1])(
  'sameTransitionLease rejects malformed nested generation %p on either side',
  generation => {
    const fence: SessionFence = {
      scopeKey: 'account:uid-1',
      uid: 'uid-1',
      generation: 0,
      nonce: 'nonce-1',
    };
    const lease = { transitionEpoch: 0, basedOn: fence };
    const malformed = {
      ...lease,
      basedOn: { ...fence, generation },
    };
    expectInvariant('invalid_input', () => sameTransitionLease(malformed, lease));
    expectInvariant('invalid_input', () => sameTransitionLease(lease, malformed));
  },
);

test.each([
  ['scopeKey', ''],
  ['scopeKey', ' account:uid-1 '],
  ['uid', ''],
  ['uid', ' uid-1 '],
  ['nonce', ''],
  ['nonce', ' nonce-1 '],
] as const)('sameSessionFence rejects malformed %s %p on either side', (field, value) => {
  const fence: SessionFence = {
    scopeKey: 'account:uid-1',
    uid: 'uid-1',
    generation: 0,
    nonce: 'nonce-1',
  };
  const malformed = { ...fence, [field]: value } as SessionFence;
  expectInvariant('invalid_input', () => sameSessionFence(malformed, fence));
  expectInvariant('invalid_input', () => sameSessionFence(fence, malformed));
});

test('public equality helpers accept finite boundaries and preserve valid mismatch semantics', () => {
  const zeroFence: SessionFence = {
    scopeKey: 'account:uid-1',
    uid: 'uid-1',
    generation: 0,
    nonce: 'nonce-1',
  };
  const maxFence: SessionFence = { ...zeroFence, generation: MAX };

  expect(sameSessionFence(zeroFence, { ...zeroFence })).toBe(true);
  expect(sameSessionFence(maxFence, { ...maxFence })).toBe(true);
  expect(sameSessionFence(zeroFence, maxFence)).toBe(false);

  const zeroLease = { transitionEpoch: 0, basedOn: zeroFence };
  const maxLease = { transitionEpoch: MAX, basedOn: maxFence };
  expect(sameTransitionLease(zeroLease, { ...zeroLease })).toBe(true);
  expect(sameTransitionLease(maxLease, { ...maxLease })).toBe(true);
  expect(sameTransitionLease(zeroLease, maxLease)).toBe(false);
});

test('offline logout records pending work honestly without a sync effect', () => {
  const account = cachedAccount();
  const result = reduceAccountSession(account, {
    type: 'LOGOUT_REQUESTED',
    pendingCount: 3,
    online: false,
  });
  const phase = phaseAs(result.state, 'logout_confirmation');

  expect(phase.pendingCount).toBe(3);
  expect(phase.online).toBe(false);
  expect(phase.lease.transitionEpoch).toBe(account.transitionEpoch + 1);
  expect(result.effects).toEqual([]);
});

test('exact logout cancel restores the account and stales old confirmation', () => {
  const state = logoutConfirmation();
  const phase = phaseAs(state, 'logout_confirmation');
  const result = reduceAccountSession(state, {
    type: 'LOGOUT_CANCELLED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.lease.basedOn,
  });

  expect(result.state.phase).toEqual(phase.active);
  expect(result.state.transitionEpoch).toBe(state.transitionEpoch + 1);
  expect(result.effects).toEqual([]);
  expect(
    reduceAccountSession(result.state, {
      type: 'LOGOUT_CONFIRMED_KEEP_LOCAL',
      transitionEpoch: phase.lease.transitionEpoch,
      expectedFence: phase.lease.basedOn,
      transitionNonce: 'logout-nonce',
    }),
  ).toEqual({ outcome: 'stale', state: result.state, effects: [] });
});

test('logout invalidates first and emits only CLOSE_SCOPE while preserving outbox', () => {
  const state = logoutConfirmation();
  const phase = phaseAs(state, 'logout_confirmation');
  const result = reduceAccountSession(state, {
    type: 'LOGOUT_CONFIRMED_KEEP_LOCAL',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.lease.basedOn,
    transitionNonce: 'logout-nonce-1',
  });
  const closing = phaseAs(result.state, 'closing_scope_for_logout');

  expect(closing.preserveOutbox).toBe(true);
  expect(closing.transitionFence.generation).toBe(closing.oldFence.generation + 1);
  expect(result.effects).toEqual([
    {
      type: 'INVALIDATE_SESSION',
      previous: closing.oldFence,
      next: closing.transitionFence,
    },
    {
      type: 'CLOSE_SCOPE',
      scope: closing.oldScope,
      closedFence: closing.oldFence,
      transitionEpoch: closing.lease.transitionEpoch,
    },
  ]);
});

test('exact logout close proof begins provider sign-out and failure retry cannot skip it', () => {
  const closingState = closingForLogout();
  const closing = phaseAs(closingState, 'closing_scope_for_logout');
  const advanced = reduceAccountSession(closingState, {
    type: 'SCOPE_CLOSE_CONFIRMED',
    transitionEpoch: closing.lease.transitionEpoch,
    closedFence: closing.oldFence,
  });
  const provider = phaseAs(advanced.state, 'provider_signing_out');
  expect(advanced.effects).toEqual([
    {
      type: 'BEGIN_PROVIDER_SIGN_OUT',
      transitionEpoch: provider.lease.transitionEpoch,
      expectedFence: provider.transitionFence,
      preserveOutbox: true,
    },
  ]);

  const failed = reduceAccountSession(providerSigningOut(), {
    type: 'PROVIDER_SIGN_OUT_FAILED',
    transitionEpoch: provider.lease.transitionEpoch,
    expectedFence: provider.transitionFence,
    code: 'sign_out_failed',
  });
  const retried = reduceAccountSession(failed.state, {
    type: 'RETRY_TRANSITION',
    transitionEpoch: provider.lease.transitionEpoch,
    expectedFence: provider.transitionFence,
  });
  expect(retried.effects).toEqual([
    {
      type: 'BEGIN_PROVIDER_SIGN_OUT',
      transitionEpoch: provider.lease.transitionEpoch,
      expectedFence: provider.transitionFence,
      preserveOutbox: true,
    },
  ]);
});

test('provider success builds guest scope internally and only opens it', () => {
  const state = providerSigningOut();
  const phase = phaseAs(state, 'provider_signing_out');
  const result = reduceAccountSession(state, {
    type: 'PROVIDER_SIGN_OUT_CONFIRMED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.transitionFence,
    rawGuestInstallationId: 'installation-2',
    rawGuestNonce: 'guest-nonce-2',
  });
  const opening = phaseAs(result.state, 'opening_guest_scope');

  expect(opening.scope).toEqual({
    kind: 'guest',
    installationId: 'installation-2',
    scopeKey: 'guest:installation-2',
  });
  expect(opening.fence).toEqual({
    scopeKey: 'guest:installation-2',
    uid: null,
    generation: phase.transitionFence.generation,
    nonce: 'guest-nonce-2',
  });
  expect(result.effects).toEqual([
    {
      type: 'OPEN_SCOPE',
      scope: opening.scope,
      fence: opening.fence,
      transitionEpoch: opening.lease.transitionEpoch,
    },
  ]);
});

test('guest open failure quarantines and exact retry never creates guest_ready', () => {
  const state = openingGuest();
  const phase = phaseAs(state, 'opening_guest_scope');
  const failed = reduceAccountSession(state, {
    type: 'GUEST_SCOPE_OPEN_FAILED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.fence,
    code: 'guest_open_failed',
  });
  const retry = reduceAccountSession(failed.state, {
    type: 'RETRY_TRANSITION',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.fence,
  });
  expect(retry.state.phase).toEqual(phase);
  expect(retry.effects).toEqual([
    {
      type: 'OPEN_SCOPE',
      scope: phase.scope,
      fence: phase.fence,
      transitionEpoch: phase.lease.transitionEpoch,
    },
  ]);

  const ready = reduceAccountSession(retry.state, {
    type: 'GUEST_SCOPE_OPENED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: phase.fence,
  });
  expect(phaseAs(ready.state, 'guest_ready').fence).toEqual(phase.fence);
});

test('well-formed async completions from an already advanced stage are stale no-ops', () => {
  const signIn = startSignIn();
  const signInPhase = phaseAs(signIn, 'sign_in_provider');
  const authEvent: AccountSessionEvent = {
    type: 'AUTH_UID_CONFIRMED',
    transitionEpoch: signInPhase.lease.transitionEpoch,
    expectedFence: signInPhase.lease.basedOn,
    uid: 'uid-1',
    nextNonce: 'account-nonce-1',
  };
  const afterAuth = reduceAccountSession(signIn, authEvent).state;

  const closing = phaseAs(afterAuth, 'closing_scope_for_sign_in');
  const closeSuccess: AccountSessionEvent = {
    type: 'SCOPE_CLOSE_CONFIRMED',
    transitionEpoch: closing.lease.transitionEpoch,
    closedFence: closing.oldFence,
  };
  const afterClose = reduceAccountSession(afterAuth, closeSuccess).state;
  const lateCloseFailure: AccountSessionEvent = {
    type: 'SCOPE_CLOSE_FAILED',
    transitionEpoch: closing.lease.transitionEpoch,
    closedFence: closing.oldFence,
    code: 'late_close_failed',
  };

  const openingAccountPhase = phaseAs(afterClose, 'opening_account_scope');
  const accountOpenSuccess: AccountSessionEvent = {
    type: 'ACCOUNT_SCOPE_OPENED',
    transitionEpoch: openingAccountPhase.lease.transitionEpoch,
    expectedFence: openingAccountPhase.fence,
    hasVerifiedCache: true,
  };
  const afterAccountOpen = reduceAccountSession(afterClose, accountOpenSuccess).state;
  const lateAccountOpenFailure: AccountSessionEvent = {
    type: 'ACCOUNT_SCOPE_OPEN_FAILED',
    transitionEpoch: openingAccountPhase.lease.transitionEpoch,
    expectedFence: openingAccountPhase.fence,
    code: 'late_open_failed',
  };

  const hydration = hydratingAccount();
  const hydrationPhase = phaseAs(hydration, 'new_device_hydration_required');
  const hydrationSuccess: AccountSessionEvent = {
    type: 'HYDRATION_CONFIRMED',
    transitionEpoch: hydrationPhase.hydrationAttemptEpoch,
    expectedFence: hydrationPhase.fence,
  };
  const afterHydration = reduceAccountSession(hydration, hydrationSuccess).state;

  const provider = providerSigningOut();
  const providerPhase = phaseAs(provider, 'provider_signing_out');
  const providerSuccess: AccountSessionEvent = {
    type: 'PROVIDER_SIGN_OUT_CONFIRMED',
    transitionEpoch: providerPhase.lease.transitionEpoch,
    expectedFence: providerPhase.transitionFence,
    rawGuestInstallationId: 'installation-2',
    rawGuestNonce: 'guest-nonce-2',
  };
  const afterProvider = reduceAccountSession(provider, providerSuccess).state;
  const lateProviderFailure: AccountSessionEvent = {
    type: 'PROVIDER_SIGN_OUT_FAILED',
    transitionEpoch: providerPhase.lease.transitionEpoch,
    expectedFence: providerPhase.transitionFence,
    code: 'late_sign_out_failed',
  };

  const openingGuestState = openingGuest();
  const openingGuestPhase = phaseAs(openingGuestState, 'opening_guest_scope');
  const guestOpenSuccess: AccountSessionEvent = {
    type: 'GUEST_SCOPE_OPENED',
    transitionEpoch: openingGuestPhase.lease.transitionEpoch,
    expectedFence: openingGuestPhase.fence,
  };
  const afterGuestOpen = reduceAccountSession(openingGuestState, guestOpenSuccess).state;
  const lateGuestOpenFailure: AccountSessionEvent = {
    type: 'GUEST_SCOPE_OPEN_FAILED',
    transitionEpoch: openingGuestPhase.lease.transitionEpoch,
    expectedFence: openingGuestPhase.fence,
    code: 'late_guest_open_failed',
  };

  const replays = [
    { state: afterAuth, event: authEvent },
    { state: afterClose, event: lateCloseFailure },
    { state: afterAccountOpen, event: lateAccountOpenFailure },
    { state: afterHydration, event: hydrationSuccess },
    { state: afterProvider, event: lateProviderFailure },
    { state: afterGuestOpen, event: lateGuestOpenFailure },
  ] as const;

  for (const replay of replays) {
    expect(reduceAccountSession(replay.state, replay.event)).toEqual({
      outcome: 'stale',
      state: replay.state,
      effects: [],
    });
  }
});

test('late failure from a retried operation is stale after its success advances the phase', () => {
  const original = closeForSignIn();
  const closing = phaseAs(original, 'closing_scope_for_sign_in');
  const failure: AccountSessionEvent = {
    type: 'SCOPE_CLOSE_FAILED',
    transitionEpoch: closing.lease.transitionEpoch,
    closedFence: closing.oldFence,
    code: 'close_failed',
  };
  const attentionState = reduceAccountSession(original, failure).state;
  const retried = reduceAccountSession(attentionState, {
    type: 'RETRY_TRANSITION',
    transitionEpoch: closing.lease.transitionEpoch,
    expectedFence: closing.oldFence,
  }).state;
  const advanced = reduceAccountSession(retried, {
    type: 'SCOPE_CLOSE_CONFIRMED',
    transitionEpoch: closing.lease.transitionEpoch,
    closedFence: closing.oldFence,
  }).state;

  expect(reduceAccountSession(advanced, failure)).toEqual({
    outcome: 'stale',
    state: advanced,
    effects: [],
  });
});

test('sign-in cancel re-arms interrupted hydration with a fresh reducer epoch', () => {
  const hydration = hydratingAccount();
  const interrupted = phaseAs(hydration, 'new_device_hydration_required');
  const signingIn = reduceAccountSession(hydration, { type: 'SIGN_IN_STARTED' }).state;
  const signInPhase = phaseAs(signingIn, 'sign_in_provider');
  const cancelled = reduceAccountSession(signingIn, {
    type: 'SIGN_IN_CANCELLED',
    transitionEpoch: signInPhase.lease.transitionEpoch,
    expectedFence: signInPhase.lease.basedOn,
  });
  const restarted = phaseAs(cancelled.state, 'new_device_hydration_required');

  expect(restarted.hydrationAttemptEpoch).toBe(cancelled.state.transitionEpoch);
  expect(restarted.hydrationAttemptEpoch).toBeGreaterThan(interrupted.hydrationAttemptEpoch);
  expect(cancelled.effects).toEqual([
    { type: 'REQUEST_CANCEL_AUTH', transitionEpoch: signInPhase.lease.transitionEpoch },
    {
      type: 'BEGIN_HYDRATION',
      transitionEpoch: restarted.hydrationAttemptEpoch,
      expectedFence: restarted.fence,
    },
  ]);
  expect(
    reduceAccountSession(cancelled.state, {
      type: 'HYDRATION_CONFIRMED',
      transitionEpoch: interrupted.hydrationAttemptEpoch,
      expectedFence: interrupted.fence,
    }),
  ).toEqual({ outcome: 'stale', state: cancelled.state, effects: [] });
  expect(
    phaseAs(
      reduceAccountSession(cancelled.state, {
        type: 'HYDRATION_CONFIRMED',
        transitionEpoch: restarted.hydrationAttemptEpoch,
        expectedFence: restarted.fence,
      }).state,
      'account_ready',
    ).fence,
  ).toEqual(restarted.fence);
});

test('logout cancel re-arms interrupted hydration with no manual retry', () => {
  const hydration = hydratingAccount();
  const interrupted = phaseAs(hydration, 'new_device_hydration_required');
  const confirmation = reduceAccountSession(hydration, {
    type: 'LOGOUT_REQUESTED',
    pendingCount: 3,
    online: false,
  }).state;
  const logoutPhase = phaseAs(confirmation, 'logout_confirmation');
  const cancelled = reduceAccountSession(confirmation, {
    type: 'LOGOUT_CANCELLED',
    transitionEpoch: logoutPhase.lease.transitionEpoch,
    expectedFence: logoutPhase.lease.basedOn,
  });
  const restarted = phaseAs(cancelled.state, 'new_device_hydration_required');

  expect(restarted.hydrationAttemptEpoch).toBe(cancelled.state.transitionEpoch);
  expect(restarted.hydrationAttemptEpoch).toBeGreaterThan(interrupted.hydrationAttemptEpoch);
  expect(cancelled.effects).toEqual([
    {
      type: 'BEGIN_HYDRATION',
      transitionEpoch: restarted.hydrationAttemptEpoch,
      expectedFence: restarted.fence,
    },
  ]);
  expect(
    reduceAccountSession(cancelled.state, {
      type: 'HYDRATION_CONFIRMED',
      transitionEpoch: interrupted.hydrationAttemptEpoch,
      expectedFence: interrupted.fence,
    }),
  ).toEqual({ outcome: 'stale', state: cancelled.state, effects: [] });
  expect(
    phaseAs(
      reduceAccountSession(cancelled.state, {
        type: 'HYDRATION_CONFIRMED',
        transitionEpoch: restarted.hydrationAttemptEpoch,
        expectedFence: restarted.fence,
      }).state,
      'account_ready',
    ).fence,
  ).toEqual(restarted.fence);
});

type CompletionFixture = Readonly<{
  name: string;
  state: AccountSessionState;
  event: AccountSessionEvent & {
    transitionEpoch: number;
    expectedFence?: SessionFence;
    closedFence?: SessionFence;
  };
  fenceKey: 'expectedFence' | 'closedFence';
}>;

function completionFixtures(): readonly CompletionFixture[] {
  const signIn = startSignIn();
  const signInPhase = phaseAs(signIn, 'sign_in_provider');
  const closingSignIn = closeForSignIn();
  const closingSignInPhase = phaseAs(closingSignIn, 'closing_scope_for_sign_in');
  const openingAccountState = openAccount();
  const openingAccountPhase = phaseAs(openingAccountState, 'opening_account_scope');
  const hydrationState = hydratingAccount();
  const hydrationPhase = phaseAs(hydrationState, 'new_device_hydration_required');
  const logoutState = logoutConfirmation();
  const logoutPhase = phaseAs(logoutState, 'logout_confirmation');
  const providerState = providerSigningOut();
  const providerPhase = phaseAs(providerState, 'provider_signing_out');
  const guestState = openingGuest();
  const guestPhase = phaseAs(guestState, 'opening_guest_scope');

  return [
    {
      name: 'sign-in cancel', state: signIn, fenceKey: 'expectedFence',
      event: { type: 'SIGN_IN_CANCELLED', transitionEpoch: signInPhase.lease.transitionEpoch, expectedFence: signInPhase.lease.basedOn },
    },
    {
      name: 'auth success', state: signIn, fenceKey: 'expectedFence',
      event: { type: 'AUTH_UID_CONFIRMED', transitionEpoch: signInPhase.lease.transitionEpoch, expectedFence: signInPhase.lease.basedOn, uid: 'uid-1', nextNonce: 'nonce-next' },
    },
    {
      name: 'scope close success', state: closingSignIn, fenceKey: 'closedFence',
      event: { type: 'SCOPE_CLOSE_CONFIRMED', transitionEpoch: closingSignInPhase.lease.transitionEpoch, closedFence: closingSignInPhase.oldFence },
    },
    {
      name: 'scope close failure', state: closingSignIn, fenceKey: 'closedFence',
      event: { type: 'SCOPE_CLOSE_FAILED', transitionEpoch: closingSignInPhase.lease.transitionEpoch, closedFence: closingSignInPhase.oldFence, code: 'close_failed' },
    },
    {
      name: 'account open success', state: openingAccountState, fenceKey: 'expectedFence',
      event: { type: 'ACCOUNT_SCOPE_OPENED', transitionEpoch: openingAccountPhase.lease.transitionEpoch, expectedFence: openingAccountPhase.fence, hasVerifiedCache: true },
    },
    {
      name: 'account open failure', state: openingAccountState, fenceKey: 'expectedFence',
      event: { type: 'ACCOUNT_SCOPE_OPEN_FAILED', transitionEpoch: openingAccountPhase.lease.transitionEpoch, expectedFence: openingAccountPhase.fence, code: 'open_failed' },
    },
    {
      name: 'hydration success', state: hydrationState, fenceKey: 'expectedFence',
      event: { type: 'HYDRATION_CONFIRMED', transitionEpoch: hydrationPhase.hydrationAttemptEpoch, expectedFence: hydrationPhase.fence },
    },
    {
      name: 'logout cancel', state: logoutState, fenceKey: 'expectedFence',
      event: { type: 'LOGOUT_CANCELLED', transitionEpoch: logoutPhase.lease.transitionEpoch, expectedFence: logoutPhase.lease.basedOn },
    },
    {
      name: 'logout confirm', state: logoutState, fenceKey: 'expectedFence',
      event: { type: 'LOGOUT_CONFIRMED_KEEP_LOCAL', transitionEpoch: logoutPhase.lease.transitionEpoch, expectedFence: logoutPhase.lease.basedOn, transitionNonce: 'logout-nonce' },
    },
    {
      name: 'provider sign-out success', state: providerState, fenceKey: 'expectedFence',
      event: { type: 'PROVIDER_SIGN_OUT_CONFIRMED', transitionEpoch: providerPhase.lease.transitionEpoch, expectedFence: providerPhase.transitionFence, rawGuestInstallationId: 'installation-2', rawGuestNonce: 'guest-nonce-2' },
    },
    {
      name: 'provider sign-out failure', state: providerState, fenceKey: 'expectedFence',
      event: { type: 'PROVIDER_SIGN_OUT_FAILED', transitionEpoch: providerPhase.lease.transitionEpoch, expectedFence: providerPhase.transitionFence, code: 'sign_out_failed' },
    },
    {
      name: 'guest open success', state: guestState, fenceKey: 'expectedFence',
      event: { type: 'GUEST_SCOPE_OPENED', transitionEpoch: guestPhase.lease.transitionEpoch, expectedFence: guestPhase.fence },
    },
    {
      name: 'guest open failure', state: guestState, fenceKey: 'expectedFence',
      event: { type: 'GUEST_SCOPE_OPEN_FAILED', transitionEpoch: guestPhase.lease.transitionEpoch, expectedFence: guestPhase.fence, code: 'guest_open_failed' },
    },
  ];
}

test.each(completionFixtures())(
  '$name is stale for every one-field epoch/fence mismatch',
  ({ state, event, fenceKey }) => {
    const fence = event[fenceKey];
    if (!fence) throw new Error(`Missing ${fenceKey}`);
    const variants: readonly AccountSessionEvent[] = [
      { ...event, transitionEpoch: event.transitionEpoch + 1 } as AccountSessionEvent,
      { ...event, [fenceKey]: { ...fence, scopeKey: fence.uid === null ? 'guest:other' : 'account:other' } } as AccountSessionEvent,
      { ...event, [fenceKey]: { ...fence, uid: fence.uid === null ? 'other-uid' : `${fence.uid}-other` } } as AccountSessionEvent,
      { ...event, [fenceKey]: { ...fence, generation: fence.generation + 1 } } as AccountSessionEvent,
      { ...event, [fenceKey]: { ...fence, nonce: 'other-nonce' } } as AccountSessionEvent,
    ];

    for (const variant of variants) {
      expect(reduceAccountSession(state, variant)).toEqual({
        outcome: 'stale',
        state,
        effects: [],
      });
    }
  },
);

test.each([0, 42, MAX])('accepts valid pendingCount %p', pendingCount => {
  const result = reduceAccountSession(cachedAccount(), {
    type: 'LOGOUT_REQUESTED',
    pendingCount,
    online: true,
  });
  expect(phaseAs(result.state, 'logout_confirmation').pendingCount).toBe(pendingCount);
});

test.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0.5, MAX + 1])(
  'rejects malformed pendingCount %p',
  pendingCount => {
    const state = cachedAccount();
    const before = JSON.stringify(state);
    expectInvariant('invalid_input', () =>
      reduceAccountSession(state, { type: 'LOGOUT_REQUESTED', pendingCount, online: true }),
    );
    expect(JSON.stringify(state)).toBe(before);
  },
);

test.each([0, 42, MAX])('treats safe transitionEpoch %p as well-formed', transitionEpoch => {
  const state = startSignIn();
  const phase = phaseAs(state, 'sign_in_provider');
  const result = reduceAccountSession(state, {
    type: 'SIGN_IN_CANCELLED',
    transitionEpoch,
    expectedFence: phase.lease.basedOn,
  });
  expect(result.outcome).toBe(transitionEpoch === phase.lease.transitionEpoch ? 'applied' : 'stale');
});

test.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0.5, MAX + 1])(
  'rejects malformed transitionEpoch %p before comparison',
  transitionEpoch => {
    const state = startSignIn();
    const phase = phaseAs(state, 'sign_in_provider');
    expectInvariant('invalid_input', () =>
      reduceAccountSession(state, {
        type: 'SIGN_IN_CANCELLED',
        transitionEpoch,
        expectedFence: phase.lease.basedOn,
      }),
    );
  },
);

test.each([0, 42, MAX])('treats safe generation %p as well-formed', generation => {
  const state = startSignIn();
  const phase = phaseAs(state, 'sign_in_provider');
  const result = reduceAccountSession(state, {
    type: 'SIGN_IN_CANCELLED',
    transitionEpoch: phase.lease.transitionEpoch,
    expectedFence: { ...phase.lease.basedOn, generation },
  });
  expect(result.outcome).toBe(generation === phase.lease.basedOn.generation ? 'applied' : 'stale');
});

test.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0.5, MAX + 1])(
  'rejects malformed generation %p before comparison',
  generation => {
    const state = startSignIn();
    const phase = phaseAs(state, 'sign_in_provider');
    expectInvariant('invalid_input', () =>
      reduceAccountSession(state, {
        type: 'SIGN_IN_CANCELLED',
        transitionEpoch: phase.lease.transitionEpoch,
        expectedFence: { ...phase.lease.basedOn, generation },
      }),
    );
  },
);

test('rejects epoch and generation increment at MAX_SAFE_INTEGER without wrap', () => {
  const guest = initialGuest();
  const guestPhase = phaseAs(guest, 'guest_ready');
  const epochMax: AccountSessionState = { ...guest, transitionEpoch: MAX };
  expectInvariant('invalid_input', () =>
    reduceAccountSession(epochMax, { type: 'SIGN_IN_STARTED' }),
  );

  const generationMax: AccountSessionState = {
    ...guest,
    phase: {
      ...guestPhase,
      fence: { ...guestPhase.fence, generation: MAX },
    },
  };
  const started = reduceAccountSession(generationMax, { type: 'SIGN_IN_STARTED' }).state;
  const lease = phaseAs(started, 'sign_in_provider').lease;
  expectInvariant('invalid_input', () =>
    reduceAccountSession(started, {
      type: 'AUTH_UID_CONFIRMED',
      transitionEpoch: lease.transitionEpoch,
      expectedFence: lease.basedOn,
      uid: 'uid-1',
      nextNonce: 'account-nonce',
    }),
  );
});

test.each(['failure_code', '', '   ', ' failure_code '])(
  'validates failure code %p with trim-exact semantics',
  code => {
    const state = openAccount();
    const phase = phaseAs(state, 'opening_account_scope');
    const operation = () =>
      reduceAccountSession(state, {
        type: 'ACCOUNT_SCOPE_OPEN_FAILED',
        transitionEpoch: phase.lease.transitionEpoch,
        expectedFence: phase.fence,
        code,
      });
    if (code === 'failure_code') {
      expect(phaseAs(operation().state, 'transition_attention').code).toBe(code);
    } else {
      expectInvariant('invalid_input', operation);
    }
  },
);

test.each([
  ['AUTH_UID_CONFIRMED', ' uid '],
  ['AUTH_UID_CONFIRMED', ''],
] as const)('rejects trim-mismatched or blank UID for %s', (_type, uid) => {
  const state = startSignIn();
  const phase = phaseAs(state, 'sign_in_provider');
  expectInvariant('invalid_input', () =>
    reduceAccountSession(state, {
      type: 'AUTH_UID_CONFIRMED',
      transitionEpoch: phase.lease.transitionEpoch,
      expectedFence: phase.lease.basedOn,
      uid,
      nextNonce: 'nonce',
    }),
  );
});

test('throws invalid_event_for_state for an exact but impossible event', () => {
  expectInvariant('invalid_event_for_state', () =>
    reduceAccountSession(initialGuest(), {
      type: 'HYDRATION_RETRY_REQUESTED',
    }),
  );
});
