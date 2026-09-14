/** Durable numeric-energy credit earned only while video playback is active. */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import { BONUS_ENERGY_KEY, readBonusEnergyForMutation } from './bonus_energy_store';
import { DebugLogger } from './debug-logger';
import { ENERGY_PASSIVE_UNIT_MS, ENERGY_VIDEO_UNIT_MS } from './energy_contract';
import { coerceEnergyStateV2, settleEnergyState } from './energy_state_v2';
import { energyVisualTransactions } from './energy_visual_transactions';
import { requireGiftAccountStorageKey } from './gift_account_storage';
import { withStorageLock } from './storage_mutex';
import { getEffectiveMaxEnergyValue } from './energy_system';

const ENERGY_STORAGE_KEY = 'energy_state';
const MIN_CREDITED_SEGMENT_MS = 250;

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
 */
export async function creditVideoWatchSegment(watchedMs: number): Promise<WatchCreditOutcome> {
  const duration = Math.floor(Number(watchedMs));
  if (!Number.isFinite(duration) || duration < MIN_CREDITED_SEGMENT_MS) {
    return { applied: false, reason: `segment_too_short:${watchedMs}` };
  }

  const accountToken = captureAccountGeneration();
  try {
    return await withAccountTransitionLock(async (): Promise<WatchCreditOutcome> => {
      if (!isCurrentAccountGeneration(accountToken)) {
        return { applied: false, reason: 'account_changed' };
      }
      const maxEnergy = await getEffectiveMaxEnergyValue();
      return withStorageLock(async (): Promise<WatchCreditOutcome> => {
        if (!isCurrentAccountGeneration(accountToken)) {
          return { applied: false, reason: 'account_changed' };
        }
        const raw = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      if (!raw) return { applied: false, reason: 'no_energy_state' };
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { applied: false, reason: 'corrupt_energy_state' };
      }

      const wallNow = Date.now();
      const opening = coerceEnergyStateV2(parsed, wallNow);
      const now = Math.max(wallNow, opening.lastSettledAt);
      const bonus = await readBonusEnergyForMutation(accountToken);
      const from = opening.current + (bonus?.amount ?? 0);
      // First preserve every passive fraction since the previous settlement,
      // including the passive 1x earned during this watched segment.
      const passive = settleEnergyState(opening, {
        nowMs: now,
        unitMs: ENERGY_PASSIVE_UNIT_MS,
        bonusEnergy: bonus?.amount ?? 0,
        bonusCapacity: bonus?.capacity ?? 0,
        bonusExpiresAt: bonus?.expiresAt ?? 0,
        maxEnergy,
      });
      // Video is 10x total, not passive 1x + another 10x. Since passive has
      // already been settled through `now`, add only the equivalent extra 9x
      // while keeping the durable watermark at real time.
      const extraEquivalentPassiveMs = Math.floor(
        duration * (ENERGY_PASSIVE_UNIT_MS - ENERGY_VIDEO_UNIT_MS) / ENERGY_VIDEO_UNIT_MS,
      );
      const settled = settleEnergyState({
        ...passive.state,
        lastSettledAt: Math.max(0, now - extraEquivalentPassiveMs),
      }, {
        nowMs: now,
        unitMs: ENERGY_PASSIVE_UNIT_MS,
        bonusEnergy: passive.bonusEnergy,
        bonusCapacity: passive.bonusCapacity,
        bonusExpiresAt: passive.bonusExpiresAt,
        maxEnergy,
      });
      const nextState = settled.state;
      const to = nextState.current + settled.bonusEnergy;
      if (to === from
        && nextState.recoveryCreditMicrounits === opening.recoveryCreditMicrounits
        && nextState.recoveryDivisionRemainder === opening.recoveryDivisionRemainder) {
        return { applied: false, reason: 'already_full' };
      }

      const writes: [string, string][] = [[ENERGY_STORAGE_KEY, JSON.stringify(nextState)]];
      if (settled.bonusCapacity > 0) {
        writes.push([
          requireGiftAccountStorageKey(BONUS_ENERGY_KEY, accountToken),
          JSON.stringify({
            schemaVersion: 2,
            amount: settled.bonusEnergy,
            capacity: settled.bonusCapacity,
            expiresAt: settled.bonusExpiresAt,
          }),
        ]);
      }
      await AsyncStorage.multiSet(writes);
      if (!isCurrentAccountGeneration(accountToken)) {
        return { applied: false, reason: 'account_changed_after_write' };
      }
      if (to !== from) {
        energyVisualTransactions.publish({
          operationId: `video:${accountToken.stableId ?? 'local'}:${now}:${duration}`,
          from,
          to,
          reason: 'video',
          source: 'video',
        });
      }
        return { applied: true, watchedMs: duration, from, to, lastSettledAt: now };
      });
    });
  } catch (error) {
    DebugLogger.error(
      'energy_video_watch_credit:write',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return { applied: false, reason: 'storage_error' };
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
