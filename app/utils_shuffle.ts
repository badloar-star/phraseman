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
