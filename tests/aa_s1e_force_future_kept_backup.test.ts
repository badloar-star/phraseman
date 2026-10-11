import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeEol } from './helpers/read_source';

/*
 * Account Authority 2.0, этап S1e — силовой перенос перед сменой аккаунта не теряет локальную
 * правку карточки, когда в облаке лежит её версия «из будущего» (спешат часы ДРУГОГО устройства).
 *
 * До S1e: runForceFlashcardUpload (S1d, keepRemoteFromFuture) оставлял в страницах облачную версию,
 * локальная в облако не уходила, а смена аккаунта стирала телефон. Аварийная копия
 * (final_account_snapshot_before_switch) содержала весь список, но при возврате в аккаунт облачный
 * restore уже клал список, и копия его НЕ доливала (доливаются только отсутствующие ключи) —
 * локальная правка пропадала.
 *
 * S1e (вариант Б ревью): локальные версии ЭТИХ карточек кладутся в отдельный ключ аккаунта
 * (flashcards_force_future_kept_local_v1). Ключ принадлежит аккаунту → попадает в ту же аварийную
 * копию того же владельца и стирается вместе с аккаунтом; при возврате копия доливает его (ключа
 * после облачного restore нет), а шаг «после копии» возвращает версии в локальный список — только
 * если на телефоне всё ещё лежит та самая облачная версия (правку после возврата не трогаем).
 * Прежняя копия того же владельца со своим ключом не затирается — записи объединяются.
 *
 * Firestore подменён фейком на уровне rnfbInstance — путь writeFlashcardPages настоящий.
 */

type PageDoc = { id: string; data: Record<string, unknown> };
const mockRemote: { pages: PageDoc[] } = { pages: [] };

jest.mock('../app/rnfb_modular', () => {
  const col = {
    get: async () => {
      const pages = [...mockRemote.pages];
      return {
        empty: pages.length === 0,
        size: pages.length,
        metadata: { fromCache: false },
        forEach: (cb: (doc: { id: string; data: () => Record<string, unknown> }) => void) =>
          pages.forEach((page) => cb({ id: page.id, data: () => page.data })),
      };
    },
    doc: (id: string) => ({ id }),
  };
  const db = {
    collection: () => ({ doc: () => ({ collection: () => col }) }),
    batch: () => {
      const sets = new Map<string, Record<string, unknown>>();
      const deletes: string[] = [];
      return {
        set: (ref: { id: string }, data: Record<string, unknown>) => { sets.set(ref.id, data); },
        delete: (ref: { id: string }) => { deletes.push(ref.id); },
        commit: async () => {
          const kept = mockRemote.pages.filter((page) => !deletes.includes(page.id) && !sets.has(page.id));
          mockRemote.pages = [...kept, ...[...sets].map(([id, data]) => ({ id, data }))];
        },
      };
    },
  };
  return { rnfbInstance: () => db, __esModule: true, default: () => null };
});
jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: jest.fn(() => null),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));

// eslint-disable-next-line import/first
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
// eslint-disable-next-line import/first
import { restoreAccountSwitchEmergencyBackupIfSafe } from '../app/account_switch_backup_restore';
// eslint-disable-next-line import/first
import { accountOwnedStorageKeysFrom, saveAccountSwitchEmergencyBackup, SYNC_KEYS, wipeLocalAccountData } from '../app/cloud_sync';
// eslint-disable-next-line import/first
import {
  DEFAULT_PRE_WRITE_STORE,
  __resetFlashcardPagesWriteLockMemoryForTests,
  mergeLockedFlashcardsWithPages,
  readFlashcardPagesWriteLocks,
} from '../app/flashcard_pages_read_result';
// eslint-disable-next-line import/first
import { writeFlashcardPages } from '../app/flashcards_cloud_pages';
// eslint-disable-next-line import/first
import { runForceFlashcardUpload, type FlashcardCloudUploadDeps } from '../app/flashcards_cloud_upload';
// eslint-disable-next-line import/first
import {
  FLASHCARD_FUTURE_KEPT_STASH_KEY,
  applyFutureKeptStashAfterReturn,
  stashForceFutureKeptLocalVersions,
} from '../app/flashcards_future_kept_stash';
// eslint-disable-next-line import/first
import { __resetCardDeletionJournalQueueForTests } from '../app/flashcards/card_deletion_journal';
// eslint-disable-next-line import/first
import { __resetFlashcardCacheForTests, loadFlashcards } from '../hooks/use-flashcards';

const ROOT = path.resolve(__dirname, '..');
const EN = 'flashcards_v1';
const OWNER = 'stable-a';
const T = 1_800_000_000_000;
const H = 60 * 60 * 1000;
const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

type Card = { id: string; en: string; ru: string; uk: string; updatedAt?: number };
const card = (id: string, ru: string, updatedAt?: number): Card => ({
  id, en: `phrase ${id}`, ru, uk: `фраза ${id}`, ...(updatedAt === undefined ? {} : { updatedAt }),
});

function setRemote(cards: unknown[]): void {
  mockRemote.pages = [{ id: 'en_0000', data: { target: 'en', index: 0, count: cards.length, cards: JSON.stringify(cards) } }];
}
function remoteCards(): Card[] {
  return mockRemote.pages.flatMap((page) => JSON.parse(String(page.data.cards)) as Card[]);
}
async function localCard(id: string): Promise<Card | undefined> {
  const raw = await AsyncStorage.getItem(EN);
  return raw ? (JSON.parse(raw) as Card[]).find((c) => c.id === id) : undefined;
}
const deps = (): FlashcardCloudUploadDeps => ({
  writePages: writeFlashcardPages,
  readLocks: readFlashcardPagesWriteLocks,
  preWriteStore: DEFAULT_PRE_WRITE_STORE,
});
async function forceUpload(localCards: Card[]) {
  const json = JSON.stringify(localCards);
  await AsyncStorage.setItem(EN, json);
  return runForceFlashcardUpload({ uid: OWNER, data: { [EN]: json }, isCurrent: () => true, timeoutMs: 10_000, deps: deps() });
}
/** Возврат в аккаунт: облачный restore кладёт список из страниц (S1e: до доливания копии). */
async function cloudRestoreFromPages(): Promise<void> {
  // Вход в аккаунт снова — новое поколение того же владельца.
  __resetAccountGenerationForTests();
  beginAccountGeneration(OWNER);
  await AsyncStorage.setItem(EN, JSON.stringify(remoteCards()));
  __resetFlashcardCacheForTests();
}

let clock: jest.SpyInstance;
let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  storage.__reset?.();
  mockRemote.pages = [];
  __resetFlashcardPagesWriteLockMemoryForTests();
  __resetCardDeletionJournalQueueForTests();
  __resetFlashcardCacheForTests();
  __resetAccountGenerationForTests();
  beginAccountGeneration(OWNER);
  // Часы ЭТОГО телефона — T + 10 ч; другое устройство спешит и подписало правку T + 13 ч.
  clock = jest.spyOn(Date, 'now').mockReturnValue(T + 10 * H);
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  clock.mockRestore();
  logSpy.mockRestore();
  warnSpy.mockRestore();
});
const lines = () => [...logSpy.mock.calls, ...warnSpy.mock.calls].map((call) => String(call[0]));
const stashLines = () => lines().filter((line) => line.startsWith('[FLASHCARD-FUTURE-STASH]'));

describe('S1e — облачная версия «из будущего» при силовом переносе', () => {
  test('слияние отдаёт локальные версии оставленных облачных карточек (их надо сохранить)', () => {
    const out = mergeLockedFlashcardsWithPages(
      JSON.stringify([card('secret-1', 'моё', T + 9 * H)]),
      JSON.stringify([card('secret-1', 'облако-будущее', T + 13 * H)]),
      new Set(), EN, { mode: 'active', target: 'en', now: T + 10 * H, keepRemoteFromFuture: true },
    );
    expect(out.remoteFutureKept).toBe(1);
    expect(out.remoteFutureKeptPairs).toHaveLength(1);
    expect((out.remoteFutureKeptPairs[0].local as Card).ru).toBe('моё');
    expect((out.remoteFutureKeptPairs[0].remote as Card).ru).toBe('облако-будущее');
  });

  test('другой девайс со спешащими часами + смена аккаунта → правка в копии и возвращается при возврате', async () => {
    setRemote([card('secret-1', 'облако-будущее', T + 13 * H), card('b', 'b')]);

    const outcome = await forceUpload([card('secret-1', 'моё', T + 9 * H), card('b', 'b')]);

    // Перенос не блокируется: успех, в страницах облачная (S1d), но локальная версия — в плане.
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(remoteCards().find((c) => c.id === 'secret-1')?.ru).toBe('облако-будущее');
    expect(outcome.plan.remoteFutureKept).toHaveLength(1);
    expect(outcome.plan.remoteFutureKept[0]).toMatchObject({ key: EN, target: 'en' });
    expect(outcome.plan.remoteFutureKept[0].versions).toHaveLength(1);

    await expect(stashForceFutureKeptLocalVersions(OWNER, outcome.plan.remoteFutureKept)).resolves.toBe(true);
    expect(await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY)).not.toBeNull();

    // Смена аккаунта: финальная аварийная копия того же владельца, затем стирание.
    await expect(saveAccountSwitchEmergencyBackup('final_account_snapshot_before_switch', OWNER)).resolves.toBe(true);
    await wipeLocalAccountData();
    expect(await AsyncStorage.getItem(EN)).toBeNull();
    expect(await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY)).toBeNull();

    // Возврат в аккаунт: облачный restore, затем доливание копии.
    await cloudRestoreFromPages();
    const restored = await restoreAccountSwitchEmergencyBackupIfSafe();
    expect(restored.status).toBe('restored');
    // Без S1e здесь правка терялась: список уже есть (облачный), копия его не доливает.
    expect((await localCard('secret-1'))?.ru).toBe('облако-будущее');
    expect(await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY)).not.toBeNull();

    const applied = await applyFutureKeptStashAfterReturn(OWNER);

    expect(applied).toMatchObject({ status: 'applied', replaced: 1, kept: 0 });
    expect((await localCard('secret-1'))?.ru).toBe('моё');
    expect((await loadFlashcards('en')).find((c) => c.id === 'secret-1')?.ru).toBe('моё');
    expect(await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY)).toBeNull();
    // Логи — только числа: ни id карточки, ни текста, ни владельца.
    expect(stashLines()).toContain('[FLASHCARD-FUTURE-STASH] stash saved cards=1 lists=1 total=1');
    expect(stashLines()).toContain('[FLASHCARD-FUTURE-STASH] apply target=en replaced=1 already=0 changed_since=0 missing=0 result=ok');
    for (const line of stashLines()) {
      expect(line).not.toContain('secret-1');
      expect(line).not.toContain('моё');
      expect(line).not.toContain(OWNER);
    }
  });

  test('нет облачной «из будущего» → план пуст, ключ не пишется, поведение прежнее', async () => {
    setRemote([card('a', 'облако', T)]);

    const outcome = await forceUpload([card('a', 'моё', T + 2 * H)]);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.plan.remoteFutureKept).toEqual([]);
    await expect(stashForceFutureKeptLocalVersions(OWNER, outcome.plan.remoteFutureKept)).resolves.toBe(true);
    expect(await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY)).toBeNull();
    expect(stashLines()).toContain('[FLASHCARD-FUTURE-STASH] stash skip reason=nothing_kept');
    expect(remoteCards()[0].ru).toBe('моё');
  });

  test('страницы не записались (список ушёл в документ) → версии не сохраняются: они уже в облаке', async () => {
    setRemote([card('secret-1', 'облако-будущее', T + 13 * H)]);
    const failingDeps: FlashcardCloudUploadDeps = {
      ...deps(),
      writePages: async (uid, target, json, preWrite) => {
        await writeFlashcardPages(uid, target, json, preWrite);
        return null;
      },
    };
    const json = JSON.stringify([card('secret-1', 'моё', T + 9 * H)]);
    const outcome = await runForceFlashcardUpload({ uid: OWNER, data: { [EN]: json }, isCurrent: () => true, timeoutMs: 10_000, deps: failingDeps });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.plan.sentToDoc.has(EN)).toBe(true);
    expect(outcome.plan.remoteFutureKept).toEqual([]);
  });

  test('прежняя копия того же владельца со своим ключом не затирается — записи объединяются', async () => {
    // Первая смена: карточка secret-1 оставлена облачной, её локальная версия ушла в копию.
    setRemote([card('secret-1', 'облако-будущее', T + 13 * H)]);
    const first = await forceUpload([card('secret-1', 'моё-1', T + 9 * H)]);
    if (!first.ok) throw new Error(first.reason);
    await stashForceFutureKeptLocalVersions(OWNER, first.plan.remoteFutureKept);
    await saveAccountSwitchEmergencyBackup('final_account_snapshot_before_switch', OWNER);
    await wipeLocalAccountData();

    // Копия ещё не долита (вход не дошёл до шага копии), а у того же владельца новая смена
    // с другой карточкой «из будущего». Живого ключа на телефоне нет — он только в копии.
    setRemote([card('secret-1', 'облако-будущее', T + 13 * H), card('secret-2', 'облако-2', T + 14 * H)]);
    const second = await forceUpload([card('secret-1', 'облако-будущее', T + 13 * H), card('secret-2', 'моё-2', T + 9 * H)]);
    if (!second.ok) throw new Error(second.reason);
    await stashForceFutureKeptLocalVersions(OWNER, second.plan.remoteFutureKept);
    await saveAccountSwitchEmergencyBackup('final_account_snapshot_before_switch', OWNER);
    await wipeLocalAccountData();

    await cloudRestoreFromPages();
    await restoreAccountSwitchEmergencyBackupIfSafe();
    const applied = await applyFutureKeptStashAfterReturn(OWNER);

    expect(applied).toMatchObject({ status: 'applied', replaced: 2 });
    expect((await localCard('secret-1'))?.ru).toBe('моё-1');
    expect((await localCard('secret-2'))?.ru).toBe('моё-2');
    expect(stashLines()).toContain('[FLASHCARD-FUTURE-STASH] backup carry from_previous_copy=1 total=2');
  });

  test('правка после возврата (карточка уже не та облачная) не перезаписывается', async () => {
    setRemote([card('secret-1', 'облако-будущее', T + 13 * H)]);
    const outcome = await forceUpload([card('secret-1', 'моё', T + 9 * H)]);
    if (!outcome.ok) throw new Error(outcome.reason);
    await stashForceFutureKeptLocalVersions(OWNER, outcome.plan.remoteFutureKept);
    // Человек вернулся и уже поправил карточку (другое время правки).
    await AsyncStorage.setItem(EN, JSON.stringify([card('secret-1', 'новая-правка', T + 15 * H)]));
    __resetFlashcardCacheForTests();

    const applied = await applyFutureKeptStashAfterReturn(OWNER);

    expect(applied).toMatchObject({ status: 'applied', replaced: 0 });
    expect((await localCard('secret-1'))?.ru).toBe('новая-правка');
    expect(stashLines()).toContain('[FLASHCARD-FUTURE-STASH] apply target=en replaced=0 already=0 changed_since=1 missing=0 result=ok');
    expect(await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY)).toBeNull();
  });

  test('записи другого владельца не применяются и не теряются', async () => {
    setRemote([card('secret-1', 'облако-будущее', T + 13 * H)]);
    const outcome = await forceUpload([card('secret-1', 'моё', T + 9 * H)]);
    if (!outcome.ok) throw new Error(outcome.reason);
    await stashForceFutureKeptLocalVersions('stable-other', outcome.plan.remoteFutureKept);
    await cloudRestoreFromPages();

    const applied = await applyFutureKeptStashAfterReturn(OWNER);

    expect(applied).toMatchObject({ status: 'no_own_entries', replaced: 0, kept: 1 });
    expect((await localCard('secret-1'))?.ru).toBe('облако-будущее');
    expect(await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY)).not.toBeNull();
  });

  test('сбой записи ключа → false (перенос откажет, данные на телефоне целы), причина в логе', async () => {
    setRemote([card('secret-1', 'облако-будущее', T + 13 * H)]);
    const outcome = await forceUpload([card('secret-1', 'моё', T + 9 * H)]);
    if (!outcome.ok) throw new Error(outcome.reason);
    const setItem = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    try {
      await expect(stashForceFutureKeptLocalVersions(OWNER, outcome.plan.remoteFutureKept)).resolves.toBe(false);
    } finally {
      setItem.mockRestore();
    }
    expect(stashLines().some((line) => line.startsWith('[FLASHCARD-FUTURE-STASH] stash write_failed cards=1'))).toBe(true);
  });

  test('ключ — данные аккаунта: в инвентаре (копия/стирание), в старое облако не уходит', () => {
    expect(accountOwnedStorageKeysFrom([])).toContain(FLASHCARD_FUTURE_KEPT_STASH_KEY);
    expect(SYNC_KEYS as readonly string[]).not.toContain(FLASHCARD_FUTURE_KEPT_STASH_KEY);
  });
});

describe('S1e — встройка (cloud_sync, auth_provider)', () => {
  const read = (file: string): string => normalizeEol(fs.readFileSync(path.join(ROOT, 'app', file), 'utf8')).split('\r\n').join('\n');
  const bodyOf = (source: string, name: string): string => {
    const start = source.indexOf(`async function ${name}(`);
    expect(start).toBeGreaterThan(0);
    return source.slice(start, source.indexOf('\n}\n', start));
  };

  test('forceSyncToCloud: версии сохраняются после выгрузки карточек и ДО записи документа; сбой → отказ', () => {
    const body = bodyOf(read('cloud_sync.ts'), 'forceSyncToCloud');
    const planAt = body.indexOf('const flashcardUpload = flashcardOutcome.plan;');
    const stashAt = body.indexOf('await stashForceFutureKeptLocalVersions(uid, flashcardUpload.remoteFutureKept)');
    const writeAt = body.indexOf('writeUserDocWithNestedProgress(');
    expect(planAt).toBeGreaterThan(0);
    expect(stashAt).toBeGreaterThan(planAt);
    expect(writeAt).toBeGreaterThan(stashAt);
    const refusal = body.slice(stashAt, writeAt);
    expect(refusal).toContain("return refuse('flashcards_upload_failed');");
  });

  test('saveAccountSwitchEmergencyBackup подхватывает ключ из прежней копии ТОГО ЖЕ владельца', () => {
    const body = bodyOf(read('cloud_sync.ts'), 'saveAccountSwitchEmergencyBackup');
    const otherOwnerAt = body.indexOf("throw new Error('account_switch_backup_other_owner_pending');");
    const carryAt = body.indexOf('readOwnAccountSwitchBackupValue(');
    expect(carryAt).toBeGreaterThan(otherOwnerAt);
    expect(body.slice(carryAt - 200, carryAt)).toContain('previousBackupIdentity?.stableId === stableId');
  });

  test('вход: версии возвращаются в список после доливания копии', () => {
    const body = bodyOf(read('auth_provider.ts'), 'tryRestoreAccountSwitchBackup');
    // TG-92BAE5BC536D: вызов получил опции (полки только во вход со стиранием).
    const restoreAt = body.indexOf('await restoreAccountSwitchEmergencyBackupIfSafe(isCurrent');
    const applyAt = body.indexOf('await applyFutureKeptStashAfterReturn(');
    expect(restoreAt).toBeGreaterThan(0);
    expect(applyAt).toBeGreaterThan(restoreAt);
  });
});
