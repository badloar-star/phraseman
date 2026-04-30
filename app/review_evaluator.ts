import { isCorrectAnswer } from '../constants/contractions';

export type ReviewMode = 'build';

export type EvalResult = {
  ok: boolean;
  normalizedUser: string;
  normalizedTarget: string;
};

export type ClozeTask = {
  before: string;
  after: string;
  correctWord: string;
  options: string[];
};

export type MatchTask = {
  prompt: string;
  options: string[];
  correct: string;
};

const SMART_DISTRACTOR_GROUPS: string[][] = [
  ['i', 'you', 'he', 'she', 'it', 'we', 'they'],
  ['me', 'you', 'him', 'her', 'it', 'us', 'them'],
  ['my', 'your', 'his', 'her', 'its', 'our', 'their'],
  ['mine', 'yours', 'his', 'hers', 'ours', 'theirs'],
  ['am', 'is', 'are', 'was', 'were', 'be', 'been'],
  ['have', 'has', 'had'],
  ['do', 'does', 'did'],
  ['can', 'could', 'may', 'might', 'must', 'should', 'would', 'will'],
  ['a', 'an', 'the'],
  ['in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'of', 'about'],
  ['this', 'that', 'these', 'those'],
  ['some', 'any', 'no', 'every'],
];

function smartDistractors(correctWord: string): string[] {
  const lower = correctWord.toLowerCase();
  const inGroup = SMART_DISTRACTOR_GROUPS.find(g => g.includes(lower));
  if (inGroup) return inGroup.filter(w => w !== lower);

  // fallback for regular lexical words: close-looking forms
  const raw = [
    `${lower}s`,
    `${lower}ed`,
    `${lower}ing`,
    lower.length > 3 ? lower.slice(0, -1) : `${lower}ly`,
  ];
  return raw.filter((w, i, arr) => w !== lower && arr.indexOf(w) === i);
}

export function cleanPhrase(phrase: string): string {
  return phrase.replace(/[.?!,;]+$/, '').trim();
}

export function buildChunks(phrase: string): string[] {
  const words = cleanPhrase(phrase).split(/\s+/).filter(Boolean);
  if (words.length <= 3) return words;
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const left = words.length - i;
    const size = left > 4 ? 2 : left > 2 ? 2 : 1;
    chunks.push(words.slice(i, i + size).join(' '));
    i += size;
  }
  return chunks;
}

export function pickReviewMode(errorCount: number, idx: number): ReviewMode {
  void errorCount;
  void idx;
  return 'build';
}

export function evaluateRecallAnswer(userAnswer: string, phrase: string): EvalResult {
  const target = cleanPhrase(phrase);
  const ok = isCorrectAnswer(userAnswer, target);
  return {
    ok,
    normalizedUser: userAnswer.trim(),
    normalizedTarget: target,
  };
}

export function buildClozeTask(phrase: string, distractorPool: string[] = []): ClozeTask {
  const words = cleanPhrase(phrase).split(/\s+/).filter(Boolean);
  const candidates = words
    .map((w, i) => ({ w, i }))
    .filter(x => x.w.length > 2);
  const picked = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]!
    : { w: words[0] ?? '', i: 0 };
  const correctWord = picked.w;
  const idx = picked.i;
  const before = words.slice(0, idx).join(' ');
  const after = words.slice(idx + 1).join(' ');
  const smart = smartDistractors(correctWord);
  const fallback = distractorPool.filter(w => w.toLowerCase() !== correctWord.toLowerCase());
  const merged = [...smart, ...fallback].filter((w, i, arr) => arr.indexOf(w) === i);
  const options = [correctWord, ...merged.slice(0, 3)].sort(() => Math.random() - 0.5);
  return { before, after, correctWord, options };
}

export function buildMatchTask(
  phrase: string,
  correctTranslation: string,
  wrongTranslations: string[],
): MatchTask {
  const options = [correctTranslation, ...wrongTranslations.slice(0, 3)].sort(() => Math.random() - 0.5);
  return {
    prompt: cleanPhrase(phrase),
    options,
    correct: correctTranslation,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
