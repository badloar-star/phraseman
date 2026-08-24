import type { DomainReducer } from '../reducer_registry';
import {
  appendOperationId,
  isRecord,
  sortedUniqueStrings,
  validSortedUniqueStrings,
} from './helpers';

export const STREAK_TIMEZONE_POLICY_VERSION = 1;

export type StreakState = Readonly<{
  activityDates: readonly string[];
  count: number;
  timezonePolicyVersion: typeof STREAK_TIMEZONE_POLICY_VERSION;
  appliedOperationIds: readonly string[];
}>;

function isNormalizedDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function previousDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - 1));
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

function deriveCount(activityDates: readonly string[]): number {
  if (activityDates.length === 0) {
    return 0;
  }
  const dates = new Set(activityDates);
  let cursor = activityDates[activityDates.length - 1];
  let count = 0;
  while (dates.has(cursor)) {
    count += 1;
    cursor = previousDate(cursor);
  }
  return count;
}

export const streakReducer: DomainReducer<StreakState> = Object.freeze({
  domain: 'streak',
  version: 1,
  initial: (): StreakState => ({
    activityDates: [],
    count: 0,
    timezonePolicyVersion: STREAK_TIMEZONE_POLICY_VERSION,
    appliedOperationIds: [],
  }),
  apply: (state, operation): StreakState => {
    const dedupe = appendOperationId(state.appliedOperationIds, operation.operationId);
    if (dedupe.duplicate) {
      return state;
    }
    if (
      !isRecord(operation.payload)
      || !isNormalizedDate(operation.payload.activityDate)
      || operation.payload.timezonePolicyVersion !== STREAK_TIMEZONE_POLICY_VERSION
    ) {
      throw new Error('streak_payload_invalid');
    }
    const activityDates = sortedUniqueStrings([
      ...state.activityDates,
      operation.payload.activityDate,
    ]);
    return {
      activityDates,
      count: deriveCount(activityDates),
      timezonePolicyVersion: STREAK_TIMEZONE_POLICY_VERSION,
      appliedOperationIds: dedupe.appliedOperationIds,
    };
  },
  validate: (state: unknown): state is StreakState => (
    isRecord(state)
    && validSortedUniqueStrings(state.activityDates)
    && state.activityDates.every(isNormalizedDate)
    && Number.isSafeInteger(state.count)
    && state.count === deriveCount(state.activityDates)
    && state.timezonePolicyVersion === STREAK_TIMEZONE_POLICY_VERSION
    && validSortedUniqueStrings(state.appliedOperationIds)
  ),
});
