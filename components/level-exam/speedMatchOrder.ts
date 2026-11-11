export type Rng = () => number;

type Identified = Readonly<{ scoreUnitId: string }>;

export function shuffleSpeedMatchPairs<T extends Identified>(
  pairs: readonly T[],
  rng: Rng,
): T[] {
  const result = [...pairs];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  const unchanged = result.every((pair, index) => pair.scoreUnitId === pairs[index]?.scoreUnitId);
  if (unchanged && result.length > 1) {
    const swapIndex = 1 + Math.floor(rng() * (result.length - 1));
    [result[0], result[swapIndex]] = [result[swapIndex], result[0]];
  }
  return result;
}

export function speedMatchOrderSeed(
  attemptId: string,
  taskId: string,
  pairs: readonly Identified[],
): string {
  return `${attemptId}:${taskId}:${pairs.map((pair) => pair.scoreUnitId).join('|')}:right-column`;
}
