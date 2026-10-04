/*
 * AA S2c, случай 7 (1.6.19): AccountLogoutFlow:wipe_failed ×1 и
 * auth:signin_failure swap_timeout_swap_presync_20000ms ×2.
 *
 * wipe_failed: reason ставится по ФАЗЕ маркера (provider_signed_out), а не по шагу —
 * за ним может стоять и стирание (account_wipe_incomplete: живой писатель вернул
 * ключ между удалением и проверкой), и запись маркера. Трассировка [ACC-SWITCH-WIPE]
 * пишет код шага и (в cloud_sync) ИМЕНА вернувшихся ключей.
 * swap_presync: сценарий тут не исполняется (нужен весь вход); проверяем, что
 * развилка и состояние после отказа попадают в лог [AUTH-LINK-GOOGLE].
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const storage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { storage.delete(key); }),
  },
}));
const mockPersisted: string[] = [];
jest.mock('../app/debug-logger', () => ({
  DebugLogger: {
    error: jest.fn((context: string) => { mockPersisted.push(context); }),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import {
  advanceAccountSwitchQuarantine,
  prepareAccountSwitchQuarantine,
  resumeAccountSwitchQuarantine,
  type AccountSwitchRecoveryDependencies,
} from '../app/account_switch_quarantine';

function deps(overrides: Partial<AccountSwitchRecoveryDependencies>): AccountSwitchRecoveryDependencies {
  return {
    readStableId: jest.fn(async () => 'stable-A'),
    readCachedStableId: jest.fn(() => 'stable-A'),
    readAuthUser: jest.fn(() => null),
    invalidateGeneration: jest.fn(),
    beginPremiumTransition: jest.fn(),
    quiesce: jest.fn(async () => true),
    signOut: jest.fn(async () => undefined),
    wipeLocalData: jest.fn(async () => undefined),
    clearStableId: jest.fn(async () => undefined),
    ensureAnonymousIdentity: jest.fn(async () => undefined),
    activateGeneration: jest.fn(),
    ...overrides,
  };
}

async function markerAtProviderSignedOut() {
  const marker = await prepareAccountSwitchQuarantine({
    operationId: 'switch_01JTEST0000000000000000000',
    nonce: 'nonce_01JTEST000000000000000000000',
    ownerStableId: 'stable-A',
    ownerAuthUid: 'auth-A',
    ownerProvider: 'google',
    now: 1_000,
  });
  return advanceAccountSwitchQuarantine(marker, 'provider_signed_out');
}

describe('[ACC-SWITCH-WIPE] — logout wipe failure is traced with the real step code', () => {
  beforeEach(() => {
    storage.clear();
    mockPersisted.length = 0;
  });

  test('wipe throws account_wipe_incomplete → retryable wipe_failed + persisted trace with phase and code', async () => {
    await markerAtProviderSignedOut();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await resumeAccountSwitchQuarantine(deps({
      wipeLocalData: jest.fn(async () => { throw new Error('account_wipe_incomplete'); }),
    }));

    expect(result).toMatchObject({ result: 'retryable', reason: 'wipe_failed', detail: 'account_wipe_incomplete' });
    const line = warn.mock.calls.map((call) => String(call[0])).find((text) => text.startsWith('[ACC-SWITCH-WIPE] resume step_failed'));
    expect(line).toContain('"phase":"provider_signed_out"');
    expect(line).toContain('"reason":"wipe_failed"');
    expect(line).toContain('"code":"account_wipe_incomplete"');
    expect(mockPersisted).toContain('[ACC-SWITCH-WIPE] resume step_failed');
    warn.mockRestore();
  });

  test('quiesce failure is an early exit with its own trace (previously silent)', async () => {
    await markerAtProviderSignedOut();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await resumeAccountSwitchQuarantine(deps({
      quiesce: jest.fn(async () => { throw new Error('drain_timeout'); }),
    }));

    expect(result).toMatchObject({ result: 'retryable', reason: 'quiesce_failed' });
    const lines = warn.mock.calls.map((call) => String(call[0]));
    expect(lines.some((text) => text.startsWith('[ACC-SWITCH-WIPE] resume quiesce_threw') && text.includes('drain_timeout'))).toBe(true);
    expect(lines.some((text) => text.startsWith('[ACC-SWITCH-WIPE] resume quiesce_failed'))).toBe(true);
    warn.mockRestore();
  });
});

describe('source wiring of the S2c traces (old 1.6.x path, logs only)', () => {
  const read = (file: string) => readFileSync(join(__dirname, '..', file), 'utf8');

  test('cloud_sync wipe names residue keys (redacted) before throwing account_wipe_incomplete', () => {
    const cloudSync = read('app/cloud_sync.ts');
    expect(cloudSync.match(/identityTrace\('\[ACC-SWITCH-WIPE\]', 'residue'/g)).toHaveLength(2);
    expect(cloudSync).toMatch(/map\(redactStorageKey\)/);
  });

  test('sign-in presync failure, provider-session dead end and merge fallback are traced', () => {
    const authProvider = read('app/auth_provider.ts');
    expect(authProvider).toMatch(/'swap presync_failed'/);
    expect(authProvider).toMatch(/'branch account_switch_required'/);
    expect(authProvider).toMatch(/'swap merge_skipped_fallback'/);
    expect(authProvider).toMatch(/'link_lookup failed'/);
    // В логах входа нет сырых идентификаторов: всё через identityTag.
    const traceCalls = authProvider.match(/identityTrace\('\[AUTH-LINK-GOOGLE\]'[\s\S]*?\);/g) ?? [];
    expect(traceCalls.length).toBeGreaterThanOrEqual(20);
    for (const call of traceCalls) {
      expect(call).not.toMatch(/:\s*(firebaseProviderUid|localStableId|remoteStableId|preProviderStableId|sourceAuthUid|targetAuthUid)\s*[,}]/);
      expect(call).not.toMatch(/\.uid\s*[,}]/);
    }
  });

  test('stable_id traces every startup source and the per-layer persist result', () => {
    const stable = read('app/stable_id.ts');
    expect(stable).toMatch(/'startup source'/);
    expect(stable).toMatch(/'persist result'/);
    expect(stable).toMatch(/layersDiverge/);
  });
});
