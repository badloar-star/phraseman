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
      const attemptSessionId = pinnedSessionId;
      if (!attemptSessionId) return;
      if (event.kind === 'start') {
        deps.emit({ eventName: 'youtube_playback_start', source: 'player', channelId: deps.channelId, videoId: event.videoId, playbackId: event.playbackId }, attemptSessionId);
      } else if (event.kind === 'checkpoint') {
        deps.emit({ eventName: 'youtube_playback_checkpoint', source: 'player', channelId: deps.channelId, videoId: event.videoId, playbackId: event.playbackId, activeWatchMs: event.activeWatchMs, positionMs: event.positionMs, durationMs: event.durationMs, maxPositionPermille: event.maxPositionPermille }, attemptSessionId);
      } else {
        deps.emit({ eventName: 'youtube_playback_end', source: 'player', channelId: deps.channelId, videoId: event.videoId, playbackId: event.playbackId, activeWatchMs: event.activeWatchMs, positionMs: event.positionMs, durationMs: event.durationMs, maxPositionPermille: event.maxPositionPermille, endReason: mapYoutubePlaybackEndReason(event.reason) }, attemptSessionId);
        pinnedSessionId = null;
      }
    },
  });

  const prepareNewAttempt = (): boolean => {
    if (!consentRequested || runtime.getSnapshot().playbackId) return pinnedSessionId != null;
    pinnedSessionId = getValidYoutubeAnalyticsSessionId(deps.readSessionId());
    return pinnedSessionId != null;
  };

  return {
    setConsent(granted) {
      consentRequested = granted;
      if (!granted) {
        pinnedSessionId = null;
        runtime.revokeConsent();
      } else {
        runtime.setConsent(true);
        if (!visible) runtime.background();
      }
    },
    revokeConsent() {
      consentRequested = false;
      pinnedSessionId = null;
      runtime.revokeConsent();
    },
    setVisible(active, progress) {
      visible = active;
      if (active) runtime.resume();
      else if (consentRequested) runtime.background(progress);
    },
    handleState(state, progress) {
      const hasAttempt = runtime.getSnapshot().playbackId != null;
      if (!consentRequested || (!hasAttempt && (state !== 'playing' || !visible))) return;
      if ((hasAttempt && pinnedSessionId) || prepareNewAttempt()) runtime.handleState(state, progress);
    },
    updateProgress(progress) {
      if (consentRequested && pinnedSessionId) runtime.updateProgress(progress);
    },
    tick(progress) {
      if (consentRequested && pinnedSessionId) runtime.tick(progress);
    },
    finish(reason, progress) {
      if (consentRequested && pinnedSessionId) runtime.finish(reason, progress);
    },
    getSnapshot: runtime.getSnapshot,
  };
}

export default function __RouteShim() { return null; }
