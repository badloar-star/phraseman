import type { TodayRecommendation, TodayRecommendationIdentity, TodayScopeLike } from './types';
import { registerTodayRuntimeReset } from './runtime_reset';

type Pin = TodayRecommendationIdentity & { scopeKey: string; epoch: number };
const pins: Pin[] = [];
const MAX_PINS = 2;

export function beginTodayRecommendationSession(input: { scope: TodayScopeLike; epoch: number; warmSnapshotRecommendation: TodayRecommendation | null }): void {
  const { scope, epoch, warmSnapshotRecommendation } = input;
  const existing = pins.find((pin) => pin.scopeKey === scope.scopeKey && pin.epoch === epoch);
  if (existing || !warmSnapshotRecommendation) return;
  pins.push({ scopeKey: scope.scopeKey, epoch, ruleId: warmSnapshotRecommendation.ruleId, variantId: warmSnapshotRecommendation.variantId, destinationId: warmSnapshotRecommendation.destinationId });
  while (pins.length > MAX_PINS) pins.shift();
}

export function getPinnedTodayRecommendation(scope: TodayScopeLike, epoch: number | null): TodayRecommendationIdentity | null {
  if (epoch === null) return null;
  const pin = pins.find((entry) => entry.scopeKey === scope.scopeKey && entry.epoch === epoch);
  return pin ? { ruleId: pin.ruleId, variantId: pin.variantId, destinationId: pin.destinationId } : null;
}

export function endTodayRecommendationSession(scope: TodayScopeLike, epoch: number): void {
  const index = pins.findIndex((pin) => pin.scopeKey === scope.scopeKey && pin.epoch === epoch);
  if (index >= 0) pins.splice(index, 1);
}

export function clearTodayRecommendationSessions(): void {
  pins.splice(0, pins.length);
}

registerTodayRuntimeReset(clearTodayRecommendationSessions);
