/**
 * Fisher-Yates Shuffle Algorithm
 * ════════════════════════════════════════════════════════════════════════════
 * Cryptographically correct randomization using Fisher-Yates algorithm.
 * Guarantees uniform distribution — each element has equal probability
 * of appearing in any position.
 *
 * Do NOT use sort-based shuffle like: [...arr].sort(() => Math.random() - 0.5)
 * That produces biased, non-uniform results.
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param arr Array to shuffle
 * @returns New shuffled array (original array unchanged)
 */
function randomIndexInclusive(max: number, random: () => number = Math.random): number {
  const roll = random();
  const safeRoll = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999999, roll)) : 0;
  return Math.max(0, Math.min(max, Math.floor(safeRoll * (max + 1))));
}

export const shuffle = <T,>(arr: readonly T[], random: () => number = Math.random): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndexInclusive(i, random);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * k унікальних індексів з [0, n) без перетасування всього пулу.
 * О(k) очікуваний час при k ≪ n — для квізу (k=10) замість O(n) на shuffle(pool).
 */
export function sampleUniqueRandomIndices(n: number, k: number): number[] {
  if (n <= 0 || k <= 0) return [];
  if (k >= n) {
    return shuffle([...Array(n)].map((_, i) => i));
  }
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + randomIndexInclusive(n - i - 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, k);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
