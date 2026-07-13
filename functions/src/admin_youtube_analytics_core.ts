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
}

export interface YoutubeAnalyticsQuality {
  state: 'ready' | 'empty' | 'partial';
  totalEvents: number;
  acceptedEvents: number;
  validationRatio: number;
  missingRequiredFields: number;
  duplicates: number;
  unknownSchema: number;
  rowsWithoutStart: number;
  conflictingVideo: number;
  conflictingChannel: number;
  duplicateStartAttempts: number;
  invalidDurationAttempts: number;
  unfinishedAttempts: number;
  videosTruncated: boolean;
  videoRowsReturned: number;
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

function boundedString(value: unknown, max = 256): string {
  if (typeof value !== 'string') return '';
  const result = value.trim();
  return result && [...result].length <= max ? result : '';
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
    title: boundedString(row.video_title, 4096), playback, active, duration,
  };
}

function matchesDimensionFilters(event: ValidEvent, filters: NormalizedYoutubeAnalyticsRequest): boolean {
  if (filters.platform !== 'all' && event.platform !== filters.platform) return false;
  if (filters.channelId && event.channel !== filters.channelId) return false;
  if (filters.videoId && event.video !== filters.videoId) return false;
  return true;
}

function attemptsFrom(events: readonly ValidEvent[], quality: YoutubeAnalyticsQuality): Attempt[] {
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
    const videos = new Set(rows.map(row => row.video).filter(Boolean));
    const channels = new Set(rows.map(row => row.channel).filter(Boolean));
    const conflictingVideo = videos.size > 1;
    const conflictingChannel = channels.size > 1;
    if (conflictingVideo) quality.conflictingVideo += 1;
    if (conflictingChannel) quality.conflictingChannel += 1;
    if (conflictingVideo || conflictingChannel) continue;
    const starts = rows.filter(row => row.name === 'youtube_playback_start');
    if (!starts.length) { quality.rowsWithoutStart += 1; continue; }
    if (starts.length !== 1) { quality.duplicateStartAttempts += 1; continue; }
    const start = starts[0];
    const ownedRows = rows.filter(row => row.at >= start.at);
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
  if (!Number.isSafeInteger(input.fromMicros) || !Number.isSafeInteger(input.toMicros) || input.fromMicros >= input.toMicros) {
    throw new InvalidYoutubeAnalyticsRequestError('fromMicros and toMicros must be safe integers with from < to');
  }
  if (!Number.isSafeInteger(input.generatedAtMicros)) throw new InvalidYoutubeAnalyticsRequestError('generatedAtMicros is invalid');
  const filters = normalizeYoutubeAnalyticsRequest(input.filters);
  const quality: YoutubeAnalyticsQuality = {
    state: 'empty', totalEvents: 0, acceptedEvents: 0, validationRatio: 0,
    missingRequiredFields: 0, duplicates: 0, unknownSchema: 0, rowsWithoutStart: 0,
    conflictingVideo: 0, conflictingChannel: 0, duplicateStartAttempts: 0,
    invalidDurationAttempts: 0, unfinishedAttempts: 0, videosTruncated: false, videoRowsReturned: 0,
  };
  let dataThroughMicros: number | null = null;
  const validated: ValidEvent[] = [];
  for (const row of rows) {
    const at = integer(row.event_timestamp);
    if (!EVENT_SET.has(row.event_name) || at == null || at < input.fromMicros || at >= input.toMicros) continue;
    if (filters.platform !== 'all' && row.platform !== filters.platform) continue;
    if (filters.channelId && boundedString(row.channel_id) !== filters.channelId) continue;
    if (filters.videoId && boundedString(row.video_id) !== filters.videoId) continue;
    quality.totalEvents += 1;
    dataThroughMicros = Math.max(dataThroughMicros ?? at, at);
    if (row.schema_version !== 1) { quality.unknownSchema += 1; continue; }
    const valid = validBase(row);
    if (!valid) { quality.missingRequiredFields += 1; continue; }
    validated.push(valid);
  }
  const platformValidated = validated.filter(row => filters.platform === 'all' || row.platform === filters.platform);
  platformValidated.sort((a, b) => a.at - b.at || codePointCompare(a.eventId, b.eventId)
    || codePointCompare(a.name, b.name) || codePointCompare(a.user, b.user) || codePointCompare(a.session, b.session)
    || codePointCompare(a.platform, b.platform) || codePointCompare(a.playback, b.playback)
    || codePointCompare(a.video, b.video) || codePointCompare(a.channel, b.channel) || codePointCompare(a.title, b.title)
    || (a.active ?? -1) - (b.active ?? -1) || (a.duration ?? -1) - (b.duration ?? -1));
  const seen = new Set<string>();
  const deduped: ValidEvent[] = [];
  for (const row of platformValidated) {
    if (row.eventId && seen.has(row.eventId)) { quality.duplicates += 1; continue; }
    if (row.eventId) seen.add(row.eventId);
    deduped.push(row);
  }
  // Detect playback identity corruption before channel/video filtering can hide it.
  const attempts = attemptsFrom(deduped, quality)
    .filter(attempt => (!filters.channelId || attempt.channel === filters.channelId)
      && (!filters.videoId || attempt.video === filters.videoId));
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
    if (!previous || row.at > previous.at || (row.at === previous.at && row.eventId > previous.eventId)) {
      latestTitles.set(key, { at: row.at, eventId: row.eventId, title: [...row.title].slice(0, 100).join('') });
    }
  }
  const pairs = new Map<string, { channel: string; video: string; selects: number; attempts: Attempt[] }>();
  const ensurePair = (channel: string, video: string) => {
    const key = tuple(channel, video);
    const existing = pairs.get(key) ?? { channel, video, selects: 0, attempts: [] };
    pairs.set(key, existing);
    return existing;
  };
  accepted.filter(row => row.name === 'youtube_video_select').forEach(row => { ensurePair(row.channel, row.video).selects += 1; });
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
    };
  }).sort((a, b) => b.playbackStarts - a.playbackStarts || b.activeWatchMs - a.activeWatchMs
    || codePointCompare(a.channelId, b.channelId) || codePointCompare(a.videoId, b.videoId));
  quality.videosTruncated = allVideos.length > 200;
  const videos = allVideos.slice(0, 200);
  quality.videoRowsReturned = videos.length;
  const defects = quality.missingRequiredFields + quality.duplicates + quality.unknownSchema + quality.rowsWithoutStart
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

function queryPayload(row: YoutubeAnalyticsQueryRow): Record<string, unknown> {
  if (typeof row.payload_json !== 'string' || row.payload_json.length > 100_000) {
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

function queryNumber(payload: Record<string, unknown>, field: string, nullable = false): number | null {
  const raw = payload[field];
  if (raw == null && nullable) return null;
  const value = typeof raw === 'object' && raw && 'value' in raw
    ? Number((raw as { value: unknown }).value)
    : typeof raw === 'string' && /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : raw;
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

function queryText(payload: Record<string, unknown>, field: string, nullable = false, max = 256): string | null {
  const value = payload[field];
  if (value == null && nullable) return null;
  if (typeof value !== 'string' || !value || [...value].length > max) {
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
  const counts = Object.fromEntries(countFields.map(field => [field, queryCount(payload, field)])) as unknown as Pick<YoutubeAnalyticsSummary, typeof countFields[number]>;
  return {
    ...counts,
    averageActiveWatchMs: queryNumber(payload, 'averageActiveWatchMs', true),
    p50ActiveWatchMs: queryNumber(payload, 'p50ActiveWatchMs', true),
    p90ActiveWatchMs: queryNumber(payload, 'p90ActiveWatchMs', true),
  };
}

function decodeTrend(payload: Record<string, unknown>): YoutubeAnalyticsTrendRow {
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
  const title = queryText(payload, 'title', true, 100);
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
  };
}

function decodeQuality(payload: Record<string, unknown>): YoutubeAnalyticsQuality & { dataThroughMicros: number | null } {
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

export function decodeYoutubeAnalyticsQueryRows(
  rows: readonly YoutubeAnalyticsQueryRow[],
  context: {
    readonly fromMicros: number;
    readonly toMicros: number;
    readonly generatedAtMicros: number;
    readonly filters: NormalizedYoutubeAnalyticsRequest;
  },
): YoutubeAnalyticsSnapshot {
  if (!Number.isSafeInteger(context.fromMicros) || !Number.isSafeInteger(context.toMicros) || context.fromMicros >= context.toMicros) {
    throw new InvalidYoutubeAnalyticsRequestError('Invalid decoder window');
  }
  if (!Number.isSafeInteger(context.generatedAtMicros) || context.generatedAtMicros < 0) {
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
  trend.sort((a, b) => codePointCompare(a.day, b.day));
  funnel.sort((a, b) => FUNNEL_STEPS.indexOf(a.step) - FUNNEL_STEPS.indexOf(b.step));
  if (funnel.length !== FUNNEL_STEPS.length || new Set(funnel.map(row => row.step)).size !== FUNNEL_STEPS.length) {
    throw new InvalidYoutubeAnalyticsRequestError('Incomplete funnel rows');
  }
  const applicableCounts = funnel.filter(row => row.status === 'ready').map(row => row.count as number);
  if (applicableCounts.some((count, index) => index > 0 && count > applicableCounts[index - 1])) {
    throw new InvalidYoutubeAnalyticsRequestError('Non-monotonic funnel rows');
  }
  videos.sort((a, b) => b.playbackStarts - a.playbackStarts || b.activeWatchMs - a.activeWatchMs
    || codePointCompare(a.channelId, b.channelId) || codePointCompare(a.videoId, b.videoId));
  if (videos.length > 201) throw new InvalidYoutubeAnalyticsRequestError('YouTube analytics video row limit exceeded');
  const videosTruncated = videos.length > 200;
  const boundedVideos = videos.slice(0, 200);
  const { dataThroughMicros, ...qualityBase } = qualityWithData;
  if (qualityBase.acceptedEvents > qualityBase.totalEvents
    || (dataThroughMicros != null && (dataThroughMicros < context.fromMicros || dataThroughMicros >= context.toMicros))) {
    throw new InvalidYoutubeAnalyticsRequestError('Inconsistent quality row');
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
  if (!Number.isSafeInteger(input.fromMicros) || !Number.isSafeInteger(input.toMicros) || input.fromMicros >= input.toMicros) {
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
WITH raw_extracted AS (
  SELECT event_name, event_timestamp, user_pseudo_id,
    (SELECT ANY_VALUE(value.string_value) FROM UNNEST(event_params) WHERE key='event_id') event_id,
    (SELECT ANY_VALUE(value.string_value) FROM UNNEST(event_params) WHERE key='session_id') session_id,
    (SELECT ANY_VALUE(value.string_value) FROM UNNEST(event_params) WHERE key='platform') platform,
    (SELECT ANY_VALUE(value.string_value) FROM UNNEST(event_params) WHERE key='channel_id') channel_id,
    (SELECT ANY_VALUE(value.string_value) FROM UNNEST(event_params) WHERE key='video_id') video_id,
    (SELECT ANY_VALUE(value.string_value) FROM UNNEST(event_params) WHERE key='video_title') video_title,
    (SELECT ANY_VALUE(value.string_value) FROM UNNEST(event_params) WHERE key='playback_id') playback_id,
    COALESCE((SELECT ANY_VALUE(value.int_value) FROM UNNEST(event_params) WHERE key='schema_version'), SAFE_CAST((SELECT ANY_VALUE(value.string_value) FROM UNNEST(event_params) WHERE key='schema_version') AS INT64)) schema_version,
    SAFE_CAST((SELECT ANY_VALUE(value.int_value) FROM UNNEST(event_params) WHERE key='active_watch_ms') AS FLOAT64) active_watch_ms,
    SAFE_CAST((SELECT ANY_VALUE(value.int_value) FROM UNNEST(event_params) WHERE key='duration_ms') AS FLOAT64) duration_ms
  FROM \`${table}\`
  WHERE _TABLE_SUFFIX BETWEEN @fromSuffix AND @toSuffix
    AND event_timestamp >= @fromMicros AND event_timestamp < @toMicros
    AND event_name IN (${allowlist})
), normalized_window AS (
  SELECT event_name,event_timestamp,TRIM(user_pseudo_id) user_pseudo_id,TRIM(event_id) event_id,
    TRIM(session_id) session_id,platform,TRIM(channel_id) channel_id,TRIM(video_id) video_id,
    IF(CHAR_LENGTH(TRIM(video_title))<=4096,TRIM(video_title),'') video_title,
    TRIM(playback_id) playback_id,schema_version,active_watch_ms,duration_ms
  FROM raw_extracted
), raw_scoped AS (
  SELECT * FROM normalized_window
  WHERE (@platform = 'all' OR platform = @platform)
    AND (@videoId IS NULL OR video_id=@videoId)
    AND (@channelId IS NULL OR channel_id=@channelId)
), classified AS (
  SELECT *, IFNULL(schema_version = 1,FALSE) AS known_schema,
    event_id IS NOT NULL AND event_id!='' AND CHAR_LENGTH(event_id)<=256
      AND user_pseudo_id IS NOT NULL AND user_pseudo_id!='' AND CHAR_LENGTH(user_pseudo_id)<=256
      AND session_id IS NOT NULL AND session_id!='' AND CHAR_LENGTH(session_id)<=256
      AND channel_id IS NOT NULL AND channel_id!='' AND CHAR_LENGTH(channel_id)<=256
      AND platform IN ('ios','android')
      AND (event_name NOT IN ('youtube_video_select','youtube_player_ready','youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end','youtube_external_video_open') OR (NULLIF(video_id,'') IS NOT NULL AND CHAR_LENGTH(video_id)<=256))
      AND (event_name NOT IN ('youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end') OR (NULLIF(playback_id,'') IS NOT NULL AND CHAR_LENGTH(playback_id)<=256))
      AND (event_name NOT IN ('youtube_playback_checkpoint','youtube_playback_end') OR active_watch_ms BETWEEN 0 AND 86400000)
      AS required_valid
  FROM raw_scoped
), validated AS (
  SELECT * EXCEPT(known_schema,required_valid) FROM classified WHERE known_schema AND required_valid
), deduped AS (
  SELECT * EXCEPT(dedupe_rank) FROM (
    SELECT *, ROW_NUMBER() OVER(PARTITION BY event_id ORDER BY event_timestamp,event_name,user_pseudo_id,session_id,platform,
      IFNULL(playback_id,''),IFNULL(video_id,''),IFNULL(channel_id,''),IFNULL(video_title,''),IFNULL(active_watch_ms,-1),IFNULL(duration_ms,-1)) dedupe_rank
    FROM validated
  ) WHERE dedupe_rank=1
), candidate_conflicts AS (
  SELECT user_pseudo_id,playback_id,schema_version,
    COUNT(DISTINCT NULLIF(video_id,''))>1 conflicting_video,
    COUNT(DISTINCT NULLIF(channel_id,''))>1 conflicting_channel,
    COUNTIF(event_name='youtube_playback_start') start_count
  FROM deduped WHERE event_name IN ('youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end')
  GROUP BY user_pseudo_id,playback_id,schema_version
), conflict_free_attempt_rows AS (
  SELECT d.* FROM deduped d JOIN candidate_conflicts c USING(user_pseudo_id,playback_id,schema_version)
  WHERE NOT c.conflicting_video AND NOT c.conflicting_channel
), valid_starts AS (
  SELECT user_pseudo_id,playback_id,video_id,schema_version,
    ARRAY_AGG(IF(event_name='youtube_playback_start',STRUCT(event_timestamp,session_id,channel_id,event_id),NULL) IGNORE NULLS ORDER BY event_timestamp,event_id LIMIT 1)[OFFSET(0)] start
  FROM conflict_free_attempt_rows
  GROUP BY user_pseudo_id,playback_id,video_id,schema_version
  HAVING COUNTIF(event_name='youtube_playback_start')=1
), scoped_starts AS (
  SELECT user_pseudo_id,playback_id,video_id,schema_version,start.event_timestamp start_at,
    start.session_id session_id,start.channel_id channel_id
  FROM valid_starts
  WHERE (@videoId IS NULL OR video_id=@videoId) AND (@channelId IS NULL OR start.channel_id=@channelId)
), owned_attempt_rows AS (
  SELECT r.* FROM conflict_free_attempt_rows r JOIN scoped_starts s USING(user_pseudo_id,playback_id,video_id,schema_version)
  WHERE r.event_timestamp>=s.start_at
), attempt_rollup AS (
  SELECT s.*,
    MAX(IF(r.active_watch_ms BETWEEN 0 AND 86400000,r.active_watch_ms,NULL)) active_watch_ms,
    ARRAY_AGG(IF(r.duration_ms BETWEEN 1 AND 86400000,STRUCT(r.event_timestamp,r.event_id,r.duration_ms),NULL) IGNORE NULLS ORDER BY r.event_timestamp DESC,r.event_id DESC LIMIT 1)[SAFE_OFFSET(0)].duration_ms duration_ms,
    COUNTIF(r.event_name='youtube_playback_end')>0 ended
  FROM scoped_starts s JOIN owned_attempt_rows r USING(user_pseudo_id,playback_id,video_id,schema_version)
  GROUP BY user_pseudo_id,playback_id,video_id,schema_version,start_at,session_id,channel_id
), watch_attempts AS (
  SELECT *,IF(duration_ms IS NULL,NULL,LEAST(active_watch_ms,duration_ms)/duration_ms) completion_ratio
  FROM attempt_rollup WHERE active_watch_ms > 0
), filtered_events AS (
  SELECT * FROM deduped
  WHERE (@videoId IS NULL OR video_id=@videoId) AND (@channelId IS NULL OR channel_id=@channelId)
), latest_titles AS (
  SELECT channel_id,video_id,SUBSTR(TRIM(video_title),1,100) title FROM (
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
  SELECT TO_JSON_STRING(STRUCT(FORMAT_DATE('%F',d.day) AS day,IFNULL(e.homeClicks,0) AS homeClicks,
    IFNULL(e.catalogOpens,0) AS catalogOpens,IFNULL(e.videoSelects,0) AS videoSelects,
    IFNULL(a.playbackStarts,0) AS playbackStarts,IFNULL(a.activeWatchMs,0) AS activeWatchMs)) payload_json
  FROM date_spine d LEFT JOIN event_daily e USING(day) LEFT JOIN attempt_daily a USING(day)
), select_paths AS (
  SELECT DISTINCT s.user_pseudo_id,s.session_id,s.channel_id,s.video_id,s.event_timestamp select_at
  FROM filtered_events s
  WHERE s.event_name='youtube_video_select' AND (
    @videoId IS NOT NULL OR EXISTS(
      SELECT 1 FROM filtered_events h JOIN filtered_events c
        ON c.user_pseudo_id=h.user_pseudo_id AND c.session_id=h.session_id AND c.event_timestamp>h.event_timestamp
      WHERE h.user_pseudo_id=s.user_pseudo_id AND h.session_id=s.session_id
        AND h.event_name='youtube_home_entry_click' AND c.event_name='youtube_catalog_open'
        AND s.event_timestamp>c.event_timestamp))
), start_paths AS (
  SELECT DISTINCT p.*,a.playback_id,a.schema_version,a.start_at
  FROM select_paths p JOIN attempt_rollup a
    ON a.user_pseudo_id=p.user_pseudo_id AND a.session_id=p.session_id
    AND a.channel_id=p.channel_id AND a.video_id=p.video_id AND a.start_at>p.select_at
), c25_paths AS (
  SELECT DISTINCT p.*,r.event_timestamp c25_at
  FROM start_paths p JOIN owned_attempt_rows r USING(user_pseudo_id,playback_id,video_id,schema_version)
  JOIN attempt_rollup a USING(user_pseudo_id,playback_id,video_id,schema_version)
  WHERE a.duration_ms IS NOT NULL AND r.event_timestamp>p.start_at AND r.active_watch_ms>0
    AND LEAST(r.active_watch_ms,a.duration_ms)/a.duration_ms>=0.25
), c75_paths AS (
  SELECT DISTINCT p.*,r.event_timestamp c75_at
  FROM c25_paths p JOIN owned_attempt_rows r USING(user_pseudo_id,playback_id,video_id,schema_version)
  JOIN attempt_rollup a USING(user_pseudo_id,playback_id,video_id,schema_version)
  WHERE a.duration_ms IS NOT NULL AND r.event_timestamp>p.c25_at AND r.active_watch_ms>0
    AND LEAST(r.active_watch_ms,a.duration_ms)/a.duration_ms>=0.75
), funnel_counts AS (
  SELECT
    IF(@videoId IS NULL,(SELECT COUNT(DISTINCT CONCAT(LENGTH(user_pseudo_id),':',user_pseudo_id,LENGTH(session_id),':',session_id)) FROM filtered_events WHERE event_name='youtube_home_entry_click'),NULL) home_count,
    IF(@videoId IS NULL,(SELECT COUNT(DISTINCT CONCAT(LENGTH(h.user_pseudo_id),':',h.user_pseudo_id,LENGTH(h.session_id),':',h.session_id)) FROM filtered_events h JOIN filtered_events c ON c.user_pseudo_id=h.user_pseudo_id AND c.session_id=h.session_id AND c.event_timestamp>h.event_timestamp WHERE h.event_name='youtube_home_entry_click' AND c.event_name='youtube_catalog_open'),NULL) catalog_count,
    (SELECT COUNT(DISTINCT CONCAT(LENGTH(user_pseudo_id),':',user_pseudo_id,LENGTH(session_id),':',session_id)) FROM select_paths) select_count,
    (SELECT COUNT(DISTINCT CONCAT(LENGTH(user_pseudo_id),':',user_pseudo_id,LENGTH(session_id),':',session_id)) FROM start_paths) start_count,
    (SELECT COUNT(DISTINCT CONCAT(LENGTH(user_pseudo_id),':',user_pseudo_id,LENGTH(session_id),':',session_id)) FROM c25_paths) c25_count,
    (SELECT COUNT(DISTINCT CONCAT(LENGTH(user_pseudo_id),':',user_pseudo_id,LENGTH(session_id),':',session_id)) FROM c75_paths) c75_count
), funnel_rows AS (
  SELECT TO_JSON_STRING(STRUCT(step,status,count,percentOfPrevious)) payload_json FROM funnel_counts,
  UNNEST([
    STRUCT('home' step,IF(@videoId IS NULL,'ready','not_applicable') status,home_count count,CAST(NULL AS FLOAT64) percentOfPrevious),
    STRUCT('catalog' AS step,IF(@videoId IS NULL,'ready','not_applicable') AS status,catalog_count AS count,SAFE_DIVIDE(catalog_count,home_count) AS percentOfPrevious),
    STRUCT('select' AS step,'ready' AS status,select_count AS count,IF(@videoId IS NULL,SAFE_DIVIDE(select_count,catalog_count),NULL) AS percentOfPrevious),
    STRUCT('start' AS step,'ready' AS status,start_count AS count,SAFE_DIVIDE(start_count,select_count) AS percentOfPrevious),
    STRUCT('completed25' AS step,'ready' AS status,c25_count AS count,SAFE_DIVIDE(c25_count,start_count) AS percentOfPrevious),
    STRUCT('completed75' AS step,'ready' AS status,c75_count AS count,SAFE_DIVIDE(c75_count,c25_count) AS percentOfPrevious)
  ])
), video_keys AS (
  SELECT DISTINCT channel_id,video_id FROM filtered_events WHERE event_name='youtube_video_select'
  UNION DISTINCT SELECT DISTINCT channel_id,video_id FROM attempt_rollup
), video_aggregates AS (
  SELECT k.channel_id,k.video_id,t.title,
    (SELECT COUNT(*) FROM filtered_events e WHERE e.event_name='youtube_video_select' AND e.channel_id=k.channel_id AND e.video_id=k.video_id) videoSelects,
    (SELECT COUNT(*) FROM attempt_rollup a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id) playback_starts,
    (SELECT COUNT(DISTINCT user_pseudo_id) FROM attempt_rollup a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id) anonymousInstances,
    (SELECT IFNULL(SUM(active_watch_ms),0) FROM watch_attempts a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id) active_watch_ms,
    (SELECT AVG(active_watch_ms) FROM watch_attempts a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id) averageActiveWatchMs,
    (SELECT DISTINCT PERCENTILE_CONT(active_watch_ms,0.50) OVER() FROM watch_attempts a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id LIMIT 1) p50ActiveWatchMs,
    (SELECT DISTINCT PERCENTILE_CONT(active_watch_ms,0.90) OVER() FROM watch_attempts a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id LIMIT 1) p90ActiveWatchMs,
    (SELECT COUNTIF(completion_ratio>=0.25) FROM watch_attempts a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id) completed25,
    (SELECT COUNTIF(completion_ratio>=0.50) FROM watch_attempts a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id) completed50,
    (SELECT COUNTIF(completion_ratio>=0.75) FROM watch_attempts a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id) completed75,
    (SELECT COUNTIF(completion_ratio>=0.95) FROM watch_attempts a WHERE a.channel_id=k.channel_id AND a.video_id=k.video_id) completed95
  FROM video_keys k LEFT JOIN latest_titles t USING(channel_id,video_id)
), video_rows AS (
      SELECT TO_JSON_STRING(STRUCT(channel_id AS channelId,video_id AS videoId,title,videoSelects,playback_starts AS playbackStarts,
        anonymousInstances,active_watch_ms AS activeWatchMs,averageActiveWatchMs,p50ActiveWatchMs,p90ActiveWatchMs,
    completed25,completed50,completed75,completed95)) payload_json
  FROM video_aggregates
      ORDER BY playback_starts DESC, active_watch_ms DESC, channel_id ASC, video_id ASC
  LIMIT 201
), quality_aggregate AS (
  SELECT
    (SELECT COUNT(*) FROM raw_scoped) totalEvents,
    (SELECT COUNT(*) FROM filtered_events WHERE event_name NOT IN ('youtube_playback_start','youtube_playback_checkpoint','youtube_playback_end'))+(SELECT COUNT(*) FROM owned_attempt_rows) acceptedEvents,
    (SELECT COUNTIF(known_schema AND NOT required_valid) FROM classified) missingRequiredFields,
    (SELECT COUNT(*) FROM validated)-(SELECT COUNT(*) FROM deduped) duplicates,
    (SELECT COUNTIF(NOT known_schema) FROM classified) unknownSchema,
    (SELECT COUNTIF(start_count=0) FROM candidate_conflicts) rowsWithoutStart,
    (SELECT COUNTIF(conflicting_video) FROM candidate_conflicts) conflictingVideo,
    (SELECT COUNTIF(conflicting_channel) FROM candidate_conflicts) conflictingChannel,
    (SELECT COUNTIF(start_count>1) FROM candidate_conflicts WHERE NOT conflicting_video AND NOT conflicting_channel) duplicateStartAttempts,
    (SELECT COUNTIF(active_watch_ms>0 AND duration_ms IS NULL) FROM attempt_rollup) invalidDurationAttempts,
    (SELECT COUNTIF(active_watch_ms>0 AND NOT ended) FROM attempt_rollup) unfinishedAttempts,
    (SELECT MAX(event_timestamp) FROM raw_scoped) dataThroughMicros
), quality_rows AS (
  SELECT TO_JSON_STRING(STRUCT(
    IF(acceptedEvents=0,'empty',IF(missingRequiredFields+duplicates+unknownSchema+rowsWithoutStart+conflictingVideo+conflictingChannel+duplicateStartAttempts+invalidDurationAttempts>0,'partial','ready')) AS state,
        totalEvents,acceptedEvents,IFNULL(SAFE_DIVIDE(acceptedEvents,totalEvents),0) AS validationRatio,
    missingRequiredFields,duplicates,unknownSchema,rowsWithoutStart,conflictingVideo,conflictingChannel,
    duplicateStartAttempts,invalidDurationAttempts,unfinishedAttempts,dataThroughMicros
  )) payload_json FROM quality_aggregate
)
SELECT 'summary' row_kind,payload_json FROM summary_rows
UNION ALL SELECT 'trend',payload_json FROM trend_rows
UNION ALL SELECT 'funnel',payload_json FROM funnel_rows
UNION ALL SELECT 'video',payload_json FROM video_rows
UNION ALL SELECT 'quality',payload_json FROM quality_rows
`,
  };
}
