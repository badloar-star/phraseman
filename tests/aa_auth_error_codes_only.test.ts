// ════════════════════════════════════════════════════════════════════════════
// aa_auth_error_codes_only.test.ts — TG-0AE4918142EE (11.10).
//
// В тексте ошибок Firebase/Google/Apple бывает почта. Аналитика (logAuthEvent →
// logEvent, сторонний сервис) и журналы app/auth_provider.ts обязаны нести только
// нормализованный код (identityErrorCode), а не сырой e.message.
//
// 1. СТОРОЖ ПО ИСХОДНИКУ: ни один вызов logAuthEvent не передаёт .message/String(e…);
//    detail результата смены аккаунта не собирается из текста ошибки.
// 2. ПОВЕДЕНЧЕСКИ (настоящий auth_provider, натив замокан как в
//    aa_auth_switch_resume_throw.test.ts): ошибка с «user@example.com» в тексте →
//    ни в logEvent, ни в console, ни в detail результата нет «@».
// ════════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { join } from 'path';

process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id.apps.googleusercontent.com';
jest.setTimeout(15_000);

const EMAIL_TEXT = 'Backup rejected for user@example.com';

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
const mockGoogleSignIn = jest.fn<Promise<unknown>, unknown[]>(async () => ({ type: 'cancelled' }));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: () => undefined,
    hasPlayServices: async () => true,
    signIn: (...args: unknown[]) => mockGoogleSignIn(...args),
    signOut: async () => undefined,
  },
}), { virtual: true });
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: async () => { throw new Error('not used'); },
}), { virtual: true });

let mockStableId: string | null = 'local-stable-id';
const mockEnsureStableLink = jest.fn<Promise<unknown>, unknown[]>();
const okStableLink = async (stableId: unknown) => ({ ok: true, stableUid: stableId, authUid: 'anon-uid', source: 'server' });
const mockForceSyncToCloud = jest.fn<Promise<boolean>, unknown[]>(async () => true);
const mockSaveBackup = jest.fn<Promise<boolean>, unknown[]>(async () => true);

jest.mock('../app/cloud_sync', () => ({
  SYNC_KEYS: ['user_total_xp'],
  ensureAnonUser: async () => mockStableId,
  ensureAnonIdentityDetailed: async () => ({ ok: true as const, authUid: 'anon-uid', stableId: mockStableId, isAnonymous: true as const }),
  waitForAnonAuth: async () => true,
  syncToCloud: async () => undefined,
  restoreFromCloud: async () => undefined,
  restoreFromCloudDetailed: async () => 'restored',
  forceSyncToCloud: (...args: unknown[]) => mockForceSyncToCloud(...args),
  quiesceSyncBeforeStableIdSwap: async () => undefined,
  quiesceCloudSyncForAccountTransition: async () => true,
  enqueueCloudDeletion: async () => undefined,
  startCloudDeletionEnqueue: () => ({ dispatchSettled: Promise.resolve(), acknowledgment: new Promise(() => undefined) }),
  startCloudDeletionDirect: () => ({ dispatchSettled: Promise.resolve(), acknowledgment: new Promise(() => undefined) }),
  waitForAccountDeletionCredentialSafe: async () => false,
  wipeLocalAccountData: async () => undefined,
  deleteCloudData: async () => undefined,
  resetAnonAuthCacheForSignOut: () => undefined,
  ensureStableAuthLinkForStableIdDetailed: (...args: unknown[]) => mockEnsureStableLink(...args),
  mergeStableAccountsViaServer: async () => null,
  saveAccountSwitchEmergencyBackup: (...args: unknown[]) => mockSaveBackup(...args),
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
const mockLogEvent = jest.fn();
const mockRecordError = jest.fn();
const mockLogAppError = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('../app/firebase', () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
  recordError: (...args: unknown[]) => mockRecordError(...args),
}));
jest.mock('../app/app_health', () => ({ logAppError: (...args: unknown[]) => mockLogAppError(...args) }));
jest.mock('../app/events', () => ({ emitAppEvent: () => undefined }));
jest.mock('../app/target_storage_keys', () => ({ unlockedLessonsKey: (t: string) => `unlocked_lessons_${t}` }));
jest.mock('../app/account_delete_timeout', () => ({
  ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS: 15000,
  ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS: 8000,
  runAccountDeleteEnqueueWithDeadline: async (_warm: unknown, call: () => Promise<unknown>) => call(),
}));
jest.mock('../app/account_generation', () => ({
  beginAccountGeneration: () => undefined,
  subscribeAccountGeneration: () => ({ remove: () => undefined }),
  captureAccountGeneration: () => ({ generation: 1, stableId: mockStableId, phase: 'active' }),
  invalidateAccountGeneration: () => undefined,
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

jest.mock('../app/account_switch_quarantine', () => {
  const actual = jest.requireActual('../app/account_switch_quarantine');
  return {
    ...actual,
    inspectAccountSwitchQuarantine: async () => ({ status: 'none' }),
  };
});

const SOURCE = readFileSync(join(__dirname, '..', 'app', 'auth_provider.ts'), 'utf8');

/** Все вызовы fn( … ) с балансом скобок — текст аргументов целиком. */
function callsOf(source: string, fn: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = source.indexOf(`${fn}(`, from);
    if (at < 0) return out;
    let depth = 0;
    let end = at + fn.length;
    for (; end < source.length; end += 1) {
      const ch = source[end];
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out.push(source.slice(at, end + 1));
    from = end + 1;
  }
}

describe('сторож по исходнику auth_provider.ts', () => {
  test('ни один logAuthEvent не передаёт сырой текст ошибки', () => {
    const calls = callsOf(SOURCE, 'logAuthEvent').filter((c) => !c.startsWith('logAuthEvent(name'));
    expect(calls.length).toBeGreaterThan(10);
    const leaking = calls.filter((c) => /\.message|String\(\s*e\b|String\(\s*error\b|String\(\(e|\bdetail\.slice/.test(c));
    expect(leaking).toEqual([]);
  });

  test('captureAuthSignInFailure не получает errStr/.message (только коды)', () => {
    const calls = callsOf(SOURCE, 'captureAuthSignInFailure')
      .filter((c) => !c.startsWith('captureAuthSignInFailure(provider: AuthProviderId'));
    expect(calls.length).toBeGreaterThanOrEqual(10);
    const leaking = calls.filter((c) => /errStr|\.message|String\(\s*e\b|\$\{detail\}/.test(c));
    expect(leaking).toEqual([]);
    // страховка внутри: отчёт строится из нормализованного detail
    expect(SOURCE).toMatch(/const d = safeAuthFailureDetail\(/);
    // транзиентный auth_link по-прежнему распознаётся по хвосту «:код»
    expect(SOURCE).toMatch(/detail\.endsWith\(`:\$\{code\}`\)/);
  });

  test('detail результата смены аккаунта не собирается из текста ошибки', () => {
    expect(SOURCE).not.toMatch(/detail:\s*String\(\s*e\?\.message/);
    expect(SOURCE).not.toMatch(/backupDetail\s*=\s*String\(/);
  });

  test('журнальные строки с сырым текстом — только известные исключения', () => {
    // зачем: три строки удаления гостя пинены тестами aa_guest_server_delete /
    // aa_guest_offline_delete_retry (текст ответа нашего же сервера); новых не добавлять.
    const consoleCalls = callsOf(SOURCE, 'console.warn').concat(callsOf(SOURCE, 'console.log'));
    const raw = consoleCalls.filter((c) => /\.message\b/.test(c));
    expect(raw).toHaveLength(1);
    expect(raw[0]).toContain('delete:anon_server=enqueue ack=failed');
  });
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

function expectNoEmailAnywhere(result: unknown): void {
  const events = JSON.stringify(mockLogEvent.mock.calls);
  expect(events).not.toContain('@');
  expect(consoleLines.join('\n')).not.toContain('@');
  expect(JSON.stringify(result)).not.toContain('@');
}

beforeEach(() => {
  // __DEV__ включён: dev-предупреждения тоже не должны печатать текст ошибки.
  (globalThis as any).__DEV__ = true;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-firebase/auth').__resetTestState();
  require('@react-native-async-storage/async-storage').__reset();
  require('expo-secure-store').__reset();
  mockStableId = 'local-stable-id';
  mockLogEvent.mockReset();
  mockRecordError.mockReset();
  mockLogAppError.mockReset().mockImplementation(async () => undefined);
  mockEnsureStableLink.mockReset().mockImplementation(okStableLink);
  mockForceSyncToCloud.mockReset().mockResolvedValue(true);
  mockSaveBackup.mockReset().mockResolvedValue(true);
  mockGoogleSignIn.mockReset().mockResolvedValue({ type: 'cancelled' });
  consoleLines = [];
  consoleSpies = (['log', 'warn', 'info', 'error'] as const).map((level) => (
    jest.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      consoleLines.push(args.map((a) => (a instanceof Error ? `${a.message}` : String(a))).join(' '));
    })
  ));
});

afterEach(() => {
  for (const spy of consoleSpies) spy.mockRestore();
  (globalThis as any).__DEV__ = false;
});

describe('поведенчески: почта из текста ошибки не уходит в аналитику и журнал', () => {
  test('сбой аварийной копии при несинхронизированной смене → только код', async () => {
    mockForceSyncToCloud.mockResolvedValue(false);
    mockSaveBackup.mockRejectedValue(new Error(EMAIL_TEXT));
    const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

    const result = await signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true });

    expect(result).toEqual({ ok: false, reason: 'backup_failed', detail: 'error_without_code' });
    expect(mockLogEvent).toHaveBeenCalledWith('auth_signout_wipe_failed', { stage: 'backup', error: 'error_without_code' });
    expectNoEmailAnywhere(result);
  });

  test('сбой финальной копии под замком перехода → только код', async () => {
    mockSaveBackup.mockRejectedValue(Object.assign(new Error(EMAIL_TEXT), { code: 'storage/quota' }));
    const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

    const result = await signOutAndWipeForAccountSwitch();

    expect(result).toEqual({ ok: false, reason: 'backup_failed', detail: 'storage/quota' });
    expect(mockLogEvent).toHaveBeenCalledWith('auth_signout_wipe_failed', { stage: 'backup', error: 'storage/quota' });
    expectNoEmailAnywhere(result);
  });

  test('свой код приложения проходит как есть (диагностика не теряется)', async () => {
    mockForceSyncToCloud.mockResolvedValue(false);
    mockSaveBackup.mockResolvedValue(false);
    const { signOutAndWipeForAccountSwitch } = loadAuthProvider();

    const result = await signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true });

    expect(result).toEqual({ ok: false, reason: 'backup_failed', detail: 'account_switch_backup_unavailable' });
  });

  test('ошибка нативного входа Google с почтой → в аналитике код, текст остаётся для логики', async () => {
    mockGoogleSignIn.mockRejectedValue(Object.assign(new Error(`Account ${'user@example.com'} is disabled`), { code: 'DEVELOPER_ERROR' }));
    const { signInWithProvider } = loadAuthProvider();

    const result = await signInWithProvider('google');

    expect(result).toEqual(expect.objectContaining({ result: 'error' }));
    expect(mockLogEvent).toHaveBeenCalledWith('auth_signin_error', { provider: 'google', stage: 'native', error: 'DEVELOPER_ERROR' });
    expect(JSON.stringify(mockLogEvent.mock.calls)).not.toContain('@');
    expect(consoleLines.join('\n')).not.toContain('@');
    // TG-17B4F6788C5A: отчёт о сбое (Crashlytics / App Health → Firestore/Telegram) — код без текста.
    expect(mockRecordError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'auth_signin:google:native:native_DEVELOPER_ERROR',
    }), 'auth_signin');
    const reported = JSON.stringify([
      mockRecordError.mock.calls.map(([err, tag]) => [(err as Error).message, tag]),
      mockLogAppError.mock.calls.map(([name, err, meta]) => [name, (err as Error).message, meta]),
    ]);
    expect(reported).not.toContain('@');
    expect(reported).not.toContain('disabled');
  });

  test('ошибка Firebase-входа с почтой → в recordError/logAppError только код', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'fake-google-id-token', user: { email: 'u@example.com', name: 'Test User' } } });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require('@react-native-firebase/auth');
    const original = authModule.GoogleAuthProvider?.credential;
    authModule.GoogleAuthProvider.credential = () => {
      throw Object.assign(new Error('The email address user@example.com is already in use'), { code: 'auth/email-already-in-use' });
    };
    try {
      const { signInWithProvider } = loadAuthProvider();
      const result = await signInWithProvider('google');
      expect(result).toEqual(expect.objectContaining({ result: 'error' }));
    } finally {
      authModule.GoogleAuthProvider.credential = original;
    }
    const reported = JSON.stringify([
      mockRecordError.mock.calls.map(([err, tag]) => [(err as Error).message, tag]),
      mockLogAppError.mock.calls.map(([name, err, meta]) => [name, (err as Error).message, meta]),
      mockLogEvent.mock.calls,
    ]);
    expect(reported).toContain('auth/email-already-in-use');
    expect(reported).not.toContain('@');
    // (dev-строка «success, email=…» печатает почту самого входа из мока — это не текст ошибки)
    expect(consoleLines.join('\n')).not.toContain('user@example.com');
  });
});

describe('страховка captureAuthSignInFailure и транзиентный auth_link', () => {
  // зачем: путь auth_link в этом стенде уходит в linked_pending, поэтому доказываем
  // чтением: регулярка страховки берётся из исходника; коды auth_link она пропускает
  // без изменений, а проверка транзиента смотрит на тот же «:код» в хвосте.
  const match = SOURCE.match(/const SAFE_AUTH_FAILURE_DETAIL = \/(.+)\/i;/);
  const safe = new RegExp(match?.[1] ?? '^$', 'i');

  test('коды auth_link проходят страховку без изменений', () => {
    expect(match).not.toBeNull();
    for (const failure of ['identity_unavailable', 'transport_unavailable', 'app_check_unavailable']) {
      expect(safe.test(`remote_stable_link_failed:${failure}`)).toBe(true);
      expect(safe.test(`local_stable_link_failed:${failure}`)).toBe(true);
      expect(`local_stable_link_failed:${failure}`.endsWith(`:${failure}`)).toBe(true);
    }
    expect(SOURCE).toContain("captureAuthSignInFailure(provider, 'auth_link', `remote_stable_link_failed:${linkedRemote.failure ?? 'unknown'}`)");
    expect(SOURCE).toContain("captureAuthSignInFailure(provider, 'auth_link', `local_stable_link_failed:${linkedLocal.failure ?? 'unknown'}`)");
  });

  test('сырой текст с почтой страховку не проходит', () => {
    expect(safe.test('native_DEVELOPER_ERROR:Account user@example.com is disabled')).toBe(false);
    expect(safe.test('native_DEVELOPER_ERROR')).toBe(true);
    expect(safe.test('firebase_auth/email-already-in-use')).toBe(true);
  });
});
