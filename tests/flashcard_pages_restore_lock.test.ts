import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeEol } from './helpers/read_source';

/*
 * Account V2, Пакет 8J — restore при ошибке чтения страниц карточек и замок записи.
 *
 * зачем: при сбое чтения restore считал «страниц нет», снимок получал «нет», и первая
 * же новая карточка перезаписывала страницы списком из одной карточки (хвост удалялся).
 * Сторож держит: ошибка → локальное не трогаем, древнее поле не берём, ключ заперт;
 * синк запертый ключ не пишет ни в страницы, ни в документ; удачное чтение снимает замок.
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
  lockFlashcardPagesWrite,
  readFlashcardPagesWriteLocks,
} from '../app/flashcard_pages_read_result';
// eslint-disable-next-line import/first
import { CARD_DELETION_JOURNAL_KEY } from '../app/flashcards/card_deletion_journal';

const ROOT = path.resolve(__dirname, '..');
const EN = 'flashcards_v1';
const FR = flashcardsSavedKey('fr');
const KEYS = [EN, FR];
const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

const ok = (value: string): ReadResult => ({ status: 'ok', value, pages: 1, cards: 1, from: 'server' });
const empty: ReadResult = { status: 'empty', from: 'server' };
const failed: ReadResult = { status: 'error', code: 'firestore/unavailable', from: 'unknown' };

let logSpy: jest.SpyInstance;
beforeEach(() => {
  storage.__reset?.();
  __resetFlashcardPagesWriteLockMemoryForTests();
  mockRead.mockReset();
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-a');
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => logSpy.mockRestore());
const lines = () => logSpy.mock.calls.map((call) => String(call[0]));
const restore = (progress: Record<string, unknown>) => __cloudSyncTestHooks.applyRestoreFromUserDoc({
  exists: true,
  data: () => ({ progress: { streak_count: '3', ...progress } }),
});
const locks = async () => [...await readFlashcardPagesWriteLocks(KEYS)].sort();

describe('8J — restore при ошибке чтения страниц', () => {
  test('ошибка чтения → локальное не тронуто, древнее поле не взято, ключ заперт', async () => {
    mockRead.mockImplementation(async (_uid, target) => (target === 'en' ? failed : empty));
    await AsyncStorage.setItem(EN, JSON.stringify([{ id: 'local-1' }, { id: 'local-2' }]));
    await restore({ [EN]: null, flashcards: JSON.stringify([{ id: 'ancient' }]) });
    const stored = await AsyncStorage.getItem(EN);
    expect(stored).toContain('local-2');
    expect(stored).not.toContain('ancient');
    expect(await locks()).toEqual([EN]);
    expect(lines()).toContain('[LEGACY-V2-SYNC] restore key=flashcards_v1 source=pages_error code=firestore/unavailable from=unknown local=untouched');
    expect(lines()).toContain('[LEGACY-V2-SYNC] restore legacy_flashcards ignored doc_field=null pages=error');
  });

  test('поля в документе нет вовсе + ошибка чтения → древнее поле всё равно не берётся', async () => {
    mockRead.mockResolvedValue(failed);
    await restore({ flashcards: JSON.stringify([{ id: 'ancient' }]) });
    expect(await AsyncStorage.getItem(EN)).toBeNull();
    expect(await locks()).toEqual([EN, FR]);
  });

  test('успешное чтение при следующем restore снимает замок и кладёт страницы', async () => {
    mockRead.mockResolvedValue(failed);
    await restore({ [EN]: null });
    expect(await locks()).toEqual([EN, FR]);
    mockRead.mockImplementation(async (_uid, target) => (target === 'en' ? ok(JSON.stringify([{ id: 'cloud-en' }])) : empty));
    await restore({ [EN]: null });
    expect(await locks()).toEqual([]);
    expect(await AsyncStorage.getItem(EN)).toContain('cloud-en');
    expect(lines().filter((line) => line.startsWith('[FLASHCARD-PAGES] write_lock cleared'))).toHaveLength(2);
  });

  test('пустой ответ сервера = empty: обычное поведение, замок снят, локальное на месте', async () => {
    mockRead.mockResolvedValue(failed);
    await restore({ [EN]: null });
    mockRead.mockResolvedValue(empty);
    await AsyncStorage.setItem(EN, JSON.stringify([{ id: 'local-1' }]));
    await restore({ [EN]: null });
    expect(await locks()).toEqual([]);
    expect(await AsyncStorage.getItem(EN)).toContain('local-1');
    expect(lines()).toContain('[LEGACY-V2-SYNC] restore key=flashcards_v1 source=none pages_len=0');
  });

  test('источник — поле документа: замок снимается (локальное становится полем)', async () => {
    mockRead.mockResolvedValue(failed);
    await restore({ [EN]: null });
    mockRead.mockResolvedValue(empty);
    await restore({ [EN]: JSON.stringify([{ id: 'doc' }]) });
    expect(await locks()).toEqual([]);
    expect(await AsyncStorage.getItem(EN)).toContain('doc');
  });
});

describe('8J — снятие замка не теряет карточки, добавленные под замком', () => {
  // зачем (S1d R2): тестовое время 1.8e12 лежит в будущем относительно настоящих часов, а время
  // правки позже now + запас теперь «неизвестно» — часы устройства фиксируем (T + 10 ч), чтобы
  // тест не зависел от реальной даты.
  let clock: jest.SpyInstance;
  beforeEach(() => { clock = jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000 + 10 * 60 * 60 * 1000); });
  afterEach(() => { clock.mockRestore(); });
  test('sticky-ветка: заперт, удачное чтение → облако + локальные-только, без удалённых человеком', async () => {
    mockRead.mockResolvedValue(failed);
    await restore({ [EN]: null });
    // под замком человек добавил карточку и удалил облачную 'gone'
    await AsyncStorage.setItem(EN, JSON.stringify([{ id: 'cloud-1' }, { id: 'local-new' }]));
    await AsyncStorage.setItem(CARD_DELETION_JOURNAL_KEY, JSON.stringify({ v: 1, e: [['en:saved:gone', 1700000000000]] }));
    mockRead.mockImplementation(async (_uid, target) => (target === 'en'
      ? ok(JSON.stringify([{ id: 'cloud-1' }, { id: 'cloud-2' }, { id: 'gone' }]))
      : empty));
    await restore({ [EN]: null });
    const stored = JSON.parse(String(await AsyncStorage.getItem(EN))) as Array<{ id: string }>;
    expect(stored.map((card) => card.id)).toEqual(['cloud-1', 'cloud-2', 'local-new']);
    expect(await locks()).toEqual([]);
    expect(lines()).toContain('[LEGACY-V2-SYNC] restore key=flashcards_v1 source=pages_merged_local cloud=2 local_only=1 deleted_skipped=1 local_unparsable=false');
  });

  test('основной путь: ключ заперт заранее → тоже объединение, а не замена', async () => {
    await lockFlashcardPagesWrite(EN, 'test');
    await AsyncStorage.setItem(EN, JSON.stringify([{ id: 'local-new' }]));
    mockRead.mockImplementation(async (_uid, target) => (target === 'en' ? ok(JSON.stringify([{ id: 'cloud-1' }])) : empty));
    await restore({ [EN]: null });
    const stored = JSON.parse(String(await AsyncStorage.getItem(EN))) as Array<{ id: string }>;
    expect(stored.map((card) => card.id)).toEqual(['cloud-1', 'local-new']);
  });

  test('незапертый ключ в основном пути — прежняя замена страницами', async () => {
    await AsyncStorage.setItem(EN, JSON.stringify([{ id: 'local-old' }]));
    mockRead.mockImplementation(async (_uid, target) => (target === 'en' ? ok(JSON.stringify([{ id: 'cloud-1' }])) : empty));
    await restore({ [EN]: null });
    expect(await AsyncStorage.getItem(EN)).not.toContain('local-old');
  });

  // зачем (S1c R2/R5): запертый ключ = АКТИВНОЕ устройство, правка под замком — единственная правда.
  // Облачная версия той же карточки без updatedAt (или в пределах запаса по часам) не должна
  // откатить правку человека: оба вызова слияния в cloud_sync.ts передают режим 'active'.
  test('sticky-ветка: правка под замком переживает restore при облачной версии без updatedAt', async () => {
    const T = 1_800_000_000_000;
    mockRead.mockResolvedValue(failed);
    await restore({ [EN]: null });
    await AsyncStorage.setItem(EN, JSON.stringify([
      { id: 'card-1', en: 'mine', updatedAt: T },
      { id: 'card-2', en: 'mine too', updatedAt: T + 60_000 },
    ]));
    mockRead.mockImplementation(async (_uid, target) => (target === 'en'
      ? ok(JSON.stringify([{ id: 'card-1', en: 'cloud' }, { id: 'card-2', en: 'cloud', updatedAt: T }]))
      : empty));
    await restore({ [EN]: null });
    const stored = JSON.parse(String(await AsyncStorage.getItem(EN))) as Array<{ id: string; en: string }>;
    expect(stored.map((card) => card.en)).toEqual(['mine', 'mine too']);
    expect(await locks()).toEqual([]);
    expect(lines()).toContain('[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=0 within_margin=1 time_unknown=1');
  });

  test('поле документа при запертом ключе: правка под замком переживает restore (облако без updatedAt)', async () => {
    mockRead.mockResolvedValue(failed);
    await restore({ [EN]: null });
    await AsyncStorage.setItem(EN, JSON.stringify([{ id: 'card-1', en: 'mine', updatedAt: 1_800_000_000_000 }]));
    mockRead.mockResolvedValue(empty);
    await restore({ [EN]: JSON.stringify([{ id: 'card-1', en: 'cloud' }]) });
    const stored = JSON.parse(String(await AsyncStorage.getItem(EN))) as Array<{ id: string; en: string }>;
    expect(stored.map((card) => card.en)).toEqual(['mine']);
    expect(lines()).toContain('[FLASHCARD-PAGES] merge_conflicts key=flashcards_v1 mode=active local_newer=0 remote_newer=0 within_margin=0 time_unknown=1');
  });

  test('sticky-ветка без замков не читает страницы вовсе', async () => {
    mockRead.mockResolvedValue(empty);
    await restore({ [EN]: null });
    mockRead.mockClear();
    await restore({ [EN]: null });
    expect(mockRead).not.toHaveBeenCalled();
  });
});

describe('8J — doSyncToCloud и restore (структура cloud_sync)', () => {
  const source = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'cloud_sync.ts'), 'utf8')).split('\r\n').join('\n');
  const bodyOf = (name: string): string => {
    const start = source.indexOf(`async function ${name}(`);
    expect(start).toBeGreaterThan(0);
    return source.slice(start, source.indexOf('\n}\n', start));
  };

  test('синк: запертый ключ не пишет страниц и не уходит в документ', () => {
    // 8K: цикл выгрузки карточек живёт в общем пути uploadFlashcardListsToPages
    // (app/flashcards_cloud_upload.ts) — его зовут и doSyncToCloud, и forceSyncToCloud.
    const helperSource = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'flashcards_cloud_upload.ts'), 'utf8')).split('\r\n').join('\n');
    const start = helperSource.indexOf('export async function uploadFlashcardListsToPages(');
    expect(start).toBeGreaterThan(0);
    const body = helperSource.slice(start, helperSource.indexOf('\n}\n', start));
    const unchangedAt = body.indexOf("if (mode === 'sync' && cloudSyncSnapshotValueMatches(previousSnapshot[key], value)) {");
    const readLocksAt = body.indexOf('const locks = await deps.readLocks(keys);');
    const lockedAt = body.indexOf('if (locks.has(key)) {');
    expect(readLocksAt).toBeGreaterThan(0);
    expect(lockedAt).toBeGreaterThan(readLocksAt);
    expect(lockedAt).toBeLessThan(unchangedAt);
    expect(lockedAt).toBeLessThan(body.indexOf('const pagesWritten = await deps.writePages('));
    const branch = body.slice(lockedAt, unchangedAt);
    // offloaded → ключ выкинут и из патча документа; continue → до записи страниц не доходит
    expect(branch).toContain('offloaded.add(key);');
    expect(branch).toContain('lockedNow.add(key);');
    expect(branch).toContain('continue;');
    expect(branch).not.toContain('clearDocField');
    // doSyncToCloud берёт множества из плана общего пути
    const sync = bodyOf('doSyncToCloud');
    expect(sync).toContain('const offloadedFlashcardKeys = flashcardUpload.offloaded;');
    expect(sync).toContain('const flashcardKeysLockedNow = flashcardUpload.lockedNow;');
  });

  test('синк: снимок не запоминает значение запертого ключа как отправленное', () => {
    const body = bodyOf('doSyncToCloud');
    const restoreAt = body.indexOf('for (const key of flashcardKeysLockedNow) {');
    expect(restoreAt).toBeGreaterThan(body.indexOf('if (!wrote) return;'));
    expect(restoreAt).toBeLessThan(body.indexOf('writeLastSyncSnapshot(JSON.stringify(snapshotData)'));
    expect(body.slice(restoreAt, restoreAt + 220)).toContain('snapshotData[key] = previousSnapshot[key];');
  });

  test('restore: замок снимается только ПОСЛЕ записи pairs в хранилище (обе ветки)', () => {
    // зачем (11.10): тело восстановления живёт в applyRestoreFromUserDocTraced (обёртка applyRestoreFromUserDoc —
    // только трасса времени); раньше сторож смотрел в обёртку и молча не видел структуры.
    const body = bodyOf('applyRestoreFromUserDocTraced');
    const mainUnlockAt = body.indexOf('await unlockFlashcardPagesAfterRestore(flashcardPagesRestore.unlockKeys, assertCurrent);');
    expect(mainUnlockAt).toBeGreaterThan(body.lastIndexOf('await applyPersonalPlanRestorePairs(appliedPairs);'));
    const stickyUnlockAt = body.indexOf('if (stickyFlashcardPages) await unlockFlashcardPagesAfterRestore(stickyFlashcardPages.unlockKeys, assertCurrent);');
    expect(stickyUnlockAt).toBeGreaterThan(body.indexOf('await applyPersonalPlanRestorePairs(stickyPairs);'));
    // помощник сам замок не снимает — только запирает
    const helper = bodyOf('restoreFlashcardPagesForKeys');
    expect(helper).toContain("await lockFlashcardPagesWrite(key, `read_error_${pagesRead.code}`);");
    expect(helper).not.toContain('unlockFlashcardPagesWrite(');
  });

  test('sticky-ветка перечитывает ТОЛЬКО запертые ключи', () => {
    // зачем (11.10): тело восстановления живёт в applyRestoreFromUserDocTraced (обёртка applyRestoreFromUserDoc —
    // только трасса времени); раньше сторож смотрел в обёртку и молча не видел структуры.
    const body = bodyOf('applyRestoreFromUserDocTraced');
    expect(body).toContain('const stickyFlashcardPages = stickyFlashcardLocks.size > 0');
    expect(body).toContain('(key) => stickyFlashcardLocks.has(key)');
  });
});
