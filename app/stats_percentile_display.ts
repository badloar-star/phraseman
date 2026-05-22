export const MIN_VISIBLE_PERCENTILE = 50;

export function visiblePercentile(value: number | null, hasMetric = true): number | null {
  if (!hasMetric || value === null || value < MIN_VISIBLE_PERCENTILE) {
    return null;
  }

  return value;
}
