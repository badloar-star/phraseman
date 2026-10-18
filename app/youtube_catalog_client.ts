import type { AccountGenerationToken } from './account_generation';
import { getDevYoutubeCatalogReader } from './dev_youtube_demo';
import { isCurrentAccountGeneration } from './account_generation';
import {
  parseYoutubeCatalogManifest,
  parseYoutubeChannelSnapshot,
  parseYoutubePlaylistSnapshot,
  parseYoutubeVideoSnapshot,
  type YoutubeCatalogManifest,
  type YoutubeChannelSnapshot,
  type YoutubePlaylistSnapshot,
  type YoutubeVideoSnapshot,
} from '../shared/youtube_catalog_contract';
import {
  buildYoutubeScreenSnapshot,
  catalogSnapshotsEqual,
  peekYoutubeCatalogScreenSnapshot,
  rememberYoutubeCatalogScreenSnapshot,
  type YoutubeCatalogScreenSnapshot,
} from './youtube_catalog_cache';

export {
  buildYoutubeScreenSnapshot,
  catalogSnapshotsEqual,
  peekYoutubeCatalogScreenSnapshot,
  rememberYoutubeCatalogScreenSnapshot,
};
export type { YoutubeCatalogScreenSnapshot } from './youtube_catalog_cache';

export type YoutubeCatalogReader = {
  get(path: string): Promise<unknown | null>;
  list(path: string): Promise<unknown[]>;
};

export type YoutubeChannelCatalog = {
  version: string;
  manifest: YoutubeCatalogManifest;
  channel: YoutubeChannelSnapshot;
  videos: YoutubeVideoSnapshot[];
  playlists: YoutubePlaylistSnapshot[];
  activeEvent?: YoutubeVideoSnapshot;
  fetchedAt: string;
};

export type YoutubeHomeFeatureCatalog = {
  version: string;
  manifest: YoutubeCatalogManifest;
  channel: YoutubeChannelSnapshot;
  video: YoutubeVideoSnapshot | null;
  fetchedAt: string;
};

export async function fetchYoutubeCatalogManifestWithReader(
  reader: YoutubeCatalogReader,
): Promise<YoutubeCatalogManifest> {
  return parseYoutubeCatalogManifest(await reader.get('youtube_catalog/public'));
}

function orderedByIds<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is T => !!item);
}

function requireRecord(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

export async function fetchYoutubeChannelCatalogWithReader(
  channelId: string,
  reader: YoutubeCatalogReader,
): Promise<YoutubeChannelCatalog> {
  const manifest = await fetchYoutubeCatalogManifestWithReader(reader);
  if (!manifest.channels.some((channel) => channel.id === channelId)) {
    throw new Error('youtube_catalog_channel_missing');
  }

  const rootPath = `youtube_catalog_snapshots/${manifest.activeVersion}`;
  const root = requireRecord(await reader.get(rootPath), 'youtube_catalog_snapshot_missing');
  if (root.status !== 'ready') throw new Error('youtube_catalog_snapshot_not_ready');
  const rootManifest = parseYoutubeCatalogManifest(root.manifest);
  if (rootManifest.activeVersion !== manifest.activeVersion) {
    throw new Error('youtube_catalog_snapshot_version_mismatch');
  }

  const channelPath = `${rootPath}/channels/${channelId}`;
  const [channelRaw, videosRaw, playlistsRaw] = await Promise.all([
    reader.get(channelPath),
    reader.list(`${channelPath}/videos`),
    reader.list(`${channelPath}/playlists`),
  ]);
  const channel = parseYoutubeChannelSnapshot(channelRaw);
  if (channel.id !== channelId) throw new Error('youtube_catalog_channel_mismatch');

  const videos = orderedByIds(
    videosRaw.map(parseYoutubeVideoSnapshot).filter((video) => video.channelId === channelId),
    channel.recentVideoIds,
  );
  const playlists = orderedByIds(
    playlistsRaw.map(parseYoutubePlaylistSnapshot).filter((playlist) => playlist.channelId === channelId),
    channel.playlistIds,
  );
  const activeEvent = channel.activeEventVideoId
    ? videos.find((video) => video.id === channel.activeEventVideoId)
    : undefined;
  if (channel.activeEventVideoId && !activeEvent) throw new Error('youtube_catalog_active_event_missing');

  return {
    version: manifest.activeVersion,
    manifest,
    channel,
    videos,
    playlists,
    ...(activeEvent ? { activeEvent } : {}),
    fetchedAt: new Date().toISOString(),
  };
}

async function createFirestoreReader(): Promise<YoutubeCatalogReader> {
  // зачем (координатор 12.10, video-001/004/008/009/011): dev `videopacks=catalog|catalog_upcoming` — каталог из памяти (ролики, плейлисты, премьера), Firestore не вызывается;
  // в стор-сборке getDevYoutubeCatalogReader() всегда null.
  const devReader = getDevYoutubeCatalogReader();
  if (devReader) return devReader;
  const module = await import('@react-native-firebase/firestore');
  const firestore = module.default;
  const database = firestore();
  return {
    get: async (path) => {
      const snapshot = await database.doc(path).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    list: async (path) => {
      const snapshot = await database.collection(path).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }));
    },
  };
}

export async function fetchYoutubeChannelCatalog(channelId: string): Promise<YoutubeChannelCatalog> {
  return fetchYoutubeChannelCatalogWithReader(channelId, await createFirestoreReader());
}

export async function fetchYoutubeCatalogManifest(): Promise<YoutubeCatalogManifest> {
  return fetchYoutubeCatalogManifestWithReader(await createFirestoreReader());
}

export type YoutubeVideoIndexChannel = Readonly<{ channelId: string; videos: YoutubeVideoSnapshot[]; error?: string }>;

/**
 * Ролики ВСЕХ каналов манифеста без плейлистов — для списка «Из видео» (названия, длительность, канал).
 * зачем (смета Firebase 13.10, п. 3; координатор): раньше на каждый канал заново читались манифест, корень снимка, канал,
 * до 100 роликов и до 50 плейлистов (≈ 350 чтений на канал). Здесь манифест уже известен, корень читается ОДИН раз,
 * на канал — сам документ и его ролики; плейлисты не нужны. Сбой одного канала не роняет остальные (error в строке канала).
 */
export async function fetchYoutubeVideoIndexWithReader(
  reader: YoutubeCatalogReader,
  manifest: YoutubeCatalogManifest,
): Promise<YoutubeVideoIndexChannel[]> {
  const rootPath = `youtube_catalog_snapshots/${manifest.activeVersion}`;
  const root = requireRecord(await reader.get(rootPath), 'youtube_catalog_snapshot_missing');
  if (root.status !== 'ready') throw new Error('youtube_catalog_snapshot_not_ready');
  const rootManifest = parseYoutubeCatalogManifest(root.manifest);
  if (rootManifest.activeVersion !== manifest.activeVersion) {
    throw new Error('youtube_catalog_snapshot_version_mismatch');
  }
  const rows: YoutubeVideoIndexChannel[] = [];
  for (const entry of manifest.channels) {
    try {
      const channelPath = `${rootPath}/channels/${entry.id}`;
      const [channelRaw, videosRaw] = await Promise.all([reader.get(channelPath), reader.list(`${channelPath}/videos`)]);
      const channel = parseYoutubeChannelSnapshot(channelRaw);
      if (channel.id !== entry.id) throw new Error('youtube_catalog_channel_mismatch');
      const videos = orderedByIds(
        videosRaw.map(parseYoutubeVideoSnapshot).filter((video) => video.channelId === entry.id),
        channel.recentVideoIds,
      );
      rows.push({ channelId: entry.id, videos });
    } catch (error) {
      rows.push({ channelId: entry.id, videos: [], error: error instanceof Error ? error.message : String(error) });
    }
  }
  return rows;
}

export async function fetchYoutubeVideoIndex(manifest: YoutubeCatalogManifest): Promise<YoutubeVideoIndexChannel[]> {
  return fetchYoutubeVideoIndexWithReader(await createFirestoreReader(), manifest);
}

/**
 * Lightweight Home projection of the same atomic YouTube catalog.
 * Reads root + channel + one featured video instead of listing up to 100
 * videos and 50 playlists just to render a single below-fold card.
 */
export async function fetchYoutubeHomeFeatureWithReader(
  channelId: string,
  reader: YoutubeCatalogReader,
  knownManifest?: YoutubeCatalogManifest,
): Promise<YoutubeHomeFeatureCatalog> {
  const manifest = knownManifest ?? await fetchYoutubeCatalogManifestWithReader(reader);
  if (!manifest.channels.some((channel) => channel.id === channelId)) {
    throw new Error('youtube_catalog_channel_missing');
  }

  const rootPath = `youtube_catalog_snapshots/${manifest.activeVersion}`;
  const root = requireRecord(await reader.get(rootPath), 'youtube_catalog_snapshot_missing');
  if (root.status !== 'ready') throw new Error('youtube_catalog_snapshot_not_ready');
  const rootManifest = parseYoutubeCatalogManifest(root.manifest);
  if (rootManifest.activeVersion !== manifest.activeVersion) {
    throw new Error('youtube_catalog_snapshot_version_mismatch');
  }

  const channelPath = `${rootPath}/channels/${channelId}`;
  const channel = parseYoutubeChannelSnapshot(await reader.get(channelPath));
  if (channel.id !== channelId) throw new Error('youtube_catalog_channel_mismatch');

  const candidateIds = Array.from(new Set([
    channel.activeEventVideoId,
    ...channel.recentVideoIds,
  ].filter((value): value is string => !!value))).slice(0, 3);
  let fallback: YoutubeVideoSnapshot | null = null;
  for (const candidateId of candidateIds) {
    const raw = await reader.get(`${channelPath}/videos/${candidateId}`);
    if (!raw) continue;
    const parsed = parseYoutubeVideoSnapshot({ ...requireRecord(raw, 'youtube_catalog_video_missing'), id: candidateId });
    if (parsed.channelId !== channelId) continue;
    if (parsed.state === 'live' || parsed.state === 'upcoming') {
      return {
        version: manifest.activeVersion,
        manifest,
        channel,
        video: parsed,
        fetchedAt: new Date().toISOString(),
      };
    }
    fallback ??= parsed;
    // recentVideoIds are already newest-first. Once a valid regular video is
    // found there is no reason to spend another document read.
    if (fallback && candidateId !== channel.activeEventVideoId) break;
  }

  return {
    version: manifest.activeVersion,
    manifest,
    channel,
    video: fallback,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchYoutubeHomeFeatureCatalog(
  channelId: string,
  knownManifest?: YoutubeCatalogManifest,
): Promise<YoutubeHomeFeatureCatalog> {
  return fetchYoutubeHomeFeatureWithReader(channelId, await createFirestoreReader(), knownManifest);
}

export type YoutubeHomeRailCatalog = {
  version: string;
  channel: YoutubeChannelSnapshot;
  videos: YoutubeVideoSnapshot[];
  fetchedAt: string;
};

/**
 * Лента видео канала для Главной по языку обучения (D130: итальянский).
 * зачем (Firebase-экономия): полный fetchYoutubeChannelCatalog листает до 100 видео и
 * 50 плейлистов (~150 чтений). Для горизонтальной ленты хватает корня, канала и
 * первых `limit` роликов из recentVideoIds — не больше limit+2 чтений.
 */
export async function fetchYoutubeHomeRailWithReader(
  channelId: string,
  reader: YoutubeCatalogReader,
  knownManifest: YoutubeCatalogManifest,
  limit = 8,
): Promise<YoutubeHomeRailCatalog> {
  const manifest = knownManifest;
  if (!manifest.channels.some((channel) => channel.id === channelId)) {
    throw new Error('youtube_catalog_channel_missing');
  }
  const rootPath = `youtube_catalog_snapshots/${manifest.activeVersion}`;
  const root = requireRecord(await reader.get(rootPath), 'youtube_catalog_snapshot_missing');
  if (root.status !== 'ready') throw new Error('youtube_catalog_snapshot_not_ready');
  const channelPath = `${rootPath}/channels/${channelId}`;
  const channel = parseYoutubeChannelSnapshot(await reader.get(channelPath));
  if (channel.id !== channelId) throw new Error('youtube_catalog_channel_mismatch');
  const ids = channel.recentVideoIds.slice(0, Math.max(0, limit));
  // guard-ok: ≤limit (8) точечных чтений параллельно; 'in'-запрос стоил бы столько же чтений.
  const raws = await Promise.all(ids.map((id) => reader.get(`${channelPath}/videos/${id}`)));
  const videos: YoutubeVideoSnapshot[] = [];
  raws.forEach((raw, index) => {
    if (!raw) {
      console.warn('[LANG-SURFACE] home_rail:video_missing', { channelId, videoId: ids[index] });
      return;
    }
    try {
      const parsed = parseYoutubeVideoSnapshot({ ...requireRecord(raw, 'youtube_catalog_video_missing'), id: ids[index] });
      if (parsed.channelId === channelId) videos.push(parsed);
    } catch (error) {
      console.warn('[LANG-SURFACE] home_rail:video_invalid', { channelId, videoId: ids[index], error: error instanceof Error ? error.message : String(error) });
    }
  });
  return { version: manifest.activeVersion, channel, videos, fetchedAt: new Date().toISOString() };
}

export async function fetchYoutubeHomeRailCatalog(
  channelId: string,
  knownManifest: YoutubeCatalogManifest,
  limit?: number,
): Promise<YoutubeHomeRailCatalog> {
  return fetchYoutubeHomeRailWithReader(channelId, await createFirestoreReader(), knownManifest, limit);
}

/**
 * Каталог YouTube — общий публичный контент, а не данные аккаунта: одни и те же
 * ролики видят все. Поэтому загрузка НЕ гейтится готовностью личности — иначе
 * экран, открытый раньше, чем приложение опознало пользователя, навсегда
 * оставался пустым (владелец: «должны отображаться в любом сценарии»).
 * Личность решает только одно: писать ли снапшот в аккаунт-скоупный кэш.
 */
// зачем (владелец, Firebase-экономия; координатор 08:22): каталог роликов меняется редко, а заход во вкладку стоил минимум одно
// чтение манифеста (при смене версии — до ~154). Снимок моложе суток показываем без сети вовсе; сеть — только когда снимка нет,
// он старше суток или пользователь сам потянул «обновить» (force). Журнал [COST-CUT] youtube_catalog hit/miss/age.
export const YOUTUBE_CATALOG_FRESH_MS = 24 * 60 * 60 * 1000;
const COST_CUT_LOG = '[COST-CUT] youtube_catalog';

/** Возраст снимка по fetchedAt; нечитаемая дата — «бесконечно старый» (идём в сеть). */
export function youtubeCatalogSnapshotAgeMs(snapshot: Pick<YoutubeCatalogScreenSnapshot, 'fetchedAt'>, nowMs: number): number {
  const fetchedMs = Date.parse(snapshot.fetchedAt);
  return Number.isFinite(fetchedMs) ? nowMs - fetchedMs : Number.POSITIVE_INFINITY;
}

/** Личность СМЕНИЛАСЬ на другую (alice → bob), а не «ещё не была готова». */
function accountSwitchedAway(token: AccountGenerationToken): boolean {
  // Токен, снятый до опознания пользователя, ничей — он не «устаревает».
  if (token.phase !== 'active') return false;
  return !isCurrentAccountGeneration(token);
}

export async function revalidateYoutubeChannelCatalog(options: {
  channelId: string;
  token: AccountGenerationToken;
  reader?: YoutubeCatalogReader;
  previous: YoutubeCatalogScreenSnapshot | null;
  commit: (snapshot: YoutubeCatalogScreenSnapshot) => void;
  /**
   * зачем (ревью TG-3BD963DD05D5, R1): экран мог уже запросить другой канал (смена языка обучения en→es→en).
   * Устаревший ответ не кладём ни в сохранённый снимок, ни в состояние экрана.
   */
  isCurrent?: () => boolean;
  /** Явное обновление пользователем (потянуть вниз): сутки кэша не действуют. */
  force?: boolean;
  /** Для тестов: «сейчас», мс. */
  nowMs?: number;
}): Promise<YoutubeCatalogScreenSnapshot | null> {
  if (accountSwitchedAway(options.token)) return null;
  const nowMs = options.nowMs ?? Date.now();
  const sameChannel = options.previous?.channel?.id === options.channelId ? options.previous : null;
  const ageMs = sameChannel ? youtubeCatalogSnapshotAgeMs(sameChannel, nowMs) : null;
  const ageMin = ageMs === null || !Number.isFinite(ageMs) ? '-' : String(Math.round(ageMs / 60_000));
  if (sameChannel && !options.force && ageMs !== null && ageMs >= 0 && ageMs < YOUTUBE_CATALOG_FRESH_MS) {
    console.log(`${COST_CUT_LOG} hit age=${ageMin}m channel=${options.channelId} version=${sameChannel.version} reads=0`);
    return sameChannel;
  }
  const missReason = !options.previous ? 'no_cache' : !sameChannel ? 'other_channel' : options.force ? 'user_refresh' : 'stale';
  console.log(`${COST_CUT_LOG} miss reason=${missReason} age=${ageMin}m channel=${options.channelId}`);
  const reader = options.reader ?? await createFirestoreReader();
  // зачем (аудит стоимости Firebase 11.10): вкладка перечитывала весь каталог (корень, канал, до 100 видео и 50
  // плейлистов — до ~154 чтений) на КАЖДОМ заходе и возвращении в приложение. Сервер пишет каталог новым снимком
  // с новой версией и только потом переключает манифест, снимок одной версии не меняется — если на экране уже эта
  // версия этого канала, хватает одного чтения манифеста.
  const previous = options.previous;
  if (previous && previous.channel?.id === options.channelId) {
    const manifest = await fetchYoutubeCatalogManifestWithReader(reader);
    if (accountSwitchedAway(options.token)) return null;
    if (manifest.activeVersion === previous.version && manifest.channels.some((channel) => channel.id === options.channelId)) {
      console.log(`[VIDEO-CATALOG] revalidate:unchanged version=${manifest.activeVersion} channel=${options.channelId}`);
      // зачем: версия та же — снимок «свежий» ещё сутки; новую отметку кладём и в сохранённый снимок, иначе каждый
      // следующий заход снова считал бы его старым и платил чтением манифеста.
      const refreshed: YoutubeCatalogScreenSnapshot = { ...previous, fetchedAt: new Date(nowMs).toISOString() };
      rememberYoutubeCatalogScreenSnapshot(options.token, refreshed);
      return refreshed;
    }
    console.log(`[VIDEO-CATALOG] revalidate:version_changed ${previous.version} -> ${manifest.activeVersion}`);
  }
  const catalog = await fetchYoutubeChannelCatalogWithReader(options.channelId, reader);
  // Поздний ответ не должен дорисовывать каталог поверх ЧУЖОГО аккаунта.
  if (accountSwitchedAway(options.token)) return null;
  if (options.isCurrent && !options.isCurrent()) {
    console.log(`[VIDEO-CATALOG] revalidate:stale_dropped channel=${options.channelId} version=${catalog.version}`);
    return null;
  }
  const snapshot = buildYoutubeScreenSnapshot(catalog);
  // Кэш остаётся аккаунт-скоупным: rememberYoutubeCatalogScreenSnapshot сам
  // промолчит, пока личность не активна, — чужой снапшот в чужой скоуп не ляжет.
  rememberYoutubeCatalogScreenSnapshot(options.token, snapshot);
  if (!catalogSnapshotsEqual(options.previous, snapshot)) options.commit(snapshot);
  return snapshot;
}

/* expo-router route shim: utility module, not a screen */
export default function __RouteShim() { return null; }
