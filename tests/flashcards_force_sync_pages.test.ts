import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Account V2, Пакет 8K — forceSyncToCloud (перенос при смене устройства) не кладёт список
 * карточек в документ users/{id} и уважает замок 8J.
 *
 * зачем: forceSyncToCloud писал progress.flashcards_v1 ЦЕЛИКОМ в документ и тем самым
 * заново создавал затеняющую копию (8H/8H-2): restore на другом устройстве брал её вместо
 * страниц, удалённые карточки «возвращались», новые пропадали. Теперь обычный и
 * принудительный синк идут через ОДИН путь выгрузки (uploadFlashcardListsToPages):
 * страницы → поле документа null; сбой страниц → список в документ как раньше; запертый
 * ключ не пишется никуда.
 */

type ReadResult =
  | { status: 'ok'; value: string; pages: number; cards: number; from: 'server' }
  | { status: 'empty'; from: 'server' }
  | { status: 'error'; code: string; from: 'server' | 'cache' | 'unknown' };
const mockRead = jest.fn<Promise<ReadResult>, [string, string]>();

jest.mock('../app/user_id_policy', () => ({
  getAuthUserId: jest.fn(() => 'auth-a'),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));
jest.mock('../app/flashcard_pages_read_result', () => ({
  ...jest.requireActual('../app/flashcard_pages_read_result'),
  readFlashcardPagesResult: (uid: string, target: string) => mockRead(uid, target),
}));

// eslint-disable-next-line import/first
import { __cloudSyncTestHooks } from '../app/cloud_sync';
// eslint-disable-next-line import/first
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
// eslint-disable-next-line import/first
import { flashcardsSavedKey } from '../app/target_storage_keys';
// eslint-disable-next-line import/first
import {
  __resetFlashcardPagesWriteLockMemoryForTests,
  FLASHCARD_PAGES_WRITE_LOCK_KEY,
  lockFlashcardPagesWrite,
  readFlashcardPagesWriteLocks,
  unlockFlashcardPagesWrite,
} from '../app/flashcard_pages_read_result';
// eslint-disable-next-line import/first
import {
  buildDocProgressWithoutFlashcardLists,
  buildForceSyncSnapshot,
  runForceFlashcardUpload,
  uploadFlashcardListsToPages,
  type FlashcardCloudUploadDeps,
} from '../app/flashcards_cloud_upload';
// eslint-disable-next-line import/first
import { flashcardDocFieldClearedMarkerKey } from '../app/flashcards_doc_field_clear';

const ROOT = path.resolve(__dirname, '..');
const EN = 'flashcards_v1';
const FR = flashcardsSavedKey('fr');
const EN_LIST = JSON.stringify([{ id: 'c1' }, { id: 'c2' }]);
const FR_LIST = JSON.stringify([{ id: 'f1' }]);
const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

const writePages = jest.fn<Promise<number | null>, [string, string, string]>();
const deps = (): FlashcardCloudUploadDeps => ({
  writePages: (uid, target, json) => writePages(uid, target, json),
  readLocks: readFlashcardPagesWriteLocks,
});

let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  storage.__reset?.();
  __resetFlashcardPagesWriteLockMemoryForTests();
  mockRead.mockReset();
  writePages.mockReset();
  writePages.mockResolvedValue(1);
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-a');
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
});
const lines = () => [...logSpy.mock.calls, ...warnSpy.mock.calls].map((call) => String(call[0]));

const forceData = (): Record<string, string | null> => ({ streak_count: '3', [EN]: EN_LIST, [FR]: FR_LIST });
const force = (data: Record<string, string | null>, isCurrent: () => boolean = () => true) =>
  uploadFlashcardListsToPages({ uid: 'stable-a', data, previousSnapshot: {}, mode: 'force', isCurrent, deps: deps() });

describe('8K — принудительная выгрузка карточек', () => {
  test('force sync пишет страницы и null в документ (списка в документе нет)', async () => {
    const data = forceData();
    const plan = await force(data);
    expect(plan).not.toBeNull();
    expect(writePages).toHaveBeenCalledWith('stable-a', 'en', EN_LIST);
    expect(writePages).toHaveBeenCalledWith('stable-a', 'fr', FR_LIST);
    const doc = buildDocProgressWithoutFlashcardLists(data, plan!);
    expect(doc).toEqual({ streak_count: '3', [EN]: null, [FR]: null });
    // вход не мутируется
    expect(data[EN]).toBe(EN_LIST);
    expect(lines()).toContain('[LEGACY-V2-SYNC] force_sync key=flashcards_v1 decision=pages pages=1');
    // снимок помнит маркер «поле обнулено» — следующий обычный синк null не повторит
    const snapshot = buildForceSyncSnapshot(data, plan!);
    expect(snapshot[flashcardDocFieldClearedMarkerKey(EN)]).toBe('1');
    expect(snapshot[EN]).toBe(EN_LIST);
  });

  test('сбой страниц → список уезжает в документ как раньше, маркера нет', async () => {
    writePages.mockImplementation(async (_uid, target) => (target === 'en' ? null : 1));
    const data = forceData();
    const plan = await force(data);
    const doc = buildDocProgressWithoutFlashcardLists(data, plan!);
    expect(doc[EN]).toBe(EN_LIST);
    expect(doc[FR]).toBeNull();
    expect(lines()).toContain('[LEGACY-V2-SYNC] force_sync key=flashcards_v1 decision=doc_fallback pages=failed');
    const snapshot = buildForceSyncSnapshot(data, plan!);
    expect(snapshot[flashcardDocFieldClearedMarkerKey(EN)]).toBeUndefined();
    expect(snapshot[flashcardDocFieldClearedMarkerKey(FR)]).toBe('1');
  });

  test('запертый ключ не пишется ни в страницы, ни в документ, и не запоминается в снимке', async () => {
    await lockFlashcardPagesWrite(EN, 'read_error_test');
    const data = forceData();
    const plan = await force(data);
    expect(writePages).not.toHaveBeenCalledWith('stable-a', 'en', expect.anything());
    expect(writePages).toHaveBeenCalledWith('stable-a', 'fr', FR_LIST);
    const doc = buildDocProgressWithoutFlashcardLists(data, plan!);
    expect(Object.prototype.hasOwnProperty.call(doc, EN)).toBe(false);
    const snapshot = buildForceSyncSnapshot(data, plan!);
    expect(Object.prototype.hasOwnProperty.call(snapshot, EN)).toBe(false);
    expect(lines()).toContain(`[LEGACY-V2-SYNC] force_sync pages_write_skipped key=flashcards_v1 reason=pages_unconfirmed local_len=${EN_LIST.length}`);
    expect(lines()).toContain('[LEGACY-V2-SYNC] force_sync key=flashcards_v1 decision=locked result=refuse');
  });

  test('испорченный замок запирает всё, unlock его чинит — после этого запись идёт', async () => {
    await AsyncStorage.setItem(FLASHCARD_PAGES_WRITE_LOCK_KEY, '{not json');
    const lockedPlan = await force(forceData());
    expect(writePages).not.toHaveBeenCalled();
    expect([...lockedPlan!.lockedNow].sort()).toEqual([EN, FR].sort());

    await unlockFlashcardPagesWrite(EN, 'read_ok');
    expect(lines().some((entry) => entry.includes('lock_value_repaired'))).toBe(true);

    const plan = await force(forceData());
    expect(plan!.lockedNow.size).toBe(0);
    expect(writePages).toHaveBeenCalledWith('stable-a', 'en', EN_LIST);
  });

  test('force не доверяет снимку: пишет страницы и null даже при совпавшем значении и маркере', async () => {
    const data = forceData();
    const plan = await uploadFlashcardListsToPages({
      uid: 'stable-a',
      data,
      previousSnapshot: { [EN]: EN_LIST, [flashcardDocFieldClearedMarkerKey(EN)]: '1' },
      mode: 'force',
      isCurrent: () => true,
      deps: deps(),
    });
    expect(writePages).toHaveBeenCalledWith('stable-a', 'en', EN_LIST);
    expect(plan!.clearDocField.has(EN)).toBe(true);
  });

  test('обычный синк (sync) сохраняет прежнее поведение 8H-2: совпало — не пишет, маркер — без повторного null', async () => {
    const data = forceData();
    const plan = await uploadFlashcardListsToPages({
      uid: 'stable-a',
      data,
      previousSnapshot: { [EN]: EN_LIST, [flashcardDocFieldClearedMarkerKey(FR)]: '1' },
      mode: 'sync',
      isCurrent: () => true,
      deps: deps(),
    });
    expect(writePages).not.toHaveBeenCalledWith('stable-a', 'en', expect.anything());
    expect(plan!.offloaded.has(EN)).toBe(true);
    expect(plan!.clearDocField.has(EN)).toBe(false);
    expect(plan!.offloaded.has(FR)).toBe(true);
    expect(plan!.clearDocField.has(FR)).toBe(false);
    expect(lines()).toContain(`[LEGACY-V2-SYNC] doc_field_clear_skipped key=${FR} reason=already_cleared`);
  });

  test('сменился аккаунт во время записи страниц → null (запись документа не идёт)', async () => {
    let current = true;
    writePages.mockImplementation(async () => { current = false; return 1; });
    expect(await force(forceData(), () => current)).toBeNull();
  });
});

describe('8K ревью — отказы принудительного переноса (C-1, C-2)', () => {
  const run = (timeoutMs = 1_000) => runForceFlashcardUpload({
    uid: 'stable-a', data: forceData(), isCurrent: () => true, timeoutMs, deps: deps(),
  });

  test('C-1: запись страниц висит → отказ pages_timeout в пределах потолка', async () => {
    writePages.mockImplementation(() => new Promise<number | null>(() => undefined));
    const started = Date.now();
    const outcome = await run(40);
    expect(outcome).toEqual({ ok: false, reason: 'pages_timeout' });
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(lines().some((entry) => entry.startsWith('[LEGACY-V2-SYNC] force_sync aborted reason=pages_timeout'))).toBe(true);
  });

  test('C-2: запертый ключ → отказ всего переноса, список не уходит никуда', async () => {
    await lockFlashcardPagesWrite(EN, 'read_error_test');
    const outcome = await run();
    expect(outcome).toEqual({ ok: false, reason: 'pages_locked' });
    expect(writePages).not.toHaveBeenCalledWith('stable-a', 'en', expect.anything());
    expect(lines()).toContain('[LEGACY-V2-SYNC] force_sync key=flashcards_v1 decision=locked result=refuse');
    expect(lines()).toContain('[LEGACY-V2-SYNC] force_sync aborted reason=pages_locked keys=flashcards_v1 result=refuse');
  });

  test('без замка и зависаний → ok с планом (страницы и null)', async () => {
    const outcome = await run();
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect([...outcome.plan.clearDocField].sort()).toEqual([EN, FR].sort());
  });

  test('сбой выгрузки (исключение) → отказ upload_error, без падения', async () => {
    writePages.mockRejectedValue(new Error('boom'));
    expect(await run()).toEqual({ ok: false, reason: 'upload_error' });
  });

  test('смена аккаунта во время выгрузки → отказ stale_generation', async () => {
    let current = true;
    writePages.mockImplementation(async () => { current = false; return 1; });
    const outcome = await runForceFlashcardUpload({
      uid: 'stable-a', data: forceData(), isCurrent: () => current, timeoutMs: 1_000, deps: deps(),
    });
    expect(outcome).toEqual({ ok: false, reason: 'stale_generation' });
  });
});

describe('8K — restore после force sync на другом устройстве читает страницы', () => {
  test('документ после force (поле null) → restore берёт страницы, древнее поле игнорирует', async () => {
    const data = forceData();
    const plan = await force(data);
    const docProgress = buildDocProgressWithoutFlashcardLists(data, plan!);
    // «другое устройство»: локально пусто
    storage.__reset?.();
    __resetFlashcardPagesWriteLockMemoryForTests();
    mockRead.mockImplementation(async (_uid, target) => (target === 'en'
      ? { status: 'ok', value: EN_LIST, pages: 1, cards: 2, from: 'server' }
      : { status: 'ok', value: FR_LIST, pages: 1, cards: 1, from: 'server' }));
    await __cloudSyncTestHooks.applyRestoreFromUserDoc({
      exists: true,
      data: () => ({ progress: { ...docProgress, flashcards: JSON.stringify([{ id: 'ancient' }]) } }),
    });
    expect(mockRead).toHaveBeenCalledWith('stable-a', 'en');
    expect(await AsyncStorage.getItem(EN)).toBe(EN_LIST);
    expect(await AsyncStorage.getItem(FR)).toBe(FR_LIST);
  });
});

describe('8K — встройка в cloud_sync (единый путь выгрузки)', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'cloud_sync.ts'), 'utf8').split('\r\n').join('\n');
  const bodyOf = (name: string): string => {
    const start = source.indexOf(`async function ${name}(`);
    expect(start).toBeGreaterThan(0);
    return source.slice(start, source.indexOf('\n}\n', start));
  };

  test('cloud_sync не пишет страницы в обход общего пути', () => {
    expect(source.match(/writeFlashcardPages\(/g)).toBeNull();
    expect(source.match(/uploadFlashcardListsToPages\(/g)).toHaveLength(1);
    expect(source.match(/runForceFlashcardUpload\(/g)).toHaveLength(1);
  });

  test('forceSyncToCloud: выгрузка карточек ДО записи документа, документ без списка, снимок по плану', () => {
    const body = bodyOf('forceSyncToCloud');
    const omitAt = body.indexOf("const forceData = omitAccountsV2LegacyDomains(data, 'write'");
    const uploadAt = body.indexOf('await runForceFlashcardUpload({');
    const writeAt = body.indexOf('writeUserDocWithNestedProgress(');
    expect(omitAt).toBeGreaterThan(0);
    expect(uploadAt).toBeGreaterThan(omitAt);
    expect(writeAt).toBeGreaterThan(uploadAt);
    // C-1: тот же потолок, что у записи документа
    expect(body.slice(uploadAt, uploadAt + 300)).toContain('timeoutMs: FORCE_SYNC_FIRESTORE_WRITE_MS,');
    // C-1/C-2: любой отказ выгрузки → false ДО записи документа
    const refuseAt = body.indexOf('if (!flashcardOutcome.ok) {');
    expect(refuseAt).toBeGreaterThan(uploadAt);
    expect(refuseAt).toBeLessThan(writeAt);
    const refuse = body.slice(refuseAt, body.indexOf('const flashcardUpload = flashcardOutcome.plan;', refuseAt));
    // зачем (S2d, ebc1a860d): отказ теперь возвращается через refuse(код) — тот же false, но с
    // понятным кодом причины для UI; смысл прежний: выгрузка карточек не удалась → отказ.
    expect(refuse).toContain("return refuse('flashcards_upload_failed');");
    const refuseHelper = body.slice(body.indexOf('const refuse = (code: ForceSyncRefusalCode): false => {'));
    expect(refuseHelper.slice(0, 300)).toContain('return false;');
    expect(refuse).not.toContain('writeUserDocWithNestedProgress');
    expect(body).toContain('const forceDocProgress = buildDocProgressWithoutFlashcardLists(forceData, flashcardUpload);');
    expect(body).toMatch(/\},\s*forceDocProgress,\s*\),/);
    expect(body).toContain('buildForceSyncSnapshot(forceData, flashcardUpload)');
  });

  test('doSyncToCloud зовёт тот же путь в режиме sync', () => {
    const body = bodyOf('doSyncToCloud');
    const uploadAt = body.indexOf('await uploadFlashcardListsToPages({');
    expect(uploadAt).toBeGreaterThan(0);
    expect(body.slice(uploadAt, uploadAt + 300)).toContain("mode: 'sync'");
  });
});
