import type { HybridClock } from '../contracts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

export function sortedUniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function validSortedUniqueStrings(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    return false;
  }
  const normalized = sortedUniqueStrings(value);
  return normalized.length === value.length
    && normalized.every((item, index) => item === value[index]);
}

export function appendOperationId(
  appliedOperationIds: readonly string[],
  operationId: string,
): Readonly<{ duplicate: boolean; appliedOperationIds: string[] }> {
  if (appliedOperationIds.includes(operationId)) {
    return { duplicate: true, appliedOperationIds: [...appliedOperationIds] };
  }
  return {
    duplicate: false,
    appliedOperationIds: sortedUniqueStrings([...appliedOperationIds, operationId]),
  };
}

export function isHybridClock(value: unknown): value is HybridClock {
  return isRecord(value)
    && Number.isSafeInteger(value.counter)
    && (value.counter as number) >= 0
    && typeof value.deviceId === 'string'
    && value.deviceId.length > 0;
}

export function compareHybridClock(left: HybridClock, right: HybridClock): number {
  return left.counter - right.counter || left.deviceId.localeCompare(right.deviceId);
}

export function sortedRecord<Value>(
  entries: readonly (readonly [string, Value])[],
): Record<string, Value> {
  return Object.fromEntries(
    [...entries].sort(([left], [right]) => left.localeCompare(right)),
  );
}
