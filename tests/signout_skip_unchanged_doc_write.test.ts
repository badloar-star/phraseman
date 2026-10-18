// зачем (координатор 18.10 02:25, «выход < 3 с»): при выходе документ users/{uid} не переписываем, только если всё
// отправляемое байт в байт совпадает со снимком ТОГО ЖЕ владельца. Любое сомнение — запись. Сторож каждой ветки.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __cloudSyncTestHooks } from '../app/cloud_sync';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const { decideUnchangedForceDocSkip, writeLastSyncSnapshot } = __cloudSyncTestHooks;
const SNAPSHOT_KEY = 'cloud_last_sync_snapshot_v1';
const OWNER_KEY = 'cloud_last_sync_snapshot_owner_v1';
const noUpload = { clearDocField: new Set<string>(), sentToDoc: new Set<string>() };
const send = { streak_count: '4', user_name: 'Ann', user_avatar: '3' };

describe('пропуск записи документа при выходе', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('снимок того же владельца совпадает байт в байт → пропуск', async () => {
    await writeLastSyncSnapshot(JSON.stringify({ ...send, extra_old_key: '1' }), 'uid-A');
    const decision = await decideUnchangedForceDocSkip('uid-A', send, send, noUpload, false);
    expect(decision.skip).toBe(true);
    expect(decision.log).toEqual(expect.objectContaining({ branch: 'skip', reason: 'unchanged_same_owner' }));
    expect(JSON.stringify(decision.log)).not.toContain('uid-A');
  });

  it('другой владелец → запись; uid в логе нет, только 8 знаков хешей', async () => {
    await writeLastSyncSnapshot(JSON.stringify(send), 'uid-B');
    const decision = await decideUnchangedForceDocSkip('uid-A', send, send, noUpload, false);
    expect(decision.skip).toBe(false);
    expect(decision.log.reason).toBe('snapshot_owner_mismatch');
    expect(String(decision.log.ownerHash8)).toHaveLength(8);
    expect(JSON.stringify(decision.log)).not.toMatch(/uid-[AB]/);
  });

  it('снимок после восстановления (владелец не доказан) → запись', async () => {
    await writeLastSyncSnapshot(JSON.stringify(send), 'uid-A');
    await writeLastSyncSnapshot(JSON.stringify(send), null);
    expect(await AsyncStorage.getItem(OWNER_KEY)).toBeNull();
    const decision = await decideUnchangedForceDocSkip('uid-A', send, send, noUpload, false);
    expect(decision.log.reason).toBe('snapshot_owner_unknown');
  });

  it('одно поле изменилось → запись с хешами', async () => {
    await writeLastSyncSnapshot(JSON.stringify(send), 'uid-A');
    const decision = await decideUnchangedForceDocSkip('uid-A', { ...send, streak_count: '5' }, send, noUpload, false);
    expect(decision.log).toEqual(expect.objectContaining({ branch: 'write', reason: 'content_changed' }));
  });

  it('ключа нет в снимке → запись', async () => {
    await writeLastSyncSnapshot(JSON.stringify({ streak_count: '4' }), 'uid-A');
    const decision = await decideUnchangedForceDocSkip('uid-A', send, send, noUpload, false);
    expect(decision.log.reason).toBe('snapshot_missing_keys');
  });

  it('createdAt не записан, карточки меняют поля документа, снимка нет, снимок битый → запись', async () => {
    await writeLastSyncSnapshot(JSON.stringify(send), 'uid-A');
    expect((await decideUnchangedForceDocSkip('uid-A', send, send, noUpload, true)).log.reason).toBe('created_at_not_synced');
    expect((await decideUnchangedForceDocSkip('uid-A', send, send, { clearDocField: new Set(['flashcards_v1']), sentToDoc: new Set<string>() }, false)).log.reason)
      .toBe('flashcard_doc_fields_change');
    await AsyncStorage.setItem(SNAPSHOT_KEY, '{oops');
    expect((await decideUnchangedForceDocSkip('uid-A', send, send, noUpload, false)).log.reason).toBe('decision_failed');
    await AsyncStorage.removeItem(SNAPSHOT_KEY);
    expect((await decideUnchangedForceDocSkip('uid-A', send, send, noUpload, false)).log.reason).toBe('no_snapshot');
  });

  it('корневой аватар отличается от снимка → запись', async () => {
    await writeLastSyncSnapshot(JSON.stringify({ streak_count: '4' }), 'uid-A');
    const decision = await decideUnchangedForceDocSkip('uid-A', { streak_count: '4' }, { user_avatar: '9' }, noUpload, false);
    expect(decision.log).toEqual(expect.objectContaining({ reason: 'root_field_changed', field: 'user_avatar' }));
  });
});
