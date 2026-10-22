// зачем (владелец 22.10, вопрос 27; решение координатора — вариант (а), страховка 24 ч): страницы карточек читаются при
// восстановлении только при смене ревизии flashcardPagesRev_<язык> или раз в сутки. Старые сборки пишут страницы без
// ревизии — их правки обязаны дойти не позже чем через 24 ч.
import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'node:fs';
import path from 'node:path';
import {
  FLASHCARD_PAGES_REV_SAFETY_MS,
  buildFlashcardPagesRevPatch,
  decideFlashcardPagesRead,
  noteFlashcardPagesRead,
  noteFlashcardPagesRevWritten,
  readCloudFlashcardPagesRev,
  readFlashcardPagesRevSeen,
} from '../app/flashcard_pages_rev';

const HOUR = 60 * 60 * 1000;

describe('ревизия страниц карточек', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('старый телефон добавил карточку без ревизии → новый подтянет не позже 24 ч', async () => {
    const t0 = 1_000_000_000;
    await noteFlashcardPagesRead('uid-A', 'en', 777, t0);
    const seen = await readFlashcardPagesRevSeen();
    const decide = (nowMs: number) => decideFlashcardPagesRead({
      uid: 'uid-A', target: 'en', cloudRev: 777, seen, locked: false, localHasCards: true, nowMs,
    });
    // Старая сборка дописала страницы, ревизия в облаке осталась 777.
    expect(decide(t0 + 23 * HOUR)).toMatchObject({ read: false, reason: 'rev_same' });
    expect(decide(t0 + FLASHCARD_PAGES_REV_SAFETY_MS)).toMatchObject({ read: true, reason: 'safety_24h' });
  });

  it('старт без изменений = 0 чтений страниц; новая ревизия = чтение', async () => {
    await noteFlashcardPagesRead('uid-A', 'en', 777, 1_000);
    const seen = await readFlashcardPagesRevSeen();
    expect(decideFlashcardPagesRead({ uid: 'uid-A', target: 'en', cloudRev: 777, seen, locked: false, localHasCards: true, nowMs: 2_000 }))
      .toMatchObject({ read: false, reason: 'rev_same' });
    expect(decideFlashcardPagesRead({ uid: 'uid-A', target: 'en', cloudRev: 778, seen, locked: false, localHasCards: true, nowMs: 2_000 }))
      .toMatchObject({ read: true, reason: 'rev_changed' });
  });

  it('по-старому, если ревизии нет, ключ заперт, локальный список пуст, чужой uid или язык не видели', async () => {
    await noteFlashcardPagesRead('uid-A', 'en', 777, 1_000);
    const seen = await readFlashcardPagesRevSeen();
    const base = { uid: 'uid-A', target: 'en', cloudRev: 777, seen, locked: false, localHasCards: true, nowMs: 2_000 };
    expect(decideFlashcardPagesRead({ ...base, cloudRev: 0 }).reason).toBe('no_cloud_rev');
    expect(decideFlashcardPagesRead({ ...base, locked: true }).reason).toBe('locked');
    expect(decideFlashcardPagesRead({ ...base, localHasCards: false }).reason).toBe('no_local_cards');
    expect(decideFlashcardPagesRead({ ...base, uid: 'uid-B' }).reason).toBe('not_seen');
    expect(decideFlashcardPagesRead({ ...base, target: 'fr' }).reason).toBe('not_seen');
  });

  it('своя запись запоминает ревизию, но не время чтения: страховка 24 ч считается от настоящего чтения', async () => {
    await noteFlashcardPagesRead('uid-A', 'en', 1, 5_000);
    await noteFlashcardPagesRevWritten('uid-A', ['en', 'fr'], 9_000);
    const seen = await readFlashcardPagesRevSeen();
    expect(seen?.targets.en).toEqual({ rev: 9_000, readAtMs: 5_000 });
    expect(seen?.targets.fr).toEqual({ rev: 9_000, readAtMs: 0 });
    // fr ни разу не читали → страховка срабатывает сразу.
    expect(decideFlashcardPagesRead({ uid: 'uid-A', target: 'fr', cloudRev: 9_000, seen, locked: false, localHasCards: true, nowMs: 10_000 }).reason)
      .toBe('safety_24h');
  });

  it('поле плоское по языку: патч не затирает ревизию второго языка', () => {
    expect(buildFlashcardPagesRevPatch(new Set(['en']), 42)).toEqual({ flashcardPagesRev_en: 42 });
    expect(readCloudFlashcardPagesRev({ flashcardPagesRev_fr: 5 }, 'fr')).toBe(5);
    expect(readCloudFlashcardPagesRev({ flashcardPagesRev: { en: 5 } }, 'en')).toBe(0);
  });

  // зачем (координатор 22.10): при выходе неизменный список не переписывается — ни страниц, ни ревизии, ни записи документа.
  it('выход: список совпал со снимком того же владельца → страницы не пишутся; изменился → пишутся', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { uploadFlashcardListsToPages } = require('../app/flashcards_cloud_upload');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { encodeCloudSyncSnapshotValue } = require('../app/cloud_sync_snapshot_codec');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFlashcardPagesWriteLocks } = require('../app/flashcard_pages_read_result');
    const list = JSON.stringify([{ id: 'c1' }, { id: 'c2' }]);
    const writePages = jest.fn(async () => 1);
    const deps = { writePages, readLocks: readFlashcardPagesWriteLocks };
    const run = (exitSnapshot: Record<string, string | null> | null, value: string) => uploadFlashcardListsToPages({
      uid: 'uid-A', data: { flashcards_v1: value }, previousSnapshot: {}, mode: 'force', isCurrent: () => true, exitSnapshot, deps,
    });

    const same = await run({ flashcards_v1: encodeCloudSyncSnapshotValue(list) }, list);
    expect(writePages).not.toHaveBeenCalled();
    expect(same.pagesWrittenTargets.size).toBe(0);
    expect(same.offloaded.has('flashcards_v1')).toBe(true);

    const changed = await run({ flashcards_v1: encodeCloudSyncSnapshotValue(list) }, JSON.stringify([{ id: 'c1' }]));
    expect(writePages).toHaveBeenCalledTimes(1);
    expect([...changed.pagesWrittenTargets]).toEqual(['en']);

    // Снимка нет (или чужой владелец) — выход пишет, как раньше.
    await run(null, list);
    expect(writePages).toHaveBeenCalledTimes(2);
  });

  it('синк и перенос кладут ревизию в общий патч документа; восстановление решает по ревизии', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');
    expect(source.split('...buildFlashcardPagesRevPatch(flashcardUpload.pagesWrittenTargets, now),').length - 1).toBe(2);
    expect(source).toContain("return write('flashcard_pages_rev_change'");
    const restoreBody = source.slice(source.indexOf('async function restoreFlashcardPagesForKeys('));
    const verdict = restoreBody.indexOf('const pagesVerdict = decideFlashcardPagesRead({');
    const networkRead = restoreBody.indexOf('const pagesRead = await readFlashcardPagesResult(restoreUid, target);');
    expect(verdict).toBeGreaterThan(0);
    expect(networkRead).toBeGreaterThan(verdict);
    expect(restoreBody.slice(verdict, networkRead)).toContain('if (!pagesVerdict.read) continue;');
  });
});
