export const YOUTUBE_ANALYTICS_EVENT_NAMES = [
  'youtube_home_entry_click',
  'youtube_catalog_open',
  'youtube_video_select',
  'youtube_player_ready',
  'youtube_playback_start',
  'youtube_playback_checkpoint',
  'youtube_playback_end',
  'youtube_external_video_open',
  'youtube_channel_open',
] as const;

export type YoutubeAnalyticsEventName = typeof YOUTUBE_ANALYTICS_EVENT_NAMES[number];
export type YoutubeAnalyticsPlatform = 'all' | 'ios' | 'android';
export type YoutubeAnalyticsRangeDays = 7 | 28 | 90;

export interface YoutubeAnalyticsRequest {
  readonly rangeDays?: unknown;
  readonly platform?: unknown;
  readonly videoId?: unknown;
  readonly channelId?: unknown;
}

export interface NormalizedYoutubeAnalyticsRequest {
  readonly rangeDays: YoutubeAnalyticsRangeDays;
  readonly platform: YoutubeAnalyticsPlatform;
  readonly videoId?: string;
  readonly channelId?: string;
}

export class InvalidYoutubeAnalyticsRequestError extends Error {
  readonly code = 'invalid-youtube-analytics-request';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidYoutubeAnalyticsRequestError';
  }
}

const FILTER_ID = /^[A-Za-z0-9_-]{1,256}$/;
const TABLE_ID = /^[a-z][a-z0-9-]{4,61}[a-z0-9]\.[A-Za-z_][A-Za-z0-9_]{0,1023}\.events_\*$/;
const EVENT_SET = new Set<string>(YOUTUBE_ANALYTICS_EVENT_NAMES);
const PLAYBACK_EVENTS = new Set<YoutubeAnalyticsEventName>([
  'youtube_playback_start', 'youtube_playback_checkpoint', 'youtube_playback_end',
]);
const VIDEO_EVENTS = new Set<YoutubeAnalyticsEventName>([
  'youtube_video_select', 'youtube_player_ready', 'youtube_playback_start',
  'youtube_playback_checkpoint', 'youtube_playback_end', 'youtube_external_video_open',
]);
const MAX_METRIC_MS = 86_400_000;

function optionalFilter(value: unknown, field: string): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string') throw new InvalidYoutubeAnalyticsRequestError(`${field} must be a string`);
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!FILTER_ID.test(normalized)) throw new InvalidYoutubeAnalyticsRequestError(`${field} is invalid`);
  return normalized;
}

export function normalizeYoutubeAnalyticsRequest(request: YoutubeAnalyticsRequest): NormalizedYoutubeAnalyticsRequest {
  if (![7, 28, 90].includes(request.rangeDays as number)) {
    throw new InvalidYoutubeAnalyticsRequestError('rangeDays must be 7, 28, or 90');
  }
  if (!['all', 'ios', 'android'].includes(request.platform as string)) {
    throw new InvalidYoutubeAnalyticsRequestError('platform must be all, ios, or android');
  }
  const videoId = optionalFilter(request.videoId, 'videoId');
  const channelId = optionalFilter(request.channelId, 'channelId');
  return {
    rangeDays: request.rangeDays as YoutubeAnalyticsRangeDays,
    platform: request.platform as YoutubeAnalyticsPlatform,
    ...(videoId ? { videoId } : {}),
    ...(channelId ? { channelId } : {}),
  };
}

export function validateBigQueryEventsTable(value: string): string {
  if (typeof value !== 'string' || !TABLE_ID.test(value)) {
    throw new InvalidYoutubeAnalyticsRequestError('Invalid BigQuery Analytics events table');
  }
  return value;
}

export interface YoutubeAnalyticsFixtureParam {
  readonly key: unknown;
  readonly string_value?: unknown;
  readonly int_value?: unknown;
  readonly double_value?: unknown;
}

export interface YoutubeAnalyticsFixtureEvent {
  readonly event_name: YoutubeAnalyticsEventName | string;
  readonly event_timestamp: unknown;
  readonly schema_version: unknown;
  readonly event_id?: unknown;
  readonly user_pseudo_id?: unknown;
  readonly session_id?: unknown;
  readonly platform?: unknown;
  readonly channel_id?: unknown;
  readonly video_id?: unknown;
  readonly video_title?: unknown;
  readonly playback_id?: unknown;
  readonly active_watch_ms?: unknown;
  readonly duration_ms?: unknown;
  readonly position_ms?: unknown;
  readonly max_position_permille?: unknown;
  /** Ordered GA4 params. When supplied, these are authoritative over flat fixture conveniences. */
  readonly event_params?: readonly YoutubeAnalyticsFixtureParam[];
}

interface ValidEvent {
  readonly name: YoutubeAnalyticsEventName;
  readonly at: number;
  readonly schema: 1;
  readonly eventId: string;
  readonly user: string;
  readonly session: string;
  readonly platform: 'ios' | 'android';
  readonly channel: string;
  readonly video: string;
  readonly title: string;
  readonly playback: string;
  readonly active: number | null;
  readonly duration: number | null;
}

interface Attempt {
  readonly user: string;
  readonly session: string;
  readonly channel: string;
  readonly video: string;
  readonly playback: string;
  readonly startAt: number;
  readonly active: number;
  readonly duration: number | null;
  readonly ratio: number | null;
  readonly ended: boolean;
  readonly rows: readonly ValidEvent[];
}

export interface YoutubeAnalyticsSummary {
  homeClicks: number;
  catalogOpens: number;
  videoSelects: number;
  playerReady: number;
  playbackStarts: number;
  anonymousInstancesWithValidStart: number;
  watchAttempts: number;
  totalActiveWatchMs: number;
  averageActiveWatchMs: number | null;
  p50ActiveWatchMs: number | null;
  p90ActiveWatchMs: number | null;
  completed25: number;
  completed50: number;
  completed75: number;
  completed95: number;
  externalVideoOpens: number;
  channelOpens: number;
}

export interface YoutubeAnalyticsTrendRow {
  day: string;
  homeClicks: number;
  catalogOpens: number;
  videoSelects: number;
  playbackStarts: number;
  activeWatchMs: number;
}

export interface YoutubeAnalyticsFunnelRow {
  step: 'home' | 'catalog' | 'select' | 'start' | 'completed25' | 'completed75';
  status: 'ready' | 'not_applicable';
  count: number | null;
  percentOfPrevious: number | null;
}

export interface YoutubeAnalyticsVideoRow {
  channelId: string;
  videoId: string;
  title: string | null;
  videoSelects: number;
  playbackStarts: number;
  anonymousInstances: number;
  activeWatchMs: number;
  averageActiveWatchMs: number | null;
  p50ActiveWatchMs: number | null;
  p90ActiveWatchMs: number | null;
  completed25: number;
  completed50: number;
  completed75: number;
  completed95: number;
  externalVideoOpens: number;
}

export interface YoutubeAnalyticsQuality {
  state: 'ready' | 'empty' | 'partial';
  totalEvents: number;
  acceptedEvents: number;
  validationRatio: number;
  missingRequiredFields: number;
  duplicates: number;
  unknownSchema: number;
  duplicateParameterKeys: number;
  rowsWithoutStart: number;
  conflictingVideo: number;
  conflictingChannel: number;
  duplicateStartAttempts: number;
  invalidDurationAttempts: number;
  unfinishedAttempts: number;
  videosTruncated: boolean;
  videoRowsReturned: number;
}

const COMMON_GOVERNED_PARAMS = ['schema_version', 'event_id', 'session_id', 'platform', 'channel_id'] as const;

function materializeFixtureEvent(source: YoutubeAnalyticsFixtureEvent): {
  row: YoutubeAnalyticsFixtureEvent;
  duplicateRequiredParameters: boolean;
} {
  if (!source.event_params) return { row: source, duplicateRequiredParameters: false };
  const params = source.event_params;
  const first = (key: string) => params.find(param => param.key === key);
  const stringValue = (key: string) => first(key)?.string_value;
  const intValue = (key: string) => first(key)?.int_value;
  const required = new Set<string>(COMMON_GOVERNED_PARAMS);
  if (VIDEO_EVENTS.has(source.event_name as YoutubeAnalyticsEventName)) required.add('video_id');
  if (PLAYBACK_EVENTS.has(source.event_name as YoutubeAnalyticsEventName)) required.add('playback_id');
  if (source.event_name === 'youtube_playback_checkpoint' || source.event_name === 'youtube_playback_end') {
    required.add('active_watch_ms');
  }
  const counts = new Map<string, number>();
  for (const param of params) {
    if (typeof param.key === 'string') counts.set(param.key, (counts.get(param.key) ?? 0) + 1);
  }
  return {
    row: {
      event_name: source.event_name,
      event_timestamp: source.event_timestamp,
      user_pseudo_id: source.user_pseudo_id,
      schema_version: intValue('schema_version'),
      event_id: stringValue('event_id'),
      session_id: stringValue('session_id'),
      platform: stringValue('platform'),
      channel_id: stringValue('channel_id'),
      video_id: stringValue('video_id'),
      video_title: stringValue('video_title'),
      playback_id: stringValue('playback_id'),
      active_watch_ms: intValue('active_watch_ms'),
      duration_ms: intValue('duration_ms'),
      position_ms: intValue('position_ms'),
      max_position_permille: intValue('max_position_permille'),
      event_params: params,
    },
    duplicateRequiredParameters: [...required].some(key => (counts.get(key) ?? 0) > 1),
  };
}

export interface YoutubeAnalyticsSnapshot {
  filters: NormalizedYoutubeAnalyticsRequest;
  window: { fromMicros: number; toMicros: number };
  generatedAtMicros: number;
  dataThroughMicros: number | null;
  summary: YoutubeAnalyticsSummary;
  trend: YoutubeAnalyticsTrendRow[];
  funnel: YoutubeAnalyticsFunnelRow[];
  videos: YoutubeAnalyticsVideoRow[];
  quality: YoutubeAnalyticsQuality;
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) return false;
      index += 1;
    } else if (codeUnit >= 0xDC00 && codeUnit <= 0xDFFF) return false;
  }
  return true;
}

const DANGEROUS_TITLE_FORMATS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/u;

function hasUnsafeTextControls(value: string, title: boolean): boolean {
  return title ? /\p{Cc}/u.test(value) || DANGEROUS_TITLE_FORMATS.test(value) : /[\p{Cc}\p{Cf}]/u.test(value);
}

function boundedString(value: unknown, max = 256, title = false): string {
  if (typeof value !== 'string') return '';
  const result = value.trim();
  return result && isWellFormedUnicode(value) && !hasUnsafeTextControls(value, title) && [...result].length <= max ? result : '';
}

function trimmedFixtureDimension(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function metric(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_METRIC_MS ? parsed : null;
}

function tuple(...parts: string[]): string {
  return parts.map(part => `${part.length}:${part}`).join('|');
}

function codePointCompare(left: string, right: string): number {
  const a = Array.from(left, character => character.codePointAt(0) as number);
  const b = Array.from(right, character => character.codePointAt(0) as number);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

function percentileCont(values: readonly number[], percentile: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = percentile * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function utcDay(micros: number): string {
  return new Date(Math.floor(micros / 1000)).toISOString().slice(0, 10);
}

function validBase(row: YoutubeAnalyticsFixtureEvent): ValidEvent | null {
  if (!EVENT_SET.has(row.event_name)) return null;
  const name = row.event_name as YoutubeAnalyticsEventName;
  const at = integer(row.event_timestamp);
  const eventId = boundedString(row.event_id);
  const user = boundedString(row.user_pseudo_id);
  const session = boundedString(row.session_id);
  const platform = row.platform === 'ios' || row.platform === 'android' ? row.platform : '';
  const channel = boundedString(row.channel_id);
  const video = boundedString(row.video_id);
  const playback = boundedString(row.playback_id);
  if (at == null || at < 0 || !eventId || !user || !session || !platform || !channel) return null;
  if (VIDEO_EVENTS.has(name) && !video) return null;
  if (PLAYBACK_EVENTS.has(name) && !playback) return null;
  const active = metric(row.active_watch_ms);
  const duration = metric(row.duration_ms);
  if ((name === 'youtube_playback_checkpoint' || name === 'youtube_playback_end') && active == null) return null;
  return {
    name, at, schema: 1, eventId, user, session, platform, channel, video,
    title: boundedString(row.video_title, 4096, true), playback, active, duration,
  };
}

function matchesDimensionFilters(event: ValidEvent, filters: NormalizedYoutubeAnalyticsRequest): boolean {
  if (filters.platform !== 'all' && event.platform !== filters.platform) return false;
  if (filters.channelId && event.channel !== filters.channelId) return false;
  if (filters.videoId && event.video !== filters.videoId) return false;
  return true;
}

function attemptsFrom(
  events: readonly ValidEvent[],
  quality: YoutubeAnalyticsQuality,
  filters: NormalizedYoutubeAnalyticsRequest,
): Attempt[] {
  const candidates = new Map<string, ValidEvent[]>();
  for (const row of events) {
    if (!PLAYBACK_EVENTS.has(row.name)) continue;
    const key = tuple(row.user, row.playback, String(row.schema));
    const rows = candidates.get(key) ?? [];
    rows.push(row);
    candidates.set(key, rows);
  }
  const attempts: Attempt[] = [];
  for (const rows of candidates.values()) {
    if (!rows.some(row => matchesDimensionFilters(row, filters))) continue;
    const videos = new Set(rows.map(row => row.video).filter(Boolean));
    const channels = new Set(rows.map(row => row.channel).filter(Boolean));
    const conflictingVideo = videos.size > 1;
    const conflictingChannel = channels.size > 1;
    const starts = rows.filter(row => row.name === 'youtube_playback_start');
    if (conflictingVideo) quality.conflictingVideo += 1;
    if (conflictingChannel) quality.conflictingChannel += 1;
    if (!starts.length) quality.rowsWithoutStart += 1;
    if (starts.length > 1) quality.duplicateStartAttempts += 1;
    if (conflictingVideo || conflictingChannel || starts.length !== 1) continue;
    const start = starts[0];
    if (!matchesDimensionFilters(start, filters)) continue;
    const ownedRows = rows.filter(row => row.at >= start.at && matchesDimensionFilters(row, filters));
    const active = Math.max(0, ...ownedRows.map(row => row.active ?? 0));
    const positiveDurations = ownedRows.filter(row => row.duration != null && row.duration >= 1 && row.duration <= MAX_METRIC_MS)
      .sort((a, b) => b.at - a.at || codePointCompare(b.eventId, a.eventId));
    const duration = positiveDurations[0]?.duration ?? null;
    if (active > 0 && duration == null) quality.invalidDurationAttempts += 1;
    const ended = ownedRows.some(row => row.name === 'youtube_playback_end');
    if (active > 0 && !ended) quality.unfinishedAttempts += 1;
    attempts.push({
      user: start.user, session: start.session, channel: start.channel, video: start.video,
      playback: start.playback, startAt: start.at, active, duration,
      ratio: duration == null ? null : Math.min(active, duration) / duration,
      ended, rows: ownedRows,
    });
  }
  return attempts;
}

function emptySummary(): YoutubeAnalyticsSummary {
  return {
    homeClicks: 0, catalogOpens: 0, videoSelects: 0, playerReady: 0, playbackStarts: 0,
    anonymousInstancesWithValidStart: 0, watchAttempts: 0, totalActiveWatchMs: 0,
    averageActiveWatchMs: null, p50ActiveWatchMs: null, p90ActiveWatchMs: null,
    completed25: 0, completed50: 0, completed75: 0, completed95: 0,
    externalVideoOpens: 0, channelOpens: 0,
  };
}

function addEventCounts(summary: YoutubeAnalyticsSummary, events: readonly ValidEvent[]): void {
  for (const row of events) {
    if (row.name === 'youtube_home_entry_click') summary.homeClicks += 1;
    else if (row.name === 'youtube_catalog_open') summary.catalogOpens += 1;
    else if (row.name === 'youtube_video_select') summary.videoSelects += 1;
    else if (row.name === 'youtube_player_ready') summary.playerReady += 1;
    else if (row.name === 'youtube_external_video_open') summary.externalVideoOpens += 1;
    else if (row.name === 'youtube_channel_open') summary.channelOpens += 1;
  }
}

function funnelRows(events: readonly ValidEvent[], attempts: readonly Attempt[], videoFiltered: boolean): YoutubeAnalyticsFunnelRow[] {
  type Step = YoutubeAnalyticsFunnelRow['step'];
  interface Signal { step: Step; at: number; channel: string; video: string }
  const bySession = new Map<string, Signal[]>();
  const push = (user: string, session: string, signal: Signal) => {
    const key = tuple(user, session);
    const list = bySession.get(key) ?? [];
    list.push(signal);
    bySession.set(key, list);
  };
  for (const row of events) {
    const step = row.name === 'youtube_home_entry_click' ? 'home'
      : row.name === 'youtube_catalog_open' ? 'catalog'
        : row.name === 'youtube_video_select' ? 'select' : null;
    if (step) push(row.user, row.session, { step, at: row.at, channel: row.channel, video: row.video });
  }
  for (const attempt of attempts) {
    push(attempt.user, attempt.session, { step: 'start', at: attempt.startAt, channel: attempt.channel, video: attempt.video });
    for (const [step, threshold] of [['completed25', 0.25], ['completed75', 0.75]] as const) {
      const duration = attempt.duration;
      const crossings = duration == null ? [] : attempt.rows
        .filter(row => row.active != null
          && Math.min(row.active, duration) / duration >= threshold)
        .sort((a, b) => a.at - b.at || codePointCompare(a.eventId, b.eventId));
      crossings.forEach(crossing => push(attempt.user, attempt.session, {
        step, at: crossing.at, channel: attempt.channel, video: attempt.video,
      }));
    }
  }
  const steps: Step[] = ['home', 'catalog', 'select', 'start', 'completed25', 'completed75'];
  const counts = new Map<Step, number>(steps.map(step => [step, 0]));
  for (const signals of bySession.values()) {
    const startIndex = videoFiltered ? 2 : 0;
    const canReach = (targetIndex: number, index = startIndex, previousAt = -1, channel = '', video = ''): boolean => {
      if (index > targetIndex) return true;
      const step = steps[index];
      return signals.some(signal => {
        if (signal.step !== step || signal.at <= previousAt) return false;
        if (index > 2 && (signal.channel !== channel || signal.video !== video)) return false;
        return canReach(
          targetIndex,
          index + 1,
          signal.at,
          step === 'select' ? signal.channel : channel,
          step === 'select' ? signal.video : video,
        );
      });
    };
    for (let index = startIndex; index < steps.length; index += 1) {
      if (canReach(index)) counts.set(steps[index], (counts.get(steps[index]) ?? 0) + 1);
    }
  }
  let previous: number | null = null;
  return steps.map((step, index) => {
    if (videoFiltered && index < 2) return { step, status: 'not_applicable', count: null, percentOfPrevious: null };
    const count = counts.get(step) ?? 0;
    const row: YoutubeAnalyticsFunnelRow = {
      step, status: 'ready', count,
      percentOfPrevious: previous == null || previous === 0 ? null : count / previous,
    };
    previous = count;
    return row;
  });
}

export function aggregateYoutubeAnalytics(
  rows: readonly YoutubeAnalyticsFixtureEvent[],
  input: {
    readonly fromMicros: number;
    readonly toMicros: number;
    readonly generatedAtMicros: number;
    readonly filters: NormalizedYoutubeAnalyticsRequest;
  },
): YoutubeAnalyticsSnapshot {
  if (!Number.isSafeInteger(input.fromMicros) || !Number.isSafeInteger(input.toMicros)
    || input.fromMicros < 0 || input.fromMicros >= input.toMicros) {
    throw new InvalidYoutubeAnalyticsRequestError('fromMicros and toMicros must be safe integers with from < to');
  }
  if (!Number.isSafeInteger(input.generatedAtMicros) || input.generatedAtMicros < input.toMicros) {
    throw new InvalidYoutubeAnalyticsRequestError('generatedAtMicros is invalid');
  }
  const filters = normalizeYoutubeAnalyticsRequest(input.filters);
  const quality: YoutubeAnalyticsQuality = {
    state: 'empty', totalEvents: 0, acceptedEvents: 0, validationRatio: 0,
    missingRequiredFields: 0, duplicates: 0, unknownSchema: 0, duplicateParameterKeys: 0, rowsWithoutStart: 0,
    conflictingVideo: 0, conflictingChannel: 0, duplicateStartAttempts: 0,
    invalidDurationAttempts: 0, unfinishedAttempts: 0, videosTruncated: false, videoRowsReturned: 0,
  };
  let dataThroughMicros: number | null = null;
  const validated: ValidEvent[] = [];
  for (const source of rows) {
    const { row, duplicateRequiredParameters } = materializeFixtureEvent(source);
    const at = integer(row.event_timestamp);
    if (!EVENT_SET.has(row.event_name) || at == null || at < input.fromMicros || at >= input.toMicros) continue;
    const rawInScope = (filters.platform === 'all' || row.platform === filters.platform)
      && (!filters.channelId || trimmedFixtureDimension(row.channel_id) === filters.channelId)
      && (!filters.videoId || trimmedFixtureDimension(row.video_id) === filters.videoId);
    if (rawInScope) {
      quality.totalEvents += 1;
      dataThroughMicros = Math.max(dataThroughMicros ?? at, at);
    }
    if (duplicateRequiredParameters) { if (rawInScope) quality.duplicateParameterKeys += 1; continue; }
    if (row.schema_version !== 1) { if (rawInScope) quality.unknownSchema += 1; continue; }
    const valid = validBase(row);
    if (!valid) { if (rawInScope) quality.missingRequiredFields += 1; continue; }
    if (filters.platform === 'all' || valid.platform === filters.platform) validated.push(valid);
  }
  validated.sort((a, b) => a.at - b.at || codePointCompare(a.eventId, b.eventId)
    || codePointCompare(a.name, b.name) || codePointCompare(a.user, b.user) || codePointCompare(a.session, b.session)
    || codePointCompare(a.platform, b.platform) || codePointCompare(a.playback, b.playback)
    || codePointCompare(a.video, b.video) || codePointCompare(a.channel, b.channel) || codePointCompare(a.title, b.title)
    || (a.active ?? -1) - (b.active ?? -1) || (a.duration ?? -1) - (b.duration ?? -1));
  const seen = new Set<string>();
  const deduped: ValidEvent[] = [];
  for (const row of validated) {
    if (row.eventId && seen.has(row.eventId)) {
      if (matchesDimensionFilters(row, filters)) quality.duplicates += 1;
      continue;
    }
    if (row.eventId) seen.add(row.eventId);
    deduped.push(row);
  }
  // Candidate invariants are global; counters/attempts are emitted only for candidates intersecting the selected slice.
  const attempts = attemptsFrom(deduped, quality, filters);
  const ownedPlaybackEventIds = new Set(attempts.flatMap(attempt => attempt.rows.map(row => row.eventId)));
  const accepted = deduped.filter(row => matchesDimensionFilters(row, filters)
    && (!PLAYBACK_EVENTS.has(row.name) || ownedPlaybackEventIds.has(row.eventId)));
  quality.acceptedEvents = accepted.length;
  quality.validationRatio = quality.totalEvents ? quality.acceptedEvents / quality.totalEvents : 0;

  const summary = emptySummary();
  addEventCounts(summary, accepted);
  summary.playbackStarts = attempts.length;
  summary.anonymousInstancesWithValidStart = new Set(attempts.map(row => row.user)).size;
  const watches = attempts.filter(row => row.active > 0);
  const activeValues = watches.map(row => row.active);
  summary.watchAttempts = watches.length;
  summary.totalActiveWatchMs = activeValues.reduce((sum, value) => sum + value, 0);
  summary.averageActiveWatchMs = activeValues.length ? summary.totalActiveWatchMs / activeValues.length : null;
  summary.p50ActiveWatchMs = percentileCont(activeValues, 0.5);
  summary.p90ActiveWatchMs = percentileCont(activeValues, 0.9);
  summary.completed25 = watches.filter(row => (row.ratio ?? -1) >= 0.25).length;
  summary.completed50 = watches.filter(row => (row.ratio ?? -1) >= 0.5).length;
  summary.completed75 = watches.filter(row => (row.ratio ?? -1) >= 0.75).length;
  summary.completed95 = watches.filter(row => (row.ratio ?? -1) >= 0.95).length;

  const trendMap = new Map<string, YoutubeAnalyticsTrendRow>();
  const firstUtcMidnightMicros = Date.parse(`${utcDay(input.fromMicros)}T00:00:00.000Z`) * 1000;
  for (let cursor = firstUtcMidnightMicros; cursor < input.toMicros; cursor += 86_400_000_000) {
    const day = utcDay(cursor);
    trendMap.set(day, { day, homeClicks: 0, catalogOpens: 0, videoSelects: 0, playbackStarts: 0, activeWatchMs: 0 });
  }
  for (const row of accepted) {
    const trend = trendMap.get(utcDay(row.at));
    if (!trend) continue;
    if (row.name === 'youtube_home_entry_click') trend.homeClicks += 1;
    else if (row.name === 'youtube_catalog_open') trend.catalogOpens += 1;
    else if (row.name === 'youtube_video_select') trend.videoSelects += 1;
  }
  for (const attempt of attempts) {
    const trend = trendMap.get(utcDay(attempt.startAt));
    if (trend) { trend.playbackStarts += 1; if (attempt.active > 0) trend.activeWatchMs += attempt.active; }
  }

  const latestTitles = new Map<string, { at: number; eventId: string; title: string }>();
  for (const row of accepted) {
    if (row.name !== 'youtube_video_select' || !row.title) continue;
    const key = tuple(row.channel, row.video);
    const previous = latestTitles.get(key);
    if (!previous || row.at > previous.at || (row.at === previous.at && codePointCompare(row.eventId, previous.eventId) > 0)) {
      latestTitles.set(key, { at: row.at, eventId: row.eventId, title: [...row.title].slice(0, 100).join('') });
    }
  }
  const pairs = new Map<string, { channel: string; video: string; selects: number; externalOpens: number; attempts: Attempt[] }>();
  const ensurePair = (channel: string, video: string) => {
    const key = tuple(channel, video);
    const existing = pairs.get(key) ?? { channel, video, selects: 0, externalOpens: 0, attempts: [] };
    pairs.set(key, existing);
    return existing;
  };
  accepted.filter(row => row.name === 'youtube_video_select').forEach(row => { ensurePair(row.channel, row.video).selects += 1; });
  accepted.filter(row => row.name === 'youtube_external_video_open').forEach(row => { ensurePair(row.channel, row.video).externalOpens += 1; });
  attempts.forEach(attempt => ensurePair(attempt.channel, attempt.video).attempts.push(attempt));
  const allVideos: YoutubeAnalyticsVideoRow[] = [...pairs.values()].map(pair => {
    const pairWatches = pair.attempts.filter(attempt => attempt.active > 0);
    const values = pairWatches.map(attempt => attempt.active);
    const activeWatchMs = values.reduce((sum, value) => sum + value, 0);
    return {
      channelId: pair.channel, videoId: pair.video,
      title: latestTitles.get(tuple(pair.channel, pair.video))?.title ?? null,
      videoSelects: pair.selects, playbackStarts: pair.attempts.length,
      anonymousInstances: new Set(pair.attempts.map(attempt => attempt.user)).size,
      activeWatchMs, averageActiveWatchMs: values.length ? activeWatchMs / values.length : null,
      p50ActiveWatchMs: percentileCont(values, 0.5), p90ActiveWatchMs: percentileCont(values, 0.9),
      completed25: pairWatches.filter(attempt => (attempt.ratio ?? -1) >= 0.25).length,
      completed50: pairWatches.filter(attempt => (attempt.ratio ?? -1) >= 0.5).length,
      completed75: pairWatches.filter(attempt => (attempt.ratio ?? -1) >= 0.75).length,
      completed95: pairWatches.filter(attempt => (attempt.ratio ?? -1) >= 0.95).length,
      externalVideoOpens: pair.externalOpens,
    };
  }).sort((a, b) => b.playbackStarts - a.playbackStarts || b.activeWatchMs - a.activeWatchMs
    || codePointCompare(a.channelId, b.channelId) || codePointCompare(a.videoId, b.videoId));
  quality.videosTruncated = allVideos.length > 200;
  const videos = allVideos.slice(0, 200);
  quality.videoRowsReturned = videos.length;
  const defects = quality.missingRequiredFields + quality.duplicates + quality.unknownSchema + quality.duplicateParameterKeys + quality.rowsWithoutStart
    + quality.conflictingVideo + quality.conflictingChannel + quality.duplicateStartAttempts + quality.invalidDurationAttempts;
  quality.state = quality.acceptedEvents === 0 ? 'empty' : defects > 0 ? 'partial' : 'ready';

  return {
    filters, window: { fromMicros: input.fromMicros, toMicros: input.toMicros },
    generatedAtMicros: input.generatedAtMicros, dataThroughMicros, summary,
    trend: [...trendMap.values()], funnel: funnelRows(accepted, attempts, Boolean(filters.videoId)),
    videos, quality,
  };
}

export type YoutubeAnalyticsQueryRowKind = 'summary' | 'trend' | 'funnel' | 'video' | 'quality';
export interface YoutubeAnalyticsQueryRow {
  readonly row_kind?: unknown;
  readonly payload_json?: unknown;
}

export interface YoutubeAnalyticsQueryParams {
  readonly fromMicros: number;
  readonly toMicros: number;
  readonly fromSuffix: string;
  readonly toSuffix: string;
  readonly platform: YoutubeAnalyticsPlatform;
  readonly videoId: string | null;
  readonly channelId: string | null;
}

export interface YoutubeAnalyticsDryRunConfig {
  readonly query: string;
  readonly params: YoutubeAnalyticsQueryParams;
  readonly types: Readonly<Record<keyof YoutubeAnalyticsQueryParams, 'INT64' | 'STRING'>>;
  readonly useLegacySql: false;
}

function queryPayload(row: YoutubeAnalyticsQueryRow): Record<string, unknown> {
  if (Object.keys(row as object).sort().join(',') !== 'payload_json,row_kind'
    || typeof row.payload_json !== 'string' || Buffer.byteLength(row.payload_json, 'utf8') > 8192) {
    throw new InvalidYoutubeAnalyticsRequestError('Invalid YouTube analytics query payload');
  }
  try {
    const parsed: unknown = JSON.parse(row.payload_json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new InvalidYoutubeAnalyticsRequestError('Invalid YouTube analytics query JSON');
  }
}

function exactPayloadKeys(payload: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(payload).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new InvalidYoutubeAnalyticsRequestError('Unexpected YouTube analytics payload fields');
  }
}

function queryNumber(payload: Record<string, unknown>, field: string, nullable = false): number | null {
  const raw = payload[field];
  if (raw == null && nullable) return null;
  const value = typeof raw === 'string' && /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new InvalidYoutubeAnalyticsRequestError(`Invalid query field: ${field}`);
  }
  return value;
}

function queryCount(payload: Record<string, unknown>, field: string): number {
  const value = queryNumber(payload, field);
  if (value == null || !Number.isSafeInteger(value)) throw new InvalidYoutubeAnalyticsRequestError(`Invalid count: ${field}`);
  return value;
}

function queryText(payload: Record<string, unknown>, field: string, nullable = false, max = 256, title = false): string | null {
  const value = payload[field];
  if (value == null && nullable) return null;
  if (typeof value !== 'string' || !value || value !== value.trim() || !isWellFormedUnicode(value)
    || hasUnsafeTextControls(value, title) || [...value].length > max) {
    throw new InvalidYoutubeAnalyticsRequestError(`Invalid query field: ${field}`);
  }
  return value;
}

function decodeSummary(payload: Record<string, unknown>): YoutubeAnalyticsSummary {
  const countFields = [
    'homeClicks', 'catalogOpens', 'videoSelects', 'playerReady', 'playbackStarts',
    'anonymousInstancesWithValidStart', 'watchAttempts', 'totalActiveWatchMs',
    'completed25', 'completed50', 'completed75', 'completed95', 'externalVideoOpens', 'channelOpens',
  ] as const;
  exactPayloadKeys(payload, [...countFields, 'averageActiveWatchMs', 'p50ActiveWatchMs', 'p90ActiveWatchMs']);
  const counts = Object.fromEntries(countFields.map(field => [field, queryCount(payload, field)])) as unknown as Pick<YoutubeAnalyticsSummary, typeof countFields[number]>;
  return {
    ...counts,
    averageActiveWatchMs: queryNumber(payload, 'averageActiveWatchMs', true),
    p50ActiveWatchMs: queryNumber(payload, 'p50ActiveWatchMs', true),
    p90ActiveWatchMs: queryNumber(payload, 'p90ActiveWatchMs', true),
  };
}

function decodeTrend(payload: Record<string, unknown>): YoutubeAnalyticsTrendRow {
  exactPayloadKeys(payload, ['day', 'homeClicks', 'catalogOpens', 'videoSelects', 'playbackStarts', 'activeWatchMs']);
  const day = queryText(payload, 'day') as string;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new InvalidYoutubeAnalyticsRequestError('Invalid trend day');
  return {
    day,
    homeClicks: queryCount(payload, 'homeClicks'),
    catalogOpens: queryCount(payload, 'catalogOpens'),
    videoSelects: queryCount(payload, 'videoSelects'),
    playbackStarts: queryCount(payload, 'playbackStarts'),
    activeWatchMs: queryCount(payload, 'activeWatchMs'),
  };
}

const FUNNEL_STEPS: YoutubeAnalyticsFunnelRow['step'][] = ['home', 'catalog', 'select', 'start', 'completed25', 'completed75'];

function decodeFunnel(payload: Record<string, unknown>): YoutubeAnalyticsFunnelRow {
  exactPayloadKeys(payload, ['step', 'status', 'count', 'percentOfPrevious']);
  const step = queryText(payload, 'step') as YoutubeAnalyticsFunnelRow['step'];
  const status = queryText(payload, 'status') as YoutubeAnalyticsFunnelRow['status'];
  if (!FUNNEL_STEPS.includes(step) || !['ready', 'not_applicable'].includes(status)) {
    throw new InvalidYoutubeAnalyticsRequestError('Invalid funnel row');
  }
  const count = queryNumber(payload, 'count', true);
  const percent = queryNumber(payload, 'percentOfPrevious', true);
  if (count != null && !Number.isSafeInteger(count)) throw new InvalidYoutubeAnalyticsRequestError('Invalid funnel count');
  if (percent != null && percent > 1) throw new InvalidYoutubeAnalyticsRequestError('Invalid funnel percentage');
  if (status === 'not_applicable' && (count != null || percent != null)) throw new InvalidYoutubeAnalyticsRequestError('Invalid not-applicable funnel row');
  return { step, status, count, percentOfPrevious: percent };
}

function decodeVideo(payload: Record<string, unknown>): YoutubeAnalyticsVideoRow {
  exactPayloadKeys(payload, ['channelId', 'videoId', 'title', 'videoSelects', 'playbackStarts', 'anonymousInstances',
    'activeWatchMs', 'averageActiveWatchMs', 'p50ActiveWatchMs', 'p90ActiveWatchMs',
    'completed25', 'completed50', 'completed75', 'completed95', 'externalVideoOpens']);
  const title = queryText(payload, 'title', true, 100, true);
  return {
    channelId: queryText(payload, 'channelId') as string,
    videoId: queryText(payload, 'videoId') as string,
    title,
    videoSelects: queryCount(payload, 'videoSelects'),
    playbackStarts: queryCount(payload, 'playbackStarts'),
    anonymousInstances: queryCount(payload, 'anonymousInstances'),
    activeWatchMs: queryCount(payload, 'activeWatchMs'),
    averageActiveWatchMs: queryNumber(payload, 'averageActiveWatchMs', true),
    p50ActiveWatchMs: queryNumber(payload, 'p50ActiveWatchMs', true),
    p90ActiveWatchMs: queryNumber(payload, 'p90ActiveWatchMs', true),
    completed25: queryCount(payload, 'completed25'),
    completed50: queryCount(payload, 'completed50'),
    completed75: queryCount(payload, 'completed75'),
    completed95: queryCount(payload, 'completed95'),
    externalVideoOpens: queryCount(payload, 'externalVideoOpens'),
  };
}

function decodeQuality(payload: Record<string, unknown>): YoutubeAnalyticsQuality & { dataThroughMicros: number | null } {
  exactPayloadKeys(payload, ['state', 'totalEvents', 'acceptedEvents', 'validationRatio', 'missingRequiredFields',
    'duplicates', 'unknownSchema', 'duplicateParameterKeys', 'rowsWithoutStart', 'conflictingVideo',
    'conflictingChannel', 'duplicateStartAttempts', 'invalidDurationAttempts', 'unfinishedAttempts', 'dataThroughMicros']);
  const state = queryText(payload, 'state') as YoutubeAnalyticsQuality['state'];
  if (!['ready', 'empty', 'partial'].includes(state)) throw new InvalidYoutubeAnalyticsRequestError('Invalid quality state');
  const validationRatio = queryNumber(payload, 'validationRatio') as number;
  if (validationRatio > 1) throw new InvalidYoutubeAnalyticsRequestError('Invalid validation ratio');
  return {
    state,
    totalEvents: queryCount(payload, 'totalEvents'),
    acceptedEvents: queryCount(payload, 'acceptedEvents'),
    validationRatio,
    missingRequiredFields: queryCount(payload, 'missingRequiredFields'),
    duplicates: queryCount(payload, 'duplicates'),
    unknownSchema: queryCount(payload, 'unknownSchema'),
    duplicateParameterKeys: queryCount(payload, 'duplicateParameterKeys'),
    rowsWithoutStart: queryCount(payload, 'rowsWithoutStart'),
    conflictingVideo: queryCount(payload, 'conflictingVideo'),
    conflictingChannel: queryCount(payload, 'conflictingChannel'),
    duplicateStartAttempts: queryCount(payload, 'duplicateStartAttempts'),
    invalidDurationAttempts: queryCount(payload, 'invalidDurationAttempts'),
    unfinishedAttempts: queryCount(payload, 'unfinishedAttempts'),
    videosTruncated: false,
    videoRowsReturned: 0,
    dataThroughMicros: queryNumber(payload, 'dataThroughMicros', true),
  };
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

function assertWatchStatistics(
  attempts: number,
  total: number,
  average: number | null,
  p50: number | null,
  p90: number | null,
): void {
  const statistics = [average, p50, p90];
  if ((attempts === 0) !== statistics.every(value => value == null)
    || (attempts === 0) !== (total === 0)
    || total > attempts * MAX_METRIC_MS
    || (attempts > 0 && (statistics.some(value => value == null)
      || !nearlyEqual(average as number, total / attempts)
      || statistics.some(value => (value as number) > MAX_METRIC_MS || (value as number) > total)
      || (p50 as number) > (p90 as number)))) {
    throw new InvalidYoutubeAnalyticsRequestError('Inconsistent watch statistics');
  }
}

function expectedUtcDays(fromMicros: number, toMicros: number): string[] {
  const days: string[] = [];
  const first = Date.parse(`${utcDay(fromMicros)}T00:00:00.000Z`) * 1000;
  for (let cursor = first; cursor < toMicros; cursor += 86_400_000_000) days.push(utcDay(cursor));
  return days;
}

export function decodeYoutubeAnalyticsQueryRows(
  rows: readonly YoutubeAnalyticsQueryRow[],
  context: {
    readonly fromMicros: number;
    readonly toMicros: number;
    readonly generatedAtMicros: number;
    readonly filters: NormalizedYoutubeAnalyticsRequest;
  },
): YoutubeAnalyticsSnapshot {
  if (!Number.isSafeInteger(context.fromMicros) || !Number.isSafeInteger(context.toMicros)
    || context.fromMicros < 0 || context.fromMicros >= context.toMicros) {
    throw new InvalidYoutubeAnalyticsRequestError('Invalid decoder window');
  }
  if (!Number.isSafeInteger(context.generatedAtMicros) || context.generatedAtMicros < context.toMicros) {
    throw new InvalidYoutubeAnalyticsRequestError('Invalid decoder generation time');
  }
  const filters = normalizeYoutubeAnalyticsRequest(context.filters);
  if (rows.length > 400) throw new InvalidYoutubeAnalyticsRequestError('Too many YouTube analytics query rows');
  let summary: YoutubeAnalyticsSummary | null = null;
  let qualityWithData: ReturnType<typeof decodeQuality> | null = null;
  const trend: YoutubeAnalyticsTrendRow[] = [];
  const funnel: YoutubeAnalyticsFunnelRow[] = [];
  const videos: YoutubeAnalyticsVideoRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new InvalidYoutubeAnalyticsRequestError('Invalid YouTube analytics query row');
    }
    if (!['summary', 'trend', 'funnel', 'video', 'quality'].includes(row.row_kind as string)) {
      throw new InvalidYoutubeAnalyticsRequestError('Unknown YouTube analytics row kind');
    }
    const payload = queryPayload(row);
    if (row.row_kind === 'summary') {
      if (summary) throw new InvalidYoutubeAnalyticsRequestError('Duplicate summary row');
      summary = decodeSummary(payload);
    } else if (row.row_kind === 'trend') trend.push(decodeTrend(payload));
    else if (row.row_kind === 'funnel') funnel.push(decodeFunnel(payload));
    else if (row.row_kind === 'video') videos.push(decodeVideo(payload));
    else if (row.row_kind === 'quality') {
      if (qualityWithData) throw new InvalidYoutubeAnalyticsRequestError('Duplicate quality row');
      qualityWithData = decodeQuality(payload);
    }
  }
  if (!summary || !qualityWithData) throw new InvalidYoutubeAnalyticsRequestError('Incomplete YouTube analytics query result');
  const expectedDays = expectedUtcDays(context.fromMicros, context.toMicros);
  if (trend.length !== expectedDays.length || trend.some((row, index) => row.day !== expectedDays[index])) {
    throw new InvalidYoutubeAnalyticsRequestError('Incomplete or unordered trend rows');
  }
  if (trend.reduce((sum, row) => sum + row.homeClicks, 0) !== summary.homeClicks
    || trend.reduce((sum, row) => sum + row.catalogOpens, 0) !== summary.catalogOpens
    || trend.reduce((sum, row) => sum + row.videoSelects, 0) !== summary.videoSelects
    || trend.reduce((sum, row) => sum + row.playbackStarts, 0) !== summary.playbackStarts
    || trend.reduce((sum, row) => sum + row.activeWatchMs, 0) !== summary.totalActiveWatchMs) {
    throw new InvalidYoutubeAnalyticsRequestError('Trend totals do not match summary');
  }
  if (funnel.length !== FUNNEL_STEPS.length || new Set(funnel.map(row => row.step)).size !== FUNNEL_STEPS.length) {
    throw new InvalidYoutubeAnalyticsRequestError('Incomplete funnel rows');
  }
  if (funnel.some((row, index) => row.step !== FUNNEL_STEPS[index])) {
    throw new InvalidYoutubeAnalyticsRequestError('Unordered funnel rows');
  }
  let previousCount: number | null = null;
  for (let index = 0; index < funnel.length; index += 1) {
    const row = funnel[index];
    const mustBeUnavailable = Boolean(filters.videoId) && index < 2;
    if (mustBeUnavailable !== (row.status === 'not_applicable')
      || (row.status === 'ready' && row.count == null)) {
      throw new InvalidYoutubeAnalyticsRequestError('Invalid funnel applicability');
    }
    if (row.status === 'ready') {
      if (previousCount != null && (row.count as number) > previousCount) {
        throw new InvalidYoutubeAnalyticsRequestError('Non-monotonic funnel rows');
      }
      const expectedPercent = previousCount == null || previousCount === 0 ? null : (row.count as number) / previousCount;
      if ((expectedPercent == null) !== (row.percentOfPrevious == null)
        || (expectedPercent != null && !nearlyEqual(row.percentOfPrevious as number, expectedPercent))) {
        throw new InvalidYoutubeAnalyticsRequestError('Inconsistent funnel percentage');
      }
      previousCount = row.count as number;
    }
  }
  const funnelBounds = [summary.homeClicks, summary.catalogOpens, summary.videoSelects, summary.playbackStarts,
    summary.completed25, summary.completed75];
  if (funnel.some((row, index) => row.count != null && row.count > funnelBounds[index])) {
    throw new InvalidYoutubeAnalyticsRequestError('Funnel exceeds summary');
  }
  const compareVideos = (a: YoutubeAnalyticsVideoRow, b: YoutubeAnalyticsVideoRow) => b.playbackStarts - a.playbackStarts
    || b.activeWatchMs - a.activeWatchMs || codePointCompare(a.channelId, b.channelId) || codePointCompare(a.videoId, b.videoId);
  if (videos.some((row, index) => index > 0 && compareVideos(videos[index - 1], row) > 0)) {
    throw new InvalidYoutubeAnalyticsRequestError('Unordered video rows');
  }
  if (videos.length > 201) throw new InvalidYoutubeAnalyticsRequestError('YouTube analytics video row limit exceeded');
  const videoKeys = new Set(videos.map(row => tuple(row.channelId, row.videoId)));
  if (videoKeys.size !== videos.length) throw new InvalidYoutubeAnalyticsRequestError('Duplicate video rows');
  for (const video of videos) {
    if (video.completed95 > video.completed75 || video.completed75 > video.completed50
      || video.completed50 > video.completed25 || video.completed25 > video.playbackStarts
      || video.anonymousInstances > video.playbackStarts) {
      throw new InvalidYoutubeAnalyticsRequestError('Inconsistent video metrics');
    }
    const videoStats = [video.averageActiveWatchMs, video.p50ActiveWatchMs, video.p90ActiveWatchMs];
    if ((video.activeWatchMs === 0) !== videoStats.every(value => value == null)
      || (video.activeWatchMs > 0 && (videoStats.some(value => value == null)
        || (video.p50ActiveWatchMs as number) > (video.p90ActiveWatchMs as number)
        || videoStats.some(value => (value as number) > MAX_METRIC_MS || (value as number) > video.activeWatchMs)))) {
      throw new InvalidYoutubeAnalyticsRequestError('Inconsistent video watch statistics');
    }
  }
  const videosTruncated = videos.length > 200;
  const boundedVideos = videos.slice(0, 200);
  const { dataThroughMicros, ...qualityBase } = qualityWithData;
  if (summary.completed95 > summary.completed75 || summary.completed75 > summary.completed50
    || summary.completed50 > summary.completed25 || summary.completed25 > summary.watchAttempts
    || summary.watchAttempts > summary.playbackStarts
    || summary.anonymousInstancesWithValidStart > summary.playbackStarts) {
    throw new InvalidYoutubeAnalyticsRequestError('Inconsistent summary thresholds');
  }
  assertWatchStatistics(summary.watchAttempts, summary.totalActiveWatchMs, summary.averageActiveWatchMs,
    summary.p50ActiveWatchMs, summary.p90ActiveWatchMs);
  const defects = qualityBase.missingRequiredFields + qualityBase.duplicates + qualityBase.unknownSchema
    + qualityBase.duplicateParameterKeys + qualityBase.rowsWithoutStart + qualityBase.conflictingVideo
    + qualityBase.conflictingChannel + qualityBase.duplicateStartAttempts + qualityBase.invalidDurationAttempts;
  const expectedState: YoutubeAnalyticsQuality['state'] = qualityBase.acceptedEvents === 0
    ? 'empty' : defects > 0 ? 'partial' : 'ready';
  const boundedQualityCounters = [qualityBase.missingRequiredFields, qualityBase.duplicates, qualityBase.unknownSchema,
    qualityBase.duplicateParameterKeys, qualityBase.rowsWithoutStart, qualityBase.conflictingVideo,
    qualityBase.conflictingChannel, qualityBase.duplicateStartAttempts];
  if (qualityBase.acceptedEvents > qualityBase.totalEvents || qualityBase.state !== expectedState
    || qualityBase.missingRequiredFields + qualityBase.unknownSchema + qualityBase.duplicateParameterKeys > qualityBase.totalEvents
    || boundedQualityCounters.some(value => value > qualityBase.totalEvents)
    || qualityBase.invalidDurationAttempts > summary.playbackStarts || qualityBase.unfinishedAttempts > summary.playbackStarts
    || !nearlyEqual(qualityBase.validationRatio, qualityBase.totalEvents ? qualityBase.acceptedEvents / qualityBase.totalEvents : 0)
    || (qualityBase.totalEvents === 0) !== (dataThroughMicros == null)
    || (dataThroughMicros != null && (dataThroughMicros < context.fromMicros || dataThroughMicros >= context.toMicros
      || dataThroughMicros > context.generatedAtMicros))) {
    throw new InvalidYoutubeAnalyticsRequestError('Inconsistent quality row');
  }
  const sumVideo = (field: 'videoSelects' | 'playbackStarts' | 'activeWatchMs' | 'completed25' | 'completed50' | 'completed75' | 'completed95' | 'externalVideoOpens') =>
    videos.reduce((sum, video) => sum + video[field], 0);
  const videoPairs: Array<[ReturnType<typeof sumVideo>, number]> = [
    [sumVideo('videoSelects'), summary.videoSelects], [sumVideo('playbackStarts'), summary.playbackStarts],
    [sumVideo('activeWatchMs'), summary.totalActiveWatchMs], [sumVideo('completed25'), summary.completed25],
    [sumVideo('completed50'), summary.completed50], [sumVideo('completed75'), summary.completed75],
    [sumVideo('completed95'), summary.completed95],
    [sumVideo('externalVideoOpens'), summary.externalVideoOpens],
  ];
  if (videoPairs.some(([actual, expected]) => videosTruncated ? actual > expected : actual !== expected)) {
    throw new InvalidYoutubeAnalyticsRequestError('Video totals do not match summary');
  }
  return {
    filters,
    window: { fromMicros: context.fromMicros, toMicros: context.toMicros },
    generatedAtMicros: context.generatedAtMicros,
    dataThroughMicros,
    summary,
    trend,
    funnel,
    videos: boundedVideos,
    quality: { ...qualityBase, videosTruncated, videoRowsReturned: boundedVideos.length },
  };
}

function suffixForMicros(micros: number): string {
  return new Date(Math.floor(micros / 1000)).toISOString().slice(0, 10).replace(/-/g, '');
}

export function buildYoutubeAnalyticsSql(
  eventsTable: string,
  input: { readonly fromMicros: number; readonly toMicros: number; readonly filters: NormalizedYoutubeAnalyticsRequest },
): { sql: string; params: YoutubeAnalyticsQueryParams; rowKinds: readonly YoutubeAnalyticsQueryRowKind[] } {
  const table = validateBigQueryEventsTable(eventsTable);
  if (!Number.isSafeInteger(input.fromMicros) || !Number.isSafeInteger(input.toMicros)
    || input.fromMicros < 0 || input.toMicros < 0 || input.fromMicros >= input.toMicros) {
    throw new InvalidYoutubeAnalyticsRequestError('Invalid SQL window');
  }
  const filters = normalizeYoutubeAnalyticsRequest(input.filters);
  const params: YoutubeAnalyticsQueryParams = {
    fromMicros: input.fromMicros,
    toMicros: input.toMicros,
    fromSuffix: suffixForMicros(input.fromMicros),
    toSuffix: suffixForMicros(input.toMicros - 1),
    platform: filters.platform,
    videoId: filters.videoId ?? null,
    channelId: filters.channelId ?? null,
  };
  const allowlist = YOUTUBE_ANALYTICS_EVENT_NAMES.map(name => `'${name}'`).join(', ');
  return {
    params,
    rowKinds: ['summary', 'trend', 'funnel', 'video', 'quality'],
    sql: `
WITH raw_param_rows AS (
  SELECT event_name,event_timestamp,user_pseudo_id,
    (SELECT AS STRUCT
      ARRAY_AGG(IF(key='event_id',STRUCT(param_offset,value.string_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v event_id,
      ARRAY_AGG(IF(key='session_id',STRUCT(param_offset,value.string_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v session_id,
      ARRAY_AGG(IF(key='platform',STRUCT(param_offset,value.string_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v platform,
      ARRAY_AGG(IF(key='channel_id',STRUCT(param_offset,value.string_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v channel_id,
      ARRAY_AGG(IF(key='video_id',STRUCT(param_offset,value.string_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v video_id,
      ARRAY_AGG(IF(key='video_title',STRUCT(param_offset,value.string_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v video_title,
      ARRAY_AGG(IF(key='playback_id',STRUCT(param_offset,value.string_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v playback_id,
      ARRAY_AGG(IF(key='schema_version',STRUCT(param_offset,value.int_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v schema_version,
      ARRAY_AGG(IF(key='active_watch_ms',STRUCT(param_offset,value.int_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v active_watch_ms,
      ARRAY_AGG(IF(key='duration_ms',STRUCT(param_offset,value.int_value AS v),NULL) IGNORE NULLS ORDER BY param_offset LIMIT 1)[SAFE_OFFSET(0)].v duration_ms,
      COUNTIF(key='schema_version') schema_version_count,COUNTIF(key='event_id') event_id_count,
      COUNTIF(key='session_id') session_id_count,COUNTIF(key='platform') platform_count,
      COUNTIF(key='channel_id') channel_id_count,COUNTIF(key='video_id') video_id_count,
      COUNTIF(key='playback_id') playback_id_count,COUNTIF(key='active_watch_ms') active_watch_ms_count
    FROM UNNEST(event_params) WITH OFFSET AS param_offset) params
  FROM \`${table}\`
  WHERE _TABLE_SUFFIX BETWEEN @fromSuffix AND @toSuffix
    AND event_timestamp >= @fromMicros AND event_timestamp < @toMicros
    AND event_name IN (${allowlist})
), raw_extracted AS (
  SELECT event_name,event_timestamp,user_pseudo_id,params.* FROM raw_param_rows
), normalized_window AS (
  SELECT event_name,event_timestamp,TRIM(user_pseudo_id) user_pseudo_id,TRIM(event_id) event_id,
    TRIM(session_id) session_id,platform,TRIM(channel_id) channel_id,TRIM(video_id) video_id,
    IF(CHAR_LENGTH(TRIM(video_title))<=4096 AND NOT EXISTS(
      SELECT 1 FROM UNNEST(IFNULL(TO_CODE_POINTS(video_title),ARRAY<INT64>[])) code_point
      WHERE code_point BETWEEN 0 AND 31 OR code_point BETWEEN 127 AND 159
        OR code_point IN (1564,8206,8207,8234,8235,8236,8237,8238,8294,8295,8296,8297,65279)
    ),TRIM(video_title),'') video_title,
    TRIM(playback_id) playback_id,schema_version,SAFE_CAST(active_watch_ms AS FLOAT64) active_watch_ms,
    SAFE_CAST(duration_ms AS FLOAT64) duration_ms,schema_version_count,event_id_count,session_id_count,
    platform_count,channel_id_count,video_id_count,playback_id_count,active_watch_ms_count,
    REGEXP_CONTAINS(IFNULL(event_id,''),r'[\\p{Cc}\\p{Cf}]') event_id_unsafe_controls,
    REGEXP_CONTAINS(IFNULL(user_pseudo_id,''),r'[\\p{Cc}\\p{Cf}]') user_unsafe_controls,
    REGEXP_CONTAINS(IFNULL(session_id,''),r'[\\p{Cc}\\p{Cf}]') session_id_unsafe_controls,
    REGEXP_CONTAINS(IFNULL(channel_id,''),r'[\\p{Cc}\\p{Cf}]') channel_id_unsafe_controls,
    REGEXP_CONTAINS(IFNULL(video_id,''),r'[\\p{Cc}\\p{Cf}]') video_id_unsafe_controls,
    REGEXP_CONTAINS(IFNULL(playback_id,''),r'[\\p{Cc}\\p{Cf}]') playback_id_unsafe_controls
  FROM raw_extracted
), classified AS (
  SELECT *,
    schema_version_count>1 OR event_id_count>1 OR session_id_count>1 OR platform_count>1 OR channel_id_count>1
      OR (event_name IN ('youtube_video_select','youtube_player_ready','youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end','youtube_external_video_open') AND video_id_count>1)
      OR (event_name IN ('youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end') AND playback_id_count>1)
      OR (event_name IN ('youtube_playback_checkpoint','youtube_playback_end') AND active_watch_ms_count>1)
      AS duplicate_parameter_keys,
    IFNULL(schema_version = 1,FALSE) AS known_schema,
    event_id IS NOT NULL AND event_id!='' AND CHAR_LENGTH(event_id)<=256
      AND NOT event_id_unsafe_controls
      AND user_pseudo_id IS NOT NULL AND user_pseudo_id!='' AND CHAR_LENGTH(user_pseudo_id)<=256
      AND NOT user_unsafe_controls
      AND session_id IS NOT NULL AND session_id!='' AND CHAR_LENGTH(session_id)<=256
      AND NOT session_id_unsafe_controls
      AND channel_id IS NOT NULL AND channel_id!='' AND CHAR_LENGTH(channel_id)<=256
      AND NOT channel_id_unsafe_controls
      AND platform IN ('ios','android')
      AND (event_name NOT IN ('youtube_video_select','youtube_player_ready','youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end','youtube_external_video_open') OR (NULLIF(video_id,'') IS NOT NULL AND CHAR_LENGTH(video_id)<=256 AND NOT video_id_unsafe_controls))
      AND (event_name NOT IN ('youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end') OR (NULLIF(playback_id,'') IS NOT NULL AND CHAR_LENGTH(playback_id)<=256 AND NOT playback_id_unsafe_controls))
      AND (event_name NOT IN ('youtube_playback_checkpoint','youtube_playback_end') OR active_watch_ms BETWEEN 0 AND 86400000)
      AS required_valid
  FROM normalized_window
), platform_classified AS (
  SELECT * FROM classified WHERE @platform = 'all' OR platform = @platform
), scoped_classified AS (
  SELECT * FROM platform_classified
  WHERE (@videoId IS NULL OR video_id=@videoId)
    AND (@channelId IS NULL OR channel_id=@channelId)
), validated AS (
  SELECT * EXCEPT(known_schema,required_valid,duplicate_parameter_keys) FROM platform_classified
  WHERE NOT duplicate_parameter_keys AND known_schema AND required_valid
), deduped AS (
  SELECT * EXCEPT(dedupe_rank) FROM (
    SELECT *, ROW_NUMBER() OVER(PARTITION BY event_id ORDER BY event_timestamp,event_name,user_pseudo_id,session_id,platform,
      IFNULL(playback_id,''),IFNULL(video_id,''),IFNULL(channel_id,''),IFNULL(video_title,''),IFNULL(active_watch_ms,-1),IFNULL(duration_ms,-1)) dedupe_rank
    FROM validated
  ) WHERE dedupe_rank=1
), scoped_validated AS (
  SELECT * FROM validated
  WHERE (@videoId IS NULL OR video_id=@videoId)
    AND (@channelId IS NULL OR channel_id=@channelId)
), scoped_deduped AS (
  SELECT * FROM deduped
  WHERE (@videoId IS NULL OR video_id=@videoId)
    AND (@channelId IS NULL OR channel_id=@channelId)
), candidate_conflicts AS (
  SELECT user_pseudo_id,playback_id,schema_version,
    COUNT(DISTINCT NULLIF(video_id,''))>1 conflicting_video,
    COUNT(DISTINCT NULLIF(channel_id,''))>1 conflicting_channel,
    COUNTIF(event_name='youtube_playback_start') start_count,
    COUNTIF((@videoId IS NULL OR video_id=@videoId)
      AND (@channelId IS NULL OR channel_id=@channelId))>0 selected_scope
  FROM deduped WHERE event_name IN ('youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end')
  GROUP BY user_pseudo_id,playback_id,schema_version
), conflict_free_attempt_rows AS (
  SELECT d.* FROM deduped d JOIN candidate_conflicts c USING(user_pseudo_id,playback_id,schema_version)
  WHERE c.selected_scope AND NOT c.conflicting_video AND NOT c.conflicting_channel
), valid_starts AS (
  SELECT user_pseudo_id,playback_id,video_id,schema_version,
    ARRAY_AGG(IF(event_name='youtube_playback_start',STRUCT(event_timestamp,session_id,channel_id,platform,event_id),NULL) IGNORE NULLS ORDER BY event_timestamp,event_id LIMIT 1)[OFFSET(0)] start
  FROM conflict_free_attempt_rows
  GROUP BY user_pseudo_id,playback_id,video_id,schema_version
  HAVING COUNTIF(event_name='youtube_playback_start')=1
), scoped_starts AS (
  SELECT user_pseudo_id,playback_id,video_id,schema_version,start.event_timestamp start_at,
    start.session_id session_id,start.channel_id channel_id
  FROM valid_starts
  WHERE (@platform='all' OR start.platform=@platform)
    AND (@videoId IS NULL OR video_id=@videoId) AND (@channelId IS NULL OR start.channel_id=@channelId)
), owned_attempt_rows AS (
  SELECT r.* FROM conflict_free_attempt_rows r JOIN scoped_starts s USING(user_pseudo_id,playback_id,video_id,schema_version)
  WHERE r.event_timestamp>=s.start_at
), scoped_owned_attempt_rows AS (
  SELECT * FROM owned_attempt_rows
  WHERE (@platform='all' OR platform=@platform)
    AND (@videoId IS NULL OR video_id=@videoId)
    AND (@channelId IS NULL OR channel_id=@channelId)
), attempt_rollup AS (
  SELECT s.*,
    MAX(IF(r.active_watch_ms BETWEEN 0 AND 86400000,r.active_watch_ms,NULL)) active_watch_ms,
    ARRAY_AGG(IF(r.duration_ms BETWEEN 1 AND 86400000,STRUCT(r.event_timestamp,r.event_id,r.duration_ms),NULL) IGNORE NULLS ORDER BY r.event_timestamp DESC,r.event_id DESC LIMIT 1)[SAFE_OFFSET(0)].duration_ms duration_ms,
    COUNTIF(r.event_name='youtube_playback_end')>0 ended
  FROM scoped_starts s JOIN scoped_owned_attempt_rows r USING(user_pseudo_id,playback_id,video_id,schema_version)
  GROUP BY user_pseudo_id,playback_id,video_id,schema_version,start_at,session_id,channel_id
), watch_attempts AS (
  SELECT *,IF(duration_ms IS NULL,NULL,LEAST(active_watch_ms,duration_ms)/duration_ms) completion_ratio
  FROM attempt_rollup WHERE active_watch_ms > 0
), filtered_events AS (
  SELECT * FROM deduped
  WHERE (@platform='all' OR platform=@platform)
    AND (@videoId IS NULL OR video_id=@videoId) AND (@channelId IS NULL OR channel_id=@channelId)
), latest_titles AS (
  SELECT channel_id,video_id,SUBSTR(TRIM(video_title),1,100) title FROM (
    -- BigQuery's default binary ordering compares Unicode code points; fixture codePointCompare mirrors it.
    SELECT *,ROW_NUMBER() OVER(PARTITION BY channel_id,video_id ORDER BY event_timestamp DESC,event_id DESC) title_rank
    FROM filtered_events WHERE event_name='youtube_video_select' AND NULLIF(TRIM(video_title),'') IS NOT NULL
  ) WHERE title_rank=1
), summary_rows AS (
  SELECT TO_JSON_STRING(STRUCT(
    COUNTIF(event_name='youtube_home_entry_click') AS homeClicks,
    COUNTIF(event_name='youtube_catalog_open') AS catalogOpens,
    COUNTIF(event_name='youtube_video_select') AS videoSelects,
    COUNTIF(event_name='youtube_player_ready') AS playerReady,
    (SELECT COUNT(*) FROM attempt_rollup) AS playbackStarts,
    (SELECT COUNT(DISTINCT user_pseudo_id) FROM attempt_rollup) AS anonymousInstancesWithValidStart,
    (SELECT COUNT(*) FROM watch_attempts) AS watchAttempts,
    (SELECT IFNULL(SUM(active_watch_ms),0) FROM watch_attempts) AS totalActiveWatchMs,
    (SELECT AVG(active_watch_ms) FROM watch_attempts) AS averageActiveWatchMs,
    (SELECT DISTINCT PERCENTILE_CONT(active_watch_ms,0.50) OVER() FROM watch_attempts LIMIT 1) AS p50ActiveWatchMs,
    (SELECT DISTINCT PERCENTILE_CONT(active_watch_ms,0.90) OVER() FROM watch_attempts LIMIT 1) AS p90ActiveWatchMs,
    (SELECT COUNTIF(completion_ratio>=0.25) FROM watch_attempts) AS completed25,
    (SELECT COUNTIF(completion_ratio>=0.50) FROM watch_attempts) AS completed50,
    (SELECT COUNTIF(completion_ratio>=0.75) FROM watch_attempts) AS completed75,
    (SELECT COUNTIF(completion_ratio>=0.95) FROM watch_attempts) AS completed95,
    COUNTIF(event_name='youtube_external_video_open') AS externalVideoOpens,
    COUNTIF(event_name='youtube_channel_open') AS channelOpens
  )) payload_json FROM filtered_events
), date_spine AS (
  SELECT day FROM UNNEST(GENERATE_DATE_ARRAY(DATE(TIMESTAMP_MICROS(@fromMicros),'UTC'),DATE(TIMESTAMP_MICROS(@toMicros-1),'UTC'))) day
), event_daily AS (
  SELECT DATE(TIMESTAMP_MICROS(event_timestamp),'UTC') day,
    COUNTIF(event_name='youtube_home_entry_click') homeClicks,
    COUNTIF(event_name='youtube_catalog_open') catalogOpens,
    COUNTIF(event_name='youtube_video_select') videoSelects
  FROM filtered_events GROUP BY day
), attempt_daily AS (
  SELECT DATE(TIMESTAMP_MICROS(start_at),'UTC') day,COUNT(*) playbackStarts,SUM(IFNULL(active_watch_ms,0)) activeWatchMs
  FROM attempt_rollup GROUP BY day
), trend_rows AS (
  SELECT FORMAT_DATE('%F',d.day) sort_day,
    TO_JSON_STRING(STRUCT(FORMAT_DATE('%F',d.day) AS day,IFNULL(e.homeClicks,0) AS homeClicks,
    IFNULL(e.catalogOpens,0) AS catalogOpens,IFNULL(e.videoSelects,0) AS videoSelects,
    IFNULL(a.playbackStarts,0) AS playbackStarts,IFNULL(a.activeWatchMs,0) AS activeWatchMs)) payload_json
  FROM date_spine d LEFT JOIN event_daily e USING(day) LEFT JOIN attempt_daily a USING(day)
), home_sessions AS (
  SELECT user_pseudo_id,session_id,MIN(event_timestamp) home_at
  FROM filtered_events WHERE event_name='youtube_home_entry_click' GROUP BY user_pseudo_id,session_id
), catalog_sessions AS (
  SELECT c.user_pseudo_id,c.session_id,MIN(c.event_timestamp) catalog_at
  FROM filtered_events c JOIN home_sessions h USING(user_pseudo_id,session_id)
  WHERE c.event_name='youtube_catalog_open' AND c.event_timestamp>h.home_at
  GROUP BY c.user_pseudo_id,c.session_id
), select_paths AS (
  SELECT s.user_pseudo_id,s.session_id,s.channel_id,s.video_id,MIN(s.event_timestamp) select_at
  FROM filtered_events s LEFT JOIN catalog_sessions c USING(user_pseudo_id,session_id)
  WHERE s.event_name='youtube_video_select'
    AND (@videoId IS NOT NULL OR (c.catalog_at IS NOT NULL AND s.event_timestamp>c.catalog_at))
  GROUP BY s.user_pseudo_id,s.session_id,s.channel_id,s.video_id
), start_paths AS (
  SELECT p.*,a.playback_id,a.schema_version,a.start_at
  FROM select_paths p JOIN attempt_rollup a
    ON a.user_pseudo_id=p.user_pseudo_id AND a.session_id=p.session_id
    AND a.channel_id=p.channel_id AND a.video_id=p.video_id AND a.start_at>p.select_at
), c25_paths AS (
  SELECT p.user_pseudo_id,p.session_id,p.channel_id,p.video_id,p.playback_id,p.schema_version,p.start_at,
    MIN(r.event_timestamp) c25_at
  FROM start_paths p JOIN scoped_owned_attempt_rows r USING(user_pseudo_id,playback_id,video_id,schema_version)
  JOIN attempt_rollup a USING(user_pseudo_id,playback_id,video_id,schema_version)
  WHERE a.duration_ms IS NOT NULL AND r.event_timestamp>p.start_at AND r.active_watch_ms>0
    AND LEAST(r.active_watch_ms,a.duration_ms)/a.duration_ms>=0.25
  GROUP BY p.user_pseudo_id,p.session_id,p.channel_id,p.video_id,p.playback_id,p.schema_version,p.start_at
), c75_paths AS (
  SELECT p.user_pseudo_id,p.session_id,p.channel_id,p.video_id,p.playback_id,p.schema_version,
    MIN(r.event_timestamp) c75_at
  FROM c25_paths p JOIN scoped_owned_attempt_rows r USING(user_pseudo_id,playback_id,video_id,schema_version)
  JOIN attempt_rollup a USING(user_pseudo_id,playback_id,video_id,schema_version)
  WHERE a.duration_ms IS NOT NULL AND r.event_timestamp>p.c25_at AND r.active_watch_ms>0
    AND LEAST(r.active_watch_ms,a.duration_ms)/a.duration_ms>=0.75
  GROUP BY p.user_pseudo_id,p.session_id,p.channel_id,p.video_id,p.playback_id,p.schema_version
), funnel_session_counts AS (
  SELECT
    (SELECT COUNT(*) FROM home_sessions) home_count,
    (SELECT COUNT(*) FROM catalog_sessions) catalog_count,
    (SELECT COUNT(*) FROM (SELECT DISTINCT user_pseudo_id,session_id FROM select_paths)) select_count,
    (SELECT COUNT(*) FROM (SELECT DISTINCT user_pseudo_id,session_id FROM start_paths)) start_count,
    (SELECT COUNT(*) FROM (SELECT DISTINCT user_pseudo_id,session_id FROM c25_paths)) c25_count,
    (SELECT COUNT(*) FROM (SELECT DISTINCT user_pseudo_id,session_id FROM c75_paths)) c75_count
), funnel_counts AS (
  SELECT IF(@videoId IS NULL,home_count,NULL) home_count,IF(@videoId IS NULL,catalog_count,NULL) catalog_count,
    select_count,start_count,c25_count,c75_count FROM funnel_session_counts
), funnel_rows AS (
  SELECT CASE step WHEN 'home' THEN 0 WHEN 'catalog' THEN 1 WHEN 'select' THEN 2 WHEN 'start' THEN 3
      WHEN 'completed25' THEN 4 ELSE 5 END funnel_ordinal,
    TO_JSON_STRING(STRUCT(step,status,count,percentOfPrevious)) payload_json FROM funnel_counts,
  UNNEST([
    STRUCT('home' AS step,IF(@videoId IS NULL,'ready','not_applicable') AS status,home_count AS count,CAST(NULL AS FLOAT64) AS percentOfPrevious),
    STRUCT('catalog' AS step,IF(@videoId IS NULL,'ready','not_applicable') AS status,catalog_count AS count,SAFE_DIVIDE(catalog_count,home_count) AS percentOfPrevious),
    STRUCT('select' AS step,'ready' AS status,select_count AS count,IF(@videoId IS NULL,SAFE_DIVIDE(select_count,catalog_count),NULL) AS percentOfPrevious),
    STRUCT('start' AS step,'ready' AS status,start_count AS count,SAFE_DIVIDE(start_count,select_count) AS percentOfPrevious),
    STRUCT('completed25' AS step,'ready' AS status,c25_count AS count,SAFE_DIVIDE(c25_count,start_count) AS percentOfPrevious),
    STRUCT('completed75' AS step,'ready' AS status,c75_count AS count,SAFE_DIVIDE(c75_count,c25_count) AS percentOfPrevious)
  ])
), video_event_metrics AS (
  SELECT channel_id,video_id,COUNTIF(event_name='youtube_video_select') videoSelects,
    COUNTIF(event_name='youtube_external_video_open') externalVideoOpens
  FROM filtered_events WHERE event_name IN ('youtube_video_select','youtube_external_video_open') GROUP BY channel_id,video_id
), video_attempt_metrics AS (
  SELECT channel_id,video_id,COUNT(*) playback_starts,COUNT(DISTINCT user_pseudo_id) anonymousInstances
  FROM attempt_rollup GROUP BY channel_id,video_id
), watch_with_percentiles AS (
  SELECT *,PERCENTILE_CONT(active_watch_ms,0.50) OVER(PARTITION BY channel_id,video_id) p50,
    PERCENTILE_CONT(active_watch_ms,0.90) OVER(PARTITION BY channel_id,video_id) p90
  FROM watch_attempts
), video_watch_metrics AS (
  SELECT channel_id,video_id,SUM(active_watch_ms) active_watch_ms,AVG(active_watch_ms) averageActiveWatchMs,
    MAX(p50) p50ActiveWatchMs,MAX(p90) p90ActiveWatchMs,
    COUNTIF(completion_ratio>=0.25) completed25,COUNTIF(completion_ratio>=0.50) completed50,
    COUNTIF(completion_ratio>=0.75) completed75,COUNTIF(completion_ratio>=0.95) completed95
  FROM watch_with_percentiles GROUP BY channel_id,video_id
), video_keys AS (
  SELECT DISTINCT channel_id,video_id FROM filtered_events WHERE event_name IN ('youtube_video_select','youtube_external_video_open')
  UNION DISTINCT SELECT DISTINCT channel_id,video_id FROM attempt_rollup
), video_aggregates AS (
  SELECT k.channel_id,k.video_id,t.title,
    IFNULL(e.videoSelects,0) videoSelects,IFNULL(a.playback_starts,0) playback_starts,
    IFNULL(a.anonymousInstances,0) anonymousInstances,IFNULL(w.active_watch_ms,0) active_watch_ms,
    w.averageActiveWatchMs,w.p50ActiveWatchMs,w.p90ActiveWatchMs,
    IFNULL(w.completed25,0) completed25,IFNULL(w.completed50,0) completed50,
    IFNULL(w.completed75,0) completed75,IFNULL(w.completed95,0) completed95,
    IFNULL(e.externalVideoOpens,0) externalVideoOpens
  FROM video_keys k LEFT JOIN latest_titles t USING(channel_id,video_id)
  LEFT JOIN video_event_metrics e USING(channel_id,video_id)
  LEFT JOIN video_attempt_metrics a USING(channel_id,video_id)
  LEFT JOIN video_watch_metrics w USING(channel_id,video_id)
), video_rows AS (
      SELECT TO_JSON_STRING(STRUCT(channel_id AS channelId,video_id AS videoId,title,videoSelects,playback_starts AS playbackStarts,
        anonymousInstances,active_watch_ms AS activeWatchMs,averageActiveWatchMs,p50ActiveWatchMs,p90ActiveWatchMs,
    completed25,completed50,completed75,completed95,externalVideoOpens)) payload_json,
    playback_starts,active_watch_ms,channel_id,video_id
  FROM video_aggregates
      ORDER BY playback_starts DESC, active_watch_ms DESC, channel_id ASC, video_id ASC
  LIMIT 201
), quality_aggregate AS (
  SELECT
    (SELECT COUNT(*) FROM scoped_classified) totalEvents,
    (SELECT COUNT(*) FROM filtered_events WHERE event_name NOT IN ('youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end'))+(SELECT COUNT(*) FROM scoped_owned_attempt_rows) acceptedEvents,
    (SELECT COUNTIF(NOT duplicate_parameter_keys AND known_schema AND NOT required_valid) FROM scoped_classified) missingRequiredFields,
    (SELECT COUNT(*) FROM scoped_validated)-(SELECT COUNT(*) FROM scoped_deduped) duplicates,
    (SELECT COUNTIF(NOT duplicate_parameter_keys AND NOT known_schema) FROM scoped_classified) unknownSchema,
    (SELECT COUNTIF(duplicate_parameter_keys) FROM scoped_classified) duplicateParameterKeys,
    (SELECT COUNTIF(selected_scope AND start_count=0) FROM candidate_conflicts) rowsWithoutStart,
    (SELECT COUNTIF(selected_scope AND conflicting_video) FROM candidate_conflicts) conflictingVideo,
    (SELECT COUNTIF(selected_scope AND conflicting_channel) FROM candidate_conflicts) conflictingChannel,
    (SELECT COUNTIF(selected_scope AND start_count>1) FROM candidate_conflicts) duplicateStartAttempts,
    (SELECT COUNTIF(active_watch_ms>0 AND duration_ms IS NULL) FROM attempt_rollup) invalidDurationAttempts,
    (SELECT COUNTIF(active_watch_ms>0 AND NOT ended) FROM attempt_rollup) unfinishedAttempts,
    (SELECT MAX(event_timestamp) FROM scoped_classified) dataThroughMicros
), quality_rows AS (
  SELECT TO_JSON_STRING(STRUCT(
    IF(acceptedEvents=0,'empty',IF(missingRequiredFields+duplicates+unknownSchema+duplicateParameterKeys+rowsWithoutStart+conflictingVideo+conflictingChannel+duplicateStartAttempts+invalidDurationAttempts>0,'partial','ready')) AS state,
        totalEvents,acceptedEvents,IFNULL(SAFE_DIVIDE(acceptedEvents,totalEvents),0) AS validationRatio,
    missingRequiredFields,duplicates,unknownSchema,duplicateParameterKeys,rowsWithoutStart,conflictingVideo,conflictingChannel,
    duplicateStartAttempts,invalidDurationAttempts,unfinishedAttempts,dataThroughMicros
  )) payload_json FROM quality_aggregate
), result_rows AS (
  SELECT 'summary' row_kind,payload_json,0 section_order,CAST(0 AS FLOAT64) first_number,
    CAST(0 AS FLOAT64) second_number,'' first_text,'' second_text FROM summary_rows
  UNION ALL SELECT 'trend',payload_json,1,0,0,sort_day,'' FROM trend_rows
  UNION ALL SELECT 'funnel',payload_json,2,funnel_ordinal,0,'','' FROM funnel_rows
  UNION ALL SELECT 'video',payload_json,3,-playback_starts,-active_watch_ms,channel_id,video_id FROM video_rows
  UNION ALL SELECT 'quality',payload_json,4,0,0,'','' FROM quality_rows
)
SELECT row_kind,payload_json FROM result_rows
ORDER BY section_order,first_number,second_number,first_text,second_text
`,
  };
}

/** Pure BigQuery job configuration; callers may add `dryRun: true` and location without changing query semantics. */
export function buildYoutubeAnalyticsDryRunConfig(
  eventsTable: string,
  input: { readonly fromMicros: number; readonly toMicros: number; readonly filters: NormalizedYoutubeAnalyticsRequest },
): YoutubeAnalyticsDryRunConfig {
  const built = buildYoutubeAnalyticsSql(eventsTable, input);
  return {
    query: built.sql,
    params: built.params,
    types: {
      fromMicros: 'INT64', toMicros: 'INT64', fromSuffix: 'STRING', toSuffix: 'STRING',
      platform: 'STRING', videoId: 'STRING', channelId: 'STRING',
    },
    useLegacySql: false,
  };
}
