/**
 * PM-111: личное избранное видео — идемпотентно, принадлежит аккаунту,
 * переживает повторный вход и не течёт между пользователями.
 * PM-113-A3: своё нажатие видно сразу поверх агрегата сервера (±1).
 */
import {
  applyLocalFavoriteToggle,
  displayVideoSaveCount,
  emptyVideoFavorites,
  favoriteVideoIds,
  markFavoriteSynced,
  mergeCloudFavorites,
  parseVideoFavoritesState,
  rollbackFavoriteToggle,
} from '../app/video_favorites_core';
import { createVideoFavoritesStore, type VideoFavoritesRemote } from '../app/video_favorites';

const V1 = 'dQw4w9WgXcQ';
const V2 = 'abc12345678';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
  };
}

/** Облако «как в Firestore»: связи users/{uid}/video_favorites/{videoId}. */
function fakeCloud() {
  const rows = new Map<string, Map<string, number>>();
  const calls: string[] = [];
  let failNext = false;
  const remote: VideoFavoritesRemote = {
    list: async (ownerId) => Array.from(rows.get(ownerId)?.entries() ?? []).map(([videoId, savedAtMs]) => ({ videoId, savedAtMs })),
    save: async (ownerId, videoId, savedAtMs) => {
      calls.push(`save:${ownerId}:${videoId}`);
      if (failNext) { failNext = false; throw new Error('unavailable'); }
      if (!rows.has(ownerId)) rows.set(ownerId, new Map());
      rows.get(ownerId)!.set(videoId, savedAtMs);
    },
    remove: async (ownerId, videoId) => {
      calls.push(`remove:${ownerId}:${videoId}`);
      if (failNext) { failNext = false; throw new Error('unavailable'); }
      rows.get(ownerId)?.delete(videoId);
    },
  };
  return { rows, calls, remote, failOnce: () => { failNext = true; } };
}

describe('video favorites core', () => {
  it('повтор того же действия — без изменений (идемпотентно)', () => {
    const s0 = emptyVideoFavorites('u1');
    const save = applyLocalFavoriteToggle(s0, V1, true, 1000);
    expect(save.changed).toBe(true);
    const again = applyLocalFavoriteToggle(save.state, V1, true, 2000);
    expect(again.changed).toBe(false);
    expect(again.state).toBe(save.state);
    const unsaveMissing = applyLocalFavoriteToggle(s0, V2, false, 1000);
    expect(unsaveMissing.changed).toBe(false);
  });

  it('поздний ответ не затирает более новый тап; откат только своего изменения', () => {
    const s0 = emptyVideoFavorites('u1');
    const first = applyLocalFavoriteToggle(s0, V1, true, 1000);
    const second = applyLocalFavoriteToggle(first.state, V1, false, 1000);
    expect(second.changedAtMs).toBeGreaterThan(first.changedAtMs);
    expect(markFavoriteSynced(second.state, V1, first.changedAtMs)).toBe(second.state);
    expect(rollbackFavoriteToggle(second.state, V1, first.changedAtMs, first.previous)).toBe(second.state);
    const rolled = rollbackFavoriteToggle(second.state, V1, second.changedAtMs, second.previous);
    expect(rolled.items[V1]).toMatchObject({ saved: true });
  });

  it('чужой или битый список с диска не показывается', () => {
    const mine = JSON.stringify({ v: 1, ownerId: 'u1', items: { [V1]: { saved: true, changedAtMs: 5, pending: false } }, cloudSyncedAtMs: 1 });
    expect(favoriteVideoIds(parseVideoFavoritesState(mine, 'u1'))).toEqual([V1]);
    expect(favoriteVideoIds(parseVideoFavoritesState(mine, 'u2'))).toEqual([]);
    expect(favoriteVideoIds(parseVideoFavoritesState('{oops', 'u1'))).toEqual([]);
    expect(favoriteVideoIds(parseVideoFavoritesState(null, 'u1'))).toEqual([]);
  });

  it('сверка с облаком: облако правда для подтверждённого, неподтверждённое сохраняется', () => {
    let s = emptyVideoFavorites('u1');
    s = applyLocalFavoriteToggle(s, V1, true, 10).state; // pending
    s = mergeCloudFavorites(s, [{ videoId: V2, savedAtMs: 5 }], 100);
    expect(favoriteVideoIds(s).sort()).toEqual([V1, V2].sort());
    s = markFavoriteSynced(s, V1, s.items[V1].changedAtMs);
    // На другом устройстве V1 убрали: в облаке его нет.
    s = mergeCloudFavorites(s, [{ videoId: V2, savedAtMs: 5 }], 200);
    expect(favoriteVideoIds(s)).toEqual([V2]);
  });

  it('счётчик: своё изменение после расчёта агрегата видно сразу, до — не удваивается', () => {
    expect(displayVideoSaveCount(7, 1000, undefined)).toBe(7);
    expect(displayVideoSaveCount(7, 1000, { saved: true, changedAtMs: 500, pending: false })).toBe(7);
    expect(displayVideoSaveCount(7, 1000, { saved: true, changedAtMs: 1500, pending: true })).toBe(8);
    expect(displayVideoSaveCount(7, 1000, { saved: false, changedAtMs: 1500, pending: true })).toBe(6);
    expect(displayVideoSaveCount(0, 1000, { saved: false, changedAtMs: 1500, pending: true })).toBe(0);
    expect(displayVideoSaveCount(Number.NaN, 0, undefined)).toBe(0);
  });
});

describe('video favorites store', () => {
  it('сохранить/убрать идемпотентно: повтор не идёт в сеть', async () => {
    const cloud = fakeCloud();
    let now = 1000;
    const store = createVideoFavoritesStore({ storage: memoryStorage(), remote: cloud.remote, getOwnerId: async () => 'u1', now: () => now });
    await expect(store.toggle(V1, true)).resolves.toMatchObject({ ok: true, changed: true, saved: true });
    now += 1;
    await expect(store.toggle(V1, true)).resolves.toMatchObject({ ok: true, changed: false });
    await expect(store.toggle(V1, false)).resolves.toMatchObject({ ok: true, changed: true, saved: false });
    await expect(store.toggle(V1, false)).resolves.toMatchObject({ ok: true, changed: false });
    expect(cloud.calls).toEqual(['save:u1:' + V1, 'remove:u1:' + V1]);
    expect(cloud.rows.get('u1')?.size ?? 0).toBe(0);
  });

  it('ошибка облака — откат локального состояния', async () => {
    const cloud = fakeCloud();
    const store = createVideoFavoritesStore({ storage: memoryStorage(), remote: cloud.remote, getOwnerId: async () => 'u1', now: () => 1000 });
    cloud.failOnce();
    await expect(store.toggle(V1, true)).resolves.toMatchObject({ ok: false, reason: 'network_failed', saved: false });
    expect(favoriteVideoIds(await store.load())).toEqual([]);
  });

  it('повторный вход на новом устройстве восстанавливает список из облака', async () => {
    const cloud = fakeCloud();
    const phoneA = createVideoFavoritesStore({ storage: memoryStorage(), remote: cloud.remote, getOwnerId: async () => 'u1', now: () => 1000 });
    await phoneA.toggle(V1, true);
    const phoneB = createVideoFavoritesStore({ storage: memoryStorage(), remote: cloud.remote, getOwnerId: async () => 'u1', now: () => 5000 });
    expect(favoriteVideoIds(await phoneB.load())).toEqual([]);
    expect(favoriteVideoIds(await phoneB.refreshFromCloud())).toEqual([V1]);
  });

  it('смена аккаунта на том же телефоне: список не течёт', async () => {
    const cloud = fakeCloud();
    const storage = memoryStorage();
    let owner = 'u1';
    const store = createVideoFavoritesStore({ storage, remote: cloud.remote, getOwnerId: async () => owner, now: () => 1000 });
    await store.toggle(V1, true);
    owner = 'u2';
    expect(favoriteVideoIds(await store.load())).toEqual([]);
    expect(favoriteVideoIds(await store.refreshFromCloud(true))).toEqual([]);
    owner = 'u1';
    expect(favoriteVideoIds(await store.load())).toEqual([V1]);
  });

  it('без аккаунта — честный отказ, пустой список не ошибка', async () => {
    const store = createVideoFavoritesStore({ storage: memoryStorage(), remote: null, getOwnerId: async () => null, now: () => 1 });
    await expect(store.toggle(V1, true)).resolves.toMatchObject({ ok: false, reason: 'no_account' });
    expect(favoriteVideoIds(await store.load())).toEqual([]);
  });

  it('облако не трогается чаще раза в 6 ч без force', async () => {
    const cloud = fakeCloud();
    const listSpy = jest.spyOn(cloud.remote, 'list');
    let now = 1000;
    const store = createVideoFavoritesStore({ storage: memoryStorage(), remote: cloud.remote, getOwnerId: async () => 'u1', now: () => now });
    await store.refreshFromCloud();
    now += 60 * 60 * 1000;
    await store.refreshFromCloud();
    expect(listSpy).toHaveBeenCalledTimes(1);
    now += 6 * 60 * 60 * 1000;
    await store.refreshFromCloud();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });
});
