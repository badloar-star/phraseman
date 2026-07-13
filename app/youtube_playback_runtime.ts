import { MAX_YOUTUBE_PLAYBACK_MS } from './youtube_analytics_contract';

export const YOUTUBE_ACTIVE_WATCH_CHECKPOINT_MS = 10_000;

export type YoutubePlaybackState = 'playing' | 'paused' | 'buffering';
export type YoutubePlaybackEndReason = 'ended' | 'exit' | 'external' | 'error';

export interface YoutubePlaybackProgress {
  positionMs?: number;
  durationMs?: number;
}

interface YoutubePlaybackEventBase {
  videoId: string;
  playbackId: string;
  occurredAtMs: number;
}

export interface YoutubePlaybackStartEvent extends YoutubePlaybackEventBase {
  kind: 'start';
}

interface YoutubePlaybackSnapshotEventBase extends YoutubePlaybackEventBase {
  activeWatchMs: number;
  positionMs: number;
  durationMs: number;
  maxPositionPermille: number;
}

export interface YoutubePlaybackCheckpointEvent extends YoutubePlaybackSnapshotEventBase {
  kind: 'checkpoint';
}

export interface YoutubePlaybackEndEvent extends YoutubePlaybackSnapshotEventBase {
  kind: 'end';
  reason: YoutubePlaybackEndReason;
}

export type YoutubePlaybackRuntimeEvent =
  | YoutubePlaybackStartEvent
  | YoutubePlaybackCheckpointEvent
  | YoutubePlaybackEndEvent;

export interface YoutubePlaybackRuntimeSnapshot {
  playbackId: string | null;
  activeWatchMs: number;
  positionMs: number;
  durationMs: number;
  maxPositionPermille: number;
  isPlaying: boolean;
}

export interface YoutubePlaybackRuntimeDeps {
  videoId: string;
  now: () => number;
  createId: () => string;
  emit: (event: YoutubePlaybackRuntimeEvent) => void;
}

export interface YoutubePlaybackRuntime {
  setConsent(granted: boolean): void;
  revokeConsent(): void;
  handleState(state: YoutubePlaybackState, progress?: YoutubePlaybackProgress): void;
  updateProgress(progress: YoutubePlaybackProgress): void;
  tick(progress?: YoutubePlaybackProgress): void;
  background(progress?: YoutubePlaybackProgress): void;
  resume(): void;
  finish(reason: YoutubePlaybackEndReason, progress?: YoutubePlaybackProgress): void;
  getSnapshot(): YoutubePlaybackRuntimeSnapshot;
}

interface AttemptState {
  playbackId: string;
  activeWatchMs: number;
  activeSinceMs: number | null;
  positionMs: number;
  durationMs: number;
  maxPositionMs: number;
  nextCheckpointMs: number;
  isPlaying: boolean;
}

function boundedMetadata(value: number): number {
  return Math.round(Math.min(MAX_YOUTUBE_PLAYBACK_MS, Math.max(0, value)));
}

function boundedNow(value: number): number {
  return Math.round(Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, value)));
}

function progressPermille(attempt: AttemptState): number {
  if (attempt.durationMs <= 0) return 0;
  return Math.min(1_000, Math.max(0, Math.round(
    (attempt.maxPositionMs / attempt.durationMs) * 1_000,
  )));
}

export function createYoutubePlaybackRuntime(
  deps: YoutubePlaybackRuntimeDeps,
): YoutubePlaybackRuntime {
  let consentGranted = false;
  let isForeground = true;
  let attempt: AttemptState | null = null;
  let lastEffectiveNowMs = 0;

  const readEffectiveTime = (): number | null => {
    const reading = deps.now();
    if (!Number.isFinite(reading)) return null;
    const boundedReading = boundedNow(reading);
    if (boundedReading < lastEffectiveNowMs) return null;
    lastEffectiveNowMs = boundedReading;
    return boundedReading;
  };

  const clearAttempt = () => {
    attempt = null;
  };

  const updateProgress = (progress: YoutubePlaybackProgress | undefined) => {
    if (!attempt || !progress) return;
    if (typeof progress.positionMs === 'number' && Number.isFinite(progress.positionMs)) {
      attempt.positionMs = boundedMetadata(progress.positionMs);
      attempt.maxPositionMs = Math.max(attempt.maxPositionMs, attempt.positionMs);
    }
    if (typeof progress.durationMs === 'number' && Number.isFinite(progress.durationMs)) {
      attempt.durationMs = boundedMetadata(progress.durationMs);
    }
  };

  const snapshotFields = (current: AttemptState) => ({
    activeWatchMs: current.activeWatchMs,
    positionMs: current.positionMs,
    durationMs: current.durationMs,
    maxPositionPermille: progressPermille(current),
  });

  const emitCheckpointIfDue = (occurredAtMs: number) => {
    if (!attempt || attempt.activeWatchMs < attempt.nextCheckpointMs) return;
    deps.emit({
      kind: 'checkpoint',
      videoId: deps.videoId,
      playbackId: attempt.playbackId,
      occurredAtMs,
      ...snapshotFields(attempt),
    });
    while (attempt.activeWatchMs >= attempt.nextCheckpointMs) {
      attempt.nextCheckpointMs += YOUTUBE_ACTIVE_WATCH_CHECKPOINT_MS;
    }
  };

  const flushActiveTime = (keepPlaying: boolean) => {
    if (!attempt || !attempt.isPlaying) return;
    const occurredAtMs = readEffectiveTime();
    if (occurredAtMs != null && attempt.activeSinceMs != null) {
      attempt.activeWatchMs = Math.min(
        MAX_YOUTUBE_PLAYBACK_MS,
        attempt.activeWatchMs + (occurredAtMs - attempt.activeSinceMs),
      );
      emitCheckpointIfDue(occurredAtMs);
    }
    attempt.isPlaying = keepPlaying;
    attempt.activeSinceMs = keepPlaying
      ? occurredAtMs ?? attempt.activeSinceMs
      : null;
  };

  const beginOrResume = () => {
    if (!consentGranted || !isForeground) return;
    const occurredAtMs = readEffectiveTime();
    if (!attempt) {
      attempt = {
        playbackId: deps.createId(),
        activeWatchMs: 0,
        activeSinceMs: occurredAtMs,
        positionMs: 0,
        durationMs: 0,
        maxPositionMs: 0,
        nextCheckpointMs: YOUTUBE_ACTIVE_WATCH_CHECKPOINT_MS,
        isPlaying: true,
      };
      deps.emit({
        kind: 'start',
        videoId: deps.videoId,
        playbackId: attempt.playbackId,
        occurredAtMs: occurredAtMs ?? lastEffectiveNowMs,
      });
      return;
    }
    if (!attempt.isPlaying) {
      attempt.isPlaying = true;
      attempt.activeSinceMs = occurredAtMs;
    } else if (attempt.activeSinceMs == null && occurredAtMs != null) {
      attempt.activeSinceMs = occurredAtMs;
    }
  };

  const revokeConsent = () => {
    consentGranted = false;
    clearAttempt();
  };

  return {
    setConsent(granted) {
      if (!granted) {
        revokeConsent();
        return;
      }
      consentGranted = true;
    },

    revokeConsent,

    handleState(state, progress) {
      if (!consentGranted) return;
      if (state === 'playing') {
        beginOrResume();
        updateProgress(progress);
        return;
      }
      updateProgress(progress);
      flushActiveTime(false);
    },

    updateProgress(progress) {
      if (!consentGranted) return;
      updateProgress(progress);
    },

    tick(progress) {
      if (!consentGranted || !attempt || !attempt.isPlaying) return;
      updateProgress(progress);
      flushActiveTime(true);
    },

    background(progress) {
      if (!consentGranted) return;
      updateProgress(progress);
      flushActiveTime(false);
      isForeground = false;
    },

    resume() {
      isForeground = true;
    },

    finish(reason, progress) {
      if (!consentGranted || !attempt) return;
      updateProgress(progress);
      flushActiveTime(false);
      if (!attempt) return;
      const occurredAtMs = readEffectiveTime() ?? lastEffectiveNowMs;
      deps.emit({
        kind: 'end',
        videoId: deps.videoId,
        playbackId: attempt.playbackId,
        occurredAtMs,
        reason,
        ...snapshotFields(attempt),
      });
      clearAttempt();
    },

    getSnapshot() {
      if (!attempt) {
        return {
          playbackId: null,
          activeWatchMs: 0,
          positionMs: 0,
          durationMs: 0,
          maxPositionPermille: 0,
          isPlaying: false,
        };
      }
      return {
        playbackId: attempt.playbackId,
        ...snapshotFields(attempt),
        isPlaying: attempt.isPlaying,
      };
    },
  };
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
