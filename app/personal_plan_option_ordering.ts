function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stableShuffle<T>(
  values: T[],
  seed: string,
  keyForValue: (value: T) => string = String,
): T[] {
  return values
    .map((value, index) => ({
      value,
      index,
      score: stableHash(`${seed}:${index}:${keyForValue(value)}`),
    }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map((entry) => entry.value);
}

export function stableShuffleAwayFromFirst<T>(
  values: T[],
  seed: string,
  isBlockedFirst: (value: T) => boolean,
  keyForValue: (value: T) => string = String,
): T[] {
  const shuffled = stableShuffle(values, seed, keyForValue);
  if (shuffled.length <= 1 || !isBlockedFirst(shuffled[0])) return shuffled;

  const swapIndex = (stableHash(`${seed}:swap`) % (shuffled.length - 1)) + 1;
  const first = shuffled[0];
  shuffled[0] = shuffled[swapIndex];
  shuffled[swapIndex] = first;
  return shuffled;
}
