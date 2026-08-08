export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type YoutubeChannelSource = {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  uploadsPlaylistId: string;
};

export type YoutubeVideoSource = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt?: string;
  viewCount?: number;
  duration?: string;
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
};

export type YoutubePlaylistSource = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  itemCount: number;
};

export interface YoutubeDataGateway {
  getChannel(channelId: string): Promise<YoutubeChannelSource>;
  getUploadVideoIds(uploadsPlaylistId: string, limit: number): Promise<string[]>;
  getVideos(videoIds: readonly string[]): Promise<YoutubeVideoSource[]>;
  getPlaylists(channelId: string, limit: number): Promise<YoutubePlaylistSource[]>;
  getPlaylistVideoIds(playlistId: string, limit: number): Promise<string[]>;
  searchEvents(channelId: string, eventType: 'upcoming' | 'live'): Promise<string[]>;
}

export class YoutubeDataApiError extends Error {
  constructor(public readonly code: string, public readonly retryable: boolean) {
    super(code);
    this.name = 'YoutubeDataApiError';
  }
}

type UnknownRecord = Record<string, unknown>;

const API_BASE = 'https://www.googleapis.com/youtube/v3';

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function items(value: unknown): UnknownRecord[] {
  const candidate = record(value).items;
  return Array.isArray(candidate) ? candidate.map(record) : [];
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalString(value: unknown): string | undefined {
  const normalized = stringValue(value);
  return normalized || undefined;
}

function thumbnailUrl(snippet: UnknownRecord): string | undefined {
  const thumbnails = record(snippet.thumbnails);
  for (const key of ['maxres', 'standard', 'high', 'medium', 'default']) {
    const url = optionalString(record(thumbnails[key]).url);
    if (url) return url;
  }
  return undefined;
}

function positiveInteger(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size));
  return output;
}

export function createYoutubeDataGateway(options: {
  apiKey: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): YoutubeDataGateway {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new YoutubeDataApiError('api_key_missing', false);
  const fetchImpl = options.fetchImpl ?? (fetch as FetchLike);
  const timeoutMs = Math.max(1, Math.floor(options.timeoutMs ?? 10_000));

  async function request(resource: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(`${API_BASE}/${resource}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set('key', apiKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url.toString(), { signal: controller.signal });
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) throw new YoutubeDataApiError('quota', false);
        if (response.status >= 500) throw new YoutubeDataApiError('server', true);
        if (response.status === 404) throw new YoutubeDataApiError('not_found', false);
        throw new YoutubeDataApiError('http', false);
      }
      try {
        return await response.json();
      } catch {
        throw new YoutubeDataApiError('invalid_json', false);
      }
    } catch (error) {
      if (error instanceof YoutubeDataApiError) throw error;
      if (record(error).name === 'AbortError') throw new YoutubeDataApiError('timeout', true);
      throw new YoutubeDataApiError('network', true);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function getPlaylistItems(playlistId: string, limit: number): Promise<string[]> {
    const boundedLimit = Math.max(0, Math.floor(limit));
    const output: string[] = [];
    let pageToken = '';
    while (output.length < boundedLimit) {
      const response = record(await request('playlistItems', {
        part: 'contentDetails',
        playlistId,
        maxResults: String(Math.min(50, boundedLimit - output.length)),
        fields: 'nextPageToken,items(contentDetails(videoId))',
        ...(pageToken ? { pageToken } : {}),
      }));
      for (const item of items(response)) {
        const id = stringValue(record(item.contentDetails).videoId);
        if (id && !output.includes(id)) output.push(id);
        if (output.length >= boundedLimit) break;
      }
      pageToken = stringValue(response.nextPageToken);
      if (!pageToken) break;
    }
    return output;
  }

  return {
    async getChannel(channelId) {
      const response = await request('channels', {
        part: 'snippet,contentDetails', id: channelId, maxResults: '1',
        fields: 'items(id,snippet(title,customUrl,thumbnails),contentDetails(relatedPlaylists(uploads)))',
      });
      const source = items(response)[0];
      if (!source) throw new YoutubeDataApiError('channel_not_found', false);
      const snippet = record(source.snippet);
      const uploadsPlaylistId = stringValue(record(record(source.contentDetails).relatedPlaylists).uploads);
      if (!uploadsPlaylistId) throw new YoutubeDataApiError('uploads_playlist_missing', false);
      const avatarUrl = thumbnailUrl(snippet);
      return {
        id: stringValue(source.id) || channelId,
        displayName: stringValue(snippet.title) || channelId,
        handle: stringValue(snippet.customUrl),
        ...(avatarUrl ? { avatarUrl } : {}),
        uploadsPlaylistId,
      };
    },
    getUploadVideoIds: getPlaylistItems,
    async getVideos(videoIds) {
      const output: YoutubeVideoSource[] = [];
      const uniqueIds = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))];
      for (const batch of chunks(uniqueIds, 50)) {
        const response = await request('videos', {
          part: 'snippet,statistics,contentDetails,liveStreamingDetails', id: batch.join(','),
          maxResults: String(batch.length),
          fields: 'items(id,snippet(title,description,publishedAt,thumbnails),statistics(viewCount),contentDetails(duration),liveStreamingDetails(scheduledStartTime,actualStartTime,actualEndTime))',
        });
        for (const item of items(response)) {
          const id = stringValue(item.id);
          const snippet = record(item.snippet);
          const image = thumbnailUrl(snippet);
          if (!id || !image) continue;
          const details = record(item.liveStreamingDetails);
          const scheduledStartTime = optionalString(details.scheduledStartTime);
          const actualStartTime = optionalString(details.actualStartTime);
          const actualEndTime = optionalString(details.actualEndTime);
          const publishedAt = optionalString(snippet.publishedAt);
          const duration = optionalString(record(item.contentDetails).duration);
          output.push({
            id,
            title: stringValue(snippet.title) || id,
            description: stringValue(snippet.description),
            thumbnailUrl: image,
            ...(publishedAt ? { publishedAt } : {}),
            viewCount: positiveInteger(record(item.statistics).viewCount),
            ...(duration ? { duration } : {}),
            ...((scheduledStartTime || actualStartTime || actualEndTime) ? {
              liveStreamingDetails: {
                ...(scheduledStartTime ? { scheduledStartTime } : {}),
                ...(actualStartTime ? { actualStartTime } : {}),
                ...(actualEndTime ? { actualEndTime } : {}),
              },
            } : {}),
          });
        }
      }
      return output;
    },
    async getPlaylists(channelId, limit) {
      const boundedLimit = Math.max(0, Math.floor(limit));
      const output: YoutubePlaylistSource[] = [];
      let pageToken = '';
      while (output.length < boundedLimit) {
        const response = record(await request('playlists', {
          part: 'snippet,contentDetails', channelId,
          maxResults: String(Math.min(50, boundedLimit - output.length)),
          fields: 'nextPageToken,items(id,snippet(title,description,thumbnails),contentDetails(itemCount))',
          ...(pageToken ? { pageToken } : {}),
        }));
        for (const item of items(response)) {
          const id = stringValue(item.id);
          if (!id || output.some((playlist) => playlist.id === id)) continue;
          const snippet = record(item.snippet);
          const image = thumbnailUrl(snippet);
          output.push({
            id, title: stringValue(snippet.title) || id,
            description: stringValue(snippet.description),
            ...(image ? { thumbnailUrl: image } : {}),
            itemCount: positiveInteger(record(item.contentDetails).itemCount),
          });
          if (output.length >= boundedLimit) break;
        }
        pageToken = stringValue(response.nextPageToken);
        if (!pageToken) break;
      }
      return output;
    },
    getPlaylistVideoIds: getPlaylistItems,
    async searchEvents(channelId, eventType) {
      const response = await request('search', {
        part: 'id', channelId, type: 'video', eventType, maxResults: '10', order: 'date',
        fields: 'items(id(videoId))',
      });
      return items(response).map((item) => stringValue(record(item.id).videoId))
        .filter((id, index, all) => Boolean(id) && all.indexOf(id) === index);
    },
  };
}
