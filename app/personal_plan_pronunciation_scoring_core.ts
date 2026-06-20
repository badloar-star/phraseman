export type PronunciationScoreBreakdown = {
  wordAccuracy: number;
  orderAccuracy: number;
  completeness: number;
};

export type PronunciationScoreResult = {
  score: number;
  passed: boolean;
  threshold: number;
  normalizedTarget: string;
  normalizedTranscript: string;
  breakdown: PronunciationScoreBreakdown;
};

// Порог зачёта произношения. Был 90% — слишком жёстко: движок распознавания
// редко выдаёт такую точность на БЕГЛОЙ речи носителя (слитные слова, ранняя
// остановка), из-за чего нормальная речь не засчитывалась. 75% реалистичнее и
// всё ещё требует узнаваемого совпадения большинства слов. Акцент не оцениваем.
export const PRONUNCIATION_PASS_THRESHOLD = 75;

// Беглая речь = стяжения. Движок слышит "you're/gonna/wanna", а цель написана
// "you are / going to / want to" (или наоборот). Раскрываем стяжения в обе
// стороны к ОДНОЙ канонической форме, чтобы число слов совпадало и носитель не
// штрафовался. Это про распознанный текст, не про акцент.
const CONTRACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bgonna\b/g, 'going to'],
  [/\bwanna\b/g, 'want to'],
  [/\bgotta\b/g, 'got to'],
  [/\bgimme\b/g, 'give me'],
  [/\blemme\b/g, 'let me'],
  [/\bkinda\b/g, 'kind of'],
  [/\bdunno\b/g, "don't know"],
  [/\b(i)'m\b/g, '$1 am'],
  [/\b(you|we|they)'re\b/g, '$1 are'],
  [/\b(he|she|it|that|there|who|what|here)'s\b/g, '$1 is'],
  [/\b(i|you|we|they|he|she|it|that|who)'ll\b/g, '$1 will'],
  [/\b(i|you|we|they|he|she|it|that|who)'ve\b/g, '$1 have'],
  [/\b(i|you|we|they|he|she|it|that|who)'d\b/g, '$1 would'],
  [/\b(is|are|was|were|do|does|did|have|has|had|would|could|should|will|can|must|ai)n't\b/g, "$1 not"],
  [/\bcan't\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\blet's\b/g, 'let us'],
];

function expandContractions(value: string): string {
  let out = value;
  for (const [re, rep] of CONTRACTIONS) out = out.replace(re, rep);
  return out;
}

function normalizePhrase(value: string): string {
  return expandContractions(
    value
      .toLowerCase()
      .replace(/[’`]/g, "'"),
  )
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value: string): string[] {
  const normalized = normalizePhrase(value);
  return normalized ? normalized.split(' ') : [];
}

/** Character-level edit distance between two words (for fuzzy word matching). */
function charDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = cur[j];
  }
  return prev[b.length] ?? 0;
}

/**
 * Насколько два слова «совпадают» по смыслу для скоринга: 1 = одинаковые,
 * <1 = похожие (слитная/беглая речь, фонетические огрехи движка), 0 = разные.
 *
 * Беглая речь даёт you're/you are, gonna/going to, wanna/want to, а движок
 * иногда чуть искажает слово. Раньше это считалось ПОЛНОЙ ошибкой (бинарно),
 * из-за чего носитель получал 3%. Теперь близкие слова дают частичный кредит.
 */
function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  // Одно слово содержит другое целиком (you're ⊃ you, going ⊃ go) — высокий кредит.
  if (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) return 0.9;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const sim = 1 - charDistance(a, b) / maxLen;
  // Только реально похожие слова получают кредит; разные (sim<0.6) = ошибка.
  return sim >= 0.6 ? sim : 0;
}

// Взвешенный Левенштейн по словам: стоимость замены = 1 - похожесть слов,
// поэтому близкое слово почти не штрафуется, а совсем другое — на полную.
function levenshtein(a: readonly string[], b: readonly string[]): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = 1 - wordSimilarity(a[i - 1]!, b[j - 1]!);
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length] ?? 0;
}

// «Мягкий» LCS: накапливает дробную похожесть, а не только точные совпадения,
// чтобы порядок беглой речи (you're вместо you are) не обнулял order-кредит.
function longestCommonSubsequence(a: readonly string[], b: readonly string[]): number {
  const previous = Array.from({ length: b.length + 1 }, () => 0);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const sim = wordSimilarity(a[i - 1]!, b[j - 1]!);
      current[j] = sim >= 0.6
        ? previous[j - 1] + sim
        : Math.max(previous[j], current[j - 1]);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length] ?? 0;
}

function pct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

export function scorePronunciationTranscript(input: {
  targetText: string;
  transcript: string;
  threshold?: number;
}): PronunciationScoreResult {
  const targetWords = words(input.targetText);
  const transcriptWords = words(input.transcript);
  const normalizedTarget = targetWords.join(' ');
  const normalizedTranscript = transcriptWords.join(' ');
  const threshold = Math.max(1, Math.min(100, Math.round(input.threshold ?? PRONUNCIATION_PASS_THRESHOLD)));

  if (targetWords.length === 0 || transcriptWords.length === 0) {
    return {
      score: 0,
      passed: false,
      threshold,
      normalizedTarget,
      normalizedTranscript,
      breakdown: { wordAccuracy: 0, orderAccuracy: 0, completeness: 0 },
    };
  }

  const distance = levenshtein(targetWords, transcriptWords);
  const wordAccuracy = pct(1 - distance / Math.max(targetWords.length, transcriptWords.length));
  const orderedMatches = longestCommonSubsequence(targetWords, transcriptWords);
  const orderAccuracy = pct(orderedMatches / targetWords.length);
  const completeness = pct(Math.min(1, transcriptWords.length / targetWords.length));
  const score = Math.round((wordAccuracy * 0.62) + (orderAccuracy * 0.28) + (completeness * 0.10));

  return {
    score,
    passed: score >= threshold,
    threshold,
    normalizedTarget,
    normalizedTranscript,
    breakdown: { wordAccuracy, orderAccuracy, completeness },
  };
}
