/**
 * Durable numeric-energy credit earned only while video playback is active.
 *
 * зачем (PM-115, владелец): выдача энергии отключена ниже (creditVideoWatchSegment),
 * поэтому прежние зависимости хранилища/энергии/шины событий здесь больше не
 * нужны — measureVerifiedPlaybackProgress по-прежнему считает верифицированное
 * время просмотра (используется трекером в hooks/use_video_watch_energy_boost.ts),
 * но само начисление удалено.
 */
import { DebugLogger } from './debug-logger';
import { ENERGY_VIDEO_UNIT_MS } from './energy_contract';

/** 100 energy/hour = one whole unit per 36 seconds of verified watch time. */
export const VIDEO_WATCH_TARGET_RECOVERY_MS = ENERGY_VIDEO_UNIT_MS;

export type VerifiedPlaybackState = Readonly<{
  sourceId: string;
  previousPositionMs: number | null;
  previousReceivedAtMs: number | null;
  previousPlaying: boolean;
  highestCreditedPositionMs: number | null;
}>;

export type VerifiedPlaybackSample = Readonly<{
  sourceId?: string;
  playing: boolean;
  positionMs: number;
}>;

export function initialVerifiedPlaybackState(sourceId: string): VerifiedPlaybackState {
  return {
    sourceId,
    previousPositionMs: null,
    previousReceivedAtMs: null,
    previousPlaying: false,
    highestCreditedPositionMs: null,
  };
}

/**
 * Measures only newly observed forward playback. Native receipt time is the
 * upper bound, so WebView clock changes, stalls and seeks cannot mint time.
 */
export function measureVerifiedPlaybackProgress(
  inputState: VerifiedPlaybackState,
  sample: VerifiedPlaybackSample,
  receivedAtMs: number,
): { state: VerifiedPlaybackState; creditedMs: number } {
  const sourceId = String(sample.sourceId ?? inputState.sourceId);
  const positionMs = Math.max(0, Math.floor(Number(sample.positionMs)));
  const received = Math.floor(Number(receivedAtMs));
  if (!Number.isFinite(positionMs) || !Number.isFinite(received)) {
    return { state: inputState, creditedMs: 0 };
  }
  const state = sourceId === inputState.sourceId
    ? inputState
    : initialVerifiedPlaybackState(sourceId);
  const nextBase: VerifiedPlaybackState = {
    ...state,
    previousPositionMs: positionMs,
    previousReceivedAtMs: received,
    previousPlaying: sample.playing,
  };
  if (
    !sample.playing
    || !state.previousPlaying
    || state.previousPositionMs == null
    || state.previousReceivedAtMs == null
    || received <= state.previousReceivedAtMs
  ) {
    return { state: nextBase, creditedMs: 0 };
  }
  const wallDelta = received - state.previousReceivedAtMs;
  const positionDelta = positionMs - state.previousPositionMs;
  if (positionDelta <= 0) return { state: nextBase, creditedMs: 0 };

  // Normal player sampling can jitter, but a many-second jump inside one
  // receipt interval is a seek. Establish the new baseline without credit.
  if (positionDelta > wallDelta + 2_000) {
    return { state: nextBase, creditedMs: 0 };
  }
  const creditedFloor = Math.max(
    state.previousPositionMs,
    state.highestCreditedPositionMs ?? state.previousPositionMs,
  );
  const unseenForwardMs = Math.max(0, positionMs - creditedFloor);
  const creditedMs = Math.max(0, Math.min(unseenForwardMs, wallDelta));
  return {
    state: {
      ...nextBase,
      highestCreditedPositionMs: Math.max(state.highestCreditedPositionMs ?? 0, positionMs),
    },
    creditedMs,
  };
}

export function getVideoWatchTargetRemainingMs(): number {
  return ENERGY_VIDEO_UNIT_MS;
}

export type WatchCreditOutcome =
  | { applied: false; reason: string }
  | { applied: true; watchedMs: number; from: number; to: number; lastSettledAt: number };

/**
 * Applies a real watched segment at the video rate. The segment replaces
 * passive recovery for the same time window; it is never added on top of it.
 *
 * зачем (PM-115, владелец): «убрать начисление рун и энергии за просмотр
 * видео» — сигнатура и тип возврата сохранены по прежнему контракту
 * после PM-047), чтобы hooks/use_video_watch_energy_boost.ts и
 * YoutubeInlinePlayer.tsx не требовали правки. Проигрывание/счётчик просмотров
 * не тронуты — гасится только выдача энергии.
 */
export async function creditVideoWatchSegment(watchedMs: number): Promise<WatchCreditOutcome> {
  DebugLogger.info(
    'energy_video_watch_credit:disabled',
    `[VIDEO-ENERGY] PM-115: начисление энергии за просмотр отключено, watchedMs=${watchedMs}`,
  );
  return { applied: false, reason: 'PM-115_video_rewards_disabled' };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
