export type LearningV2ShufflableOptionV1 = Readonly<{ responseId: string }>;

function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Stable for one authored interaction, but independent of source-array order.
 * The learner can retry without jumping buttons; authors cannot accidentally
 * teach a fixed answer position. Every position, including first, is allowed.
 */
export function stableShuffleLearningV2OptionsV1<
  T extends LearningV2ShufflableOptionV1,
>(seed: string, options: readonly T[]): readonly T[] {
  if (options.length < 2) return Object.freeze([...options]);
  const shuffled = [...options].sort((left, right) =>
    left.responseId < right.responseId ? -1 : left.responseId > right.responseId ? 1 : 0,
  );
  // Seeded Fisher–Yates: stable on retry, without excluding the correct slot.
  // Mix each draw rather than sorting nearby response IDs by correlated hashes.
  let state = fnv1a32(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
    const otherIndex = Math.floor(random * (index + 1));
    const other = shuffled[otherIndex]!;
    shuffled[otherIndex] = shuffled[index]!;
    shuffled[index] = other;
  }
  return Object.freeze(shuffled);
}
