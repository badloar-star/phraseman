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
export const shuffle = <T,>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
  const picked = new Set<number>();
  while (picked.size < k) {
    picked.add(Math.floor(Math.random() * n));
  }
  return Array.from(picked);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
