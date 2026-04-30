// Word-level diff helper used to highlight wrong tokens in quiz answers.
const stripPunct = (w: string) => w.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();

export function diffWords(wrong: string, correct: string): { word: string; isWrong: boolean }[] {
  const wWords = wrong.trim().split(/\s+/);
  const cWords = correct.trim().split(/\s+/);
  const wn = wWords.length;
  const cn = cWords.length;
  // Build LCS table (compare without punctuation).
  const dp: number[][] = Array.from({ length: wn + 1 }, () => new Array(cn + 1).fill(0));
  for (let i = 1; i <= wn; i++) {
    for (let j = 1; j <= cn; j++) {
      dp[i][j] = stripPunct(wWords[i - 1]) === stripPunct(cWords[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  // Backtrack to find matching positions in wrong[].
  const matched = new Set<number>();
  let i = wn;
  let j = cn;
  while (i > 0 && j > 0) {
    if (stripPunct(wWords[i - 1]) === stripPunct(cWords[j - 1])) {
      matched.add(i - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return wWords.map((word, idx) => ({ word, isWrong: !matched.has(idx) }));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
