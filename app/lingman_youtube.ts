import AsyncStorage from '@react-native-async-storage/async-storage';
import { XMLParser } from 'fast-xml-parser';

export type LingmanYoutubeVideo = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  updatedAt: string;
  watchUrl: string;
  viewCount?: number;
};

export type LingmanYoutubeSnapshot = {
  videos: LingmanYoutubeVideo[];
  latestVideoId: string | null;
  unreadCount: number;
  fetchedAtMs: number;
  error?: string;
};

const LINGMAN_CHANNEL_ID = 'UCIr8fwZjbDtcUlQ-IKIbndg';
const LINGMAN_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${LINGMAN_CHANNEL_ID}`;
const LINGMAN_FEED_TIMEOUT_MS = 10000;
export const LINGMAN_CHANNEL_URL = 'https://www.youtube.com/@professorlingman/videos';
export const LINGMAN_YOUTUBE_EMBED_BASE_URL = 'https://app.phraseman/';
const STORAGE_LAST_SEEN_ID = 'lingman_youtube_last_seen_video_id_v1';
const STORAGE_LAST_OPENED_AT = 'lingman_youtube_last_opened_at_ms_v1';
const STORAGE_LAST_SUCCESSFUL_SNAPSHOT = 'lingman_youtube_last_successful_snapshot_v1';

const FALLBACK_VIDEOS: LingmanYoutubeVideo[] = [
  {
    id: 'X7L3Xg3qITo',
    title: '200 фраз, после которых проще начать отвечать на английском',
    description: '200 базовых английских фраз A1 для тренировки на слух, повторения вслух и первого разговорного слоя.',
    thumbnailUrl: 'https://i.ytimg.com/vi/X7L3Xg3qITo/hqdefault.jpg',
    publishedAt: '2026-05-31T13:21:06+00:00',
    updatedAt: '2026-05-31T14:37:55+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('X7L3Xg3qITo'),
  },
  {
    id: 'FF4zI8l2JmE',
    title: 'Английский не держится в голове? Попробуй метод цепочек',
    description: 'Практика метода цепочек: не отдельные слова, а короткие связки, которые легче всплывают в разговоре.',
    thumbnailUrl: 'https://i.ytimg.com/vi/FF4zI8l2JmE/hqdefault.jpg',
    publishedAt: '2026-05-30T16:43:06+00:00',
    updatedAt: '2026-05-30T19:57:21+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('FF4zI8l2JmE'),
  },
  {
    id: 'uszm81bTNUs',
    title: 'ПОЧЕМУ ЭТО НЕ ОБЪЯСНЯЮТ В НАЧАЛЕ АНГЛИЙСКОГО?',
    description: 'TO BE без тяжелых таблиц: зачем нужны am, is, are и почему английская фраза ломается без связки.',
    thumbnailUrl: 'https://i.ytimg.com/vi/uszm81bTNUs/hqdefault.jpg',
    publishedAt: '2026-05-28T16:48:11+00:00',
    updatedAt: '2026-05-30T02:55:30+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('uszm81bTNUs'),
  },
];

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value) {
    return textValue((value as { '#text'?: unknown })['#text']);
  }
  return '';
}

function attrValue(value: unknown, attr: string): string {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return textValue(record[`@_${attr}`] ?? record[attr]);
}

function parseViewCount(entry: Record<string, unknown>): number | undefined {
  const group = entry['media:group'] as Record<string, unknown> | undefined;
  const community = group?.['media:community'] as Record<string, unknown> | undefined;
  const stats = community?.['media:statistics'];
  const raw = attrValue(stats, 'views');
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseEntry(entry: Record<string, unknown>): LingmanYoutubeVideo | null {
  const group = entry['media:group'] as Record<string, unknown> | undefined;
  const id = textValue(entry['yt:videoId']);
  if (!id) return null;

  const thumbnail = group?.['media:thumbnail'];
  const publishedAt = textValue(entry.published);
  const updatedAt = textValue(entry.updated);
  return {
    id,
    title: textValue(entry.title) || textValue(group?.['media:title']) || 'Professor Lingman',
    description: textValue(group?.['media:description']),
    thumbnailUrl: attrValue(thumbnail, 'url') || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    publishedAt,
    updatedAt,
    watchUrl: getLingmanYoutubeWatchUrl(id),
    viewCount: parseViewCount(entry),
  };
}

export function getLingmanYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId.trim())}`;
}

export function getTrustedLingmanYoutubeUrl(rawUrl: string | null | undefined, fallbackVideoId?: string | null): string | null {
  try {
    if (!rawUrl) throw new Error('Missing URL');
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const isTrustedHost = host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtu.be';
    if (url.protocol !== 'https:' || !isTrustedHost) throw new Error('Untrusted YouTube URL');
    return url.toString();
  } catch {
    return fallbackVideoId ? getLingmanYoutubeWatchUrl(fallbackVideoId) : null;
  }
}

export function parseLingmanYoutubeFeed(xml: string): LingmanYoutubeVideo[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });
  const parsed = parser.parse(xml) as { feed?: { entry?: unknown } };
  return asArray(parsed.feed?.entry)
    .map((entry) => (entry && typeof entry === 'object' ? parseEntry(entry as Record<string, unknown>) : null))
    .filter((video): video is LingmanYoutubeVideo => Boolean(video));
}

export function getLingmanYoutubeUnreadCount(videos: Pick<LingmanYoutubeVideo, 'id'>[], lastSeenId: string | null): number {
  if (!videos.length) return 0;
  if (!lastSeenId) return 1;
  const index = videos.findIndex((video) => video.id === lastSeenId);
  if (index < 0) return 1;
  return Math.max(0, index);
}

async function readCachedVideos(): Promise<LingmanYoutubeVideo[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_LAST_SUCCESSFUL_SNAPSHOT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { videos?: LingmanYoutubeVideo[] };
    return Array.isArray(parsed.videos) && parsed.videos.length ? parsed.videos : null;
  } catch {
    return null;
  }
}

async function cacheSuccessfulVideos(videos: LingmanYoutubeVideo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_LAST_SUCCESSFUL_SNAPSHOT, JSON.stringify({ videos, fetchedAtMs: Date.now() }));
  } catch {
    // Cache is best-effort; the fallback list still keeps the catalog usable.
  }
}

export async function fetchLingmanYoutubeVideos(): Promise<LingmanYoutubeVideo[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LINGMAN_FEED_TIMEOUT_MS);
  try {
    const response = await fetch(LINGMAN_FEED_URL, {
      headers: {
        Accept: 'application/atom+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`YouTube feed failed: ${response.status}`);
    }
    const xml = await response.text();
    const videos = parseLingmanYoutubeFeed(xml);
    if (!videos.length) {
      throw new Error('YouTube feed returned no videos');
    }
    return videos;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLingmanYoutubeSnapshot(): Promise<LingmanYoutubeSnapshot> {
  const [lastSeenId] = await Promise.all([
    AsyncStorage.getItem(STORAGE_LAST_SEEN_ID),
  ]);

  try {
    const videos = await fetchLingmanYoutubeVideos();
    void cacheSuccessfulVideos(videos);
    const latestVideoId = videos[0]?.id ?? null;
    return {
      videos,
      latestVideoId,
      unreadCount: getLingmanYoutubeUnreadCount(videos, lastSeenId),
      fetchedAtMs: Date.now(),
    };
  } catch (error) {
    const videos = (await readCachedVideos()) ?? FALLBACK_VIDEOS;
    const latestVideoId = videos[0]?.id ?? null;
    return {
      videos,
      latestVideoId,
      unreadCount: getLingmanYoutubeUnreadCount(videos, lastSeenId),
      fetchedAtMs: Date.now(),
      error: error instanceof Error ? error.message : 'Unable to load videos',
    };
  }
}

export async function markLingmanYoutubeCatalogSeen(latestVideoId: string | null): Promise<void> {
  const entries: [string, string][] = [[STORAGE_LAST_OPENED_AT, String(Date.now())]];
  if (latestVideoId) entries.push([STORAGE_LAST_SEEN_ID, latestVideoId]);
  await AsyncStorage.multiSet(entries);
}

export function buildLingmanEmbedHtml(videoId: string): string {
  const baseOrigin = LINGMAN_YOUTUBE_EMBED_BASE_URL.replace(/\/$/, '');
  const playerParams = new URLSearchParams({
    playsinline: '1',
    rel: '0',
    enablejsapi: '1',
    origin: baseOrigin,
    widget_referrer: LINGMAN_YOUTUBE_EMBED_BASE_URL,
  });
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${playerParams.toString()}`;
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
      iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
    </style>
  </head>
  <body>
    <iframe
      src="${embedUrl}"
      title="Professor Lingman YouTube video"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"></iframe>
  </body>
</html>`;
}

export function formatLingmanVideoDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
