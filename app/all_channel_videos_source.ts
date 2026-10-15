/**
 * Данные экрана «Все видео»: полный список роликов канала.
 *
 * зачем (владелец 11.10, журнал строка 14: «Все видео» — ДОБАВИТЬ ДО РЕЛИЗА; экран делает Дизайн): снимки экрана видео
 * (youtube_catalog_cache / youtube_channel_memory_cache) обрезают список до 20 роликов, полного списка не хранил никто.
 * Здесь — компактный полный список (до 100 роликов, потолок каталога) в памяти и на диске на канал и аккаунт.
 *
 * Правила (раздел открывается мгновенно, Firebase-экономия):
 *  - первый кадр — из памяти или с диска, без сети; полного списка нет → 20 из снимка экрана видео (`partial`);
 *  - сеть не чаще раза в 6 ч на канал: сначала одно чтение манифеста; та же версия каталога — всё;
 *    полное перечитывание — только при новой версии (сервер не меняет версию без изменения содержимого, пакет K);
 *  - ошибка сети при наличии кэша — показываем кэш, причина в журнале [ALL-VIDEOS].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { YoutubeCatalogScreenSnapshot } from './youtube_catalog_cache';
import type { YoutubePlaylistSnapshot, YoutubeVideoSnapshot } from '../shared/youtube_catalog_contract';
import {
  fetchYoutubeCatalogManifestWithReader,
  fetchYoutubeChannelCatalogWithReader,
  type YoutubeCatalogReader,
} from './youtube_catalog_client';
import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { getDevVideoNetworkDelayMs } from './dev_video_network_delay';

const LOG = '[ALL-VIDEOS]';
export const ALL_VIDEOS_REFRESH_MS = 6 * 60 * 60 * 1000;
export const ALL_VIDEOS_PAGE_SIZE = 20;
const STORAGE_PREFIX = 'all_channel_videos_v1';

export type AllVideosItem = Readonly<Pick<YoutubeVideoSnapshot,
  'id' | 'channelId' | 'title' | 'thumbnailUrl' | 'watchUrl' | 'publishedAt' | 'viewCount' | 'durationSec' | 'state' | 'playlistIds'>>;

/** Плейлист без описания — ради компактного кэша (аудит #24, 15.10: снимок экрана видео обрезал плейлисты до 8). */
export type AllVideosPlaylist = Readonly<Pick<YoutubePlaylistSnapshot, 'id' | 'channelId' | 'title' | 'thumbnailUrl' | 'url' | 'itemCount' | 'order' | 'pageCount'>>;

/**
 * playlists — полный список плейлистов канала (≤ 50, потолок каталога). Нет поля — кэш записан до аудита #24 (до 15.10): список плейлистов неизвестен, полный каталог перечитывается
 * один раз при ближайшем обновлении, даже если версия каталога прежняя.
 */
export type AllVideosList = Readonly<{ channelId: string; version: string; fetchedAtMs: number; items: readonly AllVideosItem[]; playlists?: readonly AllVideosPlaylist[] }>;

function compactPlaylistItem(playlist: YoutubePlaylistSnapshot): AllVideosPlaylist {
  return {
    id: playlist.id,
    channelId: playlist.channelId,
    title: playlist.title.slice(0, 300),
    ...(playlist.thumbnailUrl ? { thumbnailUrl: playlist.thumbnailUrl } : {}),
    url: playlist.url,
    itemCount: playlist.itemCount,
    order: playlist.order,
    pageCount: playlist.pageCount,
  };
}

/** Элемент полного списка (без описания, ради компактного кэша) → снимок для карточки ролика. */
export function allVideosItemToSnapshot(item: AllVideosItem): YoutubeVideoSnapshot {
  return { ...item, description: '', playlistIds: [...item.playlistIds] };
}

/** Плейлист полного списка → снимок для карточки сетки плейлистов (описание не хранится). */
export function allVideosPlaylistToSnapshot(item: AllVideosPlaylist): YoutubePlaylistSnapshot {
  return { ...item, description: '' };
}

export type AllVideosSort = 'newest' | 'popular';
export type AllVideosQuery = Readonly<{ sort?: AllVideosSort; search?: string; playlistId?: string | null }>;

function compactItem(video: YoutubeVideoSnapshot): AllVideosItem {
  return {
    id: video.id,
    channelId: video.channelId,
    title: video.title.slice(0, 300),
    thumbnailUrl: video.thumbnailUrl,
    watchUrl: video.watchUrl,
    ...(video.publishedAt ? { publishedAt: video.publishedAt } : {}),
    ...(typeof video.viewCount === 'number' ? { viewCount: video.viewCount } : {}),
    ...(typeof video.durationSec === 'number' ? { durationSec: video.durationSec } : {}),
    state: video.state,
    playlistIds: video.playlistIds.slice(0, 12),
  };
}

/** Ролики, которые человек может посмотреть: без запланированных премьер. */
function isWatchable(item: AllVideosItem): boolean {
  return item.state !== 'upcoming';
}

/**
 * Чистый селектор для экрана: сортировка, поиск по названию (без регистра), фильтр по плейлисту.
 * Порядок «новые» — по дате публикации, без даты — в конце; «популярные» — по просмотрам, при равенстве — новее.
 */
export function selectAllChannelVideos(items: readonly AllVideosItem[], query: AllVideosQuery = {}): AllVideosItem[] {
  const search = (query.search ?? '').trim().toLocaleLowerCase();
  const filtered = items.filter((item) => isWatchable(item)
    && (!query.playlistId || item.playlistIds.includes(query.playlistId))
    && (!search || item.title.toLocaleLowerCase().includes(search)));
  const published = (item: AllVideosItem) => (item.publishedAt ? Date.parse(item.publishedAt) || 0 : 0);
  return [...filtered].sort((a, b) => (query.sort === 'popular'
    ? ((b.viewCount ?? 0) - (a.viewCount ?? 0)) || (published(b) - published(a))
    : (published(b) - published(a))));
}

/** Порция для отрисовки списка (FlatList onEndReached): первые page × 20. */
export function allVideosPage(items: readonly AllVideosItem[], page: number): AllVideosItem[] {
  return items.slice(0, Math.max(1, page) * ALL_VIDEOS_PAGE_SIZE);
}

// зачем: область кэша — id аккаунта, а не accountScopeKey (в нём номер поколения, он меняется между запусками,
// и диск не срабатывал бы никогда). Чужой аккаунт не увидит список: другой id — другой ключ.
function scopeOf(token: AccountGenerationToken): string {
  return token.stableId ?? 'anon';
}

const memory = new Map<string, AllVideosList>();
const inFlight = new Map<string, Promise<AllVideosList | null>>();

function key(scope: string, channelId: string): string {
  return `${STORAGE_PREFIX}:${scope}:${channelId}`;
}

/** Синхронный первый кадр из памяти. */
export function peekAllChannelVideos(scope: string, channelId: string): AllVideosList | null {
  return memory.get(key(scope, channelId)) ?? null;
}

async function readDisk(scope: string, channelId: string): Promise<AllVideosList | null> {
  try {
    const raw = await AsyncStorage.getItem(key(scope, channelId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AllVideosList;
    if (!parsed || parsed.channelId !== channelId || !Array.isArray(parsed.items) || typeof parsed.version !== 'string') {
      console.warn(LOG, 'диск: неверная форма — отброшено', JSON.stringify({ channelId }));
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn(LOG, 'диск: не прочитался', JSON.stringify({ channelId, error: String((error as Error)?.message ?? error) }));
    return null;
  }
}

async function writeDisk(scope: string, list: AllVideosList): Promise<void> {
  try {
    await AsyncStorage.setItem(key(scope, list.channelId), JSON.stringify(list));
  } catch (error) {
    console.warn(LOG, 'диск: запись не удалась', JSON.stringify({ channelId: list.channelId, error: String((error as Error)?.message ?? error) }));
  }
}

async function defaultReader(): Promise<YoutubeCatalogReader> {
  const module = await import('@react-native-firebase/firestore');
  const database = module.default();
  return {
    get: async (path) => {
      const snapshot = await database.doc(path).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    list: async (path) => {
      // guard-ok: тот же читатель, что youtube_catalog_client — подколлекции ОДНОГО снимка каталога, сервер
      // ограничивает их YOUTUBE_CATALOG_LIMITS (≤100 роликов, ≤50 плейлистов); вызывается только при новой версии.
      const snapshot = await database.collection(path).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }));
    },
  };
}

export type LoadAllVideosOptions = Readonly<{
  channelId: string;
  token?: AccountGenerationToken;
  force?: boolean;
  nowMs?: number;
  reader?: YoutubeCatalogReader;
}>;

/**
 * Загрузить полный список: память → диск → (если пора) манифест → (если новая версия) полный каталог.
 * Возвращает актуальный список или null, если данных нет вовсе.
 */
export async function loadAllChannelVideos(options: LoadAllVideosOptions): Promise<AllVideosList | null> {
  // зачем (Дизайн 11.10): пока экран не знает канал (каталог ещё не пришёл), он передаёт '' — без сети и без записи.
  if (!options.channelId) {
    console.log(LOG, 'пропуск: канал ещё не известен (channelId пуст) — сети нет, кэш не трогаем');
    return null;
  }
  const token = options.token ?? captureAccountGeneration();
  const scope = scopeOf(token);
  const k = key(scope, options.channelId);
  const pending = inFlight.get(k);
  if (pending) return pending;
  const task = (async () => {
    const nowMs = options.nowMs ?? Date.now();
    let cached = memory.get(k) ?? null;
    if (!cached) {
      cached = await readDisk(scope, options.channelId);
      if (cached) memory.set(k, cached); // guard-ok: Map в памяти процесса, не Firestore
    }
    if (cached && !options.force && nowMs - cached.fetchedAtMs < ALL_VIDEOS_REFRESH_MS) {
      console.log(LOG, 'источник=кэш, сеть не нужна', JSON.stringify({ channelId: options.channelId, items: cached.items.length, ageMin: Math.round((nowMs - cached.fetchedAtMs) / 60000) }));
      return cached;
    }
    const startedAt = Date.now();
    try {
      // зачем (R57 #23, координатор 15.10): dev-имитация медленной сети — пауза перед чтением (только dev-сборка, см. dev_video_network_delay.ts)
      const devDelayMs = getDevVideoNetworkDelayMs();
      if (devDelayMs > 0) {
        console.warn(LOG, 'DEV: искусственная задержка сети', JSON.stringify({ channelId: options.channelId, devDelayMs, hasCache: !!cached }));
        await new Promise<void>((resolve) => setTimeout(resolve, devDelayMs));
      }
      const reader = options.reader ?? await defaultReader();
      if (cached) {
        const manifest = await fetchYoutubeCatalogManifestWithReader(reader);
        // зачем (аудит #24): кэш без списка плейлистов (записан до 15.10) шорткатом «версия та же» не освежаем — полный каталог читаем один раз, чтобы получить все плейлисты
        if (cached.playlists && manifest.activeVersion === cached.version && manifest.channels.some((channel) => channel.id === options.channelId)) {
          const refreshed: AllVideosList = { ...cached, fetchedAtMs: nowMs };
          if (!isCurrentAccountGeneration(token)) return cached;
          memory.set(k, refreshed); // guard-ok: Map в памяти процесса, не Firestore
          void writeDisk(scope, refreshed);
          console.log(LOG, 'сеть: версия та же — 1 чтение манифеста', JSON.stringify({ channelId: options.channelId, ms: Date.now() - startedAt }));
          return refreshed;
        }
      }
      const catalog = await fetchYoutubeChannelCatalogWithReader(options.channelId, reader);
      if (!isCurrentAccountGeneration(token)) {
        console.log(LOG, 'сеть: аккаунт сменился — ответ отброшен', JSON.stringify({ channelId: options.channelId }));
        return cached;
      }
      const list: AllVideosList = {
        channelId: options.channelId,
        version: catalog.version,
        fetchedAtMs: nowMs,
        items: catalog.videos.map(compactItem),
        playlists: (catalog.playlists ?? []).map(compactPlaylistItem),
      };
      memory.set(k, list); // guard-ok: Map в памяти процесса, не Firestore
      void writeDisk(scope, list);
      console.log(LOG, 'сеть: полный каталог', JSON.stringify({ channelId: options.channelId, version: list.version, items: list.items.length, ms: Date.now() - startedAt }));
      // зачем (координатор 22:20: «durationSec пуст у части роликов»): сколько роликов без длительности и в каком они
      // состоянии — эфиры/премьеры (YouTube длительность не отдаёт) или настоящая дыра данных.
      const noDuration = list.items.filter((item) => typeof item.durationSec !== 'number');
      if (noDuration.length) {
        const byState = noDuration.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.state]: (acc[item.state] ?? 0) + 1 }), {});
        console.log(LOG, 'без длительности', JSON.stringify({ channelId: options.channelId, count: noDuration.length, of: list.items.length, byState, sample: noDuration.slice(0, 3).map((item) => item.id) }));
      }
      return list;
    } catch (error) {
      console.warn(LOG, 'сеть: не удалось — показываем кэш', JSON.stringify({ channelId: options.channelId, hasCache: !!cached, error: String((error as Error)?.message ?? error) }));
      return cached;
    }
  })().finally(() => { inFlight.delete(k); });
  inFlight.set(k, task);
  return task;
}

export type AllVideosStatus = 'ready' | 'partial' | 'loading' | 'unavailable';

export type AllVideosState = Readonly<{
  /** Отсортированные и отфильтрованные ролики (полностью; порции режет экран через allVideosPage). */
  items: readonly AllVideosItem[];
  /** Сколько роликов в канале всего (до фильтров). */
  total: number;
  /** Полный список плейлистов канала (аудит #24); пока полного списка нет — плейлисты снимка экрана видео (до 8). */
  playlists: readonly AllVideosPlaylist[];
  /** ready — полный список; partial — 20 из снимка экрана видео, полный грузится; loading — первый в жизни заход;
   *  unavailable — сети нет и кэша нет (экран показывает «Сейчас недоступно», D158). */
  status: AllVideosStatus;
  refreshing: boolean;
  refresh: () => void;
}>;

/**
 * Хук экрана «Все видео». `fallback` — снимок экрана видео этого канала (20 роликов) для первого кадра,
 * пока полного списка ещё нет ни в памяти, ни на диске.
 */
export function useAllChannelVideos(
  channelId: string,
  query: AllVideosQuery = {},
  fallback: YoutubeCatalogScreenSnapshot | null = null,
): AllVideosState {
  const token = useMemo(() => captureAccountGeneration(), []);
  const scope = scopeOf(token);
  const [list, setList] = useState<AllVideosList | null>(() => peekAllChannelVideos(scope, channelId));
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);

  const run = useCallback((force: boolean) => {
    const request = ++requestRef.current;
    if (!channelId) {
      // зачем (Дизайн 11.10): канал ещё не известен — ни сети, ни признака «недоступно»; ждём канал.
      console.log(LOG, 'хук: канал ещё не известен — ждём, загрузку не начинаем');
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    void loadAllChannelVideos({ channelId, token, force }).then((next) => {
      if (request !== requestRef.current) return;
      if (next) setList(next);
      setFailed(!next);
    }).catch((error: unknown) => {
      console.warn(LOG, 'хук: загрузка упала', JSON.stringify({ channelId, error: String((error as Error)?.message ?? error) }));
      if (request === requestRef.current) setFailed(true);
    }).finally(() => {
      if (request === requestRef.current) setRefreshing(false);
    });
  }, [channelId, token]);

  useEffect(() => {
    setList(peekAllChannelVideos(scope, channelId));
    run(false);
  }, [channelId, run, scope]);

  const refresh = useCallback(() => run(true), [run]);

  const fallbackItems = useMemo(() => (
    fallback && fallback.channel?.id === channelId ? fallback.videos.map(compactItem) : null
  ), [channelId, fallback]);
  const source = list?.items ?? fallbackItems ?? [];
  const items = useMemo(() => selectAllChannelVideos(source, query), [source, query]);
  const fallbackPlaylists = useMemo(() => (
    fallback && fallback.channel?.id === channelId ? fallback.playlists.map(compactPlaylistItem) : []
  ), [channelId, fallback]);
  const playlists = list?.playlists ?? fallbackPlaylists;
  const status: AllVideosStatus = list ? 'ready' : fallbackItems ? 'partial' : failed ? 'unavailable' : 'loading';
  return { items, total: source.length, status, refreshing, refresh, playlists };
}

/** Только для тестов. */
export function resetAllChannelVideosForTests(): void {
  memory.clear();
  inFlight.clear();
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __AllChannelVideosRouteShim() { return null; }
