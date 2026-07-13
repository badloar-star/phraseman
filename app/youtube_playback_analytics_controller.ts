import {
  getValidYoutubeAnalyticsSessionId,
  type YoutubeAnalyticsEmission,
} from './youtube_analytics_emitter';
import {
  createYoutubePlaybackRuntime,
  type YoutubePlaybackEndReason,
  type YoutubePlaybackProgress,
  type YoutubePlaybackRuntimeSnapshot,
  type YoutubePlaybackState,
} from './youtube_playback_runtime';

type AnalyticsEndReason = 'ended' | 'screen_exit' | 'external_open' | 'error';

const ANALYTICS_END_REASON_BY_RUNTIME = {
  ended: 'ended',
  exit: 'screen_exit',
  external: 'external_open',
  error: 'error',
} satisfies Record<YoutubePlaybackEndReason, AnalyticsEndReason>;

export function mapYoutubePlaybackEndReason(reason: YoutubePlaybackEndReason): AnalyticsEndReason {
  return ANALYTICS_END_REASON_BY_RUNTIME[reason];
}

export interface YoutubePlaybackAnalyticsControllerDeps {
  videoId: string;
  channelId: string;
  initiallyActive: boolean;
  now: () => number;
  createId: () => string;
  readSessionId: () => string | null;
  emit: (event: YoutubeAnalyticsEmission, sessionId: string) => boolean;
}

export interface YoutubePlaybackAnalyticsController {
  setConsent(granted: boolean): void;
  revokeConsent(): void;
  setVisible(active: boolean, progress?: YoutubePlaybackProgress): void;
  handleState(state: YoutubePlaybackState, progress?: YoutubePlaybackProgress): void;
  updateProgress(progress: YoutubePlaybackProgress): void;
  tick(progress?: YoutubePlaybackProgress): void;
  finish(reason: YoutubePlaybackEndReason, progress?: YoutubePlaybackProgress): void;
  emitPlayerEvent(event: YoutubeAnalyticsEmission): boolean;
  getSnapshot(): YoutubePlaybackRuntimeSnapshot;
}

export function createYoutubePlaybackAnalyticsController(
  deps: YoutubePlaybackAnalyticsControllerDeps,
): YoutubePlaybackAnalyticsController {
  let visible = deps.initiallyActive;
  let consentRequested = false;
  let pinnedSessionId: string | null = null;
  const runtime = createYoutubePlaybackRuntime({
    videoId: deps.videoId,
    now: deps.now,
    createId: deps.createId,
    emit: event => {
      if (!pinnedSessionId) return;
      if (event.kind === 'start') {
        deps.emit({ eventName: 'youtube_playback_start', source: 'player', channelId: deps.channelId, videoId: event.videoId, playbackId: event.playbackId }, pinnedSessionId);
      } else if (event.kind === 'checkpoint') {
        deps.emit({ eventName: 'youtube_playback_checkpoint', source: 'player', channelId: deps.channelId, videoId: event.videoId, playbackId: event.playbackId, activeWatchMs: event.activeWatchMs, positionMs: event.positionMs, durationMs: event.durationMs, maxPositionPermille: event.maxPositionPermille }, pinnedSessionId);
      } else {
        deps.emit({ eventName: 'youtube_playback_end', source: 'player', channelId: deps.channelId, videoId: event.videoId, playbackId: event.playbackId, activeWatchMs: event.activeWatchMs, positionMs: event.positionMs, durationMs: event.durationMs, maxPositionPermille: event.maxPositionPermille, endReason: mapYoutubePlaybackEndReason(event.reason) }, pinnedSessionId);
      }
    },
  });

  const ensureSession = (): boolean => {
    if (!consentRequested) return false;
    if (!pinnedSessionId) pinnedSessionId = getValidYoutubeAnalyticsSessionId(deps.readSessionId());
    if (!pinnedSessionId) return false;
    runtime.setConsent(true);
    if (!visible) runtime.background();
    return true;
  };

  return {
    setConsent(granted) {
      consentRequested = granted;
      if (!granted) runtime.revokeConsent();
      else ensureSession();
    },
    revokeConsent() {
      consentRequested = false;
      runtime.revokeConsent();
    },
    setVisible(active, progress) {
      visible = active;
      if (active) runtime.resume();
      else if (ensureSession()) runtime.background(progress);
    },
    handleState(state, progress) {
      if (ensureSession()) runtime.handleState(state, progress);
    },
    updateProgress(progress) {
      if (ensureSession()) runtime.updateProgress(progress);
    },
    tick(progress) {
      if (ensureSession()) runtime.tick(progress);
    },
    finish(reason, progress) {
      if (ensureSession()) runtime.finish(reason, progress);
    },
    emitPlayerEvent(event) {
      return ensureSession() && pinnedSessionId != null
        ? deps.emit(event, pinnedSessionId)
        : false;
    },
    getSnapshot: runtime.getSnapshot,
  };
}

export default function __RouteShim() { return null; }
