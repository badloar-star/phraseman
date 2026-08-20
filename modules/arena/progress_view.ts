export type ArenaProgressView = Readonly<{
  value: number | null;
  max: number;
  ratio: number;
}>;

export function arenaProgressView(value: number | null, max: number): ArenaProgressView {
  const normalizedMax = Number.isFinite(max) && max > 0 ? max : 0;
  if (value === null || !Number.isFinite(value)) {
    return { value: null, max: normalizedMax, ratio: 0 };
  }
  const normalizedValue = Math.max(0, Math.min(normalizedMax, value));
  return {
    value: normalizedValue,
    max: normalizedMax,
    ratio: normalizedMax > 0 ? normalizedValue / normalizedMax : 0,
  };
}
