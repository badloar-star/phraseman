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
  peekScreenSnapshotForToken,
  rememberScreenSnapshot,
  screenSnapshotKey,
} from './screen_snapshot_store';

const SCREEN_ID = 'youtube-catalog';
const MAX_SNAPSHOT_CHARS = 23_900;
const MAX_CACHED_VIDEOS = 20;
const MAX_CACHED_PLAYLISTS = 8;

export type YoutubeCatalogScreenSnapshot = {
  version: string;
  manifest: YoutubeCatalogManifest;
  channel: YoutubeChannelSnapshot;
  videos: YoutubeVideoSnapshot[];
  playlists: YoutubePlaylistSnapshot[];
  activeEvent?: YoutubeVideoSnapshot;
  fetchedAt: string;
};

export type YoutubeCatalogSource = YoutubeCatalogScreenSnapshot;

function compactVideo(video: YoutubeVideoSnapshot): YoutubeVideoSnapshot {
  return {
    ...video,
    title: video.title.slice(0, 300),
    description: video.description.slice(0, 800),
    playlistIds: video.playlistIds.slice(0, 12),
  };
}

function compactPlaylist(playlist: YoutubePlaylistSnapshot): YoutubePlaylistSnapshot {
  return {
    ...playlist,
    title: playlist.title.slice(0, 300),
    description: playlist.description.slice(0, 500),
  };
}

function ensureActiveEvent(
  videos: YoutubeVideoSnapshot[],
  activeEvent: YoutubeVideoSnapshot | undefined,
): YoutubeVideoSnapshot[] {
  if (!activeEvent || videos.some((video) => video.id === activeEvent.id)) return videos;
  if (videos.length < MAX_CACHED_VIDEOS) return [compactVideo(activeEvent), ...videos];
  return [compactVideo(activeEvent), ...videos.slice(0, MAX_CACHED_VIDEOS - 1)];
}

export function buildYoutubeScreenSnapshot(source: YoutubeCatalogSource): YoutubeCatalogScreenSnapshot {
  const activeEvent = source.activeEvent ? compactVideo(source.activeEvent) : undefined;
  const videos = ensureActiveEvent(
    source.videos.slice(0, MAX_CACHED_VIDEOS).map(compactVideo),
    activeEvent,
  );
  const snapshot: YoutubeCatalogScreenSnapshot = {
    version: source.version,
    manifest: source.manifest,
    channel: source.channel,
    videos,
    playlists: source.playlists.slice(0, MAX_CACHED_PLAYLISTS).map(compactPlaylist),
    ...(activeEvent ? { activeEvent } : {}),
    fetchedAt: source.fetchedAt,
  };

  while (JSON.stringify(snapshot).length >= MAX_SNAPSHOT_CHARS && snapshot.videos.length > 1) {
    let removable = -1;
    for (let index = snapshot.videos.length - 1; index >= 0; index -= 1) {
      if (snapshot.videos[index].id !== activeEvent?.id) {
        removable = index;
        break;
      }
    }
    if (removable < 0) break;
    snapshot.videos.splice(removable, 1);
  }
  while (JSON.stringify(snapshot).length >= MAX_SNAPSHOT_CHARS && snapshot.playlists.length > 0) {
    snapshot.playlists.pop();
  }
  if (JSON.stringify(snapshot).length >= MAX_SNAPSHOT_CHARS) {
    snapshot.videos = snapshot.videos.map((video) => ({ ...video, description: '' }));
    snapshot.playlists = snapshot.playlists.map((playlist) => ({ ...playlist, description: '' }));
  }
  return snapshot;
}

function parseCachedSnapshot(value: unknown): YoutubeCatalogScreenSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('youtube_catalog_cache_invalid');
  const source = value as Record<string, unknown>;
  if (typeof source.version !== 'string' || typeof source.fetchedAt !== 'string') {
    throw new Error('youtube_catalog_cache_invalid');
  }
  const manifest = parseYoutubeCatalogManifest(source.manifest);
  if (manifest.activeVersion !== source.version) throw new Error('youtube_catalog_cache_version_mismatch');
  if (!Array.isArray(source.videos) || !Array.isArray(source.playlists)) {
    throw new Error('youtube_catalog_cache_invalid');
  }
  const channel = parseYoutubeChannelSnapshot(source.channel);
  const videos = source.videos.map(parseYoutubeVideoSnapshot);
  const playlists = source.playlists.map(parseYoutubePlaylistSnapshot);
  const activeEvent = source.activeEvent == null ? undefined : parseYoutubeVideoSnapshot(source.activeEvent);
  if (channel.id !== videos[0]?.channelId && videos.length > 0) {
    throw new Error('youtube_catalog_cache_channel_mismatch');
  }
  return {
    version: source.version,
    manifest,
    channel,
    videos,
    playlists,
    ...(activeEvent ? { activeEvent } : {}),
    fetchedAt: source.fetchedAt,
  };
}

export function rememberYoutubeCatalogScreenSnapshot(
  token: AccountGenerationToken,
  snapshot: YoutubeCatalogScreenSnapshot,
): void {
  if (!isCurrentAccountGeneration(token)) return;
  rememberScreenSnapshot(screenSnapshotKey(SCREEN_ID, token), snapshot);
}

export function peekYoutubeCatalogScreenSnapshot(
  token: AccountGenerationToken,
): YoutubeCatalogScreenSnapshot | null {
  const cached = peekScreenSnapshotForToken<unknown>(SCREEN_ID, token);
  if (!cached) return null;
  try {
    return parseCachedSnapshot(cached);
  } catch {
    return null;
  }
}

export function catalogSnapshotsEqual(
  left: YoutubeCatalogScreenSnapshot | null,
  right: YoutubeCatalogScreenSnapshot | null,
): boolean {
  if (left === right) return true;
  if (!left || !right || left.version !== right.version) return false;
  const withoutVolatile = ({ fetchedAt: _fetchedAt, ...snapshot }: YoutubeCatalogScreenSnapshot) => snapshot;
  return JSON.stringify(withoutVolatile(left)) === JSON.stringify(withoutVolatile(right));
}

/* expo-router route shim: utility module, not a screen */
export default function __RouteShim() { return null; }
