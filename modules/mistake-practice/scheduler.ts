import type { MistakeProjectionItem } from './projection';

export interface MistakeSessionSelectionOptions {
  readonly nowMs: number;
  readonly limit: number;
  readonly failedMistakeIds?: ReadonlySet<string>;
}

export function selectMistakesForSession(
  items: readonly MistakeProjectionItem[],
  options: MistakeSessionSelectionOptions,
): readonly MistakeProjectionItem[] {
  const limit = Math.max(0, Math.floor(options.limit));
  const failed = options.failedMistakeIds ?? new Set<string>();
  return [...items]
    .filter(
      (item) =>
        item.status === 'active'
        && item.dueAtMs <= options.nowMs,
    )
    .sort((left, right) => {
      const failurePriority = Number(failed.has(right.mistakeId))
        - Number(failed.has(left.mistakeId));
      return failurePriority
        || left.dueAtMs - right.dueAtMs
        || left.firstCapturedAtMs - right.firstCapturedAtMs
        || left.mistakeId.localeCompare(right.mistakeId);
    })
    .slice(0, limit);
}

/**
 * зачем (владелец 04.10, «Повторить исправленные»): закрепление уже исправленных ошибок.
 * Срок не важен — исправленная ошибка «не созревает». Первыми идут те, что исправлены давнее всего.
 */
export function selectCorrectedMistakesForReview(
  items: readonly MistakeProjectionItem[],
  options: Readonly<{ limit: number }>,
): readonly MistakeProjectionItem[] {
  const limit = Math.max(0, Math.floor(options.limit));
  return [...items]
    .filter((item) => item.status === 'corrected')
    .sort((left, right) =>
      (left.correctedAtMs ?? 0) - (right.correctedAtMs ?? 0)
      || left.firstCapturedAtMs - right.firstCapturedAtMs
      || left.mistakeId.localeCompare(right.mistakeId))
    .slice(0, limit);
}

/** Сколько исправленных ошибок можно повторить (для кнопки: ноль — кнопку не показывать). */
export function correctedMistakeCount(items: Iterable<MistakeProjectionItem>): number {
  let count = 0;
  for (const item of items) if (item.status === 'corrected') count += 1;
  return count;
}

export type FailureRequeuePlan =
  | Readonly<{ kind: 'requeue'; afterTaskCount: 2 | 3 | 4 }>
  | Readonly<{ kind: 'stop_for_today'; showExplanation: true }>;

const stableOffset = (mistakeId: string, failureCount: number): 2 | 3 | 4 => {
  let hash = failureCount;
  for (let index = 0; index < mistakeId.length; index += 1) {
    hash = (hash * 31 + mistakeId.charCodeAt(index)) >>> 0;
  }
  return (2 + (hash % 3)) as 2 | 3 | 4;
};

export function planFailureRequeue(input: {
  readonly mistakeId: string;
  readonly failureCount: number;
}): FailureRequeuePlan {
  if (input.failureCount >= 3) {
    return Object.freeze({
      kind: 'stop_for_today',
      showExplanation: true,
    });
  }
  return Object.freeze({
    kind: 'requeue',
    afterTaskCount: stableOffset(input.mistakeId, input.failureCount),
  });
}
