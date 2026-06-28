// Lightweight grapheme→phoneme (G2P) for English, output in a simplified ARPAbet.
//
// Goal: in-word pronunciation feedback ("you said /S/ where the word needs /TH/")
// WITHOUT bundling a multi-megabyte CMU dictionary. We use a small exceptions map
// for the highest-frequency irregular words plus a deterministic rule engine for
// everything else. Accuracy is "good enough to point at the likely failing sound",
// not phonetician-grade — and that is the honest scope.
//
// Pure, no React/native imports, fully unit-testable. ARPAbet here is stress-less
// and uses these phoneme symbols (a practical subset):
//   Vowels:  AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW
//   Cons:    B CH D DH F G HH JH K L M N NG P R S SH T TH V W Y Z ZH

export type Arpabet = string[];

// Highest-frequency words where letter rules reliably fail. Keep this small —
// it is the safety net, not the engine.
const EXCEPTIONS: Readonly<Record<string, Arpabet>> = {
  the: ['DH', 'AH'],
  a: ['AH'],
  to: ['T', 'UW'],
  of: ['AH', 'V'],
  is: ['IH', 'Z'],
  was: ['W', 'AA', 'Z'],
  are: ['AA', 'R'],
  you: ['Y', 'UW'],
  your: ['Y', 'AO', 'R'],
  one: ['W', 'AH', 'N'],
  two: ['T', 'UW'],
  who: ['HH', 'UW'],
  what: ['W', 'AH', 'T'],
  said: ['S', 'EH', 'D'],
  says: ['S', 'EH', 'Z'],
  do: ['D', 'UW'],
  does: ['D', 'AH', 'Z'],
  done: ['D', 'AH', 'N'],
  goes: ['G', 'OW', 'Z'],
  could: ['K', 'UH', 'D'],
  would: ['W', 'UH', 'D'],
  should: ['SH', 'UH', 'D'],
  some: ['S', 'AH', 'M'],
  come: ['K', 'AH', 'M'],
  here: ['HH', 'IH', 'R'],
  there: ['DH', 'EH', 'R'],
  where: ['W', 'EH', 'R'],
  people: ['P', 'IY', 'P', 'AH', 'L'],
  water: ['W', 'AO', 'T', 'ER'],
  again: ['AH', 'G', 'EH', 'N'],
  word: ['W', 'ER', 'D'],
  work: ['W', 'ER', 'K'],
  world: ['W', 'ER', 'L', 'D'],
  thought: ['TH', 'AO', 'T'],
  through: ['TH', 'R', 'UW'],
  enough: ['IH', 'N', 'AH', 'F'],
  laugh: ['L', 'AE', 'F'],
  eight: ['EY', 'T'],
  great: ['G', 'R', 'EY', 'T'],
};

function clean(word: string): string {
  return word.toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z]/g, '');
}

const isV = (c: string): boolean => 'aeiou'.indexOf(c) !== -1;

// Ordered digraph/trigraph rules: try longest match first at each position.
// Each rule: [pattern, phonemes, optional guard(prevChar,nextChar)].
type Rule = readonly [string, Arpabet, ((prev: string, next: string) => boolean)?];

const MULTI_RULES: ReadonlyArray<Rule> = [
  ['tch', ['CH']],
  ['sch', ['SH']],
  ['igh', ['AY']],
  ['augh', ['AO']],
  ['ough', ['AO']],
  ['eigh', ['EY']],
  ['tion', ['SH', 'AH', 'N']],
  ['sion', ['ZH', 'AH', 'N']],
  ['ch', ['CH']],
  ['ck', ['K']],
  ['ph', ['F']],
  ['sh', ['SH']],
  ['th', ['TH']],
  ['wh', ['W']],
  ['ng', ['NG']],
  ['qu', ['K', 'W']],
  ['ee', ['IY']],
  ['ea', ['IY']],
  ['oo', ['UW']],
  ['ou', ['AW']],
  ['ow', ['AW']],
  ['oy', ['OY']],
  ['oi', ['OY']],
  ['ai', ['EY']],
  ['ay', ['EY']],
  ['au', ['AO']],
  ['aw', ['AO']],
  ['oa', ['OW']],
  ['ie', ['IY']],
];

const SINGLE: Readonly<Record<string, Arpabet>> = {
  b: ['B'], d: ['D'], f: ['F'], g: ['G'], h: ['HH'], j: ['JH'], k: ['K'],
  l: ['L'], m: ['M'], n: ['N'], p: ['P'], r: ['R'], s: ['S'], t: ['T'],
  v: ['V'], w: ['W'], y: ['Y'], z: ['Z'],
  a: ['AE'], e: ['EH'], i: ['IH'], o: ['AA'], u: ['AH'],
};

/** Convert an English word to a simplified ARPAbet phoneme sequence. */
export function wordToArpabet(rawWord: string): Arpabet {
  const word = clean(rawWord);
  if (!word) return [];
  if (EXCEPTIONS[word]) return [...EXCEPTIONS[word]!];

  const out: Arpabet = [];
  let i = 0;
  const n = word.length;
  while (i < n) {
    const prev = i > 0 ? word[i - 1]! : '';
    // Silent final 'e' (make, time) — drop unless the word is just "e"-ish.
    if (word[i] === 'e' && i === n - 1 && n > 2 && !isV(word[i - 1]!)) {
      i += 1;
      continue;
    }
    // Try multi-letter rules (longest first).
    let matched = false;
    for (const [pat, ph] of MULTI_RULES) {
      if (word.startsWith(pat, i)) {
        // 'th' at word start of function words tends to be voiced (DH) — handled
        // via EXCEPTIONS; default TH is fine elsewhere.
        out.push(...ph);
        i += pat.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const c = word[i]!;
    // soft c / soft g before e,i,y
    if (c === 'c') {
      const next = word[i + 1] ?? '';
      out.push(next === 'e' || next === 'i' || next === 'y' ? 'S' : 'K');
      i += 1;
      continue;
    }
    if (c === 'g') {
      const next = word[i + 1] ?? '';
      out.push(next === 'e' || next === 'i' || next === 'y' ? 'JH' : 'G');
      i += 1;
      continue;
    }
    if (c === 'x') {
      out.push('K', 'S');
      i += 1;
      continue;
    }
    // doubled consonant collapses (letter, ball)
    if (!isV(c) && word[i + 1] === c) {
      const ph = SINGLE[c];
      if (ph) out.push(...ph);
      i += 2;
      continue;
    }
    const ph = SINGLE[c];
    if (ph) out.push(...ph);
    i += 1;
    void prev;
  }
  return out;
}

export type PhonemeMismatch = {
  /** Expected phoneme from the target word (or '' for an extra sound). */
  expected: string;
  /** What the learner's word produced in that slot (or '' for a dropped sound). */
  said: string;
};

export type PhonemeWordCompare = {
  expected: Arpabet;
  said: Arpabet;
  mismatches: PhonemeMismatch[];
  /** 0..1 share of expected phonemes that matched in order. */
  similarity: number;
};

// Phoneme-level edit distance with backtrace → which sounds differ.
export function comparePhonemes(targetWord: string, saidWord: string): PhonemeWordCompare {
  const a = wordToArpabet(targetWord); // expected
  const b = wordToArpabet(saidWord); // said
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) dp[i]![0] = i;
  for (let j = 0; j <= m; j += 1) dp[0]![j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  // Backtrace to collect substitutions / insertions / deletions.
  const mismatches: PhonemeMismatch[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] !== b[j - 1]) mismatches.push({ expected: a[i - 1]!, said: b[j - 1]! });
      i -= 1;
      j -= 1;
    } else if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 1) {
      mismatches.push({ expected: a[i - 1]!, said: '' }); // dropped sound
      i -= 1;
    } else {
      mismatches.push({ expected: '', said: b[j - 1]! }); // extra sound
      j -= 1;
    }
  }
  mismatches.reverse();
  const distance = dp[n]![m]!;
  const similarity = n === 0 ? (m === 0 ? 1 : 0) : Math.max(0, 1 - distance / Math.max(n, m));
  return { expected: a, said: b, mismatches, similarity };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
