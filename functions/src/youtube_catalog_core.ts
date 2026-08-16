import type { YoutubeVideoSnapshot, YoutubeVideoState } from '../../shared/youtube_catalog_contract';
import type { YoutubeVideoSource } from './youtube_data_api';

export function classifyYoutubeVideo(
  details: { scheduledStartTime?: string; actualStartTime?: string; actualEndTime?: string },
  _nowMs: number,
): YoutubeVideoState {
  if (details.actualEndTime && Number.isFinite(Date.parse(details.actualEndTime))) return 'completed';
  if (details.actualStartTime && Number.isFinite(Date.parse(details.actualStartTime))) return 'live';
  if (details.scheduledStartTime && Number.isFinite(Date.parse(details.scheduledStartTime))) return 'upcoming';
  return 'video';
}

export function nextYoutubeSyncIntervalMs(
  events: ReadonlyArray<{ state: YoutubeVideoState; scheduledStartTime?: string }>,
  nowMs: number,
): number {
  if (events.some((event) => event.state === 'live')) return 60_000;
  const nearUpcoming = events.some((event) => event.state === 'upcoming'
    && event.scheduledStartTime
    && Date.parse(event.scheduledStartTime) - nowMs <= 24 * 60 * 60_000);
  return nearUpcoming ? 120_000 : 15 * 60_000;
}

export function decideYoutubeSearchBudget(input: {
  utcDay: string;
  storedUtcDay: string;
  callsUsed: number;
  cursor: number;
  eligibleChannelIds: readonly string[];
  requestedCallsPerChannel: number;
}): { channelIds: string[]; nextCallsUsed: number; nextCursor: number } {
  const channels = [...new Set(input.eligibleChannelIds.filter(Boolean))];
  const callsUsed = input.utcDay === input.storedUtcDay ? Math.max(0, Math.floor(input.callsUsed)) : 0;
  if (channels.length === 0) return { channelIds: [], nextCallsUsed: callsUsed, nextCursor: 0 };
  const perChannel = Math.max(1, Math.floor(input.requestedCallsPerChannel));
  const take = Math.min(channels.length, Math.floor(Math.max(0, 80 - callsUsed) / perChannel));
  const cursor = ((Math.floor(input.cursor) % channels.length) + channels.length) % channels.length;
  const ordered = channels.map((_channel, offset) => channels[(cursor + offset) % channels.length]);
  const channelIds = ordered.slice(0, take);
  return {
    channelIds,
    nextCallsUsed: callsUsed + channelIds.length * perChannel,
    nextCursor: (cursor + channelIds.length) % channels.length,
  };
}

const SHORTS_MARKER_RE = /(?:^|\s)#shorts?\b/i;
/** Ролики короче этого — Shorts, даже без хештега в описании. */
const SHORTS_MAX_SECONDS = 180;

/** ISO-8601 длительность YouTube (PT1H2M3S) в секундах; мусор → null. */
export function parseYoutubeDurationSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = duration.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  if (!days && !hours && !minutes && !seconds) return null;
  return Number(days ?? 0) * 86_400 + Number(hours ?? 0) * 3_600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}

/**
 * Shorts определяем по длительности, а хештег оставляем запасным признаком.
 * зачем: раньше признаком был только `#shorts` в тексте, поэтому короткий ролик
 * без хештега проходил как полноценный, а длинный урок с хештегом — отсеивался.
 * Длительность приходит тем же запросом videos, лишней квоты это не стоит.
 */
export function isYoutubeShortSource(
  source: Pick<YoutubeVideoSource, 'title' | 'description' | 'duration'>,
): boolean {
  const seconds = parseYoutubeDurationSeconds(source.duration);
  if (seconds != null) return seconds <= SHORTS_MAX_SECONDS;
  return SHORTS_MARKER_RE.test(`${source.title}\n${source.description}`);
}

export function mergeYoutubeVideoSources(input: {
  channelId: string;
  nowMs: number;
  sources: readonly YoutubeVideoSource[];
  pinned: ReadonlyArray<{ id: string; title?: string; url?: string }>;
  overrides: Record<string, {
    hidden?: boolean;
    titleOverride?: string;
    scheduledStartOverride?: string;
    expiresAt: string;
  }>;
}): YoutubeVideoSnapshot[] {
  const sourceById = new Map<string, YoutubeVideoSource>();
  for (const source of input.sources) {
    if (!sourceById.has(source.id) && !isYoutubeShortSource(source)) {
      sourceById.set(source.id, source);
    }
  }
  const orderedIds = [...input.pinned.map((pin) => pin.id), ...input.sources.map((source) => source.id)]
    .filter((id, index, all) => all.indexOf(id) === index);
  const pinnedById = new Map(input.pinned.map((pin) => [pin.id, pin]));
  const output: YoutubeVideoSnapshot[] = [];
  for (const id of orderedIds) {
    const source = sourceById.get(id);
    const pin = pinnedById.get(id);
    if (!source && !pin) continue;
    const override = input.overrides[id];
    const activeOverride = override && Number.isFinite(Date.parse(override.expiresAt))
      && Date.parse(override.expiresAt) > input.nowMs ? override : undefined;
    if (activeOverride?.hidden) continue;
    const scheduledStartTime = activeOverride?.scheduledStartOverride ?? source?.liveStreamingDetails?.scheduledStartTime;
    const actualStartTime = source?.liveStreamingDetails?.actualStartTime;
    const actualEndTime = source?.liveStreamingDetails?.actualEndTime;
    output.push({
      id,
      channelId: input.channelId,
      title: activeOverride?.titleOverride ?? pin?.title ?? source?.title ?? id,
      description: source?.description ?? '',
      thumbnailUrl: source?.thumbnailUrl ?? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
      ...(source?.publishedAt ? { publishedAt: source.publishedAt } : {}),
      ...(source?.viewCount == null ? {} : { viewCount: source.viewCount }),
      state: classifyYoutubeVideo({ scheduledStartTime, actualStartTime, actualEndTime }, input.nowMs),
      ...(scheduledStartTime ? { scheduledStartTime } : {}),
      ...(actualStartTime ? { actualStartTime } : {}),
      ...(actualEndTime ? { actualEndTime } : {}),
      playlistIds: [],
    });
  }
  return output;
}
