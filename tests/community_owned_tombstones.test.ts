// зачем (R47, координатор 15.10): «убрать из моих» переживает легаси-восстановление: убрал → restore → не вернулся; убрал → добавил → виден;
// платный набор — права не трогаем; два устройства: надгробие новее/старее добавления.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
import { addCommunityOwnedPackId, loadCommunityOwnedPackIds, removeCommunityOwnedPackId } from '../app/community_packs/communityOwnedStorage';
import { isTombstoneRemoved, nextTombstoneValue, parseOwnedTombstones } from '../app/community_packs/community_owned_tombstones';
import { __cloudSyncTestHooks } from '../app/cloud_sync';

jest.mock('../app/cloud_sync', () => jest.requireActual('../app/cloud_sync'));

const asyncStorageMock = AsyncStorage as unknown as { __reset: () => void };
const IDS = 'community_owned_pack_ids_v1';
const TOMBS = 'community_owned_pack_tombstones_v1';
const T = { titleRu: 'Набор', titleUk: 'Набір', titleEs: 'Pack' };

/** Как делает restore: ids — объединение облака и локали, надгробия — максимум по id. */
function restore(cloud: { ids: string[]; tombs: Record<string, number> }, local: { ids: string | null; tombs: string | null }) {
  return {
    ids: __cloudSyncTestHooks.mergeOwnedRestoreValue(JSON.stringify(cloud.ids), local.ids),
    tombs: __cloudSyncTestHooks.mergeOwnedRestoreValue(JSON.stringify(cloud.tombs), local.tombs),
  };
}

describe('надгробия «убрано из моих»', () => {
  beforeEach(() => { asyncStorageMock.__reset(); beginAccountGeneration('tomb-test'); });
  afterEach(() => __resetAccountGenerationForTests());

  test('ключ надгробий входит в объединяемые при восстановлении', () => {
    expect(__cloudSyncTestHooks.isOwnedUnionRestoreKey(TOMBS)).toBe(true);
  });

  test('убрал → restore из облака со старым списком → набор не вернулся', async () => {
    await addCommunityOwnedPackId('pk1', undefined, T);
    await removeCommunityOwnedPackId('pk1');
    const merged = restore({ ids: ['pk1'], tombs: {} }, { ids: await AsyncStorage.getItem(IDS), tombs: await AsyncStorage.getItem(TOMBS) });
    await AsyncStorage.setItem(IDS, merged.ids);
    await AsyncStorage.setItem(TOMBS, merged.tombs);
    expect(JSON.parse(merged.ids)).toContain('pk1');
    expect(await loadCommunityOwnedPackIds()).toEqual([]);
  });

  test('убрал → добавил снова → набор виден, и после restore тоже', async () => {
    await addCommunityOwnedPackId('pk1', undefined, T);
    await removeCommunityOwnedPackId('pk1');
    await addCommunityOwnedPackId('pk1', undefined, T);
    expect(await loadCommunityOwnedPackIds()).toEqual(['pk1']);
    const merged = restore({ ids: ['pk1'], tombs: {} }, { ids: await AsyncStorage.getItem(IDS), tombs: await AsyncStorage.getItem(TOMBS) });
    await AsyncStorage.setItem(IDS, merged.ids);
    await AsyncStorage.setItem(TOMBS, merged.tombs);
    expect(await loadCommunityOwnedPackIds()).toEqual(['pk1']);
  });

  test('платный набор: права (flashcards_owned_packs_v1) не трогаются, добавление без оплаты', async () => {
    await AsyncStorage.setItem('flashcards_owned_packs_v1', JSON.stringify(['paid1']));
    await addCommunityOwnedPackId('paid1', undefined, T);
    await removeCommunityOwnedPackId('paid1');
    expect(await AsyncStorage.getItem('flashcards_owned_packs_v1')).toBe(JSON.stringify(['paid1']));
    await addCommunityOwnedPackId('paid1', undefined, T);
    expect(await loadCommunityOwnedPackIds()).toEqual(['paid1']);
  });

  test('два устройства: надгробие новее добавления прячет, старее — не прячет', () => {
    const added = nextTombstoneValue(undefined, false, 1_000);
    const removedLater = nextTombstoneValue(added, true, 2_000);
    const removedEarlier = nextTombstoneValue(undefined, true, 500);
    expect(isTombstoneRemoved(Math.max(added, removedLater))).toBe(true);
    expect(isTombstoneRemoved(Math.max(added, removedEarlier))).toBe(false);
    // то же время на часах: событие после надгробия всегда строго позже
    expect(nextTombstoneValue(removedLater, false, 2_000)).toBeGreaterThan(removedLater);
    expect(parseOwnedTombstones('{"a":3,"b":"x"}')).toEqual({ a: 3 });
  });
});
