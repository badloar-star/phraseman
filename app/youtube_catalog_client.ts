import type { AccountGenerationToken } from './account_generation';
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

/**
 * Каталог YouTube — общий публичный контент, а не данные аккаунта: одни и те же
 * ролики видят все. Поэтому загрузка НЕ гейтится готовностью личности — иначе
 * экран, открытый раньше, чем приложение опознало пользователя, навсегда
 * оставался пустым (владелец: «должны отображаться в любом сценарии»).
 * Личность решает только одно: писать ли снапшот в аккаунт-скоупный кэш.
 */
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
}): Promise<YoutubeCatalogScreenSnapshot | null> {
  if (accountSwitchedAway(options.token)) return null;
  const reader = options.reader ?? await createFirestoreReader();
  const catalog = await fetchYoutubeChannelCatalogWithReader(options.channelId, reader);
  // Поздний ответ не должен дорисовывать каталог поверх ЧУЖОГО аккаунта.
  if (accountSwitchedAway(options.token)) return null;
  const snapshot = buildYoutubeScreenSnapshot(catalog);
  // Кэш остаётся аккаунт-скоупным: rememberYoutubeCatalogScreenSnapshot сам
  // промолчит, пока личность не активна, — чужой снапшот в чужой скоуп не ляжет.
  rememberYoutubeCatalogScreenSnapshot(options.token, snapshot);
  if (!catalogSnapshotsEqual(options.previous, snapshot)) options.commit(snapshot);
  return snapshot;
}

/* expo-router route shim: utility module, not a screen */
export default function __RouteShim() { return null; }
