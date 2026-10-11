// ════════════════════════════════════════════════════════════════════════════
// aa_account_switch_roundtrip_scenario.test.ts — пакет
// docs/work/tasks/aa-account-switch-roundtrip-scenario-2026-10-11.md (TG-68B63F48AABB).
//
// Поведенческий сценарий на ОДНОМ телефоне:
//   A (с прогрессом) → штатный выход с сетью (signOutAndWipeForAccountSwitch)
//   → вход Б → у Б ничего от A → выход Б (как AccountLogoutFlow: штатный, при отказе —
//   форсированный) → вход A → что у A на месте и ОТКУДА вернулось.
//
// НАСТОЯЩИЙ код: app/auth_provider.ts (signOutAndWipeForAccountSwitch + …Reserved),
// app/account_switch_quarantine.ts (маркер и шаги смены), app/account_generation.ts,
// app/cloud_sync.ts (forceSyncToCloud, saveAccountSwitchEmergencyBackup,
// wipeLocalAccountData, restoreFromCloudDetailed), app/account_switch_backup_restore.ts,
// хранилище курса Learning V2 (course_local_progress_v1).
//
// ЗАМОКАНО (и почему):
//  - Firebase Auth / Functions / Firestore — нет нативного SDK в Node. Облако —
//    in-memory документы users/{stableId} по uid; callable authEnsureStableLink
//    отвечает «ok, stableUid = запрошенный» (сервер подтверждает личность).
//  - Страницы карточек (flashcards_cloud_pages / readFlashcardPagesResult) —
//    in-memory страницы по uid+языку; логика выгрузки/решения по полю документа настоящая.
//  - stable_id — in-memory (Keychain/SecureStore нет в Node); новый гость = guest-N.
//  - Вход (signInWithProvider) НЕ вызывается: Google SDK, серверный поиск привязки и
//    merge — сервер. Повторяем его ядро (ветка merged_swap_to_remote): под замком смены
//    стереть локальное, поставить stable_id, открыть поколение; затем фон
//    scheduleSameStablePostAuthRefresh: restoreFromCloudDetailed → долив аварийной копии.
//  - Облачный путь «Моих ошибок» (mistake_practice_cloud_transport) — заглушка (0 событий):
//    события выгружает только обычный doSyncToCloud, не forceSyncToCloud. Проверяем
//    локальный журнал.
//  - Монеты на сервере (users.stars) не моделируются; проверяем локальную проекцию
//    кошелька level_spin_star_projection_v1:<owner>.
//  - Серверные ключи (уроки, серия, Plus) клиент в облако не пишет — их пишет сервер;
//    поэтому в облаке A они лежат с начала сценария, как у живого аккаунта.
// ════════════════════════════════════════════════════════════════════════════

process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id.apps.googleusercontent.com';
jest.setTimeout(60_000);

// ── Облако: in-memory Firestore ────────────────────────────────────────────
type CloudDoc = Record<string, unknown> & { progress?: Record<string, unknown> };
const mockCloud = {
  docs: new Map<string, CloudDoc>(),
  pages: new Map<string, string>(),
  writes: [] as string[],
};

function mockDocRef(path: string): Record<string, unknown> {
  return {
    __path: path,
    collection: (sub: string) => mockCollection(`${path}/${sub}`),
    get: async () => {
      const doc = mockCloud.docs.get(path);
      return {
        exists: doc !== undefined,
        id: path.split('/').pop(),
        data: () => (doc ? JSON.parse(JSON.stringify(doc)) : undefined),
        metadata: { hasPendingWrites: false, fromCache: false },
      };
    },
    set: async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
      mockCloud.writes.push(`set:${path}`);
      const prev = options?.merge ? (mockCloud.docs.get(path) ?? {}) : {};
      mockCloud.docs.set(path, { ...prev, ...JSON.parse(JSON.stringify(data)) });
    },
    update: async (...args: unknown[]) => {
      mockCloud.writes.push(`update:${path}`);
      const doc = mockCloud.docs.get(path);
      if (!doc) throw Object.assign(new Error('not-found'), { code: 'firestore/not-found' });
      const payload = args[0] as Record<string, unknown>;
      for (const [field, value] of Object.entries(payload)) {
        if (field.startsWith('progress.')) {
          const progress = { ...(doc.progress ?? {}) };
          progress[field.slice('progress.'.length)] = value;
          doc.progress = progress;
        } else {
          doc[field] = value;
        }
      }
    },
    delete: async () => { mockCloud.docs.delete(path); },
  };
}

function mockCollection(path: string): Record<string, unknown> {
  const query: Record<string, unknown> = {
    doc: (id: string) => mockDocRef(`${path}/${id}`),
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    get: async () => ({ empty: true, docs: [], size: 0 }),
  };
  return query;
}

jest.mock('@react-native-firebase/firestore', () => {
  const db = { collection: (name: string) => mockCollection(name) };
  const factory = Object.assign(() => db, {
    FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }), increment: (n: number) => ({ __increment: n }) },
  });
  return { __esModule: true, default: factory, getFirestore: () => db };
});

// ── Firebase Auth: один «телефон», текущий пользователь управляемый ─────────
type MockAuthUser = {
  uid: string;
  isAnonymous: boolean;
  email: string | null;
  providerData: Array<{ providerId: string; uid: string }>;
  getIdToken: () => Promise<string>;
  getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }>;
};
const mockAuthState = { currentUser: null as MockAuthUser | null, anonCounter: 0 };
function mockMakeUser(uid: string, isAnonymous: boolean, googleSubject?: string): MockAuthUser {
  return {
    uid,
    isAnonymous,
    email: null,
    providerData: googleSubject ? [{ providerId: 'google.com', uid: googleSubject }] : [],
    getIdToken: async () => 'test-id-token',
    getIdTokenResult: async () => ({ claims: {} }),
  };
}
jest.mock('@react-native-firebase/auth', () => {
  const instance = {
    get currentUser() { return mockAuthState.currentUser; },
    signInAnonymously: async () => {
      mockAuthState.anonCounter += 1;
      mockAuthState.currentUser = mockMakeUser(`anon-${mockAuthState.anonCounter}`, true);
      return { user: mockAuthState.currentUser };
    },
    signOut: async () => { mockAuthState.currentUser = null; },
    onAuthStateChanged: (listener: (user: MockAuthUser | null) => void) => {
      listener(mockAuthState.currentUser);
      return () => undefined;
    },
    onIdTokenChanged: () => () => undefined,
  };
  const factory = Object.assign(() => instance, {
    GoogleAuthProvider: { credential: (idToken: string) => ({ providerId: 'google.com', idToken }) },
    AppleAuthProvider: { credential: (idToken: string) => ({ providerId: 'apple.com', idToken }) },
  });
  return { __esModule: true, default: factory, getAuth: () => instance };
});

// ── Functions: сервер подтверждает личность, остальное — пустой ок ─────────
const mockCallableCalls: string[] = [];
jest.mock('@react-native-firebase/functions', () => {
  const httpsCallable = (_fns: unknown, name: string) => async (data: Record<string, unknown> = {}) => {
    mockCallableCalls.push(name);
    if (name === 'authEnsureStableLink') {
      return {
        data: {
          ok: true,
          stableUid: String(data.stableId ?? ''),
          authUid: mockAuthState.currentUser?.uid ?? '',
          identityReady: true,
        },
      };
    }
    return { data: { ok: true } };
  };
  return { __esModule: true, default: () => ({}), getFunctions: () => ({}), httpsCallable };
});

// ── Страницы карточек: in-memory по uid+языку ───────────────────────────────
jest.mock('../app/flashcards_cloud_pages', () => ({
  ...jest.requireActual('../app/flashcards_cloud_pages'),
  writeFlashcardPages: async (stableId: string, target: string, cardsJson: string) => {
    mockCloud.pages.set(`${stableId}:${target}`, cardsJson);
    return 1;
  },
}));
jest.mock('../app/flashcard_pages_read_result', () => ({
  ...jest.requireActual('../app/flashcard_pages_read_result'),
  readFlashcardPagesResult: async (stableId: string, target: string) => {
    const value = mockCloud.pages.get(`${stableId}:${target}`);
    return value
      ? { status: 'ok', value, pages: 1, cards: (JSON.parse(value) as unknown[]).length, from: 'server' }
      : { status: 'empty', from: 'server' };
  },
}));

// ── stable_id: in-memory (Keychain нет в Node) ──────────────────────────────
const mockStable = { id: null as string | null, guestCounter: 0 };
jest.mock('../app/stable_id', () => ({
  getStableId: async () => {
    if (!mockStable.id) {
      mockStable.guestCounter += 1;
      mockStable.id = `guest-${mockStable.guestCounter}`;
    }
    return mockStable.id;
  },
  setStableId: async (value: string) => { mockStable.id = value; },
  clearStableId: async () => { mockStable.id = null; },
  peekStableId: () => mockStable.id,
  readExistingStableId: async () => mockStable.id,
  onStableIdChanged: () => () => undefined,
  _resetStableIdCache: () => undefined,
}));

// ── Нативное/постороннее для сценария ───────────────────────────────────────
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
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
  IS_STORE_RELEASE: false,
}));
jest.mock('../app/phone_state_bootstrap', () => ({
  closePhoneStateBeforeLocalWipe: async () => undefined,
  retirePhoneStateAfterDeletion: async () => undefined,
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
    resolved: 0, pending: 0, pendingEarn: 0, pendingSpend: 0, ownerStableId: mockStable.id, stale: false,
  }),
}));
jest.mock('../app/mistake_practice_cloud_transport', () => ({
  uploadMistakePracticeEvents: async () => 0,
  restoreMistakePracticeEvents: async () => 0,
}));
jest.mock('../app/mistake_practice_rewards', () => ({
  flushPendingMistakeCorrectionRewards: async () => undefined,
}));
jest.mock('../app/firebase', () => ({ logEvent: () => undefined, recordError: () => undefined }));

// eslint-disable-next-line import/first
import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line import/first
import { signOutAndWipeForAccountSwitch } from '../app/auth_provider';
// eslint-disable-next-line import/first
import { restoreFromCloudDetailed, wipeLocalAccountData } from '../app/cloud_sync';
// eslint-disable-next-line import/first
import { restoreAccountSwitchEmergencyBackupIfSafe } from '../app/account_switch_backup_restore';
// eslint-disable-next-line import/first
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
// eslint-disable-next-line import/first
import { mistakePracticeEventsKey } from '../app/target_storage_keys';
// eslint-disable-next-line import/first
import { createLearningV2CourseLocalProgressStoreV1 } from '../modules/learning-v2/progress/course_local_progress_v1';
// eslint-disable-next-line import/first
import { deriveLocalOfflineProgressAccountScopeHash } from '../modules/learning-v2/progress/progress_account_scope';
// eslint-disable-next-line import/first
import { buildLearningV2CourseTopologyV1 } from '../modules/learning-v2/content/course_topology_v1';

// ── Аккаунты и их прогресс ──────────────────────────────────────────────────
type Account = { stable: string; auth: string; sub: string; name: string };
const A: Account = { stable: 'stable-A', auth: 'auth-A', sub: 'google-sub-A', name: 'Аня' };
const B: Account = { stable: 'stable-B', auth: 'auth-B', sub: 'google-sub-B', name: 'Боря' };
const BACKUP_ROOT = 'account_switch_emergency_backup_latest_v1';
const SHELVED_PREFIX = 'account_switch_emergency_backup_shelved_v1:';
const PLUS_EXPIRY = String(Date.UTC(2099, 0, 1));
const A_CARDS = JSON.stringify([{ id: 'card-a-1', en: 'to look forward to', ru: 'ждать с нетерпением', createdAt: 1_700_000_000_000 }]);

type ProbeKey = Readonly<{ label: string; key: string; value: string }>;

/** Ключи прогресса A, которые проверяет сценарий (key → значение на телефоне A). */
function aProgressKeys(lv2Key: string, lv2Value: string): ProbeKey[] {
  return [
    { label: 'Уроки (лучшая оценка урока 1)', key: 'lesson1_best_score', value: '5' },
    { label: 'Серия', key: 'streak_count', value: '12' },
    { label: 'Карточки', key: 'flashcards_v1', value: A_CARDS },
    { label: '«Мои ошибки» (журнал)', key: mistakePracticeEventsKey(A.stable, 'en'), value: '{"version":1,"events":["mistake-a"]}' },
    { label: 'Имя', key: 'user_name', value: A.name },
    { label: 'Plus (план)', key: 'premium_plan', value: 'monthly' },
    { label: 'Plus (срок)', key: 'premium_expiry', value: PLUS_EXPIRY },
    { label: 'Монеты (проекция кошелька)', key: `level_spin_star_projection_v1:${A.stable}`, value: '{"balance":350}' },
    { label: 'Ранг монеты', key: `coin_rank_v1:${A.stable}`, value: '{"schemaVersion":"coin-rank-state.v1","rank":3}' },
    { label: 'Визитка «Про»', key: `profile_card_pro_v1:${A.stable}`, value: '{"schemaVersion":"profile-card-pro.v1","owned":true}' },
    { label: 'Карта Learning V2', key: lv2Key, value: lv2Value },
  ];
}

/** Что сервер уже знает об аккаунте (серверные ключи пишет сервер, не клиент). */
function seedServerDoc(account: Account, progress: Record<string, unknown>): void {
  mockCloud.docs.set(`users/${account.stable}`, { stableId: account.stable, progress: { ...progress } });
}

function setProviderSession(account: Account): void {
  mockAuthState.currentUser = mockMakeUser(account.auth, false, account.sub);
}

async function dumpStorage(): Promise<Map<string, string>> {
  const keys = await AsyncStorage.getAllKeys();
  const rows = await AsyncStorage.multiGet(keys);
  return new Map(rows.filter((row): row is [string, string] => row[1] !== null));
}

type SignInTrace = Readonly<{
  restore: string;
  backup: string;
  afterCloud: Map<string, string>;
  afterBackup: Map<string, string>;
}>;

/**
 * Вход провайдером на этом телефоне (ветка merged_swap_to_remote из signInWithProvider):
 * ядро свапа + фоновая догрузка scheduleSameStablePostAuthRefresh в том же порядке.
 */
async function signInOnThisPhone(account: Account): Promise<SignInTrace> {
  setProviderSession(account);
  await withAccountTransitionLock(async (lease) => {
    await wipeLocalAccountData(lease);
    mockStable.id = account.stable;
    beginAccountGeneration(account.stable);
  });
  const generation = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(generation, account.stable);
  const restore = await restoreFromCloudDetailed();
  const afterCloud = await dumpStorage();
  const backup = await restoreAccountSwitchEmergencyBackupIfSafe(isCurrent);
  const afterBackup = await dumpStorage();
  return { restore, backup: backup.status, afterCloud, afterBackup };
}

function resetPhoneAndCloud(): void {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  mockCloud.docs.clear();
  mockCloud.pages.clear();
  mockCloud.writes.length = 0;
  mockCallableCalls.length = 0;
  mockAuthState.currentUser = null;
  mockStable.id = null;
  __resetAccountGenerationForTests();
}

async function seedAccountAOnPhone(): Promise<ProbeKey[]> {
  resetPhoneAndCloud();
  seedServerDoc(A, {
    lesson1_best_score: '5',
    streak_count: '12',
    premium_plan: 'monthly',
    premium_expiry: PLUS_EXPIRY,
  });
  seedServerDoc(B, { user_name: B.name });
  mockStable.id = A.stable;
  setProviderSession(A);
  beginAccountGeneration(A.stable);
  const scope = deriveLocalOfflineProgressAccountScopeHash(A.stable);
  const firstSession = buildLearningV2CourseTopologyV1().lessons[0].sessions[0].sessionId;
  await createLearningV2CourseLocalProgressStoreV1(AsyncStorage).complete(scope, firstSession);
  const lv2Key = `learning-v2:course-local-progress:v1:${scope}`;
  const lv2Value = (await AsyncStorage.getItem(lv2Key))!;
  const keys = aProgressKeys(lv2Key, lv2Value);
  await AsyncStorage.multiSet(keys.map(({ key, value }) => [key, value]));
  return keys;
}

const consoleLines: string[] = [];
let consoleSpies: jest.SpyInstance[] = [];
beforeAll(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  consoleSpies = (['log', 'warn', 'info', 'error'] as const).map((level) => (
    jest.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      consoleLines.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
    })
  ));
});
afterAll(() => {
  for (const spy of consoleSpies) spy.mockRestore();
});

// ── Наблюдения ──────────────────────────────────────────────────────────────
type Source = 'облако' | 'аварийная копия' | 'локальный ключ по отпечатку' | 'ПОТЕРЯН';
type Observation = Readonly<{
  label: string;
  key: string;
  seeded: string;
  /** После выхода A значение есть в облаке A (документ или страницы карточек). */
  inCloudAfterAExit: boolean;
  /** Ключ попал в аварийную копию A, записанную при её выходе. */
  inAFirstBackup: boolean;
  /** Ключ пережил стирание при выходе A (не входит в инвентарь аккаунта). */
  survivedAWipe: boolean;
  /** Значение у Б после входа (null — ключа нет). */
  atB: string | null;
  /** Значение у A после возврата (null — ключа нет). */
  atAReturn: string | null;
  source: Source;
}>;

type ScenarioResult = {
  aExit: unknown;
  b: SignInTrace | null;
  bExitNormal: unknown;
  bExitForced: unknown;
  shelvedAfterBExit: string[];
  backupOwnerBeforeAReturn: string | null;
  a: SignInTrace;
  /** Ключи у Б, в имени которых есть id или отпечаток A. */
  aNamedKeysAtB: string[];
  /** Ключ карты Learning V2 самого Б (по его отпечатку) после входа Б. */
  bOwnLv2Key: string | null;
  /** Повторный штатный выход A после возврата (только в сценарии с Б). */
  aSecondExitNormal: unknown;
  observations: Observation[];
};

const SHOW_TABLE = process.env.AA_ROUNDTRIP_TABLE === '1';

function printScenario(title: string, result: ScenarioResult): void {
  if (!SHOW_TABLE) return;
  process.stdout.write(`\n[AA-ROUNDTRIP] ${title} ${JSON.stringify({
    aExit: result.aExit,
    bRestore: result.b?.restore ?? null,
    bBackup: result.b?.backup ?? null,
    bExitNormal: result.bExitNormal ?? null,
    bExitForced: result.bExitForced ?? null,
    shelvedAfterBExit: result.shelvedAfterBExit.length,
    backupOwnerBeforeAReturn: result.backupOwnerBeforeAReturn,
    aRestore: result.a.restore,
    aBackup: result.a.backup,
    aNamedKeysAtB: result.aNamedKeysAtB,
    aSecondExitNormal: result.aSecondExitNormal ?? null,
  })}\n`);
  for (const row of result.observations) {
    const atB = row.atB === null ? '—' : row.atB === row.seeded ? 'ДАННЫЕ A' : `своё(${row.atB.slice(0, 20)})`;
    process.stdout.write(`[AA-ROUNDTRIP] ${row.label} | облако=${row.inCloudAfterAExit} копияA=${row.inAFirstBackup} пережилСтирание=${row.survivedAWipe} | Б=${atB} | A=${row.atAReturn === row.seeded ? 'на месте' : 'НЕТ'} | ${row.source}\n`);
  }
  // Трасса выходов из самого приложения ([ACC-MUT]/[ACC-SWITCH-WIPE]) — по ней видно отказы.
  const trace = consoleLines.filter((line) => /\[ACC-MUT\]|\[ACC-SWITCH-WIPE\]|SYNC-DENY/.test(line));
  process.stdout.write(`[AA-ROUNDTRIP] trace:\n${trace.slice(-30).join('\n')}\n`);
  consoleLines.length = 0;
}

function cloudHasForA(key: string): boolean {
  const progress = mockCloud.docs.get(`users/${A.stable}`)?.progress ?? {};
  const value = progress[key];
  if (value !== undefined && value !== null) return true;
  return key === 'flashcards_v1' && mockCloud.pages.has(`${A.stable}:en`);
}

async function backupRootPairKeys(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(BACKUP_ROOT);
  if (!raw) return new Set();
  const root = JSON.parse(raw) as { backupId: string; pageCount: number };
  const keys = new Set<string>();
  for (let index = 0; index < root.pageCount; index += 1) {
    const page = JSON.parse((await AsyncStorage.getItem(`account_switch_emergency_backup_page_v1:${root.backupId}:${index}`))!) as {
      pairs: Array<[string, string]>;
    };
    for (const [key] of page.pairs) keys.add(key);
  }
  return keys;
}

/** Выход как в AccountLogoutFlow: штатный; при любом отказе — форсированный. */
async function logoutLikeAccountLogoutFlow(): Promise<{ normal: unknown; forced: unknown }> {
  const normal = await signOutAndWipeForAccountSwitch();
  if (normal.ok) return { normal, forced: null };
  const forced = await signOutAndWipeForAccountSwitch({
    allowWipeWithoutSync: true,
    allowPendingShardSpendDiscard: true,
  });
  return { normal, forced };
}

async function runScenario(withB: boolean): Promise<ScenarioResult> {
  const keys = await seedAccountAOnPhone();
  const aScopeHash = deriveLocalOfflineProgressAccountScopeHash(A.stable);

  // 1. Штатный выход A с сетью.
  const aExit = await signOutAndWipeForAccountSwitch();
  const aBackupKeys = await backupRootPairKeys();
  const afterAExit = await dumpStorage();
  const cloudAfterAExit = new Map(keys.map(({ key }) => [key, cloudHasForA(key)]));

  let b: SignInTrace | null = null;
  let bExitNormal: unknown = null;
  let bExitForced: unknown = null;
  let aNamedKeysAtB: string[] = [];
  let bOwnLv2Key: string | null = null;
  if (withB) {
    // 2. Вход Б.
    b = await signInOnThisPhone(B);
    aNamedKeysAtB = [...b.afterBackup.keys()].filter((key) => (
      key.includes(A.stable) || key.includes(aScopeHash)
    ));
    const bLv2Key = `learning-v2:course-local-progress:v1:${deriveLocalOfflineProgressAccountScopeHash(B.stable)}`;
    bOwnLv2Key = b.afterBackup.get(bLv2Key) ?? null;
    // 3. Выход Б.
    const exit = await logoutLikeAccountLogoutFlow();
    bExitNormal = exit.normal;
    bExitForced = exit.forced;
  }
  const shelvedAfterBExit = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(SHELVED_PREFIX));
  const rootRaw = await AsyncStorage.getItem(BACKUP_ROOT);
  const backupOwnerBeforeAReturn = rootRaw ? (JSON.parse(rootRaw) as { stableId: string }).stableId : null;

  // 4. Вход A на том же телефоне.
  const a = await signInOnThisPhone(A);

  const observations = keys.map(({ label, key, value }): Observation => {
    const atAReturn = a.afterBackup.get(key) ?? null;
    const survivedAWipe = afterAExit.get(key) === value;
    const source: Source = atAReturn !== value
      ? 'ПОТЕРЯН'
      : survivedAWipe
        ? 'локальный ключ по отпечатку'
        : a.afterCloud.get(key) === value
          ? 'облако'
          : 'аварийная копия';
    return {
      label,
      key,
      seeded: value,
      inCloudAfterAExit: cloudAfterAExit.get(key) === true,
      inAFirstBackup: aBackupKeys.has(key),
      survivedAWipe,
      atB: b ? b.afterBackup.get(key) ?? null : null,
      atAReturn,
      source,
    };
  });

  // Повторный штатный выход A: кто теперь держит слот аварийной копии.
  const aSecondExitNormal = withB ? await signOutAndWipeForAccountSwitch() : null;

  return {
    aExit, b, bExitNormal, bExitForced, shelvedAfterBExit, backupOwnerBeforeAReturn,
    a, aNamedKeysAtB, bOwnLv2Key, aSecondExitNormal, observations,
  };
}

function row(result: ScenarioResult, key: string): Observation {
  const found = result.observations.find((item) => item.key === key || item.key.startsWith(key));
  if (!found) throw new Error(`no observation for ${key}`);
  return found;
}

const CLOUD_KEYS = ['lesson1_best_score', 'streak_count', 'flashcards_v1', 'user_name', 'premium_plan', 'premium_expiry'];
const LV2_PREFIX = 'learning-v2:course-local-progress:v1:';

describe('AA: A → выход → Б → выход → A на том же телефоне', () => {
  let result: ScenarioResult;
  beforeAll(async () => {
    result = await runScenario(true);
    printScenario('A→Б→A', result);
  });

  test('1. штатный выход A с сетью проходит, облако A получило клиентские ключи', () => {
    expect(result.aExit).toEqual({ ok: true, synced: true });
    // forceSyncToCloud настоящий: имя ушло в документ, карточки — в страницы.
    expect(mockCloud.docs.get(`users/${A.stable}`)?.progress?.user_name).toBe(A.name);
    expect(mockCloud.pages.get(`${A.stable}:en`)).toBe(A_CARDS);
    for (const key of CLOUD_KEYS) expect({ key, inCloud: row(result, key).inCloudAfterAExit }).toEqual({ key, inCloud: true });
  });

  test('2. изоляция: у Б нет ни одного значения A, своё имя — из облака Б', () => {
    expect(result.b?.restore).toBe('restored');
    // Копия A не чужому: Б её не доливает и не трогает.
    expect(result.b?.backup).toBe('different_account');
    for (const item of result.observations) {
      if (item.key.startsWith(LV2_PREFIX)) continue;
      expect({ key: item.key, leakedToB: item.atB === item.seeded }).toEqual({ key: item.key, leakedToB: false });
    }
    expect(row(result, 'user_name').atB).toBe(B.name);
    // Карта Learning V2: ключ A лежит на диске под отпечатком A (его не стирают),
    // но Б читает только свой отпечаток — своего прогресса у Б нет.
    expect(result.bOwnLv2Key).toBeNull();
    expect(result.aNamedKeysAtB).toEqual([row(result, LV2_PREFIX).key]);
  });

  test('3. возврат A: уроки, серия, карточки, имя, Plus — из облака', () => {
    expect(result.a.restore).toBe('restored');
    for (const key of CLOUD_KEYS) {
      const item = row(result, key);
      expect({ key, atA: item.atAReturn, source: item.source }).toEqual({ key, atA: item.seeded, source: 'облако' });
    }
  });

  test('4. возврат A: карта Learning V2 — локальный ключ по отпечатку (стирание его не трогает)', () => {
    const item = row(result, LV2_PREFIX);
    expect(item.survivedAWipe).toBe(true);
    expect(item.inAFirstBackup).toBe(false);
    expect(item.atAReturn).toBe(item.seeded);
    expect(item.source).toBe('локальный ключ по отпечатку');
  });

  // НАХОДКА (не известная ранее): слот аварийной копии на телефоне один. Финальный
  // снимок A лежит в нём после выхода A; Б при входе его не трогает (different_account),
  // а штатный выход Б не может записать свой снимок поверх чужого → отказ
  // backup_failed / account_switch_backup_other_owner_pending. AccountLogoutFlow
  // тут же делает форсированный выход, который ОТКЛАДЫВАЕТ копию A в
  // account_switch_emergency_backup_shelved_v1:<A>:<время> (вернуть — только вручную,
  // через 30 дней её удалит pruneShelvedAccountSwitchBackups). При возврате A в слоте
  // уже копия Б → different_account → ключи A, которые жили только в копии, не возвращаются.
  // Повторный штатный выход A упирается в тот же отказ (теперь копия Б).
  test('5. НАХОДКА: штатный выход Б отказывает из-за копии A, форсированный откладывает её', () => {
    expect(result.bExitNormal).toEqual({
      ok: false, reason: 'backup_failed', detail: 'account_switch_backup_other_owner_pending',
    });
    expect(result.bExitForced).toEqual({ ok: true, synced: true });
    expect(result.shelvedAfterBExit).toHaveLength(1);
    expect(result.shelvedAfterBExit[0].startsWith(`${SHELVED_PREFIX}${A.stable}:`)).toBe(true);
    expect(result.backupOwnerBeforeAReturn).toBe(B.stable);
    expect(result.a.backup).toBe('different_account');
    expect(result.aSecondExitNormal).toEqual({
      ok: false, reason: 'backup_failed', detail: 'account_switch_backup_other_owner_pending',
    });
  });

  // ИЗВЕСТНАЯ ПОТЕРЯ (§AA-45a в INBOX_COORDINATOR_FROM_CORE.md, §AUTH-0010 в
  // INBOX_COORDINATOR_FROM_AUTH.md; полоса Ядра): ранг монеты и визитка «Про» в облако не
  // ходят, их единственный путь назад — аварийная копия. В сценарии A→Б→A копию A
  // откладывает форсированный выход Б (тест 5) → у A их нет. Когда Ядро отправит ключи в
  // облако (или слот копии станет на владельца) — тест «проснётся»: снять .failing.
  test.failing('6. ИЗВЕСТНАЯ ПОТЕРЯ §AA-45a/§AUTH-0010: ранг монеты coin_rank_v1: возвращается к A', () => {
    const item = row(result, 'coin_rank_v1:');
    expect(item.atAReturn).toBe(item.seeded);
  });

  test.failing('7. ИЗВЕСТНАЯ ПОТЕРЯ §AA-45a/§AUTH-0010: визитка «Про» profile_card_pro_v1: возвращается к A', () => {
    const item = row(result, 'profile_card_pro_v1:');
    expect(item.atAReturn).toBe(item.seeded);
  });

  // НОВАЯ ПОТЕРЯ (тот же механизм, что тест 5): локальный журнал «Моих ошибок»
  // (mistake_practice_v2::…) стирается при выходе, forceSyncToCloud его не выгружает
  // (события уходят только обычным doSyncToCloud). Не выгруженные до выхода события
  // возвращались бы только из копии A, а её отложил выход Б. Облачный путь событий
  // в этом тесте заглушен — то, что успело уйти обычной синхронизацией, вернётся.
  test.failing('8. НОВАЯ ПОТЕРЯ: локальный журнал «Моих ошибок» возвращается к A', () => {
    const item = row(result, 'mistake_practice');
    expect(item.inCloudAfterAExit).toBe(false);
    expect(item.atAReturn).toBe(item.seeded);
  });

  // НОВАЯ ПОТЕРЯ: проекция кошелька монет level_spin_star_projection_v1:<A> (в ней же
  // неподтверждённые сервером начисления) — только в копии; копию отложил выход Б.
  // Баланс на сервере (users.stars) этот тест не моделирует.
  test.failing('9. НОВАЯ ПОТЕРЯ: проекция кошелька монет возвращается к A', () => {
    const item = row(result, 'level_spin_star_projection_v1:');
    expect(item.atAReturn).toBe(item.seeded);
  });

  test('10. фиксация потерь: ровно четыре ключа живут только в копии A и пропадают', () => {
    const lost = result.observations.filter((item) => item.source === 'ПОТЕРЯН');
    expect(lost.map((item) => item.key.split(':')[0]).sort()).toEqual([
      'coin_rank_v1',
      'level_spin_star_projection_v1',
      'mistake_practice_v2',
      'profile_card_pro_v1',
    ]);
    for (const item of lost) {
      expect({ key: item.key, cloud: item.inCloudAfterAExit, backup: item.inAFirstBackup })
        .toEqual({ key: item.key, cloud: false, backup: true });
    }
  });
});

// Контроль: тот же A уходит и сразу возвращается (без Б). Слот копии занят им самим →
// копия доливается, и ключи «только в копии» на месте. Значит, потеря тестов 6–9 — от
// чужой копии в единственном слоте, а не от выхода как такового.
describe('Контроль: A → выход → A (без Б) на том же телефоне', () => {
  let result: ScenarioResult;
  beforeAll(async () => {
    result = await runScenario(false);
    printScenario('A→A', result);
  });

  test('копия A доливается, все ключи на месте', () => {
    expect(result.aExit).toEqual({ ok: true, synced: true });
    expect(result.backupOwnerBeforeAReturn).toBe(A.stable);
    expect(result.a.backup).toBe('restored');
    for (const item of result.observations) {
      expect({ key: item.key, atA: item.atAReturn }).toEqual({ key: item.key, atA: item.seeded });
    }
  });

  test('ранг монеты, визитка «Про», «Мои ошибки», кошелёк — из аварийной копии', () => {
    for (const prefix of ['coin_rank_v1:', 'profile_card_pro_v1:', 'mistake_practice', 'level_spin_star_projection_v1:']) {
      expect({ prefix, source: row(result, prefix).source }).toEqual({ prefix, source: 'аварийная копия' });
    }
  });
});
