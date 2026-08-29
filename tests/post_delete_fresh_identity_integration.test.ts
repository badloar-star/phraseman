import type {
  AccountDeletePendingAuthLock,
  AccountDeleteTransitionPhase,
  PostDeleteFreshIdentityTransitionDependencies,
} from '../app/account_delete_quarantine';
import { runPostDeleteFreshIdentityTransition } from '../app/account_delete_quarantine';

function transition(
  overrides: Partial<AccountDeletePendingAuthLock> = {},
): AccountDeletePendingAuthLock {
  return {
    operationId: 'delete-op',
    providerUid: 'retired-provider',
    stableId: 'retired-stable',
    source: 'local',
    phase: 'prepared',
    createdAt: 1,
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

function harness(initial = transition()) {
  let current = initial;
  const calls: string[] = [];
  const deps: PostDeleteFreshIdentityTransitionDependencies = {
    wipeLocal: async () => { calls.push('wipe_local'); return true; },
    enqueueDeletion: async () => { calls.push('enqueue_delete'); return true; },
    signOutProvider: async () => { calls.push('provider_sign_out'); return true; },
    clearOldStable: async () => { calls.push('clear_old_stable'); return true; },
    authenticateAnonymously: async () => {
      calls.push('anonymous_auth');
      return { ok: true, authUid: 'fresh-auth', stableId: 'fresh-stable', isAnonymous: true };
    },
    linkAuthoritatively: async () => {
      calls.push('authoritative_link');
      return { ok: true, authUid: 'fresh-auth', stableId: 'fresh-stable' };
    },
    adoptAuthoritativeStable: async () => {
      calls.push('adopt_authoritative_stable');
      return true;
    },
    beginAccountGeneration: () => { calls.push('begin_account_generation'); },
    persistPhase: async (expected, phase, proof) => {
      expect(current.operationId).toBe(expected.operationId);
      current = { ...current, ...proof, phase };
      calls.push(`persist:${phase}`);
      return { ok: true, lock: current };
    },
    clearTransition: async () => { calls.push('clear_transition'); return true; },
    emitLocalWipeReady: () => { calls.push('emit:account_deleted'); },
    emitReady: () => { calls.push('emit:post_delete_identity_ready'); },
  };
  return { deps, calls, getCurrent: () => current };
}

test('fresh post-deletion identity follows the exact durable happy-path order', async () => {
  const h = harness();

  await expect(runPostDeleteFreshIdentityTransition(transition(), h.deps)).resolves.toEqual({
    status: 'ready',
    authUid: 'fresh-auth',
    stableId: 'fresh-stable',
  });

  expect(h.calls).toEqual([
    'wipe_local',
    'persist:local_data_cleared',
    'emit:account_deleted',
    'enqueue_delete',
    'persist:server_enqueued',
    'provider_sign_out',
    'persist:provider_signed_out',
    'clear_old_stable',
    'persist:old_stable_cleared',
    'anonymous_auth',
    'persist:anonymous_authenticated',
    'authoritative_link',
    'persist:stable_link_verified',
    'adopt_authoritative_stable',
    'begin_account_generation',
    'persist:ready',
    'clear_transition',
    'emit:post_delete_identity_ready',
  ]);
});

test('authoritative remote retirement never enqueues deletion for a fresh provider uid', async () => {
  const record = transition({ source: 'remote', providerUid: 'fresh-provider-auth' });
  const h = harness(record);

  await runPostDeleteFreshIdentityTransition(record, h.deps);

  expect(h.calls).not.toContain('enqueue_delete');
  expect(h.calls).toContain('persist:server_enqueued');
  expect(h.calls).toContain('anonymous_auth');
});

test.each([
  ['server_enqueued', ['emit:account_deleted', 'provider_sign_out']],
  ['provider_signed_out', ['emit:account_deleted', 'clear_old_stable']],
  ['old_stable_cleared', ['emit:account_deleted', 'anonymous_auth']],
  ['anonymous_authenticated', ['emit:account_deleted', 'authoritative_link']],
] as const)('restart at %s resumes at the next action', async (phase, expectedPrefix) => {
  const proof = phase === 'anonymous_authenticated'
    ? { freshAuthUid: 'fresh-auth', freshStableId: 'fresh-stable' }
    : {};
  const record = transition({ phase: phase as AccountDeleteTransitionPhase, ...proof });
  const h = harness(record);

  await runPostDeleteFreshIdentityTransition(record, h.deps);

  expect(h.calls.slice(0, expectedPrefix.length)).toEqual(expectedPrefix);
  expect(h.calls).not.toContain('wipe_local');
  expect(h.calls).not.toContain('enqueue_delete');
});

test('sign-out failure cannot clear stable identity or authenticate anonymously', async () => {
  const record = transition({ phase: 'server_enqueued' });
  const h = harness(record);
  h.deps.signOutProvider = async () => { h.calls.push('provider_sign_out'); return false; };

  await expect(runPostDeleteFreshIdentityTransition(record, h.deps)).resolves.toEqual({
    status: 'pending_auth',
    phase: 'server_enqueued',
  });
  expect(h.calls).toEqual(['provider_sign_out']);
});

test('SecureStore clear failure cannot create a fresh stable identity', async () => {
  const record = transition({ phase: 'provider_signed_out' });
  const h = harness(record);
  h.deps.clearOldStable = async () => { h.calls.push('clear_old_stable'); return false; };

  await expect(runPostDeleteFreshIdentityTransition(record, h.deps)).resolves.toEqual({
    status: 'fatal_local_guard',
    phase: 'provider_signed_out',
  });
  expect(h.calls).toEqual(['clear_old_stable']);
});

test.each([
  [{ ok: true, authUid: 'retired-provider', stableId: 'fresh-stable', isAnonymous: true }, 'pending_auth'],
  [{ ok: true, authUid: 'fresh-auth', stableId: 'retired-stable', isAnonymous: true }, 'fatal_local_guard'],
  [{ ok: true, authUid: 'fresh-auth', stableId: 'fresh-stable', isAnonymous: false }, 'pending_auth'],
] as const)('rejects invalid anonymous identity proof %#', async (anonymous, status) => {
  const record = transition({ phase: 'old_stable_cleared' });
  const h = harness(record);
  h.deps.authenticateAnonymously = async () => anonymous;

  const result = await runPostDeleteFreshIdentityTransition(record, h.deps);

  expect(result.status).toBe(status);
  expect(h.calls).not.toContain('authoritative_link');
});

test('authoritative link must prove the exact fresh auth uid before account generation begins', async () => {
  const record = transition({
    phase: 'anonymous_authenticated',
    freshAuthUid: 'fresh-auth',
    freshStableId: 'fresh-stable',
  });
  const h = harness(record);
  h.deps.linkAuthoritatively = async () => ({
    ok: true,
    authUid: 'other-auth',
    stableId: 'fresh-stable',
  });

  await expect(runPostDeleteFreshIdentityTransition(record, h.deps)).resolves.toEqual({
    status: 'pending_auth',
    phase: 'anonymous_authenticated',
  });
  expect(h.calls).not.toContain('begin_account_generation');
});

test('authoritative canonical stable id is durably adopted for the exact fresh auth uid', async () => {
  const record = transition({
    phase: 'anonymous_authenticated',
    freshAuthUid: 'fresh-auth',
    freshStableId: 'provisional-stable',
  });
  const h = harness(record);
  h.deps.linkAuthoritatively = async () => {
    h.calls.push('authoritative_link');
    return {
      ok: true,
      authUid: 'fresh-auth',
      stableId: 'canonical-stable',
    };
  };
  h.deps.adoptAuthoritativeStable = async (stableId) => {
    h.calls.push(`adopt:${stableId}`);
    return true;
  };

  await expect(runPostDeleteFreshIdentityTransition(record, h.deps)).resolves.toEqual({
    status: 'ready',
    authUid: 'fresh-auth',
    stableId: 'canonical-stable',
  });
  expect(h.getCurrent()).toMatchObject({
    phase: 'ready',
    freshStableId: 'canonical-stable',
  });
  expect(h.calls).toEqual([
    'authoritative_link',
    'persist:stable_link_verified',
    'adopt:canonical-stable',
    'begin_account_generation',
    'persist:ready',
    'clear_transition',
    'emit:post_delete_identity_ready',
  ]);
});

test.each(['retired-stable', 'server-retired-stable'])(
  'authoritative link can never adopt retired stable id %s',
  async (stableId) => {
    const record = transition({
      phase: 'anonymous_authenticated',
      freshAuthUid: 'fresh-auth',
      freshStableId: 'provisional-stable',
      serverRetiredStableId: 'server-retired-stable',
    });
    const h = harness(record);
    h.deps.linkAuthoritatively = async () => ({
      ok: true,
      authUid: 'fresh-auth',
      stableId,
    });

    await expect(runPostDeleteFreshIdentityTransition(record, h.deps)).resolves.toEqual({
      status: 'fatal_local_guard',
      phase: 'anonymous_authenticated',
    });
    expect(h.calls).not.toContain('begin_account_generation');
  },
);
