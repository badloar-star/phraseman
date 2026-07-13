import {
  PRODUCT_ANALYTICS_EVENT_CATALOG,
  type GovernedProductAnalyticsEventName,
} from './product_analytics_event_catalog';

export const YOUTUBE_ANALYTICS_SCHEMA_VERSION = 1;
export const MAX_YOUTUBE_PLAYBACK_MS = 86_400_000;
export const MAX_YOUTUBE_PLAYER_MESSAGE_LENGTH = 512;

type Platform = 'ios' | 'android';
type PlaybackEndReason = 'ended' | 'screen_exit' | 'external_open' | 'error';

interface CommonInput {
  eventId: string;
  sessionId: string;
  channelId: string;
  platform: Platform;
  appVersion: string;
  buildNumber: string;
  occurredAtMs: number;
}

interface NoVideoFields {
  videoId?: never;
  videoTitle?: never;
  playbackId?: never;
  activeWatchMs?: never;
  positionMs?: never;
  durationMs?: never;
  maxPositionPermille?: never;
  endReason?: never;
}

interface VideoOnlyFields {
  videoId: string;
  videoTitle?: never;
  playbackId?: never;
  activeWatchMs?: never;
  positionMs?: never;
  durationMs?: never;
  maxPositionPermille?: never;
  endReason?: never;
}

interface PlaybackIdentityFields {
  videoId: string;
  playbackId: string;
  videoTitle?: never;
}

interface PlaybackStartFields extends PlaybackIdentityFields {
  activeWatchMs?: never;
  positionMs?: never;
  durationMs?: never;
  maxPositionPermille?: never;
  endReason?: never;
}

interface PlaybackSnapshotFields extends PlaybackIdentityFields {
  activeWatchMs: number;
  positionMs: number;
  durationMs: number;
  maxPositionPermille: number;
}

export type YoutubeAnalyticsEventInput =
  | (CommonInput & NoVideoFields & { eventName: 'youtube_home_entry_click'; source: 'home' })
  | (CommonInput & NoVideoFields & { eventName: 'youtube_catalog_open'; source: 'home' })
  | (CommonInput & {
    eventName: 'youtube_video_select';
    source: 'catalog';
    videoId: string;
    videoTitle: string;
    playbackId?: never;
    activeWatchMs?: never;
    positionMs?: never;
    durationMs?: never;
    maxPositionPermille?: never;
    endReason?: never;
  })
  | (CommonInput & VideoOnlyFields & { eventName: 'youtube_player_ready'; source: 'player' })
  | (CommonInput & PlaybackStartFields & { eventName: 'youtube_playback_start'; source: 'player' })
  | (CommonInput & PlaybackSnapshotFields & {
    eventName: 'youtube_playback_checkpoint';
    source: 'player';
    endReason?: never;
  })
  | (CommonInput & PlaybackSnapshotFields & {
    eventName: 'youtube_playback_end';
    source: 'player';
    endReason: PlaybackEndReason;
  })
  | (CommonInput & VideoOnlyFields & {
    eventName: 'youtube_external_video_open';
    source: 'catalog' | 'player';
  })
  | (CommonInput & NoVideoFields & { eventName: 'youtube_channel_open'; source: 'catalog' })
  | (CommonInput & VideoOnlyFields & { eventName: 'youtube_channel_open'; source: 'player' });

export type YoutubeAnalyticsPayload = Record<string, string | number> & {
  schema_version: 1;
  event_id: string;
  session_id: string;
  channel_id: string;
  source: string;
  platform: Platform;
  app_version: string;
  build_number: string;
  occurred_at_ms: number;
};

export interface BuiltYoutubeAnalyticsEvent {
  eventName: YoutubeAnalyticsEventName;
  payload: YoutubeAnalyticsPayload;
}

type YoutubeAnalyticsEventName = Extract<
  GovernedProductAnalyticsEventName,
  `youtube_${string}`
>;

const inputFieldsByEvent: Record<YoutubeAnalyticsEventName, readonly string[]> = {
  youtube_home_entry_click: [],
  youtube_catalog_open: [],
  youtube_video_select: ['videoId', 'videoTitle'],
  youtube_player_ready: ['videoId'],
  youtube_playback_start: ['videoId', 'playbackId'],
  youtube_playback_checkpoint: [
    'videoId',
    'playbackId',
    'activeWatchMs',
    'positionMs',
    'durationMs',
    'maxPositionPermille',
  ],
  youtube_playback_end: [
    'videoId',
    'playbackId',
    'activeWatchMs',
    'positionMs',
    'durationMs',
    'maxPositionPermille',
    'endReason',
  ],
  youtube_external_video_open: ['videoId'],
  youtube_channel_open: ['videoId'],
};

const commonInputFields = new Set([
  'eventId',
  'eventName',
  'sessionId',
  'channelId',
  'source',
  'platform',
  'appVersion',
  'buildNumber',
  'occurredAtMs',
]);

const sourceByEvent: Record<YoutubeAnalyticsEventName, readonly string[]> = {
  youtube_home_entry_click: ['home'],
  youtube_catalog_open: ['home'],
  youtube_video_select: ['catalog'],
  youtube_player_ready: ['player'],
  youtube_playback_start: ['player'],
  youtube_playback_checkpoint: ['player'],
  youtube_playback_end: ['player'],
  youtube_external_video_open: ['catalog', 'player'],
  youtube_channel_open: ['catalog', 'player'],
};

const youtubeEventNames = new Set<string>(Object.keys(inputFieldsByEvent));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function requiredIdentifier(value: unknown, field: string, maxLength = 80): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${field}`);
  if (
    !value
    || value !== value.trim()
    || value.length > maxLength
    || !/[A-Za-z0-9]/.test(value)
    || !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function requiredYoutubeVideoId(value: unknown): string {
  if (
    typeof value !== 'string'
    || !value
    || value !== value.trim()
    || value.length > 120
    || !/[A-Za-z0-9]/.test(value)
    || !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new Error('Invalid videoId');
  }
  return value;
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${field}`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error(`Invalid ${field}`);
  return normalized;
}

function boundedInteger(value: unknown, field: string, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(`Invalid ${field}`);
  }
  return Math.round(value);
}

function normalizedVideoTitle(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid videoTitle');
  const normalized = value.replace(/\s+/g, ' ').trim();
  const codePoints = Array.from(normalized);
  if (
    codePoints.length === 0
    || codePoints.some(character => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 0xD800 && codePoint <= 0xDFFF;
    })
  ) {
    throw new Error('Invalid videoTitle');
  }
  return codePoints.slice(0, 100).join('');
}

function assertExactInputFields(input: Record<string, unknown>, eventName: YoutubeAnalyticsEventName): void {
  const allowed = new Set([...commonInputFields, ...inputFieldsByEvent[eventName]]);
  if (eventName === 'youtube_channel_open' && input.source === 'catalog') allowed.delete('videoId');
  if (Object.keys(input).some((field) => !allowed.has(field))) throw new Error('Unexpected analytics field');
}

export function buildYoutubeAnalyticsEvent(input: YoutubeAnalyticsEventInput): BuiltYoutubeAnalyticsEvent {
  const unsafeInput: unknown = input;
  if (!isRecord(unsafeInput)) throw new Error('Invalid YouTube analytics event');
  const eventName = unsafeInput.eventName;
  if (typeof eventName !== 'string' || !youtubeEventNames.has(eventName)) {
    throw new Error('unsupported_youtube_event');
  }
  const governedEventName = eventName as YoutubeAnalyticsEventName;
  if (!PRODUCT_ANALYTICS_EVENT_CATALOG.some(event => event.name === governedEventName)) {
    throw new Error('ungoverned_youtube_event');
  }
  assertExactInputFields(unsafeInput, governedEventName);
  if (typeof unsafeInput.source !== 'string' || !sourceByEvent[governedEventName].includes(unsafeInput.source)) {
    throw new Error('Invalid source');
  }

  const payload: YoutubeAnalyticsPayload = {
    schema_version: YOUTUBE_ANALYTICS_SCHEMA_VERSION,
    event_id: requiredIdentifier(unsafeInput.eventId, 'eventId'),
    session_id: requiredIdentifier(unsafeInput.sessionId, 'sessionId'),
    channel_id: requiredIdentifier(unsafeInput.channelId, 'channelId', 120),
    source: unsafeInput.source,
    platform: unsafeInput.platform === 'ios' || unsafeInput.platform === 'android'
      ? unsafeInput.platform
      : (() => { throw new Error('Invalid platform'); })(),
    app_version: requiredText(unsafeInput.appVersion, 'appVersion', 40),
    build_number: requiredText(unsafeInput.buildNumber, 'buildNumber', 40),
    occurred_at_ms: boundedInteger(unsafeInput.occurredAtMs, 'occurredAtMs', Number.MAX_SAFE_INTEGER),
  };

  if (
    inputFieldsByEvent[governedEventName].includes('videoId')
    && !(governedEventName === 'youtube_channel_open' && unsafeInput.source === 'catalog')
  ) {
    payload.video_id = requiredYoutubeVideoId(unsafeInput.videoId);
  }
  if (governedEventName === 'youtube_video_select') {
    payload.video_title = normalizedVideoTitle(unsafeInput.videoTitle);
  }
  if (inputFieldsByEvent[governedEventName].includes('playbackId')) {
    payload.playback_id = requiredIdentifier(unsafeInput.playbackId, 'playbackId');
  }
  if (
    governedEventName === 'youtube_playback_checkpoint'
    || governedEventName === 'youtube_playback_end'
  ) {
    payload.active_watch_ms = boundedInteger(unsafeInput.activeWatchMs, 'activeWatchMs', MAX_YOUTUBE_PLAYBACK_MS);
    payload.position_ms = boundedInteger(unsafeInput.positionMs, 'positionMs', MAX_YOUTUBE_PLAYBACK_MS);
    payload.duration_ms = boundedInteger(unsafeInput.durationMs, 'durationMs', MAX_YOUTUBE_PLAYBACK_MS);
    payload.max_position_permille = boundedInteger(unsafeInput.maxPositionPermille, 'maxPositionPermille', 1_000);
  }
  if (governedEventName === 'youtube_playback_end') {
    const allowedEndReasons: readonly string[] = ['ended', 'screen_exit', 'external_open', 'error'];
    if (typeof unsafeInput.endReason !== 'string' || !allowedEndReasons.includes(unsafeInput.endReason)) {
      throw new Error('Invalid endReason');
    }
    payload.end_reason = unsafeInput.endReason;
  }

  return { eventName: governedEventName, payload };
}

export type YoutubePlayerMessage =
  | { version: 1; type: 'ready' }
  | {
    version: 1;
    type: 'state';
    state: 'playing' | 'paused' | 'buffering' | 'ended';
    positionMs: number;
    durationMs: number;
  }
  | { version: 1; type: 'error'; code: 2 | 5 | 100 | 101 | 150 };

type YoutubePlayerState = Extract<YoutubePlayerMessage, { type: 'state' }>['state'];

const playerStates = new Set<YoutubePlayerState>(['playing', 'paused', 'buffering', 'ended']);
const playerErrorCodes = new Set([2, 5, 100, 101, 150]);

export function parseYoutubePlayerMessage(raw: unknown): YoutubePlayerMessage | null {
  if (typeof raw !== 'string' || raw.length > MAX_YOUTUBE_PLAYER_MESSAGE_LENGTH) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.type !== 'string') return null;
  if (parsed.type === 'ready') return { version: 1, type: 'ready' };
  if (parsed.type === 'state') {
    if (
      typeof parsed.state !== 'string'
      || !playerStates.has(parsed.state as YoutubePlayerState)
    ) return null;
    try {
      return {
        version: 1,
        type: 'state',
        state: parsed.state as YoutubePlayerState,
        positionMs: boundedInteger(parsed.positionMs, 'positionMs', MAX_YOUTUBE_PLAYBACK_MS),
        durationMs: boundedInteger(parsed.durationMs, 'durationMs', MAX_YOUTUBE_PLAYBACK_MS),
      };
    } catch {
      return null;
    }
  }
  if (parsed.type === 'error') {
    if (
      typeof parsed.code !== 'number'
      || !Number.isInteger(parsed.code)
      || !playerErrorCodes.has(parsed.code)
    ) return null;
    return { version: 1, type: 'error', code: parsed.code as 2 | 5 | 100 | 101 | 150 };
  }
  return null;
}

export default function __RouteShim() { return null; }
