import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeEol } from './helpers/read_source';

/*
 * Account V2, Пакет 7A (OD19) — сторож выключателя старой синхронизации.
 *
 * зачем: выключатель `accounts_v2_legacy_sync_disabled` готовит отключение
 * старой синхронизации карточек / памяти свайпов / библиотеки наборов, но
 * включает его только владелец. Сторож держит три обещания:
 *   1) выключатель false (дефолт) → путь cloud_sync прежний: omit отдаёт ТОТ ЖЕ
 *      объект, никаких логов/чтений клиента V2, restore читает и пишет всё как раньше;
 *   2) true + клиент V2 + открытая область ТЕКУЩЕГО uid → V2-домены не пишутся в
 *      старое облако и не восстанавливаются из него, НЕ-V2 ключи (профиль, монеты,
 *      серия, экзамены, достижения, Plus, купленные наборы…) — как прежде;
 *   3) true, но область закрыта / чужой uid / клиент V2 выключен → старый путь.
 */

const mockFlags: Record<string, boolean> = {};
const mockOpenScopeUid = jest.fn<string | null, []>(() => null);
const mockClientEnabled = jest.fn(() => false);
const mockPlatformSupported = jest.fn(() => true);
const mockReadPages = jest.fn(async (_uid: string, target: string) => JSON.stringify([{ id: `cloud-${target}` }]));

jest.mock('../app/remote_flags', () => {
  const actual = jest.requireActual('../app/remote_flags');
  return {
    ...actual,
    getRemoteBool: jest.fn((key: string) => (key in mockFlags ? mockFlags[key] : actual.getRemoteBool(key))),
  };
});
jest.mock('../app/accounts_v2_client_flag', () => ({
  ...jest.requireActual('../app/accounts_v2_client_flag'),
  isAccountsV2ClientEnabled: () => mockClientEnabled(),
  accountsV2OpenScopeUidIfLoaded: () => mockOpenScopeUid(),
}));
jest.mock('../modules/account-session-v2/native/account_native_expo_environment', () => ({
  isAccountV2NativePlatformSupported: () => mockPlatformSupported(),
}));
jest.mock('../app/user_id_policy', () => ({
  getAuthUserId: jest.fn(() => 'auth-a'),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));
// зачем (8J): restore читает страницы через трёхзначный readFlashcardPagesResult;
// прежний контракт мока (строка = страницы, null = подтверждённо пусто) сохранён.
jest.mock('../app/flashcard_pages_read_result', () => ({
  ...jest.requireActual('../app/flashcard_pages_read_result'),
  readFlashcardPagesResult: async (uid: string, target: string) => {
    const value = await mockReadPages(uid, target);
    return value
      ? { status: 'ok', value, pages: 1, cards: 1, from: 'server' }
      : { status: 'empty', from: 'server' };
  },
}));

// eslint-disable-next-line import/first
import {
  ACCOUNTS_V2_LEGACY_DOMAIN_KEYS,
  decideAccountsV2LegacySkip,
  isAccountsV2LegacySwitchFlagOn,
  omitAccountsV2LegacyDomains,
  resolveAccountsV2LegacySkip,
} from '../app/accounts_v2_legacy_sync_switch';
// eslint-disable-next-line import/first
import {
  ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY,
  writeAccountsV2LegacyHydratedMarker,
} from '../modules/account-session-v2/accounts_v2_legacy_marker';
// eslint-disable-next-line import/first
import { __cloudSyncTestHooks, accountOwnedStorageKeysFrom, SYNC_KEYS } from '../app/cloud_sync';
// eslint-disable-next-line import/first
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
// eslint-disable-next-line import/first
import {
  customFlashcardsKey,
  flashcardsCommunityOwnedPacksKey,
  flashcardsOwnedPacksKey,
  flashcardsSavedKey,
  flashcardsSwipeMemoryKey,
} from '../app/target_storage_keys';

const ROOT = path.resolve(__dirname, '..');
const FLAG = 'accounts_v2_legacy_sync_disabled';
const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

function setSwitch(flag: boolean, clientEnabled: boolean, scopeUid: string | null, platform = true): void {
  mockFlags[FLAG] = flag;
  mockClientEnabled.mockReturnValue(clientEnabled);
  mockOpenScopeUid.mockReturnValue(scopeUid);
  mockPlatformSupported.mockReturnValue(platform);
}

const V2_KEYS = [
  flashcardsSavedKey('en'), flashcardsSavedKey('fr'), customFlashcardsKey('en'), customFlashcardsKey('fr'),
  flashcardsSwipeMemoryKey('fr'), flashcardsCommunityOwnedPacksKey('en'), flashcardsCommunityOwnedPacksKey('fr'),
];
const KEEP_KEYS = [
  'user_name', 'streak_count', 'level_exam_A1_passed', 'achievements_state', 'premium_plan',
  'flashcards_owned_packs_v1', flashcardsOwnedPacksKey('fr'), 'shards_one_time_events', 'lesson1_best_score',
];

let logSpy: jest.SpyInstance;
beforeEach(() => {
  storage.__reset?.();
  for (const key of Object.keys(mockFlags)) delete mockFlags[key];
  setSwitch(false, false, null);
  mockReadPages.mockClear();
  mockPlatformSupported.mockClear();
  mockClientEnabled.mockClear();
  mockOpenScopeUid.mockClear();
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-a');
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => logSpy.mockRestore());

describe('7A switch — decision and omit', () => {
  test('дефолт флага — false (remote_flags)', () => {
    const actual = jest.requireActual('../app/remote_flags') as typeof import('../app/remote_flags');
    expect(actual.getRemoteBool(FLAG as never)).toBe(false);
  });

  test('выключатель false → тот же объект, ни решения V2, ни логов', () => {
    const data = { flashcards_v1: '[]', user_name: 'A' };
    expect(isAccountsV2LegacySwitchFlagOn()).toBe(false);
    expect(omitAccountsV2LegacyDomains(data, 'write', false)).toBe(data);
    expect(mockClientEnabled).not.toHaveBeenCalled();
    expect(mockOpenScopeUid).not.toHaveBeenCalled();
    expect(mockPlatformSupported).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  const base = {
    flagOn: true, clientEnabled: true, platformSupported: true, hydratedUid: 'auth-a', openScopeUid: 'auth-a', authUid: 'auth-a',
  } as const;
  test.each([
    ['restore', {}, true, 'v2_owns_domains'],
    ['restore', { flagOn: false }, false, 'flag_off'],
    ['restore', { clientEnabled: false }, false, 'client_off'],
    ['restore', { platformSupported: false }, false, 'platform_unsupported'],
    ['restore', { authUid: null }, false, 'no_auth_uid'],
    ['restore', { hydratedUid: null }, false, 'not_hydrated'],
    ['restore', { hydratedUid: 'auth-b' }, false, 'not_hydrated'],
    // restore НЕ зависит от области: на холодном старте её ещё нет.
    ['restore', { openScopeUid: null }, true, 'v2_owns_domains'],
    ['write', {}, true, 'v2_owns_domains'],
    ['write', { openScopeUid: null }, false, 'scope_closed'],
    ['write', { openScopeUid: 'auth-b' }, false, 'scope_other_uid'],
    ['write', { hydratedUid: null }, false, 'not_hydrated'],
    ['write', { platformSupported: false }, false, 'platform_unsupported'],
  ] as const)('%s %j → skip=%s (%s)', (phase, patch, skip, reason) => {
    expect(decideAccountsV2LegacySkip({ ...base, ...patch, phase })).toEqual({ skip, reason });
  });

  test('resolve: метка этого uid + платформа → restore пропускается и пишет лог решения со значениями', async () => {
    setSwitch(true, true, null);
    await writeAccountsV2LegacyHydratedMarker('auth-a', 1);
    await expect(resolveAccountsV2LegacySkip('restore', 'auth-a')).resolves.toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      '[ACCOUNT-V2] legacy_restore_decision skip=true reason=v2_owns_domains flag=true client=true platformSupported=true hydrated=true',
    );
    await expect(resolveAccountsV2LegacySkip('write', 'auth-a')).resolves.toBe(false);
    mockPlatformSupported.mockReturnValue(false);
    await expect(resolveAccountsV2LegacySkip('restore', 'auth-a')).resolves.toBe(false);
    mockPlatformSupported.mockReturnValue(true);
    await AsyncStorage.setItem(ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY, '{broken');
    await expect(resolveAccountsV2LegacySkip('restore', 'auth-a')).resolves.toBe(false);
  });

  test('true → убраны ровно V2-домены, остальное нетронуто, лог по доменам', () => {
    const data: Record<string, string> = {};
    for (const key of [...V2_KEYS, ...KEEP_KEYS]) data[key] = 'v';
    const out = omitAccountsV2LegacyDomains(data, 'write', true);
    expect(Object.keys(out).sort()).toEqual([...KEEP_KEYS].sort());
    expect(data).toHaveProperty(flashcardsSavedKey('en'));
    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines).toEqual(expect.arrayContaining([
      '[ACCOUNT-V2] legacy_skip domain=saved_cards phase=write keys=2',
      '[ACCOUNT-V2] legacy_skip domain=custom_cards phase=write keys=2',
      '[ACCOUNT-V2] legacy_skip domain=swipe_memory phase=write keys=1',
      '[ACCOUNT-V2] legacy_skip domain=community_library phase=write keys=2',
    ]));
  });

  test('каждый V2-ключ, который реально синхронизирует старый путь, покрыт картой доменов', () => {
    const synced = (SYNC_KEYS as readonly string[]).filter((key) => V2_KEYS.includes(key) || key === 'flashcards');
    for (const key of synced) expect(ACCOUNTS_V2_LEGACY_DOMAIN_KEYS).toHaveProperty([key]);
    // Не-V2 ключи (keep_in_place, Plus, покупки, уроки) в карте отсутствуют.
    for (const key of KEEP_KEYS) expect(ACCOUNTS_V2_LEGACY_DOMAIN_KEYS).not.toHaveProperty([key]);
  });
});

describe('7A switch — restore из старого облака (applyRestoreFromUserDoc)', () => {
  const cloudDoc = () => ({
    exists: true,
    data: () => ({
      progress: {
        streak_count: '3',
        user_name: 'Cloud Name',
        custom_flashcards_v2: JSON.stringify([{ id: 'cloud-custom' }]),
        community_owned_pack_ids_v1: JSON.stringify(['cloud-pack']),
        [flashcardsSwipeMemoryKey('fr')]: JSON.stringify({ 'saved:all:x': { lastSeenAt: 1 } }),
      },
    }),
  });

  async function restoreWithLocal(): Promise<Record<string, string | null>> {
    await AsyncStorage.setItem('custom_flashcards_v2', JSON.stringify([{ id: 'local-custom' }]));
    await __cloudSyncTestHooks.applyRestoreFromUserDoc(cloudDoc());
    const keys = ['custom_flashcards_v2', 'community_owned_pack_ids_v1', 'user_name', flashcardsSavedKey('en'),
      flashcardsSavedKey('fr'), flashcardsSwipeMemoryKey('fr')];
    return Object.fromEntries(await AsyncStorage.multiGet(keys)) as Record<string, string | null>;
  }

  test('выключатель false → V2-домены восстанавливаются из старого облака как раньше', async () => {
    const after = await restoreWithLocal();
    expect(after.custom_flashcards_v2).toContain('cloud-custom');
    expect(after.community_owned_pack_ids_v1).toContain('cloud-pack');
    expect(after[flashcardsSavedKey('en')]).toContain('cloud-en');
    expect(after[flashcardsSwipeMemoryKey('fr')]).not.toBeNull();
    expect(after.user_name).toBe('Cloud Name');
    expect(mockReadPages).toHaveBeenCalledTimes(2);
    expect(logSpy.mock.calls.some((call) => String(call[0]).includes('legacy_skip'))).toBe(false);
  });

  test('true + клиент V2 + платформа + метка гидрации uid (область ЕЩЁ закрыта) → V2-домены НЕ трогаются', async () => {
    setSwitch(true, true, null);
    await writeAccountsV2LegacyHydratedMarker('auth-a', 1);
    const after = await restoreWithLocal();
    expect(after.custom_flashcards_v2).toContain('local-custom');
    expect(after.community_owned_pack_ids_v1).toBeNull();
    expect(after[flashcardsSavedKey('en')]).toBeNull();
    expect(after[flashcardsSavedKey('fr')]).toBeNull();
    expect(after[flashcardsSwipeMemoryKey('fr')]).toBeNull();
    expect(after.user_name).toBe('Cloud Name');
    expect(mockReadPages).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.map((call) => String(call[0]))).toEqual(expect.arrayContaining([
      '[ACCOUNT-V2] legacy_skip domain=custom_cards phase=restore keys=1',
    ]));
  });

  test.each([
    ['нет метки гидрации (новая установка / перенос не окончателен)', true, true, null],
    ['метка чужого uid', true, true, 'auth-b'],
    ['платформа без области (iOS вне пробы)', true, false, 'auth-a'],
    ['клиент V2 выключен', false, true, 'auth-a'],
  ])('true, но %s → старый restore', async (_label, clientEnabled, platform, markerUid) => {
    setSwitch(true, clientEnabled, 'auth-a', platform);
    if (markerUid !== null) await writeAccountsV2LegacyHydratedMarker(markerUid, 1);
    const after = await restoreWithLocal();
    expect(after.custom_flashcards_v2).toContain('cloud-custom');
    expect(mockReadPages).toHaveBeenCalledTimes(2);
  });
});

describe('7A r2 — метка гидрации принадлежит аккаунту (P1)', () => {
  test('ключ метки в выключателе = ключ модуля метки; выключатель не импортирует V2 статически', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const switchModule = require('../app/accounts_v2_legacy_sync_switch') as typeof import('../app/accounts_v2_legacy_sync_switch');
    expect(switchModule.ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY).toBe(ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY);
    const text = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'accounts_v2_legacy_sync_switch.ts'), 'utf8'));
    expect(text).not.toMatch(/^import[^;]*account-session-v2/m);
  });

  test('метка в инвентаре аккаунтных ключей: общий wipe при выходе/смене её стирает', () => {
    expect(accountOwnedStorageKeysFrom([])).toContain(ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY);
    expect(SYNC_KEYS as readonly string[]).not.toContain(ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY);
  });

  test('выход → вход того же uid (выключатель вкл): метка стёрта → restore старым путём, карточки на месте', async () => {
    setSwitch(true, true, null);
    await writeAccountsV2LegacyHydratedMarker('auth-a', 1);
    // общий wipe стирает весь инвентарь аккаунта (включая метку и карточки)
    await AsyncStorage.multiRemove(accountOwnedStorageKeysFrom(await AsyncStorage.getAllKeys()));
    await __cloudSyncTestHooks.applyRestoreFromUserDoc({
      exists: true,
      data: () => ({ progress: { streak_count: '3', custom_flashcards_v2: JSON.stringify([{ id: 'cloud-custom' }]) } }),
    });
    expect(await AsyncStorage.getItem('custom_flashcards_v2')).toContain('cloud-custom');
    expect(mockReadPages).toHaveBeenCalled();
  });
});

describe('7A switch — писатели старого облака (структура cloud_sync)', () => {
  // зачем (8H-2): рабочая копия cloud_sync.ts в CRLF — без нормализации поиск многострочных
  // фрагментов с переводом строки промахивался, и два теста были красными независимо от кода.
  const source = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'cloud_sync.ts'), 'utf8')).split('\r\n').join('\n');
  const body = (name: string): string => {
    const start = source.indexOf(`async function ${name}(`);
    expect(start).toBeGreaterThan(0);
    return source.slice(start, source.indexOf('\n}\n', start));
  };

  test('doSyncToCloud: V2-домены вырезаются ДО патча, страниц карточек и снимка', () => {
    const text = body('doSyncToCloud');
    const omitAt = text.indexOf("omitAccountsV2LegacyDomains(storedData, 'write', legacyV2SkipOnWrite)");
    expect(omitAt).toBeGreaterThan(0);
    // флаг выкл → && не доходит до await; решение до multiGet и под проверкой поколения.
    const decideAt = text.indexOf("isAccountsV2LegacySwitchFlagOn()\n      && await resolveAccountsV2LegacySkip('write', getAuthUserId())");
    expect(decideAt).toBeGreaterThan(0);
    expect(decideAt).toBeLessThan(text.indexOf('const pairs = await AsyncStorage.multiGet(getRuntimeSyncKeys());\n    if (!isSyncGenerationCurrent()) return;'));
    // 8K: страницы карточек пишет общий путь uploadFlashcardListsToPages (app/flashcards_cloud_upload.ts).
    expect(omitAt).toBeLessThan(text.indexOf('await uploadFlashcardListsToPages({'));
    expect(omitAt).toBeLessThan(text.indexOf('progressPatch[key] = value'));
    // 077deccd0: снимок пишется через writeLastSyncSnapshot (снимок + пометка владельца)
    expect(omitAt).toBeLessThan(text.indexOf('writeLastSyncSnapshot(JSON.stringify(snapshotData), uid)'));
  });

  test('forceSyncToCloud: пишет и запоминает forceData (тот же объект при выключателе false)', () => {
    const text = body('forceSyncToCloud');
    expect(text).toMatch(/omitAccountsV2LegacyDomains\(data, 'write', isAccountsV2LegacySwitchFlagOn\(\)\s*&& await resolveAccountsV2LegacySkip\('write', getAuthUserId\(\)\)\)/);
    // 8K: документ получает forceData без списков карточек (они ушли в страницы), снимок — по плану.
    expect(text).toContain('buildDocProgressWithoutFlashcardLists(forceData, flashcardUpload)');
    expect(text).toMatch(/\},\s*forceDocProgress,\s*\),/);
    expect(text).toContain('buildForceSyncSnapshot(forceData, flashcardUpload)');
  });

  test('cloud_sync зовёт выключатель ровно в трёх местах (запись, перенос, restore), всегда за синхронным флагом', () => {
    expect(source.match(/resolveAccountsV2LegacySkip\(/g)).toHaveLength(3);
    expect(source.match(/isAccountsV2LegacySwitchFlagOn\(\)\s*&& await resolveAccountsV2LegacySkip\(/g)).toHaveLength(3);
    expect(source).toContain("&& await resolveAccountsV2LegacySkip('restore', getAuthUserId());\n  assertCurrent();");
  });
});

// Пакет 8H — диагностика сценария I (E2E 2026-10-02): почему удалённая карточка «возвращается».
describe('8H — логи старой синхронизации V2-ключей', () => {
  test('restore: поле карточек в документе затеняет страницы (страницы не читаются) — лог source=doc_field', async () => {
    await __cloudSyncTestHooks.applyRestoreFromUserDoc({
      exists: true,
      data: () => ({ progress: { streak_count: '3', user_name: 'Cloud Name', flashcards_v1: JSON.stringify([{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }]) } }),
    });
    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines).toContain('[LEGACY-V2-SYNC] restore key=flashcards_v1 source=doc_field doc_len=37 pages=not_read');
    expect(mockReadPages).not.toHaveBeenCalledWith('stable-a', 'en');
    expect(await AsyncStorage.getItem('flashcards_v1')).toContain('a1');
  });

  // Пакет 8H-2: после очистки поле в документе = null → restore обязан читать страницы.
  test('restore после очистки (progress.flashcards_v1 = null) — страницы, лог source=pages', async () => {
    await __cloudSyncTestHooks.applyRestoreFromUserDoc({
      exists: true,
      data: () => ({ progress: { streak_count: '3', user_name: 'Cloud Name', flashcards_v1: null } }),
    });
    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(mockReadPages).toHaveBeenCalledWith('stable-a', 'en');
    expect(lines.some((line) => line.startsWith('[LEGACY-V2-SYNC] restore key=flashcards_v1 source=pages pages_len='))).toBe(true);
    expect(lines.some((line) => line.includes('source=doc_field'))).toBe(false);
    expect(await AsyncStorage.getItem('flashcards_v1')).toContain('cloud-en');
  });

  // Пакет 8H-2, ревью I-1: древнее progress.flashcards не должно перебивать страницы после обнуления.
  test('restore: flashcards_v1 = null + древнее flashcards + страницы → локально значение из страниц', async () => {
    await __cloudSyncTestHooks.applyRestoreFromUserDoc({
      exists: true,
      data: () => ({ progress: { streak_count: '3', flashcards_v1: null, flashcards: JSON.stringify([{ id: 'ancient' }]) } }),
    });
    const stored = await AsyncStorage.getItem('flashcards_v1');
    expect(stored).toContain('cloud-en');
    expect(stored).not.toContain('ancient');
    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines).toContain('[LEGACY-V2-SYNC] restore legacy_flashcards ignored doc_field=null pages=pages');
  });

  test('restore: flashcards_v1 = null, страниц нет, есть древнее flashcards → древнее НЕ берётся', async () => {
    const defaultImpl = mockReadPages.getMockImplementation();
    mockReadPages.mockImplementation(async () => null as unknown as string);
    try {
      await __cloudSyncTestHooks.applyRestoreFromUserDoc({
        exists: true,
        data: () => ({ progress: { streak_count: '3', flashcards_v1: null, flashcards: JSON.stringify([{ id: 'ancient' }]) } }),
      });
    } finally {
      mockReadPages.mockImplementation(defaultImpl!);
    }
    expect(await AsyncStorage.getItem('flashcards_v1')).toBeNull();
  });

  test('restore: нет flashcards_v1, нет страниц, есть древнее flashcards → берётся flashcards (прежнее поведение)', async () => {
    const defaultImpl = mockReadPages.getMockImplementation();
    mockReadPages.mockImplementation(async () => null as unknown as string);
    try {
      await __cloudSyncTestHooks.applyRestoreFromUserDoc({
        exists: true,
        data: () => ({ progress: { streak_count: '3', flashcards: JSON.stringify([{ id: 'ancient' }]) } }),
      });
    } finally {
      mockReadPages.mockImplementation(defaultImpl!);
    }
    expect(await AsyncStorage.getItem('flashcards_v1')).toContain('ancient');
    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.startsWith('[LEGACY-V2-SYNC] restore key=flashcards_v1 source=legacy_flashcards legacy_len='))).toBe(true);
  });

  test('restore: нет flashcards_v1, страницы есть, есть древнее flashcards → страницы', async () => {
    await __cloudSyncTestHooks.applyRestoreFromUserDoc({
      exists: true,
      data: () => ({ progress: { streak_count: '3', flashcards: JSON.stringify([{ id: 'ancient' }]) } }),
    });
    const stored = await AsyncStorage.getItem('flashcards_v1');
    expect(stored).toContain('cloud-en');
    expect(stored).not.toContain('ancient');
  });

  test('restore без поля в документе — страницы, лог source=pages', async () => {
    await __cloudSyncTestHooks.applyRestoreFromUserDoc({ exists: true, data: () => ({ progress: { streak_count: '3', user_name: 'Cloud Name' } }) });
    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.startsWith('[LEGACY-V2-SYNC] restore key=flashcards_v1 source=pages pages_len='))).toBe(true);
  });

  test('doSyncToCloud зовёт лог V2-ключей до записи страниц и патча', () => {
    const source = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'cloud_sync.ts'), 'utf8')).split('\r\n').join('\n');
    const body = source.slice(source.indexOf('async function doSyncToCloud('));
    const logAt = body.indexOf('logAccountsV2LegacySyncKeys(storedData, data, previousSnapshot, cloudSyncSnapshotValueMatches);');
    expect(logAt).toBeGreaterThan(0);
    expect(logAt).toBeLessThan(body.indexOf('await uploadFlashcardListsToPages({'));
  });

  test('синхронизация: решение по каждому V2-ключу — ушёл/пропущен, снимок есть/совпадает (без значений)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { logAccountsV2LegacySyncKeys } = require('../app/accounts_v2_legacy_sync_switch') as typeof import('../app/accounts_v2_legacy_sync_switch');
    logAccountsV2LegacySyncKeys(
      { flashcards_v1: '[{"id":"a2"}]', custom_flashcards_v2: '[]', user_name: 'A' },
      { user_name: 'A', custom_flashcards_v2: '[]' },
      { flashcards_v1: '[{"id":"a1"}]', custom_flashcards_v2: '[]' },
      (previous, value) => previous === value,
    );
    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines).toEqual([
      '[LEGACY-V2-SYNC] sync key=custom_flashcards_v2 decision=kept local_len=2 snapshot=has equal=true',
      '[LEGACY-V2-SYNC] sync key=flashcards_v1 decision=skip local_len=13 snapshot=has equal=false',
    ]);
    expect(lines.join(' ')).not.toContain('a2');
  });
});
