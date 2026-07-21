// ════════════════════════════════════════════════════════════════════════════
// paywall_funnel_behavior.test.ts — BEHAVIORAL test (real import, executes code).
//
// Imports app/paywall_funnel.ts and drives its exported logic:
//   - logPaywallFunnel(step, payload)         → fire-and-forget Firestore write
//   - resetPaywallFunnelShownDedup()          → clears session dedup caches
//
// We assert the real decisions the module makes (not source text):
//   • 'shown' is de-duplicated ONCE per key for the whole session.
//   • Non-'shown' steps are de-duplicated only within a short time window.
//   • The Firestore payload carries the correct shape (step/variant/context/plan,
//     obColor, UTC day key, ts, uidh hash, expireAt TTL date).
//   • context is coerced to 'generic' when empty and truncated to 40 chars.
//   • permission-denied on write never throws (fire-and-forget contract).
//
// Firestore is self-mocked here (via jest.mock) so we can capture add() payloads;
// stable_id is mocked to a fixed id for a deterministic uidh.
// ════════════════════════════════════════════════════════════════════════════

const addCalls: Record<string, unknown>[] = [];
let addImpl: (data: Record<string, unknown>) => Promise<unknown> = async (data) => {
  addCalls.push(data);
  return undefined;
};

jest.mock('@react-native-firebase/firestore', () => {
  const factory = () => ({
    collection: (_name: string) => ({
      add: (data: Record<string, unknown>) => addImpl(data),
    }),
  });
  return { __esModule: true, default: factory };
});

jest.mock('../app/stable_id', () => ({
  getStableId: jest.fn(async () => 'fixed-stable-id-123'),
}));

// config: force non-Expo-Go + cloud enabled so getFirestoreModule() returns the mock.
jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

const debugError = jest.fn();
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: (...args: unknown[]) => debugError(...args) },
}));

// GDPR gate (added to paywall_funnel): writes are blocked until analytics consent
// is granted. Default the mock to "granted" so the write path runs; one test below
// flips it to assert the gate actually blocks.
let consentGranted = true;
jest.mock('../app/analytics_consent', () => ({
  isAnalyticsConsentGranted: () => consentGranted,
}));

// Flush the microtask/void async IIFE inside logPaywallFunnel.
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
  await Promise.resolve();
}

type Mod = typeof import('../app/paywall_funnel');

// NOTE: we deliberately do NOT use jest.isolateModules here — paywall_funnel's
// getFirestoreModule() uses a dynamic import(), which resolves AFTER the synchronous
// isolateModules callback tears the registry down, so the mocked firestore module
// would not resolve. jest.resetModules() + require() (the repo's premium_guard.test
// pattern) keeps the mocked graph alive for the deferred dynamic import.
function load(): Mod {
  return require('../app/paywall_funnel') as Mod;
}

beforeEach(() => {
  jest.resetModules();
  consentGranted = true;
  addCalls.length = 0;
  addImpl = async (data) => {
    addCalls.push(data);
    return undefined;
  };
  debugError.mockClear();
  (globalThis as any).__DEV__ = false;
});

test('logs a "shown" event to Firestore with the correct payload shape', async () => {
  const { logPaywallFunnel } = load();
  const before = Date.now();
  logPaywallFunnel('shown', { variant: 'A', context: 'level_up', plan: 'yearly', obColor: 'main' });
  await flush();

  expect(addCalls).toHaveLength(1);
  const doc = addCalls[0];
  expect(doc.step).toBe('shown');
  expect(doc.variant).toBe('A');
  expect(doc.context).toBe('level_up');
  expect(doc.plan).toBe('yearly');
  expect(doc.obColor).toBe('main');
  expect(typeof doc.uidh).toBe('string');
  expect((doc.uidh as string).length).toBeGreaterThan(0);
  expect(doc.dev).toBe(false);
  // day is the UTC yyyy-mm-dd slice of ts.
  expect(doc.day).toBe(new Date(doc.ts as number).toISOString().slice(0, 10));
  expect(doc.ts as number).toBeGreaterThanOrEqual(before);
  // expireAt is a Date ~90 days in the future.
  expect(doc.expireAt).toBeInstanceOf(Date);
  const ttlMs = (doc.expireAt as Date).getTime() - (doc.ts as number);
  expect(ttlMs).toBeGreaterThan(89 * 24 * 60 * 60 * 1000);
});

test('"shown" is sent only once per key for the whole session (mount guard)', async () => {
  const { logPaywallFunnel } = load();
  const payload = { variant: 'B' as const, context: 'settings', plan: null };
  logPaywallFunnel('shown', payload);
  logPaywallFunnel('shown', payload);
  logPaywallFunnel('shown', payload);
  await flush();
  expect(addCalls).toHaveLength(1);
});

test('a different "shown" key (different context) is NOT suppressed', async () => {
  const { logPaywallFunnel } = load();
  logPaywallFunnel('shown', { variant: 'A', context: 'ctx_one' });
  logPaywallFunnel('shown', { variant: 'A', context: 'ctx_two' });
  await flush();
  expect(addCalls).toHaveLength(2);
});

test('non-"shown" steps are de-duped only inside the short time window', async () => {
  const { logPaywallFunnel } = load();
  const realNow = Date.now();
  const nowSpy = jest.spyOn(Date, 'now');

  // Two cta_click within 750ms window → second dropped.
  nowSpy.mockReturnValue(realNow);
  logPaywallFunnel('cta_click', { variant: 'C', context: 'checkout', plan: 'monthly' });
  nowSpy.mockReturnValue(realNow + 100);
  logPaywallFunnel('cta_click', { variant: 'C', context: 'checkout', plan: 'monthly' });
  await flush();
  expect(addCalls).toHaveLength(1);

  // After the window elapses, the same event is allowed again.
  nowSpy.mockReturnValue(realNow + 1000);
  logPaywallFunnel('cta_click', { variant: 'C', context: 'checkout', plan: 'monthly' });
  await flush();
  expect(addCalls).toHaveLength(2);

  nowSpy.mockRestore();
});

test('resetPaywallFunnelShownDedup() lets a repeated "shown" fire again', async () => {
  const { logPaywallFunnel, resetPaywallFunnelShownDedup } = load();
  const payload = { variant: 'A' as const, context: 'reopen_ctx' };
  logPaywallFunnel('shown', payload);
  await flush();
  expect(addCalls).toHaveLength(1);

  // Without reset it would stay at 1; reset clears the once-set.
  resetPaywallFunnelShownDedup();
  logPaywallFunnel('shown', payload);
  await flush();
  expect(addCalls).toHaveLength(2);
});

test('empty context is coerced to "generic" and long context is truncated to 40 chars', async () => {
  const { logPaywallFunnel } = load();
  logPaywallFunnel('close', { variant: 'A', context: '' });
  const longCtx = 'x'.repeat(200);
  logPaywallFunnel('close', { variant: 'B', context: longCtx });
  await flush();

  expect(addCalls).toHaveLength(2);
  expect(addCalls[0].context).toBe('generic');
  expect((addCalls[1].context as string).length).toBe(40);
});

test('plan defaults to null and obColor defaults to null in the payload', async () => {
  const { logPaywallFunnel } = load();
  logPaywallFunnel('trial_started', { variant: 'C', context: 'onboarding_plan' });
  await flush();
  expect(addCalls).toHaveLength(1);
  expect(addCalls[0].plan).toBeNull();
  expect(addCalls[0].obColor).toBeNull();
});

test('permission-denied on write is swallowed silently (no DebugLogger.error)', async () => {
  const { logPaywallFunnel } = load();
  addImpl = async () => {
    const err: any = new Error('permission-denied writing paywall_funnel');
    err.code = 'firestore/permission-denied';
    throw err;
  };
  logPaywallFunnel('cta_click', { variant: 'A', context: 'gated' });
  await flush();
  expect(debugError).not.toHaveBeenCalled();
});

test('an unexpected write error is logged as a warning (not swallowed)', async () => {
  const { logPaywallFunnel } = load();
  addImpl = async () => {
    throw new Error('network unreachable');
  };
  logPaywallFunnel('purchase_completed', { variant: 'B', context: 'checkout', plan: 'lifetime' });
  await flush();
  expect(debugError).toHaveBeenCalledTimes(1);
  expect(debugError.mock.calls[0][0]).toBe('paywall_funnel:log');
});

test('GDPR gate: nothing is written to Firestore until analytics consent is granted', async () => {
  consentGranted = false;
  const { logPaywallFunnel } = load();
  logPaywallFunnel('shown', { variant: 'A', context: 'gated_by_consent' });
  logPaywallFunnel('cta_click', { variant: 'A', context: 'gated_by_consent' });
  await flush();
  expect(addCalls).toHaveLength(0);
});

test('purchase price passes through on purchase_completed and defaults to null', async () => {
  const { logPaywallFunnel } = load();
  logPaywallFunnel('purchase_completed', { variant: 'D', context: 'checkout', plan: 'yearly', price: '$39.99' });
  logPaywallFunnel('purchase_completed', { variant: 'D', context: 'checkout', plan: 'monthly' });
  await flush();

  expect(addCalls).toHaveLength(2);
  expect(addCalls[0].price).toBe('$39.99');
  expect(addCalls[1].price).toBeNull();
});

test('blank price coerces to null and long price is truncated to 24 chars', async () => {
  const { logPaywallFunnel } = load();
  // Разные планы, потому что дедупликация воронки схлопывает одинаковые
  // step+variant+context+plan внутри короткого окна (защита от double-tap).
  logPaywallFunnel('purchase_completed', { variant: 'E', context: 'checkout', plan: 'lifetime', price: '   ' });
  logPaywallFunnel('purchase_completed', { variant: 'E', context: 'checkout', plan: 'yearly', price: ` ${'9'.repeat(40)} ₽` });
  await flush();

  expect(addCalls).toHaveLength(2);
  expect(addCalls[0].price).toBeNull();
  expect(typeof addCalls[1].price).toBe('string');
  expect((addCalls[1].price as string).length).toBe(24);
});
