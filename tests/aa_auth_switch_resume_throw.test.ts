// ════════════════════════════════════════════════════════════════════════════
// aa_auth_switch_resume_throw.test.ts — ревью TG-A3996AF645F1 (11.10), п.4–5.
//
// ПОВЕДЕНЧЕСКИ (настоящий app/auth_provider.ts, натив замокан как в
// aa_guest_server_delete.test.ts): смена аккаунта signOutAndWipeForAccountSwitch
//   1. маркер смены на диске, возобновление карантина БРОСАЕТ → отказ
//      recovery_required (не 'unknown': Настройки относят 'unknown' к исходу «до
//      маркера» и писали бы «данные не изменены»), причина в логе;
//   2. резервация перехода снята: второй вызов НЕ получает
//      clean_recovery_transition_active и доводит смену;
//   3. страховка обёртки: любое другое исключение превращается в отказ 'unknown'
//      с причиной, резервация тоже снята (экран не застревает в «стираю»).
// ════════════════════════════════════════════════════════════════════════════

process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id.apps.googleusercontent.com';
jest.setTimeout(15_000);

jest.mock('expo-linking', () => ({
  createURL: jest.fn((p: string) => `phraseman://${p}`),
  parse: jest.fn(() => ({ queryParams: {} })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  openURL: jest.fn(async () => {}),
}), { virtual: true });
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(async () => ({ type: 'cancel' })),
  dismissAuthSession: jest.fn(),
}), { virtual: true });
jest.mock('../app/phone_state_bootstrap', () => ({
  retirePhoneStateAfterDeletion: async () => {},
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
  getRandomBytesAsync: async (length: number) => Uint8Array.from({ length }, (_, index) => index % 256),
  digestStringAsync: async (_algorithm: string, value: string) => `sha256:${value}`,
  randomUUID: () => 'test-random-uuid',
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: () => undefined,
    hasPlayServices: async () => true,
    signIn: async () => ({ type: 'cancelled' }),
    signOut: async () => undefined,
  },
}), { virtual: true });
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: async () => { throw new Error('not used'); },
}), { virtual: true });

let mockStableId: string | null = 'local-stable-id';

jest.mock('../app/cloud_sync', () => ({
  SYNC_KEYS: ['user_total_xp'],
  ensureAnonUser: async () => mockStableId,
  ensureAnonIdentityDetailed: async () => ({ ok: true as const, authUid: 'anon-uid', stableId: mockStableId, isAnonymous: true as const }),
  waitForAnonAuth: async () => true,
  syncToCloud: async () => undefined,
  restoreFromCloud: async () => undefined,
  restoreFromCloudDetailed: async () => 'restored',
  forceSyncToCloud: async () => true,
  quiesceSyncBeforeStableIdSwap: async () => undefined,
  quiesceCloudSyncForAccountTransition: async () => true,
  enqueueCloudDeletion: async () => undefined,
  startCloudDeletionEnqueue: () => ({ dispatchSettled: Promise.resolve(), acknowledgment: new Promise(() => undefined) }),
  startCloudDeletionDirect: () => ({ dispatchSettled: Promise.resolve(), acknowledgment: new Promise(() => undefined) }),
  waitForAccountDeletionCredentialSafe: async () => false,
  wipeLocalAccountData: async () => undefined,
  deleteCloudData: async () => undefined,
  resetAnonAuthCacheForSignOut: () => undefined,
  ensureStableAuthLinkForStableIdDetailed: async (stableId: string) => ({ ok: true, stableUid: stableId, authUid: 'anon-uid', source: 'server' }),
  mergeStableAccountsViaServer: async () => null,
  saveAccountSwitchEmergencyBackup: async () => true,
  readAccountSwitchEmergencyBackupSummary: async () => null,
  shelveAccountSwitchEmergencyBackupOf: async () => true,
  pruneShelvedAccountSwitchBackups: async () => 0,
  accountOwnedStorageKeysFrom: (keys: readonly string[]) => Array.from(new Set(['user_total_xp', ...keys])),
  isAccountLocalJournalStorageKey: () => false,
}));
jest.mock('../app/stable_id', () => ({
  getStableId: async () => mockStableId ?? 'rotated-stable-id',
  setStableId: async (v: string) => { mockStableId = v; },
  clearStableId: async () => { mockStableId = null; },
  peekStableId: () => mockStableId,
  readExistingStableId: async () => mockStableId,
}));
jest.mock('../app/premium_guard', () => ({
  invalidatePremiumCache: () => undefined,
  beginPremiumAccountTransition: () => undefined,
  waitForPremiumAccountWorkIdleWithDeadline: async () => true,
}));
jest.mock('../app/shards_system', () => ({
  loadShardsFromCloud: async () => undefined,
  forceSyncShardsToCloud: async () => undefined,
  preparePendingShardDeltasForAccountSwitch: async () => ({
    resolved: 0, pending: 0, pendingEarn: 0, pendingSpend: 0, ownerStableId: mockStableId, stale: false,
  }),
}));
jest.mock('../app/shards_delta_queue', () => ({
  readShardDeltaQueue: async () => [],
  hasQuarantinedShardDeltaQueue: async () => false,
}));
jest.mock('../app/firebase', () => ({ logEvent: () => undefined, recordError: () => undefined }));
jest.mock('../app/app_health', () => ({ logAppError: () => undefined }));
jest.mock('../app/events', () => ({ emitAppEvent: () => undefined }));
jest.mock('../app/target_storage_keys', () => ({ unlockedLessonsKey: (t: string) => `unlocked_lessons_${t}` }));
jest.mock('../app/account_delete_timeout', () => ({
  ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS: 15000,
  ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS: 8000,
  runAccountDeleteEnqueueWithDeadline: async (_warm: unknown, call: () => Promise<unknown>) => call(),
}));
const mockInvalidateGeneration = jest.fn();
jest.mock('../app/account_generation', () => ({
  beginAccountGeneration: () => undefined,
  subscribeAccountGeneration: () => ({ remove: () => undefined }),
  captureAccountGeneration: () => ({ generation: 1, stableId: mockStableId, phase: 'active' }),
  invalidateAccountGeneration: () => mockInvalidateGeneration(),
  isCurrentAccountGeneration: () => true,
  waitForRestoreApplicationIdleWithDeadline: async () => true,
  withAccountTransitionLock: async (work: (lease: unknown) => Promise<unknown>) => (
    work({ generation: 1, stableId: mockStableId, phase: 'transitioning' })
  ),
  withAccountTransitionLockWithDeadline: async (work: (lease: unknown) => Promise<unknown>) => ({
    completed: true,
    value: await work({ generation: 1, stableId: mockStableId, phase: 'transitioning' }),
  }),
}));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async () => ({}),
}), { virtual: true });
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));

// Маркер смены и его возобновление — управляемые; остальное в модуле настоящее.
const mockInspectQuarantine = jest.fn();
const mockResumeQuarantine = jest.fn();
jest.mock('../app/account_switch_quarantine', () => {
  const actual = jest.requireActual('../app/account_switch_quarantine');
  return {
    ...actual,
    inspectAccountSwitchQuarantine: (...args: unknown[]) => mockInspectQuarantine(...args),
    resumeAccountSwitchQuarantine: (...args: unknown[]) => mockResumeQuarantine(...args),
  };
});

let consoleLines: string[] = [];
let consoleSpies: jest.SpyInstance[] = [];

function loadAuthProvider(): typeof import('../app/auth_provider') {
  let mod!: typeof import('../app/auth_provider');
  jest.isolateModules(() => {
    mod = require('../app/auth_provider');
  });
  return mod;
}

beforeEach(() => {
  (globalThis as any).__DEV__ = false;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-firebase/auth').__resetTestState();
  require('@react-native-async-storage/async-storage').__reset();
  require('expo-secure-store').__reset();
  mockStableId = 'local-stable-id';
  mockInvalidateGeneration.mockReset();
  mockInspectQuarantine.mockReset();
  mockResumeQuarantine.mockReset();
  consoleLines = [];
  consoleSpies = (['log', 'warn', 'info'] as const).map((level) => (
    jest.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      consoleLines.push(args.map(String).join(' '));
    })
  ));
});

afterEach(() => {
  for (const spy of consoleSpies) spy.mockRestore();
});

describe('смена аккаунта: исключение после записи маркера', () => {
  test('возобновление карантина бросает → recovery_required с причиной; резервация снята, повтор доводит смену', async () => {
    mockInspectQuarantine.mockResolvedValue({ status: 'active' });
    mockResumeQuarantine
      .mockRejectedValueOnce(Object.assign(new Error('Keychain says user@example.test'), { code: 'quarantine_io' }))
      .mockResolvedValueOnce({ result: 'completed' });
    const authProvider = loadAuthProvider();

    const first = await authProvider.signOutAndWipeForAccountSwitch();
    expect(first).toEqual({ ok: false, reason: 'recovery_required', detail: 'resume_threw:quarantine_io' });
    expect(consoleLines).toEqual(expect.arrayContaining([
      expect.stringContaining('[ACC-MUT] signout:resume_threw stage=existing_marker code=quarantine_io'),
    ]));
    expect(consoleLines.join('\n')).not.toContain('user@example.test');

    const second = await authProvider.signOutAndWipeForAccountSwitch();
    expect(second).not.toEqual(expect.objectContaining({ reason: 'clean_recovery_transition_active' }));
    expect(second).toEqual({ ok: true, synced: false });
    expect(mockResumeQuarantine).toHaveBeenCalledTimes(2);
  });

  test('страховка обёртки: иное исключение → отказ unknown с причиной, резервация снята', async () => {
    mockInspectQuarantine.mockResolvedValue({ status: 'corrupt' });
    mockInvalidateGeneration.mockImplementationOnce(() => { throw new Error('generation_io'); });
    const authProvider = loadAuthProvider();

    const first = await authProvider.signOutAndWipeForAccountSwitch();
    expect(first).toEqual({ ok: false, reason: 'unknown', detail: 'threw:generation_io' });
    expect(consoleLines).toEqual(expect.arrayContaining([
      expect.stringContaining('[ACC-MUT] signout:out threw code=generation_io'),
    ]));

    const second = await authProvider.signOutAndWipeForAccountSwitch();
    expect(second).toEqual({ ok: false, reason: 'recovery_required', detail: 'marker_invalid' });
  });
});
