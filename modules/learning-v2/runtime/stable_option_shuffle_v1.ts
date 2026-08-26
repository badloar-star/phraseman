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
 * teach “tap the first answer”. A rare identity permutation is rotated once.
 */
export function stableShuffleLearningV2OptionsV1<
  T extends LearningV2ShufflableOptionV1,
>(seed: string, options: readonly T[]): readonly T[] {
  if (options.length < 2) return Object.freeze([...options]);
  const shuffled = [...options].sort((left, right) => {
    const leftScore = fnv1a32(`${seed}\u0000${left.responseId}`);
    const rightScore = fnv1a32(`${seed}\u0000${right.responseId}`);
    return leftScore - rightScore || left.responseId.localeCompare(right.responseId);
  });
  // Current authored sources deliberately keep the accepted response first so
  // editors can review them. Runtime must never leak that source convention as
  // a positional hint. Rotate whenever the first source option would still be
  // first; the remaining hash order keeps positions varied across tasks.
  if (shuffled[0] === options[0]) {
    shuffled.push(shuffled.shift()!);
  }
  return Object.freeze(shuffled);
}
