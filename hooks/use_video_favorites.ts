import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getVideoFavoritesStore } from '../app/video_favorites';
import { displayVideoSaveCount, favoriteVideoIds, type VideoFavoritesState } from '../app/video_favorites_core';
import { getVideoSaveCountsClient, type VideoSaveCounts } from '../app/video_save_counts';

// зачем (владелец 01.10, макет video-favorites, вариант A): закладка «В избранное» и число
// сохранений на карточке ролика. Первый кадр — из памяти процесса, сеть догоняет фоном;
// тап меняет вид сразу (стор сам откатывает при отказе, экран показывает тост).

/** Последнее известное состояние — для мгновенного первого кадра при повторном заходе. */
let lastFavorites: VideoFavoritesState | null = null;

export type VideoFavoriteToggleOutcome = 'ok' | 'failed';

/** Тапы чаще этого — один и тот же жест (дребезг), следующий осмысленный тап проходит даже при незавершённой записи. */
export const VIDEO_FAVORITE_TAP_DEBOUNCE_MS = 350;

export function useVideoFavorites(): Readonly<{
  savedIds: readonly string[];
  isSaved: (videoId: string) => boolean;
  toggle: (videoId: string) => Promise<VideoFavoriteToggleOutcome>;
  state: VideoFavoritesState | null;
}> {
  const [state, setState] = useState<VideoFavoritesState | null>(lastFavorites);
  // зачем (аудит Optimistic UI, 12.10): раньше повторный тап гасился, пока идёт ЗАПИСЬ В ОБЛАКО (до 12 с при слабой сети),
  // — человек видел «сохранено» и не мог убрать закладку, тап пропадал молча. Стор сам устойчив к тапам поверх незавершённой
  // записи (поздний ответ не затирает новый тап, записи одного клиента идут по порядку), поэтому гасим только дребезг
  // в пределах одного кадра, а направление считаем по самому свежему состоянию.
  const lastTapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const store = getVideoFavoritesStore();
    let alive = true;
    const unsubscribe = store.subscribe((next) => {
      lastFavorites = next;
      if (alive) setState(next);
    });
    void store.load().then((loaded) => {
      if (!alive) return;
      lastFavorites = loaded;
      setState(loaded);
      // Облако — не чаще раза в 6 ч (TTL внутри стора).
      return store.refreshFromCloud();
    }).catch((error: unknown) => {
      console.warn('[PM111-FAV] hook: загрузка избранного не удалась', error instanceof Error ? error.message : String(error));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const savedIds = useMemo(() => favoriteVideoIds(state), [state]);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const isSaved = useCallback((videoId: string) => savedSet.has(videoId), [savedSet]);
  const savedSetRef = useRef(savedSet);
  savedSetRef.current = savedSet;

  const toggle = useCallback(async (videoId: string): Promise<VideoFavoriteToggleOutcome> => {
    const tapAt = Date.now();
    const sinceLast = tapAt - (lastTapRef.current.get(videoId) ?? 0);
    if (sinceLast < VIDEO_FAVORITE_TAP_DEBOUNCE_MS) {
      console.log('[PM111-FAV] hook: дребезг тапа — пропуск', JSON.stringify({ videoId, sinceLastMs: sinceLast }));
      return 'ok';
    }
    lastTapRef.current.set(videoId, tapAt);
    try {
      const next = !savedSetRef.current.has(videoId);
      console.log('[PM111-FAV] hook: тап', JSON.stringify({ videoId, next, sinceLastMs: sinceLast }));
      const result = await getVideoFavoritesStore().toggle(videoId, next);
      if (!result.ok) {
        console.warn('[PM111-FAV] hook: не сохранено', JSON.stringify({ videoId, reason: result.reason }));
        return 'failed';
      }
      return 'ok';
    } catch (error: unknown) {
      console.warn('[PM111-FAV] hook: toggle бросил', error instanceof Error ? error.message : String(error));
      return 'failed';
    }
  }, []);

  return { savedIds, isSaved, toggle, state };
}

/** Число сохранений по показанным роликам: peek — первым кадром, get — фоном (документ раз в 6 ч). */
export function useVideoSaveCounts(videoIds: readonly string[], favorites: VideoFavoritesState | null): (videoId: string) => number {
  const client = getVideoSaveCountsClient();
  const [counts, setCounts] = useState<VideoSaveCounts>(() => client.peek());
  const key = videoIds.join(',');
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    void client.get(key.split(',')).then((next) => {
      if (alive) setCounts(next);
    }).catch((error: unknown) => {
      console.warn('[PM112-COUNT] hook: счётчики не получены', error instanceof Error ? error.message : String(error));
    });
    return () => { alive = false; };
  }, [client, key]);
  return useCallback((videoId: string) => {
    const entry = counts[videoId];
    return displayVideoSaveCount(entry?.n ?? 0, entry?.atMs ?? 0, favorites?.items[videoId]);
  }, [counts, favorites]);
}
