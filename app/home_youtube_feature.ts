import type { YoutubeVideoSnapshot } from '../shared/youtube_catalog_contract';
import type { YoutubeCatalogScreenSnapshot } from './youtube_catalog_client';

/**
 * Home must not turn into another polling surface. The full video screen can
 * refresh on demand; the small below-fold card revalidates at most every
 * fifteen minutes while the Home tab is actually active.
 */
export const HOME_YOUTUBE_REVALIDATE_TTL_MS = 15 * 60_000;

export function isHomeYoutubeCatalogFresh(
  snapshot: YoutubeCatalogScreenSnapshot | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!snapshot || !Number.isFinite(nowMs)) return false;
  const fetchedAtMs = Date.parse(snapshot.fetchedAt);
  return Number.isFinite(fetchedAtMs)
    && fetchedAtMs <= nowMs
    && nowMs - fetchedAtMs < HOME_YOUTUBE_REVALIDATE_TTL_MS;
}

/**
 * A live stream always wins, then an upcoming premiere, then the newest
 * regular/completed video. activeEvent is considered first but never allowed
 * to hide a genuinely live item already present in the same atomic snapshot.
 */
export function selectHomeYoutubeFeaturedVideo(
  snapshot: YoutubeCatalogScreenSnapshot | null | undefined,
): YoutubeVideoSnapshot | null {
  if (!snapshot) return null;
  const candidates: YoutubeVideoSnapshot[] = [];
  const seen = new Set<string>();
  for (const video of [snapshot.activeEvent, ...snapshot.videos]) {
    if (!video || seen.has(video.id)) continue;
    seen.add(video.id);
    candidates.push(video);
  }

  return candidates.find((video) => video.state === 'live')
    ?? candidates.find((video) => video.state === 'upcoming')
    ?? candidates.find((video) => video.state === 'video' || video.state === 'completed')
    ?? null;
}

/* expo-router route shim: utility module, not a screen */
export default function __RouteShim() { return null; }
