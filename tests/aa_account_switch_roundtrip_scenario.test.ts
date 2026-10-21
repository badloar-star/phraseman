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
import { __tryRestoreAccountSwitchBackupForTests, signOutAndWipeForAccountSwitch } from '../app/auth_provider';
// eslint-disable-next-line import/first
import { restoreFromCloudDetailed, wipeLocalAccountData } from '../app/cloud_sync';
// eslint-disable-next-line import/first
import {
  restoreAccountSwitchEmergencyBackupIfSafe,
  shelvesAllowedForPostAuthStage,
} from '../app/account_switch_backup_restore';
// eslint-disable-next-line import/first
import {
  adoptServerWalletFromUserDoc,
  peekStoredLevelSpinStarsForBoot,
  readUnifiedLevelSpinStars,
} from '../app/level_spin_star_grants';
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
// Ключ, который есть только у Б (тот же класс, что ранг монеты A: в облако не ходит).
const B_ONLY_KEY = `coin_rank_v1:${'stable-B'}`;
const B_ONLY_VALUE = '{"schemaVersion":"coin-rank-state.v1","rank":9}';
// Настоящая проекция кошелька (её разбирает peekStoredLevelSpinStarsForBoot): 350 монет
// от сервера + 5 за практику, ещё не подтверждённые сервером (ожидающая операция) = 355.
const A_PENDING_PRACTICE_OPERATION = {
  schemaVersion: 'client-practice-rune-operation.v1',
  operationId: 'practice_rune:lesson_s1_1',
  ownerStableId: 'stable-A',
  activity: 'lesson',
  sessionKey: 's1',
  completionOrdinal: 1,
  amount: 5,
  reason: 'practice_session_reward',
  createdAtMs: 1_700_000_000_000,
  requestFingerprint: 'a'.repeat(64),
};
const A_PROJECTION = JSON.stringify({
  schemaVersion: 'client-level-spin-star-projection.v3',
  ownerStableId: 'stable-A',
  operations: [A_PENDING_PRACTICE_OPERATION],
  acknowledged: {},
  serverBalance: 350,
  serverEarnedTotal: 400,
  serverSeq: 3,
});
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
    { label: 'Монеты (проекция кошелька)', key: `level_spin_star_projection_v1:${A.stable}`, value: A_PROJECTION },
    // Требование координатора (а): очередь рун/монет, не подтверждённая сервером.
    { label: 'Руны: outbox начислений', key: `level_spin_star_grant_outbox_v1:${A.stable}`, value: '{"version":1,"entries":["grant-a-1"]}' },
    { label: 'Руны: операция', key: `level_spin_star_operation_v1:${A.stable}:level_spin%3Areq-a.base`, value: '{"version":1,"state":"pending"}' },
    { label: 'Руны: подготовленная', key: `level_spin_star_prepared_v1:${A.stable}`, value: '{"version":1,"prepared":["req-a"]}' },
    { label: 'Руны: журнал практики', key: `practice_rune_journal_v1:${A.stable}:practice-op-a`, value: '{"version":1,"amount":5}' },
    { label: 'Ранг монеты', key: `coin_rank_v1:${A.stable}`, value: '{"schemaVersion":"coin-rank-state.v1","rank":3}' },
    { label: 'Визитка «Про»', key: `profile_card_pro_v1:${A.stable}`, value: '{"schemaVersion":"profile-card-pro.v1","owned":true}' },
    { label: 'Карта Learning V2', key: lv2Key, value: lv2Value },
    // зачем (координатор 15.10, LOGOUT_WIPE_AUDIT): ключи без владельца в имени — раньше доставались Б; теперь стираются при выходе
    // и возвращаются к A из аварийной копии (лимит голоса без сброса перевходом, отложенная заморозка серии).
    { label: 'Голосовые попытки Диалогов (лимит дня)', key: 'dialogue_v2_voice_attempts_v1', value: '{"day":"2026-10-15","count":3}' },
    { label: 'Отложенная заморозка Plus', key: 'streak_plus_freeze_pending_v1', value: '{"gapDay":"2026-10-14","keptStreak":12,"createdDay":"2026-10-15","reason":"premium_check_timeout"}' },
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
type SignInRace = Readonly<{
  /** Главная читает монеты ПОСЛЕ восстановления из облака, но ДО долива аварийной копии (как в проде, 21.10). */
  readCoinsBeforeBackup?: boolean;
  /** Серверный кошелёк вливается после долива копии — тем же порядком, что scheduleSameStablePostAuthRefresh. */
  adoptServerStarsAfterBackup?: boolean;
}>;

async function signInOnThisPhone(account: Account, race: SignInRace = {}): Promise<SignInTrace> {
  setProviderSession(account);
  await withAccountTransitionLock(async (lease) => {
    await wipeLocalAccountData(lease);
    mockStable.id = account.stable;
    beginAccountGeneration(account.stable);
  });
  const generation = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(generation, account.stable);
  let serverStars: unknown = undefined;
  const restore = await restoreFromCloudDetailed(
    race.adoptServerStarsAfterBackup ? { onServerStars: (stars) => { serverStars = stars; } } : {},
  );
  const afterCloud = await dumpStorage();
  if (race.readCoinsBeforeBackup) await readUnifiedLevelSpinStars(generation);
  const backup = await restoreAccountSwitchEmergencyBackupIfSafe(isCurrent);
  if (race.adoptServerStarsAfterBackup) await adoptServerWalletFromUserDoc(generation, serverStars, 'scenario');
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
  /** reason=… из лога `backup:shelved_other_owner` за время выхода Б. */
  shelvedAfterBExitReasons: string[];
  backupOwnerBeforeAReturn: string | null;
  /** Полки после возврата A (до повторного выхода A). */
  shelvedAfterAReturn: string[];
  /** Страницы полки A, оставшиеся после возврата A (0 — сняты вместе с корнем). */
  orphanPagesOfAShelfAfterAReturn: number;
  backupOwnerAfterAReturn: string | null;
  /** Ключ, который был только у Б (в его копии), — у A после возврата (null — нет). */
  bOnlyKeyAtAReturn: string | null;
  /** Видимый баланс монет A: на телефоне до выхода / после возврата / после повторного долива. */
  coinsSeeded: number | null;
  coinsAfterAReturn: number | null;
  secondRestore: string;
  /** Ключи, которые изменил повторный долив сразу после возврата (ожидается пусто). */
  changedBySecondRestore: string[];
  coinsAfterSecondRestore: number | null;
  noWipeEntry: NoWipeEntryTrace | null;
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

async function runScenario(withB: boolean, aReturnRace: SignInRace = {}): Promise<ScenarioResult> {
  const keys = await seedAccountAOnPhone();
  const aScopeHash = deriveLocalOfflineProgressAccountScopeHash(A.stable);
  const coinsSeeded = await peekCoins();

  // 1. Штатный выход A с сетью.
  const aExit = await signOutAndWipeForAccountSwitch();
  const aBackupKeys = await backupRootPairKeys();
  // Снимок первой копии A (корень + страницы) — для сценария «старая полка» ниже.
  const aFirstBackupRoot = await AsyncStorage.getItem(BACKUP_ROOT);
  const aFirstBackupPages = new Map(
    [...(await dumpStorage()).entries()].filter(([key]) => key.startsWith('account_switch_emergency_backup_page_v1:')),
  );
  const afterAExit = await dumpStorage();
  const cloudAfterAExit = new Map(keys.map(({ key }) => [key, cloudHasForA(key)]));

  let b: SignInTrace | null = null;
  let bExitNormal: unknown = null;
  let bExitForced: unknown = null;
  let aNamedKeysAtB: string[] = [];
  let bOwnLv2Key: string | null = null;
  let shelvedAfterBExitReasons: string[] = [];
  if (withB) {
    // 2. Вход Б.
    b = await signInOnThisPhone(B);
    aNamedKeysAtB = [...b.afterBackup.keys()].filter((key) => (
      key.includes(A.stable) || key.includes(aScopeHash)
    ));
    const bLv2Key = `learning-v2:course-local-progress:v1:${deriveLocalOfflineProgressAccountScopeHash(B.stable)}`;
    bOwnLv2Key = b.afterBackup.get(bLv2Key) ?? null;
    // Б успел заработать своё, что живёт только локально (едет в его копию).
    await AsyncStorage.setItem(B_ONLY_KEY, B_ONLY_VALUE);
    // 3. Выход Б.
    const linesBefore = consoleLines.length;
    const exit = await logoutLikeAccountLogoutFlow();
    bExitNormal = exit.normal;
    bExitForced = exit.forced;
    shelvedAfterBExitReasons = consoleLines.slice(linesBefore)
      .map((line) => /backup:shelved_other_owner reason=([a-z_]+)/.exec(line)?.[1] ?? null)
      .filter((value): value is string => value !== null);
  }
  const shelvedAfterBExit = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(SHELVED_PREFIX));
  const aShelfBackupIds = await Promise.all(shelvedAfterBExit.map(async (key) => (
    (JSON.parse((await AsyncStorage.getItem(key))!) as { backupId?: string }).backupId ?? ''
  )));
  const rootRaw = await AsyncStorage.getItem(BACKUP_ROOT);
  const backupOwnerBeforeAReturn = rootRaw ? (JSON.parse(rootRaw) as { stableId: string }).stableId : null;

  // 4. Вход A на том же телефоне.
  const a = await signInOnThisPhone(A, aReturnRace);
  const keysAfterAReturn = await AsyncStorage.getAllKeys();
  const shelvedAfterAReturn = keysAfterAReturn.filter((key) => key.startsWith(SHELVED_PREFIX));
  const orphanPagesOfAShelfAfterAReturn = keysAfterAReturn.filter((key) => aShelfBackupIds.some((backupId) => (
    backupId !== '' && key.startsWith(`account_switch_emergency_backup_page_v1:${backupId}:`)
  ))).length;
  const rootAfterARaw = await AsyncStorage.getItem(BACKUP_ROOT);
  const backupOwnerAfterAReturn = rootAfterARaw ? (JSON.parse(rootAfterARaw) as { stableId: string }).stableId : null;
  const bOnlyKeyAtAReturn = a.afterBackup.get(B_ONLY_KEY) ?? null;

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

  // (б) Монеты после возврата и повторный долив (второй вход / двойной вызов): ничего не
  // удваивается и не меняется.
  const coinsAfterAReturn = await peekCoins();
  const beforeSecondRestore = await dumpStorage();
  const secondRestore = (await restoreAccountSwitchEmergencyBackupIfSafe(() => true)).status;
  const afterSecondRestore = await dumpStorage();
  const changedBySecondRestore = [...new Set([...beforeSecondRestore.keys(), ...afterSecondRestore.keys()])]
    .filter((key) => beforeSecondRestore.get(key) !== afterSecondRestore.get(key));
  const coinsAfterSecondRestore = await peekCoins();

  // (б) Вход БЕЗ стирания (linked_restore) при лежащей старой полке A: A потратил 50 монет,
  // очередь начислений ушла на сервер — старая полка не должна вернуть ни то, ни другое.
  let noWipeEntry: NoWipeEntryTrace | null = null;
  if (withB) {
    const outboxKey = `level_spin_star_grant_outbox_v1:${A.stable}`;
    const projectionKey = `level_spin_star_projection_v1:${A.stable}`;
    const oldShelfKey = `${SHELVED_PREFIX}${A.stable}:${(Date.now() - 60_000).toString(36)}`;
    await AsyncStorage.multiSet([...aFirstBackupPages.entries(), [oldShelfKey, aFirstBackupRoot!]]);
    await AsyncStorage.removeItem(outboxKey);
    await AsyncStorage.setItem(projectionKey, JSON.stringify({ ...JSON.parse(A_PROJECTION), serverBalance: 300 }));
    const generation = captureAccountGeneration();
    const status = (await restoreAccountSwitchEmergencyBackupIfSafe(
      () => isCurrentAccountGeneration(generation, A.stable),
      { skipShelves: !shelvesAllowedForPostAuthStage('linked_restore') },
    )).status;
    const outboxAfter = await AsyncStorage.getItem(outboxKey);
    const coinsAfter = await peekCoins();
    const oldShelfStillThere = (await AsyncStorage.getItem(oldShelfKey)) !== null;
    // Обратный контроль: тот же вызов БЕЗ skipShelves долил бы старую полку и вернул outbox —
    // иначе тест подтвердил бы и пустую реализацию.
    const controlStatus = (await restoreAccountSwitchEmergencyBackupIfSafe(
      () => isCurrentAccountGeneration(generation, A.stable),
      { skipShelves: !shelvesAllowedForPostAuthStage('swap_restore') },
    )).status;
    noWipeEntry = {
      status,
      outboxAfter,
      coinsAfter,
      oldShelfStillThere,
      controlStatus,
      controlOutboxAfter: await AsyncStorage.getItem(outboxKey),
    };
    // Вернуть телефон к состоянию «после возврата A», чтобы повторный выход шёл как прежде.
    await AsyncStorage.multiRemove([oldShelfKey, ...aFirstBackupPages.keys()]);
    await AsyncStorage.setItem(outboxKey, keys.find((item) => item.key === outboxKey)!.value);
    await AsyncStorage.setItem(projectionKey, A_PROJECTION);
  }

  // Повторный штатный выход A: кто теперь держит слот аварийной копии.
  const aSecondExitNormal = withB ? await signOutAndWipeForAccountSwitch() : null;

  return {
    aExit, b, bExitNormal, bExitForced, shelvedAfterBExit, shelvedAfterBExitReasons,
    backupOwnerBeforeAReturn, shelvedAfterAReturn, orphanPagesOfAShelfAfterAReturn,
    backupOwnerAfterAReturn, bOnlyKeyAtAReturn,
    coinsSeeded, coinsAfterAReturn, secondRestore, changedBySecondRestore, coinsAfterSecondRestore, noWipeEntry,
    a, aNamedKeysAtB, bOwnLv2Key, aSecondExitNormal, observations,
  };
}

type NoWipeEntryTrace = Readonly<{
  status: string;
  outboxAfter: string | null;
  coinsAfter: number | null;
  oldShelfStillThere: boolean;
  controlStatus: string;
  controlOutboxAfter: string | null;
}>;

/** Видимый баланс монет текущего владельца — тем же разбором, что Главная при старте. */
async function peekCoins(): Promise<number | null> {
  const visible = await peekStoredLevelSpinStarsForBoot(captureAccountGeneration());
  return visible?.balance ?? null;
}

function row(result: ScenarioResult, key: string): Observation {
  const found = result.observations.find((item) => item.key === key || item.key.startsWith(key));
  if (!found) throw new Error(`no observation for ${key}`);
  return found;
}

const CLOUD_KEYS = ['lesson1_best_score', 'streak_count', 'flashcards_v1', 'user_name', 'premium_plan', 'premium_expiry'];
const LV2_PREFIX = 'learning-v2:course-local-progress:v1:';

// зачем (владелец 21.10, №1 «монеты 0 и там и там после смены и возврата»): в проде Главная читает монеты ДО долива
// аварийной копии. Раньше это чтение записывало пустую проекцию, долив пропускал занятый ключ и удалял копию — 0.
// A2: пустая проекция не пишется; A1: серверный кошелёк вливается ПОСЛЕ долива копии.
describe('AA + гонка 21.10: A → Б → A, Главная читает монеты до долива копии', () => {
  let raced: ScenarioResult;
  beforeAll(async () => {
    raced = await runScenario(true, { readCoinsBeforeBackup: true, adoptServerStarsAfterBackup: true });
  });

  test('монеты A после возврата равны исходным (350 сервер + 5 ожидающих), а не 0', () => {
    expect(raced.coinsSeeded).toBe(355);
    expect(raced.coinsAfterAReturn).toBe(355);
  });

  test('проекция кошелька A вернулась из аварийной копии, хотя монеты читали до долива', () => {
    const projection = row(raced, 'level_spin_star_projection_v1:');
    expect(projection.atAReturn).toBe(projection.seeded);
  });

  test('повторный долив ничего не меняет и не удваивает', () => {
    expect(raced.coinsAfterSecondRestore).toBe(355);
  });
});

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

  // Было (находка ca9e27c79, §AUTH-0330): слот копии на телефоне один, штатный выход Б
  // отказывал с account_switch_backup_other_owner_pending, AccountLogoutFlow шёл в
  // форсированный выход, копия A уходила на полку, которую никто не доставал.
  // Стало (TG-0AE4918142EE): штатный выход Б сам откладывает копию A на полку
  // (`backup:shelved_other_owner reason=normal_switch`), а вход A берёт её с полки.
  test('5. штатный выход Б проходит без форсированного: копия A — на полке, вход A забирает её', () => {
    expect(result.bExitNormal).toEqual({ ok: true, synced: true });
    expect(result.bExitForced).toBeNull();
    expect(result.shelvedAfterBExit).toHaveLength(1);
    expect(result.shelvedAfterBExit[0].startsWith(`${SHELVED_PREFIX}${A.stable}:`)).toBe(true);
    expect(result.shelvedAfterBExitReasons).toEqual(['normal_switch']);
    expect(result.backupOwnerBeforeAReturn).toBe(B.stable);
    expect(result.a.backup).toBe('restored');
    // Повторный штатный выход A: копия Б в слоте теперь тоже уходит на полку, не отказ.
    expect(result.aSecondExitNormal).toEqual({ ok: true, synced: true });
  });

  test('5a. после долива полка A удалена вместе со страницами; копия Б осталась в слоте нетронутой', () => {
    expect(result.shelvedAfterAReturn.filter((key) => key.startsWith(`${SHELVED_PREFIX}${A.stable}:`))).toEqual([]);
    expect(result.orphanPagesOfAShelfAfterAReturn).toBe(0);
    expect(result.backupOwnerAfterAReturn).toBe(B.stable);
  });

  test('5b. полка чужого владельца не доливается: у A после возврата нет значений Б', () => {
    // Своё у Б — имя из облака Б; оно не должно оказаться у A.
    const name = row(result, 'user_name');
    expect(name.atAReturn).toBe(A.name);
    expect(result.bOnlyKeyAtAReturn).toBeNull();
  });

  // Ранг монеты и визитка «Про» в облако не ходят (§AA-45a/§AUTH-0010, полоса Ядра):
  // на ЭТОМ телефоне их возвращает полка A. «Другой телефон» — отдельная задача.
  test('6. ранг монеты coin_rank_v1: возвращается к A (с полки)', () => {
    const item = row(result, 'coin_rank_v1:');
    expect(item.atAReturn).toBe(item.seeded);
  });

  test('7. визитка «Про» profile_card_pro_v1: возвращается к A (с полки)', () => {
    const item = row(result, 'profile_card_pro_v1:');
    expect(item.atAReturn).toBe(item.seeded);
  });

  // Локальный журнал «Моих ошибок» forceSyncToCloud не выгружает (только doSyncToCloud);
  // облачный путь событий здесь заглушен — журнал возвращает полка A.
  test('8. локальный журнал «Моих ошибок» возвращается к A', () => {
    const item = row(result, 'mistake_practice');
    expect(item.inCloudAfterAExit).toBe(false);
    expect(item.atAReturn).toBe(item.seeded);
  });

  // Проекция кошелька монет level_spin_star_projection_v1:<A> — только в копии.
  test('9. проекция кошелька монет возвращается к A', () => {
    const item = row(result, 'level_spin_star_projection_v1:');
    expect(item.atAReturn).toBe(item.seeded);
  });

  test('10. потерь 0: все ключи «только в копии A» вернулись из аварийной копии', () => {
    expect(result.observations.filter((item) => item.source === 'ПОТЕРЯН').map((item) => item.key)).toEqual([]);
    const fromBackup = result.observations.filter((item) => item.source === 'аварийная копия');
    expect(fromBackup.map((item) => item.key.split(':')[0]).sort()).toEqual([
      'coin_rank_v1',
      'dialogue_v2_voice_attempts_v1',
      'level_spin_star_grant_outbox_v1',
      'level_spin_star_operation_v1',
      'level_spin_star_prepared_v1',
      'level_spin_star_projection_v1',
      'mistake_practice_v2',
      'practice_rune_journal_v1',
      'profile_card_pro_v1',
      'streak_plus_freeze_pending_v1',
    ]);
    for (const item of fromBackup) {
      expect({ key: item.key, cloud: item.inCloudAfterAExit, backup: item.inAFirstBackup })
        .toEqual({ key: item.key, cloud: false, backup: true });
    }
  });

  // Требование координатора (а): очередь рун/монет и журнал практики не отправлены
  // серверу до выхода — у A после возврата они на месте ровно теми же байтами.
  test('11. (а) outbox рун, операция, подготовленная и журнал практики — у A на месте', () => {
    for (const prefix of [
      'level_spin_star_grant_outbox_v1:',
      'level_spin_star_operation_v1:',
      'level_spin_star_prepared_v1:',
      'practice_rune_journal_v1:',
    ]) {
      const item = row(result, prefix);
      expect({ prefix, atA: item.atAReturn, source: item.source }).toEqual({ prefix, atA: item.seeded, source: 'аварийная копия' });
      expect({ prefix, leakedToB: item.atB === item.seeded }).toEqual({ prefix, leakedToB: false });
    }
  });

  // Требование координатора (б): монеты не уходят ни в плюс, ни в минус.
  test('12. (б) баланс монет A после A→Б→A равен исходному, повторный долив ничего не удваивает', () => {
    // 350 от сервера + 5 за практику, ожидающие подтверждения.
    expect(result.coinsSeeded).toBe(355);
    expect(result.coinsAfterAReturn).toBe(result.coinsSeeded);
    const projection = row(result, 'level_spin_star_projection_v1:');
    expect(projection.atAReturn).toBe(projection.seeded);
    // Ожидающая операция вернулась ровно одна — не потеряна и не удвоена.
    const operations = (JSON.parse(projection.atAReturn!) as { operations: Array<{ operationId: string }> }).operations;
    expect(operations.map((operation) => operation.operationId)).toEqual([A_PENDING_PRACTICE_OPERATION.operationId]);
    // Второй вход/долив: в слоте копия Б, полки A уже нет — ничего не меняется.
    expect(result.secondRestore).toBe('different_account');
    expect(result.changedBySecondRestore).toEqual([]);
    expect(result.coinsAfterSecondRestore).toBe(result.coinsSeeded);
  });

  test('13. (б) вход без стирания при старой полке A: потраченное и отправленное не воскресает', () => {
    const outboxSeeded = row(result, 'level_spin_star_grant_outbox_v1:').seeded;
    expect(result.noWipeEntry).toEqual({
      // Слот держит копию Б, полки на этом пути не смотрятся.
      status: 'different_account',
      outboxAfter: null,
      // 300 от сервера + 5 ожидающих за практику.
      coinsAfter: 305,
      oldShelfStillThere: true,
      // Обратный контроль: с полками (как на входе со стиранием) outbox вернулся бы.
      controlStatus: 'restored',
      controlOutboxAfter: outboxSeeded,
    });
  });
});

// Контроль: тот же A уходит и сразу возвращается (без Б). Слот копии занят им самим →
// копия доливается, и ключи «только в копии» на месте. Значит, потеря тестов 6–9 — от
// чужой копии в единственном слоте, а не от выхода как такового.
// Ревью TG-2307361A2567: связка «этап входа → полки» в настоящем tryRestoreAccountSwitchBackup.
// Полки доливаются только во вход со стиранием (swap_restore, keeplocal_restore).
describe('Этап входа → полки (tryRestoreAccountSwitchBackup, все пять этапов)', () => {
  const cases: ReadonlyArray<readonly [string, boolean]> = [
    ['swap_restore', true],
    ['keeplocal_restore', true],
    ['linked_restore', false],
    ['created_restore', false],
    ['keeplocal_restore_same', false],
  ];
  test.each(cases)('%s → полка долита: %s', async (stage, expectRestored) => {
    resetPhoneAndCloud();
    mockStable.id = A.stable;
    beginAccountGeneration(A.stable);
    const shelfKey = `${SHELVED_PREFIX}${A.stable}:${(Date.now() - 1_000).toString(36)}`;
    await AsyncStorage.setItem(shelfKey, JSON.stringify({
      version: 1, createdAt: Date.now() - 2_000, stableId: A.stable, pairs: [['stage_probe_key', 'from-shelf']],
    }));

    await __tryRestoreAccountSwitchBackupForTests(stage, () => true);

    expect({ stage, restored: await AsyncStorage.getItem('stage_probe_key') === 'from-shelf' })
      .toEqual({ stage, restored: expectRestored });
    expect({ stage, shelfKept: await AsyncStorage.getItem(shelfKey) !== null })
      .toEqual({ stage, shelfKept: !expectRestored });
  });
});

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
