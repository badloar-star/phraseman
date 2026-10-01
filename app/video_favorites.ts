// ═══════════════════════════════════════════════════════════════════════════
// video_favorites.ts — личное избранное видео (PM-111), локально-первое.
//
// Данные:
//   AsyncStorage `video_favorites_v1::<stableId>` — мгновенный первый кадр и офлайн;
//   Firestore `users/{stableId}/video_favorites/{videoId}` = { videoId, savedAtMs } —
//   связь «аккаунт ↔ ролик». id документа = videoId, поэтому один человек
//   учитывается в счётчике ровно один раз (PM-112-A1).
//
// Поведение:
//   • тап меняет локальное состояние сразу (Optimistic UI), сеть догоняет фоном;
//   • ошибка сети — откат + причина в логе; поздний ответ не затирает новый тап;
//   • повторный вход / новое устройство — список подтягивается из облака не чаще
//     раза в 6 ч и при входе в приложение (без слушателей realtime);
//   • ключ и память привязаны к stable id: другой аккаунт не видит чужой список;
//   • удаление аккаунта рекурсивно сносит users/{uid} — связи уходят вместе с ним.
//
// Стоимость: тап = 1 запись (set/delete) + проверки правил; сверка = 1 запрос,
// чтений = число сохранённых роликов, не чаще раза в 6 ч.
// ═══════════════════════════════════════════════════════════════════════════
import {
  applyLocalFavoriteToggle,
  emptyVideoFavorites,
  favoriteVideoIds,
  isValidFavoriteVideoId,
  markFavoriteSynced,
  mergeCloudFavorites,
  parseVideoFavoritesState,
  pendingFavoriteChanges,
  rollbackFavoriteToggle,
  type CloudVideoFavorite,
  type VideoFavoritesState,
} from './video_favorites_core';

const LOG = '[PM111-FAV]';
export const VIDEO_FAVORITES_CLOUD_TTL_MS = 6 * 60 * 60 * 1000;
export const VIDEO_FAVORITES_NETWORK_TIMEOUT_MS = 12_000;
const STORAGE_PREFIX = 'video_favorites_v1::';

export type VideoFavoritesStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type VideoFavoritesRemote = {
  list(ownerId: string): Promise<readonly CloudVideoFavorite[]>;
  save(ownerId: string, videoId: string, savedAtMs: number): Promise<void>;
  remove(ownerId: string, videoId: string): Promise<void>;
};

export type VideoFavoritesDeps = {
  storage: VideoFavoritesStorage;
  remote: VideoFavoritesRemote | null;
  getOwnerId: () => Promise<string | null>;
  now: () => number;
  timeoutMs?: number;
};

export type VideoFavoriteToggleResult =
  | Readonly<{ ok: true; changed: boolean; saved: boolean }>
  | Readonly<{ ok: false; reason: 'no_account' | 'invalid_video' | 'account_changed' | 'network_failed'; saved: boolean }>;

function storageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}${ownerId}`;
}

function withTimeout<T>(work: Promise<T>, label: string, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function createVideoFavoritesStore(deps: VideoFavoritesDeps) {
  const timeoutMs = deps.timeoutMs ?? VIDEO_FAVORITES_NETWORK_TIMEOUT_MS;
  let memory: VideoFavoritesState | null = null;
  let cloudInFlight: Promise<VideoFavoritesState | null> | null = null;
  const listeners = new Set<(state: VideoFavoritesState) => void>();

  const publish = (state: VideoFavoritesState) => {
    memory = state;
    listeners.forEach((listener) => listener(state));
  };

  const persist = async (state: VideoFavoritesState) => {
    try {
      await deps.storage.setItem(storageKey(state.ownerId), JSON.stringify(state));
    } catch (error) {
      console.warn(`${LOG} запись на диск не удалась: ${String(error)}`);
    }
  };

  /** Список текущего аккаунта: из памяти, иначе с диска. Чужая память сбрасывается. */
  const load = async (): Promise<VideoFavoritesState | null> => {
    const ownerId = await deps.getOwnerId();
    if (!ownerId) {
      console.log(`${LOG} load: аккаунта нет — список пуст`);
      memory = null;
      return null;
    }
    if (memory?.ownerId === ownerId) return memory;
    if (memory) console.log(`${LOG} load: смена аккаунта — память прежнего владельца сброшена`);
    let raw: string | null = null;
    try {
      raw = await deps.storage.getItem(storageKey(ownerId));
    } catch (error) {
      console.warn(`${LOG} load: диск не читается — ${String(error)}`);
    }
    const state = parseVideoFavoritesState(raw, ownerId);
    publish(state);
    return state;
  };

  /** Первый кадр без ожидания: только то, что уже в памяти для этого владельца. */
  const peek = (ownerId: string | null): VideoFavoritesState | null =>
    ownerId && memory?.ownerId === ownerId ? memory : null;

  const toggle = async (videoId: string, saved: boolean): Promise<VideoFavoriteToggleResult> => {
    if (!isValidFavoriteVideoId(videoId)) {
      console.warn(`${LOG} toggle: неверный videoId=${videoId}`);
      return { ok: false, reason: 'invalid_video', saved: false };
    }
    const state = await load();
    if (!state) return { ok: false, reason: 'no_account', saved: false };
    const local = applyLocalFavoriteToggle(state, videoId, saved, deps.now());
    if (!local.changed) {
      console.log(`${LOG} toggle ${videoId}: уже ${saved ? 'сохранён' : 'убран'} — без записи`);
      return { ok: true, changed: false, saved };
    }
    publish(local.state);
    await persist(local.state);
    console.log(`${LOG} toggle ${videoId}: локально ${saved ? 'сохранён' : 'убран'} at=${local.changedAtMs}, пишу в облако`);
    if (!deps.remote) {
      // Облако выключено (Expo Go): изменение остаётся pending и уйдёт при сверке.
      console.log(`${LOG} toggle ${videoId}: облако выключено — изменение ждёт сверки`);
      return { ok: true, changed: true, saved };
    }
    const ownerId = state.ownerId;
    try {
      await withTimeout(
        saved ? deps.remote.save(ownerId, videoId, local.changedAtMs) : deps.remote.remove(ownerId, videoId),
        'video_favorite_write',
        timeoutMs,
      );
      if (memory?.ownerId !== ownerId) {
        console.warn(`${LOG} toggle ${videoId}: ответ пришёл после смены аккаунта — отброшен`);
        return { ok: false, reason: 'account_changed', saved };
      }
      const next = markFavoriteSynced(memory, videoId, local.changedAtMs);
      if (next !== memory) {
        publish(next);
        await persist(next);
      } else {
        console.log(`${LOG} toggle ${videoId}: подтверждение устарело (был новый тап) — не трогаю`);
      }
      return { ok: true, changed: true, saved };
    } catch (error) {
      console.warn(`${LOG} toggle ${videoId}: облако отказало — откат. ${String(error)}`);
      if (memory?.ownerId !== ownerId) return { ok: false, reason: 'account_changed', saved: !saved };
      const rolled = rollbackFavoriteToggle(memory, videoId, local.changedAtMs, local.previous);
      if (rolled !== memory) {
        publish(rolled);
        await persist(rolled);
      }
      return { ok: false, reason: 'network_failed', saved: rolled.items[videoId]?.saved === true };
    }
  };

  /**
   * Сверка с облаком: при входе в приложение и не чаще раза в 6 ч (force — по
   * явному «потянуть»). Дописывает неподтверждённые изменения.
   */
  const refreshFromCloud = (force = false): Promise<VideoFavoritesState | null> => {
    if (cloudInFlight) return cloudInFlight;
    cloudInFlight = (async () => {
      const state = await load();
      if (!state) return null;
      if (!deps.remote) {
        console.log(`${LOG} refresh: облако выключено`);
        return state;
      }
      const age = deps.now() - state.cloudSyncedAtMs;
      if (!force && state.cloudSyncedAtMs > 0 && age < VIDEO_FAVORITES_CLOUD_TTL_MS) {
        console.log(`${LOG} refresh: свежо (${Math.round(age / 60000)} мин) — сеть не трогаю`);
        return state;
      }
      const ownerId = state.ownerId;
      try {
        // guard-ok: цикл только по НЕподтверждённым тапам (обычно 0–1), это записи, а не чтения.
        for (const { videoId, entry } of pendingFavoriteChanges(state)) {
          await withTimeout(
            entry.saved ? deps.remote.save(ownerId, videoId, entry.changedAtMs) : deps.remote.remove(ownerId, videoId),
            'video_favorite_replay',
            timeoutMs,
          );
          if (memory?.ownerId === ownerId) publish(markFavoriteSynced(memory, videoId, entry.changedAtMs));
        }
        const cloud = await withTimeout(deps.remote.list(ownerId), 'video_favorite_list', timeoutMs);
        if (memory?.ownerId !== ownerId) {
          console.warn(`${LOG} refresh: аккаунт сменился во время сверки — результат отброшен`);
          return memory;
        }
        const merged = mergeCloudFavorites(memory, cloud, deps.now());
        publish(merged);
        await persist(merged);
        console.log(`${LOG} refresh: облако ${cloud.length}, итог ${favoriteVideoIds(merged).length}`);
        return merged;
      } catch (error) {
        console.warn(`${LOG} refresh: сверка не удалась — остаюсь на локальном списке. ${String(error)}`);
        return memory;
      }
    })().finally(() => {
      cloudInFlight = null;
    });
    return cloudInFlight;
  };

  const subscribe = (listener: (state: VideoFavoritesState) => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { load, peek, toggle, refreshFromCloud, subscribe, empty: emptyVideoFavorites };
}

export type VideoFavoritesStore = ReturnType<typeof createVideoFavoritesStore>;

let defaultStore: VideoFavoritesStore | null = null;

/** Стор приложения: AsyncStorage + Firestore + canonical stable id. Лениво, без работы на старте. */
export function getVideoFavoritesStore(): VideoFavoritesStore {
  if (defaultStore) return defaultStore;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AsyncStorage = require('@react-native-async-storage/async-storage').default as VideoFavoritesStorage;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CLOUD_SYNC_ENABLED, IS_EXPO_GO } = require('./config') as { CLOUD_SYNC_ENABLED: boolean; IS_EXPO_GO: boolean };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCanonicalUserId } = require('./user_id_policy') as { getCanonicalUserId: () => Promise<string | null> };
  const remote: VideoFavoritesRemote | null = CLOUD_SYNC_ENABLED && !IS_EXPO_GO ? {
    list: async (ownerId) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const firestore = require('@react-native-firebase/firestore').default;
      const snap = await firestore().collection('users').doc(ownerId).collection('video_favorites').limit(500).get();
      return snap.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => ({
        videoId: doc.id,
        savedAtMs: Number(doc.data()?.savedAtMs) || 0,
      }));
    },
    save: async (ownerId, videoId, savedAtMs) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const firestore = require('@react-native-firebase/firestore').default;
      await firestore().collection('users').doc(ownerId).collection('video_favorites').doc(videoId)
        // guard-ok: документ связи целиком из двух полей (правила hasOnly) — полная замена намеренна.
        .set({ videoId, savedAtMs: Math.floor(savedAtMs) });
    },
    remove: async (ownerId, videoId) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const firestore = require('@react-native-firebase/firestore').default;
      // guard-ok: явное действие человека «убрать из избранного»; удаляется только его связь.
      await firestore().collection('users').doc(ownerId).collection('video_favorites').doc(videoId).delete();
    },
  } : null;
  defaultStore = createVideoFavoritesStore({
    storage: AsyncStorage,
    remote,
    getOwnerId: getCanonicalUserId,
    now: () => Date.now(),
  });
  return defaultStore;
}
